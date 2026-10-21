// Store screenshots (1280x800) of the real badge on real Steam pages: headless Chrome loads the Steam page, injects the
// exact widget files, mounts the badge with the live API answer and captures it. Games are chosen where Steam's own price
// (as Steam shows it to this machine) is above our lowest, so the screenshot shows what a visitor would really see.
// Usage: node extension/screenshots.mjs <puppeteer-core dir> [appId ...]
import { readFileSync, mkdirSync } from 'node:fs';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
const [, , pdir, ...ids] = process.argv;
const puppeteer = createRequire(pdir + '/')('puppeteer-core');
const widget = readFileSync(new URL('../widget/sdb-price.js', import.meta.url), 'utf8') + '\n' + readFileSync(new URL('../widget/steam-page.js', import.meta.url), 'utf8');
const out = new URL('./store-assets/', import.meta.url);
mkdirSync(out, { recursive: true });
const browser = await puppeteer.launch({ executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true, args: ['--lang=en-US'] });
const page = await browser.newPage();
await page.setViewport({ width: 1280, height: 800, deviceScaleFactor: 1 });
await page.emulateMediaFeatures([{ name: 'prefers-color-scheme', value: 'dark' }]);
for (const id of ids.length ? ids : ['1817070', '374320']) {
  const api = await (await fetch(`https://superduperbundle.com/api/v1/lookup/?steam_id=${id}&client=extension`)).json();
  const g = api.results[0];
  // Steam's age gate: the cookies Steam itself sets after the check
  await page.setCookie({ name: 'birthtime', value: '470703601', domain: 'store.steampowered.com' }, { name: 'lastagecheckage', value: '1-0-1985', domain: 'store.steampowered.com' }, { name: 'wants_mature_content', value: '1', domain: 'store.steampowered.com' });
  await page.goto(`https://store.steampowered.com/app/${id}/?l=english`, { waitUntil: 'networkidle2', timeout: 60000 });
  await page.addScriptTag({ content: widget });
  const r = await page.evaluate((g) => {
    document.querySelectorAll('#cookiePrefPopup, .cookiepreferences_popup').forEach((e) => e.remove());
    const ok = globalThis.sdbMountOnSteam(document, g);
    const b = document.querySelector('[data-sdb-badge]');
    if (b) window.scrollTo(0, b.getBoundingClientRect().top + scrollY - 420);
    return { ok, steam: globalThis.sdbSteamUsd(document.querySelector('#game_area_purchase') || document) };
  }, g);
  console.log(id, g.name, 'ours', g.lowest?.price, 'steam shows', r.steam, r.ok ? 'badge shown' : 'badge hidden');
  if (r.ok) await page.screenshot({ path: fileURLToPath(new URL(`steam-${id}-1280x800.png`, out)) });
}
await browser.close();
