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
