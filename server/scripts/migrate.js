import {readdir,readFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';
import {createPool} from '../db.js';
export async function migrate(pool) {
 const c=await pool.connect();
 try {
  const lock=await c.query("SELECT GET_LOCK('lucidsway_migrations',10) AS acquired");
  if(lock.rows[0].acquired!==1)throw Error('Could not acquire the database migration lock');
  await c.query('CREATE TABLE IF NOT EXISTS schema_migrations(name VARCHAR(255) PRIMARY KEY, checksum CHAR(64) NOT NULL, applied_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3)) ENGINE=InnoDB');
  const dir=new URL('../migrations/',import.meta.url);
  for(const name of (await readdir(dir)).filter(n=>n.endsWith('.sql')).sort()) {
   const sql=await readFile(new URL(name,dir),'utf8'),hash=createHash('sha256').update(sql).digest('hex');
   const existing=await c.query('SELECT checksum FROM schema_migrations WHERE name=$1',[name]);
   if(existing.rowCount){if(existing.rows[0].checksum!==hash)throw Error(`Applied migration changed: ${name}`);continue;}
   await c.begin();
   try {for(const command of sql.split(/;\s*(?:\r?\n|$)/).map(value=>value.trim()).filter(Boolean))await c.query(command);await c.query('INSERT INTO schema_migrations(name,checksum) VALUES($1,$2)',[name,hash]);await c.commit();}
   catch(e){await c.rollback();throw e;}
  }
 }finally{try{await c.query("SELECT RELEASE_LOCK('lucidsway_migrations')");}finally{c.release();}}
}
if(process.argv[1]===fileURLToPath(import.meta.url)){
 const pool=createPool();
 migrate(pool)
  .then(()=>console.log('Database migrations applied.'))
  .catch(error=>{console.error(error);process.exitCode=1;})
  .finally(()=>pool.end());
}
