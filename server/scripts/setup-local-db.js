import mysql from 'mysql2/promise';
const url=new URL(process.env.DATABASE_URL);
if(!['localhost','127.0.0.1'].includes(url.hostname))throw Error('Local development only');
const connection=await mysql.createConnection({host:url.hostname,port:Number(url.port||3306),user:decodeURIComponent(url.username),password:decodeURIComponent(url.password)});
try{for(const database of ['lucidsway','lucidsway_test'])await connection.query(`CREATE DATABASE IF NOT EXISTS \`${database}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci`);}
finally{await connection.end();}
console.log('Local databases ready');
