# GoHighLevel paste blocks

Two self-contained blocks that reproduce this funnel's sequences inside a GHL
funnel page. No build step, no dependencies, no `<script src>` — paste and go.

| File | What it is | Risk in a page builder |
|---|---|---|
| `teardown-block.html` | Pinned scroll teardown hero, 6 copy beats | Medium — needs `position: sticky` to survive GHL's containers |
| `turntable-block.html` | Drag-to-rotate viewer | **Low** — nothing is pinned |

## Assets

Both blocks pull frames from the public repo over jsDelivr's CDN. Verified live:

```
https://cdn.jsdelivr.net/gh/crynxmartinez/funnel3dpractice@main
```

Returns `200`, `content-type: image/webp`, `access-control-allow-origin: *`,
and `cache-control: max-age=604800`. Nothing else to host or upload.

To point somewhere else, change the single `FRAME_BASE` line near the top of
each block's `<script>`. It must be a **public HTTPS origin with no trailing
slash** — the browser fetches these directly, so a private repo returns 404.

> The repo must stay public for this to keep working. If you make it private
> again, both blocks break and you will need a different host (Cloudflare R2,
> S3, or Netlify all work).

Pinning to a commit instead of a branch is safer for a live page, because
`@main` picks up whatever you push next:

```
https://cdn.jsdelivr.net/gh/crynxmartinez/funnel3dpractice@<commit-sha>
```

## Installing in GHL

1. Funnel → page → add a **Custom Code / HTML** element.
2. Paste one entire file, including its `<style>` and `<script>`.
3. **Row settings: full width, one column, padding 0.** This matters — see below.
4. Save and **publish**, then test on the published URL.

The builder's live preview usually does not execute JavaScript, so both blocks
will look like empty boxes in the editor. That is expected. Always test on the
published page.

Place the turntable in the row directly **above your pricing section** — the
whole point of it is "look it over yourself" immediately before the ask. Its CTA
links to `#offer`, so either give your pricing row that ID or edit the two
`href="#offer"` values.

## The one thing that will bite you

GHL nests every element in flex rows, and those rows often carry
`overflow: hidden`, which **silently kills `position: sticky`** — the hero
would scroll away instead of pinning while the frames play.

The teardown block detects this at runtime. Around 15% through the section it
measures whether the pin is actually holding at the top; if not, it switches to
fixed positioning and logs:

```
[r5x] position:sticky is being blocked by an ancestor …
```

This is tested: in the harness below, inside a deliberately hostile
`overflow: hidden` row, sticky fails, the fallback engages, and the pin holds at
`top: 0` correctly. So the block works either way — but a clean full-width row
avoids the problem entirely and is one less moving part.

If you ever see the hero neither pinning nor falling back, an ancestor has a
`transform` or `filter` on it (those break `position: fixed` too). Move the
block to a row without entry animations.

## Testing locally before you paste

```bash
python ghl/make-test-harness.py
python -m http.server 8123
```

Then open <http://localhost:8123/ghl/_test-harness.html>. The harness wraps both
blocks in GHL-style `overflow: hidden` flex rows so you can confirm the sticky
fallback still fires after editing. `_test-harness.html` is generated —
regenerate it, do not edit it.

## What differs from the main site

These are ports, not the originals, so they are deliberately simplified:

- Copy is **inlined** in each block rather than read from `data/content.js`.
  Editing copy means editing the block.
- The **lens dive is not included.** Two pinned sequences is a lot of custom JS
  to maintain by pasting into a textarea, and the teardown alone carries the
  concept. Add it by copying `teardown-block.html` and swapping `FRAME_BASE`'s
  path segment to `lens`, the counts to 240/120, and the beats array.
- Frames are requested with `crossOrigin="anonymous"` so the canvas stays
  readable, with an automatic retry without it for hosts that send no CORS
  headers. The main site is same-origin and needs neither.
- Everything is prefixed `r5x-` / `r5t-` and scoped under an ID, so no styles
  leak into GHL's own CSS.

Both blocks keep the behaviour that matters: staged loading (poster → coarse
ladder → nearest-playhead backfill), device tiers resolved when loading starts,
`ResizeObserver` for zero-size-at-boot canvases, lazy gating on the turntable,
and a full `prefers-reduced-motion` path.

## A caveat worth knowing

Custom JS in a page builder is not version-controlled. Every edit is a manual
paste into a textarea with no diff and no rollback. Keep these files as the
source of truth, edit them here, and re-paste — otherwise the GHL copy silently
drifts from the repo.
