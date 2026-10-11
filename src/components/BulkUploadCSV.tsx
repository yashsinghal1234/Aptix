"use client";

import React, { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { createQuestionAction, checkDuplicatesAction } from "@/app/actions/setter";

function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let cur = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"' || char === "'") {
      inQuotes = !inQuotes;
    } else if (char === "," && !inQuotes) {
      result.push(cur.trim().replace(/^["']|["']$/g, ""));
      cur = "";
    } else {
      cur += char;
    }
  }
  result.push(cur.trim().replace(/^["']|["']$/g, ""));
  return result;
}

interface CsvRow {
  idx: number;
  text: string;
  options: [string, string, string, string];
  correct: number;
  category: string;
  status: "valid" | "duplicate" | "invalid";
  note: string;
  dupSimilarity?: number;
}

function toCorrectIndex(raw: string): number | null {
  const v = (raw || "").trim().toLowerCase();
  if (/^[0-3]$/.test(v)) return parseInt(v, 10);
  if (v === "a" || v.includes("1")) return 0;
  if (v === "b" || v.includes("2")) return 1;
  if (v === "c" || v.includes("3")) return 2;
  if (v === "d" || v.includes("4")) return 3;
  return null;
}

export function BulkUploadCSV() {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [phase, setPhase] = useState<"idle" | "parsed">("idle");
  const [working, setWorking] = useState(false);
  const [importing, setImporting] = useState(false);
  const [fileName, setFileName] = useState("");
  const [rows, setRows] = useState<CsvRow[]>([]);
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [asDraft, setAsDraft] = useState(true);

  const parseFile = async (file: File) => {
    setWorking(true);
    setError(null);
    setResult(null);
    setFileName(file.name);
    try {
      const text = await file.text();
      const lines = text.split("\n").map((r) => r.trim()).filter((r) => r.length > 0);
      if (lines.length === 0) {
        setError("Empty file.");
        setWorking(false);
        return;
      }
      const startIndex = lines[0].toLowerCase().includes("question") ? 1 : 0;
      const parsed: CsvRow[] = [];
      lines.slice(startIndex).forEach((line, k) => {
        const cols = parseCSVLine(line);
        const idx = startIndex + k + 1;
        if (cols.length < 7 || !cols[0]) {
          parsed.push({ idx, text: cols[0] || `(row ${idx})`, options: ["", "", "", ""], correct: 0, category: cols[6] || "", status: "invalid", note: "Needs 7 columns: stem, 4 options, key, category" });
          return;
        }
        const correct = toCorrectIndex(cols[5]);
        if (correct === null) {
          parsed.push({ idx, text: cols[0], options: [cols[1], cols[2], cols[3], cols[4]], correct: 0, category: cols[6], status: "invalid", note: "Answer key must be 0–3 or A–D" });
          return;
        }
        if (!cols[6] || cols[6].length < 2) {
          parsed.push({ idx, text: cols[0], options: [cols[1], cols[2], cols[3], cols[4]], correct, category: cols[6], status: "invalid", note: "Category required (min 2 chars)" });
          return;
        }
        parsed.push({ idx, text: cols[0], options: [cols[1], cols[2], cols[3], cols[4]], correct, category: cols[6], status: "valid", note: "Ready" });
      });

      // Batch duplicate screen (same engine as submit-time enforcement)
      const res = await checkDuplicatesAction(parsed.filter((r) => r.status === "valid").map((r) => r.text));
      const matches = (res as any).matches || [];
      let di = 0;
      for (const r of parsed) {
        if (r.status !== "valid") continue;
        const m = matches[di++];
        if (m) {
          r.status = "duplicate";
          r.dupSimilarity = m.similarity;
          r.note = `${m.similarity}% similar to bank${m.isExact ? " · exact" : ""}`;
        }
      }
      setRows(parsed);
      setPhase("parsed");
    } catch {
      setError("Failed to parse CSV.");
    } finally {
      setWorking(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const valid = rows.filter((r) => r.status === "valid");
  const dups = rows.filter((r) => r.status === "duplicate");
  const invalid = rows.filter((r) => r.status === "invalid");

  const download = (list: CsvRow[], name: string) => {
    const head = "Question,Opt 1,Opt 2,Opt 3,Opt 4,Correct,Category\n";
    const esc = (s: string | number) => `"${String(s || "").replace(/"/g, '""')}"`;
    const body = list.map((r) => [r.text, ...r.options, r.correct, r.category].map(esc).join(",")).join("\n");
    const url = URL.createObjectURL(new Blob([head + body], { type: "text/csv" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = name;
    a.click();
    URL.revokeObjectURL(url);
  };

  const runImport = async () => {
    if (valid.length === 0) return;
    setImporting(true);
    setError(null);
    let ok = 0;
    let skipped = 0;
    for (const r of valid) {
      const fd = new FormData();
      fd.append("text", r.text);
      r.options.forEach((o, i) => fd.append(`option${i}`, o));
      fd.append("correctAnswer", String(r.correct));
      fd.append("category", r.category);
      fd.append("actionType", asDraft ? "draft" : "submit");
      try {
        const res = await createQuestionAction(fd);
        if ((res as any).success) ok++;
        else if (((res as any).error || "").toLowerCase().includes("duplicate")) skipped++;
      } catch {
        skipped++;
      }
    }
    setImporting(false);
    setResult(`Imported ${ok} question${ok === 1 ? "" : "s"} as ${asDraft ? "drafts" : "submitted for review"}${skipped > 0 ? ` · ${skipped} skipped` : ""}.`);
    setRows((prev) => prev.filter((r) => r.status !== "valid"));
    router.refresh();
  };

  const reset = () => {
    setPhase("idle");
    setRows([]);
    setResult(null);
    setError(null);
    setFileName("");
  };

  return (
    <div className="space-y-4">
      {phase === "idle" && (
        <div className="rounded-2xl border border-dashed border-lime-300/30 bg-lime-300/[0.03] p-8 text-center">
          <p className="text-sm font-black text-white">Drag &amp; drop a CSV file here</p>
          <p className="text-[11px] text-neutral-500 mt-1">or browse your device · UTF-8 · one row per question</p>
          <label className="mt-4 inline-flex items-center gap-2 px-5 py-2.5 bg-lime-300 hover:brightness-110 text-black text-xs font-black rounded-xl transition-all cursor-pointer">
            Choose CSV file
            <input ref={fileRef} type="file" accept=".csv" className="sr-only" disabled={working}
              onChange={(e) => { const f = e.target.files?.[0]; if (f) parseFile(f); }} />
          </label>
          <p className="mt-3 text-[10px] font-mono text-neutral-600">STATIC STAGE · TEST WORKFLOWS</p>
          {working && <p className="mt-2 text-xs font-bold text-lime-200 animate-pulse">Parsing &amp; screening…</p>}
          {error && <p className="mt-2 text-xs font-bold text-rose-300">{error}</p>}
        </div>
      )}

      {phase === "parsed" && (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {[
              { l: "Rows processed", v: String(rows.length), s: `${fileName} · header ${rows.length > 0 ? "excluded" : ""}`, tone: "" },
              { l: "Valid draft-ready", v: String(valid.length), s: asDraft ? "Not published · awaiting review" : "Ready to submit", tone: "lime" },
              { l: "Duplicates skipped", v: String(dups.length), s: "Similarity ≥85% · locked originals safe", tone: "" },
              { l: "Invalid rows", v: String(invalid.length), s: invalid.length > 0 ? "Fix and re-upload" : "None", tone: invalid.length > 0 ? "peach" : "" },
            ].map((c: any) => (
              <div key={c.l} className="rounded-2xl border border-white/10 bg-[#0e0f13] p-4">
                <p className="text-[11px] font-medium text-neutral-400">{c.l}</p>
                <p className={`mt-1 text-[26px] leading-none font-black tabular-nums ${c.tone === "lime" ? "text-lime-300" : c.tone === "peach" ? "text-[#f2a488]" : "text-white"}`}>{c.v}</p>
                <p className="mt-1.5 text-[10px] text-neutral-500">{c.s}</p>
              </div>
            ))}
          </div>

          <div className="rounded-2xl border border-white/10 bg-[#0e0f13] p-5">
            <h4 className="text-[13px] font-bold text-white">Validation results preview</h4>
            <p className="text-[10px] text-neutral-500 mt-0.5 mb-3">
              Showing {Math.min(rows.length, 12)} of {rows.length} records · {valid.length} valid · {dups.length} skipped · {invalid.length} invalid
            </p>
            <div className="overflow-x-auto -mx-1 px-1">
              <div className="grid grid-cols-[auto_1fr_auto_auto_auto] gap-x-4 gap-y-1 items-center min-w-[680px]">
                {(["ROW", "STEM / CATEGORY", "TYPE", "RESULT", "NOTE"] as const).map((h, i) => (
                  <p key={h} className={`text-[9px] font-bold tracking-[0.16em] text-neutral-600 pb-2 ${i > 0 ? "text-center" : ""}`}>{h}</p>
                ))}
                {rows.slice(0, 12).map((r) => (
                  <React.Fragment key={r.idx}>
                    <p className="py-2 border-t border-white/[0.06] text-[11px] font-mono text-neutral-500 tabular-nums">{r.idx}</p>
                    <div className="py-2 border-t border-white/[0.06] pr-2 min-w-0">
                      <p className="text-[11px] text-neutral-200 truncate">{r.text}</p>
                      <p className="text-[10px] text-neutral-500">{r.category}</p>
                    </div>
                    <p className="py-2 border-t border-white/[0.06] text-[10px] text-neutral-400 text-center whitespace-nowrap">MCQ · Single</p>
                    <p className="py-2 border-t border-white/[0.06] text-center">
                      <span className={`text-[9px] font-black rounded px-1.5 py-0.5 whitespace-nowrap ${
                        r.status === "valid" ? "text-lime-200 bg-lime-300/10 border border-lime-300/25"
                        : r.status === "duplicate" ? "text-[#f2a488] bg-[#f2a488]/10 border border-[#f2a488]/25"
                        : "text-rose-300 bg-rose-950/40 border border-rose-800/40"
                      }`}>
                        {r.status === "valid" ? "Valid" : r.status === "duplicate" ? "Skipped" : "Error"}
                      </span>
                    </p>
                    <p className="py-2 border-t border-white/[0.06] text-[10px] text-neutral-500 text-center">{r.note}</p>
                  </React.Fragment>
                ))}
              </div>
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              <button type="button" onClick={() => download(invalid, "invalid-rows.csv")} disabled={invalid.length === 0} className="text-[11px] font-bold text-neutral-200 bg-white/[0.05] hover:bg-white/10 border border-white/10 rounded-lg px-3 py-1.5 transition-colors disabled:opacity-40">
                Download invalid rows ({invalid.length})
              </button>
              <button type="button" onClick={() => download(dups, "skipped-rows.csv")} disabled={dups.length === 0} className="text-[11px] font-bold text-neutral-200 bg-white/[0.05] hover:bg-white/10 border border-white/10 rounded-lg px-3 py-1.5 transition-colors disabled:opacity-40">
                Download skipped rows ({dups.length})
              </button>
              <button type="button" onClick={reset} className="text-[11px] font-bold text-neutral-400 hover:text-white px-3 py-1.5">
                New records →
              </button>
            </div>
          </div>

          <div className="grid lg:grid-cols-2 gap-4 items-stretch">
            <div className="rounded-2xl border border-white/10 bg-[#0e0f13] p-5">
              <h4 className="text-[13px] font-bold text-white">Retry invalid rows</h4>
              <p className="text-[11px] text-neutral-400 mt-1 leading-relaxed">
                Correct rows {invalid.map((r) => r.idx).join(", ") || "—"} and upload the file again. Previously accepted rows are unaffected.
              </p>
              <label className="mt-3 inline-flex items-center gap-2 px-4 py-2 bg-white/[0.06] hover:bg-white/10 border border-white/10 text-xs font-bold text-neutral-200 rounded-xl transition-colors cursor-pointer">
                Re-upload file
                <input type="file" accept=".csv" className="sr-only"
                  onChange={(e) => { const f = e.target.files?.[0]; if (f) parseFile(f); }} />
              </label>
            </div>
            <div className="rounded-2xl border border-white/10 bg-[#0e0f13] p-5">
              <h4 className="text-[13px] font-bold text-white">Keep authorship, require approval</h4>
              <label className="mt-2 flex items-center gap-2.5 cursor-pointer">
                <input type="checkbox" checked={asDraft} onChange={(e) => setAsDraft(e.target.checked)} className="w-4 h-4 accent-[#bef264]" />
                <span className="text-[11px] text-neutral-300">Save as drafts (recommended) — submit for approval later</span>
              </label>
              <button
                type="button"
                onClick={runImport}
                disabled={importing || valid.length === 0}
                className="mt-3 w-full py-2.5 text-[11px] font-black text-black bg-lime-300 hover:brightness-110 rounded-xl transition-all disabled:opacity-40"
              >
                {importing ? `Importing ${valid.length}…` : `Import ${valid.length} valid as ${asDraft ? "drafts" : "submitted"}`}
              </button>
              {result && <p className="mt-2 text-[11px] font-bold text-lime-200">{result}</p>}
              {error && <p className="mt-2 text-[11px] font-bold text-rose-300">{error}</p>}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
