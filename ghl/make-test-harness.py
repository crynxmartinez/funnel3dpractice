#!/usr/bin/env python3
"""Build a local test page that mimics GoHighLevel's markup around the blocks.

    python ghl/make-test-harness.py
    python -m http.server 8123
    open http://localhost:8123/ghl/_test-harness.html

The harness deliberately wraps each block in nested flex rows with
`overflow: hidden`, which is what GHL does and what silently breaks
`position: sticky`. The teardown block detects that and falls back to fixed
positioning, so this page is the place to confirm the fallback still works
after editing either block.

The output is generated, not tracked — regenerate it rather than editing it.
"""

import pathlib

HERE = pathlib.Path(__file__).resolve().parent
OUT = HERE / "_test-harness.html"

SHELL = """<!DOCTYPE html>
<html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>GHL simulation harness</title>
<style>
  body {{ margin:0; background:#0b0b11; color:#eee;
         font-family:-apple-system,'Segoe UI',Roboto,sans-serif; }}
  /* Deliberately hostile, exactly like a GHL row. */
  .ghl-section {{ display:flex; flex-direction:column; }}
  .ghl-row {{ display:flex; width:100%; overflow:hidden; }}
  .ghl-col {{ display:flex; flex-direction:column; width:100%; }}
  .filler {{ padding:6rem 2rem; max-width:900px; margin:0 auto; line-height:1.7; }}
  code {{ background:#1a1a22; padding:.15em .4em; border-radius:4px; }}
</style></head><body>

<div class="filler">
  <h1>GHL simulation harness</h1>
  <p>Both blocks below sit inside <code>overflow:hidden</code> flex rows, as they
  would in GoHighLevel. The teardown block should log a warning and switch to
  fixed positioning; the pin must still hold at the top of the viewport.</p>
</div>

<div class="ghl-section"><div class="ghl-row"><div class="ghl-col">
{teardown}
</div></div></div>

<div class="filler"><p>Spacer between the two blocks.</p></div>

<div class="ghl-section"><div class="ghl-row"><div class="ghl-col">
{turntable}
</div></div></div>

<div class="filler" id="offer">
  <h2>Offer section</h2>
  <p>The turntable's CTA target. End of harness.</p>
</div>
</body></html>
"""


def main():
    teardown = (HERE / "teardown-block.html").read_text(encoding="utf-8")
    turntable = (HERE / "turntable-block.html").read_text(encoding="utf-8")
    OUT.write_text(
        SHELL.format(teardown=teardown, turntable=turntable), encoding="utf-8"
    )
    print(f"wrote {OUT.relative_to(HERE.parent)}  ({OUT.stat().st_size:,} bytes)")
    print("serve the project root, then open /ghl/_test-harness.html")


if __name__ == "__main__":
    main()
