"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { saveQuickGridQuestionsAction } from "@/app/actions/setter";
import { canonicalQType, IMPORT_TYPE_LABELS } from "@/lib/question-import";

/**
 * Quick-Grid authoring — a CodeTantra/Sheets-style editor. Every row is one
 * question; defaults flow from row 1; saving is a single batch server call.
 */

interface GridRow {
  id: string;
  stem: string;
  options: [string, string, string, string];
  key: string;
  qType: string;
  category: string;
  difficulty: string;
}

const blankRow = (category: string, difficulty: string, id: string): GridRow => ({
  id,
  stem: "",
  options: ["", "", "", ""],
  key: "",
  qType: "MCQ_SINGLE",
  category,
  difficulty,
});

let idCounter = 0;
const nextId = () => `r${++idCounter}-${Date.now()}`;

const INPUT = "w-full px-2.5 py-2 text-[11px] bg-black/60 border border-white/10 rounded-lg outline-none font-medium text-white placeholder-neutral-700 focus:border-lime-300/50 min-w-0";
const TH = "text-[9px] font-black tracking-[0.14em] text-neutral-500 uppercase text-center pb-2";

export function QuickQuestionGrid({ defaultSubject }: { defaultSubject?: string }) {
  const router = useRouter();
  const [globalCategory, setGlobalCategory] = useState(defaultSubject || "");
  const [globalDifficulty, setGlobalDifficulty] = useState("MEDIUM");
  const [asDraft, setAsDraft] = useState(true);
  const [rows, setRows] = useState<GridRow[]>([blankRow(defaultSubject || "", "MEDIUM", nextId())]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<string | null>(null);

  const cell = (r: number, c: number) => `qc-${r}-${c}`;

  const patch = (id: string, field: keyof GridRow, value: any) => {
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, [field]: value } : r)));
    setResult(null);
  };

  const focusCell = (r: number, c: number) => {
    const el = document.querySelector<HTMLInputElement>(`[data-cell="${cell(r, c)}"]`);
    if (el) {
      el.focus();
      el.setSelectionRange(el.value.length, el.value.length);
    }
  };

  const onEnter = (e: React.KeyboardEvent<HTMLInputElement>, r: number, c: number) => {
    if (e.key !== "Enter") return;
    e.preventDefault();
    const last = rows.length - 1;
    if (r === last) {
      setRows((prev) => [...prev, blankRow(globalCategory || prev[prev.length - 1]?.category || "", globalDifficulty, nextId())]);
      // Focus lands after React commits the new row
      requestAnimationFrame(() => focusCell(r + 1, 0));
    } else {
      focusCell(r + 1, c);
    }
  };

  const removeRow = (id: string) => {
    setRows((prev) => {
      const next = prev.filter((r) => r.id !== id);
      return next.length > 0 ? next : [blankRow(globalCategory, globalDifficulty, nextId())];
    });
    setResult(null);
  };

  const save = async () => {
    setError(null);
    setResult(null);
    setSaving(true);
    try {
      // Global defaults apply to any row whose own subject/difficulty cell is blank
      const payload = rows
        .map((r) => ({
          stem: r.stem,
          options: r.options,
          key: r.key,
          qType: canonicalQType(r.qType),
          category: r.category.trim() || globalCategory.trim(),
          difficulty: r.difficulty || globalDifficulty,
        }))
        .filter((r) => r.stem.trim().length > 0);
      if (payload.length === 0) {
        setError("Nothing to save — type at least one stem.");
        setSaving(false);
        return;
      }
      const res: any = await saveQuickGridQuestionsAction(payload, asDraft);
      setSaving(false);
      if (res.error) {
        setError(res.error);
        return;
      }
      const stateLabel = res.approvedAsOwner ? "Approved (owner bypasses review)" : asDraft ? "Drafts" : "Submitted for Review";
      setResult(`Saved ${res.count} question${res.count === 1 ? "" : "s"} as ${stateLabel}${res.skippedDuplicates ? ` · ${res.skippedDuplicates} duplicate${res.skippedDuplicates > 1 ? "s" : ""} skipped` : ""}.`);
      setRows([blankRow(globalCategory, globalDifficulty, nextId())]);
      router.refresh();
    } catch (err: any) {
      setSaving(false);
      setError(err?.message || "Server error while saving the grid. Please retry — nothing was partially saved.");
    }
  };

  const filled = rows.filter((r) => r.stem.trim().length > 0).length;

  return (
    <div className="space-y-4">
      {/* Defaults bar */}
      <div className="rounded-2xl border border-white/10 bg-[#0e0f13] p-4 flex flex-wrap items-end gap-3">
        <label className="block flex-1 min-w-[220px]">
          <span className="block text-[9px] font-black tracking-[0.14em] text-neutral-500 uppercase mb-1.5">Subject for blank cells</span>
          <input
            value={globalCategory}
            onChange={(e) => setGlobalCategory(e.target.value)}
            placeholder="e.g. Operating Systems"
            className={INPUT}
          />
        </label>
        <label className="block w-[150px]">
          <span className="block text-[9px] font-black tracking-[0.14em] text-neutral-500 uppercase mb-1.5">Difficulty default</span>
          <select value={globalDifficulty} onChange={(e) => setGlobalDifficulty(e.target.value)} className={`${INPUT} cursor-pointer font-bold`}>
            <option value="EASY">Easy</option>
            <option value="MEDIUM">Medium</option>
            <option value="HARD">Hard</option>
          </select>
        </label>
        <label className="flex items-center gap-2.5 mb-2 cursor-pointer">
          <input type="checkbox" checked={asDraft} onChange={(e) => setAsDraft(e.target.checked)} className="w-4 h-4 accent-[#bef264]" />
          <span className="text-[11px] text-neutral-300 font-semibold">Save as drafts</span>
        </label>
        <button
          type="button"
          onClick={save}
          disabled={saving || filled === 0}
          className="ml-auto mb-1 px-5 py-2.5 text-[11px] font-black text-black bg-lime-300 hover:brightness-110 rounded-xl transition-all disabled:opacity-40 cursor-pointer"
        >
          {saving ? "Saving batch…" : `Save ${filled || "0"} as ${asDraft ? "drafts" : "submitted"}`}
        </button>
      </div>

      {error && (
        <div className="rounded-2xl border border-rose-800/60 bg-rose-950/40 px-4 py-3 text-xs font-bold text-rose-300">{error}</div>
      )}
      {result && (
        <div className="rounded-2xl border border-lime-300/25 bg-lime-300/[0.07] px-4 py-3 text-xs font-bold text-lime-200">{result}</div>
      )}

      {/* Grid */}
      <div className="rounded-2xl border border-white/10 bg-[#0e0f13] p-4 overflow-x-auto">
        <p className="text-[10px] text-neutral-500 mb-3">
          Type everything at once — Enter jumps to the next row · Key column takes letters/numbers: <span className="font-mono text-neutral-300">A</span> · <span className="font-mono text-neutral-300">True</span> · <span className="font-mono text-neutral-300">A,C</span> · <span className="font-mono text-neutral-300">42 ±0.5</span> · <span className="font-mono text-neutral-300">yes | Yeah</span>
        </p>
        <div className="min-w-[1180px]">
          <div className="grid grid-cols-[28px_minmax(220px,1fr)_repeat(4,110px)_80px_110px_86px_minmax(130px,150px)_36px] gap-1.5">
            <p className={TH}>#</p>
            <p className={`${TH} !text-left`}>Stem</p>
            {["A", "B", "C", "D"].map((l) => <p key={l} className={TH}>{l}</p>)}
            <p className={TH}>Key</p>
            <p className={TH}>Type</p>
            <p className={TH}>Points</p>
            <p className={TH}>Subject</p>
            <p className={TH}></p>
          </div>
          <div className="space-y-1.5 mt-1">
            {rows.map((r, rIdx) => {
              const t = canonicalQType(r.qType);
              const showOptions = t === "MCQ_SINGLE" || t === "MCQ_MULTI";
              const isTf = t === "TRUE_FALSE";
              return (
                <div
                  key={r.id}
                  className="grid grid-cols-[28px_minmax(220px,1fr)_repeat(4,110px)_80px_110px_86px_minmax(130px,150px)_36px] gap-1.5 items-center"
                >
                  <span className="text-[10px] font-mono text-neutral-500 text-center tabular-nums">{rIdx + 1}</span>
                  <input
                    data-cell={cell(rIdx, 0)}
                    value={r.stem}
                    onChange={(e) => patch(r.id, "stem", e.target.value)}
                    onKeyDown={(e) => onEnter(e, rIdx, 0)}
                    placeholder={rIdx === 0 ? "Stem — type or paste, Enter jumps to the next row" : "Stem"}
                    className={INPUT}
                  />
                  {r.options.map((o, i) => (
                    <input
                      key={i}
                      data-cell={cell(rIdx, i + 1)}
                      value={o}
                      onChange={(e) => {
                        const next = [...r.options] as GridRow["options"];
                        next[i] = e.target.value;
                        patch(r.id, "options", next);
                      }}
                      onKeyDown={(e) => onEnter(e, rIdx, i + 1)}
                      placeholder={isTf ? ["True", "False", "", ""][i] : t === "NUMERIC" || t === "FILL_BLANK" ? "—" : `Option ${"ABCD"[i]}`}
                      disabled={!showOptions}
                      className={`${INPUT} ${!showOptions ? "opacity-40 pointer-events-none" : ""}`}
                    />
                  ))}
                  <input
                    data-cell={cell(rIdx, 5)}
                    value={r.key}
                    onChange={(e) => patch(r.id, "key", e.target.value)}
                    onKeyDown={(e) => onEnter(e, rIdx, 5)}
                    placeholder={t === "NUMERIC" ? "42" : t === "FILL_BLANK" ? "yes|Yeah" : t === "TRUE_FALSE" ? "True" : "A"}
                    className={`${INPUT} font-mono text-center`}
                  />
                  <select
                    value={t}
                    onChange={(e) => patch(r.id, "qType", e.target.value)}
                    className={`${INPUT} cursor-pointer`}
                  >
                    {Object.entries(IMPORT_TYPE_LABELS).map(([v, l]) => (
                      <option key={v} value={v}>{l.replace("MCQ · ", "MCQ ")}</option>
                    ))}
                  </select>
                  <input
                    type="number"
                    step="0.5"
                    min="0.5"
                    value="1.0"
                    readOnly
                    className={`${INPUT} opacity-50 pointer-events-none tabular-nums text-center`}
                  />
                  <input
                    value={r.category}
                    onChange={(e) => patch(r.id, "category", e.target.value)}
                    onKeyDown={(e) => onEnter(e, rIdx, 6)}
                    placeholder="same as above"
                    className={INPUT}
                  />
                  <button
                    type="button"
                    onClick={() => removeRow(r.id)}
                    className="w-7 h-7 grid place-items-center text-neutral-600 hover:text-rose-400 font-bold rounded-lg hover:bg-rose-500/10 transition-colors cursor-pointer"
                    title="Remove row"
                  >
                    ✕
                  </button>
                </div>
              );
            })}
          </div>
          <button
            type="button"
            onClick={() => setRows((prev) => [...prev, blankRow(globalCategory, globalDifficulty, nextId())])}
            className="mt-3 text-[11px] font-bold text-lime-200 hover:text-lime-100"
          >
            + Add row
          </button>
        </div>
      </div>
    </div>
  );
}
