import ImageResponse from "@takumi-rs/image-response";
import { renderer } from "../renderer";
import type { BunRequest } from "bun";
import type { BunServer } from "../types";
import { API } from "../api";
import { JsonResponse } from "../utils";

interface InviteBannerProps {
  title: string;
  iconURL: string;
  members: number;
  online: number;
  banner?: string | null;
}

export async function renderInviteBanner(request: BunRequest, _server: BunServer) {
  const width = 500;
  const height = 220;

  const code = request.params.code?.trim();

  if (!code) {
    return new JsonResponse(
      { error: "Invite code is required" },
      {
        status: 400,
      },
    );
  }

  let inviteInfo;
  try {
    inviteInfo = await API.getInviteInfo(code);
  } catch {
    return new JsonResponse(
      { error: "Failed to fetch invite info" },
      { status: 502 },
    );
  }

  const props: InviteBannerProps = {
    title: inviteInfo.title,
    iconURL: inviteInfo.icon_url,
    members: inviteInfo.memberCount,
    online: inviteInfo.presenceCount,
    banner: inviteInfo.banner_url,
  };

  return new ImageResponse(
    <div
      style={{
        fontFamily: "Mulish",
        width,
        height,
        backgroundColor: "#2b2d31",
        borderRadius: 8,
        display: "flex",
        flexDirection: "column",
      }}
    >
      {/* Banner Background */}
      {props.banner ? (
        <img
          src={props.banner}
          style={{
            width: "100%",
            height: 100,
            objectFit: "cover",
            borderTopLeftRadius: 8,
            borderTopRightRadius: 8,
          }}
        />
      ) : (
        <div
          style={{
            width: "100%",
            height: 100,
            borderTopLeftRadius: 8,
            borderTopRightRadius: 8,
            backgroundImage:
              "linear-gradient(135deg, #5865F2 0%, #4752C4 100%)",
          }}
        />
      )}

      {/* Content Container */}
      <div
        style={{
          padding: 16,
          display: "flex",
          flexDirection: "column",
          flex: 1,
        }}
      >
        {/* Server Icon and Name */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            marginBottom: 12,
            marginTop: -50,
          }}
        >
          <img
            src={props.iconURL}
            style={{
              width: 64,
              height: 64,
              borderRadius: "50%",
              border: "4px solid #2b2d31",
              marginRight: 12,
            }}
          />
          <div
            style={{
              color: "#f2f3f5",
              fontSize: 18,
              fontWeight: 700,
              marginTop: 40,
            }}
          >
            {props.title}
          </div>
        </div>

        {/* Stats */}
        <div
          style={{
            display: "flex",
            gap: 16,
            marginBottom: 16,
          }}
        >
          {/* Online Members */}
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <div
              style={{
                width: 8,
                height: 8,
                borderRadius: "50%",
                backgroundColor: "#23a559",
              }}
            />
            <span style={{ color: "#b5bac1", fontSize: 14 }}>
              {props.online.toLocaleString()} online
            </span>
          </div>

          {/* Total Members */}
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <div
              style={{
                width: 8,
                height: 8,
                borderRadius: "50%",
                backgroundColor: "#80848e",
              }}
            />
            <span style={{ color: "#b5bac1", fontSize: 14 }}>
              {props.members.toLocaleString()} members
            </span>
          </div>
        </div>

        {/* Join Button */}
        <div
          style={{
            backgroundColor: "#248046",
            borderRadius: 4,
            padding: "10px 16px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: "pointer",
            transition: "background-color 0.17s ease",
          }}
        >
          <span
            style={{
              color: "#ffffff",
              fontSize: 14,
              fontWeight: 600,
            }}
          >
            Join Server
          </span>
        </div>
      </div>
    </div>,
    {
      width,
      height,
      format: "webp",
      renderer,
    },
  );
}
