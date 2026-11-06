import {test} from 'node:test';
import assert from 'node:assert/strict';
import worker,{canonicalSource} from './worker.js';
const env={APP_TOKEN:'test',EXA_API_KEY:'test',TAVILY_API_KEY:'test',OPENAI_API_KEY:'test',DAILY_QUOTA:{idFromName:x=>x,get:()=>({fetch:async()=>Response.json({allowed:true,used:1,remaining:9,limit:10})})}};
const request=body=>worker.fetch(new Request('https://example.test/search',{method:'POST',headers:{Authorization:'Bearer test','CF-Connecting-IP':'192.0.2.1'},body:JSON.stringify(body)}),env);
test('recruiting search combines sources, deduplicates profiles and rejects unrelated or invented leads',async()=>{
  const original=globalThis.fetch;let calls=0;
  globalThis.fetch=async(url,init)=>{calls++;const body=JSON.parse(init.body);
    if(String(url).includes('exa.ai'))return Response.json({results:[{title:'Ali — Talent Acquisition at ADIA',url:'https://ae.linkedin.com/in/ali/?trk=abc',text:'ADIA Talent Acquisition team'}]});
    if(String(url).includes('tavily.com'))return Response.json({results:[{title:'Ali — Talent Acquisition ADIA',url:'https://www.linkedin.com/in/ali',content:'ADIA Talent Acquisition'}, {title:'Sara — HR Recruiting ADIA',url:'https://linkedin.com/in/sara',content:'ADIA HR recruiter. unrelated@example.com'}, {title:'ADIA Talent Development',url:'https://linkedin.com/in/development',content:'Previously worked in HR Recruiting at ADIA'}, {title:'People - ADIA',url:'https://www.adia.ae/en/people',content:'ADIA recruitment careers information'}, {title:'ADIA Software Engineer',url:'https://linkedin.com/in/engineer',content:'Software developer at ADIA'}, {title:'How to get a job at ADIA',url:'https://example.com/jobs',content:'ADIA recruiting career guide'}]});
    assert.equal(body.tools[0].type,'web_search');assert.equal(body.max_tool_calls,2);
    return Response.json({output:[{type:'web_search_call',action:{sources:[{url:'https://linkedin.com/in/nora'}]}},{type:'message',content:[{type:'output_text',text:JSON.stringify({results:[{title:'Nora — Recruiter at ADIA',url:'https://linkedin.com/in/nora',text:'ADIA HR recruiting team'}, {title:'Invented — Recruiter at ADIA',url:'https://linkedin.com/in/invented',text:'ADIA recruiter'}]})}]}]});
  };
  try{const response=await request({company:'ADIA',country:'UAE',types:['talent-acquisition','hr-recruiting']});const data=await response.json();assert.equal(response.status,200);assert.equal(calls,4);assert.equal(data.results.length,3);assert.equal(data.results[0].providers.length,2);assert.ok(data.results.every(x=>x.emails.length===0));assert.ok(data.results.some(x=>x.provider==='OpenAI Web'));assert.equal(data.usage.remaining,9);}finally{globalThis.fetch=original}
});
test('search survives exhausted OpenAI credits and returns explicit partial-provider warning',async()=>{
  const original=globalThis.fetch;
  globalThis.fetch=async url=>String(url).includes('openai.com')?Response.json({error:{code:'insufficient_quota'}},{status:429}):Response.json({results:[{title:'Ali — ADIA Recruiter',url:'https://linkedin.com/in/ali',text:'Talent Acquisition at ADIA'}]});
  try{const data=await(await request({company:'ADIA',country:'UAE',types:['talent-acquisition']})).json();assert.equal(data.results.length,1);assert.match(data.errors.join(' '),/credit exhausted/)}finally{globalThis.fetch=original}
});
test('arbitrary roles, company searches and missing company cannot trigger provider calls',async()=>{
  const original=globalThis.fetch;globalThis.fetch=()=>{throw Error('Provider must not be called')};
  try{for(const body of [{company:'ADIA',role:'Software Engineer',category:'companies'},{company:'ADIA',types:['software-engineering']},{company:'',types:['hr-recruiting']}])assert.equal((await request(body)).status,400)}finally{globalThis.fetch=original}
});
test('canonical profile source strips tracking and country-specific duplicates',()=>assert.equal(canonicalSource('https://ae.linkedin.com/in/test/?trk=foo#x'),'https://www.linkedin.com/in/test'));

test('backend canonicalizes lowercase ADIA and Arabic ministry aliases before searching',async()=>{
  const original=globalThis.fetch,queries=[];
  globalThis.fetch=async(url,init)=>{
    const body=JSON.parse(init.body);if(body.query)queries.push(body.query);
    return String(url).includes('openai.com')?Response.json({output:[{content:[{type:'output_text',text:'{"results":[]}'}]}]}):Response.json({results:[]});
  };
  try {
    const filters={country:'UAE',types:['talent-acquisition']};
    const lower=await(await request({...filters,company:'adia'})).json();
    const upper=await(await request({...filters,company:'ADIA'})).json();
    const ministry=await(await request({...filters,company:'وزارة الداخلية'})).json();
    assert.equal(lower.organization.id,upper.organization.id);assert.equal(lower.query,upper.query);
    assert.match(lower.query,/Abu Dhabi Investment Authority/);
    assert.equal(ministry.organization.name,'Ministry of Interior UAE');assert.match(ministry.query,/Ministry of Interior UAE/);
    assert.ok(queries.every(query=>!query.includes('undefined')));
  } fi