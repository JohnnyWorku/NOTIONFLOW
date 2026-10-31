# Status (honest record)

## Verified on the owner's machine (earlier build, 0.1)
Backend Jest + `nest build`, web typecheck/tests/`next build`, APK build + install flow.

## 0.2 changes: what has actually been run
| Item | Written | Executed here |
|---|:--:|:--:|
| Session-token signing/verification, password compare | yes | **yes** (Node script, all assertions passed) |
| Statistics maths (streaks, timezone days, task/collection summaries) | yes | **yes** (Node script) |
| Property mapping incl. `amount`/`created` | yes | **yes** (Node script) |
| Nest wiring (auth guard, collections, stats, controllers), Jest specs | yes | **no** (needs `npm test -w server`) |
| Web login/middleware/proxy, dialog, collection view, stats UI | yes | **no** (needs `npm run build -w web`) |
| Flutter login/router/forms/stats | yes | **no** (needs `flutter analyze && flutter test`) |
| Deployment (Render/Vercel/GitHub Releases) | docs + render.yaml | **no** |

## New in 0.2
Login (web cookie session + mobile login screen), public APK link via `APK_URL`, custom collections (`NOTION_COLLECTIONS`),
Notion-driven Status/Priority dropdowns, edit + delete + load-more on web and mobile, statistics (dashboard + /stats + mobile tab).

## 0.3 changes
- Home screen (web + mobile): Notion home page mirror (`NOTION_HOME_PAGE_ID`), a card per connected table, relation chips across tables, Quick add.
- Mobile redesign: new theme with dark mode, card-based lists, status/priority/due chips, skeleton loading, gradient Home header, restyled login/tables/stats/settings.
- Executed here: block conversion logic (Node script). Not executed: Nest wiring, web build, Flutter analyze/test.

## 0.3.3 changes
- Home mirrors your Notion home page with LIVE lists: each database view takes its meaning from the heading above it (docs/notion-setup.md step 8), instead of an empty "Untitled" link.
- Home no longer repeats the same data: mirrored page = main body; only overdue tasks and tables not on the page appear below.
- Executed here: heading→table/preset inference and date-range maths (Node script). Not executed: Nest wiring, web build, Flutter analyze/test.

## 0.4.0 changes
- Home uses the EXACT filters and sorts of the database views on your Notion home page (Notion Views API), with a heading-based fallback.
- Tables added to the Notion home page are discovered and registered automatically (no settings change); they get create/edit/delete like other tables.
- A different card design per kind of table (task, project, goal, learning, habit/log, standard) on web and mobile.
- Executed here: the real HomeService/CollectionsService logic against a fake Notion modelled on your page (exact filter + sorts, auto-discovery, unshared database, API-unavailable fallback, section de-duplication, relations, caching, cold-start discovery) and the pure helpers. Not executed: Nest build, web build, Flutter analyze/test, and any call to the real Notion Views API.
- Unverified assumption: the Views API calls are made with the SDK's generic `request()` (GET /views?database_id=<database block id>, GET /views/{id}); field names follow Notion's current docs. `node scripts/diagnose.mjs` reports per view whether it was EXACT.

## 0.5.0 changes
- Every record card now uses the Goals look; accent colour + icon identify the table. Web and mobile.
- Pages: any Notion page (linked from the home page, pinned with NOTION_PAGES, or the page a table lives on) opens as a screen that mirrors it with live exact-filter lists. Sub-pages open in the app.
- Executed here: the real HomeService against a fake Notion for pages (parent page of a table, page index with titles and emoji, page mirror without self-link, invalid NOTION_PAGES). Not executed: Nest build/Jest, web build, Flutter analyze/test, real Notion calls.
- Unverified assumption: finding a table's parent page uses `database_parent` on a data source (falling back to the database's `parent`, and walking up block parents). If your Notion returns it differently, the "Page" button simply does not appear; pinned and linked pages still work.

## 0.6.0 changes
- Seven distinct card layouts, one per kind of table (task, project, goal, learning, habit/log, note, standard), web and mobile. The Goals card is unchanged. 0.5.0's "same card, different colour" was a misreading and is replaced.
- Per-table override: `NOTION_CARD_STYLES` or `"card"` in `NOTION_COLLECTIONS`.
- NotionFlow icon (favicon, Apple touch icon, installable-app icons, manifest) on the web app, drawn from the logo's geometry; icons are served before sign-in.
- Executed here: style inference and overrides (Node), icon rendering (checked visually against your logo). Not executed: web build, Flutter analyze/test, Jest. Card layouts themselves have not been seen in a browser or on a phone by me.

## Known limits
- Task completion day is estimated from last edit (Notion stores no completion time).
- Statistics read up to 300 records per table.
- Notion's API cannot return images, embeds or linked database views, so those parts of a home page are not mirrored.
- Single owner, single backend instance; in-memory sync state resets on restart.
- Login lockout caveat behind Vercel (see deployment.md section 9).
- Not built: offline cache, push notifications, AI assistant, multi-user accounts, multi-select/formula properties, Google Play signing.
