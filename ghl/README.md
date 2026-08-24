# GoHighLevel paste blocks

Three self-contained blocks that reproduce this funnel's sequences inside a GHL
funnel page. No build step, no dependencies, no `<script src>` — paste and go.

| File | What it is | Weight (desktop/mobile) | Risk in a page builder |
|---|---|---|---|
| `teardown-block.html` | Pinned teardown hero, 6 beats | 10.85 / 2.58 MB, eager | Medium — needs `position: sticky` to survive GHL's containers |
| `lens-block.html` | Pinned dive to the sensor, 4 beats | 6.45 / 1.59 MB, gated | Medium — same sticky caveat |
| `turntable-block.html` | Drag-to-rotate viewer | 4.08 / 0.99 MB, gated | **Low** — nothing is pinned |

Page order they are designed for:

```
teardown hero → your benefits → your "who it's for" → lens dive
  → your R5 comparison → your specs → turntable → your pricing
```

## Assets

All three blocks pull frames from the public repo over jsDelivr's CDN. Verified live:

```
https://cdn.jsdelivr.net/gh/crynxmartinez/funnel3dpractice@main
```

Returns `200`, `content-type: image/webp`, `access-control-allow-origin: *`,
and `cache-control: max-age=604800`. Nothing else to host or upload.

To point somewhere else, change the single `FRAME_BASE` line near the top of
each block's `<script>`. It must be a **public HTTPS origin with no trailing
slash** — the browser fetches these directly, so a private repo returns 404.

> The repo must stay public for this to keep working. If you make it private
> again, all three break and you will need a different host (Cloudflare R2,
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

The builder's live preview usually does not execute JavaScript, so all three
will look like empty boxes in the editor. That is expected. Always test on the
published page.

**Placement matters for two of them:**

- **Turntable** goes in the row directly **above your pricing** — the whole point
  is "look it over yourself" immediately before the ask.
- **Lens dive** goes **after** your "who it's for" content and **before** your
  R5-vs-R5-II comparison. It ends on the sensor and a comparison table's first
  row is the sensor, so it hands off cleanly.

CTAs link to `#offer`, so either give your pricing row that ID or edit the
`href="#offer"` values.

### Do not repeat the sensor claim

The lens block **owns** the 45MP / stacked / rolling-shutter argument, because
there the sensor fills the entire frame. The teardown block's equivalent beat
deliberately covers the five-axis stabiliser instead. If you write your own body
copy, keep it that way — otherwise the page makes the same claim twice, the
second time over weaker imagery.

## The one thing that will bite you

GHL nests every element in flex rows, and those rows often carry
`overflow: hidden`, which **silently kills `position: sticky`** — the hero
would scroll away instead of pinning while the frames play.

Both pinned blocks detect this at runtime. Around 15% through the section they
measure whether the pin is actually holding at the top; if not, they switch to
fixed positioning and log:

```
[r5x] position:sticky is being blocked by an ancestor …   (teardown)
[r5l] position:sticky is being blocked by an ancestor …   (lens dive)
```

The fallback has three states — parked at the section top before, fixed during,
parked at the section **bottom** once past. That third state matters: with only
two, the canvas snaps back to the top edge on exit and vanishes for the rest of
the scroll.

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

Then open <http://localhost:8123/ghl/_test-harness.html>. The harness wraps all
three blocks in GHL-style `overflow: hidden` flex rows so you can confirm the
sticky fallback still fires after editing. Scroll each pinned section all the way
to its end — the canvas must stay visible at the bottom, not disappear.

`_test-harness.html` is generated. Regenerate it; do not edit it.

## What differs from the main site

These are ports, not the originals, so they are deliberately simplified:

- Copy is **inlined** in each block rather than read from `data/content.js`.
  Editing copy means editing the block.
- The lens dive uses a **bottom copy band**, not a side column. That sequence is
  radially symmetric and fills the whole frame, so a column would sit on top of
  the iris. The teardown leaves the left third empty and keeps its column.
- Frames are requested with `crossOrigin="anonymous"` so the canvas stays
  readable, with an automatic retry without it for hosts that send no CORS
  headers. The main site is same-origin and needs neither.
- Everything is prefixed `r5x-` / `r5l-` / `r5t-` and scoped under an ID, so no
  styles leak into GHL's own CSS, or into each other.

All three keep the behaviour that matters: staged loading (poster → coarse ladder
→ nearest-playhead backfill), device tiers resolved when loading starts,
`ResizeObserver` for zero-size-at-boot canvases, lazy gating on the lens dive and
turntable, and a full `prefers-reduced-motion` path.

Only the teardown loads eagerly, because it is the hero. The other two cost
nothing until the reader is about 1.5 screens away.

## A caveat worth knowing

Custom JS in a page builder is not version-controlled. Every edit is a manual
paste into a textarea with no diff and no rollback. Keep these files as the
source of truth, edit them here, and re-paste — otherwise the GHL copy silently
drifts from the repo.
