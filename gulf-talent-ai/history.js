export const HISTORY_LIMIT = 10;

export function recordSearch(history, filters, results, now = new Date()) {
  const contacts = JSON.parse(JSON.stringify((Array.isArray(results) ? results : []).slice(0, 40)));
  return [{...filters, contacts, time:now.toLocaleString(), savedAt:now.toISOString()},
    ...(Array.isArray(history) ? history : [])].slice(0, HISTORY_LIMIT);
}

export function storedResults(entry) {
  if (!entry || !Array.isArray(entry.contacts)) return null;
  return JSON.parse(JSON.stringify(entry.contacts));
}
