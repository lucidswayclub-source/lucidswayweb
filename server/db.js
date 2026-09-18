import mysql from 'mysql2/promise';

function configuration(url=process.env.DATABASE_URL) {
  if (!url) throw new Error('DATABASE_URL is required. See .env.example.');
  const parsed=new URL(url);
  if(!['mysql:','mysql2:'].includes(parsed.protocol))throw new Error('DATABASE_URL must use mysql://');
  return {host:parsed.hostname,port:Number(parsed.port||3306),user:decodeURIComponent(parsed.username),password:decodeURIComponent(parsed.password),database:decodeURIComponent(parsed.pathname.slice(1)),waitForConnections:true,connectionLimit:10,queueLimit:0,connectTimeout:5000,timezone:'Z',charset:'utf8mb4',decimalNumbers:true};
}

function statement(sql,values=[]) {
  const bound=[];
  const text=sql.replace(/\$(\d+)/g,(_,position)=>{let value=values[Number(position)-1];if(typeof value==='string'&&/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?Z$/.test(value))value=new Date(value);bound.push(value&&typeof value==='object'&&!Buffer.isBuffer(value)&&!(value instanceof Date)?JSON.stringify(value):value);return '?';});
  return [text,bound];
}

function client(connection,release) {
  const booleans=new Set(['active','can_edit','can_scan','can_export','can_manage_members']);
  return {
    async query(sql,values=[]) {const [text,bound]=statement(sql,values);const [result]=await connection.query(text,bound);const rows=Array.isArray(result)?result.map(row=>{for(const key of booleans)if(Object.hasOwn(row,key))row[key]=Boolean(row[key]);return row;}):[];return {rows,rowCount:Array.isArray(result)?result.length:result.affectedRows,insertId:result.insertId};},
    async begin(){await connection.beginTransaction();},async commit(){await connection.commit();},async rollback(){await connection.rollback();},release
  };
}

export function createPool(url=process.env.DATABASE_URL) {
  const raw=mysql.createPool(configuration(url));
  return {async query(sql,values=[]){return client(raw,()=>{}).query(sql,values);},async connect(){const connection=await raw.getConnection();return client(connection,()=>connection.release());},async end(){await raw.end();}};
}
export async function transaction(pool,work) {
  const connection=await pool.connect();
  try {await connection.begin();const result=await work(connection);await connection.commit();return result;}
  catch(error){await connection.rollback();throw error;}
  finally{connection.release();}
}

export async function resetTestDatabase(pool,url=process.env.TEST_DATABASE_URL) {
  if(!url||!new URL(url).pathname.endsWith('_test'))throw new Error('Refusing to reset a database whose name does not end in _test');
  const connection=await pool.connect();
  try{
    await connection.query('SET FOREIGN_KEY_CHECKS=0');
    const tables=await connection.query('SHOW TABLES');
    for(const row of tables.rows){const name=Object.values(row)[0];if(!/^[A-Za-z0-9_]+$/.test(name))throw new Error('Unsafe table name');await connection.query(`DROP TABLE IF EXISTS \`${name}\``);}
  }finally{await connection.query('SET FOREIGN_KEY_CHECKS=1');connection.release();}
}
