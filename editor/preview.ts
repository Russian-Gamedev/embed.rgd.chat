/// <reference lib="dom" />
import type { Embed, EmbedState } from "./embeds";
import { hasSecret, signedPath } from "./sign";

const REFRESH_DELAY_MS = 250;

export interface PreviewRefs {
	preview: HTMLImageElement;
	status: HTMLElement;
	dimensions: HTMLElement;
}

export interface Snapshot {
	url: string | null;
	blob: Blob | null;
}

export function createPreview(refs: PreviewRefs) {
	let currentUrl: string | null = null;
	let currentBlob: Blob | null = null;
	let currentObjectUrl: string | null = null;
	let seq = 0;
	let timer: number | undefined;

	function showStatus(message: string): void {
		refs.status.textContent = message;
		refs.status.hidden = false;
		// no last-good image to keep visible: don't show the broken-image icon
		refs.preview.hidden = refs.preview.naturalWidth === 0;
	}

	function hideStatus(): void {
		refs.status.hidden = true;
	}

	async function refresh(embed: Embed, state: EmbedState): Promise<void> {
		const currentSeq = ++seq;
		const path = embed.path(state);

		if (path === null) {
			showStatus("Заполните обязательные параметры");
			return;
		}

		let target = path;
		if (embed.signed) {
			if (!hasSecret()) {
				showStatus("Введите SECRET_KEY в сайдбаре, чтобы подписать ссылку /supporter");
				return;
			}
			target = await signedPath(path);
			if (currentSeq !== seq) {
				return;
			}
		}

		const url = new URL(target, window.location.origin).toString();

		let res: Response;
		try {
			res = await fetch(url);
		} catch {
			if (currentSeq === seq) {
				showStatus("Сервер недоступен");
			}
			return;
		}
		if (currentSeq !== seq) {
			return;
		}

		if (!res.ok) {
			const data = (await res.json().catch(() => null)) as { error?: string } | null;
			showStatus(data?.error ?? `HTTP ${res.status}`);
			return;
		}

		const blob = await res.blob();
		if (currentSeq !== seq) {
			return;
		}

		hideStatus();
		refs.preview.hidden = false;
		if (currentObjectUrl !== null) {
			URL.revokeObjectURL(currentObjectUrl);
		}
		currentObjectUrl = URL.createObjectURL(blob);
		currentUrl = url;
		currentBlob = blob;
		refs.preview.src = currentObjectUrl;
	}

	function scheduleRefresh(embed: Embed, state: EmbedState): void {
		clearTimeout(timer);
		timer = window.setTimeout(() => {
			refresh(embed, state).catch(() => showStatus("Не удалось обновить превью"));
		}, REFRESH_DELAY_MS);
	}

	refs.preview.addEventListener("load", () => {
		refs.dimensions.textContent = `${refs.preview.naturalWidth}×${refs.preview.naturalHeight}`;
	});

	return {
		scheduleRefresh,
		refresh,
		snapshot(): Snapshot {
			return { url: currentUrl, blob: currentBlob };
		},
	};
}
