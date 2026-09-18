import {createServer} from 'node:http';
import {createPool} from './db.js';
import {createApp} from './app.js';
import {migrate} from './scripts/migrate.js';
import {bootstrapAdministrator} from './bootstrap.js';

const production=process.env.NODE_ENV==='production';
const razorpaySettings=['RAZORPAY_KEY_ID','RAZORPAY_KEY_SECRET','RAZORPAY_WEBHOOK_SECRET'],configured=razorpaySettings.filter(key=>process.env[key]);
const port=Number(process.env.PORT||5174),pool=createPool();
let handler=(request,response)=>{
 response.writeHead(503,{'Content-Type':'text/plain; charset=utf-8','Retry-After':'5','Cache-Control':'no-store'});
 response.end('Lucidsway is starting. Please retry in a moment.');
};
const server=createServer((request,response)=>handler(request,response));
server.listen(port,process.env.HOST||(production?'0.0.0.0':'127.0.0.1'),()=>console.log(`Server listening on port ${port}; initializing application.`));
for(const signal of ['SIGTERM','SIGINT'])process.on(signal,()=>server.close(async()=>{await pool.end();process.exit(0);}));

async function main() {
 if(production&&(!process.env.APP_ORIGIN?.startsWith('https://')))throw Error('Production APP_ORIGIN must use HTTPS');
 if(configured.length&&configured.length!==razorpaySettings.length)throw Error('Configure all Razorpay settings together, or leave all three blank to disable paid checkout');
 if(configured.length&&!process.env.TICKET_SECRET)throw Error('TICKET_SECRET is required when Razorpay checkout is configured');
 await migrate(pool);
 if(await bootstrapAdministrator(pool))console.log('Initial administrator created; remove BOOTSTRAP_ADMIN_* environment variables and redeploy.');
 await pool.query('SELECT 1');
 const app=await createApp(pool,{origin:process.env.APP_ORIGIN||`http://localhost:${port}`,production});
 handler=app;
 console.log(`Application ready; checkout ${configured.length?'enabled':'disabled'}.`);
}

main().catch(error=>{
 console.error(error);
 process.exitCode=1;
});
