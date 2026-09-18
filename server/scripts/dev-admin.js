import {writeFile,readFile} from 'node:fs/promises';
import {createPool} from '../db.js';
import {newToken,hashPassword} from '../auth.js';
import {randomUUID} from 'node:crypto';
if(process.env.NODE_ENV==='production'||!['localhost','127.0.0.1'].includes(new URL(process.env.DATABASE_URL).hostname))throw Error('Local development only');
const pool=createPool();
try{
 const email='local-admin@lucidsway.test';
 const existing=await pool.query('SELECT 1 FROM users WHERE email=$1',[email]);
 if(!existing.rowCount){const password=newToken(),referral=newToken().replace(/[^A-Za-z0-9]/g,'').slice(0,10).toUpperCase();await pool.query("INSERT INTO users(id,email,name,password_hash,role,referral_code) VALUES($1,$2,'Local administrator',$3,'admin',$4)",[randomUUID(),email,await hashPassword(password),referral]);await writeFile('.local/admin-credentials.json',JSON.stringify({email,password},null,2),{mode:0o600});}
 console.log('Local admin credentials: .local/admin-credentials.json');
}finally{await pool.end();}
