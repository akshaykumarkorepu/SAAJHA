import { ImageResponse } from "next/og";

const size = { width: 180, height: 180 };

/** Home-screen icon: the Saajha mark on warm paper. */
export function GET() {
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", background: "#FAF8F3" }}>
        <svg width="124" height="124" viewBox="0 0 32 32">
          <rect x="2" y="2" width="19" height="19" rx="5.5" fill="#2B3A8C" />
          <rect x="11" y="11" width="19" height="19" rx="5.5" fill="#F2A531" />
          <path d="M11 16.5a5.5 5.5 0 0 1 5.5-5.5H21v4.5a5.5 5.5 0 0 1-5.5 5.5H11z" fill="#B5652A" />
        </svg>
      </div>
    ),
    size,
  );
}
