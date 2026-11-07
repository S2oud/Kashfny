import {test} from 'node:test';
import assert from 'node:assert/strict';
import worker from './worker.js';
import {lushaSearch} from './provider-search.js';
import {getProspectSearch} from './getprospect.js';
import {searchBudget} from './recruiting-quality.js';

const quota={idFromName:x=>x,get:()=>({fetch:async()=>Response.json({allowed:true,used:1,remaining:9,limit:10})})};
const search=async(body,env)=>worker.fetch(new Request('https://example.test/search',{method:'POST',headers:{Authorization:'Bearer test','CF-Connecting-IP':'192.0.2.12'},body:JSON.stringify(body)}),{APP_TOKEN:'test',DAILY_QUOTA:quota,...env});
test('potential HR professional remains visible while unrelated engineer is excluded',async()=>{
 const original=globalThis.fetch;
 globalThis.fetch=async()=>Response.json({results:[
  {title:'Maha - People and Culture at ADIA',url:'https://linkedin.com/in/maha',content:'People and Culture at Abu Dhabi Investment Authority'},
  {title:'Khalid - Software Engineer at ADIA',url:'https://linkedin.com/in/khalid',content:'Software engineer at ADIA'}
 ]});
 try{
  const r=await search({company:'ADIA',country:'UAE',types:['hr-recruiting']},{TAVILY_API_KEY:'test',SEARCH_MAX_TAVILY_CALLS:'2'});
  const data=await r.json();
  assert.equal(r.status,200);
  assert.equal(data.results.length,1);
  assert.equal(data.results[0].roleConfidence,'potential');
  assert.match(data.results[0].title,/Maha/);
 }finally{globalThis.fetch=original}
});
test('ten-company batch respects a shared Tavily search cap',async()=>{
 const original=globalThis.fetch;let calls=0;
 globalThis.fetch=async()=>{calls++;return Response.json({results:[]})};
 try{
  const companies=Array.from({length:10},(_,i)=>({name:'Test Recruiting Company '+(i+1)}));
  const r=await search({companies,country:'UAE',types:['talent-acquisition']},{TAVILY_API_KEY:'test'});
  const data=await r.json();
  assert.equal(r.status,200);
  assert.ok(calls<=12,'Tavily calls exceeded shared budget');
  assert.equal(data.searchBudget.used.Tavily,calls);
  assert.ok(data.searchBudget.used.Tavily<=data.searchBudget.limits.Tavily);
 }finally{globalThis.fetch=original}
});
test('Lusha keeps the first page when the next page is rate-limited',async()=>{
 const original=globalThis.fetch;let calls=0;
 globalThis.fetch=async()=>{
  calls++;
  if(calls>1)return Response.json({error:'rate limit'},{status:429});
  return Response.json({results:Array.from({length:100},(_,i)=>({id:'id'+i,firstName:'Maha',lastName:'Example'+i,jobTitle:{title:'Recruiter'},company:{name:'ADIA'}}))});
 };
 try{
  const rows=await lushaSearch({LUSHA_API_KEY:'dummy'},[{name:'ADIA'}],'UAE',['hr-recruiting']);
  assert.equal(calls,2);assert.equal(rows.length,100);assert.match(rows.partialError,/429/);
 }finally{globalThis.fetch=original}
});
test('GetProspect preserves sourced professional records without LinkedIn profile URLs',async()=>{
 const original=globalThis.fetch;
 globalThis.fetch=async()=>Response.json({success:true,data:[{id:'lead-1',full_name:'Maha Example',primary_position:{job_title:'Talent Acquisition Partner',company:{name:'ADIA'}}}]});
 try{
  const rows=await getProspectSearch({GETPROSPECT_API_KEY:'dummy'},[{name:'ADIA'}],'UAE',['talent-acquisition']);
  assert.equal(rows.length,1);assert.equal(rows[0].providerRecord,true);assert.equal(rows[0].profileUrl,'');
  assert.equal(rows[0].personRole,'Talent Acquisition Partner');
 }finally{globalThis.fetch=original}
});
test('zero budget disables a provider without calling it',()=>{
 const budget=searchBudget({SEARCH_MAX_LUSHA_CALLS:'0'},1);
 assert.equal(budget.reserve('Lusha'),false);
 assert.equal(budget.limits.Lusha,0);
});
