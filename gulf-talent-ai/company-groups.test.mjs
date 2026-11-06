import {test} from 'node:test';
import assert from 'node:assert/strict';
import worker from './worker.js';
import {resolveCompany,COMPANIES} from './company-directory.js';
import {COMPANY_GROUPS,groupCompanies,groupedSuggestions,affiliation,selectedCompanies} from './company-groups.js';
import {recordSearch,storedResults} from './history.js';

test('families use real directory members and case-insensitive grouped suggestions',()=>{
  for(const g of COMPANY_GROUPS)assert.equal(groupCompanies(g).length,g.members.length+1);
  assert.equal(groupedSuggestions('aDnOc').groups[0].companies.length,8);
  assert.equal(groupedSuggestions('أدنوك').groups[0].id,'adnoc');
  assert.deepEqual(groupedSuggestions('adnoc','Qatar'),{groups:[],singles:[]});
  assert.equal(selectedCompanies({companies:[{name:'adia'},{name:'ADIA'}]}).length,1);
});
test('source evidence distinguishes parent-only, actual branch, siblings and unrelated names',()=>{
  const gas=resolveCompany('ADNOC Gas'),parent=resolveCompany('ADNOC');
  const exact=affiliation('Recruiter at ADNOC Gas',gas);
  assert.deepEqual(exact.labels.map(x=>x.name),['ADNOC','ADNOC Gas']);assert.equal(exact.branchUnspecified,false);
  assert.equal(affiliation('Recruiter at ADNOC',gas).branchUnspecified,true);
  assert.equal(affiliation('Recruiter at ADNOC Drilling',gas),null);
  assert.equal(affiliation('Recruiter at unrelated company',gas),null);
  assert.equal(affiliation('Recruiter at ADCO',parent).labels[1].name,'ADNOC Onshore');
  assert.equal(affiliation('Recruiter at Emirates Group',resolveCompany('Emirates Group')).branchUnspecified,true);
});
test('batch search spends one attempt, merges profiles, keeps company filters and partial failures',async()=>{
  const original=globalThis.fetch;let quotaCalls=0,providerCalls=0;
  const env={APP_TOKEN:'test',TAVILY_API_KEY:'test',DAILY_QUOTA:{idFromName:x=>x,get:()=>({fetch:async()=>{quotaCalls++;return Response.json({allowed:true,used:1,remaining:9,limit:10})}})}};
  globalThis.fetch=async(url,init)=>{providerCalls++;const query=JSON.parse(init.body).query;if(query.includes('ADIA'))throw Error('test provider unavailable');return Response.json({results:[{title:'Person A — ADNOC Gas Talent Acquisition',url:'https://ae.linkedin.com/in/a/?trk=test',content:'Recruiter at ADNOC Gas'},{title:'Person B — ADNOC Recruiter',url:'https://linkedin.com/in/b',content:'Talent Acquisition at ADNOC'},{title:'Person C — ADNOC Drilling Recruiter',url:'https://linkedin.com/in/c',content:'Recruitment at ADNOC Drilling'},{title:'Senior Officer, Talent Acquisition at ADNOC',url:'https://linkedin.com/jobs/view/123',content:'ADNOC is hiring a recruiter'},{title:'Recruitment Criteria ADNOC',url:'https://jobs.adnoc.ae/experienced-professionals',content:'ADNOC recruitment'},{title:'Oil and Gas Recruitment UAE ADNOC',url:'https://example.com/articles/oil',content:'ADNOC recruitment guide'}]})};
  const request=companies=>worker.fetch(new Request('https://example.test/search',{method:'POST',headers:{Authorization:'Bearer test','CF-Connecting-IP':'192.0.2.1'},body:JSON.stringify({companies,country:'UAE',types:['talent-acquisition']})}),env);
  try{
    const gas=resolveCompany('ADNOC Gas'),drilling=resolveCompany('ADNOC Drilling'),adia=resolveCompany('ADIA');
    const data=await(await request([gas,drilling,adia])).json();assert.equal(quotaCalls,1);assert.equal(data.results.length,3);assert.equal(data.companySummaries.length,3);assert.equal(data.usageCost,1);
    const generic=data.results.find(x=>x.name==='Person B');assert.equal(generic.matchedCompanyIds.length,2);assert.equal(generic.branchUnspecified,true);
    const specific=data.results.find(x=>x.name==='Person A');assert.deepEqual(specific.companyLabels.map(x=>x.name),['ADNOC','ADNOC Gas']);assert.deepEqual(specific.matchedCompanyIds,[gas.id]);
    assert.ok(data.errors.some(x=>x.includes('ADIA')));assert.equal(data.companySummaries[2].count,0);
    const before=providerCalls;assert.equal((await request(COMPANIES.slice(0,11))).status,400);assert.equal(quotaCalls,1);assert.equal(providerCalls,before);
    assert.equal((await request([])).status,400);assert.equal(quotaCalls,1);
    const history=recordSearch([],{companies:[gas,drilling]},Array.from({length:100},(_,i)=>({...specific,id:String(i)})));
    assert.equal(storedResults(history[0]).length,100);assert.equal(history[0].companies.length,2);
  }finally{globalThis.fetch=original}
});
