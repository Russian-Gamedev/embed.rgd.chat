# embed.rgd.chat

## Setup

```bash
bun install
```

## Run

```bash
bun run start:dev
```

## Environment

| Variable | Required | Description |
| --- | --- | --- |
| `API_BASE_URL` | yes | rgd API base, e.g. `https://bot.rgd.chat` |
| `SECRET_KEY` | yes | HMAC key for signed `/supporter` URLs |
| `IMAGE_CACHE_TTL_SECONDS` | no (default `900`) | How long a rendered image stays fresh; older objects are re-rendered in the background |
| `S3_BUCKET` | production | Bucket for rendered images |
| `S3_ACCESS_KEY_ID` / `S3_SECRET_ACCESS_KEY` | production | S3 credentials (read natively by `Bun.S3Client`) |
| `S3_REGION` / `S3_ENDPOINT` | no | For S3-compatible providers |
| `S3_PUBLIC_URL` | production | Public base URL of the bucket/CDN, e.g. `https://cdn.rgd.chat/embed` |
| `S3_PREFIX` | no (default `embed`) | Base folder inside the bucket; all rendered images are stored under it |

In development (`NODE_ENV` ≠ `production`) the S3 cache is bypassed and images are rendered directly.

## API

Render routes don't serve image bytes themselves: they return a `302` redirect to a WebP object in S3 (`{S3_PUBLIC_URL}/{S3_PREFIX}/{route}/{sha256}.webp`). An object older than its route's freshness window is re-rendered in the background while the current one keeps being served (stale-while-revalidate): `invite` 1 hour, `user` 5 minutes, `supporter` 1 day, `title` `IMAGE_CACHE_TTL_SECONDS` (default 900). CDN caching of the objects is configured on the bucket/CDN side.

### `GET /invite/:code/banner`

Returns a 500×220 WebP image banner for the given Discord invite code.

### `GET /title`

Returns a transparent WebP title in the Russian Gamedev logo style, rendered @2x.

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
