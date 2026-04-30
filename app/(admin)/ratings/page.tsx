import { createClient } from "@/lib/supabase-server";

interface VoteRow {
  caption_id: string;
  vote_value: number;
  profile_id: string;
  captions: { content: string; humor_flavor_id: number | null } | null;
}

interface FlavorStat {
  id: number;
  slug: string;
  totalVotes: number;
  upvotes: number;
  downvotes: number;
  netScore: number;
  captionCount: number;
}

interface CaptionStat {
  id: string;
  content: string;
  upvotes: number;
  downvotes: number;
  netScore: number;
}

export default async function RatingsPage() {
  const supabase = await createClient();

  const [totalRes, upvoteRes, flavorsRes, votesRes] = await Promise.all([
    // Exact counts via DB — not affected by row limit
    supabase.from("caption_votes").select("*", { count: "exact", head: true }),
    supabase.from("caption_votes").select("*", { count: "exact", head: true }).eq("vote_value", 1),
    supabase.from("humor_flavors").select("id, slug").order("slug"),
    // Full data for breakdowns — override default 1000-row cap
    supabase
      .from("caption_votes")
      .select("caption_id, vote_value, profile_id, captions(content, humor_flavor_id)")
      .range(0, 49999),
  ]);

  const votes = (votesRes.data ?? []) as unknown as VoteRow[];
  const flavors = (flavorsRes.data ?? []) as { id: number; slug: string }[];

  // ── Summary stats (from exact DB counts, not row-limited array) ─
  const total = totalRes.count ?? 0;
  const upvotes = upvoteRes.count ?? 0;
  const downvotes = total - upvotes;
  const uniqueRaters = new Set(votes.map((v) => v.profile_id)).size;
  const uniqueCaptions = new Set(votes.map((v) => v.caption_id)).size;

  // ── Per-flavor stats ───────────────────────────────────────────
  const flavorMap = new Map<number, { up: number; down: number; captions: Set<string> }>();
  votes.forEach((v) => {
    const fid = v.captions?.humor_flavor_id;
    if (!fid) return;
    if (!flavorMap.has(fid)) flavorMap.set(fid, { up: 0, down: 0, captions: new Set() });
    const entry = flavorMap.get(fid)!;
    if (v.vote_value > 0) entry.up++;
    else if (v.vote_value < 0) entry.down++;
    entry.captions.add(v.caption_id);
  });

  const flavorStats: FlavorStat[] = flavors
    .map((f) => {
      const entry = flavorMap.get(f.id);
      return {
        id: f.id,
        slug: f.slug,
        totalVotes: (entry?.up ?? 0) + (entry?.down ?? 0),
        upvotes: entry?.up ?? 0,
        downvotes: entry?.down ?? 0,
        netScore: (entry?.up ?? 0) - (entry?.down ?? 0),
        captionCount: entry?.captions.size ?? 0,
      };
    })
    .filter((f) => f.totalVotes > 0)
    .sort((a, b) => b.totalVotes - a.totalVotes);

  // ── Per-caption stats ──────────────────────────────────────────
  const captionMap = new Map<string, { content: string; up: number; down: number }>();
  votes.forEach((v) => {
    if (!v.captions?.content) return;
    if (!captionMap.has(v.caption_id))
      captionMap.set(v.caption_id, { content: v.captions.content, up: 0, down: 0 });
    const entry = captionMap.get(v.caption_id)!;
    if (v.vote_value > 0) entry.up++;
    else if (v.vote_value < 0) entry.down++;
  });

  const captionStats: CaptionStat[] = [...captionMap.entries()].map(([id, e]) => ({
    id,
    content: e.content,
    upvotes: e.up,
    downvotes: e.down,
    netScore: e.up - e.down,
  }));

  const topCaptions = [...captionStats]
    .filter((c) => c.upvotes + c.downvotes >= 1)
    .sort((a, b) => b.netScore - a.netScore)
    .slice(0, 10);

  const bottomCaptions = [...captionStats]
    .filter((c) => c.upvotes + c.downvotes >= 1)
    .sort((a, b) => a.netScore - b.netScore)
    .slice(0, 10);

  // ── Styles ─────────────────────────────────────────────────────
  const card = {
    background: "var(--surface)",
    border: "1px solid var(--border)",
    borderRadius: 14,
    padding: "24px 24px 20px",
  };

  const statNum = {
    fontSize: 28,
    fontWeight: 800 as const,
    color: "var(--text)",
    letterSpacing: "-0.02em",
    lineHeight: 1,
    marginBottom: 4,
  };

  const statLabel = { fontSize: 13, fontWeight: 700 as const, color: "var(--text)", marginBottom: 3 };
  const statDesc = { fontSize: 12, color: "var(--text3)" };

  function pct(n: number) {
    return total === 0 ? "0%" : `${Math.round((n / total) * 100)}%`;
  }

  return (
    <div style={{ padding: "36px 40px" }}>
      <div style={{ marginBottom: 32 }}>
        <h1 style={{ fontSize: 26, fontWeight: 800, color: "var(--text)", margin: "0 0 6px", letterSpacing: "-0.01em" }}>
          Caption Ratings
        </h1>
        <p style={{ fontSize: 14, color: "var(--text3)", margin: 0 }}>
          Aggregated stats from all user votes across the rating app.
        </p>
      </div>

      {/* ── Summary cards ── */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: 16, marginBottom: 40 }}>
        {[
          { icon: "◈", value: total, label: "Total Votes", desc: "All upvotes + downvotes" },
          { icon: "👍", value: upvotes, label: "Upvotes", desc: pct(upvotes) + " of votes" },
          { icon: "👎", value: downvotes, label: "Downvotes", desc: pct(downvotes) + " of votes" },
          { icon: "◕", value: uniqueRaters, label: "Unique Raters", desc: "Distinct users who voted" },
          { icon: "◔", value: uniqueCaptions, label: "Captions Rated", desc: "Distinct captions touched" },
        ].map((c) => (
          <div key={c.label} style={card}>
            <div style={{ fontSize: 22, marginBottom: 14, color: "var(--text2)" }}>{c.icon}</div>
            <div style={statNum}>{c.value.toLocaleString()}</div>
            <div style={statLabel}>{c.label}</div>
            <div style={statDesc}>{c.desc}</div>
          </div>
        ))}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24, marginBottom: 32 }}>
        {/* ── Top captions ── */}
        <div style={card}>
          <h2 style={{ fontSize: 15, fontWeight: 800, color: "var(--text)", margin: "0 0 16px" }}>
            👍 Top-Rated Captions
          </h2>
          {topCaptions.length === 0 ? (
            <p style={{ fontSize: 13, color: "var(--text3)" }}>No votes yet.</p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {topCaptions.map((c, i) => (
                <div key={c.id} style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
                  <span style={{ fontSize: 11, fontWeight: 700, color: "var(--text3)", width: 18, flexShrink: 0, paddingTop: 3 }}>
                    {i + 1}.
                  </span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontSize: 12, color: "var(--text)", margin: "0 0 3px", overflow: "hidden", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" as const }}>
                      {c.content}
                    </p>
                    <div style={{ fontSize: 11, color: "var(--text3)" }}>
                      <span style={{ color: "var(--success)", fontWeight: 600 }}>+{c.upvotes}</span>
                      {" / "}
                      <span style={{ color: "var(--danger)", fontWeight: 600 }}>−{c.downvotes}</span>
                      {" · net "}
                      <span style={{ fontWeight: 700, color: c.netScore >= 0 ? "var(--success)" : "var(--danger)" }}>
                        {c.netScore > 0 ? "+" : ""}{c.netScore}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ── Bottom captions ── */}
        <div style={card}>
          <h2 style={{ fontSize: 15, fontWeight: 800, color: "var(--text)", margin: "0 0 16px" }}>
            👎 Lowest-Rated Captions
          </h2>
          {bottomCaptions.length === 0 ? (
            <p style={{ fontSize: 13, color: "var(--text3)" }}>No votes yet.</p>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {bottomCaptions.map((c, i) => (
                <div key={c.id} style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
                  <span style={{ fontSize: 11, fontWeight: 700, color: "var(--text3)", width: 18, flexShrink: 0, paddingTop: 3 }}>
                    {i + 1}.
                  </span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontSize: 12, color: "var(--text)", margin: "0 0 3px", overflow: "hidden", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" as const }}>
                      {c.content}
                    </p>
                    <div style={{ fontSize: 11, color: "var(--text3)" }}>
                      <span style={{ color: "var(--success)", fontWeight: 600 }}>+{c.upvotes}</span>
                      {" / "}
                      <span style={{ color: "var(--danger)", fontWeight: 600 }}>−{c.downvotes}</span>
                      {" · net "}
                      <span style={{ fontWeight: 700, color: c.netScore >= 0 ? "var(--success)" : "var(--danger)" }}>
                        {c.netScore > 0 ? "+" : ""}{c.netScore}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── Per-flavor breakdown ── */}
      {flavorStats.length > 0 && (
        <div style={card}>
          <h2 style={{ fontSize: 15, fontWeight: 800, color: "var(--text)", margin: "0 0 16px" }}>
            Votes by Humor Flavor
          </h2>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
              <thead>
                <tr>
                  {["Flavor", "Captions Rated", "Upvotes", "Downvotes", "Net Score", "Total Votes"].map((h) => (
                    <th key={h} style={{ textAlign: "left", padding: "6px 12px", fontSize: 11, fontWeight: 700, color: "var(--text2)", borderBottom: "1px solid var(--border)", whiteSpace: "nowrap" }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {flavorStats.map((f, i) => (
                  <tr key={f.id} style={{ background: i % 2 === 0 ? "transparent" : "var(--surface2)" }}>
                    <td style={{ padding: "10px 12px", fontWeight: 700, color: "var(--text)" }}>{f.slug}</td>
                    <td style={{ padding: "10px 12px", color: "var(--text2)" }}>{f.captionCount}</td>
                    <td style={{ padding: "10px 12px", color: "var(--success)", fontWeight: 600 }}>+{f.upvotes}</td>
                    <td style={{ padding: "10px 12px", color: "var(--danger)", fontWeight: 600 }}>−{f.downvotes}</td>
                    <td style={{ padding: "10px 12px", fontWeight: 700, color: f.netScore >= 0 ? "var(--success)" : "var(--danger)" }}>
                      {f.netScore > 0 ? "+" : ""}{f.netScore}
                    </td>
                    <td style={{ padding: "10px 12px", color: "var(--text2)" }}>{f.totalVotes}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
