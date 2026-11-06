import {COMPANIES} from './company-data.js';
export {COMPANIES} from './company-data.js';

export function normalizeCompanyTerm(value) {
  return String(value || '').normalize('NFKD').replace(/[\u0300-\u036f\u064b-\u065f\u0670\u0640]/g,'')
    .replace(/[أإآٱ]/g,'ا').replace(/ى/g,'ي').replace(/ة/g,'ه').toLowerCase()
    .replace(/&/g,' and ').replace(/[^a-z0-9\u0600-\u06ff]+/g,' ').trim().replace(/\s+/g,' ');
}
const index = COMPANIES.map(company => ({company, terms:[company.name,...company.aliases].map(normalizeCompanyTerm)}));

export function suggestCompanies(query, country='UAE', limit=12) {
  if (country !== 'UAE') return [];
  const term=normalizeCompanyTerm(query),tokens=term.split(' ').filter(Boolean);
  return index.map(row=>{
    const exact=term&&row.terms.includes(term),prefix=term&&row.terms.some(x=>x.startsWith(term));
    const contains=term&&row.terms.some(x=>x.includes(term)||tokens.every(t=>x.includes(t)));
    const score=exact?1000:prefix?600:contains?300:term?0:100;
    return {...row,score:score?score+(row.company.kind==='ministry'?20:row.company.kind==='federal'?10:0):0};
  }).filter(row=>row.score>0).sort((a,b)=>b.score-a.score||a.company.name.localeCompare(b.company.name,'en'))
    .slice(0,Math.max(1,Math.min(limit,30))).map(row=>row.company);
}

export function resolveCompany(name, country='UAE', id='') {
  if (country !== 'UAE') return null;
  const term=normalizeCompanyTerm(name);
  // A selected ID must still match the field, so stale selection metadata cannot
  // silently search for a different company after the user edits the text.
  const selected=id&&index.find(row=>row.company.id===id&&row.terms.includes(term));
  if(selected)return selected.company;
  const exact=index.filter(row=>row.terms.includes(term));
  return exact.length===1?exact[0].company:null;
}

export function organizationQuery(company, fallback) {
  if(!company)return String(fallback||'').trim();
  const primary=company.searchName||company.name;
  const acronym=company.aliases.find(x=>/^[A-Z][A-Z0-9&]{1,9}$/.test(x));
  return acronym?`"${primary.replaceAll('"','')}" (${acronym})`: `"${primary.replaceAll('"','')}"`;
}

export function matchesOrganization(text, company, fallback='') {
  const normalized=normalizeCompanyTerm(text);
  const terms=company?[company.name,company.searchName,...company.aliases]:[fallback];
  return terms.filter(Boolean).some(value=>{
    const term=normalizeCompanyTerm(value);
    return term.length<=4?(` ${normalized} `).includes(` ${term} `):normalized.includes(term);
  });
}
