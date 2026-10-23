# API (Swagger at /api/docs in development)

Auth: `POST /api/auth/login {password}` -> `{token, expiresAt}`; then `Authorization: Bearer <token>`.
(An optional static `APP_API_KEY` is also accepted for scripts.) Public: `/api/health`, `/api/auth/login`, `/api/sync/webhook`.

- `GET /api/collections` (labels/icons only, never database IDs)
- `GET /api/c/:key/meta` field mapping + allowed Status/Priority options
- `GET|POST /api/c/:key`, `GET|PATCH|DELETE /api/c/:key/:pageId` (DELETE archives to Notion trash)
  - list query: `cursor, pageSize (<=100), search, status, overdue`
  - POST header `Idempotency-Key`; PATCH requires `expectedLastEdited` (409 + current record when stale)
  - body fields: `title status priority due done progress amount notes`
- Legacy aliases: `/api/tasks`, `/api/projects`, `/api/goals`, `/api/learning` (same behaviour)
- `GET /api/home` live overview: recent records per table, relation titles, optional mirrored Notion home page (cached until a write or 60s)
- `GET /api/dashboard`
- `GET /api/stats?days=7..365&tz=<minutes east of UTC>` performance statistics (cached 60s)
- `GET /api/notion/databases`, `GET /api/notion/databases/:id/schema`
- `GET /api/sync/status`, `GET /api/sync/changes?since=N`, `POST /api/sync/webhook`
Errors: `{ statusCode, code?, message }`.
