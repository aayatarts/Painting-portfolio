#!/usr/bin/env bash
# ==============================================================================
# Video enhancer: deshake -> denoise -> frame-rate boost -> upscale -> sharpen
# Reads every video in /input, writes enhanced versions to /output.
# All tunables come from environment variables (set them in .env).
# ==============================================================================
set -uo pipefail

INPUT_DIR="/input"
OUTPUT_DIR="/output"
TMP_DIR="/tmp/vidstab"
mkdir -p "$OUTPUT_DIR" "$TMP_DIR"

# ---------------------------- Tunables (with defaults) -----------------------
TARGET_FPS="${TARGET_FPS:-60}"                       # output frame rate
UPSCALE_FACTOR="${UPSCALE_FACTOR:-2}"                # 2 = double width & height
CRF="${CRF:-18}"                                     # 0=lossless .. 51=worst. 16-20 = visually near-lossless
PRESET="${PRESET:-slow}"                             # ultrafast..veryslow (speed vs compression trade-off)
THREADS="${THREADS:-0}"                              # 0 = let ffmpeg auto-detect cores

DENOISE_LUMA_SPATIAL="${DENOISE_LUMA_SPATIAL:-4}"    # hqdn3d strength - luma spatial
DENOISE_CHROMA_SPATIAL="${DENOISE_CHROMA_SPATIAL:-3}"
DENOISE_LUMA_TMP="${DENOISE_LUMA_TMP:-6}"            # temporal denoise (kills grain flicker across frames)
DENOISE_CHROMA_TMP="${DENOISE_CHROMA_TMP:-4.5}"

SHARPEN_AMOUNT="${SHARPEN_AMOUNT:-0.8}"              # unsharp luma amount, ~0.5-1.5 sane range

DESHAKE_ENABLED="${DESHAKE_ENABLED:-true}"           # true/false
DESHAKE_SHAKINESS="${DESHAKE_SHAKINESS:-5}"          # 1 (steady) .. 10 (very shaky)
DESHAKE_ACCURACY="${DESHAKE_ACCURACY:-15}"           # 1..15, higher = more accurate, slower
DESHAKE_SMOOTHING="${DESHAKE_SMOOTHING:-10}"         # frames used to smooth the camera path
DESHAKE_ZOOM="${DESHAKE_ZOOM:-5}"                    # slight zoom-in to crop stabilization borders

MI_MODE="${MI_MODE:-mci}"                            # dup | blend | mci (mci = real motion-compensated interpolation)
AUDIO_BITRATE="${AUDIO_BITRATE:-192k}"
OUTPUT_SUFFIX="${OUTPUT_SUFFIX:-_enhanced}"

# ---------------------------- Collect input files -----------------------------
shopt -s nullglob nocaseglob
files=("$INPUT_DIR"/*.mp4 "$INPUT_DIR"/*.mov "$INPUT_DIR"/*.m4v)
shopt -u nocaseglob nullglob

if [ ${#files[@]} -eq 0 ]; then
  echo "No .mp4/.mov/.m4v files found in $INPUT_DIR — nothing to do."
  exit 1
fi

echo "Found ${#files[@]} video(s) to process."
echo "Settings: target_fps=$TARGET_FPS upscale=${UPSCALE_FACTOR}x crf=$CRF preset=$PRESET"
echo "Deshake: $DESHAKE_ENABLED (shakiness=$DESHAKE_SHAKINESS accuracy=$DESHAKE_ACCURACY smoothing=$DESHAKE_SMOOTHING zoom=$DESHAKE_ZOOM)"
echo "-----------------------------------------------------------------------"

for input_file in "${files[@]}"; do
  filename="$(basename "$input_file")"
  name="${filename%.*}"
  output_file="$OUTPUT_DIR/${name}${OUTPUT_SUFFIX}.mp4"
  transforms_file="$TMP_DIR/${name}.trf"

  echo ""
  echo "=== $filename ==="
  src_info=$(ffprobe -v error -select_streams v:0 -show_entries stream=width,height,r_frame_rate -of csv=p=0 "$input_file" 2>/dev/null)
  echo "  Source (w,h,fps): ${src_info:-unknown}"

  # Base chain: denoise -> frame interpolation -> upscale (even dims) -> sharpen
  base_filters="hqdn3d=${DENOISE_LUMA_SPATIAL}:${DENOISE_CHROMA_SPATIAL}:${DENOISE_LUMA_TMP}:${DENOISE_CHROMA_TMP}"
  base_filters="${base_filters},minterpolate=fps=${TARGET_FPS}:mi_mode=${MI_MODE}:mc_mode=aobmc:vsbmc=1"
  base_filters="${base_filters},scale=trunc(iw*${UPSCALE_FACTOR}/2)*2:trunc(ih*${UPSCALE_FACTOR}/2)*2:flags=lanczos"
  base_filters="${base_filters},unsharp=5:5:${SHARPEN_AMOUNT}:5:5:0.0"

  if [ "$DESHAKE_ENABLED" = "true" ]; then
    echo "  [1/2] Analyzing camera shake..."
    ffmpeg -y -hide_banner -loglevel error -i "$input_file" \
      -vf "vidstabdetect=shakiness=${DESHAKE_SHAKINESS}:accuracy=${DESHAKE_ACCURACY}:result=${transforms_file}" \
      -f null -

    if [ $? -ne 0 ] || [ ! -f "$transforms_file" ]; then
      echo "  ✗ Shake analysis failed for $filename — skipping this file."
      continue
    fi

    echo "  [2/2] Stabilizing + denoising + interpolating + upscaling + sharpening..."
    full_filters="vidstabtransform=input=${transforms_file}:zoom=${DESHAKE_ZOOM}:smoothing=${DESHAKE_SMOOTHING},${base_filters}"
  else
    echo "  Deshake disabled — denoising + interpolating + upscaling + sharpening..."
    full_filters="${base_filters}"
  fi

  ffmpeg -y -hide_banner -loglevel warning -stats -threads "$THREADS" -i "$input_file" \
    -vf "$full_filters" \
    -c:v libx264 -preset "$PRESET" -crf "$CRF" -pix_fmt yuv420p \
    -c:a aac -b:a "$AUDIO_BITRATE" \
    -movflags +faststart \
    "$output_file"

  if [ $? -eq 0 ]; then
    out_info=$(ffprobe -v error -select_streams v:0 -show_entries stream=width,height,r_frame_rate -of csv=p=0 "$output_file" 2>/dev/null)
    echo "  ✓ Done -> $output_file"
    echo "  Output (w,h,fps): ${out_info:-unknown}"
  else
    echo "  ✗ Encoding failed for $filename"
  fi
done

echo ""
echo "-----------------------------------------------------------------------"
echo "All videos processed. Check $OUTPUT_DIR"
