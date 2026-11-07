import {profileURL,getProspectSearch} from './getprospect.js';
import {recruitingTitles as titles,companyAliases} from './recruiting-quality.js';
export const recruitingTitles=titles;
const pageLimit=(value,defaultValue,max)=>Math.max(1,Math.min(max,Number(value)||defaultValue));
const cut=(s,n=180)=>String(s||'').trim().slice(0,n);
const countries={UAE:'AE','Saudi Arabia':'SA',Qatar:'QA',Kuwait:'KW',Bahrain:'BH',Oman:'OM'};

const names=companies=>[...new Set(companies.flatMap(c=>companyAliases(c)).filter(Boolean))];
async function call(env,provider,path,body){const cfg={Lusha:['LUSHA_API_KEY','https://api.lusha.com','api_key'],FullEnrich:['FULLENRICH_API_KEY','https://app.fullenrich.com/api/v2','Authorization'],Hunter:['HUNTER_API_KEY','https://api.hunter.io','X-API-KEY']}[provider];const r=await fetch(cfg[1]+path,{method:body?'POST':'GET',headers:{[cfg[2]]:provider==='FullEnrich'?'Bearer '+env[cfg[0]]:env[cfg[0]],'Content-Type':'application/json'},...(body?{body:JSON.stringify(body)}:{}),signal:AbortSignal.timeout(18000)});if(!r.ok)throw Error(provider+' search HTTP '+r.status);return r.json()}
function record(provider,person){const name=cut(person.name,90),role=cut(person.role),company=cut(person.company);if(!name||!role||!company)return null;const profile=profileURL(person.url),masked=/[*…]/.test(name);if(masked)return null;const homes={Hunter:'https://hunter.io/',Lusha:'https://dashboard.lusha.com/prospecting',FullEnrich:'https://app.fullenrich.com/app/search'};return {url:profile||homes[provider],title:`${name} - ${role} at ${company}`,text:`${name}. ${role} at ${company}. ${cut(person.location)}. Employment reported by ${provider}, not independently verified.`,providerRecord:true,personName:name,personRole:role,recordId:cut(person.id)||name+'|'+company,recordCompany:company,profileUrl:profile,workEmails:person.emails||[]}}
export async function lushaSearch(env,companies,country,types,budget){
 const rows=[],maxPages=pageLimit(env.SEARCH_LUSHA_PAGES,3,8),size=100;
 for(let page=0;page<maxPages;page++){
  if(budget&&!budget.reserve('Lusha'))break;
  const j=await call(env,'Lusha','/v3/contacts/prospecting',{pagination:{page,size},filters:{contacts:{include:{jobTitles:recruitingTitles(types,true),countries:country==='All GCC'?Object.values(countries):[countries[country]]}},companies:{include:{names:names(companies)}}},options:{includePartialProfiles:false}});
  const results=j.results||[];
  rows.push(...results.map(p=>record('Lusha',{id:p.id,name:[p.firstName,p.lastName].filter(Boolean).join(' '),role:p.jobTitle?.title,company:p.company?.name,url:p.socialLinks?.linkedin,location:p.location?.country})).filter(Boolean));
  if(results.length<size||j.pagination?.hasNext===false)break;
 }
 return rows;
}
export async function fullEnrichSearch(env,companies,country,types,budget){
 const rows=[],maxPages=pageLimit(env.SEARCH_FULLENRICH_PAGES,3,8),size=100,values=x=>x.map(value=>({value,exact_match:false}));
 for(let page=0;page<maxPages;page++){
  if(budget&&!budget.reserve('FullEnrich'))break;
  const offset=page*size;
  const j=await call(env,'FullEnrich','/people/search',{offset,limit:size,current_company_names:values(names(companies)),current_position_titles:values(recruitingTitles(types,true)),person_locations:values(country==='All GCC'?Object.keys(countries).map(x=>x==='UAE'?'United Arab Emirates':x):[country==='UAE'?'United Arab Emirates':country])});
  const results=j.people||[];
  rows.push(...results.map(p=>record('FullEnrich',{id:p.id,name:p.full_name,role:p.employment?.current?.title,company:p.employment?.current?.company?.name,url:p.social_profiles?.professional_network?.url,location:p.location?.country})).filter(Boolean));
  if(results.length<size||Number(j.metadata?.total)>0&&j.metadata.total<=offset+results.length)break;
 }
 return rows;
}
const validWorkEmail=value=>typeof value==='string'&&/^[^\s@*…]+@[^\s@*…]+\.[^\s@*…]+$/.test(value)&&!/@(gmail|outlook|hotmail|yahoo|icloud|protonmail)\./i.test(value);
export async function hunterSearch(env,company,country,types,budget){if(budget&&!budget.reserve('Hunter'))return [];let domain='';try{domain=new URL(company.website).hostname.replace(/^www\./,'')}catch{}const query=new URLSearchParams({...(domain?{domain}:{company:company.searchName||company.name}),limit:'10',type:'personal',provenance:'found',department:'hr',job_titles:recruitingTitles(types,true).slice(0,12).join(','),required_field:'full_name,position'});const j=await call(env,'Hunter','/v2/domain-search?'+query);if(domain&&j.data?.domain?.replace(/^www\./,'').toLowerCase()!==domain.toLowerCase())return [];return (j.data?.emails||[]).map(p=>record('Hunter',{id:p.value,name:[p.first_name,p.last_name].filter(Boolean).join(' '),role:p.position_raw||p.position,company:j.data?.organization||company.name,url:p.linkedin||p.linkedin_url,emails:p.verification?.status==='valid'&&p.provenance==='found'&&validWorkEmail(p.value)?[p.value]:[]})).filter(Boolean)}
export function directoryTasks(env,companies,country,types,budget){
 const tasks=[];
 if(env.GETPROSPECT_API_KEY)tasks.push({provider:'GetProspect',run:()=>getProspectSearch(env,companies,country,types,budget)});
 if(env.LUSHA_API_KEY)tasks.push({provider:'Lusha',run:()=>lushaSearch(env,companies,country,types,budget)});
 if(env.FULLENRICH_API_KEY)tasks.push({provider:'FullEnrich',run:()=>fullEnrichSearch(env,companies,country,types,budget)});
 if(env.HUNTER_API_KEY)for(const company of companies)tasks.push({provider:'Hunter',run:()=>hunterSearch(env,company,country,types,budget)});
 return tasks;
}
