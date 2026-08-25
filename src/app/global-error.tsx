"use client";

// Last resort: this replaces the root layout, so it has to bring its own
// <html> and <body> and cannot rely on the app's styles being applied.
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body
        style={{
          background: "#000000",
          color: "#e4e4e4",
          fontFamily: "system-ui, sans-serif",
          display: "flex",
          minHeight: "100vh",
          alignItems: "center",
          justifyContent: "center",
          padding: "1.5rem",
          margin: 0,
        }}
      >
        <div style={{ maxWidth: "22rem", textAlign: "center" }}>
          <p style={{ fontSize: "1.75rem", letterSpacing: "0.1em" }}>MONK</p>
          <p style={{ marginTop: "1rem", color: "#8a8a8a", lineHeight: 1.6 }}>
            MONK could not start. Reloading usually fixes it.
          </p>
          {error.digest && (
            <p style={{ marginTop: "0.75rem", color: "#616161", fontSize: "0.7rem" }}>
              Reference: {error.digest}
            </p>
          )}
          <button
            type="button"
            onClick={reset}
            style={{
              marginTop: "1.5rem",
              minHeight: 44,
              width: "100%",
              borderRadius: "1rem",
              border: 0,
              background: "#ffffff",
              color: "#000000",
              fontSize: "0.875rem",
            }}
          >
            Try again
          </button>
        </div>
      </body>
    </html>
  );
}
