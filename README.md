# Canon EOS R5 Mark II — scroll-driven funnel

A static, dependency-free sales funnel built around **two** scroll-driven image
sequences. Copy beats are keyed to the frames that prove them, so a claim lands
while the hardware it describes is on screen.

**Independent practice project.** Not affiliated with, endorsed by, or operated
by Canon. Product renders are Canon marketing material used for layout study
only. Checkout, pricing and email capture are non-functional.

## Run it

```bash
python -m http.server 8123
```

Then open <http://localhost:8123>. No build step, no npm install — plain HTML,
CSS and vanilla JS.

## The two sequences

| | Teardown (hero) | Lens dive (mid-page) |
|---|---|---|
| Move | Exploded-view disassembly | Push-in through the optics |
| Argues | **Breadth** — every part is doing a job | **Depth** — here is the heart |
| Ends on | Fully exploded diagram | The bare sensor, filling frame |
| Scroll | 700vh / 620vh mobile | 600vh / 520vh mobile |
| Loading | Eager | **Lazy-gated** |
| Payload | 10.85 MB / 2.58 MB | 6.45 MB / 1.59 MB |

The dive owns the sensor argument, because there the sensor *is* the whole frame.
The teardown deliberately does not repeat it — its equivalent beat covers the
five-axis stabiliser cradle, which is what its frames actually show.

## Layout

```
index.html                 page shell and section mount points
css/style.css              all styling (.seq shared, .seq--lens variant)
js/scrollsequence.js       one factory driving both sequences
js/main.js                 section rendering, reveals, accordions, form
data/content.js            every string: both beat sets, specs, FAQ, offers
tools/build-frames.py      PNG sequences -> WebP tiers
assets/poster-teardown.webp
assets/poster-lens.webp
assets/frames/teardown/{desktop,mobile}/
assets/frames/lens/{desktop,mobile}/
```

All copy lives in `data/content.js` — funnel copy gets rewritten constantly, so
none of it is buried in markup.

## The frame pipeline

Two source sequences, 240 PNGs each at 1280×720, **263 MB combined**, which
cannot ship. The build script emits two WebP tiers per sequence:

| Sequence | Tier | Frames | Size | Per frame |
|---|---|---|---|---|
| teardown | desktop | 240 @ 1280×720 q78 | 10.85 MB | 46 KB |
| teardown | mobile | 120 @ 854×480 q72 | 2.58 MB | 22 KB |
| lens | desktop | 240 @ 1280×720 q78 | 6.45 MB | 28 KB |
| lens | mobile | 120 @ 854×480 q72 | 1.59 MB | 14 KB |

A visitor downloads one tier per sequence, and the lens sequence is gated, so it
costs nothing until they scroll to it.

The lens footage is darker and smoother, so it compresses to roughly 60% of the
teardown's bytes at identical quality. It keeps **all 240 frames** rather than
being decimated: measured frame-to-frame delta peaks at 7.6 (max 11.1) through
frames 61–100, where dropping every second frame steps visibly.

Source PNGs are **not tracked in git** (see `.gitignore`). To regenerate, restore
them and run:

```bash
python tools/build-frames.py
```

`--force` overwrites existing output, `--only lens` builds one sequence.
Requires Pillow.

## How the sequences work

`js/scrollsequence.js` is one factory. Each `<section data-seq="name">` gets an
instance configured from the `SEQUENCES` table (frame dir, counts, which beat set
to read, easing, reduced-motion still, eager vs gated).

Loading is staged, because awaiting several MB means a blank stage:

1. **Poster** paints immediately — the stage is never empty.
2. **Coarse ladder** — every 12th frame (~800 KB). Scroll becomes usable here,
   snapping to the nearest loaded frame. A progress bar covers only this window.
3. **Backfill** — the rest, nearest-the-playhead first, so the stretch being
   looked at sharpens before the far end of the timeline.

Rendering notes:

- Canvas pinned with `position: sticky`; the drawn frame eases toward the scroll
  target rather than snapping, so flicking the wheel glides.
- Contain-fit, centred. The renders sit on near-black and so does the page, so
  letterboxing is invisible and edge-of-frame detail is never cropped.
- On mobile the canvas becomes a band at the top with copy beneath it, rather
  than cropping a 16:9 render into a portrait viewport.
- **Copy placement differs by sequence.** The teardown leaves the left third of
  frame empty, so its copy sits in a column behind a side gradient. The dive is
  radially symmetric and fills the frame, so a column would land on the iris —
  it uses a bottom band behind a bottom-up scrim instead.
- The closing beat of each sequence holds at full opacity instead of fading, so
  its CTA does not blink out at the bottom of the section.
- `prefers-reduced-motion` drops the pin entirely: static frame, all beats in
  normal document flow. A 700vh scroll-jack is hostile otherwise.
- Tier is resolved when loading starts, not at parse time — a stage that is
  below the fold or in an unsettled viewport can report zero width.

`window.__seq.teardown` and `window.__seq.lens` each expose `at()`, `loaded()`,
`seek(p)`, `render(p)` and `load()` for checking the beat/frame mapping from the
console. `render(p)` works even where scroll events are throttled.

## Beat maps

**Teardown** — 6 beats:

| # | Frames | Progress | On screen | Beat |
|---|---|---|---|---|
| 1 | 1–55 | .00–.22 | Assembled | Headline, price anchor, CTA |
| 2 | 55–100 | .22–.41 | Filter peels off | RF mount: 20 mm flange, 12-pin |
| 3 | 100–140 | .41–.58 | Panels ghost out | "Every gram is doing a job" |
| 4 | 140–175 | .58–.72 | Sensor on its cradle | 5-axis stabiliser, 8.5 stops |
| 5 | 175–215 | .72–.89 | Board, EVF, LCD | DIGIC X + Accelerator, Eye Control AF |
| 6 | 215–240 | .89–1.0 | Fully exploded | EVF, screen, sealing, 656 g + CTA |

**Lens dive** — 4 beats:

| # | Frames | Progress | On screen | Beat |
|---|---|---|---|---|
| 1 | 1–48 | .00–.20 | Front-on hero | "Follow the light all the way in" |
| 2 | 48–115 | .20–.48 | Through the glass | 21 elements, 15 groups, 82 mm |
| 3 | 115–182 | .48–.76 | **Nine-blade iris** | Constant f/2.8, rounded blades |
| 4 | 182–240 | .76–1.0 | **Bare sensor** | 8192×5464, 60% less skew + CTA |

## Not wired up

- `[data-buy]` buttons — no cart or checkout endpoint.
- The email form validates client-side and posts nowhere.
- Testimonial slots are explicitly marked `[PLACEHOLDER]` and contain no real
  customer statements. Replace with permissioned quotes before any real use.
