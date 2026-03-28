"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase-client";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE ?? "https://api.almostcrackd.ai";
const ACCEPTED = ["image/jpeg", "image/jpg", "image/png", "image/webp", "image/gif", "image/heic"];

interface HumorFlavor {
  id: number;
  slug: string;
}

interface Caption {
  id: string;
  content: string;
  [key: string]: unknown;
}

type UploadStep = "idle" | "presign" | "upload" | "register" | "captions" | "done" | "error";

const STEP_LABELS: Record<UploadStep, string> = {
  idle: "",
  presign: "Getting upload URL…",
  upload: "Uploading image…",
  register: "Registering image…",
  captions: "Generating captions…",
  done: "Done!",
  error: "Error",
};

interface TestResult {
  imageUrl: string;
  flavorName: string;
  captions: Caption[];
  generatedAt: Date;
}

const S = {
  btn: (variant: "primary" | "secondary" | "danger" = "primary", disabled = false) => ({
    padding: "9px 18px",
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
    fontSize: 13,
    fontWeight: 600 as const,
    cursor: disabled ? ("not-allowed" as const) : ("pointer" as const),
    opacity: disabled ? 0.55 : 1,
  }),
};

export default function TestFlavorPage() {
  const searchParams = useSearchParams();
  const preselectedId = searchParams.get("flavorId");

  const [flavors, setFlavors] = useState<HumorFlavor[]>([]);
  const [selectedFlavorId, setSelectedFlavorId] = useState<string>(preselectedId ?? "");
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const [step, setStep] = useState<UploadStep>("idle");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [results, setResults] = useState<TestResult[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);
  const supabase = createClient();

  useEffect(() => {
    supabase
      .from("humor_flavors")
      .select("id, slug")
      .order("slug", { ascending: true })
      .then(({ data }) => setFlavors(data ?? []));
  }, []);

  useEffect(() => {
    if (preselectedId) setSelectedFlavorId(preselectedId);
  }, [preselectedId]);

  function pickFile(f: File) {
    if (!ACCEPTED.includes(f.type)) {
      setErrorMsg("Unsupported file type. Use JPEG, PNG, WEBP, GIF, or HEIC.");
      return;
    }
    setFile(f);
    setPreview(URL.createObjectURL(f));
    setStep("idle");
    setErrorMsg(null);
  }

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const f = e.dataTransfer.files?.[0];
    if (f) pickFile(f);
  }, []);

  async function handleRun() {
    if (!file || !selectedFlavorId) return;
    setErrorMsg(null);
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) { setErrorMsg("Not authenticated"); return; }

    const token = session.access_token;
    const ah = { Authorization: `Bearer ${token}`, "Content-Type": "application/json" };

    try {
      // 1. Get presigned upload URL
      setStep("presign");
      const r1 = await fetch(`${API_BASE}/pipeline/generate-presigned-url`, {
        method: "POST",
        headers: ah,
        body: JSON.stringify({ contentType: file.type }),
      });
      if (!r1.ok) throw new Error(`Presign failed (${r1.status}): ${await r1.text()}`);
      const { presignedUrl, cdnUrl } = await r1.json();

      // 2. Upload to S3
      setStep("upload");
      const r2 = await fetch(presignedUrl, {
        method: "PUT",
        headers: { "Content-Type": file.type },
        body: file,
      });
      if (!r2.ok) throw new Error(`Upload failed (${r2.status})`);

      // 3. Register image
      setStep("register");
      const r3 = await fetch(`${API_BASE}/pipeline/upload-image-from-url`, {
        method: "POST",
        headers: ah,
        body: JSON.stringify({ imageUrl: cdnUrl, isCommonUse: false }),
      });
      if (!r3.ok) throw new Error(`Register failed (${r3.status}): ${await r3.text()}`);
      const { imageId } = await r3.json();

      // 4. Generate captions with selected humor flavor
      setStep("captions");
      const body: Record<string, unknown> = { imageId };
      if (selectedFlavorId) body.humorFlavorId = Number(selectedFlavorId);

      const r4 = await fetch(`${API_BASE}/pipeline/generate-captions`, {
        method: "POST",
        headers: ah,
        body: JSON.stringify(body),
      });
      if (!r4.ok) throw new Error(`Caption generation failed (${r4.status}): ${await r4.text()}`);
      const captionData = await r4.json();
      const captions: Caption[] = Array.isArray(captionData)
        ? captionData
        : (captionData.captions ?? []);

      const selectedFlavor = flavors.find((f) => f.id === Number(selectedFlavorId));
      setResults((prev) => [
        {
          imageUrl: preview!,
          flavorName: selectedFlavor?.slug ?? `Flavor #${selectedFlavorId}`,
          captions,
          generatedAt: new Date(),
        },
        ...prev,
      ]);
      setStep("done");
    } catch (err: unknown) {
      setStep("error");
      setErrorMsg(err instanceof Error ? err.message : "Unknown error");
    }
  }

  const isRunning = !["idle", "done", "error"].includes(step);
  const canRun = !!file && !!selectedFlavorId && !isRunning;

  return (
    <div style={{ padding: "36px 40px" }}>
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontSize: 26, fontWeight: 800, color: "var(--text)", margin: "0 0 6px", letterSpacing: "-0.01em" }}>
          Test a Flavor
        </h1>
        <p style={{ fontSize: 14, color: "var(--text3)", margin: 0 }}>
          Upload an image and generate captions using a specific humor flavor.
        </p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24, maxWidth: 960 }}>
        {/* ─── Left panel: Input ─── */}
        <div>
          {/* Flavor selector */}
          <div
            style={{
              background: "var(--surface)",
              border: "1px solid var(--border)",
              borderRadius: 14,
              padding: "20px 24px",
              marginBottom: 16,
            }}
          >
            <label style={{ fontSize: 13, fontWeight: 700, color: "var(--text)", display: "block", marginBottom: 10 }}>
              Select Humor Flavor
            </label>
            {flavors.length === 0 ? (
              <p style={{ fontSize: 13, color: "var(--text3)" }}>No flavors found.</p>
            ) : (
              <select
                value={selectedFlavorId}
                onChange={(e) => setSelectedFlavorId(e.target.value)}
                style={{
                  width: "100%",
                  padding: "9px 12px",
                  background: "var(--input-bg)",
                  border: "1px solid var(--input-border)",
                  borderRadius: 8,
                  fontSize: 13,
                  color: "var(--text)",
                  outline: "none",
                }}
              >
                <option value="">Choose a flavor…</option>
                {flavors.map((f) => (
                  <option key={f.id} value={String(f.id)}>
                    {f.slug}
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* Image drop zone */}
          <div
            onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
            onDragLeave={() => setDragging(false)}
            onDrop={onDrop}
            onClick={() => !isRunning && inputRef.current?.click()}
            style={{
              background: dragging ? "var(--surface2)" : "var(--surface)",
              border: `2px dashed ${dragging ? "var(--btn-primary-bg)" : "var(--border)"}`,
              borderRadius: 14,
              overflow: "hidden",
              cursor: isRunning ? "default" : "pointer",
              transition: "border-color 0.15s, background 0.15s",
              marginBottom: 16,
            }}
          >
            {preview ? (
              <div style={{ position: "relative" }}>
                <img
                  src={preview}
                  alt="Preview"
                  style={{ width: "100%", maxHeight: 280, objectFit: "cover", display: "block" }}
                />
                {!isRunning && (
                  <button
                    onClick={(e) => { e.stopPropagation(); inputRef.current?.click(); }}
                    style={{
                      position: "absolute",
                      top: 10,
                      right: 10,
                      background: "rgba(0,0,0,0.6)",
                      color: "#fff",
                      border: "none",
                      borderRadius: 999,
                      padding: "5px 12px",
                      fontSize: 12,
                      fontWeight: 600,
                      cursor: "pointer",
                    }}
                  >
                    Change
                  </button>
                )}
              </div>
            ) : (
              <div style={{ padding: "40px 24px", textAlign: "center" }}>
                <div style={{ fontSize: 28, marginBottom: 10, color: "var(--text3)" }}>🖼</div>
                <p style={{ fontSize: 14, fontWeight: 600, color: "var(--text2)", marginBottom: 4 }}>
                  Drop an image or click to browse
                </p>
                <p style={{ fontSize: 12, color: "var(--text3)" }}>JPEG · PNG · WEBP · GIF · HEIC</p>
              </div>
            )}
          </div>
          <input
            ref={inputRef}
            type="file"
            accept={ACCEPTED.join(",")}
            style={{ display: "none" }}
            onChange={(e) => { const f = e.target.files?.[0]; if (f) pickFile(f); }}
          />

          {/* Status bar */}
          {step !== "idle" && (
            <div
              style={{
                background: "var(--surface)",
                border: "1px solid var(--border)",
                borderRadius: 10,
                padding: "10px 16px",
                marginBottom: 14,
                display: "flex",
                alignItems: "center",
                gap: 10,
              }}
            >
              {isRunning && (
                <div
                  style={{
                    width: 14,
                    height: 14,
                    borderRadius: "50%",
                    border: "2px solid var(--border)",
                    borderTopColor: "var(--btn-primary-bg)",
                    animation: "spin 0.7s linear infinite",
                    flexShrink: 0,
                  }}
                />
              )}
              {step === "done" && <span style={{ color: "var(--success)", fontSize: 14 }}>✓</span>}
              {step === "error" && <span style={{ color: "var(--danger)", fontSize: 14 }}>✕</span>}
              <span
                style={{
                  fontSize: 13,
                  fontWeight: 500,
                  color: step === "error" ? "var(--danger)" : step === "done" ? "var(--success)" : "var(--text2)",
                }}
              >
                {step === "error" ? errorMsg : STEP_LABELS[step]}
              </span>
            </div>
          )}

          {errorMsg && step === "idle" && (
            <p style={{ fontSize: 13, color: "var(--danger)", marginBottom: 14 }}>{errorMsg}</p>
          )}

          {/* Run button */}
          <div style={{ display: "flex", gap: 10 }}>
            <button onClick={handleRun} disabled={!canRun} style={S.btn("primary", !canRun)}>
              {isRunning ? STEP_LABELS[step] : "Generate Captions"}
            </button>
            {file && !isRunning && (
              <button
                onClick={() => { setFile(null); setPreview(null); setStep("idle"); setErrorMsg(null); }}
                style={S.btn("secondary")}
              >
                Clear
              </button>
            )}
          </div>
        </div>

        {/* ─── Right panel: Results ─── */}
        <div>
          <h2 style={{ fontSize: 16, fontWeight: 800, color: "var(--text)", marginBottom: 14 }}>
            Results
            {results.length > 0 && (
              <span style={{ fontSize: 12, fontWeight: 400, color: "var(--text3)", marginLeft: 8 }}>
                {results.length} run{results.length !== 1 ? "s" : ""}
              </span>
            )}
          </h2>

          {results.length === 0 ? (
            <div
              style={{
                background: "var(--surface)",
                border: "1px dashed var(--border)",
                borderRadius: 14,
                padding: "48px 24px",
                textAlign: "center",
                color: "var(--text3)",
                fontSize: 14,
              }}
            >
              <div style={{ fontSize: 24, marginBottom: 10 }}>◎</div>
              Run a test to see captions here.
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              {results.map((result, i) => (
                <div
                  key={i}
                  style={{
                    background: "var(--surface)",
                    border: "1px solid var(--border)",
                    borderRadius: 14,
                    overflow: "hidden",
                  }}
                  className="animate-in"
                >
                  {/* Result header */}
                  <div
                    style={{
                      display: "flex",
                      gap: 14,
                      padding: "14px 16px",
                      borderBottom: "1px solid var(--border2)",
                      alignItems: "center",
                    }}
                  >
                    <img
                      src={result.imageUrl}
                      alt=""
                      style={{ width: 52, height: 52, objectFit: "cover", borderRadius: 8, flexShrink: 0 }}
                    />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 700, color: "var(--text)", marginBottom: 2 }}>
                        {result.flavorName}
                      </div>
                      <div style={{ fontSize: 11, color: "var(--text3)" }}>
                        {result.generatedAt.toLocaleString()} · {result.captions.length} caption{result.captions.length !== 1 ? "s" : ""}
                      </div>
                    </div>
                    {i === 0 && (
                      <span
                        style={{
                          fontSize: 10,
                          fontWeight: 700,
                          background: "var(--success-bg)",
                          color: "var(--success)",
                          padding: "3px 8px",
                          borderRadius: 999,
                          letterSpacing: "0.04em",
                        }}
                      >
                        LATEST
                      </span>
                    )}
                  </div>

                  {/* Captions list */}
                  <div style={{ padding: "12px 16px", display: "flex", flexDirection: "column", gap: 8 }}>
                    {result.captions.length === 0 ? (
                      <p style={{ fontSize: 13, color: "var(--text3)" }}>No captions returned.</p>
                    ) : (
                      result.captions.map((c, ci) => (
                        <div
                          key={c.id ?? ci}
                          style={{
                            background: "var(--surface2)",
                            border: "1px solid var(--border2)",
                            borderRadius: 8,
                            padding: "10px 14px",
                            fontSize: 13,
                            fontWeight: 500,
                            color: "var(--text)",
                            lineHeight: 1.5,
                          }}
                        >
                          {c.content}
                        </div>
                      ))
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
