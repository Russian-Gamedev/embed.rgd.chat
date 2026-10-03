export const IS_PROD = process.env.NODE_ENV === "production";
export const IS_DEV = !IS_PROD;

const REQUIRED_ENV_VARS = ["API_BASE_URL", "SECRET_KEY"];

const PROD_REQUIRED_ENV_VARS = [
	"S3_BUCKET",
	"S3_ACCESS_KEY_ID",
	"S3_SECRET_ACCESS_KEY",
	"S3_PUBLIC_URL",
];

export function checkRequiredEnvVars() {
	const requiredEnvVars = [...REQUIRED_ENV_VARS, ...(IS_PROD ? PROD_REQUIRED_ENV_VARS : [])];
	for (const varName of requiredEnvVars) {
		if (!process.env[varName]) {
			throw new Error(`Environment variable ${varName} is required`);
		}
	}
}

export const SECRET_KEY = process.env.SECRET_KEY as string;

const parsed = parseInt(process.env.IMAGE_CACHE_TTL_SECONDS ?? "900", 10);
if (Number.isNaN(parsed) || parsed <= 0) {
	throw new Error("IMAGE_CACHE_TTL_SECONDS must be a positive integer");
}
export const IMAGE_CACHE_TTL_SECONDS = parsed;

/** Freshness windows per route prefix, overriding the default IMAGE_CACHE_TTL_SECONDS. */
export const ROUTE_CACHE_TTL_SECONDS = {
	invite: 60 * 60, // guild invite banner: up to an hour
	user: 5 * 60, // user card: up to 5 minutes
	supporter: 24 * 60 * 60, // supporter card: up to a day
} as const;

const rawPublicUrl = process.env.S3_PUBLIC_URL ?? "";
export const S3_PUBLIC_URL = rawPublicUrl.endsWith("/") ? rawPublicUrl.slice(0, -1) : rawPublicUrl;
