import { createReadStream, promises as fs } from 'fs';
import path from 'path';
import { Readable } from 'stream';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Local-development fallback only. On Vercel the filesystem does not contain the APK; use APK_URL instead.
const FILE = path.join(process.cwd(), 'downloads', 'notionflow.apk');

export async function GET() {
  try {
    const stat = await fs.stat(FILE);
    const stream = Readable.toWeb(createReadStream(FILE)) as unknown as ReadableStream;
    return new Response(stream, {
      headers: {
        'Content-Type': 'application/vnd.android.package-archive',
        'Content-Length': String(stat.size),
        'Content-Disposition': 'attachment; filename="notionflow.apk"',
        'Cache-Control': 'no-store',
      },
    });
  } catch {
    return Response.json({ message: 'APK not published yet' }, { status: 404 });
  }
}
