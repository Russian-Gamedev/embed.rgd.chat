/// <reference lib="dom" />
import {
	DEFAULT_LINE,
	type Embed,
	type EmbedField,
	type EmbedState,
	type LineEntry,
	linesOf,
	MAX_TITLE_LINES,
	normalizeLines,
	text,
} from "./embeds";

type FieldElement = HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement;

interface Rgba {
	r: number;
	g: number;
	b: number;
	a: number;
}

/** Accepts an optional #, then #RGB/#RGBA/#RRGGBB/#RRGGBBAA digit counts; missing alpha means opaque. */
function parseHexColor(value: string): Rgba | null {
	const match = /^#?([0-9a-f]{3,8})$/i.exec(value.trim());
	const hex = match?.[1];
	if (!hex) {
		return null;
	}
	const full = hex.length <= 4 ? [...hex].map((char) => char + char).join("") : hex;
	if (full.length !== 6 && full.length !== 8) {
		return null;
	}
	return {
		r: Number.parseInt(full.slice(0, 2), 16),
		g: Number.parseInt(full.slice(2, 4), 16),
		b: Number.parseInt(full.slice(4, 6), 16),
		a: full.length === 8 ? Number.parseInt(full.slice(6, 8), 16) : 255,
	};
}

function toHex2(component: number): string {
	return component.toString(16).padStart(2, "0");
}

function composeHexColor({ r, g, b, a }: Rgba, withAlpha: boolean): string {
	const rgb = `#${toHex2(r)}${toHex2(g)}${toHex2(b)}`;
	return withAlpha ? rgb + toHex2(a) : rgb;
}

function alphaPercent(a: number): string {
	return `${Math.round((a * 100) / 255)}%`;
}

const OPAQUE_BLACK: Rgba = { r: 0, g: 0, b: 0, a: 255 };

/**
 * Color picker + hex text (+ opacity slider). The text value is the source of truth
 * and is reported through onChange.
 */
function createColorControl(
	initial: string,
	options: { alpha?: boolean; onChange: (value: string) => void },
): HTMLDivElement {
	const { alpha = false, onChange } = options;

	const root = document.createElement("div");
	const row = document.createElement("div");
	row.className = "color-row";
	const picker = document.createElement("input");
	picker.type = "color";
	const input = document.createElement("input");
	input.type = "text";
	input.value = initial;

	let slider: HTMLInputElement | undefined;
	let alphaValue: HTMLElement | undefined;
	const syncControls = () => {
		const parsed = parseHexColor(input.value);
		if (!parsed) {
			return;
		}
		picker.value = composeHexColor(parsed, false);
		if (slider && alphaValue) {
			slider.value = String(parsed.a);
			alphaValue.textContent = alphaPercent(parsed.a);
		}
	};

	picker.addEventListener("input", () => {
		const picked = parseHexColor(picker.value);
		if (!picked) {
			return;
		}
		if (alpha) {
			const current = parseHexColor(input.value)?.a ?? 255;
			input.value = composeHexColor({ ...picked, a: current }, true);
		} else {
			input.value = picker.value;
		}
		onChange(input.value);
		syncControls();
	});

	if (alpha) {
		const alphaRow = document.createElement("div");
		alphaRow.className = "alpha-row";
		const sliderEl = document.createElement("input");
		sliderEl.type = "range";
		sliderEl.min = "0";
		sliderEl.max = "255";
		sliderEl.step = "1";
		const valueEl = document.createElement("span");
		valueEl.className = "alpha-value";
		sliderEl.addEventListener("input", () => {
			const current = parseHexColor(input.value) ?? { ...OPAQUE_BLACK };
			const value = Number(sliderEl.value);
			input.value = composeHexColor({ ...current, a: value }, true);
			valueEl.textContent = alphaPercent(value);
			onChange(input.value);
		});
		alphaRow.append(sliderEl, valueEl);
		root.append(alphaRow);
		slider = sliderEl;
		alphaValue = valueEl;
	}

	input.addEventListener("input", () => {
		onChange(input.value);
		if (alpha) {
			syncControls();
		}
	});

	row.append(picker, input);
	root.append(row);
	syncControls();
	return root;
}

function bind(
	state: EmbedState,
	field: EmbedField,
	element: FieldElement,
	event: string,
	read: (element: FieldElement) => string | boolean,
	onFieldChange: () => void,
): void {
	element.addEventListener(event, () => {
		state[field.name] = read(element);
		onFieldChange();
	});
}

export function buildFields(
	embed: Embed,
	state: EmbedState,
	onFieldChange: () => void,
): HTMLFormElement {
	const form = document.createElement("form");
	form.className = "fields";
	form.autocomplete = "off";
	// composite fields (lines) register a rerender here so select presets can refresh them
	const rerenderers = new Map<string, () => void>();
	for (const field of embed.fields) {
		form.appendChild(buildField(form, rerenderers, field, state, onFieldChange));
	}
	return form;
}

function buildField(
	form: HTMLFormElement,
	rerenderers: Map<string, () => void>,
	field: EmbedField,
	state: EmbedState,
	onFieldChange: () => void,
): HTMLElement {
	const wrap = document.createElement("div");
	wrap.className = "field";
	wrap.dataset.name = field.name;

	const label = document.createElement("label");
	label.textContent = field.label;
	wrap.appendChild(label);

	switch (field.type) {
		case "textarea": {
			const input = document.createElement("textarea");
			input.rows = 3;
			input.placeholder = field.placeholder ?? "";
			input.value = text(state, field.name);
			bind(state, field, input, "input", (el) => (el as HTMLTextAreaElement).value, onFieldChange);
			wrap.appendChild(input);
			break;
		}
		case "text": {
			const input = document.createElement("input");
			input.type = "text";
			input.placeholder = field.placeholder ?? "";
			input.value = text(state, field.name);
			bind(state, field, input, "input", (el) => (el as HTMLInputElement).value, onFieldChange);
			wrap.appendChild(input);
			break;
		}
		case "number": {
			const input = document.createElement("input");
			input.type = "number";
			if (field.min !== undefined) {
				input.min = String(field.min);
			}
			if (field.max !== undefined) {
				input.max = String(field.max);
			}
			input.placeholder = field.placeholder ?? "";
			input.value = text(state, field.name);
			bind(state, field, input, "input", (el) => (el as HTMLInputElement).value, onFieldChange);
			wrap.appendChild(input);
			break;
		}
		case "color": {
			wrap.appendChild(
				createColorControl(text(state, field.name), {
					alpha: field.alpha,
					onChange: (value) => {
						state[field.name] = value;
						onFieldChange();
					},
				}),
			);
			break;
		}
		case "select": {
			const select = document.createElement("select");
			for (const [value, optionLabel] of field.options ?? []) {
				const option = document.createElement("option");
				option.value = value;
				option.textContent = optionLabel;
				select.appendChild(option);
			}
			select.value = text(state, field.name);
			bind(state, field, select, "change", (el) => (el as HTMLSelectElement).value, onFieldChange);
			// presets pre-fill sibling fields through their own input listeners, so state,
			// DOM values and the color controls all stay in sync
			if (field.presets) {
				select.addEventListener("change", () => {
					const preset = field.presets?.[select.value];
					if (!preset) {
						return;
					}
					for (const [name, value] of Object.entries(preset)) {
						const rerender = rerenderers.get(name);
						if (rerender) {
							state[name] = normalizeLines(value);
							rerender();
							onFieldChange();
							continue;
						}
						if (typeof value !== "string") {
							continue;
						}
						const input = form.querySelector<HTMLInputElement>(
							`[data-name="${name}"] input[type="text"], [data-name="${name}"] input[type="number"]`,
						);
						if (!input) {
							continue;
						}
						input.value = value;
						input.dispatchEvent(new Event("input"));
					}
				});
			}
			wrap.appendChild(select);
			break;
		}
		case "checkbox": {
			const input = document.createElement("input");
			input.type = "checkbox";
			input.checked = state[field.name] === true;
			bind(state, field, input, "change", (el) => (el as HTMLInputElement).checked, onFieldChange);
			wrap.appendChild(input);
			break;
		}
		case "lines": {
			rerenderers.set(field.name, buildLinesField(wrap, state, onFieldChange));
			break;
		}
	}

	if (field.hint) {
		const hint = document.createElement("small");
		hint.className = "hint";
		hint.textContent = field.hint;
		wrap.appendChild(hint);
	}
	return wrap;
}

/** Per-title-line rows: text + fill/stroke colors. Re-renders itself when lines are added or removed. */
function buildLinesField(
	wrap: HTMLElement,
	state: EmbedState,
	onFieldChange: () => void,
): () => void {
	const render = () => {
		for (const child of [...wrap.children]) {
			if (!(child instanceof HTMLLabelElement)) {
				child.remove();
			}
		}

		const lines = linesOf(state);
		const list = document.createElement("div");
		list.className = "lines";
		lines.forEach((_, index) => {
			list.appendChild(buildLineRow(lines, index, onFieldChange, render));
		});
		wrap.appendChild(list);

		if (lines.length < MAX_TITLE_LINES) {
			const add = document.createElement("button");
			add.type = "button";
			add.className = "lines-add";
			add.textContent = "+ строка";
			add.addEventListener("click", () => {
				linesOf(state).push({ ...DEFAULT_LINE });
				render();
				onFieldChange();
			});
			wrap.appendChild(add);
		}
	};
	render();
	return render;
}

function buildLineRow(
	lines: LineEntry[],
	index: number,
	onFieldChange: () => void,
	rerender: () => void,
): HTMLElement {
	const line = lines[index] ?? { ...DEFAULT_LINE };

	const row = document.createElement("div");
	row.className = "lines-row";

	const head = document.createElement("div");
	head.className = "lines-head";
	const title = document.createElement("span");
	title.textContent = `Строка ${index + 1}`;
	head.appendChild(title);
	if (lines.length > 1) {
		const remove = document.createElement("button");
		remove.type = "button";
		remove.className = "lines-remove";
		remove.textContent = "×";
		remove.title = "Удалить строку";
		remove.addEventListener("click", () => {
			lines.splice(index, 1);
			rerender();
			onFieldChange();
		});
		head.appendChild(remove);
	}
	row.appendChild(head);

	// caption-above-input field shell
	const textField = (caption: string, control: HTMLElement): HTMLElement => {
		const field = document.createElement("div");
		field.className = "lines-field";
		const captionEl = document.createElement("span");
		captionEl.textContent = caption;
		field.append(captionEl, control);
		return field;
	};

	const textInput = document.createElement("input");
	textInput.type = "text";
	textInput.maxLength = 64;
	textInput.placeholder = "Текст строки";
	textInput.value = line.text;
	textInput.addEventListener("input", () => {
		line.text = textInput.value;
		onFieldChange();
	});
	row.appendChild(textField("текст", textInput));

	const grid = document.createElement("div");
	grid.className = "lines-grid";
	for (const [caption, key, placeholder, min, max, step] of [
		["размер", "fontSize", "авто", "8", "400", "1"],
		["наклон °", "rotate", "0", "-45", "45", "any"],
	] as const) {
		const input = document.createElement("input");
		input.type = "number";
		input.placeholder = placeholder;
		input.min = min;
		input.max = max;
		input.step = step;
		input.value = line[key];
		input.addEventListener("input", () => {
			line[key] = input.value;
			onFieldChange();
		});
		grid.appendChild(textField(caption, input));
	}
	row.appendChild(grid);

	const marginInput = document.createElement("input");
	marginInput.type = "text";
	marginInput.placeholder = "0";
	marginInput.value = line.margin;
	marginInput.addEventListener("input", () => {
		line.margin = marginInput.value;
		onFieldChange();
	});
	row.appendChild(textField("отступы — верх право низ лево", marginInput));

	for (const [caption, key] of [
		["заливка", "fill"],
		["обводка", "stroke"],
	] as const) {
		const control = document.createElement("div");
		control.appendChild(
			createColorControl(line[key], {
				onChange: (value) => {
					line[key] = value;
					onFieldChange();
				},
			}),
		);
		row.appendChild(textField(caption, control));
	}

	return row;
}

export function applyFieldVisibility(embed: Embed, form: HTMLFormElement, state: EmbedState): void {
	if (!embed.hidden) {
		return;
	}
	for (const field of embed.fields) {
		const wrap = form.querySelector<HTMLElement>(`[data-name="${field.name}"]`);
		if (wrap) {
			wrap.hidden = embed.hidden(state, field.name);
		}
	}
}
