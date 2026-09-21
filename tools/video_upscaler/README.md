# Video Enhancer (Docker + ffmpeg)

Denoises, stabilizes, boosts frame rate, and upscales `.mp4` / `.mov` / `.m4v`
files — built for cleaning up WhatsApp-compressed video.

## Pipeline

For each video: **stabilize (2-pass) → denoise → frame interpolation → lanczos
upscale → sharpen → re-encode (H.264 + AAC)**.

## Usage

1. Drop your source videos into `input/`.
2. Adjust settings in `.env` if you want (defaults are sane for grainy, shaky
   phone footage — see comments in the file for what each one does).
3. Run:
   ```bash
   docker compose up --build
   ```
4. Enhanced videos land in `output/`, named `<original>_enhanced.mp4`.

Re-run any time after changing `.env` — no rebuild needed unless you edit
`Dockerfile` or `enhance.sh`, in which case use `--build` again (as above).

## Notes

- **This is traditional (non-AI) upscaling.** Lanczos scaling + sharpening
  makes footage look cleaner and less blocky, but it cannot invent detail that
  isn't in the source — it won't match true AI super-resolution (e.g.
  Real-ESRGAN, Topaz Video AI). If you want to go further after this, those
  tools can be layered on top of this same Docker pattern.
- If a specific clip isn't shaky, set `DESHAKE_ENABLED=false` in `.env` to
  skip that (slow) analysis pass and speed things up.
- If your source is already at or above your `TARGET_FPS`, leave `TARGET_FPS`
  at your source's frame rate or raise `UPSCALE_FACTOR` instead — interpolating
  down from a higher fps just wastes compute.
- Processing time scales heavily with `PRESET` (slow/veryslow), `MI_MODE=mci`,
  and `DESHAKE_ACCURACY`. Drop these for faster (lower-quality) runs while
  testing settings, then bump them back up for your final pass.
