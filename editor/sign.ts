/// <reference lib="dom" />
import { canonicalQuery } from "../src/lib/canonical-query";

// The secret lives only in this module variable: never persisted, never logged.
let secret = "";

export function setSecret(value: string): void {
	secret = value;
}

export function hasSecret(): boolean {
	return secret.length > 0;
}

function toBase64Url(bytes: ArrayBuffer): string {
	let binary = "";
	for (const byte of new Uint8Array(bytes)) {
		binary += String.fromCharCode(byte);
	}
	return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export async function signedPath(path: string): Promise<string> {
	const url = new URL(path, "http://editor.local");
	const key = await crypto.subtle.importKey(
		"raw",
		new TextEncoder().encode(secret),
		{ name: "HMAC", hash: "SHA-256" },
		false,
		["sign"],
	);
	const mac = await crypto.subtle.sign(
		"HMAC",
		key,
		new TextEncoder().encode(canonicalQuery(url.searchParams)),
	);
	const params = new URLSearchParams(url.searchParams);
	params.set("sign", toBase64Url(mac));
	return `${url.pathname}?${params.toString()}`;
}
