import {test} from 'node:test';
import assert from 'node:assert/strict';
import worker from './worker.js';
import {profileURL,prepareReveal,getProspectReveal,getProspectSearch,searchFilters} from './getprospect.js';
import {resolveCompany} from './company-directory.js';
const keyEnv={GETPROSPECT_API_KEY:'test-only'};

test('only exact professional LinkedIn profile URLs are accepted before any quota or provider work',async()=>{
  assert.equal(profileURL('https://ae.linkedin.com/in/example/?trk=foo'),'https://www.linkedin.com/in/example');
  for(const source of ['https://evillinkedin.com/in/example','https://linkedin.com/jobs/view/123','https://example.com/in/a','http://linkedin.com/in/a'])assert.equal(profileURL(source),'');
  assert.throws(()=>prepareReveal({source:'https://linkedin.com/in/a',reveal:'both'},keyEnv));
  let calls=0;const env={...keyEnv,APP_TOKEN:'test',DAILY_QUOTA:{idFromName:x=>x,get:()=>({fetch:async()=>{calls++;return Response.json({allowed:true})}})}};
  const r=await worker.fetch(new Request('https://example.test/enrich',{method:'POST',headers:{Authorization:'Bearer test'},body:JSON.stringify({source:'https://linkedin.com/jobs/view/a',reveal:'phone'})}),env);
  assert.equal(r.status,400);assert.equal(calls,0);
});
test('structured recruiting search never spends contact reveal credits and preserves provider evidence',async()=>{
  const original=globalThis.fetch;
  globalThis.fetch=async(url,init)=>{const b=JSON.parse(init.body);assert.equal(b.enrich_email,false);assert.equal(b.enrich_phone,false);assert.deepEqual(b.filters.person_location.include,['United Arab Emirates']);assert.ok(b.filters.person_job_title.include.includes('Recruiter'));assert.ok(b.filters.company.name.include.includes('ADIA'));return Response.json({success:true,data:[{id:'person-a',full_name:'Example Recruiter',linkedin_url:'https://ae.linkedin.com/in/example',primary_position:{job_title:'Senior Recruiter',company:{name:'ADIA'}},email:{status:'valid',revealed:false,address:null}}]})};
  try{const results=await getProspectSearch(keyEnv,resolveCompany('ADIA'),'UAE',['hr-recruiting']);assert.equal(results.length,1);assert.equal(results[0].contactAvailability.email,true);assert.equal(results[0].url,'https://www.linkedin.com/in/example');assert.ok(!Object.hasOwn(results[0],'emails'));assert.match(results[0].title,/Senior Recruiter at ADIA/)}finally{globalThis.fetch=original}
});
test('email and phone reveals are separate, unmasked, source-matched and provider-labelled',async()=>{
  const original=globalThis.fetch;let mode='email';
  globalThis.fetch=async(url,init)=>{const b=JSON.parse(init.body);assert.equal(b.enrich_email,mode==='email');assert.equal(b.enrich_phone,mode==='phone');return Response.json({success:true,data:{linkedin_url:'https://linkedin.com/in/example',email:{status:'valid',address:'test@example.org',revealed:true},mobile_phone:{status:'found',number:'+97140000000',revealed:true},primary_position:{job_title:'Recruiter',company:{name:'Example'}}}})};
  try{const email=await getProspectReveal(keyEnv,{source:'https://www.linkedin.com/in/example',reveal:'email'});assert.deepEqual(email.contact.emails,['test@example.org']);assert.equal(email.contact.phone,null);assert.equal(email.lookup.provider,'GetProspect');mode='phone';const phone=await getProspectReveal(keyEnv,{source:'https://www.linkedin.com/in/example',reveal:'phone'});assert.deepEqual(phone.contact.emails,[]);assert.equal(phone.contact.phone,'+97140000000');
    globalThis.fetch=async()=>Response.json({success:true,data:{linkedin_url:'https://linkedin.com/in/someone-else',email:{status:'valid',address:'private@example.org',revealed:true}}});await assert.rejects(()=>getProspectReveal(keyEnv,{source:'https://www.linkedin.com/in/example',reveal:'email'}),/different profile/);
    globalThis.fetch=async()=>Response.json({success:true,data:{email:{status:'valid',address:'masked***@example.org',revealed:true}}});assert.equal((await getProspectReveal(keyEnv,{source:'https://www.linkedin.com/in/example',reveal:'email'})).lookup.status,'not_found');
  }finally{globalThis.fetch=original}
});
test('provider diagnostics are authenticated, free and never return credentials',async()=>{
  const original=globalThis.fetch;
  globalThis.fetch=async()=>Response.json({success:true,data:{email_search:{available:50},wallet:{balance:1}}});
  try{const env={...keyEnv,APP_TOKEN:'test'};const unauthorized=await worker.fetch(new Request('https://example.test/provider-check'),env);assert.equal(unauthorized.status,401);const r=await worker.fetch(new Request('https://example.test/provider-check',{headers:{Authorization:'Bearer test'}}),env);assert.equal(r.status,200);const text=await r.text();assert.ok(!text.includes('test-only'));const data=JSON.parse(text);assert.equal(data.getprospect.connected,true);assert.equal(data.getprospect.emailCredits,50)}finally{globalThis.fetch=original}
});
