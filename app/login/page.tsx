"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase-client";

export default function LoginPage() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const supabase = createClient();

  async function handleGoogleLogin() {
    try {
      setLoading(true);
      setError(null);
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
          queryParams: { access_type: "offline", prompt: "consent" },
        },
      });
      if (error) {
        setError(error.message);
        setLoading(false);
      }
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Unknown error");
      setLoading(false);
    }
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#0f0f0f",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "0 24px",
      }}
    >
      <div
        style={{
          background: "#1a1a1a",
          border: "1px solid rgba(255,255,255,0.08)",
          borderRadius: 20,
          padding: "48px 48px 40px",
          width: "100%",
          maxWidth: 380,
          textAlign: "center",
        }}
      >
        <div
          style={{
            fontSize: 13,
            fontWeight: 700,
            color: "rgba(255,255,255,0.4)",
            letterSpacing: "0.12em",
            textTransform: "uppercase",
            marginBottom: 16,
          }}
        >
          almostcrackd.ai
        </div>

        <h1
          style={{
            fontSize: 26,
            fontWeight: 800,
            color: "#fff",
            margin: "0 0 10px",
            letterSpacing: "-0.01em",
          }}
        >
          Humor Flavor Admin
        </h1>

        <p
          style={{
            fontSize: 14,
            color: "rgba(255,255,255,0.4)",
            margin: "0 0 36px",
            lineHeight: 1.6,
          }}
        >
          Access requires a superadmin or matrix admin account.
        </p>

        {error && (
          <div
            style={{
              background: "#3f1212",
              border: "1px solid #7f1d1d",
              borderRadius: 8,
              padding: "10px 14px",
              marginBottom: 20,
              fontSize: 13,
              color: "#fca5a5",
            }}
          >
            {error}
          </div>
        )}

        <button
          onClick={handleGoogleLogin}
          disabled={loading}
          style={{
            width: "100%",
            padding: "14px 24px",
            background: loading ? "#333" : "#fff",
            color: loading ? "rgba(255,255,255,0.4)" : "#111",
            border: "none",
            borderRadius: 10,
            fontSize: 15,
            fontWeight: 700,
            cursor: loading ? "not-allowed" : "pointer",
            transition: "background 0.15s",
            letterSpacing: "0.01em",
          }}
        >
          {loading ? "Signing in…" : "Sign in with Google"}
        </button>
      </div>
    </div>
  );
}
