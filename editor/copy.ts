/// <reference lib="dom" />
import type { Snapshot } from "./preview";

function flash(button: HTMLButtonElement, message = "Скопировано ✓"): void {
	if (!button.dataset.label) {
		button.dataset.label = button.textContent ?? "";
	}
	button.textContent = message;
	button.classList.add("flashing");
	const owner = flashTimers.get(button);
	clearTimeout(owner);
	flashTimers.set(
		button,
		window.setTimeout(() => {
			button.textContent = button.dataset.label ?? "";
			button.classList.remove("flashing");
		}, 1500),
	);
}

const flashTimers = new WeakMap<HTMLButtonElement, number>();

async function toPng(blob: Blob): Promise<Blob> {
	const bitmap = await createImageBitmap(blob);
	const canvas = new OffscreenCanvas(bitmap.width, bitmap.height);
	canvas.getContext("2d")?.drawImage(bitmap, 0, 0);
	bitmap.close();
	return canvas.convertToBlob({ type: "image/png" });
}

export function initCopyButtons(
	linkButton: HTMLButtonElement,
	imageButton: HTMLButtonElement,
	getSnapshot: () => Snapshot,
): void {
	linkButton.addEventListener("click", async () => {
		const { url } = getSnapshot();
		if (url === null) {
			return;
		}
		try {
			await navigator.clipboard.writeText(url);
			flash(linkButton);
		} catch {
			flash(linkButton, "Не удалось скопировать");
		}
	});

	imageButton.addEventListener("click", async () => {
		const { blob } = getSnapshot();
		if (blob === null) {
			return;
		}
		try {
			const png = blob.type === "image/png" ? blob : await toPng(blob);
			await navigator.clipboard.write([new ClipboardItem({ "image/png": png })]);
			flash(imageButton);
		} catch {
			flash(imageButton, "Не удалось скопировать");
		}
	});
}
