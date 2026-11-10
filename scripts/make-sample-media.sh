#!/usr/bin/env bash
# 生成种子数据用的示例视频（纯 ffmpeg 合成，不涉及任何第三方素材）
# 产物：storage/media/seed-0X/clip-720.mp4、clip-480.mp4、cover.jpg
set -euo pipefail

ROOT="${MEDIA_ROOT:-./storage/media}"
mkdir -p "$ROOT"

if ! command -v ffmpeg >/dev/null 2>&1; then
  echo "未检测到 ffmpeg，跳过示例视频生成（页面会显示无封面占位）"
  exit 0
fi

gen() {
  local id=$1 c0=$2 c1=$3 c2=$4 freq=$5 dur=$6 speed=$7
  local out="$ROOT/$id"
  mkdir -p "$out"
  if [ -f "$out/clip-720.mp4" ] && [ -f "$out/cover.jpg" ]; then
    echo "跳过 $id（已存在）"
    return 0
  fi

  ffmpeg -hide_banner -loglevel error -y \
    -f lavfi -i "gradients=size=1280x720:duration=$dur:speed=$speed:c0=$c0:c1=$c1:c2=$c2:nb_colors=3" \
    -f lavfi -i "sine=frequency=$freq:duration=$dur" \
    -vf format=yuv420p -c:v libx264 -preset veryfast -crf 28 \
    -c:a aac -b:a 96k -movflags +faststart -shortest "$out/clip-720.mp4"

  ffmpeg -hide_banner -loglevel error -y -i "$out/clip-720.mp4" \
    -vf "scale=-2:480" -c:v libx264 -preset veryfast -crf 30 \
    -c:a aac -b:a 64k -movflags +faststart "$out/clip-480.mp4"

  ffmpeg -hide_banner -loglevel error -y -ss 2 -i "$out/clip-720.mp4" \
    -frames:v 1 -vf "scale=640:-2" -q:v 3 "$out/cover.jpg"

  echo "已生成 $id"
}

gen seed-01 0x0e1a1f 0x2f6f6b 0xd9a05b 320 14 0.06
gen seed-02 0x1a1220 0x7a4d8f 0xd9c05b 440 11 0.09
gen seed-03 0x101820 0x3f5f9f 0x9fd8d0 523 16 0.05
gen seed-04 0x201410 0xa85a3c 0xf0d8b0 294 9 0.12
gen seed-05 0x0f1a12 0x4f8f5f 0xe0d090 349 13 0.07
gen seed-06 0x181018 0x8f4f7f 0xf0c0d0 392 10 0.1

echo "示例媒体已就绪：$ROOT"
