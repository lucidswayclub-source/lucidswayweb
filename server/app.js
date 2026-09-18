import express from 'express';
import helmet from 'helmet';
import {readFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {randomUUID} from 'node:crypto';
import {z} from 'zod';
import QRCode from 'qrcode';
import {transaction} from './db.js';
import {digest,hashPassword,verifyPassword,newToken,sessionToken} from './auth.js';
import {eventInput,loginInput,signupInput,memberInput,orderInput,couponInput} from './validation.js';
import {fulfilCapturedPayment,ticketToken,verifyCheckoutSignature,verifyWebhookSignature} from './payments.js';
import {legalFooter,renderLegalPage} from './legal-pages.js';
const dist=fileURLToPath(new URL('../dist/',import.meta.url));
const publicColumns='e.id,e.slug,e.name,e.description,e.city,e.venue,e.maps_url,e.image_url,e.starts_at,e.ends_at,e.timezone,e.status,e.version,e.referral_reward_paise,e.refund_policy';
const error=(status,message)=>Object.assign(new Error(message),{status});
const userView=user=>({id:user.id,name:user.name,email:user.email,phone:user.phone,role:user.role,referral_code:user.referral_code});
async function eventView(db,id,admin=false,checkout=false){
 const r=await db.query(`SELECT ${publicColumns} FROM events e WHERE e.id=$1`,[id]);
 if(!r.rowCount)return null;
 const p=await db.query(`SELECT id,name,amount_paise,currency,${admin?'capacity,':''}active FROM passes WHERE event_id=$1 ${admin?'':'AND active=true'} ORDER BY amount_paise,id`,[id]);
 return {...r.rows[0],passes:p.rows,checkout_enabled:checkout};
}
export async function createApp(pool,{origin='http://localhost:5174',production=false}={}){
 const app=express();app.disable('x-powered-by');
 const gateway={keyId:process.env.RAZORPAY_KEY_ID||'',keySecret:process.env.RAZORPAY_KEY_SECRET||'',webhookSecret:process.env.RAZORPAY_WEBHOOK_SECRET||'',ticketSecret:process.env.TICKET_SECRET||''};
 const paymentEnabled=Object.values(gateway).every(Boolean);
 const razorpay=async(path,options={})=>{const response=await fetch(`https://api.razorpay.com/v1${path}`,{...options,signal:AbortSignal.timeout(10000),headers:{Authorization:`Basic ${Buffer.from(`${gateway.keyId}:${gateway.keySecret}`).toString('base64')}`,'Content-Type':'application/json',...options.headers}});const data=await response.json();if(!response.ok)throw error(502,data.error?.description||'Payment provider is temporarily unavailable');return data;};
 app.use(helmet({contentSecurityPolicy:{directives:{defaultSrc:["'self'"],scriptSrc:["'self'","'unsafe-inline'",'https://checkout.razorpay.com'],styleSrc:["'self'","'unsafe-inline'",'https://fonts.googleapis.com'],imgSrc:["'self'",'data:','blob:','https:'],fontSrc:["'self'",'https://fonts.gstatic.com'],connectSrc:["'self'",'https://api.razorpay.com'],frameSrc:["'self'",'https://api.razorpay.com','https://*.razorpay.com'],mediaSrc:["'self'"],objectSrc:["'none'"],upgradeInsecureRequests:production?[]:null}},strictTransportSecurity:production?undefined:false}));
 app.post('/api/webhooks/razorpay',express.raw({type:'application/json',limit:'1mb'}),async(req,res)=>{
  if(!gateway.webhookSecret||!gateway.ticketSecret)throw error(503,'Payment webhooks are not configured');
  if(!Buffer.isBuffer(req.body)||!verifyWebhookSignature(req.body,req.get('x-razorpay-signature'),gateway.webhookSecret))throw error(401,'Invalid webhook signature');
  let payload;try{payload=JSON.parse(req.body.toString('utf8'));}catch{throw error(400,'Invalid webhook payload');}
  if(payload.event!=='payment.captured')return res.status(204).end();
  const payment=payload.payload?.payment?.entity,eventIdentity=req.get('x-razorpay-event-id');if(!payment||!eventIdentity)throw error(400,'Webhook payment data is incomplete');
  await fulfilCapturedPayment(pool,{providerOrderId:payment.order_id,paymentId:payment.id,amount:payment.amount,currency:payment.currency,eventIdentity,payload},gateway.ticketSecret);res.status(204).end();
 });
 app.use('/api',(req,res,next)=>{res.set('Cache-Control','no-store');next();});
 app.use('/api',(req,res,next)=>{
  if(!['GET','HEAD','OPTIONS'].includes(req.method)&&req.get('origin')!==origin)return res.status(403).json({error:'Request origin is not allowed'});
  next();
 });
 app.use(express.json({limit:'64kb'}));
 app.get('/api/event-images/:id',async(req,res)=>{
  const id=z.string().uuid().parse(req.params.id),image=await pool.query('SELECT mime_type,image_data FROM event_images WHERE id=$1',[id]);
  if(!image.rowCount)throw error(404,'Event image not found');
  res.type(image.rows[0].mime_type).set('Cache-Control','public, max-age=31536000, immutable').send(image.rows[0].image_data);
 });
 const dummy=await hashPassword(newToken());
 const setSession=async(req,res,user)=>{
  const token=newToken();
  await transaction(pool,async c=>{
   await c.query('DELETE FROM sessions WHERE expires_at<now()');
   await c.query('DELETE FROM login_limits WHERE expires_at<now()');
   const old=sessionToken(req);if(old)await c.query('DELETE FROM sessions WHERE token_hash=$1',[digest(old)]);
   await c.query("INSERT INTO sessions(token_hash,user_id,expires_at) VALUES($1,$2,DATE_ADD(NOW(),INTERVAL 8 HOUR))",[digest(token),user.id]);
  });
  res.cookie('lucid_session',token,{httpOnly:true,secure:production,sameSite:'strict',path:'/',maxAge:8*3600*1000});
 };
 app.get('/api/health',async(req,res)=>{await pool.query('SELECT 1');res.json({status:'ok',checkout_enabled:paymentEnabled});});
 app.post('/api/auth/login',async(req,res)=>{
  const {email,password}=loginInput.parse(req.body);
  for(const [key,max] of [[`email:${email}`,8],[`ip:${req.ip}`,40]]){
   await pool.query(`INSERT INTO login_limits(throttle_key,attempts,expires_at) VALUES($1,1,DATE_ADD(NOW(),INTERVAL 15 MINUTE)) ON DUPLICATE KEY UPDATE attempts=IF(expires_at<NOW(),1,attempts+1),expires_at=IF(expires_at<NOW(),DATE_ADD(NOW(),INTERVAL 15 MINUTE),expires_at)`,[digest(key)]);
   const r=await pool.query('SELECT attempts FROM login_limits WHERE throttle_key=$1',[digest(key)]);
   if(r.rows[0].attempts>max)throw error(429,'Too many attempts. Try again later.');
  }
  const r=await pool.query('SELECT * FROM users WHERE email=$1',[email]),user=r.rows[0];
  const valid=await verifyPassword(password,user?.password_hash||dummy);
  if(!valid||!user?.active)throw error(401,'Invalid email or password');
  await setSession(req,res,user);res.json({user:userView(user)});
 });
 app.post('/api/auth/signup',async(req,res)=>{
  const input=signupInput.parse(req.body),passwordHash=await hashPassword(input.password);
  let user;
  for(let attempt=0;attempt<5&&!user;attempt++){
   const code=newToken().replace(/[^A-Za-z0-9]/g,'').slice(0,10).toUpperCase();
   try{const id=randomUUID();await pool.query("INSERT INTO users(id,email,name,phone,password_hash,role,referral_code) VALUES($1,$2,$3,$4,$5,'customer',$6)",[id,input.email,input.name,input.phone,passwordHash,code]);user=(await pool.query('SELECT * FROM users WHERE id=$1',[id])).rows[0];}
   catch(e){if(e.code==='ER_DUP_ENTRY'&&String(e.message).includes('referral_code'))continue;throw e;}
  }
  if(!user)throw error(503,'Could not create account. Please try again.');
  await setSession(req,res,user);res.status(201).json({user:userView(user)});
 });
 app.use('/api',async(req,res,next)=>{
  const token=sessionToken(req);if(token){const r=await pool.query('SELECT u.id,u.name,u.email,u.phone,u.role,u.referral_code FROM sessions s JOIN users u ON u.id=s.user_id WHERE s.token_hash=$1 AND s.expires_at>now() AND u.active=true',[digest(token)]);req.user=r.rows[0];}next();
 });
 const auth=(req,res,next)=>req.user?next():res.status(401).json({error:'Sign in required'});
 const staff=auth;
 async function allowed(db,user,id,write=false){
  if(user.role==='admin')return true;
  const r=await db.query(`SELECT 1 FROM event_access WHERE event_id=$1 AND user_id=$2 ${write?'AND can_edit=true':''}`,[id,user.id]);return !!r.rowCount;
 }
 async function managesMembers(db,user,id){
  if(user.role==='admin')return true;
  const r=await db.query("SELECT 1 FROM event_access WHERE event_id=$1 AND user_id=$2 AND membership_type='creator' AND can_manage_members=true",[id,user.id]);return !!r.rowCount;
 }
 app.get('/api/auth/me',auth,(req,res)=>res.json({user:req.user}));
 app.post('/api/auth/logout',auth,async(req,res)=>{await pool.query('DELETE FROM sessions WHERE token_hash=$1',[digest(sessionToken(req))]);res.clearCookie('lucid_session',{path:'/',httpOnly:true,secure:production,sameSite:'strict'});res.status(204).end();});
 app.get('/api/account',auth,async(req,res)=>{
  const [memberships,orders,tickets,wallet]=await Promise.all([
   pool.query(`SELECT a.event_id,a.membership_type,a.can_edit,a.can_scan,a.can_export,a.can_manage_members,e.name,e.slug,e.city,e.starts_at,e.status FROM event_access a JOIN events e ON e.id=a.event_id WHERE a.user_id=$1 ORDER BY e.starts_at DESC`,[req.user.id]),
   pool.query(`SELECT o.id,o.reference,o.status,o.amount_paise,o.created_at,e.name AS event_name,e.slug,(SELECT JSON_ARRAYAGG(JSON_OBJECT('name',i.pass_name,'quantity',i.quantity)) FROM order_items i WHERE i.order_id=o.id) AS items FROM orders o JOIN events e ON e.id=o.event_id WHERE o.user_id=$1 ORDER BY o.created_at DESC LIMIT 100`,[req.user.id]),
   pool.query(`SELECT t.id,t.status,t.pass_name,t.used_at,e.name AS event_name,e.slug,e.starts_at FROM tickets t JOIN events e ON e.id=t.event_id WHERE t.user_id=$1 ORDER BY e.starts_at DESC`,[req.user.id]),
   pool.query(`SELECT COALESCE(SUM(CASE WHEN status='available' THEN amount_paise ELSE 0 END),0) AS available_paise,COALESCE(SUM(CASE WHEN status='pending' THEN amount_paise ELSE 0 END),0) AS pending_paise FROM wallet_entries WHERE user_id=$1`,[req.user.id])
  ]);
  res.json({user:req.user,memberships:memberships.rows,orders:orders.rows,tickets:tickets.rows,wallet:wallet.rows[0],referral_link:`${origin}/?ref=${encodeURIComponent(req.user.referral_code)}#events`,payout_threshold_paise:Number(process.env.PAYOUT_THRESHOLD_PAISE||200000)});
 });
 app.post('/api/account/payouts',auth,async(req,res)=>{
  const threshold=Number(process.env.PAYOUT_THRESHOLD_PAISE||200000);
  const payout=await transaction(pool,async c=>{
   const entries=await c.query("SELECT id,amount_paise FROM wallet_entries WHERE user_id=$1 AND status='available' AND payout_request_id IS NULL ORDER BY created_at FOR UPDATE",[req.user.id]);
   const amount=entries.rows.reduce((sum,row)=>sum+row.amount_paise,0);
   if(amount<threshold)throw error(409,`Wallet balance must reach ₹${(threshold/100).toFixed(0)} before redemption`);
   const payout={id:randomUUID(),amount_paise:amount,status:'requested',created_at:new Date()};
   await c.query('INSERT INTO payout_requests(id,user_id,amount_paise) VALUES($1,$2,$3)',[payout.id,req.user.id,amount]);
   const ids=entries.rows.map(row=>row.id),placeholders=ids.map((_,index)=>`$${index+2}`).join(',');
   await c.query(`UPDATE wallet_entries SET status='redeemed',payout_request_id=$1 WHERE id IN (${placeholders})`,[payout.id,...ids]);return payout;
  });res.status(201).json({payout});
 });
 app.get('/api/account/tickets/:id/qr',auth,async(req,res)=>{
  if(!gateway.ticketSecret)throw error(503,'Ticket display is not configured');
  const id=z.string().uuid().parse(req.params.id),ticket=await pool.query('SELECT id,user_id,status FROM tickets WHERE id=$1',[id]);
  if(!ticket.rowCount||(ticket.rows[0].user_id!==req.user.id&&req.user.role!=='admin'))throw error(404,'Ticket not found');
  const svg=await QRCode.toString(ticketToken(id,gateway.ticketSecret),{type:'svg',margin:2,width:420,color:{dark:'#16090d',light:'#fff8f7'}});res.type('image/svg+xml').set('Cache-Control','private, no-store').send(svg);
 });
 app.post('/api/payments/verify',auth,async(req,res)=>{
  if(!paymentEnabled)throw error(503,'Online payment is not configured');
  const input=z.object({razorpay_payment_id:z.string().min(5).max(100),razorpay_order_id:z.string().min(5).max(100),razorpay_signature:z.string().regex(/^[a-f0-9]{64}$/)}).strict().parse(req.body);
  const order=await pool.query('SELECT id,user_id,provider_order_id,amount_paise,currency FROM orders WHERE provider_order_id=$1',[input.razorpay_order_id]);
  if(!order.rowCount||order.rows[0].user_id!==req.user.id)throw error(404,'Payment order not found');
  if(!verifyCheckoutSignature({providerOrderId:order.rows[0].provider_order_id,paymentId:input.razorpay_payment_id,signature:input.razorpay_signature},gateway.keySecret))throw error(401,'Payment signature is invalid');
  const payment=await razorpay(`/payments/${encodeURIComponent(input.razorpay_payment_id)}`);
  if(payment.status!=='captured'||payment.order_id!==order.rows[0].provider_order_id)throw error(409,'Payment has not been captured');
  const result=await fulfilCapturedPayment(pool,{providerOrderId:payment.order_id,paymentId:payment.id,amount:payment.amount,currency:payment.currency,payload:payment},gateway.ticketSecret);res.json({verified:true,ticket_ids:result.tickets.map(ticket=>ticket.id)});
 });
 app.post('/api/scan/redeem',auth,async(req,res)=>{
  const input=z.object({event_id:z.string().uuid(),token:z.string().min(32).max(256)}).strict().parse(req.body);
  const permission=req.user.role==='admin'||(await pool.query('SELECT 1 FROM event_access WHERE event_id=$1 AND user_id=$2 AND can_scan=true',[input.event_id,req.user.id])).rowCount;
  if(!permission)throw error(403,'You are not assigned to scan this event');
  const ticket=await transaction(pool,async c=>{
   const r=await c.query(`UPDATE tickets SET status='used',used_at=NOW(),used_by=$3 WHERE event_id=$1 AND token_hash=$2 AND status='active' AND used_at IS NULL`,[input.event_id,digest(input.token),req.user.id]);
   if(r.rowCount){const redeemed=await c.query('SELECT id,pass_name,used_at FROM tickets WHERE event_id=$1 AND token_hash=$2',[input.event_id,digest(input.token)]);return {result:'valid',...redeemed.rows[0]};}
   const existing=await c.query('SELECT status,used_at,pass_name FROM tickets WHERE event_id=$1 AND token_hash=$2',[input.event_id,digest(input.token)]);
   if(existing.rowCount&&existing.rows[0].status==='used')return {result:'used',...existing.rows[0]};
   return {result:'invalid'};
  });res.json({ticket});
 });
 app.get('/api/events',async(req,res)=>{
  const city=z.string().max(100).optional().parse(req.query.city);
  const r=await pool.query(`SELECT ${publicColumns},(SELECT MIN(amount_paise) FROM passes p WHERE p.event_id=e.id AND active=true) AS from_amount_paise FROM events e WHERE status='published' AND ends_at>NOW() ${city?'AND city=$1':''} ORDER BY starts_at LIMIT 100`,city?[city]:[]);
  res.json({events:r.rows,checkout_enabled:paymentEnabled});
 });
 app.get('/api/events/:slug',async(req,res)=>{
  const r=await pool.query("SELECT id FROM events WHERE slug=$1 AND status='published'",[req.params.slug]);
  if(!r.rowCount)throw error(404,'Event not found');res.json({event:await eventView(pool,r.rows[0].id,false,paymentEnabled)});
 });
 app.get('/api/admin/events',auth,staff,async(req,res)=>{
  const r=await pool.query(`SELECT ${publicColumns} FROM events e WHERE ($1='admin' OR EXISTS(SELECT 1 FROM event_access a WHERE a.event_id=e.id AND a.user_id=$2)) ORDER BY starts_at DESC LIMIT 200`,[req.user.role,req.user.id]);res.json({events:r.rows});
 });
 app.get('/api/admin/events/:id',auth,staff,async(req,res)=>{
  const id=z.string().uuid().parse(req.params.id);if(!await allowed(pool,req.user,id))throw error(404,'Event not found');
  const event=await eventView(pool,id,true);if(!event)throw error(404,'Event not found');res.json({event});
 });
 async function save(req,res){
  const input=eventInput.parse(req.body),id=req.params.id?z.string().uuid().parse(req.params.id):randomUUID(),creating=!req.params.id;
  if(creating&&req.user.role!=='admin')throw error(403,'Only administrators can create events');
  const event=await transaction(pool,async c=>{
   if(!await allowed(c,req.user,id,true))throw error(404,'Event not found');
   if(creating){if(input.passes.some(p=>p.id))throw error(400,'New events cannot reuse pass IDs');}
   else{
    const old=await c.query('SELECT version FROM events WHERE id=$1 FOR UPDATE',[id]);
    if(!old.rowCount)throw error(404,'Event not found');
    if(input.version!==old.rows[0].version)throw error(409,'Event changed. Reload before saving.');
   }
   const vals=[input.slug,input.name,input.description,input.city,input.venue,input.maps_url,input.image_url,input.starts_at,input.ends_at,input.timezone,input.status,input.referral_reward_paise,input.refund_policy];
   if(creating)await c.query('INSERT INTO events(id,slug,name,description,city,venue,maps_url,image_url,starts_at,ends_at,timezone,status,referral_reward_paise,refund_policy) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)',[id,...vals]);
   else await c.query('UPDATE events SET slug=$2,name=$3,description=$4,city=$5,venue=$6,maps_url=$7,image_url=$8,starts_at=$9,ends_at=$10,timezone=$11,status=$12,referral_reward_paise=$13,refund_policy=$14,version=version+1,updated_at=now() WHERE id=$1',[id,...vals]);
   const ids=[];
   for(const pass of input.passes){
    if(pass.id){
     const r=await c.query('UPDATE passes SET name=$3,amount_paise=$4,capacity=$5,active=$6 WHERE id=$1 AND event_id=$2',[pass.id,id,pass.name,pass.amount_paise,pass.capacity,pass.active]);
     if(!r.rowCount)throw error(400,'Pass does not belong to this event');ids.push(pass.id);
    }else{const passId=randomUUID();await c.query('INSERT INTO passes(id,event_id,name,amount_paise,capacity,active) VALUES($1,$2,$3,$4,$5,$6)',[passId,id,pass.name,pass.amount_paise,pass.capacity,pass.active]);ids.push(passId);}
   }
   // Retire omitted passes instead of deleting identities later referenced by orders.
   if(ids.length){const placeholders=ids.map((_,index)=>`$${index+2}`).join(',');await c.query(`UPDATE passes SET active=false WHERE event_id=$1 AND id NOT IN (${placeholders})`,[id,...ids]);}
   else await c.query('UPDATE passes SET active=false WHERE event_id=$1',[id]);
   await c.query('INSERT INTO audit_log(actor_id,action,event_id) VALUES($1,$2,$3)',[req.user.id,creating?'event.created':'event.updated',id]);
   return eventView(c,id,true);
  });res.status(creating?201:200).json({event});
 }
 app.post('/api/admin/events',auth,staff,save);
 app.put('/api/admin/events/:id',auth,staff,save);
 app.post('/api/admin/uploads/event-image',auth,express.raw({type:['image/jpeg','image/png','image/webp'],limit:'8mb'}),async(req,res)=>{
  const canUpload=req.user.role==='admin'||(await pool.query('SELECT 1 FROM event_access WHERE user_id=$1 AND can_edit=true LIMIT 1',[req.user.id])).rowCount;
  if(!canUpload)throw error(403,'Event editing access required');
  if(!Buffer.isBuffer(req.body)||!req.body.length)throw error(400,'Choose a JPEG, PNG or WebP image');
  const type=req.get('content-type')?.split(';')[0],hex=req.body.subarray(0,12).toString('hex'),ascii=req.body.subarray(0,12).toString('ascii');
  const valid=(type==='image/jpeg'&&hex.startsWith('ffd8ff'))||(type==='image/png'&&hex.startsWith('89504e470d0a1a0a'))||(type==='image/webp'&&ascii.startsWith('RIFF')&&ascii.slice(8,12)==='WEBP');
  if(!valid)throw error(400,'The file content does not match a supported image type');
  const id=randomUUID();await pool.query('INSERT INTO event_images(id,mime_type,image_data) VALUES($1,$2,$3)',[id,type,req.body]);
  res.status(201).json({url:`/api/event-images/${id}`});
 });
 app.delete('/api/admin/events/:id',auth,async(req,res)=>{
  if(req.user.role!=='admin')throw error(403,'Only a superadmin can delete events');
  const id=z.string().uuid().parse(req.params.id);
  await transaction(pool,async c=>{
   const event=await c.query('SELECT id FROM events WHERE id=$1 FOR UPDATE',[id]);if(!event.rowCount)throw error(404,'Event not found');
   const registrations=await c.query('SELECT COUNT(*) AS count FROM orders WHERE event_id=$1',[id]);
   if(Number(registrations.rows[0].count))throw error(409,'This event has registrations and cannot be deleted. Archive it instead.');
   await c.query('DELETE FROM events WHERE id=$1',[id]);
   await c.query("INSERT INTO audit_log(actor_id,action,event_id) VALUES($1,'event.deleted',NULL)",[req.user.id]);
  });res.status(204).end();
 });
 app.get('/api/admin/users',auth,async(req,res)=>{
  const query=z.string().trim().min(2).max(100).parse(req.query.query),eventId=req.query.event_id?z.string().uuid().parse(req.query.event_id):null;
  if(req.user.role!=='admin'&&(!eventId||!await managesMembers(pool,req.user,eventId)))throw error(403,'Volunteer management access required');
  const r=await pool.query(`SELECT id,name,email,phone,referral_code FROM users WHERE active=true AND id<>$2 AND (email LIKE $1 OR name LIKE $1) ORDER BY name LIMIT 20`,[`%${query}%`,req.user.id]);
  res.json({users:r.rows});
 });
 app.get('/api/admin/events/:id/members',auth,async(req,res)=>{
  const id=z.string().uuid().parse(req.params.id);
  if(!await managesMembers(pool,req.user,id))throw error(403,'Volunteer management access required');
  const r=await pool.query(`SELECT a.user_id,a.membership_type,a.can_edit,a.can_scan,a.can_export,a.can_manage_members,u.name,u.email,u.phone FROM event_access a JOIN users u ON u.id=a.user_id WHERE a.event_id=$1 ORDER BY a.membership_type,u.name`,[id]);
  res.json({members:r.rows});
 });
 app.put('/api/admin/events/:id/members',auth,async(req,res)=>{
  const id=z.string().uuid().parse(req.params.id),input=memberInput.parse(req.body);
  const platformAdmin=req.user.role==='admin';
  if(!await managesMembers(pool,req.user,id))throw error(403,'Volunteer management access required');
  if(!(await pool.query('SELECT 1 FROM events WHERE id=$1',[id])).rowCount)throw error(404,'Event not found');
  const target=await pool.query('SELECT role FROM users WHERE id=$1 AND active=true',[input.user_id]);if(!target.rowCount)throw error(404,'User not found');
  if(!platformAdmin){
   if(input.user_id===req.user.id||target.rows[0].role==='admin'||input.membership_type!=='volunteer'||input.can_edit||!input.can_scan||input.can_export||input.can_manage_members)throw error(403,'Creators can only add volunteers with entry-scanning access');
   const existing=await pool.query("SELECT membership_type FROM event_access WHERE event_id=$1 AND user_id=$2",[id,input.user_id]);if(existing.rows[0]?.membership_type==='creator')throw error(403,'Creators cannot change another creator’s access');
  }
  const canManage=input.membership_type==='creator';
  await pool.query(`INSERT INTO event_access(event_id,user_id,membership_type,can_edit,can_scan,can_export,can_manage_members) VALUES($1,$2,$3,$4,$5,$6,$7) ON DUPLICATE KEY UPDATE membership_type=VALUES(membership_type),can_edit=VALUES(can_edit),can_scan=VALUES(can_scan),can_export=VALUES(can_export),can_manage_members=VALUES(can_manage_members)`,[id,input.user_id,input.membership_type,input.can_edit,input.can_scan,input.can_export,canManage]);
  await pool.query('INSERT INTO audit_log(actor_id,action,event_id) VALUES($1,$2,$3)',[req.user.id,'event.member_assigned',id]);
  res.status(204).end();
 });
 app.delete('/api/admin/events/:id/members/:userId',auth,async(req,res)=>{
  const id=z.string().uuid().parse(req.params.id),userId=z.string().uuid().parse(req.params.userId);
  const platformAdmin=req.user.role==='admin';if(!await managesMembers(pool,req.user,id))throw error(403,'Volunteer management access required');
  if(!platformAdmin){const assignment=await pool.query('SELECT membership_type FROM event_access WHERE event_id=$1 AND user_id=$2',[id,userId]);if(!assignment.rowCount)throw error(404,'Assignment not found');if(assignment.rows[0].membership_type!=='volunteer')throw error(403,'Creators can only remove volunteers');}
  await pool.query('DELETE FROM event_access WHERE event_id=$1 AND user_id=$2',[id,userId]);
  await pool.query('INSERT INTO audit_log(actor_id,action,event_id) VALUES($1,$2,$3)',[req.user.id,'event.member_removed',id]);res.status(204).end();
 });
 app.get('/api/admin/coupons',auth,async(req,res)=>{if(req.user.role!=='admin')throw error(403,'Superadmin access required');const r=await pool.query('SELECT c.*,e.name AS event_name FROM coupons c LEFT JOIN events e ON e.id=c.event_id ORDER BY c.created_at DESC');res.json({coupons:r.rows});});
 app.post('/api/admin/coupons',auth,async(req,res)=>{if(req.user.role!=='admin')throw error(403,'Superadmin access required');const input=couponInput.parse(req.body),id=randomUUID(),duplicate=await pool.query('SELECT 1 FROM coupons WHERE code=$1 AND ((event_id=$2) OR (event_id IS NULL AND $2 IS NULL))',[input.code,input.event_id]);if(duplicate.rowCount)throw error(409,'That coupon code already exists for this scope');await pool.query(`INSERT INTO coupons(id,event_id,code,discount_type,value,min_spend_paise,max_uses,per_customer,expires_at,active) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,[id,input.event_id,input.code,input.discount_type,input.value,input.min_spend_paise,input.max_uses,input.per_customer,input.expires_at,input.active]);const coupon=(await pool.query('SELECT * FROM coupons WHERE id=$1',[id])).rows[0];res.status(201).json({coupon});});
 app.put('/api/admin/coupons/:id',auth,async(req,res)=>{if(req.user.role!=='admin')throw error(403,'Superadmin access required');const id=z.string().uuid().parse(req.params.id),input=couponInput.parse(req.body),duplicate=await pool.query('SELECT 1 FROM coupons WHERE id<>$1 AND code=$2 AND ((event_id=$3) OR (event_id IS NULL AND $3 IS NULL))',[id,input.code,input.event_id]);if(duplicate.rowCount)throw error(409,'That coupon code already exists for this scope');const r=await pool.query(`UPDATE coupons SET event_id=$2,code=$3,discount_type=$4,value=$5,min_spend_paise=$6,max_uses=$7,per_customer=$8,expires_at=$9,active=$10 WHERE id=$1`,[id,input.event_id,input.code,input.discount_type,input.value,input.min_spend_paise,input.max_uses,input.per_customer,input.expires_at,input.active]);if(!r.rowCount)throw error(404,'Coupon not found');const coupon=(await pool.query('SELECT * FROM coupons WHERE id=$1',[id])).rows[0];res.json({coupon});});
 app.delete('/api/admin/coupons/:id',auth,async(req,res)=>{if(req.user.role!=='admin')throw error(403,'Superadmin access required');const id=z.string().uuid().parse(req.params.id);await pool.query('UPDATE coupons SET active=false WHERE id=$1',[id]);res.status(204).end();});
 app.post('/api/orders',auth,async(req,res)=>{
  const input=orderInput.parse(req.body);
  const order=await transaction(pool,async c=>{
   const retry=await c.query(`SELECT o.id,o.reference,o.status,o.amount_paise,o.subtotal_paise,o.discount_paise,o.expires_at,o.provider_order_id,e.name AS event_name,i.pass_name,i.quantity FROM orders o JOIN events e ON e.id=o.event_id JOIN order_items i ON i.order_id=o.id WHERE o.user_id=$1 AND o.client_key=$2`,[req.user.id,input.idempotency_key]);
   if(retry.rowCount)return retry.rows[0];
   const p=await c.query(`SELECT p.id,p.name,p.amount_paise,p.capacity,p.active,e.id AS event_id,e.name AS event_name,e.status,e.starts_at,e.referral_reward_paise,e.refund_policy,e.version AS event_policy_version FROM passes p JOIN events e ON e.id=p.event_id WHERE p.id=$1 AND e.id=$2 FOR UPDATE`,[input.pass_id,input.event_id]);
   if(!p.rowCount||!p.rows[0].active||p.rows[0].status!=='published'||new Date(p.rows[0].starts_at)<=new Date())throw error(409,'This pass is not currently available');
   const pass=p.rows[0];
   const existing=await c.query("SELECT 1 FROM orders WHERE user_id=$1 AND event_id=$2 AND (status='paid' OR (status='pending' AND expires_at>now()))",[req.user.id,pass.event_id]);
   if(existing.rowCount)throw error(409,'You already have an active registration for this event');
   const held=await c.query(`SELECT COALESCE(SUM(i.quantity),0) AS quantity FROM order_items i JOIN orders o ON o.id=i.order_id WHERE i.pass_id=$1 AND (o.status='paid' OR (o.status='pending' AND o.expires_at>NOW()))`,[pass.id]);
   if(held.rows[0].quantity+input.quantity>pass.capacity)throw error(409,'There are not enough passes remaining');
   let referral=null;
   if(input.referral_code){const r=await c.query('SELECT id,referral_code FROM users WHERE referral_code=$1 AND active=true',[input.referral_code]);if(!r.rowCount)throw error(400,'Referral code is not valid');if(r.rows[0].id===req.user.id)throw error(400,'You cannot use your own referral code');referral=r.rows[0];}
   const reference=`LUC-${newToken().replace(/[^A-Za-z0-9]/g,'').slice(0,12).toUpperCase()}`,subtotal=pass.amount_paise*input.quantity,credit=referral?pass.referral_reward_paise:0;let coupon=null,discount=0;
   if(input.coupon_code){const found=await c.query(`SELECT * FROM coupons WHERE code=$1 AND active=true AND (event_id=$2 OR event_id IS NULL) ORDER BY (event_id IS NULL),event_id LIMIT 1 FOR UPDATE`,[input.coupon_code,pass.event_id]);if(!found.rowCount)throw error(400,'Coupon code is not valid');coupon=found.rows[0];if(coupon.expires_at&&new Date(coupon.expires_at)<=new Date())throw error(400,'Coupon has expired');if(subtotal<coupon.min_spend_paise)throw error(400,`This coupon requires a minimum spend of ₹${(coupon.min_spend_paise/100).toFixed(0)}`);const allUses=await c.query(`SELECT COUNT(*) AS count FROM coupon_uses u JOIN orders o ON o.id=u.order_id WHERE u.coupon_id=$1 AND (u.status='applied' OR (u.status='reserved' AND o.expires_at>NOW()))`,[coupon.id]);const userUses=await c.query(`SELECT COUNT(*) AS count FROM coupon_uses u JOIN orders o ON o.id=u.order_id WHERE u.coupon_id=$1 AND u.user_id=$2 AND (u.status='applied' OR (u.status='reserved' AND o.expires_at>NOW()))`,[coupon.id,req.user.id]);if(coupon.max_uses&&Number(allUses.rows[0].count)>=coupon.max_uses)throw error(409,'Coupon usage limit has been reached');if(Number(userUses.rows[0].count)>=coupon.per_customer)throw error(409,'You have already used this coupon');discount=coupon.discount_type==='percent'?Math.floor(subtotal*coupon.value/10000):Math.min(subtotal,coupon.value);}
   const amount=subtotal-discount,orderId=randomUUID();
   await c.query(`INSERT INTO orders(id,reference,user_id,event_id,amount_paise,subtotal_paise,discount_paise,coupon_id,referral_owner_id,referral_code_snapshot,referral_credit_paise,expires_at,client_key,refund_policy_snapshot,event_policy_version,policy_accepted_at) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,DATE_ADD(NOW(),INTERVAL 15 MINUTE),$12,$13,$14,NOW())`,[orderId,reference,req.user.id,pass.event_id,amount,subtotal,discount,coupon?.id||null,referral?.id||null,referral?.referral_code||null,credit,input.idempotency_key,pass.refund_policy,pass.event_policy_version]);
   const o=await c.query('SELECT id,reference,status,amount_paise,subtotal_paise,discount_paise,expires_at,provider_order_id,event_policy_version,policy_accepted_at FROM orders WHERE id=$1',[orderId]);
   await c.query('INSERT INTO order_items(order_id,pass_id,pass_name,unit_amount_paise,quantity) VALUES($1,$2,$3,$4,$5)',[o.rows[0].id,pass.id,pass.name,pass.amount_paise,input.quantity]);
   if(coupon)await c.query('INSERT INTO coupon_uses(coupon_id,order_id,user_id) VALUES($1,$2,$3)',[coupon.id,o.rows[0].id,req.user.id]);
   if(referral&&credit>0)await c.query('INSERT INTO wallet_entries(user_id,order_id,amount_paise) VALUES($1,$2,$3)',[referral.id,o.rows[0].id,credit]);
   return {...o.rows[0],event_name:pass.event_name,pass_name:pass.name,quantity:input.quantity};
  });
  let ticketIds=[];
  if(order.amount_paise===0&&gateway.ticketSecret&&order.status==='pending'){
   const freeReference=`free_${order.id}`;
   await pool.query('UPDATE orders SET provider_order_id=$2,checkout_created_at=now(),updated_at=now() WHERE id=$1 AND provider_order_id IS NULL',[order.id,freeReference]);
   const issued=await fulfilCapturedPayment(pool,{providerOrderId:freeReference,paymentId:freeReference,amount:0,currency:'INR',payload:{kind:'free-pass'}},gateway.ticketSecret);ticketIds=issued.tickets.map(ticket=>ticket.id);order.provider_order_id=freeReference;order.status='paid';
  }
  if(paymentEnabled&&order.amount_paise>0&&!order.provider_order_id){const provider=await razorpay('/orders',{method:'POST',body:JSON.stringify({amount:order.amount_paise,currency:'INR',receipt:order.reference,notes:{local_order_id:order.id}})});if(provider.amount!==order.amount_paise||provider.currency!=='INR')throw error(502,'Payment provider returned an invalid order');await pool.query('UPDATE orders SET provider_order_id=$2,checkout_created_at=now(),updated_at=now() WHERE id=$1 AND provider_order_id IS NULL',[order.id,provider.id]);order.provider_order_id=provider.id;}
  const payment=paymentEnabled&&order.amount_paise>0&&order.provider_order_id?{key:gateway.keyId,order_id:order.provider_order_id,amount:order.amount_paise,currency:'INR',name:'The Lucid’s Way',description:`${order.event_name} · ${order.pass_name}`,prefill:{name:req.user.name,email:req.user.email,contact:req.user.phone||''}}:null;
  const message=payment?'Complete payment to issue your ticket.':order.status==='paid'?'Your free pass is confirmed and its QR is ready in My tickets.':order.amount_paise===0?'Free ticket issuing is being configured, so no ticket has been issued.':'Your pass selection is reserved briefly. Online payment is not configured, so no ticket has been issued.';
  res.status(201).json({order,payment,ticket_ids:ticketIds,payment_enabled:!!payment,message});
 });
 app.use('/api',(req,res)=>res.status(404).json({error:'API endpoint not found'}));
 // Production serves the familiar UI, but never its hard-coded catalogue or demo checkout.
 const accountControl='<a class="account-entry" href="/account" aria-label="Open your account"><span class="account-entry__icon" aria-hidden="true"><svg viewBox="0 0 24 24"><circle cx="12" cy="8" r="3.25"/><path d="M5.5 19c.7-3.3 3-5 6.5-5s5.8 1.7 6.5 5"/></svg></span><span class="account-entry__label">Account</span></a>';
 const shell=(await readFile(`${dist}/index.html`,'utf8')).replace('</head>','<link rel="stylesheet" href="/production-event.css"></head>').replace('</header>',accountControl+'</header>').replace(/<script src="\/app\.js(?:\?[^"]*)?"><\/script>/,'<script src="/production-site.js"></script>').replace(/<script src="\/booking\.js(?:\?[^"]*)?"><\/script>/,'');
 app.get(['/', '/index.html', '/events/:slug','/events/:slug/', '/events/:slug/index.html'],(req,res)=>res.type('html').send(shell));
 app.get(['/about','/about/','/contact','/contact/','/terms','/terms/','/privacy','/privacy/','/refunds','/refunds/','/delivery','/delivery/','/support','/support/'],(req,res)=>{const key=req.path.split('/').filter(Boolean)[0];res.type('html').send(renderLegalPage(key));});
 app.get(['/account','/account/','/admin'], (req,res)=>res.sendFile(`${dist}/admin.html`));
 app.get(['/memories/:slug','/memories/:slug/','/memories/:slug/index.html'],async(req,res,next)=>{
  if(!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(req.params.slug))return next();
  try{const page=await readFile(`${dist}/memories/${req.params.slug}/index.html`,'utf8');res.type('html').send(page.replace('</header>',accountControl+'</header>').replace(/<footer>[\s\S]*?<\/footer>/,legalFooter).replace('</head>','<link rel="stylesheet" href="/legal.css"></head>'));}catch(e){if(e.code==='ENOENT')return next();throw e;}
 });
 app.use(express.static(dist,{index:false,dotfiles:'deny',maxAge:0}));
 app.use((err,req,res,next)=>{
  if(res.headersSent)return next(err);
  if(err.type==='entity.too.large')return res.status(413).json({error:'The uploaded image must be smaller than 8 MB'});
  if(err instanceof z.ZodError)return res.status(400).json({error:'Check the submitted fields',details:err.issues.map(i=>({field:i.path.join('.'),message:i.message}))});
  if(err.code==='ER_DUP_ENTRY'){
   if(/users\.(email|phone)|users_(email|phone)|email|phone/i.test(err.message))return res.status(409).json({error:'An account already uses that email or phone number'});
   return res.status(409).json({error:'That value is already in use'});
  }
  const status=err.status||500;if(status>=500&&status!==503)console.error('Request failed',err.code||err.name);
  res.status(status).json({error:status>=500&&status!==503?'Service temporarily unavailable':err.message});
 });
 return app;
}
