// Builds superduperbundle.user.js = header + the shared widget + main.js (node userscript/build.mjs).
import { readFileSync, writeFileSync } from 'node:fs';
const here = (p) => new URL(p, import.meta.url);
const version = JSON.parse(readFileSync(here('../js/package.json'))).version;
const header = `// ==UserScript==
// @name         SuperDuperBundle: lowest key price on Steam
// @namespace    https://superduperbundle.com/
// @version      ${version}
// @description  Shows the lowest listed key price for a game from the stores SuperDuperBundle compares, right on its Steam store page, with a link to the full comparison.
// @author       SuperDuperBundle team
// @homepageURL  https://superduperbundle.com/tools/api/
// @supportURL   https://github.com/superduperbundle/game-price-api/issues
// @license      MIT
// @match        https://store.steampowered.com/app/*
// @grant        GM.xmlHttpRequest
// @grant        GM_xmlhttpRequest
// @connect      superduperbundle.com
// @run-at       document-end
// @noframes
// ==/UserScript==
// Sends only the Steam app ID of the page you are on to superduperbundle.com. No tracking, no cookies, nothing else read.
// SuperDuperBundle may earn a commission when you buy through store links on its site; prices and their order are not affected.
`;
const out = `${header}\n${readFileSync(here('../widget/sdb-price.js'), 'utf8')}\n${readFileSync(here('main.js'), 'utf8')}`;
writeFileSync(here('superduperbundle.user.js'), out);
console.log(`superduperbundle.user.js ${version}, ${out.length} bytes`);
