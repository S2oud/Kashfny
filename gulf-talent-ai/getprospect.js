// Official API v2: https://getprospect.com/api-docs
// Search never reveals contact data. Reveals are separate, explicit requests.
import {recruitingTitles,companyAliases} from './recruiting-quality.js';
const BASE='https://api.getprospect.com';
const clean=(value,n=200)=>String(value||'').trim().slice(0,n);
export function profileURL(value){
  try{const u=new URL(value);if(u.protocol!=='https:'||!/(^|\.)linkedin\.com$/i.test(u.hostname)||!/^\/in\/[^/]+\/?$/.test(u.pathname))return '';return 'https://www.linkedin.com'+u.pathname.replace(/\/$/,'')}catch{return ''}
}
async function request(env,path,body,timeout=18000){
  if(!env.GETPROSPECT_API_KEY)throw Error('GetProspect is not configured');
  const response=await fetch(BASE+path,{method:body?'POST':'GET',headers:{'x-api-key':env.GETPROSPECT_API_KEY,'Content-Type':'application/json'},...(body?{body:JSON.stringify(body)}:{}),signal:AbortSignal.timeout(timeout)});
  const json=await response.json().catch(()=>({}));
  if(!response.ok){const error=new Error(response.status===402?'GetProspect credits exhausted':response.status===429?'GetProspect rate limit':response.status===408?'GetProspect lookup pending; retry later':'GetProspect HTTP '+response.status);error.status=response.status;throw error}
  if(json.success===false&&!json.errors?.some(e=>e.name==='NOT_FOUND'))throw Error('GetProspect request failed');
  return json;
}
export async function getProspectBalance(env){
  const j=await request(env,'/v2/credits',null,8000),data=j.data||{};
  return {configured:true,connected:true,emailCredits:Number(data.email_search?.available)||0,phoneCredits:Number(data.phone_search?.available)||0,walletUSD:Number(data.wallet?.balance)||0,resetAt:data.reset_at||null};
}
export function searchFilters(company,country,types){
  const names=(Array.isArray(company)?company:[company]).flatMap(c=>companyAliases(c));
  const titles=recruitingTitles(types,true);
  return {filters:{company:{name:{include:[...new Set(names)],match_mode:'CONTAINS'}},person_job_title:{include:titles,match_mode:'CONTAINS'},person_location:{include:country==='All GCC'?['United Arab Emirates','Saudi Arabia','Qatar','Kuwait','Bahrain','Oman']:[country==='UAE'?'United Arab Emirates':country]}},per_page:25,page:1,enrich_email:false,enrich_phone:false};
}
export async function getProspectSearch(env,company,country,types,budget){
  if(!env.GETPROSPECT_API_KEY)return [];
  const people=[],limit=Math.max(1,Math.min(10,Math.floor(Number(env.SEARCH_GETPROSPECT_PAGES))||5));for(let page=1;page<=limit;page++){if(budget&&!budget.reserve('GetProspect'))break;let j;try{j=await request(env,'/v2/people/search',{...searchFilters(company,country,types),page})}catch(e){if(people.length){people.partialError=e.message;break}throw e}const rows=Array.isArray(j.data)?j.data:[];people.push(...rows);if(rows.length<25||j.pagination?.has_next===false)break}
  const records=people.map(p=>{
    const url=profileURL(p.linkedin_url);
    const position=p.primary_position||{},name=clean(p.full_name||[p.first_name,p.last_name].filter(Boolean).join(' '),90),organization=clean(position.company?.name),role=clean(position.job_title||position.normalized_job_title);
    if(!name||!role||!organization)return null;
    return {url:url||'https://getprospect.com/',title:`${name} - ${role} at ${organization}`,text:`${name}. ${role} at ${organization}. Location: ${clean(p.location?.country,80)}. Employment information reported by GetProspect, not independently verified.`,providerRecord:true,personName:name,personRole:role,recordCompany:organization,recordId:clean(p.id,100)||name+'|'+organization,profileUrl:url,providerPersonId:clean(p.id,100),contactAvailability:{email:p.email?.status==='valid',phone:p.mobile_phone?.status==='found'}};
  }).filter(Boolean);
  if(people.partialError)records.partialError=people.partialError;
  return records;
}
export function prepareReveal(input,env){
  if(!env.GETPROSPECT_API_KEY)throw Error('Contact lookup is not configured');
  const source=profileURL(input.source);if(!source)throw Error('A public LinkedIn person profile is required');
  if(!['email','phone'].includes(input.reveal))throw Error('Choose email or phone');
  return {source,reveal:input.reveal};
}
export async function getProspectReveal(env,input){
  const j=await request(env,'/v2/people/enrich',{data:{linkedin_url:input.source},enrich_email:input.reveal==='email',enrich_phone:input.reveal==='phone'},105000);
  const p=j.data;
  if(!p)return {contact:{emails:[],phone:null},lookup:{provider:'GetProspect',field:input.reveal,status:'not_found',checkedAt:new Date().toISOString()}};
  const returned=profileURL(p.linkedin_url);
  if(returned&&returned.toLowerCase()!==input.source.toLowerCase())throw Error('Provider returned a different profile; contact details withheld');
  const email=p.email?.revealed&&p.email?.status==='valid'?clean(p.email.address,254):'';
  const businessEmail=/^[^\s@*]+@[^\s@*]+\.[^\s@*]+$/.test(email)&&!/@(?:gmail|yahoo|hotmail|outlook|icloud|protonmail|live)\./i.test(email)?email:null;
  const phone=p.mobile_phone?.revealed&&p.mobile_phone?.status==='found'?clean(p.mobile_phone.number,40):'';
  const validPhone=/^\+?[\d ()-]{7,30}$/.test(phone)?phone:null;
  const status=input.reveal==='email'?(businessEmail?'found':p.email?.status==='searching'?'pending':'not_found'):(validPhone?'found':'not_found');
  return {contact:{emails:input.reveal==='email'&&businessEmail?[businessEmail]:[],phone:input.reveal==='phone'?validPhone:null,phoneType:validPhone?'Business contact number reported by GetProspect; not independently verified':null},lookup:{provider:'GetProspect',field:input.reveal,status,checkedAt:new Date().toISOString(),verifiedAt:p.email?.verified_at||null,retryAfter:Math.max(10,Math.min(300,Number(p.email?.retry_after)||30)),company:clean(p.primary_position?.company?.name),jobTitle:clean(p.primary_position?.job_title),source:returned||input.source},creditBalance:j.metadata?.credits||null};
}
