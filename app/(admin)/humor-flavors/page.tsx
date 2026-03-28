"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase-client";

interface HumorFlavor {
  id: number;
  name: string;
  description: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
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

function CreateFlavorModal({
  onClose,
  onCreated,
}: {
  onClose: () => void;
  onCreated: (f: HumorFlavor) => void;
}) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [isActive, setIsActive] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const supabase = createClient();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) { setError("Name is required"); return; }
    setLoading(true);
    setError(null);
    const { data, error } = await supabase
      .from("humor_flavors")
      .insert({ name: name.trim(), description: description.trim() || null, is_active: isActive })
      .select()
      .single();
    setLoading(false);
    if (error) { setError(error.message); return; }
    onCreated(data as HumorFlavor);
  }

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100, padding: 24 }}>
      <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 16, padding: "32px 32px 28px", width: "100%", maxWidth: 460 }} className="animate-in">
        <h2 style={{ fontSize: 18, fontWeight: 800, color: "var(--text)", marginBottom: 20 }}>New Humor Flavor</h2>
        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div>
            <label style={S.label}>Name *</label>
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Deadpan Office Humor" style={S.input} autoFocus />
          </div>
          <div>
            <label style={S.label}>Description</label>
            <textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="What makes this flavor unique?" rows={3}
              style={{ ...S.input, resize: "vertical" as const }} />
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <input type="checkbox" id="active-create" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} />
            <label htmlFor="active-create" style={{ fontSize: 13, color: "var(--text)", cursor: "pointer" }}>Active</label>
          </div>
          {error && <p style={{ fontSize: 13, color: "var(--danger)" }}>{error}</p>}
          <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 4 }}>
            <button type="button" onClick={onClose} style={S.btn("secondary")}>Cancel</button>
            <button type="submit" disabled={loading} style={{ ...S.btn("primary"), opacity: loading ? 0.6 : 1 }}>
              {loading ? "Creating…" : "Create Flavor"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function EditFlavorModal({
  flavor,
  onClose,
  onUpdated,
}: {
  flavor: HumorFlavor;
  onClose: () => void;
  onUpdated: (f: HumorFlavor) => void;
}) {
  const [name, setName] = useState(flavor.name);
  const [description, setDescription] = useState(flavor.description ?? "");
  const [isActive, setIsActive] = useState(flavor.is_active);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const supabase = createClient();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) { setError("Name is required"); return; }
    setLoading(true);
    setError(null);
    const { data, error } = await supabase
      .from("humor_flavors")
      .update({ name: name.trim(), description: description.trim() || null, is_active: isActive })
      .eq("id", flavor.id)
      .select()
      .single();
    setLoading(false);
    if (error) { setError(error.message); return; }
    onUpdated(data as HumorFlavor);
  }

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100, padding: 24 }}>
      <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 16, padding: "32px 32px 28px", width: "100%", maxWidth: 460 }} className="animate-in">
        <h2 style={{ fontSize: 18, fontWeight: 800, color: "var(--text)", marginBottom: 20 }}>Edit Humor Flavor</h2>
        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div>
            <label style={S.label}>Name *</label>
            <input value={name} onChange={(e) => setName(e.target.value)} style={S.input} autoFocus />
          </div>
          <div>
            <label style={S.label}>Description</label>
            <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3}
              style={{ ...S.input, resize: "vertical" as const }} />
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <input type="checkbox" id="active-edit" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} />
            <label htmlFor="active-edit" style={{ fontSize: 13, color: "var(--text)", cursor: "pointer" }}>Active</label>
          </div>
          {error && <p style={{ fontSize: 13, color: "var(--danger)" }}>{error}</p>}
          <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 4 }}>
            <button type="button" onClick={onClose} style={S.btn("secondary")}>Cancel</button>
            <button type="submit" disabled={loading} style={{ ...S.btn("primary"), opacity: loading ? 0.6 : 1 }}>
              {loading ? "Saving…" : "Save Changes"}
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
  const [showCreate, setShowCreate] = useState(false);
  const [editFlavor, setEditFlavor] = useState<HumorFlavor | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const supabase = createClient();

  async function loadFlavors() {
    const { data, error } = await supabase
      .from("humor_flavors")
      .select("*")
      .order("id", { ascending: true });
    if (error) setError(error.message);
    else setFlavors(data ?? []);
    setLoading(false);
  }

  useEffect(() => { loadFlavors(); }, []);

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
      f.name.toLowerCase().includes(search.toLowerCase()) ||
      (f.description ?? "").toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div style={{ padding: "36px 40px" }}>
      {showCreate && (
        <CreateFlavorModal
          onClose={() => setShowCreate(false)}
          onCreated={(f) => { setFlavors((prev) => [...prev, f]); setShowCreate(false); }}
        />
      )}
      {editFlavor && (
        <EditFlavorModal
          flavor={editFlavor}
          onClose={() => setEditFlavor(null)}
          onUpdated={(f) => { setFlavors((prev) => prev.map((x) => (x.id === f.id ? f : x))); setEditFlavor(null); }}
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
          <button onClick={() => setShowCreate(true)} style={S.btn("primary")}>
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
              {/* Status badge */}
              <span
                style={{
                  display: "inline-block",
                  padding: "3px 10px",
                  borderRadius: 999,
                  fontSize: 11,
                  fontWeight: 700,
                  background: flavor.is_active ? "var(--success-bg)" : "var(--tag-bg)",
                  color: flavor.is_active ? "var(--success)" : "var(--tag-text)",
                  flexShrink: 0,
                }}
              >
                {flavor.is_active ? "Active" : "Inactive"}
              </span>

              {/* Name + description */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 15, fontWeight: 700, color: "var(--text)", marginBottom: 3 }}>
                  {flavor.name}
                </div>
                {flavor.description && (
                  <div style={{ fontSize: 13, color: "var(--text3)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 480 }}>
                    {flavor.description}
                  </div>
                )}
              </div>

              {/* Created at */}
              <div style={{ fontSize: 12, color: "var(--text3)", flexShrink: 0 }}>
                {new Date(flavor.created_at).toLocaleDateString()}
              </div>

              {/* Actions */}
              <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
                <Link
                  href={`/humor-flavors/${flavor.id}`}
                  style={{ ...S.btn("secondary", true), textDecoration: "none", display: "inline-block" }}
                >
                  Steps
                </Link>
                <button onClick={() => setEditFlavor(flavor)} style={S.btn("secondary", true)}>
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
