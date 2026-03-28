"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
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
  slug: string;
  description: string | null;
}

interface HumorFlavorStep {
  id: number;
  humor_flavor_id: number;
  order_by: number;
  description: string | null;
  llm_system_prompt: string;
  llm_user_prompt: string;
  llm_model_id: number;
  llm_input_type_id: number;
  llm_output_type_id: number;
  humor_flavor_step_type_id: number;
  llm_temperature: number;
}

interface RefItem { id: number; label: string; }

const S = {
  btn: (variant: "primary" | "secondary" | "danger" = "primary", small = false) => ({
    padding: small ? "6px 14px" : "9px 18px",
    background:
      variant === "primary" ? "var(--btn-primary-bg)"
        : variant === "danger" ? "var(--danger-bg)"
        : "var(--btn-secondary-bg)",
    color:
      variant === "primary" ? "var(--btn-primary-text)"
        : variant === "danger" ? "var(--danger)"
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
  select: {
    padding: "9px 12px",
    background: "var(--input-bg)",
    border: "1px solid var(--input-border)",
    borderRadius: 8,
    fontSize: 13,
    color: "var(--text)",
    outline: "none",
    width: "100%",
  } as React.CSSProperties,
};

/* ─── Step Form Modal ─── */
function StepModal({
  mode,
  step,
  models,
  inputTypes,
  outputTypes,
  stepTypes,
  onClose,
  onSave,
}: {
  mode: "create" | "edit";
  step?: HumorFlavorStep;
  models: RefItem[];
  inputTypes: RefItem[];
  outputTypes: RefItem[];
  stepTypes: RefItem[];
  onClose: () => void;
  onSave: (data: Omit<HumorFlavorStep, "id" | "humor_flavor_id" | "order_by">) => Promise<void>;
}) {
  const [description, setDescription] = useState(step?.description ?? "");
  const [systemPrompt, setSystemPrompt] = useState(step?.llm_system_prompt ?? "");
  const [userPrompt, setUserPrompt] = useState(step?.llm_user_prompt ?? "");
  const [modelId, setModelId] = useState(step?.llm_model_id ?? models[0]?.id ?? 1);
  const [inputTypeId, setInputTypeId] = useState(step?.llm_input_type_id ?? 1);
  const [outputTypeId, setOutputTypeId] = useState(step?.llm_output_type_id ?? 1);
  const [stepTypeId, setStepTypeId] = useState(step?.humor_flavor_step_type_id ?? 3);
  const [temperature, setTemperature] = useState(step?.llm_temperature ?? 1.0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!systemPrompt.trim() && !userPrompt.trim()) {
      setError("At least one prompt (system or user) is required");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      await onSave({
        description: description.trim() || null,
        llm_system_prompt: systemPrompt.trim(),
        llm_user_prompt: userPrompt.trim(),
        llm_model_id: Number(modelId),
        llm_input_type_id: Number(inputTypeId),
        llm_output_type_id: Number(outputTypeId),
        humor_flavor_step_type_id: Number(stepTypeId),
        llm_temperature: Number(temperature),
      });
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Unknown error");
      setLoading(false);
    }
  }

  const fieldRow = (children: React.ReactNode) => (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>{children}</div>
  );

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", display: "flex", alignItems: "flex-start", justifyContent: "center", zIndex: 100, padding: "32px 24px", overflowY: "auto" }}>
      <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 16, padding: "32px 32px 28px", width: "100%", maxWidth: 680, marginBottom: 32 }} className="animate-in">
        <h2 style={{ fontSize: 18, fontWeight: 800, color: "var(--text)", marginBottom: 24 }}>
          {mode === "create" ? "New Step" : "Edit Step"}
        </h2>
        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 16 }}>

          <div>
            <label style={S.label}>Step Description (optional)</label>
            <input value={description} onChange={(e) => setDescription(e.target.value)}
              placeholder="e.g. Describe the image" style={S.input} autoFocus />
          </div>

          {fieldRow(
            <>
              <div>
                <label style={S.label}>Step Type</label>
                <select value={stepTypeId} onChange={(e) => setStepTypeId(Number(e.target.value))} style={S.select}>
                  {stepTypes.map((t) => <option key={t.id} value={t.id}>{t.label}</option>)}
                </select>
              </div>
              <div>
                <label style={S.label}>LLM Model</label>
                <select value={modelId} onChange={(e) => setModelId(Number(e.target.value))} style={S.select}>
                  {models.map((m) => <option key={m.id} value={m.id}>{m.label}</option>)}
                </select>
              </div>
            </>
          )}

          {fieldRow(
            <>
              <div>
                <label style={S.label}>Input Type</label>
                <select value={inputTypeId} onChange={(e) => setInputTypeId(Number(e.target.value))} style={S.select}>
                  {inputTypes.map((t) => <option key={t.id} value={t.id}>{t.label}</option>)}
                </select>
              </div>
              <div>
                <label style={S.label}>Output Type</label>
                <select value={outputTypeId} onChange={(e) => setOutputTypeId(Number(e.target.value))} style={S.select}>
                  {outputTypes.map((t) => <option key={t.id} value={t.id}>{t.label}</option>)}
                </select>
              </div>
            </>
          )}

          <div>
            <label style={S.label}>Temperature ({temperature})</label>
            <input type="range" min={0} max={2} step={0.1} value={temperature}
              onChange={(e) => setTemperature(Number(e.target.value))}
              style={{ width: "100%", accentColor: "var(--btn-primary-bg)" }} />
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "var(--text3)", marginTop: 2 }}>
              <span>0 (precise)</span><span>1 (balanced)</span><span>2 (creative)</span>
            </div>
          </div>

          <div>
            <label style={S.label}>System Prompt</label>
            <textarea value={systemPrompt} onChange={(e) => setSystemPrompt(e.target.value)}
              placeholder="Instructions to the model about its role and behavior…"
              rows={5} style={{ ...S.input, resize: "vertical" as const, lineHeight: 1.6 }} />
          </div>

          <div>
            <label style={S.label}>User Prompt</label>
            <textarea value={userPrompt} onChange={(e) => setUserPrompt(e.target.value)}
              placeholder="The user-facing prompt. Use ${step1Output}, ${step2Output} etc. to reference previous steps."
              rows={5} style={{ ...S.input, resize: "vertical" as const, lineHeight: 1.6 }} />
            <p style={{ fontSize: 11, color: "var(--text3)", marginTop: 5 }}>
              Reference prior steps with <code style={{ background: "var(--tag-bg)", padding: "1px 5px", borderRadius: 4 }}>{"${step1Output}"}</code>, <code style={{ background: "var(--tag-bg)", padding: "1px 5px", borderRadius: 4 }}>{"${step2Output}"}</code>, etc.
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
  modelName,
  stepTypeName,
  onEdit,
  onDelete,
  deleting,
}: {
  step: HumorFlavorStep;
  index: number;
  modelName: string;
  stepTypeName: string;
  onEdit: () => void;
  onDelete: () => void;
  deleting: boolean;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: step.id });

  return (
    <div
      ref={setNodeRef}
      style={{
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
      }}
    >
      {/* Drag handle */}
      <div {...attributes} {...listeners} title="Drag to reorder"
        style={{ cursor: "grab", color: "var(--drag-handle)", fontSize: 16, lineHeight: 1, paddingTop: 4, flexShrink: 0, userSelect: "none" }}>
        ⠿
      </div>

      {/* Step number */}
      <div style={{ width: 28, height: 28, borderRadius: "50%", background: "var(--btn-primary-bg)", color: "var(--btn-primary-text)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 800, flexShrink: 0, marginTop: 1 }}>
        {index + 1}
      </div>

      {/* Content */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 8 }}>
          {step.description && (
            <span style={{ fontSize: 13, fontWeight: 700, color: "var(--text)" }}>{step.description}</span>
          )}
          <span style={{ fontSize: 11, background: "var(--tag-bg)", color: "var(--tag-text)", padding: "2px 8px", borderRadius: 999, fontWeight: 600 }}>{stepTypeName}</span>
          <span style={{ fontSize: 11, background: "var(--tag-bg)", color: "var(--tag-text)", padding: "2px 8px", borderRadius: 999, fontWeight: 600 }}>{modelName}</span>
          <span style={{ fontSize: 11, background: "var(--tag-bg)", color: "var(--tag-text)", padding: "2px 8px", borderRadius: 999, fontWeight: 600 }}>temp {step.llm_temperature}</span>
        </div>
        {step.llm_system_prompt && (
          <div style={{ fontSize: 12, color: "var(--text3)", marginBottom: 4 }}>
            <span style={{ fontWeight: 600, color: "var(--text2)" }}>System: </span>
            {step.llm_system_prompt.length > 120 ? step.llm_system_prompt.slice(0, 120) + "…" : step.llm_system_prompt}
          </div>
        )}
        {step.llm_user_prompt && (
          <div style={{ fontSize: 12, color: "var(--text3)" }}>
            <span style={{ fontWeight: 600, color: "var(--text2)" }}>User: </span>
            {step.llm_user_prompt.length > 120 ? step.llm_user_prompt.slice(0, 120) + "…" : step.llm_user_prompt}
          </div>
        )}
      </div>

      {/* Actions */}
      <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
        <button onClick={onEdit} style={S.btn("secondary", true)}>Edit</button>
        <button onClick={onDelete} disabled={deleting}
          style={{ ...S.btn("danger", true), opacity: deleting ? 0.5 : 1 }}>
          {deleting ? "…" : "Delete"}
        </button>
      </div>
    </div>
  );
}

/* ─── Main Page ─── */
export default function FlavorDetailPage() {
  const params = useParams();
  const flavorId = Number(params.id);
  const supabase = createClient();

  const [flavor, setFlavor] = useState<HumorFlavor | null>(null);
  const [steps, setSteps] = useState<HumorFlavorStep[]>([]);
  const [models, setModels] = useState<RefItem[]>([]);
  const [inputTypes, setInputTypes] = useState<RefItem[]>([]);
  const [outputTypes, setOutputTypes] = useState<RefItem[]>([]);
  const [stepTypes, setStepTypes] = useState<RefItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [modal, setModal] = useState<{ mode: "create" | "edit"; step?: HumorFlavorStep } | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const load = useCallback(async () => {
    const [flavorRes, stepsRes, modelsRes, inputRes, outputRes, stepTypeRes] = await Promise.all([
      supabase.from("humor_flavors").select("id, slug, description").eq("id", flavorId).single(),
      supabase.from("humor_flavor_steps").select("*").eq("humor_flavor_id", flavorId).order("order_by", { ascending: true }),
      supabase.from("llm_models").select("id, name").order("name"),
      supabase.from("llm_input_types").select("id, slug, description").order("id"),
      supabase.from("llm_output_types").select("id, slug, description").order("id"),
      supabase.from("humor_flavor_step_types").select("id, slug, description").order("id"),
    ]);

    if (flavorRes.error) { setError(flavorRes.error.message); setLoading(false); return; }
    setFlavor(flavorRes.data as HumorFlavor);
    setSteps((stepsRes.data ?? []) as HumorFlavorStep[]);
    setModels((modelsRes.data ?? []).map((m: { id: number; name: string }) => ({ id: m.id, label: m.name })));
    setInputTypes((inputRes.data ?? []).map((t: { id: number; description: string }) => ({ id: t.id, label: t.description })));
    setOutputTypes((outputRes.data ?? []).map((t: { id: number; description: string }) => ({ id: t.id, label: t.description })));
    setStepTypes((stepTypeRes.data ?? []).map((t: { id: number; description: string }) => ({ id: t.id, label: t.description })));
    setLoading(false);
  }, [flavorId]);

  useEffect(() => { load(); }, [load]);

  async function handleSaveStep(data: Omit<HumorFlavorStep, "id" | "humor_flavor_id" | "order_by">) {
    const { data: { user } } = await supabase.auth.getUser();

    if (modal?.mode === "create") {
      const nextOrder = steps.length > 0 ? Math.max(...steps.map((s) => s.order_by)) + 1 : 1;
      const { data: created, error } = await supabase
        .from("humor_flavor_steps")
        .insert({ humor_flavor_id: flavorId, order_by: nextOrder, created_by_user_id: user?.id, modified_by_user_id: user?.id, ...data })
        .select()
        .single();
      if (error) throw error;
      setSteps((prev) => [...prev, created as HumorFlavorStep]);
    } else {
      const { data: updated, error } = await supabase
        .from("humor_flavor_steps")
        .update({ modified_by_user_id: user?.id, ...data })
        .eq("id", modal!.step!.id)
        .select()
        .single();
      if (error) throw error;
      setSteps((prev) => prev.map((s) => (s.id === modal!.step!.id ? (updated as HumorFlavorStep) : s)));
    }
    setModal(null);
  }

  async function handleDeleteStep(id: number) {
    if (!confirm("Delete this step?")) return;
    setDeletingId(id);
    const { error } = await supabase.from("humor_flavor_steps").delete().eq("id", id);
    setDeletingId(null);
    if (error) { alert(error.message); return; }
    const remaining = steps.filter((s) => s.id !== id).map((s, i) => ({ ...s, order_by: i + 1 }));
    setSteps(remaining);
    await Promise.all(remaining.map((s) =>
      supabase.from("humor_flavor_steps").update({ order_by: s.order_by }).eq("id", s.id)
    ));
  }

  async function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = steps.findIndex((s) => s.id === active.id);
    const newIndex = steps.findIndex((s) => s.id === over.id);
    const reordered = arrayMove(steps, oldIndex, newIndex).map((s, i) => ({ ...s, order_by: i + 1 }));
    setSteps(reordered);
    setSaving(true);
    await Promise.all(reordered.map((s) =>
      supabase.from("humor_flavor_steps").update({ order_by: s.order_by }).eq("id", s.id)
    ));
    setSaving(false);
  }

  const modelName = (id: number) => models.find((m) => m.id === id)?.label ?? `Model #${id}`;
  const stepTypeName = (id: number) => stepTypes.find((t) => t.id === id)?.label ?? `Type #${id}`;

  if (loading) return <div style={{ padding: "36px 40px", color: "var(--text3)", fontSize: 14 }}>Loading…</div>;
  if (error || !flavor) return (
    <div style={{ padding: "36px 40px" }}>
      <div style={{ color: "var(--danger)", fontSize: 14, marginBottom: 16 }}>{error ?? "Flavor not found."}</div>
      <Link href="/humor-flavors" style={{ fontSize: 13, color: "var(--text2)" }}>← Back</Link>
    </div>
  );

  return (
    <div style={{ padding: "36px 40px" }}>
      {modal && (
        <StepModal
          mode={modal.mode}
          step={modal.step}
          models={models}
          inputTypes={inputTypes}
          outputTypes={outputTypes}
          stepTypes={stepTypes}
          onClose={() => setModal(null)}
          onSave={handleSaveStep}
        />
      )}

      <div style={{ marginBottom: 20 }}>
        <Link href="/humor-flavors" style={{ fontSize: 13, color: "var(--text3)", textDecoration: "none" }}>← Humor Flavors</Link>
      </div>

      {/* Flavor header */}
      <div style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 14, padding: "24px 28px", marginBottom: 28 }}>
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }}>
          <div>
            <h1 style={{ fontSize: 22, fontWeight: 800, color: "var(--text)", margin: "0 0 6px" }}>{flavor.slug}</h1>
            {flavor.description && <p style={{ fontSize: 14, color: "var(--text2)", margin: 0 }}>{flavor.description}</p>}
          </div>
          <Link href={`/test-flavor?flavorId=${flavor.id}`}
            style={{ ...S.btn("secondary"), textDecoration: "none", display: "inline-block", whiteSpace: "nowrap" }}>
            ◎ Test This Flavor
          </Link>
        </div>
      </div>

      {/* Steps section */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
        <div>
          <h2 style={{ fontSize: 17, fontWeight: 800, color: "var(--text)", margin: "0 0 3px" }}>Steps</h2>
          <p style={{ fontSize: 13, color: "var(--text3)", margin: 0 }}>
            {steps.length} step{steps.length !== 1 ? "s" : ""} · drag to reorder
            {saving && <span style={{ marginLeft: 8, color: "var(--text3)" }}>Saving…</span>}
          </p>
        </div>
        <button onClick={() => setModal({ mode: "create" })} style={S.btn("primary")}>+ Add Step</button>
      </div>

      {steps.length === 0 ? (
        <div style={{ background: "var(--surface)", border: "1px dashed var(--border)", borderRadius: 12, padding: "48px 32px", textAlign: "center", color: "var(--text3)", fontSize: 14 }}>
          <div style={{ fontSize: 24, marginBottom: 12 }}>◔</div>
          No steps yet. Add a step to get started.
        </div>
      ) : (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={steps.map((s) => s.id)} strategy={verticalListSortingStrategy}>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {steps.map((step, index) => (
                <SortableStepRow
                  key={step.id}
                  step={step}
                  index={index}
                  modelName={modelName(step.llm_model_id)}
                  stepTypeName={stepTypeName(step.humor_flavor_step_type_id)}
                  onEdit={() => setModal({ mode: "edit", step })}
                  onDelete={() => handleDeleteStep(step.id)}
                  deleting={deletingId === step.id}
                />
              ))}
            </div>
          </SortableContext>
        </DndContext>
      )}

      {/* Pipeline flow */}
      {steps.length > 1 && (
        <div style={{ marginTop: 32, background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 14, padding: "20px 24px" }}>
          <h3 style={{ fontSize: 14, fontWeight: 700, color: "var(--text)", marginBottom: 14 }}>Pipeline Flow</h3>
          <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
            {steps.map((step, i) => (
              <div key={step.id} style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <div style={{ background: "var(--tag-bg)", border: "1px solid var(--border)", borderRadius: 8, padding: "6px 12px", fontSize: 12, fontWeight: 600, color: "var(--text2)" }}>
                  {i + 1}. {step.description ?? stepTypeName(step.humor_flavor_step_type_id)}
                </div>
                {i < steps.length - 1 && <span style={{ color: "var(--text3)", fontSize: 14 }}>→</span>}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
