# Stage 1: Build
FROM oven/bun:1-alpine AS builder

WORKDIR /app

COPY package.json bun.lock ./
RUN bun install --frozen-lockfile

COPY . .
RUN bun build.ts

# Stage 2: Production
FROM alpine:3 AS production

RUN apk add --no-cache libc6-compat libstdc++ curl

WORKDIR /app

COPY --from=builder /app/dist ./dist
COPY --from=builder /app/assets ./assets
COPY --from=builder /app/node_modules/@takumi-rs /app/node_modules/@takumi-rs

EXPOSE 3000

CMD ["./dist/app"]
