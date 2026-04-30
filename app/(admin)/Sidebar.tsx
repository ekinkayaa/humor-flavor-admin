"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase-client";
import { useTheme, type Theme } from "@/lib/theme";

const NAV = [
  {
    label: "Main",
    items: [
      { href: "/dashboard", label: "Dashboard", icon: "◈" },
    ],
  },
  {
    label: "Ratings",
    items: [
      { href: "/ratings", label: "Caption Ratings", icon: "◈" },
    ],
  },
  {
    label: "Humor",
    items: [
      { href: "/humor-flavors", label: "Humor Flavors", icon: "◕" },
      { href: "/test-flavor", label: "Test Flavor", icon: "◎" },
    ],
  },
];

const THEME_OPTIONS: { value: Theme; label: string; icon: string }[] = [
  { value: "light", label: "Light", icon: "☀" },
  { value: "dark", label: "Dark", icon: "☾" },
  { value: "system", label: "System", icon: "⊙" },
];

export default function Sidebar({
  email,
  name,
}: {
  email: string | null;
  name: string;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClient();
  const { theme, setTheme } = useTheme();

  async function handleSignOut() {
    await supabase.auth.signOut();
    router.push("/login");
  }

  return (
    <aside
      style={{
        width: 220,
        background: "var(--sidebar-bg)",
        color: "var(--sidebar-text)",
        display: "flex",
        flexDirection: "column",
        position: "sticky",
        top: 0,
        height: "100vh",
        flexShrink: 0,
        overflowY: "auto",
      }}
    >
      {/* Header */}
      <div
        style={{
          padding: "24px 20px 18px",
          borderBottom: "1px solid var(--sidebar-border)",
        }}
      >
        <div
          style={{
            fontSize: 15,
            fontWeight: 800,
            color: "var(--sidebar-text)",
            letterSpacing: "-0.01em",
          }}
        >
          Prompt Chain Studio
        </div>
        <div
          style={{
            fontSize: 11,
            color: "var(--sidebar-text3)",
            marginTop: 3,
            letterSpacing: "0.04em",
          }}
        >
          almostcrackd.ai
        </div>
      </div>

      {/* Nav */}
      <nav style={{ padding: "10px 10px", flex: 1 }}>
        {NAV.map((group) => (
          <div key={group.label} style={{ marginBottom: 8 }}>
            <div
              style={{
                fontSize: 9,
                fontWeight: 700,
                color: "var(--sidebar-text3)",
                letterSpacing: "0.1em",
                textTransform: "uppercase",
                padding: "8px 12px 4px",
              }}
            >
              {group.label}
            </div>
            {group.items.map(({ href, label, icon }) => {
              const active =
                pathname === href || pathname.startsWith(href + "/");
              return (
                <Link
                  key={href}
                  href={href}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    padding: "7px 12px",
                    borderRadius: 7,
                    marginBottom: 1,
                    fontSize: 13,
                    fontWeight: active ? 700 : 400,
                    color: active
                      ? "var(--sidebar-text)"
                      : "var(--sidebar-text2)",
                    background: active
                      ? "var(--sidebar-active-bg)"
                      : "transparent",
                    textDecoration: "none",
                  }}
                >
                  <span
                    style={{
                      fontSize: 14,
                      width: 18,
                      textAlign: "center",
                      color: active
                        ? "var(--sidebar-text)"
                        : "var(--sidebar-text3)",
                    }}
                  >
                    {icon}
                  </span>
                  {label}
                </Link>
              );
            })}
          </div>
        ))}
      </nav>

      {/* Theme toggle */}
      <div
        style={{
          padding: "12px 16px",
          borderTop: "1px solid var(--sidebar-border)",
        }}
      >
        <div
          style={{
            fontSize: 9,
            fontWeight: 700,
            color: "var(--sidebar-text3)",
            letterSpacing: "0.1em",
            textTransform: "uppercase",
            marginBottom: 8,
            paddingLeft: 4,
          }}
        >
          Theme
        </div>
        <div style={{ display: "flex", gap: 4 }}>
          {THEME_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => setTheme(opt.value)}
              title={opt.label}
              style={{
                flex: 1,
                padding: "6px 0",
                background:
                  theme === opt.value
                    ? "rgba(255,255,255,0.15)"
                    : "rgba(255,255,255,0.05)",
                color:
                  theme === opt.value
                    ? "var(--sidebar-text)"
                    : "var(--sidebar-text3)",
                border:
                  theme === opt.value
                    ? "1px solid rgba(255,255,255,0.2)"
                    : "1px solid transparent",
                borderRadius: 6,
                fontSize: 12,
                cursor: "pointer",
                fontWeight: theme === opt.value ? 700 : 400,
              }}
            >
              {opt.icon}
            </button>
          ))}
        </div>
      </div>

      {/* Footer */}
      <div
        style={{
          padding: "16px 20px 20px",
          borderTop: "1px solid var(--sidebar-border)",
        }}
      >
        {name && (
          <div
            style={{
              fontSize: 13,
              fontWeight: 600,
              color: "var(--sidebar-text)",
              marginBottom: 2,
            }}
          >
            {name}
          </div>
        )}
        <div
          style={{
            fontSize: 11,
            color: "var(--sidebar-text3)",
            marginBottom: 14,
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {email}
        </div>
        <button
          onClick={handleSignOut}
          style={{
            width: "100%",
            padding: "8px 12px",
            background: "rgba(255,255,255,0.07)",
            color: "rgba(255,255,255,0.6)",
            border: "none",
            borderRadius: 6,
            fontSize: 13,
            fontWeight: 500,
            cursor: "pointer",
          }}
        >
          Sign out
        </button>
      </div>
    </aside>
  );
}
