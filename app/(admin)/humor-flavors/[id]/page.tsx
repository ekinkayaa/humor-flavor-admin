"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { createClient } from "@/lib/supabase-client";

interface HumorFlavor {
  id: number;
  name: string;
  description: string | null;
}

interface HumorFlavorStep {
  id: number;
  humor_flavor_id: number;
  step_order: number;
  prompt: string;
  step_name: string | null;
  created_at: string;
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
    fontWeight: 600 as const,
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

/* ─── Step Form Modal ─── */
function StepModal({
  mode,
  step,
  onClose,
  onSave,
}: {
  mode: "create" | "edit";
  step?: HumorFlavorStep;
  onClose: () => void;
  onSave: (data: { step_name: string | null; prompt: string }) => Promise<void>;
}) {
  const [stepName, setStepName] = useState(step?.step_name ?? "");
  const [prompt, setPrompt] = useState(step?.prompt ?? "");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!prompt.trim()) { setError("Prompt is required"); return; }
    setLoading(true);
    setError(null);
    try {
      await onSave({ step_name: stepName.trim() || null, prompt: prompt.trim() });
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Unknown error");
      setLoading(false);
    }
  }

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.55)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100, padding: 24 }}>
      <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 16, padding: "32px 32px 28px", width: "100%", maxWidth: 520 }} className="animate-in">
        <h2 style={{ fontSize: 18, fontWeight: 800, color: "var(--text)", marginBottom: 20 }}>
          {mode === "create" ? "New Step" : "Edit Step"}
        </h2>
        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div>
            <label style={S.label}>Step Name (optional)</label>
            <input
              value={stepName}
              onChange={(e) => setStepName(e.target.value)}
              placeholder="e.g. Describe the image"
              style={S.input}
              autoFocus
            />
          </div>
          <div>
            <label style={S.label}>Prompt *</label>
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="Write the prompt for this step. Use {input} to reference the previous step's output."
              rows={6}
              style={{ ...S.input, resize: "vertical" as const, lineHeight: 1.6 }}
            />
            <p style={{ fontSize: 11, color: "var(--text3)", marginTop: 5 }}>
              Tip: use <code style={{ background: "var(--tag-bg)", padding: "1px 5px", borderRadius: 4 }}>{"{input}"}</code> to reference the output from the previous step.
            </p>
          </div>
          {error && <p style={{ fontSize: 13, color: "var(--danger)" }}>{error}</p>}
          <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 4 }}>
            <button type="button" onClick={onClose} style={S.btn("secondary")}>Cancel</button>
            <button type="submit" disabled={loading} style={{ ...S.btn("primary"), opacity: loading ? 0.6 : 1 }}>
              {loading ? "Saving…" : mode === "create" ? "Add Step" : "Save Changes"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

/* ─── Sortable Step Row ─── */
function SortableStepRow({
  step,
  index,
  total,
  onEdit,
  onDelete,
  deleting,
}: {
  step: HumorFlavorStep;
  index: number;
  total: number;
  onEdit: () => void;
  onDelete: () => void;
  deleting: boolean;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: step.id });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    background: isDragging ? "var(--step-dragging)" : "var(--step-bg)",
    border: `1px solid ${isDragging ? "var(--step-dragging-border)" : "var(--step-border)"}`,
    borderRadius: 10,
    padding: "16px 18px",
    display: "flex",
    gap: 14,
    alignItems: "flex-start",
    cursor: "default",
  };

  return (
    <div ref={setNodeRef} style={style}>
      {/* Drag handle */}
      <div
        {...attributes}
        {...listeners}
        title="Drag to reorder"
        style={{
          cursor: "grab",
          color: "var(--drag-handle)",
          fontSize: 16,
          lineHeight: 1,
          paddingTop: 2,
          flexShrink: 0,
          userSelect: "none",
        }}
      >
        ⠿
      </div>

      {/* Step number badge */}
      <div
        style={{
          width: 28,
          height: 28,
          borderRadius: "50%",
          background: "var(--btn-primary-bg)",
          color: "var(--btn-primary-text)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 12,
          fontWeight: 800,
          flexShrink: 0,
          marginTop: 1,
        }}
      >
        {index + 1}
      </div>

      {/* Content */}
      <div style={{ flex: 1, minWidth: 0 }}>
        {step.step_name && (
          <div style={{ fontSize: 13, fontWeight: 700, color: "var(--text)", marginBottom: 6 }}>
            {step.step_name}
          </div>
        )}
        <pre
          style={{
            fontSize: 13,
            color: "var(--text2)",
            whiteSpace: "pre-wrap",
            wordBreak: "break-word",
            margin: 0,
            fontFamily: "inherit",
            lineHeight: 1.6,
          }}
        >
          {step.prompt}
        </pre>
      </div>

      {/* Actions */}
      <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
        <button onClick={onEdit} style={S.btn("secondary", true)}>Edit</button>
        <button
          onClick={onDelete}
          disabled={deleting}
          style={{ ...S.btn("danger", true), opacity: deleting ? 0.5 : 1 }}
        >
          {deleting ? "…" : "Delete"}
        </button>
      </div>
    </div>
  );
}

/* ─── Main Page ─── */
export default function FlavorDetailPage() {
  const params = useParams();
  const router = useRouter();
  const flavorId = Number(params.id);
  const supabase = createClient();

  const [flavor, setFlavor] = useState<HumorFlavor | null>(null);
  const [steps, setSteps] = useState<HumorFlavorStep[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [editStep, setEditStep] = useState<HumorFlavorStep | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const load = useCallback(async () => {
    const [flavorRes, stepsRes] = await Promise.all([
      supabase.from("humor_flavors").select("*").eq("id", flavorId).single(),
      supabase
        .from("humor_flavor_steps")
        .select("*")
        .eq("humor_flavor_id", flavorId)
        .order("step_order", { ascending: true }),
    ]);
    if (flavorRes.error) { setError(flavorRes.error.message); setLoading(false); return; }
    setFlavor(flavorRes.data as HumorFlavor);
    setSteps((stepsRes.data ?? []) as HumorFlavorStep[]);
    setLoading(false);
  }, [flavorId]);

  useEffect(() => { load(); }, [load]);

  async function handleCreateStep(data: { step_name: string | null; prompt: string }) {
    const nextOrder = steps.length > 0 ? Math.max(...steps.map((s) => s.step_order)) + 1 : 1;
    const { data: created, error } = await supabase
      .from("humor_flavor_steps")
      .insert({ humor_flavor_id: flavorId, step_order: nextOrder, ...data })
      .select()
      .single();
    if (error) throw error;
    setSteps((prev) => [...prev, created as HumorFlavorStep]);
    setShowCreate(false);
  }

  async function handleEditStep(data: { step_name: string | null; prompt: string }) {
    if (!editStep) return;
    const { data: updated, error } = await supabase
      .from("humor_flavor_steps")
      .update(data)
      .eq("id", editStep.id)
      .select()
      .single();
    if (error) throw error;
    setSteps((prev) => prev.map((s) => (s.id === editStep.id ? (updated as HumorFlavorStep) : s)));
    setEditStep(null);
  }

  async function handleDeleteStep(id: number) {
    if (!confirm("Delete this step?")) return;
    setDeletingId(id);
    const { error } = await supabase.from("humor_flavor_steps").delete().eq("id", id);
    setDeletingId(null);
    if (error) { alert(error.message); return; }
    // Re-order remaining steps sequentially
    const remaining = steps.filter((s) => s.id !== id);
    const reordered = remaining.map((s, i) => ({ ...s, step_order: i + 1 }));
    setSteps(reordered);
    // Persist new orders
    await Promise.all(
      reordered.map((s) =>
        supabase.from("humor_flavor_steps").update({ step_order: s.step_order }).eq("id", s.id)
      )
    );
  }

  async function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = steps.findIndex((s) => s.id === active.id);
    const newIndex = steps.findIndex((s) => s.id === over.id);
    const reordered = arrayMove(steps, oldIndex, newIndex).map((s, i) => ({
      ...s,
      step_order: i + 1,
    }));
    setSteps(reordered);

    setSaving(true);
    await Promise.all(
      reordered.map((s) =>
        supabase.from("humor_flavor_steps").update({ step_order: s.step_order }).eq("id", s.id)
      )
    );
    setSaving(false);
  }

  if (loading) {
    return (
      <div style={{ padding: "36px 40px", color: "var(--text3)", fontSize: 14 }}>
        Loading…
      </div>
    );
  }

  if (error || !flavor) {
    return (
      <div style={{ padding: "36px 40px" }}>
        <div style={{ color: "var(--danger)", fontSize: 14, marginBottom: 16 }}>
          {error ?? "Flavor not found."}
        </div>
        <Link href="/humor-flavors" style={{ fontSize: 13, color: "var(--text2)" }}>
          ← Back to flavors
        </Link>
      </div>
    );
  }

  return (
    <div style={{ padding: "36px 40px" }}>
      {showCreate && (
        <StepModal mode="create" onClose={() => setShowCreate(false)} onSave={handleCreateStep} />
      )}
      {editStep && (
        <StepModal mode="edit" step={editStep} onClose={() => setEditStep(null)} onSave={handleEditStep} />
      )}

      {/* Breadcrumb */}
      <div style={{ marginBottom: 20 }}>
        <Link
          href="/humor-flavors"
          style={{ fontSize: 13, color: "var(--text3)", textDecoration: "none" }}
        >
          ← Humor Flavors
        </Link>
      </div>

      {/* Flavor header */}
      <div
        style={{
          background: "var(--surface)",
          border: "1px solid var(--border)",
          borderRadius: 14,
          padding: "24px 28px",
          marginBottom: 28,
        }}
      >
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }}>
          <div>
            <div style={{ marginBottom: 8 }}>
              <h1 style={{ fontSize: 22, fontWeight: 800, color: "var(--text)", margin: 0 }}>
                {flavor.name}
              </h1>
            </div>
            {flavor.description && (
              <p style={{ fontSize: 14, color: "var(--text2)", margin: 0 }}>{flavor.description}</p>
            )}
          </div>
          <Link
            href={`/test-flavor?flavorId=${flavor.id}`}
            style={{ ...S.btn("secondary"), textDecoration: "none", display: "inline-block", whiteSpace: "nowrap" }}
          >
            ◎ Test This Flavor
          </Link>
        </div>
      </div>

      {/* Steps section */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
        <div>
          <h2 style={{ fontSize: 17, fontWeight: 800, color: "var(--text)", margin: "0 0 3px" }}>
            Steps
          </h2>
          <p style={{ fontSize: 13, color: "var(--text3)", margin: 0 }}>
            {steps.length} step{steps.length !== 1 ? "s" : ""} · drag to reorder
            {saving && <span style={{ marginLeft: 8, color: "var(--text3)" }}>Saving…</span>}
          </p>
        </div>
        <button onClick={() => setShowCreate(true)} style={S.btn("primary")}>
          + Add Step
        </button>
      </div>

      {steps.length === 0 ? (
        <div
          style={{
            background: "var(--surface)",
            border: "1px dashed var(--border)",
            borderRadius: 12,
            padding: "48px 32px",
            textAlign: "center",
            color: "var(--text3)",
            fontSize: 14,
          }}
        >
          <div style={{ fontSize: 24, marginBottom: 12 }}>◔</div>
          No steps yet. Add a step to get started.
        </div>
      ) : (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext items={steps.map((s) => s.id)} strategy={verticalListSortingStrategy}>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {steps.map((step, index) => (
                <SortableStepRow
                  key={step.id}
                  step={step}
                  index={index}
                  total={steps.length}
                  onEdit={() => setEditStep(step)}
                  onDelete={() => handleDeleteStep(step.id)}
                  deleting={deletingId === step.id}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      )}

      {/* Step flow visualization */}
      {steps.length > 1 && (
        <div
          style={{
            marginTop: 32,
            background: "var(--surface)",
            border: "1px solid var(--border)",
            borderRadius: 14,
            padding: "20px 24px",
          }}
        >
          <h3 style={{ fontSize: 14, fontWeight: 700, color: "var(--text)", marginBottom: 14 }}>
            Pipeline Flow
          </h3>
          <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
            {steps.map((step, i) => (
              <div key={step.id} style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <div
                  style={{
                    background: "var(--tag-bg)",
                    border: "1px solid var(--border)",
                    borderRadius: 8,
                    padding: "6px 12px",
                    fontSize: 12,
                    fontWeight: 600,
                    color: "var(--text2)",
                  }}
                >
                  {i + 1}. {step.step_name ?? `Step ${i + 1}`}
                </div>
                {i < steps.length - 1 && (
                  <span style={{ color: "var(--text3)", fontSize: 14 }}>→</span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
