import ImageResponse from "@takumi-rs/image-response";
import type { BunRequest } from "bun";
import { ImageFetchError, ImageLoader } from "../../lib/image-loader";
import type { BunServer } from "../../lib/types";
import { Color, createLogger, HttpError, JsonResponse } from "../../lib/utils";
import { renderer } from "../../renderer";
import { ALLOWED_AVATAR_HOSTS } from "./avatar";
import {
	AVATAR_SIZE,
	CARD_HEIGHT,
	CARD_RIGHT_PADDING,
	CARD_WIDTH,
	CONTENT_GAP,
	calculateTextLayout,
	type TextLayout,
} from "./layout";
import {
	createSupporterCardViewModel,
	parseSupporterCardInput,
	type SupporterCardViewModel,
} from "./view-model";

export { parseSupporterCardInput } from "./view-model";

const DEVICE_PIXEL_RATIO = 2;

const FALLBACK_CACHE_KEY = "__avatar_fallback__";

const logger = createLogger("supporter-card", Color.magenta);

const imageLoader = new ImageLoader({
	allowedHosts: ALLOWED_AVATAR_HOSTS,
	allowedMimeTypes: ["image/png", "image/jpeg", "image/webp", "image/gif"],
});

function DisplayName({ children, fontSize }: { children: string; fontSize: number }) {
	return (
		<span
			style={{
				fontSize,
				fontWeight: 700,
				fontFamily: "Mulish",
				whiteSpace: "nowrap",
				color: "#f2f3f5",
			}}
		>
			{children}
		</span>
	);
}

function AmountText({ children, fontSize }: { children: string; fontSize: number }) {
	return (
		<span
			style={{
				fontSize,
				fontWeight: 800,
				fontFamily: "Mulish",
				whiteSpace: "nowrap",
				background: "linear-gradient(135deg, #FF9A2B, #FFFF50)",
				backgroundClip: "text",
				WebkitBackgroundClip: "text",
				color: "transparent",
				WebkitTextFillColor: "transparent",
			}}
		>
			{children}
		</span>
	);
}

function FeePaidText() {
	return (
		<span
			style={{
				fontSize: 12,
				fontWeight: 500,
				fontFamily: "Mulish",
				whiteSpace: "nowrap",
				color: "#b5bac1",
			}}
		>
			и оплатил коммисию ❤
		</span>
	);
}

function SupporterCard({
	viewModel,
	layout,
}: {
	viewModel: SupporterCardViewModel;
	layout: TextLayout;
}) {
	return (
		<div
			style={{
				width: "100%",
				height: "100%",
				display: "inline-flex",
				alignItems: "center",
				gap: CONTENT_GAP,
				backgroundColor: "#2F3136",
				borderRadius: 47.5,
				fontFamily: "Mulish",
				paddingRight: CARD_RIGHT_PADDING,
				overflow: "hidden",
				position: "relative",
			}}
		>
			<img
				src={viewModel.avatarSrc}
				alt=""
				style={{
					width: AVATAR_SIZE,
					height: AVATAR_SIZE,
					borderRadius: "50%",
					flexShrink: 0,
					boxShadow: "0 4px 12px rgba(0,0,0,0.5)",
				}}
			/>

			<DisplayName fontSize={layout.usernameFontSize}>{viewModel.username}</DisplayName>

			<div
				style={{
					marginLeft: "auto",
					display: "flex",
					flexDirection: "column",
					alignItems: "flex-end",
				}}
			>
				<AmountText fontSize={layout.amountFontSize}>{viewModel.amountText}</AmountText>
				{layout.showFeePaidText && <FeePaidText />}
			</div>
		</div>
	);
}

export async function renderSupporterCard(request: BunRequest, _server: BunServer) {
	try {
		const input = parseSupporterCardInput(new URL(request.url), imageLoader);

		let avatarSrc: string;
		if (input.avatarUrl !== null) {
			try {
				await imageLoader.load(input.avatarUrl);
				avatarSrc = input.avatarUrl.toString();
			} catch (error: unknown) {
				if (error instanceof ImageFetchError) {
					logger("Avatar fallback: kind=%s host=%s", error.kind, input.avatarUrl.hostname);
				} else {
					logger("Avatar fallback: unexpected error=%o", error);
				}
				await imageLoader.ensureFallback("assets/avatar-fallback.png", FALLBACK_CACHE_KEY);
				avatarSrc = FALLBACK_CACHE_KEY;
			}
		} else {
			await imageLoader.ensureFallback("assets/avatar-fallback.png", FALLBACK_CACHE_KEY);
			avatarSrc = FALLBACK_CACHE_KEY;
		}

		const viewModel = createSupporterCardViewModel(input, avatarSrc);
		const layout = await calculateTextLayout(viewModel);

		return new ImageResponse(<SupporterCard viewModel={viewModel} layout={layout} />, {
			width: CARD_WIDTH * DEVICE_PIXEL_RATIO,
			height: CARD_HEIGHT * DEVICE_PIXEL_RATIO,
			format: "webp",
			renderer,
			images: { fetchCache: imageLoader.cache },
			onError: (error: unknown) => {
				logger("Render failed: %o", error);
			},
			devicePixelRatio: DEVICE_PIXEL_RATIO,
		});
	} catch (error: unknown) {
		if (error instanceof HttpError) {
			return new JsonResponse({ error: error.message }, { status: error.statusCode });
		}

		throw error;
	}
}
