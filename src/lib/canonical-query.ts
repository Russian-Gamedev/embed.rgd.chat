export const SIGN_PARAM = "sign";
export const EXP_PARAM = "exp";

const DEFAULT_EXCLUDED_PARAMS: ReadonlySet<string> = new Set([SIGN_PARAM]);

export function canonicalQuery(
	params: URLSearchParams,
	excludedParams: ReadonlySet<string> = DEFAULT_EXCLUDED_PARAMS,
): string {
	const pairs: Array<[string, string]> = [];

	params.forEach((value, key) => {
		if (!excludedParams.has(key)) {
			pairs.push([key, value]);
		}
	});

	pairs.sort(([ak, av], [bk, bv]) => {
		if (ak === bk) {
			return av.localeCompare(bv);
		}
		return ak.localeCompare(bk);
	});

	return pairs
		.map(([key, value]) => {
			return `${encodeURIComponent(key)}=${encodeURIComponent(value)}`;
		})
		.join("&");
}
