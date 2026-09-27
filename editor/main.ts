/// <reference lib="dom" />
import { initCopyButtons } from "./copy";
import { EMBEDS, type Embed, type EmbedId } from "./embeds";
import { applyFieldVisibility, buildFields } from "./fields";
import { createPreview } from "./preview";
import { setSecret } from "./sign";
import { loadActiveId, loadState, saveState } from "./state";

function requireElement<T extends Element>(selector: string): T {
	const element = document.querySelector<T>(selector);
	if (!element) {
		throw new Error(`Editor layout is missing element: ${selector}`);
	}
	return element;
}

const tabsRoot = requireElement<HTMLElement>("#tabs");
const fieldsRoot = requireElement<HTMLElement>("#fields");
const previewEl = requireElement<HTMLImageElement>("#preview");
const statusEl = requireElement<HTMLElement>("#status");
const dimensionsEl = requireElement<HTMLElement>("#dimensions");
const copyImageButton = requireElement<HTMLButtonElement>("#copy-image");
const copyLinkButton = requireElement<HTMLButtonElement>("#copy-link");
const secretInput = requireElement<HTMLInputElement>("#secret");
const secretField = requireElement<HTMLElement>("#secret-field");

const state = loadState();
const preview = createPreview({ preview: previewEl, status: statusEl, dimensions: dimensionsEl });

const forms = new Map<EmbedId, HTMLFormElement>();
const tabs = new Map<EmbedId, HTMLButtonElement>();

let activeId = loadActiveId();

function currentEmbed(): Embed | undefined {
	return EMBEDS.find((candidate) => candidate.id === activeId);
}

function onFieldChange(): void {
	const embed = currentEmbed();
	if (!embed) {
		return;
	}
	saveState(state, activeId);
	const form = forms.get(embed.id);
	if (form) {
		applyFieldVisibility(embed, form, state[embed.id]);
	}
	preview.scheduleRefresh(embed, state[embed.id]);
}

function setActive(id: EmbedId): void {
	activeId = id;
	for (const embed of EMBEDS) {
		tabs.get(embed.id)?.classList.toggle("active", embed.id === id);
		const form = forms.get(embed.id);
		if (form) {
			form.hidden = embed.id !== id;
		}
	}
	const embed = currentEmbed();
	secretField.hidden = !embed?.signed;
	saveState(state, id);
	if (embed) {
		preview.refresh(embed, state[embed.id]);
	}
}

for (const embed of EMBEDS) {
	const tab = document.createElement("button");
	tab.type = "button";
	tab.className = "tab";
	tab.textContent = embed.label;
	tab.addEventListener("click", () => setActive(embed.id));
	tabsRoot.appendChild(tab);
	tabs.set(embed.id, tab);

	const form = buildFields(embed, state[embed.id], onFieldChange);
	form.hidden = embed.id !== activeId;
	fieldsRoot.appendChild(form);
	forms.set(embed.id, form);
	applyFieldVisibility(embed, form, state[embed.id]);
}

function refreshOnSecretInput(): void {
	const embed = currentEmbed();
	if (embed?.signed) {
		preview.refresh(embed, state[embed.id]);
	}
}

secretInput.addEventListener("input", () => setSecret(secretInput.value));
secretInput.addEventListener("input", refreshOnSecretInput);

initCopyButtons(copyLinkButton, copyImageButton, () => preview.snapshot());
setActive(activeId);
