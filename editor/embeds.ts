export interface LineEntry {
	text: string;
	fill: string;
	stroke: string;
	/** design units, 8–400; empty means auto-fit from the 80 base size */
	fontSize: string;
	/** 1-4 space-separated integers, CSS shorthand; empty means none */
	margin: string;
	/** extra rotation on top of the base title tilt, degrees ±45; empty means 0 */
	rotate: string;
}

export type EmbedState = Record<string, string | boolean | LineEntry[]>;

export type EmbedId = "title" | "supporter" | "user-card" | "invite-banner";

export const MAX_TITLE_LINES = 4;

export const DEFAULT_LINE: LineEntry = {
	text: "Новая строка",
	fill: "#ffffff",
	stroke: "#5b647d",
	fontSize: "",
	margin: "",
	rotate: "",
};

export interface EmbedField {
	name: string;
	label: string;
	type: "textarea" | "text" | "number" | "color" | "select" | "checkbox" | "lines";
	placeholder?: string;
	hint?: string;
	min?: number;
	max?: number;
	options?: Array<[string, string]>;
	/** color fields only: append an opacity slider and keep the value in #RRGGBBAA form */
	alpha?: boolean;
	/**
	 * select fields only: picking an option pre-fills these fields (they stay visible and
	 * editable); a LineEntry[] value targets the lines field
	 */
	presets?: Record<string, Record<string, string | LineEntry[]>>;
}

export interface Embed {
	id: EmbedId;
	label: string;
	signed?: boolean;
	defaults: EmbedState;
	fields: EmbedField[];
	path: (state: EmbedState) => string | null;
	hidden?: (state: EmbedState, name: string) => boolean;
}

export function text(state: EmbedState, name: string): string {
	return String(state[name] ?? "");
}

/** state.lines is normalized by loadState; this is a typing shortcut. */
export function linesOf(state: EmbedState): LineEntry[] {
	return state.lines as LineEntry[];
}

export function normalizeLines(value: unknown): LineEntry[] {
	if (!Array.isArray(value)) {
		return [{ ...DEFAULT_LINE, text: "Russian Gamedev" }];
	}
	return value.map((entry) => {
		const line = (entry ?? {}) as Partial<LineEntry>;
		return {
			text: typeof line.text === "string" ? line.text : DEFAULT_LINE.text,
			fill: typeof line.fill === "string" ? line.fill : DEFAULT_LINE.fill,
			stroke: typeof line.stroke === "string" ? line.stroke : DEFAULT_LINE.stroke,
			fontSize: typeof line.fontSize === "string" ? line.fontSize : DEFAULT_LINE.fontSize,
			margin: typeof line.margin === "string" ? line.margin : DEFAULT_LINE.margin,
			rotate: typeof line.rotate === "string" ? line.rotate : DEFAULT_LINE.rotate,
		};
	});
}

function isImageBackground(state: EmbedState): boolean {
	return /^https:\/\//i.test(text(state, "background").trim());
}

/** The server requires a leading #; accept bare hex and add it. */
function hexParam(value: string): string {
	const hex = value.trim();
	return /^[0-9a-f]{3,8}$/i.test(hex) ? `#${hex}` : hex;
}

export const EMBEDS: Embed[] = [
	{
		id: "title",
		label: "Title",
		defaults: {
			lines: [
				{
					text: "Russian Gamedev",
					fill: "#ffffff",
					stroke: "#5b647d",
					fontSize: "",
					margin: "",
					rotate: "",
				},
			],
			format: "",
			level: "2",
			background: "",
			blur: "4",
			overlay: "",
			width: "",
			height: "",
		},
		fields: [
			{ name: "lines", label: "Строки (до 4)", type: "lines" },
			{
				name: "format",
				label: "Пресет",
				type: "select",
				options: [
					["", "обычный"],
					["discord", "discord — 1600×252"],
					["yal", "yal-style — 720×520, оверлей #7692c7 60%"],
					["ss", "скриншотный субботник — 956×562"],
				],
				// selecting an option fills the matching fields; they stay visible and editable
				presets: {
					yal: { width: "720", height: "520", overlay: "#7692c799" },
					ss: {
						width: "956",
						height: "562",
						background: "#000000",
						blur: "0",
						lines: [
							{
								text: "Скриншотный",
								fill: "#ffffff",
								stroke: "#5b647d",
								fontSize: "82",
								margin: "0",
								rotate: "-3",
							},
							{
								text: "субботник",
								fill: "#ffffff",
								stroke: "#5b647d",
								fontSize: "73",
								margin: "0 20 0 0",
								rotate: "-3",
							},
							{
								text: "на Russian Gamedev",
								fill: "#ffffff",
								stroke: "#5b647d",
								fontSize: "34",
								margin: "0 -70 0 0",
								rotate: "-3",
							},
						],
					},
				},
			},
			{
				name: "level",
				label: "Вид",
				type: "select",
				options: [
					["1", "логотип — по центру"],
					["2", "правила — слева"],
				],
			},
			{ name: "background", label: "Фон", type: "text", placeholder: "#hex или https://…" },
			{ name: "blur", label: "Блюр фона", type: "number", min: 0, max: 32 },
			{
				name: "overlay",
				label: "Оверлей",
				type: "color",
				alpha: true,
				hint: "слой поверх фона-картинки; прозрачность — слайдером",
			},
			{ name: "width", label: "Ширина", type: "number", min: 16, max: 4096, placeholder: "авто" },
			{ name: "height", label: "Высота", type: "number", min: 16, max: 4096, placeholder: "авто" },
		],
		path(state) {
			const lines = linesOf(state)
				.map((line) => ({ ...line, text: line.text.trim() }))
				.filter((line) => line.text !== "");
			if (lines.length === 0) {
				return null;
			}

			const params = new URLSearchParams();
			for (const line of lines) {
				params.append("text", line.text);
			}
			const format = text(state, "format");
			if (format === "discord") {
				params.set("format", "discord");
				params.set("level", text(state, "level"));
				return `/title?${params}`;
			}
			// an empty color falls back to the standard white/grey instead of erroring server-side
			params.set("fill", lines.map((line) => hexParam(line.fill) || DEFAULT_LINE.fill).join(","));
			params.set(
				"stroke",
				lines.map((line) => hexParam(line.stroke) || DEFAULT_LINE.stroke).join(","),
			);
			// empty per-line values mean the server defaults (80 / no margin / base tilt)
			if (lines.some((line) => line.fontSize.trim() !== "")) {
				params.set("font_size", lines.map((line) => line.fontSize.trim() || "80").join(","));
			}
			if (lines.some((line) => line.margin.trim() !== "")) {
				params.set("margin", lines.map((line) => line.margin.trim() || "0").join(";"));
			}
			if (lines.some((line) => line.rotate.trim() !== "")) {
				params.set("rotate", lines.map((line) => line.rotate.trim() || "0").join(","));
			}
			const background = hexParam(text(state, "background"));
			if (background !== "") {
				params.set("background", background);
			}
			if (isImageBackground(state) && text(state, "blur").trim() !== "") {
				params.set("blur", text(state, "blur").trim());
			}
			for (const name of ["width", "height"]) {
				const value = text(state, name).trim();
				if (value !== "") {
					params.set(name, value);
				}
			}
			if (isImageBackground(state)) {
				const overlay = hexParam(text(state, "overlay"));
				if (overlay !== "") {
					params.set("overlay", overlay);
				}
			}
			return `/title?${params}`;
		},
		hidden(state, name) {
			if (name === "level") {
				return text(state, "format") !== "discord";
			}
			const format = text(state, "format");
			if (format === "discord") {
				return ["background", "blur", "overlay", "width", "height"].includes(name);
			}
			if (!isImageBackground(state)) {
				return name === "blur" || name === "overlay";
			}
			return false;
		},
	},
	{
		id: "supporter",
		label: "Supporter",
		signed: true,
		defaults: {
			username: "username",
			amount: "1000",
			avatar_url: "",
			is_fee_paid_by_user: false,
		},
		fields: [
			{ name: "username", label: "Ник", type: "text" },
			{ name: "amount", label: "Сумма, ₽", type: "number", min: 1, max: 10000000 },
			{
				name: "avatar_url",
				label: "Аватар",
				type: "text",
				placeholder: "https://cdn.discordapp.com/…",
				hint: "Пусто — сгенерируется blobatar по нику",
			},
			{ name: "is_fee_paid_by_user", label: "Оплатил комиссию", type: "checkbox" },
		],
		path(state) {
			const username = text(state, "username").trim();
			const amount = Number(text(state, "amount"));
			if (username === "" || !Number.isSafeInteger(amount) || amount < 1) {
				return null;
			}

			const params = new URLSearchParams({ username, amount: String(amount) });
			const avatarUrl = text(state, "avatar_url").trim();
			if (avatarUrl !== "") {
				params.set("avatar_url", avatarUrl);
			}
			if (state.is_fee_paid_by_user === true) {
				params.set("is_fee_paid_by_user", "1");
			}
			return `/supporter?${params}`;
		},
	},
	{
		id: "user-card",
		label: "User card",
		defaults: { id: "" },
		fields: [
			{ name: "id", label: "ID пользователя", type: "text", placeholder: "504706488368103435" },
		],
		path(state) {
			const id = text(state, "id").trim();
			return id === "" ? null : `/users/${encodeURIComponent(id)}/card`;
		},
	},
	{
		id: "invite-banner",
		label: "Invite banner",
		defaults: { code: "" },
		fields: [
			{
				name: "code",
				label: "Код приглашения",
				type: "text",
				placeholder: "часть после discord.gg/",
			},
		],
		path(state) {
			const code = text(state, "code").trim();
			return code === "" ? null : `/invite/${encodeURIComponent(code)}/banner`;
		},
	},
];
