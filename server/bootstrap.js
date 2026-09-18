import {randomUUID} from 'node:crypto';
import {z} from 'zod';
import {hashPassword,newToken} from './auth.js';
import {transaction} from './db.js';

export async function bootstrapAdministrator(pool) {
 const email=process.env.BOOTSTRAP_ADMIN_EMAIL,password=process.env.BOOTSTRAP_ADMIN_PASSWORD,name=process.env.BOOTSTRAP_ADMIN_NAME||'Lucidsway administrator';
 if(!email&&!password)return false;
 const input=z.object({email:z.string().email(),password:z.string().min(14).max(256),name:z.string().trim().min(1).max(160)}).parse({email,password,name});
 return transaction(pool,async connection=>{
  const existing=await connection.query('SELECT id,role FROM users WHERE email=$1 FOR UPDATE',[input.email.toLowerCase()]);
  if(existing.rowCount){if(existing.rows[0].role!=='admin')throw new Error('BOOTSTRAP_ADMIN_EMAIL belongs to a non-admin account');return false;}
  const administrator=await connection.query("SELECT email FROM users WHERE role='admin' LIMIT 1 FOR UPDATE");
  if(administrator.rowCount)throw new Error(`An administrator already exists as ${administrator.rows[0].email}; remove BOOTSTRAP_ADMIN_* variables`);
  const referral=newToken().replace(/[^A-Za-z0-9]/g,'').slice(0,10).toUpperCase();
  await connection.query("INSERT INTO users(id,email,name,password_hash,role,referral_code) VALUES($1,$2,$3,$4,'admin',$5)",[randomUUID(),input.email.toLowerCase(),input.name,await hashPassword(input.password),referral]);
  return true;
 });
}
