import { ImageResponse } from "next/og";

export const alt = "Edmund Lim — photographer · vibe coder · tech enthusiast";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

// Branded share card. Generated at build time — no external assets, no fonts to load.
export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          height: "100%",
          width: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          background: "#070707",
          color: "#ece9e2",
          padding: "80px",
          fontFamily: "monospace",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            fontSize: 22,
            letterSpacing: "0.2em",
            textTransform: "uppercase",
            color: "#93908a",
          }}
        >
          <span>EL—26</span>
          <span>SG · UTC+8</span>
        </div>

        <div style={{ display: "flex", flexDirection: "column" }}>
          <div style={{ display: "flex", alignItems: "center" }}>
            <div
              style={{
                width: 60,
                height: 6,
                background: "#ff4d24",
                marginBottom: 28,
              }}
            />
          </div>
          <div
            style={{
              fontSize: 132,
              fontWeight: 700,
              lineHeight: 0.92,
              letterSpacing: "-0.03em",
              color: "#ece9e2",
            }}
          >
            Edmund Lim
          </div>
          <div
            style={{
              display: "flex",
              marginTop: 28,
              fontSize: 30,
              color: "#93908a",
            }}
          >
            <span>photographer</span>
            <span style={{ color: "#ff4d24", margin: "0 12px" }}>·</span>
            <span>vibe coder</span>
            <span style={{ color: "#ff4d24", margin: "0 12px" }}>·</span>
            <span>tech enthusiast</span>
          </div>
        </div>

        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            fontSize: 22,
            letterSpacing: "0.18em",
            textTransform: "uppercase",
            color: "#55534e",
          }}
        >
          <span>edmundlim.systems</span>
          <span>AF-ON · ISO 400 · ƒ/2.8</span>
        </div>
      </div>
    ),
    { ...size }
  );
}
