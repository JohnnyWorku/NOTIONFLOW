# API (Swagger at /api/docs). Auth: `Authorization: Bearer $APP_API_KEY`
- `GET /api/health` (public)
- `GET /api/notion/databases`, `GET /api/notion/databases/:id/schema`
- `GET|POST /api/{tasks|projects|goals|learning}`, `GET|PATCH|DELETE /api/{kind}/:pageId` (DELETE archives)
  - list query: `cursor, pageSize, search, status, overdue`
  - POST header: `Idempotency-Key`; PATCH body requires `expectedLastEdited` (409 on stale)
- `GET /api/dashboard`, `GET /api/sync/status`, `GET /api/sync/changes?since=N`, `POST /api/sync/webhook` (public, HMAC)
Errors: `{ statusCode, code?, message }`.
