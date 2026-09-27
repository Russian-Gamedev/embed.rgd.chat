export const SIGN_PARAM = "sign";

export function canonicalQuery(params: URLSearchParams): string {
	const pairs: Array<[string, string]> = [];

	params.forEach((value, key) => {
		if (key !== SIGN_PARAM) {
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
