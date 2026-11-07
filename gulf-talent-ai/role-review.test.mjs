import {test} from 'node:test';
import assert from 'node:assert/strict';
import {reviewPotentialLeads} from './role-review.js';
import {searchBudget} from './recruiting-quality.js';

test('AI upgrades sourced recruiting roles and never removes possible matches',async()=>{
 const fetchBefore=globalThis.fetch;
 const rows=[{id:'p1',title:'Talent Operations Coordinator',roleConfidence:'potential',score:3},{id:'p2',title:'HR Generalist',roleConfidence:'potential',score:2}];
 let calls=0;
 globalThis.fetch=async(url,options)=>{
  calls++;assert.match(url,/api.openai.com/);
  const body=JSON.parse(options.body);
  assert.equal(body.text.format.name,'role_review');
  return Response.json({output:[{content:[{type:'output_text',text:JSON.stringify({assessments:[{id:'p1',classification:'recruiting'},{id:'p2',classification:'unrelated'}]})}]}]});
 };
 try{
  const budget=searchBudget({},1);
  const output=await reviewPotentialLeads(rows,{OPENAI_API_KEY:'dummy'},budget);
  assert.equal(calls,1);assert.equal(output.length,2);
  assert.equal(output[0].id,'p1');assert.equal(output[0].roleConfidence,'high');
  assert.equal(output[1].roleConfidence,'potential');
  assert.equal(budget.snapshot().used['OpenAI Role'],1);
 }finally{globalThis.fetch=fetchBefore}
});
test('role reviewer does not send a request when no ambiguous roles are present',async()=>{
 const before=globalThis.fetch;
 globalThis.fetch=()=>{throw Error('No request expected')};
 try{
  const rows=[{id:'p1',roleConfidence:'high'}];
  assert.equal((await reviewPotentialLeads(rows,{OPENAI_API_KEY:'dummy'},searchBudget({},1))).length,1);
 }finally{globalThis.fetch=before}
});
