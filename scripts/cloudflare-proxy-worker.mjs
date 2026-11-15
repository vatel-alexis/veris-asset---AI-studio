const CLOUD_RUN_ORIGIN = 'veris-assets0-423841411832.europe-west2.run.app';

const HOP_BY_HOP_PREFIXES = ['cf-', 'x-forwarded-'];
const FORBIDDEN_HEADERS = new Set(['host', 'connection', 'keep-alive', 'transfer-encoding']);

export default {
  async fetch(request) {
    const url = new URL(request.url);
    const targetUrl = new URL(url.pathname + url.search, `https://${CLOUD_RUN_ORIGIN}`);

    // Build clean headers without incoming Host / CF-* headers so Cloudflare sets Host: <CLOUD_RUN_ORIGIN>
    const cleanHeaders = new Headers();
    for (const [key, value] of request.headers.entries()) {
      const lower = key.toLowerCase();
      if (FORBIDDEN_HEADERS.has(lower)) continue;
      if (HOP_BY_HOP_PREFIXES.some((prefix) => lower.startsWith(prefix))) continue;
      cleanHeaders.set(key, value);
    }

    const response = await fetch(targetUrl.toString(), {
      method: request.method,
      headers: cleanHeaders,
      body: request.method !== 'GET' && request.method !== 'HEAD' ? request.body : undefined,
      redirect: 'manual',
    });

    const responseHeaders = new Headers(response.headers);
    const location = responseHeaders.get('Location');
    if (location && location.includes(CLOUD_RUN_ORIGIN)) {
      responseHeaders.set('Location', location.replaceAll(CLOUD_RUN_ORIGIN, url.hostname));
    }
    responseHeaders.set('x-veris-proxy', 'cloudflare-worker');

    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers: responseHeaders,
    });
  },
};
