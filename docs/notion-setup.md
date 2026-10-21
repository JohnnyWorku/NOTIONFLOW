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
