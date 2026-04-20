export function createLogger(prefix: string, color = Color.white) {
  return (...args: unknown[]) =>
    console.log(`[${color}${prefix}${Color.white}]`, ...args);
}

export const Color = new Proxy({} as Record<string, string>, {
  get(target, prop: string) {
    return Bun.color(prop, "ansi-16m");
  },
});

export class JsonResponse extends Response {
  constructor(data: unknown, options?: ResponseInit) {
    super(JSON.stringify(data), {
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...(options?.headers || {}),
      },
    });
  }
}
