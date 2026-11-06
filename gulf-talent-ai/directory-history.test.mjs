import {test} from 'node:test';
import assert from 'node:assert/strict';
import {COMPANIES,suggestCompanies,resolveCompany,organizationQuery,matchesOrganization} from './company-directory.js';
import {recordSearch,storedResults} from './history.js';

test('UAE catalog has distinct English choices and case-insensitive ADIA identity',()=>{
  assert.ok(COMPANIES.length>=300);
  assert.equal(new Set(COMPANIES.map(x=>x.id)).size,COMPANIES.length);
  assert.ok(COMPANIES.every(x=>x.sources.length&&!/[\u0600-\u06ff]/.test(x.name)));
  assert.equal(resolveCompany('adia').id,resolveCompany('ADIA').id);
  assert.equal(suggestCompanies('aDiA')[0].id,resolveCompany('ADIA').id);
  assert.equal(suggestCompanies('aDiA').length,1);
  assert.deepEqual(suggestCompanies('zzzz-not-a-real-organization'),[]);
  assert.match(organizationQuery(resolveCompany('adia')),/Abu Dhabi Investment Authority/);
  assert.equal(matchesOrganization('An ADIA recruiter',resolveCompany('adia')),true);
  assert.equal(matchesOrganization('A Canadian recruiter',resolveCompany('adia')),false);
});
test('Arabic aliases and MOI find UAE ministry, with country isolation and no stale ID hijack',()=>{
  const ministry=resolveCompany('وزارة الداخلية');
  assert.equal(ministry.name,'Ministry of Interior UAE');
  assert.equal(resolveCompany('moi').id,ministry.id);
  assert.equal(suggestCompanies('الداخلية')[0].id,ministry.id);
  assert.deepEqual(suggestCompanies('moi','Saudi Arabia'),[]);
  assert.equal(resolveCompany('MOI','Saudi Arabia'),null);
  assert.equal(resolveCompany('unrelated custom company','UAE',ministry.id),null);
});
test('history keeps newest ten snapshots and returns independent saved results',()=>{
  let history=[];const contacts=[{id:'test-source',name:'Test contact',source:'https://example.com/test'}];
  for(let i=0;i<13;i++)history=recordSearch(history,{company:'Test Company '+i,country:'UAE',types:['talent-acquisition']},contacts,new Date(2026,0,i+1));
  assert.equal(history.length,10);assert.equal(history[0].company,'Test Company 12');assert.equal(history[9].company,'Test Company 3');
  contacts[0].name='Changed';assert.equal(history[0].contacts[0].name,'Test contact');
  const restored=storedResults(history[0]);restored[0].name='Edited';assert.equal(history[0].contacts[0].name,'Test contact');
  assert.equal(storedResults({company:'legacy search without contacts'}),null);
  assert.deepEqual(storedResults(recordSearch([],{company:'No matches'},[])[0]),[]);
});
