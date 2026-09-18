import {test,before,after} from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import {createPool,resetTestDatabase} from '../db.js';
import {migrate} from '../scripts/migrate.js';
import {createApp} from '../app.js';
import {hashPassword,digest} from '../auth.js';
import {fulfilCapturedPayment,ticketToken} from '../payments.js';
import {randomUUID} from 'node:crypto';
const url=process.env.TEST_DATABASE_URL;
if(!url||!new URL(url).pathname.endsWith('_test'))throw Error('TEST_DATABASE_URL must point to a disposable database ending in _test');
const pool=createPool(url),origin='http://localhost:5174';let app,admin,organiser,volunteer,organiserId;
const fixture=(slug='test-night')=>({slug,name:'Test night',description:'An integration-test event.',city:'Hyderabad',venue:'Test venue',starts_at:'2099-10-10T14:00:00Z',ends_at:'2099-10-10T18:00:00Z',timezone:'Asia/Kolkata',status:'draft',refund_policy:'Cancellation requests are reviewed under the terms displayed for this test event.',passes:[{name:'Standard',amount_paise:79900,capacity:100}]});
async function login(role){const agent=request.agent(app);await agent.post('/api/auth/login').set('Origin',origin).send({email:`${role}@example.test`,password:'test-only-password-123'}).expect(200);return agent;}
before(async()=>{
 await resetTestDatabase(pool,url);await migrate(pool);await migrate(pool);
 const hash=await hashPassword('test-only-password-123');
 for(const role of ['admin','organiser','volunteer']){const id=randomUUID();await pool.query('INSERT INTO users(id,email,name,password_hash,role,referral_code) VALUES($1,$2,$3,$4,$3,$5)',[id,`${role}@example.test`,role,hash,role.toUpperCase()]);if(role==='organiser')organiserId=id;}
 app=await createApp(pool,{origin});admin=await login('admin');organiser=await login('organiser');volunteer=await login('volunteer');
});
after(()=>pool.end());
test('anonymous mutation is rejected; cross-origin login is rejected',async()=>{
 await request(app).post('/api/admin/events').set('Origin',origin).send(fixture()).expect(401);
 await request(app).post('/api/auth/login').set('Origin','https://attacker.test').send({email:'admin@example.test',password:'test-only-password-123'}).expect(403);
});
test('draft is private, publish exposes validated catalogue and pass prices',async()=>{
 const {body}=await admin.post('/api/admin/events').set('Origin',origin).send(fixture('draft-night')).expect(201);
 await request(app).get('/api/events/draft-night').expect(404);
 const updated={...fixture('draft-night'),status:'published',version:body.event.version,passes:body.event.passes.map(({id,name,amount_paise,capacity,active})=>({id,name,amount_paise,capacity,active}))};
 await admin.put('/api/admin/events/'+body.event.id).set('Origin',origin).send(updated).expect(200);
 const publicEvent=await request(app).get('/api/events/draft-night').expect(200);
 assert.equal(publicEvent.body.event.passes[0].amount_paise,79900);assert.equal(publicEvent.body.event.checkout_enabled,false);
 assert.equal('capacity' in publicEvent.body.event.passes[0],false);
 const listing=await request(app).get('/api/events?city=Hyderabad').expect(200);assert.ok(listing.body.events.some(e=>e.slug==='draft-night'));
 await admin.put('/api/admin/events/'+body.event.id).set('Origin',origin).send(updated).expect(409);
});
test('organisers cannot list, read or modify other events; grants are scoped',async()=>{
 const {body}=await admin.post('/api/admin/events').set('Origin',origin).send(fixture('private-night')).expect(201);
 assert.equal((await organiser.get('/api/admin/events').expect(200)).body.events.length,0);
 await organiser.get('/api/admin/events/'+body.event.id).expect(404);
 await organiser.put('/api/admin/events/'+body.event.id).set('Origin',origin).send({...fixture('private-night'),version:1}).expect(404);
 await pool.query('INSERT INTO event_access(event_id,user_id) VALUES($1,$2)',[body.event.id,organiserId]);
 await organiser.get('/api/admin/events/'+body.event.id).expect(200);
 await organiser.put('/api/admin/events/'+body.event.id).set('Origin',origin).send({...fixture('private-night'),version:1}).expect(404);
 assert.equal((await volunteer.get('/api/admin/events').expect(200)).body.events.length,0);
});

test('common accounts gain creator or volunteer access only through event assignment',async()=>{
 const creator=request.agent(app),helper=request.agent(app);
 const creatorSignup=await creator.post('/api/auth/signup').set('Origin',origin).send({name:'New Creator',email:'creator@example.test',phone:'+919000000001',password:'long-customer-password'}).expect(201);
 const helperSignup=await helper.post('/api/auth/signup').set('Origin',origin).send({name:'New Volunteer',email:'helper@example.test',phone:'+919000000002',password:'long-customer-password'}).expect(201);
 const event=(await admin.post('/api/admin/events').set('Origin',origin).send(fixture('assigned-night')).expect(201)).body.event;
 const other=(await admin.post('/api/admin/events').set('Origin',origin).send(fixture('other-night')).expect(201)).body.event;
 assert.equal((await creator.get('/api/account').expect(200)).body.memberships.length,0);
 await admin.put(`/api/admin/events/${event.id}/members`).set('Origin',origin).send({user_id:creatorSignup.body.user.id,membership_type:'creator',can_edit:true,can_scan:false,can_export:true,can_manage_members:false}).expect(204);
 const creatorAccount=await creator.get('/api/account').expect(200);assert.equal(creatorAccount.body.memberships[0].membership_type,'creator');assert.equal(creatorAccount.body.memberships[0].can_manage_members,true);
 const found=await creator.get(`/api/admin/users?query=helper&event_id=${event.id}`).expect(200);assert.equal(found.body.users[0].id,helperSignup.body.user.id);
 await creator.put(`/api/admin/events/${event.id}/members`).set('Origin',origin).send({user_id:helperSignup.body.user.id,membership_type:'creator',can_edit:true,can_scan:false,can_export:true,can_manage_members:true}).expect(403);
 await creator.put(`/api/admin/events/${other.id}/members`).set('Origin',origin).send({user_id:helperSignup.body.user.id,membership_type:'volunteer',can_edit:false,can_scan:true,can_export:false,can_manage_members:false}).expect(403);
 await creator.put(`/api/admin/events/${event.id}/members`).set('Origin',origin).send({user_id:helperSignup.body.user.id,membership_type:'volunteer',can_edit:false,can_scan:true,can_export:false,can_manage_members:false}).expect(204);
 assert.equal((await creator.get(`/api/admin/events/${event.id}/members`).expect(200)).body.members.find(member=>member.user_id===helperSignup.body.user.id).membership_type,'volunteer');
 assert.equal((await helper.get('/api/account').expect(200)).body.memberships[0].membership_type,'volunteer');
 await helper.get(`/api/admin/events/${event.id}/members`).expect(403);
 const assigned=(await creator.get('/api/admin/events/'+event.id).expect(200)).body.event;
 await creator.put('/api/admin/events/'+event.id).set('Origin',origin).send({...fixture('assigned-night'),version:assigned.version,passes:assigned.passes.map(({id,name,amount_paise,capacity,active})=>({id,name,amount_paise,capacity,active}))}).expect(200);
 await helper.put('/api/admin/events/'+event.id).set('Origin',origin).send({...fixture('assigned-night'),version:event.version+1}).expect(404);
});

test('registration is authenticated, server-priced, capacity-aware and referral-linked',async()=>{
 const buyer=request.agent(app),referrer=request.agent(app);
 await buyer.post('/api/auth/signup').set('Origin',origin).send({name:'Ticket Buyer',email:'buyer@example.test',phone:'+919000000003',password:'long-customer-password'}).expect(201);
 await referrer.post('/api/auth/signup').set('Origin',origin).send({name:'Referrer',email:'referrer@example.test',phone:'+919000000004',password:'long-customer-password'}).expect(201);
 const referral=(await referrer.get('/api/account').expect(200)).body.user.referral_code;
 const draft=(await admin.post('/api/admin/events').set('Origin',origin).send({...fixture('referral-night'),referral_reward_paise:5000,passes:[{name:'Only two',amount_paise:120000,capacity:2}]}).expect(201)).body.event;
 const published=await admin.put('/api/admin/events/'+draft.id).set('Origin',origin).send({...fixture('referral-night'),status:'published',version:draft.version,referral_reward_paise:5000,passes:draft.passes.map(({id,name,amount_paise,capacity,active})=>({id,name,amount_paise,capacity,active}))}).expect(200);
 await request(app).post('/api/orders').set('Origin',origin).send({event_id:draft.id,pass_id:published.body.event.passes[0].id,quantity:1,accepted_refund_policy:true,idempotency_key:'00000000-0000-4000-8000-000000000001'}).expect(401);
 await buyer.post('/api/orders').set('Origin',origin).send({event_id:draft.id,pass_id:published.body.event.passes[0].id,quantity:1,idempotency_key:'00000000-0000-4000-8000-000000000009'}).expect(400);
 const order=await buyer.post('/api/orders').set('Origin',origin).send({event_id:draft.id,pass_id:published.body.event.passes[0].id,quantity:1,accepted_refund_policy:true,referral_code:referral,idempotency_key:'00000000-0000-4000-8000-000000000002'}).expect(201);
 assert.equal(order.body.order.amount_paise,120000);assert.equal(order.body.payment_enabled,false);assert.ok(order.body.order.policy_accepted_at);
 const snapshot=await pool.query('SELECT refund_policy_snapshot,event_policy_version FROM orders WHERE id=$1',[order.body.order.id]);assert.equal(snapshot.rows[0].refund_policy_snapshot,fixture().refund_policy);assert.equal(snapshot.rows[0].event_policy_version,published.body.event.version);
 const replay=await buyer.post('/api/orders').set('Origin',origin).send({event_id:draft.id,pass_id:published.body.event.passes[0].id,quantity:1,accepted_refund_policy:true,referral_code:referral,idempotency_key:'00000000-0000-4000-8000-000000000002'}).expect(201);assert.equal(replay.body.order.reference,order.body.order.reference);
 await buyer.post('/api/orders').set('Origin',origin).send({event_id:draft.id,pass_id:published.body.event.passes[0].id,quantity:1,accepted_refund_policy:true,referral_code:'',idempotency_key:'00000000-0000-4000-8000-000000000003'}).expect(409);
 const wallet=(await referrer.get('/api/account').expect(200)).body.wallet;assert.equal(wallet.pending_paise,5000);assert.equal(wallet.available_paise,0);
});

test('assigned staff can redeem a ticket exactly once under concurrent scans',async()=>{
 const scanner=request.agent(app);
 const signup=await scanner.post('/api/auth/signup').set('Origin',origin).send({name:'Door Volunteer',email:'door@example.test',phone:'+919000000005',password:'long-customer-password'}).expect(201);
 const event=(await admin.post('/api/admin/events').set('Origin',origin).send(fixture('scan-night')).expect(201)).body.event;
 await admin.put(`/api/admin/events/${event.id}/members`).set('Origin',origin).send({user_id:signup.body.user.id,membership_type:'volunteer',can_edit:false,can_scan:true,can_export:false,can_manage_members:false}).expect(204);
 const owner=(await pool.query("SELECT id FROM users WHERE email='buyer@example.test'")).rows[0];
 const order={id:randomUUID()};await pool.query("INSERT INTO orders(id,reference,user_id,event_id,status,amount_paise,expires_at,paid_at,client_key) VALUES($1,'SCAN-ORDER',$2,$3,'paid',79900,DATE_ADD(NOW(),INTERVAL 1 DAY),NOW(),$4)",[order.id,owner.id,event.id,randomUUID()]);
 const item={id:randomUUID()};await pool.query("INSERT INTO order_items(id,order_id,pass_id,pass_name,unit_amount_paise,quantity) VALUES($1,$2,$3,'Standard',79900,1)",[item.id,order.id,event.passes[0].id]);
 const token='one-time-entry-token-with-enough-entropy-123456';
 await pool.query("INSERT INTO tickets(order_id,order_item_id,user_id,event_id,pass_name,token_hash) VALUES($1,$2,$3,$4,'Standard',$5)",[order.id,item.id,owner.id,event.id,digest(token)]);
 const scans=await Promise.all([scanner.post('/api/scan/redeem').set('Origin',origin).send({event_id:event.id,token}),scanner.post('/api/scan/redeem').set('Origin',origin).send({event_id:event.id,token})]);
 assert.deepEqual(scans.map(r=>r.body.ticket.result).sort(),['used','valid']);
});
test('invalid prices, unsafe URLs, times and duplicate names are rejected',async()=>{
 for(const change of [{passes:[{name:'Bad',amount_paise:-1,capacity:10}]},{image_url:'javascript:alert(1)'},{ends_at:'2000-01-01T00:00:00Z'},{passes:[{name:'Same',amount_paise:1,capacity:1},{name:'same',amount_paise:2,capacity:1}]}]){
  await admin.post('/api/admin/events').set('Origin',origin).send({...fixture('invalid'),...change}).expect(400);
 }
});
test('cross-event pass IDs fail atomically without changing the event',async()=>{
 const a=(await admin.post('/api/admin/events').set('Origin',origin).send(fixture('event-a')).expect(201)).body.event;
 const b=(await admin.post('/api/admin/events').set('Origin',origin).send(fixture('event-b')).expect(201)).body.event;
 await admin.put('/api/admin/events/'+b.id).set('Origin',origin).send({...fixture('changed-b'),version:1,passes:[{id:a.passes[0].id,name:'Standard',amount_paise:1,capacity:1}]}).expect(400);
 const unchanged=(await admin.get('/api/admin/events/'+b.id).expect(200)).body.event;assert.equal(unchanged.slug,'event-b');assert.equal(unchanged.version,1);
});
test('production shell excludes demonstration registration and the old demo checkout endpoint',async()=>{
 const home=await request(app).get('/').expect(200);assert.match(home.text,/production-site.js/);assert.doesNotMatch(home.text,/<script src="\/app.js/);
 assert.match(home.text,/aria-label="Open your account"/);
 const memory=await request(app).get('/memories/golden-drift/').expect(200);assert.match(memory.text,/aria-label="Open your account"/);
 await request(app).post('/api/checkout').set('Origin',origin).send({amount:1,status:'paid'}).expect(404);
 await request(app).get('/events/draft-night/').expect(200);
});
test('public compliance pages and legal footer are available without signing in',async()=>{
 const expected={about:'About us',contact:'Contact us',terms:'Terms & conditions',privacy:'Privacy policy',refunds:'Refund & cancellation policy',delivery:'Digital delivery policy',support:'Customer support'};
 for(const [path,title] of Object.entries(expected)){const page=await request(app).get(`/${path}/`).expect(200);assert.match(page.headers['content-type'],/text\/html/);assert.match(page.text,new RegExp(title.replace('&','&amp;|&')));assert.match(page.text,/MegMultiMedia Pvt Ltd/);assert.match(page.text,/info@thelucidsway\.com|Customer support/);}
 const contact=await request(app).get('/contact/').expect(200);assert.match(contact.text,/9866633477/);assert.match(contact.text,/Visakhapatnam/);assert.match(contact.text,/Monday–Saturday/);
 const refunds=await request(app).get('/refunds/').expect(200);assert.match(refunds.text,/Event-specific refund policy/);assert.match(refunds.text,/Order\/reference number/);
 const home=await request(app).get('/').expect(200);assert.match(home.text,/© 2026 Lucidsway\. All Rights Reserved\./);assert.match(home.text,/Managing Director &amp; Organiser/i);assert.match(home.text,/\/refunds\//);
});
test('free passes issue signed QR tickets when ticket signing is configured',async()=>{
 const previous=process.env.TICKET_SECRET;process.env.TICKET_SECRET='test-free-ticket-secret-with-enough-entropy';
 try{
  const ticketApp=await createApp(pool,{origin}),ticketAdmin=request.agent(ticketApp),buyer=request.agent(ticketApp);
  await ticketAdmin.post('/api/auth/login').set('Origin',origin).send({email:'admin@example.test',password:'test-only-password-123'}).expect(200);
  await buyer.post('/api/auth/signup').set('Origin',origin).send({name:'Free Pass Guest',email:'free-pass@example.test',phone:'+919000000013',password:'long-customer-password'}).expect(201);
  const draft=(await ticketAdmin.post('/api/admin/events').set('Origin',origin).send({...fixture('free-night'),passes:[{name:'Guest list',amount_paise:0,capacity:5}]}).expect(201)).body.event;
  const published=(await ticketAdmin.put('/api/admin/events/'+draft.id).set('Origin',origin).send({...fixture('free-night'),status:'published',version:draft.version,passes:draft.passes.map(({id,name,amount_paise,capacity,active})=>({id,name,amount_paise,capacity,active}))}).expect(200)).body.event;
  const registration=await buyer.post('/api/orders').set('Origin',origin).send({event_id:draft.id,pass_id:published.passes[0].id,quantity:1,accepted_refund_policy:true,idempotency_key:'00000000-0000-4000-8000-000000000030'}).expect(201);
  assert.equal(registration.body.order.status,'paid');assert.equal(registration.body.ticket_ids.length,1);assert.equal(registration.body.payment,null);
  const qr=await buyer.get('/api/account/tickets/'+registration.body.ticket_ids[0]+'/qr').expect(200);assert.match(qr.headers['content-type'],/image\/svg\+xml/);assert.match(Buffer.from(qr.body).toString('utf8'),/<svg/);
 }finally{if(previous===undefined)delete process.env.TICKET_SECRET;else process.env.TICKET_SECRET=previous;}
});
test('session revoked by logout; cookie is HttpOnly and SameSite Strict',async()=>{
 const agent=request.agent(app);const response=await agent.post('/api/auth/login').set('Origin',origin).send({email:'admin@example.test',password:'test-only-password-123'}).expect(200);
 assert.match(response.headers['set-cookie'][0],/HttpOnly/);assert.match(response.headers['set-cookie'][0],/SameSite=Strict/);
 await agent.post('/api/auth/logout').set('Origin',origin).send({}).expect(204);await agent.get('/api/auth/me').expect(401);
});

test('superadmin can upload a validated event image and delete an unused event with confirmation support',async()=>{
 const png=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=','base64');
 const uploaded=await admin.post('/api/admin/uploads/event-image').set('Origin',origin).set('Content-Type','image/png').send(png).expect(201);
 assert.match(uploaded.body.url,/^\/api\/event-images\/[0-9a-f-]+$/);
 await request(app).get(uploaded.body.url).expect('Content-Type',/image\/png/).expect(200);
 const created=(await admin.post('/api/admin/events').set('Origin',origin).send({...fixture('delete-me'),image_url:uploaded.body.url}).expect(201)).body.event;
 await admin.delete('/api/admin/events/'+created.id).set('Origin',origin).expect(204);
 await admin.get('/api/admin/events/'+created.id).expect(404);
});

test('events with registrations cannot be deleted',async()=>{
 const event=(await admin.post('/api/admin/events').set('Origin',origin).send(fixture('keep-registered')).expect(201)).body.event;
 const owner=(await pool.query("SELECT id FROM users WHERE email='buyer@example.test'")).rows[0];
 await pool.query("INSERT INTO orders(id,reference,user_id,event_id,amount_paise,expires_at,client_key) VALUES($1,'DELETE-GUARD',$2,$3,79900,DATE_ADD(NOW(),INTERVAL 1 DAY),$4)",[randomUUID(),owner.id,event.id,randomUUID()]);
 await admin.delete('/api/admin/events/'+event.id).set('Origin',origin).expect(409);
 await admin.get('/api/admin/events/'+event.id).expect(200);
});

test('coupon limits and discounts are enforced transactionally',async()=>{
 const first=request.agent(app),second=request.agent(app);
 await first.post('/api/auth/signup').set('Origin',origin).send({name:'Coupon One',email:'coupon-one@example.test',phone:'+919000000011',password:'long-customer-password'}).expect(201);
 await second.post('/api/auth/signup').set('Origin',origin).send({name:'Coupon Two',email:'coupon-two@example.test',phone:'+919000000012',password:'long-customer-password'}).expect(201);
 const draft=(await admin.post('/api/admin/events').set('Origin',origin).send({...fixture('coupon-night'),passes:[{name:'Entry',amount_paise:100000,capacity:10}]}).expect(201)).body.event;
 const published=(await admin.put('/api/admin/events/'+draft.id).set('Origin',origin).send({...fixture('coupon-night'),status:'published',version:draft.version,passes:draft.passes.map(({id,name,amount_paise,capacity,active})=>({id,name,amount_paise,capacity,active}))}).expect(200)).body.event;
 await admin.post('/api/admin/coupons').set('Origin',origin).send({event_id:draft.id,code:'FIRST20',discount_type:'percent',value:2000,min_spend_paise:50000,max_uses:1,per_customer:1,expires_at:null,active:true}).expect(201);
 const order=await first.post('/api/orders').set('Origin',origin).send({event_id:draft.id,pass_id:published.passes[0].id,quantity:1,accepted_refund_policy:true,coupon_code:'FIRST20',idempotency_key:'00000000-0000-4000-8000-000000000020'}).expect(201);
 assert.equal(order.body.order.subtotal_paise,100000);assert.equal(order.body.order.discount_paise,20000);assert.equal(order.body.order.amount_paise,80000);
 await second.post('/api/orders').set('Origin',origin).send({event_id:draft.id,pass_id:published.passes[0].id,quantity:1,accepted_refund_policy:true,coupon_code:'FIRST20',idempotency_key:'00000000-0000-4000-8000-000000000021'}).expect(409);
 const owner=(await pool.query("SELECT id FROM users WHERE email='coupon-one@example.test'")).rows[0];await pool.query("UPDATE orders SET provider_order_id='order_verified_test' WHERE id=$1",[order.body.order.id]);
 const result=await fulfilCapturedPayment(pool,{providerOrderId:'order_verified_test',paymentId:'pay_verified_test',amount:80000,currency:'INR',payload:{}},'test-ticket-secret-that-is-long-enough');assert.equal(result.tickets.length,1);
 const stored=await pool.query('SELECT token_hash FROM tickets WHERE id=$1',[result.tickets[0].id]);assert.equal(stored.rows[0].token_hash,digest(ticketToken(result.tickets[0].id,'test-ticket-secret-that-is-long-enough')));
 assert.equal((await pool.query("SELECT status FROM coupon_uses WHERE order_id=$1",[order.body.order.id])).rows[0].status,'applied');assert.ok(owner.id);
});
