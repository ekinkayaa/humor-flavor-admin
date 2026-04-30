import { createClient } from "@/lib/supabase-server";
import Link from "next/link";

export default async function DashboardPage() {
  const supabase = await createClient();

  const [
    { count: flavorsCount },
    { count: stepsCount },
    { count: votesCount },
    { count: upvoteCount },
    { data: recentFlavors },
    { data: topFlavors },
  ] = await Promise.all([
    supabase.from("humor_flavors").select("*", { count: "exact", head: true }),
    supabase.from("humor_flavor_steps").select("*", { count: "exact", head: true }),
    supabase.from("caption_votes").select("*", { count: "exact", head: true }),
    supabase.from("caption_votes").select("*", { count: "exact", head: true }).eq("vote_value", 1),
    supabase
      .from("humor_flavors")
      .select("id, slug, description, created_datetime_utc")
      .order("created_datetime_utc", { ascending: false })
      .limit(5),
    supabase
      .from("humor_flavor_steps")
      .select("humor_flavor_id, humor_flavors!humor_flavor_id(id, slug)")
      .limit(1000),
  ]);

  const upvotePct = votesCount ? Math.round(((upvoteCount ?? 0) / votesCount) * 100) : 0;

  // Count steps per flavor
  const stepMap: Record<number, number> = {};
  for (const s of topFlavors ?? []) {
    const fid = (s as any).humor_flavor_id as number;
    if (fid) stepMap[fid] = (stepMap[fid] ?? 0) + 1;
  }

  const stats = [
    {
      label: "Humor Flavors",
      value: (flavorsCount ?? 0).toLocaleString(),
      sub: "Prompt chain configurations",
      href: "/humor-flavors",
      accent: "#6366f1",
      accentBg: "rgba(99,102,241,0.08)",
      icon: "⛓",
    },
    {
      label: "Flavor Steps",
      value: (stepsCount ?? 0).toLocaleString(),
      sub: `Avg ${flavorsCount ? Math.round((stepsCount ?? 0) / flavorsCount) : 0} steps/flavor`,
      href: "/humor-flavors",
      accent: "#0ea5e9",
      accentBg: "rgba(14,165,233,0.08)",
      icon: "◎",
    },
    {
      label: "Caption Votes",
      value: (votesCount ?? 0).toLocaleString(),
      sub: `${upvotePct}% upvotes`,
      href: "/ratings",
      accent: "#16a34a",
      accentBg: "rgba(22,163,74,0.08)",
      icon: "↑↓",
    },
  ];

  return (
    <div style={{ padding: "36px 40px", maxWidth: "100%", boxSizing: "border-box" }}>

      {/* Header */}
      <div style={{ marginBottom: 36 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 6 }}>
          <div style={{
            width: 36, height: 36, borderRadius: 10,
            background: "linear-gradient(135deg, #6366f1, #8b5cf6)",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 16, color: "#fff", flexShrink: 0,
          }}>⛓</div>
          <h1 style={{ fontSize: 24, fontWeight: 800, color: "var(--text)", margin: 0, letterSpacing: "-0.02em" }}>
            Prompt Chain Studio
          </h1>
        </div>
        <p style={{ fontSize: 14, color: "var(--text3)", margin: "0 0 0 48px" }}>
          almostcrackd.ai · {(flavorsCount ?? 0)} flavors · {(stepsCount ?? 0)} steps
        </p>
      </div>

      {/* Stat cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 16, marginBottom: 24 }}>
        {stats.map((s) => (
          <Link
            key={s.label}
            href={s.href}
            style={{ textDecoration: "none" }}
          >
            <div style={{
              background: "var(--surface)",
              border: "1px solid var(--border)",
              borderRadius: 16,
              padding: "22px 24px",
              position: "relative",
              overflow: "hidden",
              transition: "transform 0.12s, box-shadow 0.12s",
            }}>
              {/* Accent top bar */}
              <div style={{
                position: "absolute", top: 0, left: 0, right: 0, height: 3,
                background: s.accent, borderRadius: "16px 16px 0 0",
              }} />
              {/* Icon badge */}
              <div style={{
                width: 38, height: 38, borderRadius: 10,
                background: s.accentBg,
                border: `1px solid ${s.accent}22`,
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 15, color: s.accent, marginBottom: 16, fontWeight: 700,
              }}>
                {s.icon}
              </div>
              <div style={{ fontSize: 30, fontWeight: 800, color: "var(--text)", letterSpacing: "-0.03em", lineHeight: 1, marginBottom: 6 }}>
                {s.value}
              </div>
              <div style={{ fontSize: 13, fontWeight: 700, color: "var(--text)", marginBottom: 2 }}>{s.label}</div>
              <div style={{ fontSize: 12, color: "var(--text3)" }}>{s.sub}</div>
            </div>
          </Link>
        ))}
      </div>

      {/* Upvote sentiment bar */}
      {(votesCount ?? 0) > 0 && (
        <div style={{
          background: "var(--surface)", border: "1px solid var(--border)",
          borderRadius: 16, padding: "18px 24px", marginBottom: 32,
        }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: "var(--text)" }}>Vote Sentiment</span>
            <span style={{ fontSize: 12, color: "var(--text3)" }}>
              {(upvoteCount ?? 0).toLocaleString()} upvotes · {((votesCount ?? 0) - (upvoteCount ?? 0)).toLocaleString()} downvotes
            </span>
          </div>
          <div style={{ height: 8, borderRadius: 999, background: "var(--border)", overflow: "hidden" }}>
            <div style={{
              height: "100%", width: `${upvotePct}%`,
              background: "linear-gradient(90deg, #16a34a, #4ade80)",
              borderRadius: 999, transition: "width 0.5s ease",
            }} />
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", marginTop: 6 }}>
            <span style={{ fontSize: 11, color: "#16a34a", fontWeight: 700 }}>{upvotePct}% positive</span>
            <span style={{ fontSize: 11, color: "var(--text3)", fontWeight: 600 }}>{100 - upvotePct}% negative</span>
          </div>
        </div>
      )}

      {/* Two-column bottom */}
      <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr) minmax(0, 1fr)", gap: 20 }}>

        {/* Recent Flavors */}
        <div style={{
          background: "var(--surface)", border: "1px solid var(--border)",
          borderRadius: 16, padding: "22px 24px",
        }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 18 }}>
            <h2 style={{ fontSize: 14, fontWeight: 800, color: "var(--text)", margin: 0 }}>Recent Flavors</h2>
            <Link href="/humor-flavors" style={{ fontSize: 12, color: "var(--text3)", textDecoration: "none", fontWeight: 600 }}>
              View all →
            </Link>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
            {(recentFlavors ?? []).length === 0 ? (
              <p style={{ fontSize: 13, color: "var(--text3)" }}>No flavors yet.</p>
            ) : (recentFlavors ?? []).map((f: any, i: number) => (
              <Link
                key={f.id}
                href={`/humor-flavors/${f.id}`}
                style={{
                  display: "flex", alignItems: "center", gap: 12,
                  padding: "10px 0",
                  borderBottom: i < (recentFlavors ?? []).length - 1 ? "1px solid var(--border2)" : "none",
                  textDecoration: "none",
                }}
              >
                <div style={{
                  width: 32, height: 32, borderRadius: 8, flexShrink: 0,
                  background: `hsl(${(f.id * 47) % 360}, 65%, 55%)`,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 12, fontWeight: 800, color: "#fff",
                }}>
                  {f.slug[0]?.toUpperCase()}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: "var(--text)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                    {f.slug}
                  </div>
                  {f.description && (
                    <div style={{ fontSize: 11, color: "var(--text3)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {f.description}
                    </div>
                  )}
                </div>
                <div style={{ fontSize: 11, color: "var(--text3)", flexShrink: 0 }}>
                  {f.created_datetime_utc ? new Date(f.created_datetime_utc).toLocaleDateString() : ""}
                </div>
              </Link>
            ))}
          </div>
        </div>

        {/* Actions */}
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {[
            {
              href: "/humor-flavors",
              title: "Manage Flavors",
              desc: "Create, edit, reorder, and duplicate prompt chains",
              icon: "⛓",
              accent: "#6366f1",
              accentBg: "rgba(99,102,241,0.08)",
            },
            {
              href: "/test-flavor",
              title: "Test a Flavor",
              desc: "Upload an image and generate captions via the API",
              icon: "◎",
              accent: "#0ea5e9",
              accentBg: "rgba(14,165,233,0.08)",
            },
            {
              href: "/ratings",
              title: "View Ratings",
              desc: "See how users are voting on generated captions",
              icon: "↑↓",
              accent: "#16a34a",
              accentBg: "rgba(22,163,74,0.08)",
            },
          ].map((action) => (
            <Link
              key={action.href}
              href={action.href}
              style={{ textDecoration: "none" }}
            >
              <div style={{
                background: "var(--surface)", border: "1px solid var(--border)",
                borderRadius: 14, padding: "16px 18px",
                display: "flex", alignItems: "center", gap: 14,
                transition: "border-color 0.12s",
              }}>
                <div style={{
                  width: 40, height: 40, borderRadius: 10, flexShrink: 0,
                  background: action.accentBg,
                  border: `1px solid ${action.accent}22`,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 16, color: action.accent, fontWeight: 700,
                }}>
                  {action.icon}
                </div>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: "var(--text)", marginBottom: 2 }}>{action.title}</div>
                  <div style={{ fontSize: 12, color: "var(--text3)" }}>{action.desc}</div>
                </div>
                <div style={{ marginLeft: "auto", fontSize: 16, color: "var(--text3)" }}>→</div>
              </div>
            </Link>
          ))}
        </div>

      </div>
    </div>
  );
}
