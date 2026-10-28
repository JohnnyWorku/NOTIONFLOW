// Checks every backend endpoint the apps depend on and explains what is wrong, in plain words.
//   node scripts/diagnose.mjs http://localhost:4000/api
//   node scripts/diagnose.mjs https://your-service.onrender.com/api https://your-app.vercel.app
//   (the optional second address also checks that the web app's proxy is up to date)
// The password is asked interactively (hidden) or read from NF_PASSWORD. Nothing secret is printed.
import readline from 'node:readline';

const api = (process.argv[2] ?? 'http://localhost:4000/api').replace(/\/+$/, '');
const web = process.argv[3] ? process.argv[3].replace(/\/+$/, '') : null;

function ask(q) {
  return new Promise((resolve) => {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    rl._writeToOutput = (s) => process.stdout.write(s.includes(q) ? s : '*');
    rl.question(q, (a) => { rl.close(); process.stdout.write('\n'); resolve(a); });
  });
}
async function call(path, { method = 'GET', token, body } = {}) {
  try {
    const res = await fetch(`${api}${path}`, {
      method, signal: AbortSignal.timeout(90_000),
      headers: { 'content-type': 'application/json', ...(token ? { authorization: `Bearer ${token}` } : {}) },
      body: body ? JSON.stringify(body) : undefined,
    });
    const text = await res.text();
    let json = null;
    try { json = JSON.parse(text); } catch { /* not json */ }
    return { status: res.status, json, text };
  } catch (e) {
    return { status: 0, json: null, text: String(e.message ?? e) };
  }
}
const ok = (m) => console.log(`  ✅ ${m}`);
const bad = (m) => console.log(`  ❌ ${m}`);
const info = (m) => console.log(`     ${m}`);
const outdated = (r) => r.status === 404 && /^Cannot /.test(r.json?.message ?? '');

console.log(`\nChecking ${api}\n(first request can take ~1 minute if a free Render server is waking up)\n`);

console.log('1. Backend reachable');
const h = await call('/health');
if (h.status === 0) { bad(`cannot connect: ${h.text}`); info('Is the backend running? Is the address correct (it must end with /api)?'); process.exit(1); }
if (h.status !== 200) { bad(`/health returned ${h.status}`); info('The address is probably wrong: it must end with /api'); process.exit(1); }
ok(`/health ok, Notion token ${h.json?.notionConfigured ? 'set' : 'MISSING (set NOTION_TOKEN on the server)'}`);
info(`backend version: ${h.json?.version ? `v${h.json.version}${h.json.commit ? ` (commit ${h.json.commit})` : ''}` : 'older than 0.3.2 (no version reported)'}`);

console.log('\n2. Sign in');
const pw = process.env.NF_PASSWORD ?? (await ask('   Password: '));
const login = await call('/auth/login', { method: 'POST', body: { password: pw } });
if (login.status === 200 && login.json?.token) ok('login works');
else {
  bad(`login returned ${login.status}: ${login.json?.message ?? login.text.slice(0, 120)}`);
  if (outdated(login)) info('The backend is OLD (no /auth/login). Redeploy/restart it with the latest code.');
  if (login.status === 503) info('Set APP_PASSWORD and AUTH_SECRET on the server.');
  process.exit(1);
}
const token = login.json.token;

console.log('\n3. Tables the server knows about (/collections)');
const cols = await call('/collections', { token });
if (outdated(cols)) bad('Backend is OLD: it has no /collections. Redeploy/restart the backend.');
else if (cols.status !== 200) bad(`returned ${cols.status}: ${cols.json?.message ?? ''}`);
else {
  const list = cols.json ?? [];
  const configured = list.filter((c) => c.configured);
  (configured.length ? ok : bad)(`${configured.length} of ${list.length} tables have a database ID`);
  for (const c of list) info(`${c.configured ? '✔' : '✘'} ${c.key.padEnd(14)} ${c.label}${c.discovered ? ' (found on your Notion home page)' : c.builtin ? '' : ' (custom)'}${c.configured ? '' : '  ← set its database ID on the server'}`);
  if (!configured.length) info('Set NOTION_TASKS_DB etc. (or NOTION_COLLECTIONS), then restart/redeploy the backend.');
}

console.log('\n4. Dashboard data (/dashboard)');
const dash = await call('/dashboard', { token });
if (outdated(dash)) bad('Backend is OLD: no /dashboard.');
else if (dash.status !== 200) bad(`returned ${dash.status}: ${dash.json?.message ?? ''}`);
else {
  ok('responds');
  const w = dash.json?.warnings;
  if (Array.isArray(w) && w.length) { bad('Some tables failed to load from Notion:'); w.forEach((x) => info(`• ${x}`)); }
  else if (w === undefined) info('(older backend: no warnings field, so failures are hidden. Redeploy the latest backend.)');
  else ok('no warnings');
}

console.log('\n5. Home data (/home), what the Home screen needs');
const home = await call('/home', { token });
if (outdated(home)) { bad('The backend has NO /home route → it is running old code. Redeploy/restart the backend.'); }
else if (home.status !== 200) bad(`returned ${home.status}: ${home.json?.message ?? home.text.slice(0, 120)}`);
else {
  ok('responds');
  for (const s of home.json.sections ?? []) (s.error ? bad : ok)(`${s.label}: ${s.error ?? `${s.items.length} record(s)${s.hasMore ? ' (+ more)' : ''}`}`);
  if (!(home.json.sections ?? []).length) bad('No tables configured (see step 3).');
  const p = home.json.page;
  if (p) {
    (p.error ? bad : ok)(p.error ? `Notion home page: ${p.error}` : `Notion home page "${p.title}": ${p.blocks.length} top-level block(s), ${p.skipped} skipped`);
    const dbs = [];
    const walk = (bs) => (bs ?? []).forEach((b) => { if (b.type === 'database') dbs.push(b); walk(b.children); });
    walk(p.blocks);
    for (const b of dbs) {
      const what = b.error ? `ERROR: ${b.error}`
        : b.collectionKey ? `${b.collectionKey} · ${b.exact ? `EXACT Notion view${b.viewName ? ` “${b.viewName}”` : ''}` : 'approximate (guessed from the heading)'} · ${b.items?.length ?? 0} item(s)`
        : 'not matched to any table';
      (b.error || !b.collectionKey ? bad : ok)(`${(b.heading ?? '').trim() || '(no heading)'} → ${what}${b.pageTitle ? ` · lives on page “${b.pageTitle}”` : ''}`);
    }
    if (dbs.some((b) => b.collectionKey && !b.exact)) info('"approximate" means the Notion Views API could not be used for that block (see docs/notion-setup.md, step 8).');
  }
  else info('No NOTION_HOME_PAGE_ID set (optional).');
}
console.log('\n5b. Pages (/pages): pinned pages and pages linked from your Notion home page');
const pg = await call('/pages', { token });
if (outdated(pg)) bad('Backend is OLD: no /pages route. Redeploy/restart the backend.');
else if (pg.status !== 200) bad(`returned ${pg.status}: ${pg.json?.message ?? ''}`);
else if (!(pg.json ?? []).length) info('none yet (add a page link to your Notion home page, or set NOTION_PAGES)');
else for (const x of pg.json) ok(`${x.icon ? x.icon + ' ' : ''}${x.title}  (${x.source === 'config' ? 'pinned' : 'linked from your Notion home page'})`);

if (web) {
  console.log('\n6. Web app (' + web + ')');
  try {
    const v = await fetch(`${web}/api/version`, { signal: AbortSignal.timeout(30_000) });
    if (v.ok) {
      const j = await v.json();
      ok(`web version v${j.version}${j.commit ? ` (commit ${j.commit})` : ''}, environment ${j.environment}`);
      if (!j.apiBaseConfigured) bad('API_BASE_URL is NOT set on the web app');
    } else {
      bad(`/api/version returned ${v.status} → the web app is OLDER than 0.3.2 (it has not been redeployed with your latest commit)`);
    }
    // Sign in through the web app exactly like a browser, then call the routes the pages use.
    const wl = await fetch(`${web}/api/auth/login`, {
      method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ password: pw }), signal: AbortSignal.timeout(90_000),
    });
    if (!wl.ok) {
      const t = await wl.text();
      bad(`web sign-in failed (${wl.status}): ${t.slice(0, 140)}`);
      info('If this says "Cannot POST /auth/login", API_BASE_URL on the web app is missing the trailing /api.');
    } else {
      const raw = wl.headers.getSetCookie ? wl.headers.getSetCookie() : [wl.headers.get('set-cookie') ?? ''];
      const cookie = raw.map((c) => c.split(';')[0]).filter(Boolean).join('; ');
      if (!cookie) bad('web sign-in worked but sent no session cookie');
      else {
        ok('web sign-in works');
        for (const route of ['health', 'collections', 'dashboard', 'home', 'pages', 'stats']) {
          const r = await fetch(`${web}/api/proxy/${route}`, { headers: { cookie }, signal: AbortSignal.timeout(90_000) });
          if (r.status === 200) ok(`web → backend /${route}: 200`);
          else if (r.status === 404) bad(`web → backend /${route}: 404 → the web app is running OLD code (its proxy does not allow "${route}")`);
          else bad(`web → backend /${route}: ${r.status} ${(await r.text()).slice(0, 100)}`);
        }
      }
    }
  } catch (e) { bad(`cannot reach the web app: ${e.message}`); }
}
console.log('\nDone. Send me this output if something is still wrong.\n');
