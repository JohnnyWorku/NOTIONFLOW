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

## Known limits
- Task completion day is estimated from last edit (Notion stores no completion time).
- Statistics read up to 300 records per table.
- Single owner, single backend instance; in-memory sync state resets on restart.
- Login lockout caveat behind Vercel (see deployment.md section 9).
- Not built: offline cache, push notifications, AI assistant, multi-user accounts, multi-select/formula properties, Google Play signing.
