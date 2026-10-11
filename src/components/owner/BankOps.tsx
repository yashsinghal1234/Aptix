"use client";

import React, { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { DeleteQuestionButton } from "@/components/DeleteQuestionButton";
import { reviewQuestionAction, approveAllQuestionsAction } from "@/app/actions/schedule";

export interface BankRow {
  id: string;
  qcode: string;
  text: string;
  category: string;
  typeLabel: string;
  level: string;
  workflow: string;
  workflowLabel: string;
  integrity: string;
  integrityTone: "lime" | "peach" | "neutral";
  points: number;
  options: string[];
  locked: boolean;
}

export interface QueueItem {
  id: string;
  qcode: string;
  text: string;
  category: string;
}

const selectCls =
  "text-[11px] bg-black/60 border border-white/10 rounded-xl px-3 py-2.5 outline-none font-semibold text-neutral-200 cursor-pointer w-full";

export function BankOps({
  rows,
  queue,
  latest,
  categories,
  types,
  levels,
}: {
  rows: BankRow[];
  queue: QueueItem[];
  latest: { count24h: number; items: { qcode: string; text: string; createdLabel: string }[] };
  categories: string[];
  types: string[];
  levels: string[];
}) {
  const router = useRouter();
  const [q, setQ] = useState("");
  const [cat, setCat] = useState("");
  const [type, setType] = useState("");
  const [level, setLevel] = useState("");
  const [page, setPage] = useState(0);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [approving, setApproving] = useState<string | null>(null);
  const [approvingAll, setApprovingAll] = useState(false);
  const PER = 8;

  const filtered = rows.filter((r) => {
    if (q && !`${r.text} ${r.qcode} ${r.id}`.toLowerCase().includes(q.toLowerCase())) return false;
    if (cat && r.category !== cat) return false;
    if (type && r.typeLabel !== type) return false;
    if (level && r.level !== level) return false;
    return true;
  });
  const pages = Math.max(1, Math.ceil(filtered.length / PER));
  const shown = filtered.slice(page * PER, page * PER + PER);
  const selected = rows.find((r) => r.id === selectedId) || null;

  const approve = async (id: string) => {
    setApproving(id);
    await reviewQuestionAction(id, "APPROVE");
    setApproving(null);
    router.refresh();
  };
  const approveAll = async () => {
    if (!confirm(`Approve all ${queue.length} pending questions?`)) return;
    setApprovingAll(true);
    await approveAllQuestionsAction();
    setApprovingAll(false);
    router.refresh();
  };

  const tone = (t: BankRow["integrityTone"]) =>
    t === "lime" ? "text-lime-200" : t === "peach" ? "text-[#f2a488]" : "text-neutral-400";

  return (
    <div className="space-y-4">
      {/* Search + filters */}
      <div className="grid sm:grid-cols-2 xl:grid-cols-4 gap-2.5">
        <input
          value={q}
          onChange={(e) => { setQ(e.target.value); setPage(0); }}
          placeholder="▸ Search stem, tag or question ID"
          className="px-4 py-2.5 text-xs bg-black/60 border border-white/10 rounded-xl outline-none font-medium text-white placeholder-neutral-600 focus:border-lime-300/50 sm:col-span-2 xl:col-span-1"
        />
        {[
          { label: "Category", v: cat, set: setCat, opts: categories, all: "All categories" },
          { label: "Type", v: type, set: setType, opts: types, all: "All types" },
          { label: "Difficulty", v: level, set: setLevel, opts: levels, all: "All levels" },
        ].map((f) => (
          <label key={f.label} className="block">
            <span className="block text-[9px] font-bold tracking-[0.14em] text-neutral-600 mb-1">{f.label.toUpperCase()}</span>
            <select value={f.v} onChange={(e) => { f.set(e.target.value); setPage(0); }} className={selectCls}>
              <option value="">{f.all}</option>
              {f.opts.map((o) => (
                <option key={o} value={o}>{o}</option>
              ))}
            </select>
          </label>
        ))}
      </div>

      {/* Table */}
      <div className="rounded-2xl border border-white/10 bg-[#0e0f13] p-5">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-[15px] font-bold text-white">Approved &amp; draft questions</h2>
          <span className="text-[10px] font-bold text-neutral-500 tabular-nums">
            SHOWING {shown.length} OF {filtered.length}
          </span>
        </div>
        <div className="overflow-x-auto -mx-1 px-1">
          <div className="grid grid-cols-[1.6fr_auto_auto_auto_auto] gap-x-4 gap-y-1 items-center min-w-[760px]">
            {(["QUESTION / CATEGORY", "TYPE", "LEVEL", "WORKFLOW", "INTEGRITY"] as const).map((h, i) => (
              <p key={h} className={`text-[9px] font-bold tracking-[0.16em] text-neutral-600 pb-2 ${i > 0 ? "text-center" : ""}`}>{h}</p>
            ))}
            {shown.length === 0 && (
              <p className="col-span-5 text-xs text-neutral-500 py-6 text-center">No questions match these filters.</p>
            )}
            {shown.map((r) => (
              <React.Fragment key={r.id}>
                <div onClick={() => setSelectedId(selectedId === r.id ? null : r.id)} className="py-3 border-t border-white/[0.06] pr-2 min-w-0 cursor-pointer group">
                  <p className={`text-xs font-bold truncate transition-colors ${selectedId === r.id ? "text-lime-200" : "text-white group-hover:text-lime-200"}`}>
                    {r.qcode} · {r.text}
                  </p>
                  <p className="text-[10px] text-neutral-500 mt-0.5">{r.category} · {r.points} points</p>
                </div>
                <p className="py-3 border-t border-white/[0.06] text-[11px] text-neutral-300 text-center whitespace-nowrap">{r.typeLabel}</p>
                <p className="py-3 border-t border-white/[0.06] text-[11px] text-neutral-300 text-center whitespace-nowrap">{r.level}</p>
                <p className="py-3 border-t border-white/[0.06] text-center">
                  <span className="text-[10px] font-bold text-neutral-200 whitespace-nowrap">{r.workflowLabel}</span>
                </p>
                <p className={`py-3 border-t border-white/[0.06] text-[10px] font-bold text-center whitespace-nowrap ${tone(r.integrityTone)}`}>
                  {r.integrity}
                </p>
              </React.Fragment>
            ))}
          </div>
        </div>
        <div className="mt-3 flex items-center justify-between text-[10px] text-neutral-600">
          <span>
            {selected ? `Selected: ${selected.qcode} · click again to collapse · ` : ""}Page {page + 1} of {pages}
          </span>
          <span className="flex gap-1.5">
            <button disabled={page === 0} onClick={() => setPage((p) => p - 1)} className="px-2.5 py-1 rounded-md border border-white/10 text-neutral-300 disabled:opacity-40 hover:bg-white/5">←</button>
            <button disabled={page + 1 >= pages} onClick={() => setPage((p) => p + 1)} className="px-2.5 py-1 rounded-md border border-white/10 text-neutral-300 disabled:opacity-40 hover:bg-white/5">→</button>
          </span>
        </div>

        {selected && (
          <div className="mt-3 rounded-xl border border-lime-300/20 bg-lime-300/[0.03] p-4">
            <p className="text-xs font-black text-white">{selected.qcode} · {selected.text}</p>
            <div className="mt-2 space-y-1.5">
              {selected.options.map((o, i) => (
                <p key={i} className="text-[11px] text-neutral-300">
                  <span className="font-mono text-neutral-500 mr-2">{String.fromCharCode(65 + i)}.</span>{o}
                </p>
              ))}
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <span className="text-[10px] text-neutral-500">{selected.category} · {selected.level} · {selected.points} pts · {selected.integrity}</span>
              <span className="ml-auto flex gap-2" onClick={(e) => e.stopPropagation()}>
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(selected.text);
                    router.refresh();
                  }}
                  className="text-[10px] font-bold text-neutral-200 bg-white/[0.06] hover:bg-white/10 border border-white/10 rounded-lg px-2.5 py-1.5 transition-colors"
                >
                  Copy stem
                </button>
                <DeleteQuestionButton id={selected.id} isLocked={selected.locked} />
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Queue + latest */}
      <div className="grid lg:grid-cols-2 gap-4 items-stretch">
        <div className="rounded-2xl border border-white/10 bg-[#0e0f13] p-5">
          <div className="flex items-center justify-between mb-1">
            <h2 className="text-[15px] font-bold text-white">Quality queue</h2>
            <span className="text-[9px] font-black tracking-[0.14em] text-neutral-400 tabular-nums">{queue.length} PENDING</span>
          </div>
          {queue.length === 0 ? (
            <p className="text-xs text-neutral-500 py-4">Queue is clear. New submissions land here for review.</p>
          ) : (
            <div className="space-y-2 mt-2">
              {queue.slice(0, 4).map((it) => (
                <div key={it.id} className="flex items-center gap-3">
                  <p className="flex-1 text-[11px] text-neutral-200 leading-snug line-clamp-2 min-w-0">
                    <span className="font-mono text-neutral-500">{it.qcode} ++ </span>{it.text}
                  </p>
                  <button
                    disabled={approving === it.id}
                    onClick={() => approve(it.id)}
                    className="text-[10px] font-black text-black bg-lime-300 hover:brightness-110 rounded-lg px-2.5 py-1.5 transition-all disabled:opacity-50 shrink-0"
                  >
                    Approve
                  </button>
                </div>
              ))}
            </div>
          )}
          {queue.length > 0 && (
            <button
              onClick={approveAll}
              disabled={approvingAll}
              className="mt-3 text-[11px] font-black text-black bg-lime-300 hover:brightness-110 rounded-xl px-4 py-2 transition-all disabled:opacity-50"
            >
              {approvingAll ? "Approving…" : `Approve all ${queue.length}`}
            </button>
          )}
          <p className="mt-2.5 text-[10px] text-neutral-600">Content reviews · possible duplicates · missing explanations surface here.</p>
        </div>

        <div className="rounded-2xl border border-white/10 bg-[#0e0f13] p-5">
          <div className="flex items-center justify-between mb-1">
            <h2 className="text-[15px] font-bold text-white">Latest additions</h2>
            <span className="text-[9px] font-bold tracking-[0.14em] text-neutral-500 tabular-nums">
              {latest.count24h} IN 24H
            </span>
          </div>
          {latest.items.length === 0 ? (
            <p className="text-xs text-neutral-500 py-4">Nothing added yet.</p>
          ) : (
            <div className="space-y-2 mt-2">
              {latest.items.map((it) => (
                <div key={it.qcode} className="flex items-baseline gap-3">
                  <span className="text-[10px] font-mono font-bold text-lime-200 shrink-0">{it.qcode}</span>
                  <p className="flex-1 text-[11px] text-neutral-300 truncate">{it.text}</p>
                  <span className="text-[10px] text-neutral-600 shrink-0">{it.createdLabel}</span>
                </div>
              ))}
            </div>
          )}
          <p className="mt-2.5 text-[10px] text-neutral-600">New manual, CSV and paste additions land here first as drafts.</p>
        </div>
      </div>
    </div>
  );
}
