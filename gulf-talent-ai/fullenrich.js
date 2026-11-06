import {profileURL} from './getprospect.js';
const BASE='https://app.fullenrich.com/api/v2';
const encoder=new TextEncoder();
const bytes=value=>encoder.encode(value);
const b64=value=>btoa(String.fromCharCode(...value)).replaceAll('+','-').replaceAll('/','_').replace(/=+$/,'');
const unb64=value=>Uint8Array.from(atob(value.replaceAll('-','+').replaceAll('_','/')),x=>x.charCodeAt(0));
const ownerID=async token=>b64(new Uint8Array(await crypto.subtle.digest('SHA-256',bytes(token))));
const signingKey=env=>crypto.subtle.importKey('raw',bytes(env.FULLENRICH_API_KEY),{name:'HMAC',hash:'SHA-256'},false,['sign','verify']);
async function request(env,path,body,timeout=18000){
  if(!env.FULLENRICH_API_KEY)throw Error('FullEnrich is not configured');
  const r=await fetch(BASE+path,{method:body?'POST':'GET',headers:{Authorization:'Bearer '+env.FULLENRICH_API_KEY,'Content-Type':'application/json'},...(body?{body:JSON.stringify(body)}:{}),signal:AbortSignal.timeout(timeout)});
  if(!r.ok)throw Error(r.status===402?'FullEnrich credits exhausted':r.status===429?'FullEnrich rate limit':'FullEnrich HTTP '+r.status);
  return r.json();
}
export async function fullEnrichBalance(env){const j=await request(env,'/account/credits',null,8000);return {configured:true,connected:true,credits:Number(j.balance)||0}}
export function prepareFullReveal(input,env){
  if(!env.FULLENRICH_API_KEY)throw Error('FullEnrich is not configured');
  const source=profileURL(input.source);if(!source)throw Error('A public LinkedIn person profile is required');
  if(!['email','phone'].includes(input.reveal))throw Error('Choose email or phone');
  return {source,reveal:input.reveal};
}
async function makeTicket(env,data,deviceToken){
  const payload=b64(bytes(JSON.stringify({...data,owner:await ownerID(deviceToken),expires:Date.now()+86400000})));
  return payload+'.'+b64(new Uint8Array(await crypto.subtle.sign('HMAC',await signingKey(env),bytes(payload))));
}
export async function readFullTicket(env,ticket,deviceToken){
  try{if(typeof ticket!=='string'||ticket.length>2200)throw Error();const [payload,signature,extra]=ticket.split('.');if(extra||!signature||!await crypto.subtle.verify('HMAC',await signingKey(env),unb64(signature),bytes(payload)))throw Error();const data=JSON.parse(new TextDecoder().decode(unb64(payload)));if(data.expires<Date.now()||data.owner!==await ownerID(deviceToken)||!profileURL(data.source)||!['email','phone'].includes(data.field)||!/^[0-9a-f-]{36}$/i.test(data.jobId))throw Error();return data}catch{const e=Error('Lookup session is invalid or expired; use the original browser');e.status=403;throw e}
}
export async function startFullReveal(env,input,deviceToken){
  const j=await request(env,'/contact/enrich/bulk',{name:'Gulf Talent AI contact lookup',data:[{linkedin_url:input.source,enrich_fields:[input.reveal==='email'?'contact.work_emails':'contact.phones']}]});
  if(!/^[0-9a-f-]{36}$/i.test(j.enrichment_id||''))throw Error('FullEnrich returned no lookup ID');
  const ticket=await makeTicket(env,{jobId:j.enrichment_id,source:input.source,field:input.reveal},deviceToken);
  return {contact:{emails:[],phone:null},lookup:{provider:'FullEnrich',field:input.reveal,status:'pending',ticket,retryAfter:10,source:input.source,checkedAt:new Date().toISOString()}};
}
export async function fullRevealStatus(env,ticket,deviceToken){
  const data=await readFullTicket(env,ticket,deviceToken),j=await request(env,'/contact/enrich/bulk/'+data.jobId);
  const lookup={provider:'FullEnrich',field:data.field,source:data.source,checkedAt:new Date().toISOString()};
  if(j.status!=='FINISHED'){if(['CANCELED','CANCELLED','FAILED','ERROR'].includes(j.status))throw Error('FullEnrich lookup failed; no new lookup was started');return {contact:{emails:[],phone:null},lookup:{...lookup,status:'pending',ticket,retryAfter:10}}}
  const row=j.data?.[0],inputURL=row?.input?.linkedin_url||row?.input?.professional_network_url;
  if(inputURL&&profileURL(inputURL).toLowerCase()!==data.source.toLowerCase())throw Error('Provider returned a different profile; contact details withheld');
  const info=row?.contact_info||{};
  const emails=data.field==='email'?[info.most_probable_work_email,...(info.work_emails||[])].filter(e=>e&&e.status==='DELIVERABLE'&&/^[^\s@*]+@[^\s@*]+\.[^\s@*]+$/.test(e.email)&&!/@(?:gmail|yahoo|hotmail|outlook|icloud|protonmail|live)\./i.test(e.email)).map(e=>e.email):[];
  const phone=data.field==='phone'?[info.most_probable_phone,...(info.phones||[])].find(p=>p&&p.line_type==='MOBILE'&&p.line_status!=='INACTIVE'&&p.ownership_match!=='REJECTED'&&/^\+?[\d ()-]{7,30}$/.test(p.number)):null;
  return {contact:{emails:[...new Set(emails)].slice(0,3),phone:phone?.number||null,phoneType:phone?'Mobile reported by FullEnrich; not independently verified':null},lookup:{...lookup,status:emails.length||phone?'found':'not_found',creditsCharged:Number(j.cost?.credits)||0}};
}
