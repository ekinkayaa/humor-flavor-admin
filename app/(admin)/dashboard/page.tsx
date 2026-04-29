import { createClient } from "@/lib/supabase-server";
import Link from "next/link";

export default async function DashboardPage() {
  const supabase = await createClient();

  const [{ count: flavorsCount }, { count: stepsCount }, { count: votesCount }] = await Promise.all([
    supabase
      .from("humor_flavors")
      .select("*", { count: "exact", head: true }),
    supabase
      .from("humor_flavor_steps")
      .select("*", { count: "exact", head: true }),
    supabase
      .from("caption_votes")
      .select("*", { count: "exact", head: true }),
  ]);

  const cards = [
    {
      href: "/humor-flavors",
      label: "Humor Flavors",
      count: flavorsCount ?? 0,
      icon: "◕",
      desc: "Prompt chain configurations",
    },
    {
      href: "/humor-flavors",
      label: "Flavor Steps",
      count: stepsCount ?? 0,
      icon: "◔",
      desc: "Individual chain steps",
    },
    {
      href: "/ratings",
      label: "Total Votes",
      count: votesCount ?? 0,
      icon: "◈",
      desc: "Caption votes from users",
    },
    {
      href: "/test-flavor",
      label: "Test Flavor",
      count: null,
      icon: "◎",
      desc: "Generate captions via API",
    },
  ];

  return (
    <div style={{ padding: "36px 40px" }}>
      <div style={{ marginBottom: 32 }}>
        <h1
          style={{
            fontSize: 26,
            fontWeight: 800,
            color: "var(--text)",
            margin: "0 0 6px",
            letterSpacing: "-0.01em",
          }}
        >
          Dashboard
        </h1>
        <p style={{ fontSize: 14, color: "var(--text3)", margin: 0 }}>
          Humor Flavor Admin Panel
        </p>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))",
          gap: 16,
          marginBottom: 40,
        }}
      >
        {cards.map((card) => (
          <Link
            key={card.href + card.label}
            href={card.href}
            style={{
              background: "var(--surface)",
              border: "1px solid var(--border)",
              borderRadius: 14,
              padding: "24px 24px 20px",
              textDecoration: "none",
              display: "block",
              transition: "border-color 0.15s",
            }}
          >
            <div
              style={{
                fontSize: 22,
                marginBottom: 14,
                color: "var(--text2)",
              }}
            >
              {card.icon}
            </div>
            <div
              style={{
                fontSize: 22,
                fontWeight: 800,
                color: "var(--text)",
                letterSpacing: "-0.02em",
                lineHeight: 1,
                marginBottom: 4,
              }}
            >
              {card.count !== null ? card.count : "→"}
            </div>
            <div
              style={{ fontSize: 13, fontWeight: 700, color: "var(--text)", marginBottom: 3 }}
            >
              {card.label}
            </div>
            <div style={{ fontSize: 12, color: "var(--text3)" }}>
              {card.desc}
            </div>
          </Link>
        ))}
      </div>

      {/* Quick links */}
      <div
        style={{
          background: "var(--surface)",
          border: "1px solid var(--border)",
          borderRadius: 14,
          padding: "24px 28px",
        }}
      >
        <h2
          style={{
            fontSize: 15,
            fontWeight: 700,
            color: "var(--text)",
            marginBottom: 16,
          }}
        >
          Quick Actions
        </h2>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <Link
            href="/humor-flavors"
            style={{
              padding: "8px 16px",
              background: "var(--btn-primary-bg)",
              color: "var(--btn-primary-text)",
              borderRadius: 8,
              fontSize: 13,
              fontWeight: 600,
              textDecoration: "none",
            }}
          >
            Manage Flavors
          </Link>
          <Link
            href="/ratings"
            style={{
              padding: "8px 16px",
              background: "var(--btn-secondary-bg)",
              color: "var(--btn-secondary-text)",
              borderRadius: 8,
              fontSize: 13,
              fontWeight: 600,
              textDecoration: "none",
            }}
          >
            View Ratings
          </Link>
          <Link
            href="/test-flavor"
            style={{
              padding: "8px 16px",
              background: "var(--btn-secondary-bg)",
              color: "var(--btn-secondary-text)",
              borderRadius: 8,
              fontSize: 13,
              fontWeight: 600,
              textDecoration: "none",
            }}
          >
            Test a Flavor
          </Link>
        </div>
      </div>
    </div>
  );
}
