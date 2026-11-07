// Post-search call accounting. AI is disabled regardless of legacy environment overrides.
export function postBudget(env={}){
 const cap=(key,def,max)=>{const v=env[key];return v===undefined||String(v).trim()===''?def:Math.max(0,Math.min(max,Math.floor(Number(v)||0)))};
 const limits={Tavily:cap('POST_MAX_TAVILY_CALLS',6,8),OpenAI:0,review:0,web:0,summary:0},used=Object.fromEntries(Object.keys(limits).map(k=>[k,0]));
 return {reserve(kind){if(!(kind in limits)||used[kind]>=limits[kind]||(['review','web','summary'].includes(kind)&&used.OpenAI>=limits.OpenAI))return false;used[kind]++;if(['review','web','summary'].includes(kind))used.OpenAI++;return true},snapshot(){return {limits:{...limits},used:{...used},exhausted:Object.keys(limits).filter(k=>limits[k]>0&&used[k]>=limits[k]),monetaryCap:false}}};
}
