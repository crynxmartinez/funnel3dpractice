/**
 * Cloudflare Worker — origin-locked frame delivery.
 *
 * Sits in front of an R2 bucket holding the WebP tiers and refuses to serve
 * them to any page that is not on your allowlist. A cloned funnel on someone
 * else's domain gets 403s and renders black canvases.
 *
 * WHY ORIGIN AND NOT SIGNED URLS
 * Signed, short-lived URLs sound stronger but are worse here. Each visitor
 * loads up to 240 frames; per-visitor URLs would be unique, so Cloudflare
 * would cache-miss on every one and every request would hit R2 — slower for
 * real visitors and billed per read. Stable URLs plus a header check at the
 * edge gives full CDN caching AND the block, which is the better trade.
 *
 * A browser cannot forge the Origin header — the browser sets it, and page
 * JavaScript cannot override it. So this genuinely stops browser-based clones,
 * which is what a GHL clone is. See README for what it does not stop.
 *
 * Deploy:  npx wrangler deploy
 */

const CORS_MAX_AGE = 86400;
const IMMUTABLE = 'public, max-age=31536000, immutable';

/** Parse the comma-separated allowlist from the environment. */
function allowlist(env) {
  return (env.ALLOWED_ORIGINS || '')
    .split(',')
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
}

/** Does `host` match an allowlist entry, or any subdomain of one? */
function hostMatches(host, allowed) {
  if (!host) return false;
  host = host.toLowerCase();
  return allowed.some((a) => host === a || host.endsWith('.' + a));
}

/**
 * Work out which page asked for this frame.
 *
 * Origin is the reliable signal and is present because the page requests
 * frames with crossOrigin="anonymous". Referer is the fallback for the
 * no-CORS retry path in the client. A request with neither is a direct hit —
 * someone pasting the URL into an address bar, or a bare script — and is
 * refused unless ALLOW_DIRECT is set.
 */
function requesterHost(request) {
  const origin = request.headers.get('Origin');
  if (origin) {
    try { return new URL(origin).hostname; } catch { return null; }
  }
  const referer = request.headers.get('Referer');
  if (referer) {
    try { return new URL(referer).hostname; } catch { return null; }
  }
  return null;
}

function deny(reason, host, env) {
  // Surfaces in `wrangler tail` and Workers Logs, so you can see who is
  // trying. Useful for finding clones early.
  console.log(JSON.stringify({ blocked: true, reason, host: host || '(none)' }));
  const body = env.DENY_MESSAGE || 'Not available from this origin.';
  return new Response(body, {
    status: 403,
    headers: {
      'Cache-Control': 'no-store',
      'Content-Type': 'text/plain; charset=utf-8',
      // Deliberately no ACAO: nothing should be readable cross-origin here.
    },
  });
}

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const allowed = allowlist(env);
    const host = requesterHost(request);
    const origin = request.headers.get('Origin');

    // A misconfigured allowlist would silently serve to everyone. Fail closed.
    if (!allowed.length) {
      return new Response('ALLOWED_ORIGINS is not configured.', {
        status: 500, headers: { 'Cache-Control': 'no-store' },
      });
    }

    if (request.method === 'OPTIONS') {
      if (!hostMatches(host, allowed)) return deny('preflight', host, env);
      return new Response(null, {
        status: 204,
        headers: {
          'Access-Control-Allow-Origin': origin || '*',
          'Access-Control-Allow-Methods': 'GET, HEAD, OPTIONS',
          'Access-Control-Max-Age': String(CORS_MAX_AGE),
          Vary: 'Origin',
        },
      });
    }

    if (request.method !== 'GET' && request.method !== 'HEAD') {
      return new Response('Method not allowed', { status: 405 });
    }

    if (!host) {
      if (env.ALLOW_DIRECT !== 'true') return deny('no-origin-or-referer', null, env);
    } else if (!hostMatches(host, allowed)) {
      return deny('origin-not-allowed', host, env);
    }

    // Only ever serve the frame tree. Stops path traversal and stops the
    // bucket being used as general storage.
    const key = decodeURIComponent(url.pathname.replace(/^\/+/, ''));
    const ok = /^assets\/(frames\/(teardown|lens|rotate)\/(desktop|mobile)\/f\d{3}\.webp|poster-(teardown|lens|rotate)\.webp)$/;
    if (!ok.test(key)) return deny('path-not-allowed', host, env);

    /* Cache keyed on the URL only, so all allowed origins share one cached
       copy. Safe because the allowlist check above already ran. */
    const cache = caches.default;
    const cacheKey = new Request(url.toString(), { method: 'GET' });
    let response = await cache.match(cacheKey);

    if (!response) {
      const object = await env.FRAMES.get(key);
      if (!object) return new Response('Not found', { status: 404 });

      response = new Response(object.body, {
        headers: {
          'Content-Type': object.httpMetadata?.contentType || 'image/webp',
          'Cache-Control': IMMUTABLE,
          ETag: object.httpEtag,
        },
      });
      ctx.waitUntil(cache.put(cacheKey, response.clone()));
    }

    // Per-origin CORS so the canvas stays untainted and readable. Vary so the
    // browser cache does not reuse one origin's headers for another.
    const out = new Response(request.method === 'HEAD' ? null : response.body, response);
    out.headers.set('Access-Control-Allow-Origin', origin || url.origin);
    out.headers.set('Vary', 'Origin');
    out.headers.set('X-Content-Type-Options', 'nosniff');
    out.headers.delete('Access-Control-Expose-Headers');
    return out;
  },
};
