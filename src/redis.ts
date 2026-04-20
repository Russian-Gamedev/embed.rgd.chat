import { RedisClient } from "bun";
import { Color, createLogger } from "./utils";

const logger = createLogger("redis", Color.lime);

export const redis = new RedisClient();

let connected = false;

export async function connectRedis() {
  if (connected) {
    throw new Error("connectRedis() called but already connected");
  }
  logger("Connecting to Redis...");
  await redis.connect();
  logger("Connected to Redis!");
  connected = true;
  return redis;
}
