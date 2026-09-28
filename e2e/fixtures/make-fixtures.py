#!/usr/bin/env python3
"""Generates the binary fixtures used by the Playwright suite (stdlib only).

  keyframe.png / keyframe.jpg  640x360  gradient sky, perspective grid and a bright disc
                                        (camera-motion source; motion is obvious on it)
  portrait.png / portrait.jpg  512x640  face-like layout: skin-toned oval centred, dark
                                        "mouth" ellipse at ~63% height (lipsync renderer)
  packshot.png                 512x512  rounded-rectangle "bottle" on a transparent background
  speech.wav                   3 s, 16 kHz mono; 0.25 s 440 Hz bursts alternating with silence

JPEG variants are produced with macOS `sips` when it is available. Without it the PNGs are
kept and `e2e/helpers.ts` falls back to them (with the matching content type) automatically.

Run:  python3 e2e/fixtures/make-fixtures.py
"""
from __future__ import annotations

import math
import shutil
import struct
import subprocess
import wave
import zlib
from pathlib import Path
from typing import Callable, Sequence, Tuple

HERE = Path(__file__).resolve().parent

Color = Tuple[int, ...]


def clamp(value: float) -> int:
    return 0 if value < 0 else 255 if value > 255 else int(value)


def mix(a: Sequence[float], b: Sequence[float], t: float) -> Color:
    return tuple(clamp(a[i] + (b[i] - a[i]) * t) for i in range(len(a)))


# ---- PNG writer (RGB or RGBA, no filtering) ---------------------------------------------


def png_chunk(tag: bytes, data: bytes) -> bytes:
    body = tag + data
    return struct.pack(">I", len(data)) + body + struct.pack(">I", zlib.crc32(body) & 0xFFFFFFFF)


def write_png(path: Path, width: int, height: int, pixel: Callable[[int, int], Color], alpha: bool = False) -> None:
    channels = 4 if alpha else 3
    raw = bytearray()
    for y in range(height):
        raw.append(0)  # filter type 0 (none)
        row = bytearray()
        for x in range(width):
            row.extend(pixel(x, y))
        raw.extend(row)
    ihdr = struct.pack(">IIBBBBB", width, height, 8, 6 if alpha else 2, 0, 0, 0)
    payload = b"\x89PNG\r\n\x1a\n"
    payload += png_chunk(b"IHDR", ihdr)
    payload += png_chunk(b"IDAT", zlib.compress(bytes(raw), 9))
    payload += png_chunk(b"IEND", b"")
    path.write_bytes(payload)


# ---- shape helpers -------------------------------------------------------------------------


def in_ellipse(x: float, y: float, cx: float, cy: float, rx: float, ry: float) -> bool:
    dx = (x - cx) / rx
    dy = (y - cy) / ry
    return dx * dx + dy * dy <= 1.0


def ellipse_coverage(x: float, y: float, cx: float, cy: float, rx: float, ry: float, feather: float = 1.5) -> float:
    """1 inside, 0 outside, with a soft edge roughly `feather` pixels wide."""
    dx = (x - cx) / rx
    dy = (y - cy) / ry
    edge = (math.sqrt(dx * dx + dy * dy) - 1.0) * (rx + ry) / 2
    if edge <= -feather:
        return 1.0
    if edge >= feather:
        return 0.0
    return 0.5 - edge / (2 * feather)


def in_rounded_rect(x: float, y: float, x0: float, y0: float, x1: float, y1: float, r: float) -> bool:
    if x < x0 or x > x1 or y < y0 or y > y1:
        return False
    cx = x0 + r if x < x0 + r else (x1 - r if x > x1 - r else None)
    cy = y0 + r if y < y0 + r else (y1 - r if y > y1 - r else None)
    if cx is None or cy is None:
        return True
    return (x - cx) ** 2 + (y - cy) ** 2 <= r * r


# ---- fixtures ------------------------------------------------------------------------------


def keyframe_pixel(x: int, y: int, w: int = 640, h: int = 360) -> Color:
    u = x / (w - 1)
    v = y / (h - 1)
    # Sky: teal-to-magenta sweep that darkens towards the horizon.
    r = 30 + 200 * u * (1 - 0.35 * v)
    g = 90 + 100 * (1 - u) * (1 - 0.7 * v)
    b = 150 + 90 * (1 - v) - 60 * u * v
    color: Sequence[float] = (r, g, b)
    horizon = 0.66 * h
    if y > horizon:
        # Ground: dark, with a grid so pans/zooms/dollies are visible in the rendered clip.
        color = (r * 0.35, g * 0.35, b * 0.45)
        if x % 64 < 2 or (y - horizon) % 40 < 2:
            color = (color[0] + 70, color[1] + 70, color[2] + 80)
    elif abs(y - horizon) < 2:
        color = (240, 230, 210)
    # Bright disc with a warm halo.
    halo = ellipse_coverage(x, y, 0.62 * w, 0.40 * h, 110, 110, feather=40)
    color = mix(color, (255, 214, 120), halo * 0.35)
    disc = ellipse_coverage(x, y, 0.62 * w, 0.40 * h, 58, 58, feather=2)
    color = mix(color, (255, 250, 225), disc)
    # Dark marker disc bottom-left for contrast.
    mark = ellipse_coverage(x, y, 0.22 * w, 0.78 * h, 34, 34, feather=2)
    return mix(color, (12, 14, 30), mark)


def portrait_pixel(x: int, y: int, w: int = 512, h: int = 640) -> Color:
    cx = w / 2
    color: Color = mix((62, 66, 84), (22, 24, 32), y / (h - 1))  # backdrop
    if in_ellipse(x, y, cx, h + 40, 300, 210):  # shoulders
        color = (52, 60, 82)
    if 214 <= x <= 298 and 430 <= y <= 560:  # neck
        color = (196, 150, 118)
    if in_ellipse(x, y, cx, 250, 170, 205):  # hair
        color = (38, 26, 22)
    if in_ellipse(x, y, cx, 300, 150, 195):  # face
        shade = 1 - 0.18 * abs(x - cx) / 150
        color = (clamp(228 * shade), clamp(180 * shade), clamp(142 * shade))
        for ex in (cx - 55, cx + 55):
            if in_ellipse(x, y, ex, 0.41 * h, 32, 5):  # brow
                color = (44, 30, 26)
            if in_ellipse(x, y, ex, 0.45 * h, 26, 14):  # sclera
                color = (245, 243, 240)
            if in_ellipse(x, y, ex, 0.45 * h, 12, 12):  # iris
                color = (48, 36, 34)
        if in_ellipse(x, y, cx + 6, 0.55 * h, 9, 22):  # nose shadow
            color = (198, 150, 118)
        # Mouth: dark ellipse at ~63% height, where the lipsync renderer expects it.
        if in_ellipse(x, y, cx, 0.63 * h, 46, 15):
            color = (128, 44, 56)
        if in_ellipse(x, y, cx, 0.63 * h - 4, 40, 5):
            color = (170, 78, 88)
    return color


def packshot_pixel(x: int, y: int, w: int = 512, h: int = 512) -> Color:
    color: Color = (0, 0, 0, 0)
    shadow = ellipse_coverage(x, y, w / 2, 468, 150, 16, feather=10)
    if shadow > 0:
        color = (0, 0, 0, clamp(110 * shadow))
    if in_rounded_rect(x, y, 212, 52, 300, 104, 14):  # cap
        color = (44, 44, 52, 255)
    if 226 <= x <= 286 and 96 <= y <= 168:  # neck
        color = (34, 112, 124, 255)
    if in_rounded_rect(x, y, 166, 150, 346, 470, 44):  # body
        t = (x - 166) / 180
        base = mix((22, 96, 108), (40, 132, 146), 1 - abs(t - 0.35) * 1.4)
        color = (*base, 255)
        if 190 <= x <= 212:  # highlight stripe
            color = (96, 178, 190, 255)
        if in_rounded_rect(x, y, 196, 250, 316, 384, 10):  # label
            color = (242, 238, 228, 255)
            if 216 <= x <= 296 and 286 <= y <= 296:
                color = (58, 58, 64, 255)
            if 216 <= x <= 276 and 314 <= y <= 322:
                color = (58, 58, 64, 255)
            if 216 <= x <= 296 and 344 <= y <= 350:
                color = (34, 112, 124, 255)
    return color


def write_speech_wav(path: Path, seconds: float = 3.0, rate: int = 16_000, burst: float = 0.25, freq: float = 440.0) -> None:
    total = int(seconds * rate)
    burst_len = int(burst * rate)
    fade = int(0.01 * rate)
    samples = []
    for i in range(total):
        slot, pos = divmod(i, burst_len)
        if slot % 2 == 1:  # silence between bursts
            samples.append(0)
            continue
        envelope = 1.0
        if pos < fade:
            envelope = pos / fade
        elif pos > burst_len - fade:
            envelope = (burst_len - pos) / fade
        tone = 0.55 * math.sin(2 * math.pi * freq * i / rate) + 0.2 * math.sin(4 * math.pi * freq * i / rate)
        samples.append(int(envelope * tone * 32767 * 0.8))
    with wave.open(str(path), "wb") as wav:
        wav.setnchannels(1)
        wav.setsampwidth(2)
        wav.setframerate(rate)
        wav.writeframes(struct.pack("<%dh" % total, *samples))


def to_jpeg(png: Path, jpg: Path) -> bool:
    sips = shutil.which("sips")
    if not sips:
        return False
    result = subprocess.run(
        [sips, "-s", "format", "jpeg", "-s", "formatOptions", "90", str(png), "--out", str(jpg)],
        capture_output=True,
        text=True,
    )
    return result.returncode == 0 and jpg.exists() and jpg.stat().st_size > 1024


def report(path: Path) -> None:
    print(f"  {path.name:14s} {path.stat().st_size:>8,d} bytes")


def main() -> None:
    print(f"Writing fixtures to {HERE}")
    keyframe = HERE / "keyframe.png"
    portrait = HERE / "portrait.png"
    packshot = HERE / "packshot.png"
    speech = HERE / "speech.wav"

    write_png(keyframe, 640, 360, keyframe_pixel)
    write_png(portrait, 512, 640, portrait_pixel)
    write_png(packshot, 512, 512, packshot_pixel, alpha=True)
    write_speech_wav(speech)
    for path in (keyframe, portrait, packshot, speech):
        report(path)

    for png in (keyframe, portrait):
        jpg = png.with_suffix(".jpg")
        if to_jpeg(png, jpg):
            report(jpg)
        else:
            print(f"  {jpg.name}: `sips` unavailable, keeping {png.name} (helpers fall back to image/png)")


if __name__ == "__main__":
    main()
