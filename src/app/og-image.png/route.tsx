import { ImageResponse } from "next/og";

const size = { width: 1200, height: 630 };

/** Link preview card (WhatsApp, LinkedIn, Slack): brand navy, the mark, the promise. */
export function GET() {
  const dots = Array.from({ length: 13 * 7 }, (_, i) => i);
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: 72,
          background: "radial-gradient(circle at 78% 30%, rgba(245,185,66,0.18), transparent 45%), radial-gradient(circle at 20% 10%, rgba(129,140,248,0.22), transparent 50%), #0B0D18",
          color: "#F3F4FA",
          fontFamily: "serif",
        }}
      >
        <div style={{ position: "absolute", right: 72, top: 150, display: "flex", flexWrap: "wrap", width: 13 * 26, gap: 0, opacity: 0.35 }}>
          {dots.map((i) => (
            <div key={i} style={{ width: 26, height: 26, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <div style={{ width: 3, height: 3, borderRadius: 3, background: i % 9 === 4 ? "#F5B942" : "#A5B4FC" }} />
            </div>
          ))}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
          <svg width="56" height="56" viewBox="0 0 32 32">
            <rect x="2" y="2" width="19" height="19" rx="5.5" fill="#818CF8" />
            <rect x="11" y="11" width="19" height="19" rx="5.5" fill="#F5B942" />
            <path d="M11 16.5a5.5 5.5 0 0 1 5.5-5.5H21v4.5a5.5 5.5 0 0 1-5.5 5.5H11z" fill="#B5652A" />
          </svg>
          <div style={{ fontSize: 44, fontWeight: 700, letterSpacing: -1 }}>Saajha</div>
        </div>
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div style={{ fontSize: 92, fontWeight: 700, lineHeight: 1.02, letterSpacing: -3, display: "flex", flexDirection: "column" }}>
            <span>Idle labs,</span>
            <span style={{ display: "flex" }}>
              <span style={{ color: "#A5B4FC" }}>shared</span>&nbsp;with&nbsp;
              <span style={{ borderBottom: "8px solid #F5B942", paddingBottom: 2 }}>trust.</span>
            </span>
          </div>
          <div style={{ marginTop: 28, fontSize: 30, color: "#A1A7BF", fontFamily: "sans-serif" }}>
            Readiness checks, fair approvals and evidence-backed handovers for campus labs.
          </div>
        </div>
      </div>
    ),
    size,
  );
}
