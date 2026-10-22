# Adding your own tables (Spiritual, Health, Finance, Reading…)

NotionFlow shows any Notion database as a "collection": list, search, create, edit, delete, plus automatic statistics.
You add one by listing it in `NOTION_COLLECTIONS`. No code changes.

## 1. Prepare the Notion database
Any layout works, but these property types are understood (names are flexible):

| Purpose | Notion property type | Auto-detected when… |
|---|---|---|
| Title | Title | always (the title column) |
| Status | **Status** or **Select** | type is Status; or a Select named like *status/state/stage* |
| Priority | Select | name like *priority/importance* |
| Date | Date | first Date property (prefers names like *date/due/deadline*) |
| Done | Checkbox | first Checkbox (prefers *done/complete*) |
| Progress (0–100) | Number | name like *progress/percent* |
| Amount | Number | name like *count/amount/value/pages/minutes/hours/score/streak/reps/total/verses/distance* |
| Notes | Rich text | name like *note/description/summary* |
| Relation | Relation | any Relation |

Unsupported types (Multi-select, Formula, Rollup, People, Files…) are shown as "unsupported" and never overwritten.

**Example, a spiritual practice log:** `Name` (title), `Date` (date), `Done` (checkbox), `Pages` (number), `Category` (select), `Notes` (text).
Statistics then show entries per day and total pages in the chosen range. `Category` is a Select that is not named like a status,
so map it explicitly (step 3) if you want a dropdown for it.

## 2. Share it and get its ID
Notion: open the database → `···` → **Connections** → add your integration. Then open NotionFlow → Settings → copy the database ID
(or `GET /api/notion/databases`).

## 3. Declare it
Set one line (a JSON array) as `NOTION_COLLECTIONS` in `server/.env` (local) or in Render's environment (production):

```json
[
  {"key":"spiritual","label":"Spiritual","databaseId":"PASTE_DATABASE_ID","icon":"moon","description":"Prayer, Quran, dhikr",
   "fields":{"amount":"Pages","status":"Category"}},
  {"key":"health","label":"Health","databaseId":"PASTE_ANOTHER_ID","icon":"dumbbell"}
]
```
- `key`: lowercase letters, digits, dashes (max 30). It becomes the URL (`/c/spiritual`). Must be unique and cannot reuse
  `tasks`, `projects`, `goals`, `learning`.
- `label`, `databaseId`: required. `icon`: one of `check folder target book sparkles heart dumbbell wallet moon sun star leaf brain`.
- `fields` (optional): override auto-detection with your real property names. Allowed keys:
  `title status priority due done relation progress notes amount`.
- In `.env` write it on ONE line; or keep it in a file and set `NOTION_COLLECTIONS_PATH=./collections.json` (local only).

Restart (local) or redeploy (Render). Invalid JSON or a bad key stops the server at startup with a message saying what to fix.

## 4. What you get automatically
- Web: the table appears in the sidebar under "Your tables" and on the Tables page; mobile: Tables tab.
- Create/edit forms show only the fields your database has, with the real Status/Priority options from Notion.
- Statistics page: records, entries in the range, totals of the Amount property, progress averages, per-day bars.
- The record count is capped at 300 per table for statistics (a "+" marks truncation).
