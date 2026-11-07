// Public-source recruiting relevance and conservative person identity.
const TITLE_TERMS = {
  'talent-acquisition': ['Talent Acquisition','Talent Sourcing','Talent Sourcer','Talent Partner','Talent Acquisition Partner','Talent Acquisition Specialist','Head of Talent Acquisition','استقطاب المواهب'],
  'hr-recruiting': ['Recruiter','Recruitment','Recruiting','Recruitment Specialist','Recruitment Officer','HR Recruiter','Recruitment Manager','Hiring Specialist','مسؤول توظيف','أخصائي توظيف'],
  'executive-search': ['Executive Search','Headhunter','Headhunting','Executive Recruiter','Search Consultant','Executive Talent']
};
const REGEX_RECRUITING = /talent acquisition|talent sourc(?:e|er|ing)|talent partner|recruit(?:er|ment|ing)|headhunt|executive search|staffing|hiring specialist|استقطاب|توظيف|باحث عن المواهب/i;
const REGEX_ADJACENT = /human resources|\bhr\b|people (?:and|&) culture|people partner|people operations|workforce|personnel|الموارد البشرية|شؤون الموظفين/i;
const REGEX_UNRELATED = /talent development|talent management|learning and development|hr operations|payroll|training coordinator|تطوير المواهب|إدارة المواهب|الرواتب/i;
const normalize = value => String(value || '').normalize('NFKC').toLowerCase().replace(/[\u064b-\u065f]/g,'').replace(/[^\p{L}\p{N}]+/gu,' ').trim().replace(/\s+/g,' ');
export function recruitingTitles(types, extended=false) {
  const terms=(types||[]).flatMap(type=>TITLE_TERMS[type]||[]);
  return [...new Set(extended?terms:terms.filter((term,i)=>i<18 && (/talent acquisition|recruit|headhunt|executive search|استقطاب|توظيف/i.test(term))))];
}
export function roleFit(text) {
  const t=String(text||'');
  if(REGEX_UNRELATED.test(t) && !REGEX_RECRUITING.test(t))return 'unrelated';
  if(REGEX_RECRUITING.test(t))return 'high';
  if(REGEX_ADJACENT.test(t))return 'potential';
  return 'unrelated';
}
export function companyAliases(company) {
  const aliases=[company?.searchName,company?.name,...(company?.aliases||[])];
  return [...new Set(aliases.filter(Boolean).map(s=>String(s).trim()).filter(Boolean))].slice(0,12);
}
function personProfile(row) {
  const value=String(row.profileUrl||row.source||'');
  try {
    const u=new URL(value);
    if (!/(^|\.)linkedin\.com$/i.test(u.hostname) || !/^\/in\/[^/]+\/?$/.test(u.pathname))return '';
    return 'https://www.linkedin.com'+u.pathname.replace(/\/$/,'').toLowerCase();
  }catch{return ''}
}
function personName(row) {return normalize(row.personName||row.name)}
function employer(row) {return normalize(row.recordCompany||row.organization)}
function role(row) {return normalize(row.personRole||row.title||row.role).replace(/\b(at|في)\b.*$/,'').trim()}
function nameKey(row) {
  const name=personName(row),company=employer(row),job=role(row);
  if(name.split(' ').length<3||!company||!job)return '';
  return name+'|'+company+'|'+job;
}
export function mergePeople(records) {
  const output=[],linked=new Map(),unnamed=new Map();
  for(const current of records) {
    if(!current)continue;
    const linkedin=personProfile(current),fallback=nameKey(current);
    let i=linkedin?linked.get(linkedin):undefined;
    if(i===undefined && fallback) {
      const match=unnamed.get(fallback);
      if(match!==undefined && (!linkedin || !personProfile(output[match])))i=match;
    }
    if(i===undefined) {i=output.length;output.push({...current,providers:[...new Set(current.providers||[current.provider].filter(Boolean))]});}
    else {
      const prior=output[i];
      prior.providers=[...new Set([...(prior.providers||[]),...(current.providers||[current.provider].filter(Boolean))])];
      prior.providerEvidence=[...new Map([...(prior.providerEvidence||[]),...(current.providerEvidence||[])].map(e=>[(e.provider||'')+'|'+(e.source||''),e])).values()];
      prior.emails=[...new Set([...(prior.emails||[]),...(current.emails||[])])];
      prior.score=Math.max(prior.score||0,current.score||0);
      prior.roleConfidence=prior.roleConfidence==='high'||current.roleConfidence==='high'?'high':prior.roleConfidence||current.roleConfidence;
      prior.confidence=prior.confidence==='source-backed'||current.confidence==='source-backed'?'source-backed':prior.confidence;
      prior.companyLabels=[...new Map([...(prior.companyLabels||[]),...(current.companyLabels||[])].map(x=>[x.id,x])).values()];
      prior.matchedCompanyIds=[...new Set([...(prior.matchedCompanyIds||[]),...(current.matchedCompanyIds||[])])];
      if((current.excerpt||'').length>(prior.excerpt||'').length)prior.excerpt=current.excerpt;
      if(!personProfile(prior)&&linkedin){prior.source=current.source;prior.profileUrl=current.profileUrl||current.source;prior.category='profile';}
    }
    if(linkedin)linked.set(linkedin,i);
    if(fallback && !unnamed.has(fallback))unnamed.set(fallback,i);
  }
  return output;
}
export function searchBudget(env={},companyCount=1){
  const cap=(key,def,max)=>Math.max(1,Math.min(max,Number.isFinite(Number(env[key]))&&String(env[key]).trim()!==''?Math.floor(Number(env[key])):def));
  const limits={
    Tavily:cap('SEARCH_MAX_TAVILY_CALLS',Math.min(12,Math.max(4,companyCount*2)),30),
    'OpenAI Web':cap('SEARCH_MAX_OPENAI_CALLS',Math.min(3,companyCount),5),
    GetProspect:cap('SEARCH_MAX_GETPROSPECT_CALLS',4,12),
    Lusha:cap('SEARCH_MAX_LUSHA_CALLS',2,8),
    FullEnrich:cap('SEARCH_MAX_FULLENRICH_CALLS',2,8),
    Hunter:cap('SEARCH_MAX_HUNTER_CALLS',Math.min(10,companyCount),20)
  };
  const used=Object.fromEntries(Object.keys(limits).map(k=>[k,0]));
  return {limits,used, reserve(provider) {if(!(provider in limits)||used[provider]>=limits[provider])return false;used[provider]++;return true}, snapshot(){return {limits:{...limits},used:{...used}}}};
}
