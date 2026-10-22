import { promises as fs } from 'fs';
import path from 'path';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Where is the Android app? Production: set APK_URL (+ APK_VERSION, APK_SHA256, APK_SIZE_BYTES) as env vars and
 * host the file anywhere public (e.g. a GitHub Release). Local dev: falls back to apps/web/downloads/.
 */
export async function GET() {
  const url = process.env.APK_URL;
  if (url) {
    return Response.json({
      url,
      version: process.env.APK_VERSION ?? 'latest',
      sha256: process.env.APK_SHA256 ?? '',
      sizeBytes: Number(process.env.APK_SIZE_BYTES ?? 0),
      builtAt: null,
    });
  }
  try {
    const raw = await fs.readFile(path.join(process.cwd(), 'downloads', 'latest.json'), 'utf8');
    return Response.json({ ...JSON.parse(raw), url: '/api/apk-file' });
  } catch {
    return Response.json({ message: 'APK not published yet' }, { status: 404 });
  }
}
