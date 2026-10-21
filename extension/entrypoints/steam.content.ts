// Steam app pages: asks the background worker for the game's price and draws the shared badge (../widget/) above the
// purchase area. Nothing is shown on errors, rate limits, unknown games, or when Steam's own US-dollar price is as low.
import '../../widget/sdb-price.js';
import '../../widget/steam-page.js';

export default defineContentScript({
  matches: ['https://store.steampowered.com/app/*'],
  runAt: 'document_end',
  async main() {
    const g: any = globalThis as any;
    const appId = g.sdbSteamAppId(location);
    if (!appId) return;
    const game = await browser.runtime.sendMessage({ type: 'sdb-lookup', appId }).catch(() => null);
    if (game) g.sdbMountOnSteam(document, game);
  },
});
