import {randomBytes,scrypt as scryptCallback,timingSafeEqual,createHash} from 'node:crypto';
import {promisify} from 'node:util';
const scrypt=promisify(scryptCallback);
export const digest=value=>createHash('sha256').update(value).digest('hex');
export async function hashPassword(password){
 const salt=randomBytes(16).toString('hex');const key=await scrypt(password,salt,64);
 return `${salt}:${Buffer.from(key).toString('hex')}`;
}
export async function verifyPassword(password,hash){
 const [salt,hex]=hash.split(':');if(!salt||!hex)return false;
 const key=Buffer.from(await scrypt(password,salt,64)),expected=Buffer.from(hex,'hex');
 return key.length===expected.length&&timingSafeEqual(key,expected);
}
export const newToken=()=>randomBytes(32).toString('base64url');
export function sessionToken(req){
 const raw=req.headers.cookie?.split(';').map(s=>s.trim()).find(s=>s.startsWith('lucid_session='))?.slice(14);
 return raw&&/^[A-Za-z0-9_-]{43}$/.test(raw)?raw:null;
}
