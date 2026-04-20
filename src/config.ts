export const IS_PROD = process.env.NODE_ENV === "production";
export const IS_DEV = !IS_PROD;

export function checkRequiredEnvVars() {
  const requiredEnvVars = ["API_BASE_URL"];
  for (const varName of requiredEnvVars) {
    if (!process.env[varName]) {
      throw new Error(`Environment variable ${varName} is required`);
    }
  }
}

const parsed = parseInt(process.env.IMAGE_CACHE_TTL_SECONDS ?? "900", 10);
if (Number.isNaN(parsed) || parsed <= 0) {
  throw new Error("IMAGE_CACHE_TTL_SECONDS must be a positive integer");
}
export const IMAGE_CACHE_TTL_SECONDS = parsed;
