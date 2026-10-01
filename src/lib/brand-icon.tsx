import { ImageResponse } from "next/og";

/** Renders the app mark (a gem on a warm gradient) at any square size. */
export function brandIcon(size: number, { maskable = false }: { maskable?: boolean } = {}) {
  const inset = maskable ? size * 0.2 : size * 0.14;
  const gem = size - inset * 2;
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "linear-gradient(135deg, #2a2320 0%, #1c1917 60%, #3b2a30 100%)",
          borderRadius: maskable ? 0 : size * 0.22,
        }}
      >
        <svg width={gem} height={gem} viewBox="0 0 24 24" fill="none" stroke="#f3c7cf" strokeWidth="1.4" strokeLinejoin="round" strokeLinecap="round">
          <path d="M6 3h12l4 6-10 12L2 9z" fill="rgba(229,143,158,0.18)" />
          <path d="M11 3 8 9l4 12 4-12-3-6" />
          <path d="M2 9h20" />
        </svg>
      </div>
    ),
    { width: size, height: size },
  );
}
