#!/usr/bin/env python3
"""Mirror the generated WebP tiers into a Cloudflare R2 bucket.

R2 speaks the S3 API, so this uses boto3. Keys mirror the repo layout exactly,
which is what lets the GHL blocks change only their FRAME_BASE line:

    assets/frames/<sequence>/<tier>/fNNN.webp
    assets/poster-<sequence>.webp

Set these first (R2 → Manage API tokens → Create for the bucket):

    export R2_ACCOUNT_ID=...
    export R2_ACCESS_KEY_ID=...
    export R2_SECRET_ACCESS_KEY=...
    export R2_BUCKET=r5-frames

Then:

    pip install boto3
    python protect/upload-to-r2.py            # upload anything missing
    python protect/upload-to-r2.py --force    # re-upload everything
    python protect/upload-to-r2.py --check    # list what would upload

Roughly 21 MB across 723 objects. R2 has no egress charge, and the Worker in
front of it caches at the edge, so steady-state cost is close to nothing.
"""

import os
import sys
import pathlib

try:
    import boto3
    from botocore.config import Config
    from botocore.exceptions import ClientError
except ImportError:
    sys.exit("boto3 is required:  pip install boto3")

ROOT = pathlib.Path(__file__).resolve().parent.parent
ASSETS = ROOT / "assets"

FORCE = "--force" in sys.argv
CHECK_ONLY = "--check" in sys.argv


def env(name):
    v = os.environ.get(name)
    if not v:
        sys.exit(f"{name} is not set — see the docstring at the top of this file.")
    return v


def client():
    return boto3.client(
        "s3",
        endpoint_url=f"https://{env('R2_ACCOUNT_ID')}.r2.cloudflarestorage.com",
        aws_access_key_id=env("R2_ACCESS_KEY_ID"),
        aws_secret_access_key=env("R2_SECRET_ACCESS_KEY"),
        region_name="auto",
        config=Config(signature_version="s3v4", retries={"max_attempts": 5}),
    )


def local_objects():
    """Every file the Worker is willing to serve, as (key, path) pairs."""
    out = []
    for seq in ("teardown", "lens", "rotate"):
        poster = ASSETS / f"poster-{seq}.webp"
        if poster.exists():
            out.append((f"assets/poster-{seq}.webp", poster))
        for tier in ("desktop", "mobile"):
            d = ASSETS / "frames" / seq / tier
            if not d.is_dir():
                continue
            for f in sorted(d.glob("f*.webp")):
                out.append((f"assets/frames/{seq}/{tier}/{f.name}", f))
    return out


def main():
    items = local_objects()
    if not items:
        sys.exit(f"No WebP tiers found under {ASSETS}. Run tools/build-frames.py first.")

    total_bytes = sum(p.stat().st_size for _, p in items)
    print(f"{len(items)} objects, {total_bytes / 1048576:.1f} MB local\n")

    if CHECK_ONLY:
        for key, p in items[:5]:
            print(f"  would upload {key}  ({p.stat().st_size / 1024:.0f} KB)")
        print(f"  … and {max(0, len(items) - 5)} more")
        return

    s3 = client()
    bucket = env("R2_BUCKET")

    existing = set()
    if not FORCE:
        token = None
        while True:
            kw = {"Bucket": bucket, "MaxKeys": 1000}
            if token:
                kw["ContinuationToken"] = token
            resp = s3.list_objects_v2(**kw)
            for o in resp.get("Contents", []):
                existing.add(o["Key"])
            if not resp.get("IsTruncated"):
                break
            token = resp.get("NextContinuationToken")
        print(f"{len(existing)} objects already in {bucket}")

    uploaded = skipped = 0
    for key, path in items:
        if key in existing and not FORCE:
            skipped += 1
            continue
        try:
            s3.upload_file(
                str(path), bucket, key,
                ExtraArgs={
                    "ContentType": "image/webp",
                    # The Worker sets its own Cache-Control, but this is a
                    # sensible default if the bucket is ever read directly.
                    "CacheControl": "public, max-age=31536000, immutable",
                },
            )
        except ClientError as e:
            sys.exit(f"upload failed for {key}: {e}")
        uploaded += 1
        if uploaded % 100 == 0:
            print(f"  {uploaded} uploaded...")

    print(f"\nuploaded {uploaded}, skipped {skipped} already present")
    print("Now deploy the Worker:  npx wrangler deploy")


if __name__ == "__main__":
    main()
