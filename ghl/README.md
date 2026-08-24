# GoHighLevel paste blocks

The whole funnel as seven self-contained Custom Code blocks. No build step, no
dependencies, no `<script src>` — paste and go. Every block is scoped under its
own ID and prefixed, so nothing leaks into GHL's CSS or into the other blocks.

## Paste order

| # | File | What it is | Notes |
|---|---|---|---|
| 1 | `header-block.html` | Fixed header + sticky mobile CTA | No nav — see below |
| 2 | `teardown-block.html` | Pinned teardown hero, 6 beats | 10.85 / 2.58 MB, eager |
| 3 | `content-a-block.html` | "What it changes" + "Who it's for" | Static |
| 4 | `lens-block.html` | Pinned dive to the sensor, 4 beats | 6.45 / 1.59 MB, gated |
| 5 | `content-b-block.html` | R5 comparison + full spec sheet | Static, zero JS |
| 6 | `turntable-block.html` | Drag-to-rotate viewer | 4.08 / 0.99 MB, gated |
| 7 | `content-c-block.html` | Offer, email capture, FAQ, final CTA, footer | **Two things to wire** |

One row per block, in that order. Each animated block sits where it earns its
keep: the teardown opens, the dive lands the sensor argument immediately before
the comparison table whose first row *is* the sensor, and the turntable sits just
before the price so the last thing before the ask is "look it over yourself."

## There is no nav menu, on purpose

A funnel wants one path through it. Nav links are exits. The header carries the
wordmark, three **non-clickable** trust signals, and exactly one link — to
`#offer`. Across the whole funnel there are six CTAs and all six point there.

If you add a nav, you are adding ways to leave before the price.

## Assets

The three animated blocks pull frames from the public repo over jsDelivr.
Verified live: `200`, `content-type: image/webp`,
`access-control-allow-origin: *`, `cache-control: max-age=604800`.

```
https://cdn.jsdelivr.net/gh/crynxmartinez/funnel3dpractice@main
```

Nothing to upload. To move hosts, change the single `FRAME_BASE` line near the
top of each animated block's `<script>` — a **public HTTPS origin, no trailing
slash**.

> The repo must stay public. Make it private again and all three animated blocks
> 404. Pin a commit SHA instead of `@main` on a live page, otherwise jsDelivr
> picks up whatever you push next:
> `…/gh/crynxmartinez/funnel3dpractice@<commit-sha>`

## Installing

1. Funnel → page → add a **Custom Code / HTML** element per block.
2. Paste one entire file, including its `<style>` and `<script>`.
3. **Row settings: full width, one column, padding 0.** Blocks use `width: 100%`
   and rely on the row not adding padding.
4. Save and **publish**, then test on the published URL.

The builder's live preview usually does not execute JavaScript, so the animated
blocks look like empty boxes in the editor. That is expected — always test
published.

## Two things to wire up in `content-c`

Both are deliberately inert, and both should be replaced with native GHL
elements rather than reimplemented:

- **Buy buttons.** Drop in a GHL product / order-form element and delete the
  `<button data-r5c-buy>` elements, so GHL handles payments, bumps and receipts.
  Or point them at your checkout URL. Leaving them inert on a live page means
  visitors click and nothing happens.
- **Email form.** Validates client-side and posts nowhere. Replace the whole
  `<form>` with a native GHL form so submissions reach a contact record and can
  trigger a workflow. That is the main reason to build this in GHL at all.

Also update or remove the pricing before running traffic — it is Canon US launch
pricing shown for reference.

## Do not repeat the sensor claim

`lens-block` **owns** the 45MP / stacked / rolling-shutter argument, because
there the sensor fills the entire frame. The teardown's equivalent beat
deliberately covers the five-axis stabiliser instead. Keep that split if you
rewrite copy — otherwise the page makes the same claim twice, the second time
over weaker imagery.

## The one thing that will bite you

GHL nests every element in flex rows, and those rows often carry
`overflow: hidden`, which **silently kills `position: sticky`** — a pinned hero
would scroll away instead of holding while the frames play.

Both pinned blocks detect this at runtime, around 15% through the section, and
switch to fixed positioning with a console warning:

```
[r5x] position:sticky is being blocked by an ancestor …   (teardown)
[r5l] position:sticky is being blocked by an ancestor …   (lens dive)
```

The fallback has **three** states — parked at the section top before, fixed
during, parked at the section *bottom* once past. That third state matters: with
only two, the canvas snaps back to the top edge on exit and vanishes for the rest
of the scroll, taking the closing beat and its CTA with it.

Verified in the harness, inside deliberately hostile `overflow: hidden` rows:
sticky fails, the fallback engages, the pin holds at `top: 0` mid-section, and it
stays visible at the very end.

If a hero neither pins nor falls back, an ancestor has a `transform` or `filter`
on it — those break `position: fixed` too. Move it to a row without entry
animations.

## Testing locally before you paste

```bash
python ghl/make-test-harness.py
python -m http.server 8123
```

Open <http://localhost:8123/ghl/_test-harness.html>. It assembles all seven
blocks in real order inside GHL-style `overflow: hidden` flex rows. After editing
anything, check:

- Each pinned section still holds mid-scroll **and** at its very end.
- No horizontal scrollbar at 375px wide.
- The comparison table scrolls inside its own container, not the page.

`_test-harness.html` is generated. Regenerate it; do not edit it.

## What differs from the main site

These are ports, so they are deliberately simplified:

- Copy is **inlined** per block rather than read from `data/content.js`. Editing
  copy means editing the block.
- The static blocks use native `<details>` accordions with a CSS-only plus/cross
  toggle, so keyboard and screen-reader support come free with **zero
  JavaScript**.
- Frames load with `crossOrigin="anonymous"` so the canvas stays readable, with
  an automatic retry without it for hosts that send no CORS headers. The main
  site is same-origin and needs neither.
- Blocks use `width: 100%`, not `100vw`. `100vw` includes the scrollbar while a
  parent's `50%` does not, so the vw trick overhangs by the scrollbar width and
  can scroll the page sideways.
- Copy placement differs between the two pinned blocks: the teardown leaves the
  left third of frame empty so its copy sits in a column; the dive is radially
  symmetric and fills the frame, so its copy sits in a bottom band instead.

The animated blocks keep everything that matters: staged loading (poster → coarse
ladder → nearest-playhead backfill), device tiers resolved when loading starts,
`ResizeObserver` for zero-size-at-boot canvases, lazy gating on the dive and
turntable, and full `prefers-reduced-motion` paths.

Only the teardown loads eagerly, because it is the hero. The other two cost
nothing until the reader is about 1.5 screens away.

## A caveat worth knowing

Custom JS in a page builder is not version-controlled. Every edit is a manual
paste into a textarea with no diff and no rollback. Keep these files as the
source of truth, edit them here, and re-paste — otherwise the GHL copy silently
drifts from the repo.
