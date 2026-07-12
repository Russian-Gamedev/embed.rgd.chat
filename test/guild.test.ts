import { describe, expect, it } from "bun:test";
import { renderInviteBanner } from "../src/embed/guild-banner";
import { request } from "./utils";

describe("guild banner", async () => {
	it("must render shizdev", async () => {
		const params = {
			code: "MXWGuNtT4C",
		};
		const name = "guild-banner";
		const data = await request(renderInviteBanner, { params }, name);
		expect(data.ok).toBe(true);
	});
});
