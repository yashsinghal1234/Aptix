"use client";

import React, { useState, useMemo } from "react";
import Link from "next/link";
import { FilterChip } from "@/components/owner/FilterChip";

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
  totalMarks?: number;
}

export interface AttendanceData {
  /** Roster (expected students) for the session, by email + name. */
  roster: { email: string; name: string | null }[];
  /** Emails that actually attempted this session. */
  attempted: string[];
  /** Per-candidate attempt summary within this session. */
  scores: Record<string, { attemptId: string; score: number; status: string }>;
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
  attendance = {},
}: {
  rows: CandidateRow[];
  sessions: RecordSession[];
  attendance?: Record<string, AttendanceData>;
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

  // Roster-aware attendance for the selected cohort (report-only).
  const cohortAtt = useMemo(() => {
    const data = cohort ? attendance?.[cohort] : null;
    if (!data || data.roster.length === 0) return null;
    const rosterSet = new Set(data.roster.map((r) => r.email.toLowerCase()));
    const attemptedSet = new Set(data.attempted.map((e) => e.toLowerCase()));
    const counts = { present: 0, absent: 0, unrostered: 0 };
    for (const e of rosterSet) attemptedSet.has(e) ? counts.present++ : counts.absent++;
    for (const e of attemptedSet) if (!rosterSet.has(e)) counts.unrostered++;
    return { rosterSet, attemptedSet, scores: data.scores || {}, counts };
  }, [cohort, attendance]);
  const cohortSession = cohort ? sessions.find((s) => s.id === cohort) || null : null;

  const filtered = rows.filter((r) => {
    if (q) {
      const s = `${r.name} ${r.email} ${r.roll}`.toLowerCase();
      if (!s.includes(q.toLowerCase())) return false;
    }
    if (cohort) {
      if (cohortAtt) {
        // Roster mode: show only students relevant to this exam (expected or attempted)
        const isAttempted = cohortAtt.attemptedSet.has(r.email.toLowerCase());
        const isRostered = cohortAtt.rosterSet.has(r.email.toLowerCase());
        if (!isAttempted && !isRostered) return false;
      } else if (r.latest?.sessionId !== cohort) return false;
    }
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
    const head = "Name,Email,Roll,Total Exams,Latest Exam,Score,Status,Flags,Session Attendance\n";
    const body = filtered
      .map((r) => {
        const emailL = r.email.toLowerCase();
        const isAttempted = !!cohortAtt && cohortAtt.attemptedSet.has(emailL);
        const isRostered = !!cohortAtt && cohortAtt.rosterSet.has(emailL);
        const sessionAttendance = cohortAtt
          ? isRostered && isAttempted
            ? "Present"
            : isRostered
              ? "Absent"
              : "Unrostered"
          : "";
        return [
          `"${r.name.replace(/"/g, '""')}"`,
          r.email,
          r.roll,
          r.totalExams,
          r.latest ? `"${r.latest.examTitle.replace(/"/g, '""')}"` : "No attempt",
          r.latest ? r.latest.score.toFixed(1) : "",
          r.latest ? r.latest.status : "NO_ATTEMPT",
          r.flags,
          sessionAttendance,
        ].join(",");
      })
      .join("\n");
    const url = URL.createObjectURL(new Blob([head + body], { type: "text/csv" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = "candidate-records.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-4">
      {/* Finder */}
      <div className="rounded-2xl border border-white/10 bg-[#0e0f13] p-5">
        <h2 className="text-[15px] font-bold text-white mb-3">Find a candidate</h2>
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative grow basis-[240px]">
            <svg className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-neutral-600 pointer-events-none" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24" aria-hidden>
              <circle cx="11" cy="11" r="7" />
              <path strokeLinecap="round" d="M20 20l-3.5-3.5" />
            </svg>
            <input
              value={q}
              onChange={(e) => { setQ(e.target.value); resetPage(); }}
              placeholder="Search candidate name, email or registration ID"
              className="w-full h-9 pl-9 pr-3 text-xs bg-black/60 border border-white/10 rounded-lg outline-none font-medium text-white placeholder-neutral-600 focus:border-lime-300/50"
            />
          </div>
          <FilterChip
            label={(sessions.find((s) => s.id === cohort)?.pin || sessions.find((s) => s.id === cohort)?.examTitle) || "All cohorts"}
            minWidth="min-w-[220px]"
            options={[
              { label: "All cohorts", active: cohort === "", onSelect: () => { setCohort(""); resetPage(); } },
              ...sessions.map((s) => ({
                label: s.pin || s.examTitle,
                active: cohort === s.id,
                onSelect: () => { setCohort(s.id); resetPage(); },
              })),
            ]}
          />
          <FilterChip
            label={exam || "All exams"}
            options={[
              { label: "All exams", active: exam === "", onSelect: () => { setExam(""); resetPage(); } },
              ...examTitles.map((t) => ({
                label: t,
                active: exam === t,
                onSelect: () => { setExam(t); resetPage(); },
              })),
            ]}
          />
          <FilterChip
            label={integrity === "clean" ? "Clean only" : integrity === "flagged" ? "Flagged only" : "All candidates"}
            options={[
              { label: "All candidates", active: integrity === "", onSelect: () => { setIntegrity(""); resetPage(); } },
              { label: "Clean only", active: integrity === "clean", onSelect: () => { setIntegrity("clean"); resetPage(); } },
              { label: "Flagged only", active: integrity === "flagged", onSelect: () => { setIntegrity("flagged"); resetPage(); } },
            ]}
          />
          <FilterChip
            label={status === "in_progress" ? "In progress" : status === "submitted" ? "Submitted" : status === "none" ? "No attempt" : "All statuses"}
            options={[
              { label: "All statuses", active: status === "", onSelect: () => { setStatus(""); resetPage(); } },
              { label: "In progress", active: status === "in_progress", onSelect: () => { setStatus("in_progress"); resetPage(); } },
              { label: "Submitted", active: status === "submitted", onSelect: () => { setStatus("submitted"); resetPage(); } },
              { label: "No attempt", active: status === "none", onSelect: () => { setStatus("none"); resetPage(); } },
            ]}
          />
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
          {cohortAtt && cohortSession
            ? `Showing ${shown.length} roster/attempt records · ${cohortSession.examTitle}: ${cohortAtt.counts.present} present · ${cohortAtt.counts.absent} absent · ${cohortAtt.counts.unrostered} unrostered`
            : `Showing ${shown.length} of ${filtered.length} total records · latest score reflects the selected session`}
        </p>
        <div className="overflow-x-auto -mx-1 px-1">
          <table className="w-full min-w-[1000px] border-collapse text-left">
            <thead>
              <tr className="border-b border-white/[0.08] text-neutral-400">
                <th className="pb-3 text-xs font-semibold text-left pl-1">
                  <span className="inline-flex items-center gap-2"><UserIconC className="w-4 h-4" /> Candidate</span>
                </th>
                <th className="pb-3 text-xs font-semibold text-center w-[110px]">
                  <span className="inline-flex items-center gap-2 justify-center"><ListIconC className="w-4 h-4" /> Exams</span>
                </th>
                <th className="pb-3 text-xs font-semibold text-left w-[200px]">
                  <span className="inline-flex items-center gap-2"><DocIconC className="w-4 h-4" /> Latest exam</span>
                </th>
                <th className="pb-3 text-xs font-semibold text-center w-[160px]">
                  <span className="inline-flex items-center gap-2 justify-center"><GaugeIconC className="w-4 h-4" /> Score</span>
                </th>
                <th className="pb-3 text-xs font-semibold text-center w-[90px]">
                  <span className="inline-flex items-center gap-2 justify-center"><FlagIconC className="w-4 h-4" /> Flags</span>
                </th>
                <th className="pb-3 text-xs font-semibold text-center w-[110px]">Action</th>
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
                  const emailL = r.email.toLowerCase();
                  const isAttempted = !!cohortAtt && cohortAtt.attemptedSet.has(emailL);
                  const isRostered = !!cohortAtt && cohortAtt.rosterSet.has(emailL);
                  const cohortScore = cohortAtt ? cohortAtt.scores[r.id] || null : null;
                  const attPill =
                    cohortAtt && isRostered && isAttempted
                      ? { dot: "bg-emerald-400", label: "Present", text: "text-emerald-300" }
                      : cohortAtt && isRostered
                        ? { dot: "bg-rose-400", label: "Absent", text: "text-rose-300" }
                        : cohortAtt
                          ? { dot: "bg-amber-400", label: "Unrostered", text: "text-amber-300" }
                          : null;
                  const examTitle = cohortAtt ? cohortSession?.examTitle || "—" : r.latest?.examTitle || "";
                  return (
                    <tr
                      key={r.id}
                      onClick={() => setSelectedId(sel ? null : r.id)}
                      className={`group cursor-pointer transition-colors hover:bg-white/[0.02] ${
                        sel ? "bg-lime-300/[0.04]" : ""
                      }`}
                    >
                      <td className="py-3 px-3 align-middle">
                        <p className={`text-[13px] font-bold truncate transition-colors ${sel ? "text-lime-200" : "text-white group-hover:text-lime-200"}`}>
                          {r.name}
                        </p>
                      </td>
                      <td className="py-3 px-3 text-[13px] font-bold text-white tabular-nums text-center align-middle">
                        {r.totalExams}
                      </td>
                      <td className="py-3 px-3 align-middle">
                        <div className="text-xs text-neutral-300 truncate">
                          {examTitle || <span className="text-neutral-600">—</span>}
                        </div>
                      </td>
                      <td className="py-3 px-3 text-xs text-neutral-200 tabular-nums text-center whitespace-nowrap align-middle">
                        {cohortAtt ? (
                          <div className="flex flex-col items-center gap-1">
                            {attPill && (
                              <DotPillC dot={attPill.dot} label={attPill.label} text={attPill.text} />
                            )}
                            {cohortScore ? (
                              cohortScore.status === "SUBMITTED" && cohortSession && (cohortSession.totalMarks || 0) > 0 ? (
                                <span className="text-[11px] text-neutral-200 tabular-nums">
                                  {cohortScore.score.toFixed(0)} / {((cohortScore.score / (cohortSession.totalMarks as number)) * 100).toFixed(1)}%
                                </span>
                              ) : (
                                <span className="text-[10px] text-neutral-500">Attempt in progress · {cohortScore.score.toFixed(0)} pts</span>
                              )
                            ) : (
                              <span className="text-[10px] text-neutral-600">Rostered · no attempt</span>
                            )}
                          </div>
                        ) : r.latest ? (
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
                      <td className="py-3 px-3 text-center align-middle" onClick={(e) => e.stopPropagation()}>
                        {(cohortAtt ? cohortScore : r.latest) ? (
                          <Link
                            href={`/dashboard/owner/results/${cohortAtt ? cohort : r.latest!.sessionId}/candidate/${cohortAtt ? cohortScore!.attemptId : r.latest!.attemptId}`}
                            className="inline-flex items-center text-[11.5px] font-bold text-neutral-300 bg-white/[0.05] hover:bg-white/[0.1] hover:text-white border border-white/10 rounded-md px-2.5 py-1.5 transition-colors whitespace-nowrap"
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
            <FilterChip
              label={String(per)}
              options={[10, 20, 50].map((n) => ({
                label: String(n),
                active: per === n,
                onSelect: () => { setPer(n); setPage(0); },
              }))}
            />
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

    </div>
  );
}
