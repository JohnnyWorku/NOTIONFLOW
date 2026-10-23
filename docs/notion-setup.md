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

8. **Home page mirror (optional)**: if you have a Notion page that acts as your home (it links or embeds your tables), NotionFlow can show it on the Home screen.
   - Open the page in Notion → `···` → **Connections** → add your integration (a page must be shared separately from its databases).
   - Copy its link (`···` → Copy link). The ID is the last 32 letters/digits of the URL (before any `?`), for example `https://www.notion.so/Home-0123456789abcdef0123456789abcdef` → `0123456789abcdef0123456789abcdef`.
   - Set `NOTION_HOME_PAGE_ID=<that id>` in `server/.env` (or on Render) and restart/redeploy.
   - Shown: headings, text, lists, to-dos, callouts, quotes, toggles, columns, bookmarks, and links to pages. **Inline databases** whose ID or title matches one of your connected tables become buttons that open that table inside NotionFlow.
   - Not shown (Notion's API does not provide them): images, embeds, and **linked database views** (a database view placed on the page that lives elsewhere). They are counted in a small "N blocks can't be shown" note. Your connected tables still appear in the "Your tables" section of Home.
   - Even without this setting, Home shows a card for every connected table, with the records they link to through Notion relations.
