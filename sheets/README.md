# SuperDuperBundle for Google Sheets

Editor add-on: `=GAMEPRICE("Elden Ring")`, `=GAMEPRICE(1245620)`, `=GAMEPRICE(A2:A50)`, `=GAMEPRICE(A2, "store")`
(fields: price, store, url, name, stores, steam, list, discount, checked), `=GAMESTORE(A2)`, `=GAMEURL(A2)`, plus a
sidebar (Extensions → SuperDuperBundle → Look up a game). Answers cached 6 hours; Steam IDs are looked up 50 per request.

Scopes: `script.external_request` (calls https://superduperbundle.com only), `spreadsheets.currentonly`,
`script.container.ui` (menu + sidebar). No Google user data is read or stored.

Deploy: `npx @google/clasp push` from this folder (`.clasp.json` holds the script ID). Test: `node sheets/test.mjs`.
