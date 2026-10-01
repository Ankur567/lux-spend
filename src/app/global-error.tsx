"use client";

export default function GlobalError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <html lang="en">
      <body style={{ fontFamily: "system-ui, sans-serif", display: "grid", placeItems: "center", minHeight: "100dvh", margin: 0, background: "#faf7f2", color: "#1c1917" }}>
        <div style={{ textAlign: "center", padding: 24 }}>
          <h1 style={{ fontSize: 28, fontWeight: 600 }}>Something went wrong</h1>
          <p style={{ color: "#78716c" }}>Your data is safe. Please try again.</p>
          <button type="button" onClick={reset} style={{ marginTop: 16, height: 48, padding: "0 20px", borderRadius: 16, border: 0, background: "#1c1917", color: "#faf7f2", fontSize: 16 }}>
            Try again
          </button>
        </div>
      </body>
    </html>
  );
}
