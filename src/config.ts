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
