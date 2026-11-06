import {test} from 'node:test';
import assert from 'node:assert/strict';
import worker from './worker.js';
import {startFullReveal,fullRevealStatus,readFullTicket} from './fullenrich.js';
const env={FULLENRICH_API_KEY:'test-only-full-secret'},source='https://www.linkedin.com/in/example',jobId='11111111-1111-4111-8111-111111111111';
test('FullEnrich creates exactly one job, requests only the selected field, and binds polling to the original browser',async()=>{
  const original=globalThis.fetch;let starts=0,polls=0;
  globalThis.fetch=async(url,init)=>{if(init.method==='POST'){starts++;const body=JSON.parse(init.body);assert.deepEqual(body.data[0].enrich_fields,['contact.work_emails']);assert.equal(body.data[0].linkedin_url,source);return Response.json({enrichment_id:jobId})}polls++;return Response.json({status:'FINISHED',cost:{credits:1},data:[{input:{professional_network_url:source},contact_info:{work_emails:[{email:'work@example.org',status:'DELIVERABLE'},{email:'masked***@example.org',status:'DELIVERABLE'}],personal_emails:[{email:'private@gmail.com',status:'DELIVERABLE'}],phones:[{number:'+97140000000',line_type:'MOBILE',line_status:'ACTIVE'}]}}]})};
  try{const started=await startFullReveal(env,{source,reveal:'email'},'original-browser');assert.equal(started.lookup.status,'pending');assert.ok(started.lookup.ticket);await assert.rejects(()=>readFullTicket(env,started.lookup.ticket,'another-browser'));await assert.rejects(()=>fullRevealStatus(env,started.lookup.ticket+'x','original-browser'));assert.equal(polls,0);const result=await fullRevealStatus(env,started.lookup.ticket,'original-browser');assert.equal(starts,1);assert.equal(polls,1);assert.deepEqual(result.contact.emails,['work@example.org']);assert.equal(result.contact.phone,null);assert.equal(result.lookup.status,'found');assert.equal(result.lookup.creditsCharged,1)}finally{globalThis.fetch=original}
});
test('existing FullEnrich job polling stays free even when the daily cap is reached',async()=>{
  const original=globalThis.fetch;let consumed=0,providerStarts=0;
  const testEnv={...env,APP_TOKEN:'test',DAILY_QUOTA:{idFromName:x=>x,get:()=>({fetch:async(url,init)=>{const b=JSON.parse(init.body);if(b.consume)consumed++;return Response.json({allowed:consumed<2,used:10,remaining:0,limit:10})}})}};
  globalThis.fetch=async(url,init)=>{if(init.method==='POST'){providerStarts++;return Response.json({enrichment_id:jobId})}return Response.json({status:'FINISHED',data:[]})};
  const call=(path,body,token='')=>worker.fetch(new Request('https://example.test'+path,{method:'POST',headers:{Authorization:'Bearer test','CF-Connecting-IP':'192.0.2.1','X-Device-Token':token},body:JSON.stringify(body)}),testEnv);
  try{const start=await(await call('/enrich',{provider:'FullEnrich',source,reveal:'phone'})).json();assert.ok(start.lookup.ticket);assert.equal(consumed,1);const response=await call('/enrich-status',{ticket:start.lookup.ticket},start.usage.deviceToken);assert.equal(response.status,200);assert.equal((await response.json()).lookup.status,'not_found');assert.equal(consumed,1);assert.equal(providerStarts,1)}finally{globalThis.fetch=original}
});
