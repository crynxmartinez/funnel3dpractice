# Protecting the frames

The funnel's code cannot be protected. The frames can.

That distinction is the whole design. GHL renders your blocks into page source,
so the markup, CSS, JavaScript and copy are readable by anyone with View Source —
there is no way around that, and obfuscation buys hours, not protection. But the
**720 WebP frames are the expensive asset**, and those can be locked to your
domains. A clone that cannot load frames renders black canvases and is worthless.

## What this does

An R2 bucket holds the frames. A Cloudflare Worker sits in front of it and
refuses any request whose `Origin` (or `Referer`) is not on your allowlist. The
GHL blocks point at the Worker instead of a public CDN.

A browser **cannot forge `Origin`** — the browser sets it and page JavaScript
cannot override it. So this genuinely stops browser-based clones, which is what a
GHL clone is.

## Deploy

**1. Build the tiers** (skip if `assets/frames/` is already populated):

```bash
python tools/build-frames.py
```

**2. Create the bucket and upload** — about 21 MB across 723 objects:

```bash
npx wrangler r2 bucket create r5-frames

export R2_ACCOUNT_ID=...
export R2_ACCESS_KEY_ID=...
export R2_SECRET_ACCESS_KEY=...
export R2_BUCKET=r5-frames

pip install boto3
python protect/upload-to-r2.py --check    # dry run first
python protect/upload-to-r2.py
```

Credentials come from R2 → Manage API tokens → create one scoped to this bucket.

**3. Configure the Worker.** Fill in the four `>>>` markers in
`protect/wrangler.toml`: account id, the custom domain the Worker answers on, the
bucket name, and `ALLOWED_ORIGINS`.

`ALLOWED_ORIGINS` must list **every host the funnel is served from** or your own
page breaks — your live domain, the GHL preview host if you preview there, and
`localhost` only while testing. Subdomains of each entry are allowed
automatically. An empty value makes the Worker return 500 rather than silently
serving everyone.

**4. Deploy:**

```bash
cd protect && npx wrangler deploy
```

**5. Point the blocks at it.** In `ghl/teardown-block.html`,
`ghl/lens-block.html` and `ghl/turntable-block.html`, set:

```js
var FRAME_BASE = 'https://frames.yourdomain.com';
```

Optionally fill in `ALLOWED_HOSTS` in the same three files for a client-side
domain lock. **An empty array disables it deliberately** — a lock that silently
blanks your own GHL preview is worse than no lock. It only deters a lazy clone,
since the array is editable in page source. The Worker is the real barrier.

Then re-paste the three blocks into GHL and publish.

**6. Verify the lock actually works.** From a different origin:

```bash
curl -s -o /dev/null -w '%{http_code}\n' \
  -H 'Origin: https://not-your-domain.example' \
  https://frames.yourdomain.com/assets/frames/rotate/desktop/f001.webp
```

Expect `403`. Repeat with your real origin and expect `200`. If a wrong origin
returns 200, stop and re-check `ALLOWED_ORIGINS`.

## Close the old door

The frames were public on jsDelivr while the repo was public, so:

- **Make the repo private**, or gitignore `assets/frames/` and let R2 be the only
  host. Otherwise this whole exercise is decorative — anyone can still hotlink
  the repo copy.
- Be aware git history retains the frames even after they stop being tracked.
- jsDelivr caches for up to 7 days, so public copies may remain reachable for a
  short while after the repo goes private. Anyone who already downloaded them
  has them permanently. There is no undoing that part.

## Threat model, honestly

| Attempt | Result |
|---|---|
| GHL cloner extension copies the page | Code copies fine, **frames 403** → black canvases |
| Scraper saves the published HTML | Same — frames refuse to load off your domain |
| Someone pastes a frame URL in the address bar | 403 (no `Origin`, no `Referer`) |
| Clone edits `FRAME_BASE` to their own host | They must first obtain and re-host 21 MB themselves |
| Clone deletes `ALLOWED_HOSTS` | Client lock gone, but the Worker still 403s |
| Server-side proxy spoofing `Origin` | **Works.** Not preventable at this layer — see below |
| Copying your copy, layout and design | **Not preventable.** It is in page source |

The one real gap is a server-side proxy: a determined person can run their own
server that forges `Origin` and relays frames. But that means paying to serve
~21 MB per visitor, and it is visible — the Worker logs every blocked origin, and
you can rate-limit or block a proxy's IPs with a Cloudflare rule once you see it.
It turns a free two-click clone into ongoing infrastructure someone has to fund
and maintain. That is the realistic goal here, and it is worth having.

Watch for clones with:

```bash
npx wrangler tail
```

Blocked requests log as JSON with the offending host.

## What is actually defensible

Not the HTML. The offer, the traffic source, the list, the brand, and the fact
that a cloner ends up with a page selling a camera they cannot fulfil. People
clone funnels constantly and mostly get nothing from it, because the page is the
cheapest part of the machine.

One more note specific to this project: the page uses Canon's product renders and
says so in its own footer. Hardening the delivery is reasonable engineering, but
this particular funnel is not the asset to build a legal position around.
