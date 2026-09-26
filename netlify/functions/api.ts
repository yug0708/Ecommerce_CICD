import serverless from 'serverless-http';
import { createApp } from '../../server/src/app.js';
import { initCache } from '../../server/src/lib/cache.js';

let ready = false;
let handle: ReturnType<typeof serverless> | null = null;

function withApiPrefix(path: string): string {
  if (path.startsWith('/api')) return path;
  const stripped = path.replace(/^\/\.netlify\/functions\/api/, '') || '/';
  const suffix = stripped.startsWith('/') ? stripped : `/${stripped}`;
  return suffix.startsWith('/api') ? suffix : `/api${suffix === '/' ? '' : suffix}`;
}

export async function handler(event: Record<string, unknown>, context: Record<string, unknown>) {
  if (context && typeof context === 'object') {
    (context as { callbackWaitsForEmptyEventLoop?: boolean }).callbackWaitsForEmptyEventLoop = false;
  }

  if (!ready) {
    await initCache();
    handle = serverless(createApp(), {
      binary: ['image/*', 'application/octet-stream', 'application/pdf'],
    });
    ready = true;
  }

  if (typeof event.path === 'string') {
    event.path = withApiPrefix(event.path);
  }
  const rawPath = event.rawPath;
  if (typeof rawPath === 'string') {
    event.rawPath = withApiPrefix(rawPath);
  }

  return handle!(event, context);
}
