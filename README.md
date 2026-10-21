# NotionFlow

Next.js web + Flutter mobile + NestJS backend over your Notion workspace. Notion is the source of truth.

| Part | Path | Port |
|------|------|------|
| API (NestJS) | `server/` | 4000 (`/api`, Swagger at `/api/docs`) |
| Web (Next.js) | `apps/web/` | 3000 |
| Mobile (Flutter) | `apps/mobile/` | n/a |

**Read `docs/STATUS.md` first**: it states exactly what has and has not been verified.

## 1. Setup (Ubuntu, from repo root)
```bash
./scripts/setup.sh
```
Installs Node deps, creates `.env` files, and (if Flutter exists) generates the Android project.

## 2. Verify the code compiles and tests pass
```bash
npm test -w server            # Jest (mocked Notion)
npm run build -w server       # Nest compile
npm run typecheck -w web && npm test -w web && npm run build -w web
cd apps/mobile && flutter analyze && flutter test
```
Paste me any error output and I will fix it.

## 3. Connect Notion
Follow `docs/notion-setup.md`, then:
```bash
npm run dev:server            # terminal 1
npm run dev:web               # terminal 2
curl localhost:4000/api/health
```

## 4. Mobile
```bash
cd apps/mobile && flutter run
```
In the app Settings: emulator URL `http://10.0.2.2:4000/api`; physical phone `http://<laptop-IP>:4000/api` (find IP with `hostname -I`; same Wi-Fi; allow port with `sudo ufw allow 4000/tcp`). Paste your `APP_API_KEY`.

Install Flutter on Ubuntu: https://docs.flutter.dev/get-started/install/linux/android (needs Android Studio/SDK, then `flutter doctor`).

APK for direct install: `flutter build apk --release`. Play Store: `flutter build appbundle --release` (requires a signing keystore; see Flutter docs "Build and release an Android app").

## Production notes
Set `NODE_ENV=production`, a strong `APP_API_KEY` (`openssl rand -hex 32`), `WEB_ORIGIN` to your web URL, serve everything over HTTPS, and keep `NOTION_TOKEN` only in the host's secret store. Deploy `server/` to any Node host (Render/Fly/Railway/VPS), `apps/web` to Vercel or the same host, setting `API_BASE_URL` and `APP_API_KEY` as server-side env vars. Rotate by generating a new key, updating the server and clients; rotate the Notion token in the Notion integration page.
