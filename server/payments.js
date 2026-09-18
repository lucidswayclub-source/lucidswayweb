import {createHmac,timingSafeEqual,randomUUID} from 'node:crypto';
import {transaction} from './db.js';
import {digest} from './auth.js';

const safeEqual=(left,right)=>{const a=Buffer.from(left||''),b=Buffer.from(right||'');return a.length===b.length&&timingSafeEqual(a,b);};
export const hmac=(value,secret)=>createHmac('sha256',secret).update(value).digest('hex');
export const verifyCheckoutSignature=({providerOrderId,paymentId,signature},secret)=>safeEqual(hmac(`${providerOrderId}|${paymentId}`,secret),signature);
export const verifyWebhookSignature=(body,signature,secret)=>safeEqual(createHmac('sha256',secret).update(body).digest('hex'),signature);
export const ticketToken=(id,secret)=>`${id}.${hmac(id,secret)}`;

export async function fulfilCapturedPayment(pool,{providerOrderId,paymentId,amount,currency,eventIdentity,payload},ticketSecret){
 return transaction(pool,async c=>{
  if(eventIdentity){const inserted=await c.query(`INSERT IGNORE INTO payment_events(provider,event_id,event_type,payload) VALUES('razorpay',$1,'payment.captured',$2)`,[eventIdentity,payload]);if(!inserted.rowCount)return {duplicate:true,tickets:[]};}
  const found=await c.query('SELECT * FROM orders WHERE provider_order_id=$1 FOR UPDATE',[providerOrderId]);
  if(!found.rowCount)throw Object.assign(new Error('Payment order not found'),{status:404});const order=found.rows[0];
  if(order.amount_paise!==amount||order.currency!==currency)throw Object.assign(new Error('Captured payment does not match the order'),{status:409});
  if(order.status==='paid')return {duplicate:true,tickets:[]};if(order.status!=='pending')throw Object.assign(new Error('Order cannot be fulfilled from its current state'),{status:409});
  const [items,user]=await Promise.all([c.query('SELECT * FROM order_items WHERE order_id=$1 ORDER BY id',[order.id]),c.query('SELECT email FROM users WHERE id=$1',[order.user_id])]),tickets=[];
  for(const item of items.rows)for(let n=0;n<item.quantity;n++){
   const id=randomUUID(),token=ticketToken(id,ticketSecret);
   await c.query(`INSERT INTO tickets(id,order_id,order_item_id,user_id,event_id,pass_name,token_hash) VALUES($1,$2,$3,$4,$5,$6,$7)`,[id,order.id,item.id,order.user_id,order.event_id,item.pass_name,digest(token)]);
   await c.query(`INSERT INTO delivery_outbox(ticket_id,channel,recipient) VALUES($1,'email',$2)`,[id,user.rows[0].email]);tickets.push({id,token});
  }
  await c.query("UPDATE orders SET status='paid',provider_payment_id=$2,paid_at=now(),updated_at=now() WHERE id=$1",[order.id,paymentId]);
  await c.query("UPDATE coupon_uses SET status='applied' WHERE order_id=$1",[order.id]);
  await c.query("UPDATE wallet_entries SET status='available',available_at=now() WHERE order_id=$1 AND status='pending'",[order.id]);
  return {duplicate:false,tickets};
 });
}
