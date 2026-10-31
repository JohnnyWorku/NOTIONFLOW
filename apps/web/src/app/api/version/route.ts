export const dynamic = 'force-dynamic';

/** Public, no secrets: tells you which build of the web app is actually live. */
export function GET() {
  return Response.json({
    app: 'web',
    version: '0.6.0',
    commit: process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) ?? null,
    environment: process.env.VERCEL_ENV ?? 'local',
    apiBaseConfigured: !!process.env.API_BASE_URL,
  });
}
