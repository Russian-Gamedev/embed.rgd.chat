import ImageResponse from "@takumi-rs/image-response";
import type { BunRequest } from "bun";
import { API } from "../lib/api/api";
import type { User, UserTag } from "../lib/api/types";
import { createCache } from "../lib/cache/cache";
import type { BunServer } from "../lib/types";
import { Color, createLogger, JsonResponse } from "../lib/utils";
import { renderer } from "../renderer";

const logger = createLogger("user-card", Color.magenta);
const imageFetchCache = createCache<Promise<ArrayBuffer>>(600_000);

interface UserCardProps {
	avatarURL: string;
	nickname: string | null;
	username: string;
	about: string | null;
	banner: string | null;
	bannerColor: string;
	tags: UserTag[];
}

export async function renderUserCard(request: BunRequest, _server: BunServer) {
	const devicePixelRatio = 2;
	const width = 1200 * devicePixelRatio;
	const height = 152 * devicePixelRatio;

	const id = request.params.id?.trim();

	if (!id) {
		return new JsonResponse({ error: "User ID is required" }, { status: 400 });
	}

	let user: User;
	try {
		user = await API.getUser(id);
	} catch {
		return new JsonResponse({ error: "Failed to fetch user info" }, { status: 502 });
	}

	const props: UserCardProps = {
		avatarURL: user.avatarUrl,
		nickname: user.nickname,
		username: user.username,
		about: user.about,
		banner: user.bannerAlt ?? user.banner,
		bannerColor: user.bannerColor,
		tags: user.tags,
	};

	return new ImageResponse(
		<div
			style={{
				width,
				height,
				position: "relative",
				overflow: "hidden",
				borderRadius: 8,
				fontFamily: "Mulish",
			}}
		>
			<div
				style={{
					position: "absolute",
					top: 0,
					left: 0,
					width: "100%",
					height: "100%",
					backgroundColor: props.bannerColor,
					backgroundSize: "cover",
					backgroundPosition: "center",
					...(props.banner ? { backgroundImage: `url(${props.banner})` } : {}),
				}}
			/>

			<div
				style={{
					position: "absolute",
					top: 0,
					left: 0,
					width: "100%",
					height: "100%",
					background: "linear-gradient(to right, rgba(0,0,0,0.8), rgba(0,0,0,0))",
				}}
			/>

			<div
				style={{
					position: "relative",
					zIndex: 1,
					display: "flex",
					alignItems: "flex-start",
					padding: 16,
					width: "100%",
					height: "100%",
				}}
			>
				<img
					src={props.avatarURL}
					alt=""
					style={{
						width: 120,
						height: 120,
						borderRadius: 12,
						flexShrink: 0,
					}}
				/>
				<div
					style={{
						display: "flex",
						flexDirection: "column",
						marginLeft: 16,
						flex: 1,
						minWidth: 0,
					}}
				>
					{props.tags.length > 0 && (
						<div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
							{props.tags.map((tag) => (
								<span
									key={tag.name}
									style={{
										backgroundColor: tag.background,
										color: tag.color,
										fontSize: 12,
										padding: "2px 6px",
										borderRadius: 100,
										fontFamily: "Mulish",
										fontWeight: 500,
									}}
								>
									{tag.name}
								</span>
							))}
						</div>
					)}
					<h1
						style={{
							margin: 0,
							fontSize: 24,
							fontWeight: 700,
							color: "#f2f3f5",
							fontFamily: "Mulish",
						}}
					>
						{props.nickname ?? props.username}
					</h1>
					{props.about && (
						<p
							style={{
								margin: "4px 0 0 0",
								fontSize: 14,
								color: "#b5bac1",
								fontFamily: "Mulish",
							}}
						>
							{props.about}
						</p>
					)}
				</div>
			</div>
		</div>,
		{
			width,
			height,
			format: "webp",
			renderer,
			images: { fetchCache: imageFetchCache },
			onError: (error) => logger(`Render failed: ${error}`),
			devicePixelRatio,
		},
	);
}
