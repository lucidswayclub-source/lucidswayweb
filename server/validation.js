import {z} from 'zod';
const safeURL=z.string().max(2048).refine(v=>!v||(/^https:\/\//.test(v)&&URL.canParse(v))||/^\/api\/event-images\/[0-9a-f-]+$/.test(v),'Use an HTTPS URL, upload an image, or leave blank');
const time=z.string().datetime({offset:true});
const pass=z.object({id:z.string().uuid().optional(),name:z.string().trim().min(1).max(80),amount_paise:z.number().int().min(0).max(100000000),capacity:z.number().int().min(1).max(1000000),active:z.boolean().default(true)}).strict();
export const eventInput=z.object({
 slug:z.string().min(1).max(100).regex(/^[a-z0-9]+(-[a-z0-9]+)*$/),
 name:z.string().trim().min(1).max(150),description:z.string().trim().min(1).max(10000),
 city:z.string().trim().min(1).max(100),venue:z.string().trim().min(1).max(200),
 maps_url:safeURL.default(''),image_url:safeURL.default(''),starts_at:time,ends_at:time,
 refund_policy:z.string().trim().min(20).max(5000),
 timezone:z.string().refine(v=>{try{new Intl.DateTimeFormat('en',{timeZone:v});return true;}catch{return false;}},'Invalid timezone'),
 status:z.enum(['draft','published','archived']).default('draft'),
 referral_reward_paise:z.number().int().min(0).max(1000000).default(0),
 version:z.number().int().positive().optional(),passes:z.array(pass).min(1).max(20)
}).strict().superRefine((e,ctx)=>{
 if(Date.parse(e.ends_at)<=Date.parse(e.starts_at))ctx.addIssue({code:'custom',path:['ends_at'],message:'End must be after start'});
 if(new Set(e.passes.map(p=>p.name.toLowerCase())).size!==e.passes.length)ctx.addIssue({code:'custom',path:['passes'],message:'Pass names must be unique'});
 const ids=e.passes.filter(p=>p.id).map(p=>p.id);if(new Set(ids).size!==ids.length)ctx.addIssue({code:'custom',path:['passes'],message:'Pass IDs must be unique'});
 if(e.status==='published'&&!e.passes.some(p=>p.active))ctx.addIssue({code:'custom',path:['passes'],message:'Published events need an active pass'});
});
export const loginInput=z.object({email:z.string().trim().email().max(254).transform(v=>v.toLowerCase()),password:z.string().min(1).max(256)}).strict();
export const signupInput=z.object({
 name:z.string().trim().min(2).max(120),
 email:z.string().trim().email().max(254).transform(v=>v.toLowerCase()),
 phone:z.string().trim().regex(/^\+[1-9]\d{7,14}$/,'Use an international number such as +919876543210'),
 password:z.string().min(12).max(256)
}).strict();
export const memberInput=z.object({
 user_id:z.string().uuid(),membership_type:z.enum(['creator','volunteer']),
 can_edit:z.boolean().default(false),can_scan:z.boolean().default(false),
 can_export:z.boolean().default(false),can_manage_members:z.boolean().default(false)
}).strict();
export const orderInput=z.object({
 event_id:z.string().uuid(),pass_id:z.string().uuid(),quantity:z.number().int().min(1).max(10),
 referral_code:z.string().trim().toUpperCase().max(32).optional().default(''),coupon_code:z.string().trim().toUpperCase().max(32).optional().default(''),idempotency_key:z.string().uuid(),
 accepted_refund_policy:z.literal(true)
}).strict();
export const couponInput=z.object({
 event_id:z.string().uuid().nullable().default(null),code:z.string().trim().toUpperCase().regex(/^[A-Z0-9_-]{3,32}$/),
 discount_type:z.enum(['percent','fixed']),value:z.number().int().positive().max(100000000),
 min_spend_paise:z.number().int().min(0).max(100000000).default(0),max_uses:z.number().int().positive().nullable().default(null),
 per_customer:z.number().int().positive().max(100).default(1),expires_at:z.string().datetime({offset:true}).nullable().default(null),active:z.boolean().default(true)
}).strict().superRefine((coupon,ctx)=>{if(coupon.discount_type==='percent'&&coupon.value>10000)ctx.addIssue({code:'custom',path:['value'],message:'Percentage cannot exceed 100%'});});
