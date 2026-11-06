const LIMIT = 10;
const DAY = 86400000;
const encoder = new TextEncoder();
const hex = bytes => [...new Uint8Array(bytes)].map(b => b.toString(16).padStart(2, '0')).join('');
async function sign(secret, value) {
  const key = await crypto.subtle.importKey('raw', encoder.encode(secret), {name:'HMAC',hash:'SHA-256'}, false, ['sign']);
  return hex(await crypto.subtle.sign('HMAC', key, encoder.encode(value)));
}
export function dailyWindow(now = Date.now()) {
  const day = Math.floor((now + 4 * 3600000) / DAY);
  return {day, resetAt: new Date((day + 1) * DAY - 4 * 3600000).toISOString()};
}
export function networkIdentity(ip) {
  if (!ip) throw Error('Missing trusted client address');
  if (!ip.includes(':')) return ip;
  // Group IPv6 privacy addresses by /64, including compressed representations.
  const parts = ip.toLowerCase().split('::');
  const left = parts[0] ? parts[0].split(':') : [];
  const right = parts[1] ? parts[1].split(':') : [];
  const full = parts.length === 2 ? [...left, ...Array(Math.max(0,8-left.length-right.length)).fill('0'), ...right] : left;
  return full.slice(0,4).map(x => parseInt(x,16).toString(16)).join(':') + '::/64';
}
async function deviceIdentity(request, env) {
  const token = request.headers.get('X-Device-Token') || '';
  const [id, signature] = token.split('.');
  if (/^[a-f0-9-]{36}$/.test(id || '') && signature === await sign(env.APP_TOKEN, 'device:' + id)) return {id, token};
  const newId = crypto.randomUUID();
  return {id:newId, token:newId + '.' + await sign(env.APP_TOKEN, 'device:' + newId)};
}
export async function quotaFor(request, env, consume = false) {
  if (!env.DAILY_QUOTA) throw Error('Usage protection unavailable');
  const device = await deviceIdentity(request, env);
  const network = await sign(env.APP_TOKEN, 'network:' + networkIdentity(request.headers.get('CF-Connecting-IP')));
  const window = dailyWindow();
  const stub = env.DAILY_QUOTA.get(env.DAILY_QUOTA.idFromName('daily-v1:' + window.day));
  const result = await stub.fetch('https://quota.internal/', {method:'POST',body:JSON.stringify({network,device:device.id,consume,resetAt:window.resetAt})});
  if (!result.ok) throw Error('Usage protection unavailable');
  return {...await result.json(), deviceToken:device.token};
}
// One SQLite object coordinates all counters for a day. The two counter updates
// are one transaction, so simultaneous requests cannot race past the cap.
export class DailyQuota {
  constructor(ctx) {
    this.ctx = ctx;
    ctx.storage.sql.exec('CREATE TABLE IF NOT EXISTS counters (key TEXT PRIMARY KEY, used INTEGER NOT NULL)');
  }
  async fetch(request) {
    const {network,device,consume,resetAt} = await request.json();
    if (!network || !device || !Number.isFinite(Date.parse(resetAt))) return new Response(null,{status:400});
    const keys = ['ip:' + network, 'device:' + device];
    const usage = this.ctx.storage.transactionSync(() => {
      const counts = keys.map(key => this.ctx.storage.sql.exec('SELECT used FROM counters WHERE key = ?',key).toArray()[0]?.used || 0);
      const allowed = counts.every(count => count < LIMIT);
      if (consume && allowed) keys.forEach(key => this.ctx.storage.sql.exec('INSERT INTO counters (key,used) VALUES (?,1) ON CONFLICT(key) DO UPDATE SET used=used+1',key));
      const used = Math.max(...counts) + (consume && allowed ? 1 : 0);
      return {allowed,limit:LIMIT,used,remaining:Math.max(0,LIMIT-used),resetAt,timeZone:'Asia/Dubai',scope:'device-and-network'};
    });
    if (!await this.ctx.storage.getAlarm()) await this.ctx.storage.setAlarm(Date.parse(resetAt) + DAY);
    return Response.json(usage);
  }
  async alarm() { await this.ctx.storage.deleteAll(); }
}
