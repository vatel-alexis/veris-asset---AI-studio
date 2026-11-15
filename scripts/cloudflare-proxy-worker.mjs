const CLOUD_RUN_ORIGIN = 'veris-assets0-423841411832.europe-west2.run.app';

export default {
  async fetch(request) {
    const url = new URL(request.url);
    const targetUrl = new URL(url.pathname + url.search, `https://${CLOUD_RUN_ORIGIN}`);

    const headers = new Headers(request.headers);
    headers.set('Host', CLOUD_RUN_ORIGIN);
    headers.set('X-Forwarded-Host', url.hostname);
    headers.set('X-Forwarded-Proto', 'https');

    const response = await fetch(targetUrl.toString(), {
      method: request.method,
      headers,
      body: request.method !== 'GET' && request.method !== 'HEAD' ? request.body : undefined,
      redirect: 'manual',
    });

    // Rewrite any absolute redirect pointing to the internal Cloud Run hostname back to the public domain
    const responseHeaders = new Headers(response.headers);
    const location = responseHeaders.get('Location');
    if (location && location.includes(CLOUD_RUN_ORIGIN)) {
      responseHeaders.set('Location', location.replaceAll(CLOUD_RUN_ORIGIN, url.hostname));
    }

    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers: responseHeaders,
    });
  },
};
