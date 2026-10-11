"use client";

import React, { useState, useMemo } from "react";
import Link from "next/link";

export interface CandidateRow {
  id: string;
  name: string;
  email: string;
  roll: string;
  totalExams: number;
  latest: {
    attemptId: string;
    sessionId: string;
    examTitle: string;
    totalMarks: number;
    score: number;
    status: string;
  } | null;
  flags: number;
}

export interface RecordSession {
  id: string;
  pin: string | null;
  examTitle: string;
}

export function CandidateRecordsOps({
  rows,
  sessions,
}: {
  rows: CandidateRow[];
  sessions: RecordSession[];
}) {
  const [q, setQ] = useState("");
  const [cohort, setCohort] = useState("");
  const [exam, setExam] = useState("");
  const [integrity, setIntegrity] = useState("");
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(0);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const PER = 10;

  const examTitles = useMemo(
    () => Array.from(new Set(rows.map((r) => r.latest?.examTitle).filter(Boolean))) as string[],
    [rows]
  );

  const filtered = rows.filter((r) => {
    if (q) {
      const s = `${r.name} ${r.email} ${r.roll}`.toLowerCase();
      if (!s.includes(q.toLowerCase())) return false;
    }
    if (cohort && r.latest?.sessionId !== cohort) return false;
    if (exam && r.latest?.examTitle !== exam) return false;
    if (integrity === "clean" && r.flags > 0) return false;
    if (integrity === "flagged" && r.flags === 0) return false;
    if (status === "in_progress" && r.latest?.status !== "IN_PROGRESS") return false;
    if (status === "submitted" && r.latest?.status !== "SUBMITTED") return false;
    if (status === "none" && r.latest) return false;
    return true;
  });

  const pages = Math.max(1, Math.ceil(filtered.length / PER));
  const shown = filtered.slice(page * PER, page * PER + PER);
  const selected = rows.find((r) => r.id === selectedId) || null;

  const resetPage = () => setPage(0);

  const exportCsv = () => {
    const head = "Name,Email,Roll,Total Exams,Latest Exam,Score,Status,Flags\n";
    const body = filtered
      .map((r) =>
        [
          `"${r.name.replace(/"/g, '""')}"`,
          r.email,
          r.roll,
          r.totalExams,
          r.latest ? `"${r.latest.examTitle.replace(/"/g, '""')}"` : "No attempt",
          r.latest ? r.latest.score.toFixed(1) : "",
          r.latest ? r.latest.status : "NO_ATTEMPT",
          r.flags,
        ].join(",")
      )
      .join("\n");
    const url = URL.createObjectURL(new Blob([head + body], { type: "text/csv" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = "candidate-records.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  const selectCls =
    "text-[11px] bg-black/60 border border-white/10 rounded-xl px-3 py-2.5 outline-none font-semibold text-neutral-200 cursor-pointer w-full";

  return (
    <div className="space-y-4">
      {/* Finder */}
      <div className="rounded-2xl border border-white/10 bg-[#0e0f13] p-5">
        <h2 className="text-[15px] font-bold text-white">Find a candidate</h2>
        <input
          value={q}
          onChange={(e) => { setQ(e.target.value); resetPage(); }}
          placeholder="Search candidate name, email or registration ID"
          className="mt-3 w-full px-4 py-2.5 text-xs bg-black/60 border border-white/10 rounded-xl outline-none font-medium text-white placeholder-neutral-600 focus:border-lime-300/50"
        />
        <div className="mt-3 grid grid-cols-2 lg:grid-cols-4 gap-2.5">
          <label className="block">
            <span className="block text-[9px] font-bold tracking-[0.14em] text-neutral-600 mb-1">COHORT</span>
            <select value={cohort} onChange={(e) => { setCohort(e.target.value); resetPage(); }} className={selectCls}>
              <option value="">All cohorts</option>
              {sessions.map((s) => (
                <option key={s.id} value={s.id}>{s.pin || s.examTitle}</option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="block text-[9px] font-bold tracking-[0.14em] text-neutral-600 mb-1">LATEST EXAM</span>
            <select value={exam} onChange={(e) => { setExam(e.target.value); resetPage(); }} className={selectCls}>
              <option value="">All exams</option>
              {examTitles.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </label>
          <label className="block">
            <span className="block text-[9px] font-bold tracking-[0.14em] text-neutral-600 mb-1">INTEGRITY FILTER</span>
            <select value={integrity} onChange={(e) => { setIntegrity(e.target.value); resetPage(); }} className={selectCls}>
              <option value="">All candidates</option>
              <option value="clean">Clean only</option>
              <option value="flagged">Flagged only</option>
            </select>
          </label>
          <label className="block">
            <span className="block text-[9px] font-bold tracking-[0.14em] text-neutral-600 mb-1">ATTEMPT STATUS</span>
            <select value={status} onChange={(e) => { setStatus(e.target.value); resetPage(); }} className={selectCls}>
              <option value="">All statuses</option>
              <option value="in_progress">In progress</option>
              <option value="submitted">Submitted</option>
              <option value="none">No attempt</option>
            </select>
          </label>
        </div>
      </div>

      {/* Table */}
      <div className="rounded-2xl border border-white/10 bg-[#0e0f13] p-5">
        <div className="flex items-center justify-between gap-3 mb-3">
          <h2 className="text-[15px] font-bold text-white">Candidate records</h2>
          <button
            type="button"
            onClick={exportCsv}
            className="text-[11px] font-bold text-neutral-200 bg-white/[0.05] hover:bg-white/10 border border-white/10 rounded-lg px-3 py-1.5 transition-colors whitespace-nowrap"
          >
            Export candidate records
          </button>
        </div>
        <p className="text-[10px] text-neutral-500 mb-3">
          Showing {shown.length} of {filtered.length} total records · latest score reflects the selected session
        </p>
        <div className="overflow-x-auto -mx-1 px-1">
          <div className="grid grid-cols-[1.5fr_auto_1.2fr_auto_auto_auto] gap-x-4 gap-y-1 items-center min-w-[820px]">
            {(["NAME / ROLL", "TOTAL EXAMS", "LATEST EXAM", "LATEST SCORE / %", "FLAGS", "AUDIT"] as const).map((h, i) => (
              <p key={h} className={`text-[9px] font-bold tracking-[0.16em] text-neutral-600 pb-2 ${i >= 1 ? "text-center" : ""} ${i === 5 ? "text-right" : ""}`}>{h}</p>
            ))}
            {shown.length === 0 && (
              <p className="col-span-6 text-xs text-neutral-500 py-6 text-center">No candidates match these filters.</p>
            )}
            {shown.map((r) => {
              const pct = r.latest && r.latest.totalMarks > 0 ? (r.latest.score / r.latest.totalMarks) * 100 : null;
              const sel = selectedId === r.id;
              return (
                <React.Fragment key={r.id}>
                  <div onClick={() => setSelectedId(sel ? null : r.id)} className="py-3 border-t border-white/[0.06] pr-2 min-w-0 cursor-pointer group">
                    <p className={`text-xs font-bold truncate transition-colors ${sel ? "text-lime-200" : "text-white group-hover:text-lime-200"}`}>{r.name}</p>
                    <p className="text-[10px] text-neutral-500 font-mono truncate">{r.roll}</p>
                  </div>
                  <p className="py-3 border-t border-white/[0.06] text-xs font-bold text-white tabular-nums text-center">{r.totalExams}</p>
                  <p className="py-3 border-t border-white/[0.06] text-[11px] text-neutral-300 truncate pr-2">{r.latest?.examTitle || <span className="text-neutral-600">—</span>}</p>
                  <p className="py-3 border-t border-white/[0.06] text-[11px] text-neutral-200 tabular-nums text-center whitespace-nowrap">
                    {r.latest ? `${r.latest.score.toFixed(0)} / ${pct !== null ? pct.toFixed(1) : "—"}%` : <span className="text-neutral-600">Absent · no attempt</span>}
                  </p>
                  <p className="py-3 border-t border-white/[0.06] text-center">
                    {r.flags > 0 ? (
                      <span className="text-[11px] font-bold text-[#f2a488] tabular-nums">{r.flags}</span>
                    ) : (
                      <span className="text-[11px] text-neutral-600 tabular-nums">0</span>
                    )}
                  </p>
                  <div className="py-3 border-t border-white/[0.06] text-right" onClick={(e) => e.stopPropagation()}>
                    {r.latest ? (
                      <Link
                        href={`/dashboard/owner/results/${r.latest.sessionId}/candidate/${r.latest.attemptId}`}
                        className="text-[10px] font-bold text-neutral-200 bg-white/[0.06] hover:bg-white/10 border border-white/10 rounded-lg px-2.5 py-1.5 transition-colors whitespace-nowrap"
                      >
                        Audit →
                      </Link>
                    ) : (
                      <span className="text-[10px] text-neutral-600">—</span>
                    )}
                  </div>
                </React.Fragment>
              );
            })}
          </div>
        </div>
        <div className="mt-3 flex items-center justify-between text-[10px] text-neutral-600">
          <span>Latest scores use the locked assessment snapshot. Percentages are rounded to one decimal place; flags do not modify marks.</span>
          <span className="flex gap-1.5 shrink-0 ml-3">
            <button disabled={page === 0} onClick={() => setPage((p) => p - 1)} className="px-2.5 py-1 rounded-md border border-white/10 text-neutral-300 disabled:opacity-40 hover:bg-white/5">← Previous</button>
            <button disabled={page + 1 >= pages} onClick={() => setPage((p) => p + 1)} className="px-2.5 py-1 rounded-md border border-white/10 text-neutral-300 disabled:opacity-40 hover:bg-white/5">Next →</button>
          </span>
        </div>
      </div>

      {/* Selected record + explainer */}
      <div className="grid lg:grid-cols-2 gap-4 items-stretch">
        <div className="rounded-2xl border border-lime-300/20 bg-lime-300/[0.03] p-5">
          {selected ? (
            <>
              <p className="text-[10px] font-bold tracking-[0.16em] text-neutral-500">SELECTED RECORD · {selected.name}</p>
              <p className="mt-2 text-xs text-neutral-300 leading-relaxed">
                <span className="font-mono">{selected.roll}</span> · {selected.totalExams} exam{selected.totalExams === 1 ? "" : "s"} ·{" "}
                {selected.latest
                  ? `${selected.latest.score.toFixed(1)} in ${selected.latest.examTitle}`
                  : "no attempts yet"}
                {selected.flags > 0 ? ` · ${selected.flags} flag${selected.flags === 1 ? "" : "s"} on file` : " · clean record"}
              </p>
              {selected.latest && (
                <Link
                  href={`/dashboard/owner/results/${selected.latest.sessionId}/candidate/${selected.latest.attemptId}`}
                  className="mt-3 inline-flex text-[11px] font-black text-black bg-lime-300 hover:brightness-110 rounded-lg px-3.5 py-2 transition-all"
                >
                  Open Audit →
                </Link>
              )}
            </>
          ) : (
            <>
              <p className="text-[10px] font-bold tracking-[0.16em] text-neutral-500">SELECTED RECORD</p>
              <p className="mt-2 text-xs text-neutral-500">Click any candidate row to inspect their record here.</p>
            </>
          )}
        </div>
        <div className="rounded-2xl border border-white/10 bg-[#0e0f13] p-5">
          <p className="text-[13px] font-bold text-white">Flags are review signals</p>
          <p className="mt-1.5 text-[11px] text-neutral-400 leading-relaxed">
            Dismissing an integrity flag is not a cheating verdict. Overruling stays with the reviewer: evidence, context and reviewer identity remain recorded separately.
          </p>
        </div>
      </div>
    </div>
  );
}
