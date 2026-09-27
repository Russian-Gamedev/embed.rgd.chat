# embed.rgd.chat

## Setup

```bash
bun install
```

## Run

```bash
bun run start:dev
```

## API

### `GET /invite/:code/banner`

Returns a 500×220 WebP image banner for the given Discord invite code. Responses are cached in Redis for 60 seconds.

### `GET /title`

Returns a transparent WebP title in the Russian Gamedev logo style, rendered @2x. Responses are cached in Redis.

Parameters:

- `text` — a title line; repeat the parameter (or separate lines with `\n`) for multiline titles. 1–4 lines, up to 64 characters each, long lines shrink to fit.
- `fill` — hex fill color, single or comma-separated per line (default `#ffffff`)
- `stroke` — hex outline color, single or comma-separated per line (default `#5b647d`)
- `background` — hex color or an https image URL (fetched, centered, cover)
- `blur` — background image blur radius in px, 0–32 (default `4`)
- `overlay` — hex color layer over the background image (requires an image `background`); alpha is supported via `#RGBA`/`#RRGGBBAA` (e.g. `#00000080`)
- `width` / `height` — output image size in px, 16–4096. Defaults keep the title aspect: `1040×164` per line; providing only one of them derives the other.
- `font_size` — per-line font size in design units (80 is the base logo size), 8–400; single value or comma-separated per line. By default each line auto-shrinks to fit the width; an explicit size is used as-is and only shrunk if the text would overflow.
- `margin` — per-line margins in design units, all four directions; semicolon-separated per line, each a 1–4 integer CSS shorthand (`top`, `vertical horizontal`, `top horizontal bottom`, `top right bottom left`), ±500. When present, lines are packed with their margins and the block is centered vertically; by default lines stretch to share the full height evenly.
- `rotate` — per-line extra rotation in degrees on top of the base title tilt, -45–45; single value or comma-separated per line.
- `format=discord` — Discord server title preset (1600×252, transparent); `background` is not allowed in this mode.
  - `level=1` — server logo: centered full-width text
  - `level=2` (default) — rules screen: text left-aligned like the reference, the rest of the canvas stays empty

## Editor

`Bun.serve` also serves a live parameter editor at `/editor`. It wraps every embed: edit parameters, see the preview update as you type, and copy the image itself or its URL. Signed `/supporter` links are signed in the browser — enter `SECRET_KEY` in the sidebar field; it is kept only in the tab's memory and never persisted or sent anywhere except inside the generated URL.
