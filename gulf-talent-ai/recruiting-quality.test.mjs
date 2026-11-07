import {test} from 'node:test';
import assert from 'node:assert/strict';
import {recruitingTitles,roleFit,mergePeople,searchBudget,companyAliases} from './recruiting-quality.js';

test('expanded recruiting title discovery includes sourcing and recruiter variants',()=>{
  const titles=recruitingTitles(['talent-acquisition','hr-recruiting'],true);
  assert.ok(titles.includes('Talent Sourcer'));assert.ok(titles.includes('Recruitment Manager'));
});
test('relevance keeps adjacent HR as potential and excludes engineers',()=>{
  assert.equal(roleFit('Talent Acquisition Partner'),'high');
  assert.equal(roleFit('People and Culture'),'potential');
  assert.equal(roleFit('Software Engineer'),'unrelated');
});
test('merge duplicates on canonical linkedin path but not distinct profiles',()=>{
  const create=(source,name)=>({source,name,recordCompany:'ADIA',personRole:'Recruiter',providers:['Tavily'],providerEvidence:[{provider:'Tavily',source}]});
  const rows=mergePeople([create('https://linkedin.com/in/alice','Alice Smith'),{...create('https://ae.linkedin.com/in/alice','Alice Smith'),providers:['Lusha']},create('https://linkedin.com/in/alice-2','Alice Smith')]);
  assert.equal(rows.length,2);assert.deepEqual(rows[0].providers,['Tavily','Lusha']);
});
test('conservative merge does not collapse two distinct people sharing name',()=>{
  const x={name:'Ali Mohammed Hassan',recordCompany:'ADIA',personRole:'Recruiter',source:'https://linkedin.com/in/ali1'};
  const y={...x,source:'https://linkedin.com/in/ali2'};
  assert.equal(mergePeople([x,y]).length,2);
});
test('search budget caps external requests and exposes consumption',()=>{
  const b=searchBudget({},10);assert.equal(b.limits['OpenAI Web'],3);
  for(let i=0;i<3;i++)assert.ok(b.reserve('OpenAI Web'));
  assert.equal(b.reserve('OpenAI Web'),false);
  assert.equal(b.snapshot().used['OpenAI Web'],3);
});
test('company alias retrieval is unique and bounded',()=>{
  assert.deepEqual(companyAliases({name:'ADIA',aliases:['ADIA','Abu Dhabi Investment Authority']}),['ADIA','Abu Dhabi Investment Authority']);
});

test('ambiguous shared name/company/role cannot attach unlinked evidence to either distinct profile',()=>{const base={name:'Ali Mohammed Hassan',recordCompany:'ADIA',personRole:'Recruiter'};const rows=mergePeople([{...base,source:'https://linkedin.com/in/a'},{...base,source:'https://linkedin.com/in/b'},{...base,source:'https://getprospect.com/',providers:['GetProspect']}]);assert.equal(rows.length,3);assert.ok(rows.slice(0,2).every(p=>!p.providers.includes('GetProspect')))});

test('hybrid discovery retains nontraditional recruiting titles and adjacent human-capital roles',()=>{assert.equal(roleFit('Executive Search Consultant'),'high');assert.equal(roleFit('Executive Talent Partner'),'high');assert.equal(roleFit('Human Capital Partner'),'potential');assert.equal(roleFit('HR Business Partner'),'potential');assert.equal(roleFit('Software Engineer'),'unrelated')});
