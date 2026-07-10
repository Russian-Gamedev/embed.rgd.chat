export class HttpError extends Error {
	readonly statusCode: number;

	constructor(statusCode: number, message: string) {
		super(message);
		this.name = "HttpError";
		this.statusCode = statusCode;
	}
}

export function formatRubles(amount: number, currency = "RUB", locale = "ru-RU"): string {
	const formatter = new Intl.NumberFormat(locale, {
		style: "currency",
		currency,
		maximumFractionDigits: 2,
		minimumFractionDigits: 0,
	});
	return formatter.format(amount);
}

export function createLogger(prefix: string, color = Color.white) {
	return (...args: unknown[]) => console.log(`[${color}${prefix}${Color.white}]`, ...args);
}

export const Color = new Proxy({} as Record<string, string>, {
	get(_target, prop: string) {
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
