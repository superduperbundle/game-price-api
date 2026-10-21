// Fetches prices for the content script (the background worker is not bound by Steam's page CSP). Answers are cached in
// storage.session for 15 minutes; after a 429 the worker stays quiet until Retry-After has passed (the content script then
// shows nothing). Sends only the Steam app ID.
const API = 'https://superduperbundle.com/api/v1/lookup/';
const TTL = 15 * 60 * 1000;
let quietUntil = 0;

async function lookup(appId: string) {
  const key = `g:${appId}`;
  const c = (await browser.storage.session.get(key))[key] as { at: number; g: unknown } | undefined;
  if (c && Date.now() - c.at < TTL) return c.g;
  if (Date.now() < quietUntil) return null;
  try {
    const res = await fetch(`${API}?steam_id=${encodeURIComponent(appId)}&client=extension`, { headers: { Accept: 'application/json' } });
    if (res.status === 429) { quietUntil = Date.now() + 1000 * (Number(res.headers.get('retry-after')) || 600); return null; }
    if (!res.ok) return null;
    const g = ((await res.json()).results ?? [])[0] ?? null;
    await browser.storage.session.set({ [key]: { at: Date.now(), g } });
    return g;
  } catch { return null; }
}

export default defineBackground(() => {
  browser.runtime.onMessage.addListener((msg: any, _sender, send) => {
    if (msg?.type === 'sdb-lookup' && /^\d{1,10}$/.test(String(msg.appId))) { lookup(String(msg.appId)).then(send); return true; }
    return false;
  });
});
