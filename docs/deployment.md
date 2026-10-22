# Deploying NotionFlow (backend on Render, web on Vercel, Android APK on GitHub Releases)

> Nobody has deployed this yet and I could not check the platforms' current dashboards. Button names and free-tier
> limits change; where a label differs, follow the platform's own docs. The NotionFlow-side settings below are exact.

## 0. What you will end up with

```
Phone app (Flutter) ───────────────► Backend (NestJS on Render)  ──► Notion
Browser ─► Web app (Next.js on Vercel) ─► (server-side proxy, cookie → Bearer token) ─┘
```
- **Vercel** hosts only the web app. The browser never talks to Notion or to the backend directly: the web app's own server
  forwards requests and attaches your session token from an httpOnly cookie.
- **Render** runs the backend as an always-on Node service. It must NOT be on Vercel: it keeps in-memory state
  (duplicate-create protection, sync version) and receives webhooks.
- **GitHub Releases** (or any public file host) stores the APK, because Vercel's filesystem cannot hold it.

Costs: Vercel Hobby and Render free are enough to start. On Render's free plan the service goes to sleep when idle, so the first
request after a pause is slow (tens of seconds). A paid Render instance removes that. Check current pricing.

## 1. Before you start

1. Accounts: GitHub, Render (https://render.com), Vercel (https://vercel.com). Sign up with GitHub to make linking easy.
2. Make sure everything works locally and builds:
   ```bash
   cd ~/Desktop/NOTIONFLOW
   npm test -w server && npm run build -w server
   npm run typecheck -w web && npm run build -w web
   ```
   Vercel runs the same type check; one TypeScript error fails the deploy.
3. Make sure no secret is in Git:
   ```bash
   git ls-files | grep -E '(^|/)\.env' | grep -v example      # must print nothing
   ```
4. Apply this update's migration (once): in `server/.env` add `APP_PASSWORD` and `AUTH_SECRET` (section 3), restart the backend,
   open the web app: it now shows a login page.

## 2. Put the code on GitHub
```bash
cd ~/Desktop/NOTIONFLOW
git add -A && git commit -m "NotionFlow 0.2"
# create an EMPTY repository on github.com (private is fine), then:
git remote add origin https://github.com/<you>/notionflow.git
git branch -M main && git push -u origin main
```

## 3. Create your secrets (keep them in a password manager)
```bash
openssl rand -hex 32          # → AUTH_SECRET  (signs session tokens; never share it)
```
- `APP_PASSWORD`: the password you will type to sign in. Use a long passphrase (at least 8 characters is enforced; 16+ recommended).
- `NOTION_TOKEN`: your Notion integration secret (see notion-setup.md).
Never paste these into chat, issues, or Git.

## 4. Deploy the backend on Render

1. Render dashboard → **New → Web Service** → connect your GitHub repo.
   (Alternative: **New → Blueprint** and point it at `render.yaml` in this repo; it pre-fills everything below.)
2. Settings:

| Setting | Value |
|---|---|
| Root Directory | *(leave empty, the repo root)* |
| Runtime | Node |
| Build Command | `npm ci --include=dev && npm run build -w server` |
| Start Command | `npm run start -w server` |
| Health Check Path | `/api/health` |
| Instance type | Free (or a paid one to avoid sleeping) |

   `--include=dev` is required: the Nest compiler lives in devDependencies and Render sets `NODE_ENV=production`.

3. **Environment variables** (Environment tab):

| Variable | Value |
|---|---|
| `NODE_VERSION` | `22` |
| `NODE_ENV` | `production` |
| `NOTION_TOKEN` | your Notion integration secret |
| `NOTION_TASKS_DB`, `NOTION_PROJECTS_DB`, `NOTION_GOALS_DB`, `NOTION_LEARNING_DB` | database IDs (leave out the ones you do not use) |
| `NOTION_COLLECTIONS` | JSON for extra tables, **one line**, see custom-collections.md |
| `APP_PASSWORD` | your login password |
| `AUTH_SECRET` | the 64-hex-character value from section 3 |
| `WEB_ORIGIN` | your Vercel URL (add after step 5; start with `http://localhost:3000`) |

   Do not set `PORT`: Render provides it and the server reads it.
4. Click **Create / Deploy**. Wait for "Live". Your URL looks like `https://notionflow-api.onrender.com`.
5. Verify from your laptop:
   ```bash
   API=https://notionflow-api.onrender.com/api
   curl -s $API/health                                  # {"status":"ok",...,"notionConfigured":true}
   curl -s -o /dev/null -w "%{http_code}\n" $API/tasks  # 401  (protected: good)
   read -s -p "Password: " PW; echo
   curl -s -X POST $API/auth/login -H 'content-type: application/json' -d "{\"password\":\"$PW\"}"
   # → {"token":"v1....","expiresAt":"..."}   (wrong password → 401)
   ```
   If `notionConfigured` is false, `NOTION_TOKEN` is missing. If the deploy fails at start with an `AUTH_SECRET`/`APP_PASSWORD`
   message, that value is too short.


## 5. Deploy the web app on Vercel

1. Vercel → **Add New → Project** → import the same repo.
2. **Root Directory:** `apps/web` (Edit → select it). Framework preset: Next.js (auto-detected).
   Keep "Include source files outside of the Root Directory" enabled so the monorepo install works.
3. **Environment Variables:**

| Variable | Value |
|---|---|
| `API_BASE_URL` | `https://notionflow-api.onrender.com/api` |
| `APK_URL`, `APK_VERSION`, `APK_SHA256`, `APK_SIZE_BYTES` | add in section 8 |

   Do **not** prefix with `NEXT_PUBLIC_` and do **not** add `APP_API_KEY`/passwords here.
4. **Deploy.** You get `https://<project>.vercel.app`.
5. Go back to Render → set `WEB_ORIGIN=https://<project>.vercel.app` → redeploy the backend.
6. Open the Vercel URL: you should land on the login page → sign in → dashboard. If the dashboard says "Backend unreachable",
   `API_BASE_URL` is wrong, or the free Render service is waking up (wait and retry).

## 6. Custom domain (optional)
Vercel → Project → Settings → Domains. Then update `WEB_ORIGIN` on Render to the new domain. Render also supports custom
domains for the API (then use that in `API_BASE_URL` and in the mobile app).

## 7. Notion webhooks (optional, near-instant updates)
Now you have a public HTTPS backend. Follow notion-setup.md step 7 with
`https://notionflow-api.onrender.com/api/sync/webhook`. Copy the verification token from the Render **logs**, paste it into Notion, then
set `NOTION_WEBHOOK_SECRET` on Render and redeploy. Note: on the free plan a sleeping server cannot receive events.

## 8. Mobile app for production

1. Build an HTTPS-only APK:
   ```bash
   cd ~/Desktop/NOTIONFLOW
   ALLOW_HTTP=0 ./scripts/publish-apk.sh
   ```
   It prints `APK_URL`-style values at the end (version, SHA-256, size).
2. Upload `apps/web/downloads/notionflow.apk` to a **public** location. GitHub Releases:
   - Web UI: repo → **Releases → Draft a new release** → tag `v0.2.0` → drag the APK in → **Publish**.
   - or CLI: `gh release create v0.2.0 apps/web/downloads/notionflow.apk --title "NotionFlow 0.2.0" --notes "Android app"`
   - The download link has the form `https://github.com/<you>/<repo>/releases/download/v0.2.0/notionflow.apk`.
   - A **private** repo's release files need a GitHub login to download. For phones, use a public repo for releases or another
     public host (Cloudflare R2, Google Drive direct link, etc.). The APK contains no secrets.
3. In Vercel → Settings → Environment Variables set `APK_URL` (the link), `APK_VERSION`, `APK_SHA256`, `APK_SIZE_BYTES`,
   then **Redeploy**. The `/download` page (public, no login needed) now offers the file.
4. On your phone: open `https://<project>.vercel.app/download` → Download → install (allow "Install unknown apps" for your
   browser) → open the app → **Server address** `https://notionflow-api.onrender.com/api` and your password.
5. Updating the app later: increase the `version:` in `apps/mobile/pubspec.yaml` (e.g. `0.2.1+3`; the number after `+`
   MUST increase), rebuild, upload a new release, update the four `APK_*` variables. Keep building on the same laptop: Android only
   installs updates signed with the same key (the debug key in `~/.android/debug.keystore`). For Google Play you need a proper
   upload keystore (https://docs.flutter.dev/deployment/android#sign-the-app).

## 9. Security checklist

- [x] Notion token only on Render; never in Vercel, the app, or Git.
- [x] Every API route except `/health`, `/auth/login` and the Notion webhook requires a signed token (30-day expiry).
- [x] Login is rate-limited (10 attempts/minute). Tokens are in an httpOnly Secure cookie (web) or the Android keystore (app).
- [x] Webhooks are verified by HMAC signature.
- [ ] **Login lockout caveat:** behind Vercel, all web logins reach the backend from Vercel's addresses, so an attacker hammering the
      login form can exhaust the 10/min limit and briefly lock YOU out (they still cannot get in). Mitigations: strong password,
      Vercel's firewall/rate limiting, or a bot-protection layer (Cloudflare) in front. Mobile logins hit the backend directly.
- [ ] Single user: there is no per-user data separation. Do not share the password.
- Rotating: change `APP_PASSWORD` and redeploy → old password stops working (existing sessions stay valid until expiry).
  Change `AUTH_SECRET` and redeploy → **all sessions are revoked** (everyone must sign in again). Rotate the Notion token in the Notion
  integration page, update `NOTION_TOKEN` on Render.
- Lost password: it is only an environment variable; set a new one in Render.

## 10. Day-to-day operations
- Deploy: `git push` → Render and Vercel redeploy automatically.
- Rollback: Render/Vercel dashboards keep previous deploys; redeploy an older one.
- Logs: Render → Logs. They never contain tokens or passwords (the one-time webhook verification token is the exception).
- The backend keeps its sync version and idempotency keys in memory: a restart resets them. Clients recover by refetching. Run **one**
  instance. If you need several instances, offline sync or audit logs, that is the moment to add PostgreSQL.

## 11. Troubleshooting

| Symptom | Likely cause / fix |
|---|---|
| Vercel build fails with a TypeScript error | Run `npm run build -w web` locally, fix, push. |
| Vercel build fails: cannot find module from `../..` | Root Directory must be `apps/web` and "include files outside root" enabled. |
| Login page says "Cannot reach the server" | `API_BASE_URL` wrong (must end with `/api`), or Render is asleep: retry after ~1 min. |
| Login says "Login is not configured" | `APP_PASSWORD`/`AUTH_SECRET` missing on Render. |
| Login says "Too many attempts" | Wait a minute (rate limit). |
| After login you bounce back to /login | Cookie not stored: use https (not http on a LAN IP), check browser blocks cookies. |
| Dashboard "Database not configured" | The matching `NOTION_*_DB` variable is empty, or the DB is not shared with the integration. |
| 422 "No … property mapped" when saving | The Notion database lacks that property type; see custom-collections.md field mapping. |
| App: "Cannot reach the server" | Server address typo, missing `/api`, or http:// address with an HTTPS-only build. |
| App: install blocked | Allow "Install unknown apps" for the browser; or the file is not the same signing key as the installed app (uninstall first). |
| `/download` says not published | `APK_URL` not set on Vercel (or redeploy not done). |
| Render: first request very slow | Free instance waking up. |
