#!/usr/bin/env python3
"""
Batch-process every image in an input directory so each one:
  - is JPEG or PNG (anything else in -> .png out)
  - is at least MIN_WIDTH x MIN_HEIGHT pixels
  - is under MAX_SIZE_MB
  - NEVER has its aspect ratio changed, and is only ever upscaled
    (never cropped, stretched, or shrunk below its own original size)

All limits are overridable via env vars (used by docker-compose) or CLI flags.
"""

import argparse
import json
import os
import shutil
import subprocess
import sys
from pathlib import Path

IMAGE_EXTENSIONS = {".jpg", ".jpeg", ".png", ".bmp", ".tiff", ".tif", ".webp", ".gif"}


def probe_dimensions(path: Path):
    out = subprocess.run(
        ["ffprobe", "-v", "error", "-select_streams", "v:0",
         "-show_entries", "stream=width,height", "-of", "json", str(path)],
        capture_output=True, text=True, check=True,
    )
    stream = json.loads(out.stdout)["streams"][0]
    return stream["width"], stream["height"]


def output_path_for(src: Path, out_dir: Path) -> Path:
    """JPEG stays JPEG, PNG stays PNG, everything else becomes PNG."""
    ext = src.suffix.lower()
    if ext in (".jpg", ".jpeg"):
        return out_dir / src.name
    return out_dir / (src.stem + ".png")


def encode_args_for(dst: Path, jpeg_quality: int = 2):
    ext = dst.suffix.lower()
    if ext in (".jpg", ".jpeg"):
        # yuvj444p = no chroma subsampling, the main source of JPEG color drift
        return ["-pix_fmt", "yuvj444p", "-q:v", str(jpeg_quality)]
    return ["-compression_level", "9"]  # png: lossless either way, just pack tighter


def run_ffmpeg(src: Path, dst: Path, w: int, h: int, extra_args):
    cmd = ["ffmpeg", "-y", "-i", str(src),
           "-vf", f"scale={w}:{h}:flags=lanczos",
           "-update", "1", *extra_args, str(dst)]
    return subprocess.run(cmd, capture_output=True, text=True)


def process_one(src: Path, out_dir: Path, min_w: int, min_h: int, max_bytes: int):
    try:
        w, h = probe_dimensions(src)
    except Exception as e:
        return False, f"couldn't read image: {e}"

    # Same factor applied to both dimensions => aspect ratio is mathematically
    # unchanged. max(...) guarantees BOTH minimums are met, not just one.
    scale = max(1.0, min_w / w, min_h / h)
    new_w, new_h = round(w * scale), round(h * scale)
    dst = output_path_for(src, out_dir)

    # Already big enough, already the right format, already under the size
    # cap? Copy it byte-for-byte — the only truly zero-change option.
    if scale == 1.0 and dst.name == src.name and src.stat().st_size < max_bytes:
        shutil.copy2(src, dst)
        return True, f"already compliant, copied as-is ({src.stat().st_size/1e6:.1f}MB)"

    result = run_ffmpeg(src, dst, new_w, new_h, encode_args_for(dst))
    if result.returncode != 0:
        return False, (result.stderr.strip().splitlines()[-1] if result.stderr else "ffmpeg error")

    if dst.stat().st_size >= max_bytes:
        # PNG is already lossless/maximally compressed — the only way left
        # to shrink while staying JPEG/PNG is to fall back to JPEG.
        if dst.suffix.lower() == ".png":
            jpg_dst = out_dir / (dst.stem + ".jpg")
            run_ffmpeg(src, jpg_dst, new_w, new_h, encode_args_for(jpg_dst))
            dst.unlink(missing_ok=True)
            dst = jpg_dst
        q = 2
        while dst.stat().st_size >= max_bytes and q < 15:
            q += 4
            run_ffmpeg(src, dst, new_w, new_h, encode_args_for(dst, q))
        if dst.stat().st_size >= max_bytes:
            return False, f"still {dst.stat().st_size/1e6:.1f}MB after max compression"

    return True, f"{w}x{h} -> {new_w}x{new_h} ({dst.stat().st_size/1e6:.1f}MB, {dst.name})"


def main():
    parser = argparse.ArgumentParser(description="Bring images up to a minimum size, no cropping/stretching.")
    parser.add_argument("--input", default=os.environ.get("INPUT_DIR", "/data/input"))
    parser.add_argument("--output", default=os.environ.get("OUTPUT_DIR", "/data/output"))
    parser.add_argument("--min-width", type=int, default=int(os.environ.get("MIN_WIDTH", 1500)))
    parser.add_argument("--min-height", type=int, default=int(os.environ.get("MIN_HEIGHT", 1200)))
    parser.add_argument("--max-size-mb", type=float, default=float(os.environ.get("MAX_SIZE_MB", 50)))
    args = parser.parse_args()

    in_dir = Path(args.input)
    out_dir = Path(args.output)
    if not in_dir.is_dir():
        sys.exit(f"Input directory not found: {in_dir}")
    out_dir.mkdir(parents=True, exist_ok=True)

    images = sorted(p for p in in_dir.iterdir() if p.is_file() and p.suffix.lower() in IMAGE_EXTENSIONS)
    if not images:
        sys.exit(f"No images found in {in_dir}")

    max_bytes = int(args.max_size_mb * 1024 * 1024)
    print(f"{len(images)} image(s) -> min {args.min_width}x{args.min_height}, "
          f"<{args.max_size_mb}MB, JPEG/PNG only, aspect ratio untouched")

    ok, failed = 0, []
    for src in images:
        success, msg = process_one(src, out_dir, args.min_width, args.min_height, max_bytes)
        print(f"  {'done' if success else 'FAILED'}: {src.name} -- {msg}")
        ok += success
        if not success:
            failed.append(src.name)

    print(f"\n{ok} succeeded, {len(failed)} failed.")
    if failed:
        sys.exit(1)


if __name__ == "__main__":
    main()