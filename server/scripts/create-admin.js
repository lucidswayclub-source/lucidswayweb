import {createPool} from '../db.js';
import {hashPassword,newToken} from '../auth.js';
import {randomUUID} from 'node:crypto';
import {z} from 'zod';
const email=z.string().email().parse(process.env.ADMIN_EMAIL).toLowerCase();
const password=z.string().min(14).max(256).parse(process.env.ADMIN_PASSWORD);
const name=z.string().min(1).parse(process.env.ADMIN_NAME||'Administrator');
const pool=createPool();
try{await pool.query("INSERT INTO users(id,email,name,password_hash,role,referral_code) VALUES($1,$2,$3,$4,'admin',$5)",[randomUUID(),email,name,await hashPassword(password),newToken().replace(/[^A-Za-z0-9]/g,'').slice(0,10).toUpperCase()]);console.log('Administrator created. Remove ADMIN_PASSWORD from your environment.');}finally{await pool.end();}
