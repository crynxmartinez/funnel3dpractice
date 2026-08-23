# Canon EOS R5 Mark II — scroll-driven teardown funnel

A static, dependency-free sales funnel built around a 240-frame exploded-view
teardown that plays as you scroll. Each copy beat is keyed to the frame that
proves it — the claim about the 45MP stacked sensor appears while the bare
sensor is on screen.

**Independent practice project.** Not affiliated with, endorsed by, or operated
by Canon. Product renders are Canon marketing material used for layout study
only. Checkout, pricing and email capture are non-functional.

## Run it

```bash
python -m http.server 8123
```

Then open <http://localhost:8123>. No build step, no npm install — plain HTML,
CSS and vanilla JS.

## Layout

```
index.html              page shell and section mount points
css/style.css           all styling
js/teardown.js          canvas renderer + staged frame loader
js/main.js              section rendering, reveals, accordions, form
data/content.js         every string: copy, specs, comparison, FAQ, offers
tools/build-frames.py   PNG sequence -> WebP tiers
assets/frames/desktop/  240 frames, 1280x720  (~10.8 MB)
assets/frames/mobile/   120 frames, 854x480   (~2.6 MB)
assets/poster.webp      first frame, painted instantly
```

All copy lives in `data/content.js` — funnel copy gets rewritten constantly, so
none of it is buried in markup.

## The frame pipeline

The source sequence is 240 PNGs at 1280×720, **139 MB**, which cannot ship. The
build script converts it to two WebP tiers:

| Tier | Frames | Size | Quality | Payload |
|---|---|---|---|---|
| desktop | 240 | 1280×720 | q78 | ~10.8 MB |
| mobile | 120 (every 2nd) | 854×480 | q72 | ~2.6 MB |

A visitor downloads one tier, not both.

The source PNGs are **not tracked in git** (see `.gitignore`). To regenerate,
restore them to `Canon EOS R5 Mark II/` and run:

```bash
python tools/build-frames.py
```

Pass `--force` to overwrite existing output. Requires Pillow.

## How the hero works

Loading is staged, because awaiting ~11 MB up front means a blank hero:

1. **Poster** paints immediately — the hero is never empty.
2. **Coarse ladder** — every 12th frame (~800 KB). Scroll becomes usable here,
   snapping to the nearest loaded frame. A progress bar covers only this window.
3. **Backfill** — the rest, fetched nearest-the-playhead first, so the stretch
   you are looking at sharpens before the far end of the timeline.

Rendering notes:

- A `<canvas>` pinned with `position: sticky` inside a 700vh scroll container
  (620vh on mobile) — roughly 34 frames per viewport height.
- The drawn frame eases toward the scroll target rather than snapping, so
  flicking the wheel glides.
- Contain-fit, centred. The renders sit on near-black and so does the page, so
  letterboxing is invisible and the outer exploded parts are never cropped.
- On mobile the canvas becomes a band at the top with copy beneath it, rather
  than cropping a 16:9 render into a portrait viewport.
- `prefers-reduced-motion` drops the pin entirely: static exploded frame, all
  six beats in normal document flow. A 700vh scroll-jack is hostile otherwise.
- Tier is chosen once at load; reload after crossing the 768px breakpoint.

`window.__teardown` exposes `at()`, `loaded()`, `seek(p)` and `render(p)` for
checking the beat/frame mapping from the console.

## Beat map

| # | Frames | Progress | On screen | Beat |
|---|---|---|---|---|
| 1 | 1–55 | .00–.22 | Assembled | Headline, price anchor, CTA |
| 2 | 55–100 | .22–.41 | Filter peels off | RF mount, 8.5-stop IBIS |
| 3 | 100–140 | .41–.58 | Panels ghost out | "Look closer" |
| 4 | 140–175 | .58–.72 | **Bare sensor** | 45MP stacked BSI, ~60% less skew |
| 5 | 175–215 | .72–.89 | Board, EVF, LCD | DIGIC X + Accelerator, Eye Control AF |
| 6 | 215–240 | .89–1.0 | Fully exploded | EVF, screen, sealing, 656 g + CTA |

## Not wired up

- `[data-buy]` buttons — no cart or checkout endpoint.
- The email form validates client-side and posts nowhere.
- Testimonial slots are explicitly marked `[PLACEHOLDER]` and contain no real
  customer statements. Replace with permissioned quotes before any real use.
