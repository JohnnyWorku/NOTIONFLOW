# Notion setup
1. https://www.notion.so/profile/integrations → **New integration** (Internal). Capabilities: Read, Update, Insert content.
2. Copy the **Internal Integration Secret** into `server/.env` as `NOTION_TOKEN` (never commit it, never paste it in chat).
3. In Notion, open each database (tasks, projects, goals, learning) → `···` → **Connections** → add your integration.
4. Start the server, open http://localhost:3000/settings (or `GET /api/notion/databases`): copy each database ID to `NOTION_TASKS_DB`, `NOTION_PROJECTS_DB`, `NOTION_GOALS_DB`, `NOTION_LEARNING_DB`. Restart.
5. Inspect a schema: `GET /api/notion/databases/<id>/schema` returns property names and types only. Share that output with me if mapping looks wrong (it contains no secrets).
6. Property mapping is auto-detected by type and name (title, status/select, priority, date, checkbox, relation, progress number, notes). Override with a JSON file referenced by `NOTION_MAPPING_PATH`:
```json
{ "tasks": { "status": "Stage", "due": "Deadline" }, "goals": { "progress": "Completion %" } }
```
7. **Webhooks (optional, near-real-time)**: need a public HTTPS URL (e.g. `cloudflared tunnel` in dev). In the integration's Webhooks tab subscribe to `https://<host>/api/sync/webhook`. Notion sends a verification token; the server logs it once; paste it in Notion and in `NOTION_WEBHOOK_SECRET`, restart. Without webhooks, clients still poll every 15s but the server only learns of edits made *in Notion* when a client refetches (list calls always read live from Notion).

8. **Home page mirror (optional, recommended)**: NotionFlow can mirror your Notion home page and make Home work like it.
   - **Share the page:** open it in Notion → `···` → **Connections** → add your integration. (A page and its databases are shared separately.)
   - **Find its ID:** `···` → Copy link. The ID is the last 32 letters/digits of the URL, before any `?`. Set `NOTION_HOME_PAGE_ID=<id>` in `server/.env` (or on Render) and restart/redeploy.
   - **Same filters as Notion.** Each database view on the page (a table under a heading, a linked view, a board…) is read through Notion's **Views API**: NotionFlow takes that view's saved **filter and sort order** and runs them against the table, so the list matches what Notion shows. Quick filters that have a value are applied too. The card caption says *"Same filter as your Notion view “Today”"* and there is a link to open the view in Notion.
   - **New tables are picked up automatically.** If you add another database view to the Notion home page, NotionFlow finds it, registers the table (name taken from the database, or the heading above it) and shows it on Home and in the menus. You do not have to edit any server setting. (The table's database must be **shared with the integration**; otherwise the card says so.) It then also supports adding, editing and deleting records like every other table. Changes appear within about a minute (view definitions are cached for 2 minutes).
   - **Card designs:** every kind of table has its own card. Tasks (urgency stripe, due date first), projects (gradient badge, deadline, thick progress bar), goals (progress ring), learning (book tile, progress) and logs such as Spiritual (calendar-date tile with a big number). New tables get the design that fits their name or properties (for example a table named "Prayer log" gets the log card; one with Done + Date gets the task card).
   - **If a view cannot be read** (for example the API version is too old, or the view is a chart/dashboard), NotionFlow falls back to reading the intent from the heading above it ("Today's Tasks" → today's tasks, "Active Projects" → not done, "This week", "Overdue"…), and the caption says *Approximate filter*. Run `node scripts/diagnose.mjs <api-url>` to see, for every view on your page, whether it is **EXACT** or approximate and how many records it returned.
   - **Known limits:** if a database block has several view tabs, the first tab is used. A quick filter that means "me" is skipped (an integration has no Notion user). Images and embeds on the page are not shown. Tables not on the home page and not listed in `NOTION_COLLECTIONS` / `NOTION_*_DB` are not tracked.
   - **API version:** leave `NOTION_API_VERSION` blank so the SDK's default is used; the Views API needs version 2025-09-03 or newer. If you see "approximate" everywhere, make sure `@notionhq/client` is up to date (`npm update @notionhq/client -w server`).
   - Even without this setting, Home shows a card for every configured table, with the records they link to through Notion relations.

9. **Pages.** In Notion, something like "Spiritual" is often a *page* that holds several tables and notes, not just one table. NotionFlow shows pages too:
   - **Pages linked from your Notion home page** (sub-pages and page links) appear automatically under "Pages" in the menu, on Home, and in the Tables tab. Opening one shows that Notion page: its text, its sub-pages, and every table on it as a live list that uses **the same filter as the Notion view**.
   - **The page a table lives on.** Each table card has a **Page** button that opens the Notion page holding that table (for the Spiritual table: the Spiritual page). Pages that are already on screen are not repeated.
   - **Pin a page that is not linked anywhere**: set `NOTION_PAGES` to a one-line JSON array, for example `[{"id":"<32-character page id>","label":"Spiritual","icon":"moon"}]` (`icon` is optional: check, folder, target, book, sparkles, heart, dumbbell, wallet, moon, sun, star, leaf, brain). Share the page with the integration first. Pinned pages come first.
   - Tables found on a page are registered automatically and get the same card design and editing as every other table. Sub-pages open inside the app, so you can go as deep as your Notion goes.
   - Limits: a page needs to be shared with the integration (page → `···` → Connections); very long pages show their first part; images and embeds are not shown.
   - **Cards: every kind of table has its own design.**

     | Table | Card |
     |---|---|
     | Tasks | colour stripe for urgency (red overdue/high, amber, green done), checkbox in front, the due date as a badge on the right |
     | Projects | gradient header with name and status, then deadline and a thick progress bar |
     | Goals | progress ring (or a target icon) on a soft green card |
     | Learning | book-cover tile, hours/pages, progress bar |
     | Spiritual and other logs (habits, health, workouts…) | calendar tile for the day, big number for the amount, a tick when done |
     | Notes, ideas, journal | sticky-note card with a preview of the text |
     | Anything else | clean, simple card |

     The design is chosen from the table's **name** (tasks, projects, goals, learning/course/book, spiritual/prayer/habit/health…, notes/ideas/journal) and, if the name does not tell, from its **properties** (a checkbox and a date → task, a progress number → project or goal, a number and date → log, text only → note). To choose it yourself, set `NOTION_CARD_STYLES={"spiritual":"habit","reading":"learning"}`, or add `"card":"project"` to a table in `NOTION_COLLECTIONS`. Allowed: task, project, goal, learning, habit, note, standard. This works for tables found automatically on your Notion pages too.
