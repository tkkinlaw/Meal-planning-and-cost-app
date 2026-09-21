'use strict';
const VERSION = 'v1';
const ROOT = new URL('./', self.location.href);
const APP = new URL('index.html', ROOT).href;
const PREFIX = 'food-cost-manager:' + ROOT.href + ':';
const CACHE = PREFIX + VERSION;

self.addEventListener('install', event => {
  event.waitUntil((async () => {
    const response = await fetch(APP, { cache: 'reload' });
    if (!response.ok || !response.headers.get('content-type')?.includes('text/html')) {
      throw new Error('Unable to cache index.html');
    }
    const cache = await caches.open(CACHE);
    await cache.put(APP, response);
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter(key => key.startsWith(PREFIX) && key !== CACHE)
      .map(key => caches.delete(key)));
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);
  if (event.request.method !== 'GET' ||
      event.request.mode !== 'navigate' ||
      url.origin !== ROOT.origin ||
      ![ROOT.pathname, new URL(APP).pathname].includes(url.pathname)) return;

  event.respondWith((async () => {
    const cache = await caches.open(CACHE);
    try {
      const response = await fetch(event.request);
      if (!response.ok) throw new Error('Navigation failed');
      if (response.headers.get('content-type')?.includes('text/html')) {
        await cache.put(APP, response.clone());
      }
      return response;
    } catch {
      return await cache.match(APP) ||
        new Response('Open this app online once to enable offline use.', {
          status: 503, headers: { 'Content-Type': 'text/plain; charset=utf-8' }
        });
    }
  })());
});
