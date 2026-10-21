# Store listing kit (Chrome Web Store, Edge Add-ons, Opera Add-ons, Firefox AMO)

Same text everywhere. Zips: `npm run zip` → `.output/*-chrome.zip` (Chrome, Edge, Opera) and `*-firefox.zip` + `*-sources.zip` (AMO asks for the source).

**Name:** SuperDuperBundle: lowest key price on Steam
**Short description (≤ 132 chars):** See the lowest listed key price for a game from the stores SuperDuperBundle compares, right on its Steam store page.
**Category:** Shopping
**Website / support:** https://superduperbundle.com/tools/extension/ · contact@superduperbundle.com
**Privacy policy:** https://superduperbundle.com/privacy/ (add the "Browser extension" section in the release that announces it)

**Description:**
On a game's Steam store page, this extension shows the lowest listed key price at the stores SuperDuperBundle compares
(official stores, retailers and key marketplaces), the store, how many stores were compared and when the price was
checked. "Compare prices" opens the full comparison on superduperbundle.com, where every offer is listed.

- Prices are US-dollar listed prices as each store shows them. If Steam already shows you a price at or below ours in
  US dollars (regional pricing), the extension shows nothing.
- No account, no tracking. The only thing sent is the Steam app ID of the page you are on, to superduperbundle.com.
- It never changes links, cookies or checkout pages on Steam or any store.
- Affiliate disclosure: SuperDuperBundle may earn a commission when you buy through store links on its website. It
  never changes the price you pay or the order of offers.

**Permission justifications:**
- Host `https://superduperbundle.com/*`: fetch the price for the game on the current Steam page.
- `storage`: keep answers for 15 minutes so the same page does not ask again (session storage, cleared when the browser closes).
- Content script on `https://store.steampowered.com/app/*`: read the app ID and Steam's displayed price, show the badge.

**Data use (Chrome "Privacy practices"):** collects no user data; "website content" is read only to find the app ID and
displayed price, not stored or sent anywhere except the app ID.

**Screenshots (1280×800):** a Steam game page with the badge (dark theme), a close-up of the badge, the compare page it opens.
**Icons:** `public/icon/{16,32,48,96,128}.png` (from site/public/logo.png). Store tile 440×280: to make.

**Accounts (owner):** Chrome Web Store developer (one-time $5), Microsoft Partner Center (Edge, free), Opera add-ons
(free), Firefox AMO (free). Same publisher name everywhere: SuperDuperBundle.
