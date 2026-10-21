import { defineConfig } from 'wxt';

// One build for Chrome, Edge and Opera (same zip) and one for Firefox (wxt build -b firefox).
// Permissions: only the API host (the background worker fetches there, outside Steam's page CSP). No tabs, no history,
// no storage of browsing data; the content script runs only on Steam app pages.
export default defineConfig({
  manifest: ({ browser }) => ({
    name: 'SuperDuperBundle: lowest key price on Steam',
    short_name: 'SDB Prices',
    description: 'See the lowest listed key price for a game from the stores SuperDuperBundle compares, right on its Steam store page.',
    homepage_url: 'https://superduperbundle.com/tools/extension/',
    host_permissions: ['https://superduperbundle.com/*'],
    permissions: ['storage'],
    ...(browser === 'firefox' ? {
      browser_specific_settings: { gecko: { id: 'extension@superduperbundle.com', strict_min_version: '115.0', data_collection_permissions: { required: ['none'] } } },
    } : {}),
  }),
});
