# Building the extension from source

Requirements: Node.js 22, npm 10+. From this folder (`extension/`; the shared badge code is in `../widget/`):

    npm ci
    npx wxt build -b firefox     # output: .output/firefox-mv2/
    npx wxt build                # Chrome/Edge/Opera: .output/chrome-mv3/

No minification beyond WXT's default bundling; no remote code. Source repository: https://github.com/superduperbundle/game-price-api
