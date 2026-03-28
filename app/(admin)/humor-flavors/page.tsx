"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase-client";

interface HumorFlavor {
  id: number;
  slug: string;
  description: string | null;
  created_datetime_utc: string;
}

const S = {
  btn: (variant: "primary" | "secondary" | "danger" = "primary", small = false) => ({
    padding: small ? "6px 14px" : "9px 18px",
    background:
      variant === "primary"
        ? "var(--btn-primary-bg)"
        : variant === "danger"
        ? "var(--danger-bg)"
        : "var(--btn-secondary-bg)",
    color:
      variant === "primary"
        ? "var(--btn-primary-text)"
        : variant === "danger"
        ? "var(--danger)"
        : "var(--btn-secondary-text)",
    border: variant === "danger" ? "1px solid var(--danger-border)" : "none",
    borderRadius: 8,
    fontSize: small ? 12 : 13,
    fontWeight: 600,
    cursor: "pointer" as const,
  }),
  input: {
    padding: "9px 12px",
    background: "var(--input-bg)",
    border: "1px solid var(--input-border)",
    borderRadius: 8,
    fontSize: 13,
    color: "var(--text)",
    outline: "none",
    width: "100%",
  } as React.CSSProperties,
  label: {
    fontSize: 12,
    fontWeight: 600,
    color: "var(--text2)",
    marginBottom: 5,
    display: "block",
  } as React.CSSProperties,
};

function FlavorModal({
  mode,
  flavor,
  onClose,
  onSave,
}: {
  mode: "create" | "edit";
  flavor?: HumorFlavor;
  onClose: () => void;
  onSave: (f: HumorFlavor) => void;
}) {
  const [slug, setSlug] = useState(flavor?.slug ?? "");
  const [description, setDescription] = useState(flavor?.description ?? "");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const supabase = createClient();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!slug.trim()) { setError("Slug / name is required"); return; }
    setLoading(true);
    setError(null);

    const payload = { slug: slug.trim(), description: description.trim() || null };
    const { data, error } =
      mode === "create"
        ? await supabase.from("humor_flavors").insert(payload).select().single()
        : await supabase.from("humor_flavors").update(payload).eq("id", flavor!.id).select().single();

    setLoading(false);
    if (error) { setError(error.message); return; }
    onSave(data as HumorFlavor);
  }

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100, padding: 24 }}>
      <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 16, padding: "32px 32px 28px", width: "100%", maxWidth: 460 }} className="animate-in">
        <h2 style={{ fontSize: 18, fontWeight: 800, color: "var(--text)", marginBottom: 20 }}>
          {mode === "create" ? "New Humor Flavor" : "Edit Humor Flavor"}
        </h2>
        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div>
            <label style={S.label}>Slug / Name *</label>
            <input
              value={slug}
              onChange={(e) => setSlug(e.target.value)}
              placeholder="e.g. deadpan-office-humor"
              style={S.input}
              autoFocus
            />
          </div>
          <div>
            <label style={S.label}>Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What makes this flavor unique?"
              rows={3}
              style={{ ...S.input, resize: "vertical" as const }}
            />
          </div>
          {error && <p style={{ fontSize: 13, color: "var(--danger)" }}>{error}</p>}
          <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 4 }}>
            <button type="button" onClick={onClose} style={S.btn("secondary")}>Cancel</button>
            <button type="submit" disabled={loading} style={{ ...S.btn("primary"), opacity: loading ? 0.6 : 1 }}>
              {loading ? "Saving…" : mode === "create" ? "Create Flavor" : "Save Changes"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function HumorFlavorsPage() {
  const [flavors, setFlavors] = useState<HumorFlavor[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [modal, setModal] = useState<{ mode: "create" | "edit"; flavor?: HumorFlavor } | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const supabase = createClient();

  useEffect(() => {
    (async () => {
      const { data, error } = await supabase
        .from("humor_flavors")
        .select("id, slug, description, created_datetime_utc")
        .order("created_datetime_utc", { ascending: false });
      if (error) setError(error.message);
      else setFlavors(data ?? []);
      setLoading(false);
    })();
  }, []);

  async function handleDelete(id: number) {
    if (!confirm("Delete this humor flavor? This will also delete all its steps.")) return;
    setDeletingId(id);
    const { error } = await supabase.from("humor_flavors").delete().eq("id", id);
    setDeletingId(null);
    if (error) { alert(error.message); return; }
    setFlavors((prev) => prev.filter((f) => f.id !== id));
  }

  const filtered = flavors.filter(
    (f) =>
      !search ||
      f.slug.toLowerCase().includes(search.toLowerCase()) ||
      (f.description ?? "").toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div style={{ padding: "36px 40px" }}>
      {modal && (
        <FlavorModal
          mode={modal.mode}
          flavor={modal.flavor}
          onClose={() => setModal(null)}
          onSave={(f) => {
            setFlavors((prev) =>
              modal.mode === "create"
                ? [f, ...prev]
                : prev.map((x) => (x.id === f.id ? f : x))
            );
            setModal(null);
          }}
        />
      )}

      {/* Header */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 28, gap: 16, flexWrap: "wrap" }}>
        <div>
          <h1 style={{ fontSize: 26, fontWeight: 800, color: "var(--text)", margin: "0 0 6px", letterSpacing: "-0.01em" }}>
            Humor Flavors
          </h1>
          <p style={{ fontSize: 14, color: "var(--text3)", margin: 0 }}>
            {flavors.length} flavor{flavors.length !== 1 ? "s" : ""}
          </p>
        </div>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search…"
            style={{ padding: "8px 14px", borderRadius: 8, border: "1px solid var(--input-border)", fontSize: 13, outline: "none", width: 200, background: "var(--input-bg)", color: "var(--text)" }}
          />
          <button onClick={() => setModal({ mode: "create" })} style={S.btn("primary")}>
            + New Flavor
          </button>
        </div>
      </div>

      {error && (
        <div style={{ background: "var(--danger-bg)", border: "1px solid var(--danger-border)", borderRadius: 10, padding: "12px 16px", marginBottom: 20, fontSize: 13, color: "var(--danger-text)" }}>
          {error}
        </div>
      )}

      {loading ? (
        <div style={{ padding: 48, textAlign: "center", color: "var(--text3)", fontSize: 14 }}>Loading…</div>
      ) : filtered.length === 0 ? (
        <div style={{ padding: 48, textAlign: "center", color: "var(--text3)", fontSize: 14 }}>
          {search ? "No matching flavors." : "No flavors yet. Create one!"}
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {filtered.map((flavor) => (
            <div
              key={flavor.id}
              style={{
                background: "var(--surface)",
                border: "1px solid var(--border)",
                borderRadius: 12,
                padding: "18px 20px",
                display: "flex",
                alignItems: "center",
                gap: 16,
                flexWrap: "wrap",
              }}
            >
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 15, fontWeight: 700, color: "var(--text)", marginBottom: 3 }}>
                  {flavor.slug}
                </div>
                {flavor.description && (
                  <div style={{ fontSize: 13, color: "var(--text3)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 480 }}>
                    {flavor.description}
                  </div>
                )}
              </div>

              <div style={{ fontSize: 12, color: "var(--text3)", flexShrink: 0 }}>
                {new Date(flavor.created_datetime_utc).toLocaleDateString()}
              </div>

              <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
                <Link
                  href={`/humor-flavors/${flavor.id}`}
                  style={{ ...S.btn("secondary", true), textDecoration: "none", display: "inline-block" }}
                >
                  Steps
                </Link>
                <button onClick={() => setModal({ mode: "edit", flavor })} style={S.btn("secondary", true)}>
                  Edit
                </button>
                <button
                  onClick={() => handleDelete(flavor.id)}
                  disabled={deletingId === flavor.id}
                  style={{ ...S.btn("danger", true), opacity: deletingId === flavor.id ? 0.5 : 1 }}
                >
                  {deletingId === flavor.id ? "…" : "Delete"}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
