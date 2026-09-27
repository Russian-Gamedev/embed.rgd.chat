import { EMBEDS, type EmbedId, type EmbedState, normalizeLines } from "./embeds";

const STORAGE_KEY = "embed-editor-state";

export type AllState = Record<EmbedId, EmbedState>;

export function loadState(): AllState {
	let saved: Partial<Record<EmbedId, EmbedState>> = {};
	try {
		saved = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "{}") as Partial<
			Record<EmbedId, EmbedState>
		>;
	} catch {
		saved = {};
	}

	const result = {} as AllState;
	for (const embed of EMBEDS) {
		const merged = { ...embed.defaults, ...(saved[embed.id] ?? {}) };
		if (merged.lines !== undefined) {
			merged.lines = normalizeLines(merged.lines);
		}
		result[embed.id] = merged;
	}
	return result;
}

export function saveState(state: AllState, activeId: EmbedId): void {
	localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
	localStorage.setItem(`${STORAGE_KEY}:active`, activeId);
}

export function loadActiveId(): EmbedId {
	const saved = localStorage.getItem(`${STORAGE_KEY}:active`);
	return EMBEDS.find((embed) => embed.id === saved)?.id ?? "title";
}
