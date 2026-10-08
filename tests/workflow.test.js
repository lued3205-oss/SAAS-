import test from 'node:test';import assert from 'node:assert/strict';import {mkdtempSync,rmSync} from 'node:fs';import {tmpdir}from'node:os';import{join}from'node:path';import {createApp} from '../server/app.js';
test('customer registration, isolation, payment review, progress and restart persistence',async()=>{
 const dir=mkdtempSync(join(tmpdir(),'atlas-test-'));const path=join(dir,'db.sqlite');let db,server;const start=async()=>{const x=createApp({dbPath:path,adminEmail:'admin@example.com',adminPassword:'LongAdminPassword123!'});db=x.db;server=await new Promise(r=>{const s=x.app.listen(0,'127.0.0.1',()=>r(s))});return 'http://127.0.0.1:'+server.address().port};let base=await start();
 const request=async(path,body,cookie)=>{const r=await fetch(base+'/api'+path,{method:body?'POST':'GET',headers:{...(body?{'Content-Type':'application/json'}:{}),...(cookie?{Cookie:cookie}:{})},body:body?JSON.stringify(body):undefined});return {status:r.status,data:await r.json(),cookie:r.headers.get('set-cookie')?.split(';')[0]}};
 try{const a=await request('/auth/register',{name:'客户甲',email:'first@example.com',password:'StrongPassword123!'});assert.equal(a.status,200);const b=await request('/auth/register',{name:'客户乙',email:'second@example.com',password:'StrongPassword123!'});const admin=await request('/auth/login',{email:'admin@example.com',password:'LongAdminPassword123!'});
 const c=await request('/companies',{name:'Northstar Ltd',country:'UK',director:'Jane Doe',address:'London UK',business:'Consulting'},a.cookie);assert.equal(c.status,201);const id=c.data.id;
 assert.equal((await request('/companies/'+id,undefined,b.cookie)).status,404);assert.deepEqual((await request('/companies',undefined,b.cookie)).data,[]);
 assert.equal((await request('/companies/'+id+'/status',{status:'registered',note:'Unauthorized'},a.cookie)).status,403);
 assert.equal((await request('/companies/'+id+'/payments',{channel:'alipay',reference:'TX-1001'},a.cookie)).status,201);
 assert.equal((await request('/companies/'+id+'/payments',{channel:'wechat',reference:'TX-1002'},a.cookie)).status,409);
 const details=(await request('/companies/'+id,undefined,admin.cookie)).data;const payment=details.payments[0];assert.equal(payment.amount,29900);assert.equal(payment.status,'pending');
 assert.equal((await request('/payments/'+payment.id+'/review',{status:'paid'},a.cookie)).status,403);
 assert.equal((await request('/payments/'+payment.id+'/review',{status:'paid'},admin.cookie)).status,200);
 assert.equal((await request('/companies/'+id+'/status',{status:'registered',note:'公司注册完成，官方证书已收到。'},admin.cookie)).status,200);
 const completed=(await request('/companies/'+id,undefined,a.cookie)).data;assert.equal(completed.status,'registered');assert.equal(completed.events.length,2);assert.equal(completed.payments[0].status,'paid');
 assert.equal((await request('/companies',undefined,admin.cookie)).data[0].payment_status,'paid');
 await new Promise(r=>server.close(r));db.close();base=await start();const restored=(await request('/companies/'+id,undefined,a.cookie)).data;assert.equal(restored.name,'Northstar Ltd');assert.equal(restored.payments[0].status,'paid');assert.equal(restored.events.length,2);
 const csrf=await fetch(base+'/api/auth/logout',{method:'POST',headers:{Origin:'https://attacker.example',Cookie:a.cookie,'Content-Type':'application/json'},body:'{}'});assert.equal(csrf.status,403);
 assert.equal((await request('/auth/logout',{},a.cookie)).status,200);assert.equal((await request('/companies',undefined,a.cookie)).status,401);
 }finally{await new Promise(r=>server.close(r));db.close();rmSync(dir,{recursive:true,force:true})}
});
