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

function UserIconC({ className }: { className?: string }) {
  return (
    <svg className={className || "w-3.5 h-3.5"} fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor" aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.76a4.125 4.125 0 015.16-5.05M6.75 15.75a3.75 3.75 0 104.5-6 3.75 3.75 0 00-4.5 6z" />
    </svg>
  );
}

function ListIconC({ className }: { className?: string }) {
  return (
    <svg className={className || "w-3.5 h-3.5"} fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor" aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h10" />
    </svg>
  );
}

function DocIconC({ className }: { className?: string }) {
  return (
    <svg className={className || "w-3.5 h-3.5"} fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor" aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
    </svg>
  );
}

function GaugeIconC({ className }: { className?: string }) {
  return (
    <svg className={className || "w-3.5 h-3.5"} fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor" aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 20h18M5 20v-5m4 5v-9m4 9V9m4 11v-7" />
    </svg>
  );
}

function FlagIconC({ className }: { className?: string }) {
  return (
    <svg className={className || "w-3.5 h-3.5"} fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor" aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1zm0 0v7" />
    </svg>
  );
}

function ChevLeftIconC({ className }: { className?: string }) {
  return (
    <svg className={className || "w-4 h-4"} fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
    </svg>
  );
}

function ChevRightIconC({ className }: { className?: string }) {
  return (
    <svg className={className || "w-4 h-4"} fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
    </svg>
  );
}

function ChevsLeftIconC({ className }: { className?: string }) {
  return (
    <svg className={className || "w-4 h-4"} fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" d="M18.75 19.5l-7.5-7.5 7.5-7.5m-6 15L5.25 12l7.5-7.5" />
    </svg>
  );
}

function ChevsRightIconC({ className }: { className?: string }) {
  return (
    <svg className={className || "w-4 h-4"} fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" d="M5.25 4.5l7.5 7.5-7.5 7.5m6-15l7.5 7.5-7.5 7.5" />
    </svg>
  );
}

/** Status-style pill: colored dot + label inside a hairline box. */
function DotPillC({ dot, label, text = "text-neutral-300" }: { dot: string; label: string; text?: string }) {
  return (
    <span className={`inline-flex items-center gap-2 px-2.5 py-1 rounded-md border border-white/10 bg-white/[0.03] text-[11.5px] font-bold whitespace-nowrap justify-center ${text}`}>
      <span className={`w-2 h-2 rounded-full ${dot}`} />
      {label}
    </span>
  );
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
  const [per, setPer] = useState(10);
  const [selectedId, setSelectedId] = useState<string | null>(null);

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

  const pages = Math.max(1, Math.ceil(filtered.length / per));
  const shown = filtered.slice(page * per, page * per + per);
  const selected = rows.find((r) => r.id === selectedId) || null;

  // Numbered pagination window: first + surrounding current + last, "…" between gaps.
  const pageNumbers = useMemo(() => {
    const idxs = Array.from(new Set([0, page - 1, page, page + 1, pages - 1].filter((n) => n >= 0 && n < pages))).sort((a, b) => a - b);
    const out: Array<number | "gap"> = [];
    let prev = -2;
    for (const n of idxs) {
      if (n - prev > 1) out.push("gap");
      out.push(n);
      prev = n;
    }
    return out;
  }, [page, pages]);

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
          <table className="w-full min-w-[1000px] border-collapse text-left">
            <thead>
              <tr className="border-b border-white/[0.08] text-neutral-400">
                <th className="pb-3 text-xs font-semibold text-left">
                  <span className="inline-flex items-center gap-2"><UserIconC className="w-4 h-4" /> Candidate</span>
                </th>
                <th className="pb-3 text-xs font-semibold text-center w-[120px]">
                  <span className="inline-flex items-center gap-2 justify-center"><ListIconC className="w-4 h-4" /> Exams</span>
                </th>
                <th className="pb-3 text-xs font-semibold text-left">
                  <span className="inline-flex items-center gap-2"><DocIconC className="w-4 h-4" /> Latest exam</span>
                </th>
                <th className="pb-3 text-xs font-semibold text-center w-[180px]">
                  <span className="inline-flex items-center gap-2 justify-center"><GaugeIconC className="w-4 h-4" /> Score</span>
                </th>
                <th className="pb-3 text-xs font-semibold text-center w-[90px]">
                  <span className="inline-flex items-center gap-2 justify-center"><FlagIconC className="w-4 h-4" /> Flags</span>
                </th>
                <th className="pb-3 text-xs font-semibold text-right w-[110px]">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.06]">
              {shown.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-xs text-neutral-500 py-8 text-center">
                    No candidates match these filters.
                  </td>
                </tr>
              ) : (
                shown.map((r) => {
                  const pct = r.latest && r.latest.totalMarks > 0 ? (r.latest.score / r.latest.totalMarks) * 100 : null;
                  const sel = selectedId === r.id;
                  return (
                    <tr
                      key={r.id}
                      onClick={() => setSelectedId(sel ? null : r.id)}
                      className={`group cursor-pointer transition-colors hover:bg-white/[0.02] ${
                        sel ? "bg-lime-300/[0.04]" : ""
                      }`}
                    >
                      <td className="py-3 pr-4 align-middle">
                        <p className={`text-[13px] font-bold truncate transition-colors ${sel ? "text-lime-200" : "text-white group-hover:text-lime-200"}`}>
                          {r.name}
                        </p>
                        <p className="text-[11px] text-neutral-500 font-mono truncate">{r.roll}</p>
                      </td>
                      <td className="py-3 px-3 text-[13px] font-bold text-white tabular-nums text-center align-middle">
                        {r.totalExams}
                      </td>
                      <td className="py-3 px-3 text-xs text-neutral-300 truncate max-w-[320px] align-middle">
                        {r.latest?.examTitle || <span className="text-neutral-600">—</span>}
                      </td>
                      <td className="py-3 px-3 text-xs text-neutral-200 tabular-nums text-center whitespace-nowrap align-middle">
                        {r.latest ? (
                          `${r.latest.score.toFixed(0)} / ${pct !== null ? pct.toFixed(1) : "—"}%`
                        ) : (
                          <span className="text-neutral-600">Absent · no attempt</span>
                        )}
                      </td>
                      <td className="py-3 px-3 text-center align-middle">
                        <DotPillC
                          dot={r.flags > 0 ? "bg-rose-400" : "bg-neutral-500"}
                          label={String(r.flags)}
                          text={r.flags > 0 ? "text-rose-300" : "text-neutral-400"}
                        />
                      </td>
                      <td className="py-3 pl-3 text-right align-middle" onClick={(e) => e.stopPropagation()}>
                        {r.latest ? (
                          <Link
                            href={`/dashboard/owner/results/${r.latest.sessionId}/candidate/${r.latest.attemptId}`}
                            className="text-[11.5px] font-bold text-neutral-300 bg-white/[0.05] hover:bg-white/[0.1] hover:text-white border border-white/10 rounded-md px-2.5 py-1.5 transition-colors whitespace-nowrap"
                          >
                            Audit →
                          </Link>
                        ) : (
                          <span className="text-[11px] text-neutral-600">—</span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
        <p className="mt-3 text-[11px] text-neutral-500">
          Latest scores use the locked assessment snapshot. Percentages are rounded to one decimal place; flags do not modify marks.
        </p>
        <div className="mt-2 pt-3 border-t border-white/[0.06] flex items-center justify-between gap-3 text-[11px] text-neutral-400">
          <div className="flex items-center gap-2.5">
            <span>Rows per page</span>
            <select
              value={per}
              onChange={(e) => { setPer(Number(e.target.value)); setPage(0); }}
              className="h-9 bg-black/60 border border-white/10 rounded-md px-2 text-xs font-bold text-neutral-200 outline-none cursor-pointer"
            >
              {[10, 20, 50].map((n) => (
                <option key={n} value={n} className="bg-[#12141a]">{n}</option>
              ))}
            </select>
            <span className="tabular-nums">
              {filtered.length === 0 ? "0 rows" : `${page * per + 1}–${Math.min(filtered.length, (page + 1) * per)} of ${filtered.length} rows`}
            </span>
          </div>
          <div className="flex items-center gap-1">
            {[
              { key: "first", icon: <ChevsLeftIconC />, target: 0, disabled: page === 0, title: "First page" },
              { key: "prev", icon: <ChevLeftIconC />, target: page - 1, disabled: page === 0, title: "Previous page" },
            ].map((b) => (
              <button
                key={b.key}
                disabled={b.disabled}
                onClick={() => setPage(b.target)}
                className="h-9 min-w-9 grid place-items-center rounded-md text-neutral-400 hover:bg-white/[0.06] hover:text-white transition-colors disabled:opacity-30 disabled:pointer-events-none cursor-pointer"
                title={b.title}
              >
                {b.icon}
              </button>
            ))}
            {pageNumbers.map((n, i) =>
              n === "gap" ? (
                <span key={`gap-${i}`} className="px-1 text-neutral-600 tabular-nums">…</span>
              ) : (
                <button
                  key={n}
                  onClick={() => setPage(n)}
                  className={`h-9 min-w-9 rounded-md text-xs font-bold tabular-nums transition-colors cursor-pointer ${
                    n === page ? "bg-white text-black" : "text-neutral-400 hover:bg-white/[0.06] hover:text-white"
                  }`}
                >
                  {n + 1}
                </button>
              )
            )}
            {[
              { key: "next", icon: <ChevRightIconC />, target: page + 1, disabled: page + 1 >= pages, title: "Next page" },
              { key: "last", icon: <ChevsRightIconC />, target: pages - 1, disabled: page + 1 >= pages, title: "Last page" },
            ].map((b) => (
              <button
                key={b.key}
                disabled={b.disabled}
                onClick={() => setPage(b.target)}
                className="h-9 min-w-9 grid place-items-center rounded-md text-neutral-400 hover:bg-white/[0.06] hover:text-white transition-colors disabled:opacity-30 disabled:pointer-events-none cursor-pointer"
                title={b.title}
              >
                {b.icon}
              </button>
            ))}
          </div>
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
