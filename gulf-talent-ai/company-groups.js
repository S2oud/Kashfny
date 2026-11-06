import {COMPANIES,resolveCompany,matchesOrganization,suggestCompanies,normalizeCompanyTerm} from './company-directory.js';

export const MAX_COMPANIES=10;
// Search families, not assertions that every member is wholly owned.
export const COMPANY_GROUPS=[
  {id:'adnoc',name:'ADNOC',parent:'abu-dhabi-national-oil-company-adnoc',members:['adnoc-gas','adnoc-drilling','adnoc-distribution','adnoc-logistics-and-services','adnoc-offshore','adnoc-onshore','adnoc-refining'],source:'https://www.adnoc.ae/what-we-do/our-businesses'},
  {id:'mubadala',name:'Mubadala',parent:'mubadala-investment-company',members:['mubadala-energy'],source:'https://mubadalaenergy.com/who-we-are/'},
  {id:'taqa',name:'TAQA',parent:'abu-dhabi-national-energy-company',members:['taqa-distribution','taqa-water-solutions'],source:'https://www.taqa-ws.com/news/announcements/taqa-announces-new-unified-customer-facing-distribution-company-and-launches-new-brands-for-its-group-companies/'},
  {id:'emirates',name:'Emirates Group',parent:'emirates-group',members:['emirates-airline','dnata'],source:'https://www.emirates.com/ae/english/help/faq-topics/about-emirates/faq/what-is-the-emirates-group/'},
  {id:'dubai-holding',name:'Dubai Holding',parent:'dubai-holding',members:['dubai-holding-asset-management','dubai-properties','nakheel','tecom-group'],source:'https://www.dubaiholding.com/en/our-business/our-companies/dubai-holding-real-estate'}
];
const byId=new Map(COMPANIES.map(x=>[x.id,x]));
export const groupFor=id=>COMPANY_GROUPS.find(g=>g.parent===id||g.members.includes(id));
export const groupCompanies=g=>[g.parent,...g.members].map(id=>byId.get(id)).filter(Boolean);
export function groupedSuggestions(query,country='UAE'){
  const hits=suggestCompanies(query,country,30),groups=[],seen=new Set(),singles=[];
  for(const company of hits){const group=groupFor(company.id);if(group){if(!seen.has(group.id)){seen.add(group.id);groups.push({...group,companies:groupCompanies(group)})}}else singles.push(company)}
  return {groups,singles};
}
export function selectedCompanies(input){
  const country=input.country||'UAE';
  const values=Array.isArray(input.companies)?input.companies:[{name:input.company,id:input.companyId}];
  if(!values.length||values.length>MAX_COMPANIES)throw Error('Choose between 1 and 10 companies');
  const unique=new Map();
  for(const value of values){const name=String(typeof value==='string'?value:value?.name||'').trim().slice(0,200);if(!name)throw Error('Enter a company name');const company=resolveCompany(name,country,value?.id||'')||{id:'custom:'+normalizeCompanyTerm(name),name,country,aliases:[]};unique.set(company.id,company)}
  return [...unique.values()];
}
export function affiliation(text,company){
  const group=groupFor(company?.id);
  if(!group)return matchesOrganization(text,company,company?.name)?{labels:[{id:company.id,name:company.name,kind:'company'}],branchUnspecified:false}:null;
  const parent=byId.get(group.parent),parentHit=matchesOrganization(text,parent);
  const parentTerms=[parent.name,...parent.aliases].map(normalizeCompanyTerm);
  const branches=group.members.map(id=>byId.get(id)).filter(c=>c&&matchesOrganization(text,{...c,aliases:c.aliases.filter(alias=>normalizeCompanyTerm(alias).length>2&&!parentTerms.some(p=>p.includes(normalizeCompanyTerm(alias))))}));
  const selectedIsParent=company.id===group.parent;
  // A sibling explicitly named in the source must never be relabelled as the selected branch.
  if(!selectedIsParent&&branches.length&&!branches.some(c=>c.id===company.id))return null;
  if(!parentHit&&!branches.length)return null;
  return {labels:[{id:group.parent,name:group.name,kind:'group'},...branches.map(c=>({id:c.id,name:c.name,kind:'branch'}))],branchUnspecified:!branches.length};
}
export function mergeCompanyResults(batches){
  const map=new Map();
  for(const batch of batches)for(const result of batch.results||[]){const key=result.source.toLowerCase(),previous=map.get(key);if(!previous){map.set(key,{...result,companyLabels:[...(result.companyLabels||[])],matchedCompanyIds:[...(result.matchedCompanyIds||[])]});continue}
    previous.providers=[...new Set([...(previous.providers||[]),...(result.providers||[])])];
    previous.matchedCompanyIds=[...new Set([...previous.matchedCompanyIds,...(result.matchedCompanyIds||[])])];
    previous.companyLabels=[...new Map([...previous.companyLabels,...(result.companyLabels||[])].map(x=>[x.id,x])).values()];
    previous.branchUnspecified=previous.branchUnspecified&&result.branchUnspecified;
    previous.score=Math.max(previous.score||0,result.score||0);
    if((result.excerpt||'').length>(previous.excerpt||'').length)previous.excerpt=result.excerpt;
  }
  // Round-robin prevents one large company from crowding the other selections out.
  const ordered=[],seen=new Set();const rows=batches.map(b=>(b.results||[]).map(r=>r.source.toLowerCase()));
  for(let i=0;i<40;i++)for(const row of rows){const key=row[i];if(key&&!seen.has(key)){seen.add(key);ordered.push(map.get(key))}}
  return ordered.slice(0,100);
}
