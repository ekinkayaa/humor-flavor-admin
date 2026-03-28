export default function AuthCodeErrorPage() {
  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#0f0f0f",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 24,
      }}
    >
      <div
        style={{
          background: "#1a1a1a",
          border: "1px solid rgba(255,255,255,0.08)",
          borderRadius: 16,
          padding: "40px 40px 36px",
          maxWidth: 360,
          textAlign: "center",
        }}
      >
        <div style={{ fontSize: 32, marginBottom: 16 }}>⚠️</div>
        <h1
          style={{
            fontSize: 20,
            fontWeight: 800,
            color: "#fff",
            marginBottom: 10,
          }}
        >
          Auth Error
        </h1>
        <p style={{ fontSize: 14, color: "rgba(255,255,255,0.4)", marginBottom: 24 }}>
          Could not complete sign-in. Please try again.
        </p>
        <a
          href="/login"
          style={{
            display: "inline-block",
            padding: "10px 24px",
            background: "#fff",
            color: "#111",
            borderRadius: 8,
            fontSize: 14,
            fontWeight: 700,
            textDecoration: "none",
          }}
        >
          Back to Login
        </a>
      </div>
    </div>
  );
}
