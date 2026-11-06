import {test} from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import worker from './worker.js';
import {DailyQuota,dailyWindow,networkIdentity} from './quota.js';

function fixture() {
  const db=new DatabaseSync(':memory:'); let alarm=null;
  const ctx={storage:{sql:{exec(query,...args){return {toArray:()=>db.prepare(query).all(...args)}}},transactionSync(fn){db.exec('BEGIN');try{const value=fn();db.exec('COMMIT');return value}catch(e){db.exec('ROLLBACK');throw e}},getAlarm:async()=>alarm,setAlarm:async value=>{alarm=value},deleteAll:async()=>db.exec('DELETE FROM counters')}};
  // CREATE TABLE must execute immediately, as Cloudflare sql.exec does.
  ctx.storage.sql.exec=(query,...args)=>{const rows=db.prepare(query).all(...args);return {toArray:()=>rows}};
  let object=new DailyQuota(ctx);
  const env={APP_TOKEN:'test-only-secret',DEVICE_SIGNING_KEY:'server-only-signing-secret',ALLOWED_ORIGIN:'https://s2oud.github.io',DAILY_QUOTA:{idFromName:name=>name,get:()=>({fetch:(url,init)=>object.fetch(new Request(url,init))})}};
  const request=(path='/usage',opts={})=>worker.fetch(new Request('https://example.test'+path,{method:opts.consume?'POST':'GET',headers:{Authorization:'Bearer '+(opts.auth||env.APP_TOKEN),'CF-Connecting-IP':opts.ip||'192.0.2.10',...(opts.token?{'X-Device-Token':opts.token}:{}),...opts.headers},...(opts.consume?{body:JSON.stringify({country:'UAE'})}:{})}),env);
  return {env,request,restart(){object=new DailyQuota(ctx)}};
}
test('Dubai midnight and IPv6 /64 grouping',()=>{
  assert.equal(dailyWindow(Date.parse('2026-11-06T19:59:59Z')).resetAt,'2026-11-06T20:00:00.000Z');
  assert.equal(dailyWindow(Date.parse('2026-11-06T20:00:00Z')).resetAt,'2026-11-07T20:00:00.000Z');
  assert.equal(networkIdentity('2001:db8:1:2::1'),networkIdentity('2001:0db8:0001:0002:aaaa:bbbb:cccc:dddd'));
});
test('parallel requests allow exactly 10; reset browser and forged forwarding cannot reset network quota',async()=>{
  const f=fixture();
  const replies=await Promise.all(Array.from({length:30},()=>f.request('/search',{consume:true})));
  assert.equal(replies.filter(r=>r.status===429).length,20);
  assert.equal(replies.filter(r=>r.status===400).length,10);
  const denied=await f.request('/brief',{consume:true,headers:{'X-Forwarded-For':'198.51.100.99','X-Real-IP':'198.51.100.99','X-Device-Token':'forged'}});
  assert.equal(denied.status,429);assert.ok(Number(denied.headers.get('Retry-After'))>0);
  f.restart();
  const usage=(await (await f.request()).json()).usage;
  assert.equal(usage.used,10);assert.equal(usage.remaining,0);
});
test('signed device retains cap when network changes; tampering cannot claim another device',async()=>{
  const f=fixture(),token=(await (await f.request()).json()).usage.deviceToken;
  for(let i=0;i<10;i++)await f.request('/search',{consume:true,token});
  assert.equal((await f.request('/search',{consume:true,token,ip:'198.51.100.20'})).status,429);
  const forged=(await (await f.request('/usage',{token:token+'x',ip:'198.51.100.21'})).json()).usage;
  assert.notEqual(forged.deviceToken,token+'x');
});
test('connection checks are free, unauthenticated requests rejected, quota failure is closed',async()=>{
  const f=fixture();
  for(let i=0;i<15;i++)assert.equal((await f.request('/auth-check')).status,200);
  assert.equal((await (await f.request()).json()).usage.used,0);
  assert.equal((await f.request('/search',{consume:true,auth:'wrong'})).status,401);
  f.env.DAILY_QUOTA=null;
  assert.equal((await f.request('/search',{consume:true})).status,503);
});
