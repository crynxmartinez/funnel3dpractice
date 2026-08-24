#!/usr/bin/env python3
"""Assemble every GHL paste block into one page, in real funnel order.

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
<title>GHL simulation harness — full funnel</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap">
<style>
  body {{ margin:0; background:#07070a; color:#eee;
         font-family:Inter,-apple-system,'Segoe UI',Roboto,sans-serif; }}
  /* Deliberately hostile, exactly like a GHL row: nested flex with
     overflow:hidden, which silently kills position:sticky. */
  .ghl-section {{ display:flex; flex-direction:column; }}
  .ghl-row {{ display:flex; width:100%; overflow:hidden; }}
  .ghl-col {{ display:flex; flex-direction:column; width:100%; }}
</style></head><body id="top">

<div class="ghl-section"><div class="ghl-row"><div class="ghl-col">
{header}
</div></div></div>

<div class="ghl-section"><div class="ghl-row"><div class="ghl-col">
{teardown}
</div></div></div>

<div class="ghl-section"><div class="ghl-row"><div class="ghl-col">
{content_a}
</div></div></div>

<div class="ghl-section"><div class="ghl-row"><div class="ghl-col">
{lens}
</div></div></div>

<div class="ghl-section"><div class="ghl-row"><div class="ghl-col">
{content_b}
</div></div></div>

<div class="ghl-section"><div class="ghl-row"><div class="ghl-col">
{turntable}
</div></div></div>

<div class="ghl-section"><div class="ghl-row"><div class="ghl-col">
{content_c}
</div></div></div>

</body></html>
"""


def main():
    read = lambda n: (HERE / n).read_text(encoding="utf-8")
    OUT.write_text(
        SHELL.format(
            header=read("header-block.html"),
            teardown=read("teardown-block.html"),
            content_a=read("content-a-block.html"),
            lens=read("lens-block.html"),
            content_b=read("content-b-block.html"),
            turntable=read("turntable-block.html"),
            content_c=read("content-c-block.html"),
        ),
        encoding="utf-8",
    )
    print(f"wrote {OUT.relative_to(HERE.parent)}  ({OUT.stat().st_size:,} bytes)")
    print("serve the project root, then open /ghl/_test-harness.html")


if __name__ == "__main__":
    main()
