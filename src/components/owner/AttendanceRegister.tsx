"use client";

import React, { useMemo, useEffect, useState } from "react";
import { FilterChip } from "@/components/owner/FilterChip";

type RosterRow = { email: string; name: string | null };
type AttemptSlim = { email: string; status: string };

type Status = "PRESENT" | "ABSENT" | "UNROSTERED";

type Row = {
  name: string;
  email: string;
  status: Status;
  submitted: boolean;
};

/** Status-style pill: colored dot + label inside a hairline box. */
function DotPillA({ dot, label, text }: { dot: string; label: string; text: string }) {
  return (
    <span className={`inline-flex items-center gap-2 px-2.5 py-1 rounded-md border border-white/10 bg-white/[0.03] text-[11.5px] font-bold whitespace-nowrap justify-center ${text}`}>
      <span className={`w-2 h-2 rounded-full ${dot}`} />
      {label}
    </span>
  );
}

function ListIconA({ className }: { className?: string }) {
  return (
    <svg className={className || "w-4 h-4"} fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor" aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" d="M8 6h13M8 12h13M8 18h13M3.5 6h.01M3.5 12h.01M3.5 18h.01" />
    </svg>
  );
}

function UserIconA({ className }: { className?: string }) {
  return (
    <svg className={className || "w-4 h-4"} fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor" aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.5 20.1a8.25 8.25 0 0115 0" />
    </svg>
  );
}

function GaugeIconA({ className }: { className?: string }) {
  return (
    <svg className={className || "w-4 h-4"} fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor" aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );
}

function DownloadIconA({ className }: { className?: string }) {
  return (
    <svg className={className || "w-3.5 h-3.5"} fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12M12 16.5V3" />
    </svg>
  );
}

function ChevLeftIconA({ className }: { className?: string }) {
  return (
    <svg className={className || "w-4 h-4"} fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
    </svg>
  );
}

function ChevRightIconA({ className }: { className?: string }) {
  return (
    <svg className={className || "w-4 h-4"} fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
    </svg>
  );
}

function ChevsLeftIconA({ className }: { className?: string }) {
  return (
    <svg className={className || "w-4 h-4"} fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" d="M18.75 19.5l-7.5-7.5 7.5-7.5m-6 15L5.25 12l7.5-7.5" />
    </svg>
  );
}

function ChevsRightIconA({ className }: { className?: string }) {
  return (
    <svg className={className || "w-4 h-4"} fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" d="M5.25 4.5l7.5 7.5-7.5 7.5m6-15l7.5 7.5-7.5 7.5" />
    </svg>
  );
}

const STATUS_META: Record<Status, { label: string; dot: string; text: string }> = {
  PRESENT: { label: "Present", dot: "bg-emerald-400", text: "text-emerald-300" },
  ABSENT: { label: "Absent", dot: "bg-rose-400", text: "text-rose-300" },
  UNROSTERED: { label: "Unrostered", dot: "bg-amber-400", text: "text-amber-300" },
};

const displayEmail = (email: string) => email.split("@")[0];

/**
 * Attendance register for one exam session.
 * Report-only: joins the session roster against attempts.
 * Present  = rostered, has an attempt
 * Absent   = rostered, no attempt
 * Unrostered = attempted but not on the roster (data-hygiene flag)
 */
export default function AttendanceRegister({
  sessionId,
  examTitle,
  roster,
  attempts,
}: {
  sessionId: string;
  examTitle: string;
  roster: RosterRow[];
  attempts: AttemptSlim[];
}) {
  const [query, setQuery] = useState("");
  const [per, setPer] = useState(10);
  const [page, setPage] = useState(0);

  const rows = useMemo<Row[]>(() => {
    const rosterMap = new Map<string, RosterRow>();
    for (const r of roster) rosterMap.set(r.email.toLowerCase(), r);

    const attemptBy = new Map<string, AttemptSlim>();
    for (const a of attempts) attemptBy.set(a.email.toLowerCase(), a);

    const out: Row[] = [];
    for (const r of roster) {
      const email = r.email.toLowerCase();
      const attempt = attemptBy.get(email);
      out.push({
        name: r.name || displayEmail(r.email),
        email: r.email,
        status: attempt ? "PRESENT" : "ABSENT",
        submitted: attempt ? attempt.status === "SUBMITTED" : false,
      });
    }
    for (const a of attempts) {
      if (!rosterMap.has(a.email.toLowerCase())) {
        out.push({
          name: displayEmail(a.email),
          email: a.email,
          status: "UNROSTERED",
          submitted: a.status === "SUBMITTED",
        });
      }
    }
    return out.sort((x, y) => x.name.localeCompare(y.name));
  }, [roster, attempts]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((r) => r.name.toLowerCase().includes(q) || r.email.toLowerCase().includes(q));
  }, [rows, query]);

  useEffect(() => setPage(0), [query, per]);

  const counts = useMemo(() => {
    const c = { Present: 0, Absent: 0, Unrostered: 0 };
    for (const r of rows) c[r.status === "PRESENT" ? "Present" : r.status === "ABSENT" ? "Absent" : "Unrostered"] += 1;
    return c;
  }, [rows]);

  const pages = Math.max(1, Math.ceil(filtered.length / per));
  const shown = filtered.slice(page * per, page * per + per);

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

  const exportCsv = () => {
    const head = "Name,Email,Status,Submitted\n";
    const body = filtered
      .map((r) =>
        [
          `"${r.name.replace(/"/g, '""')}"`,
          `"${r.email.replace(/"/g, '""')}"`,
          STATUS_META[r.status].label,
          r.submitted ? "Yes" : "No",
        ].join(",")
      )
      .join("\n");
    const blob = new Blob([head + body], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `attendance-${examTitle.replace(/[^\w-]+/g, "-").slice(0, 40) || "session"}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="rounded-2xl border border-white/10 bg-[#0e0f13] p-5" id={`attendance-${sessionId}`}>
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
        <div>
          <p className="text-[10px] font-bold tracking-[0.18em] text-neutral-500">ATTENDANCE REGISTER</p>
          <p className="mt-1.5 text-[13px] font-bold text-white">Who was expected, who appeared</p>
        </div>
        <button
          type="button"
          onClick={exportCsv}
          disabled={filtered.length === 0}
          className="inline-flex items-center gap-2 border border-white/10 rounded-md px-3 py-2 text-[11.5px] font-bold text-neutral-300 hover:bg-white/[0.06] hover:text-white transition-colors cursor-pointer disabled:opacity-40 disabled:pointer-events-none"
        >
          <DownloadIconA /> Export CSV
        </button>
      </div>

      <p className="mt-2 flex flex-wrap items-center gap-2 text-[11px] text-neutral-500">
        {roster.length === 0 ? (
          <span>
            No roster uploaded for this session — upload one in the approved-students panel above. Only actual attempts are listed as present.
          </span>
        ) : (
          <>
            <span className="inline-flex items-center gap-2 text-emerald-300 font-bold"><span className="w-2 h-2 rounded-full bg-emerald-400" />{counts.Present} present</span>
            <span className="text-neutral-700">·</span>
            <span className="inline-flex items-center gap-2 text-rose-300 font-bold"><span className="w-2 h-2 rounded-full bg-rose-400" />{counts.Absent} absent</span>
            <span className="text-neutral-700">·</span>
            <span className="inline-flex items-center gap-2 text-amber-300 font-bold"><span className="w-2 h-2 rounded-full bg-amber-400" />{counts.Unrostered} unrostered</span>
          </>
        )}
      </p>

      {rows.length === 0 ? (
        <div className="mt-4 rounded-xl border border-white/[0.06] bg-white/[0.02] px-4 py-5 text-center">
          <p className="text-[13px] font-bold text-neutral-300">No attendance to show yet</p>
          <p className="mt-1 text-[11px] text-neutral-500">Upload a roster and/or wait for the first candidate attempt.</p>
        </div>
      ) : (
        <>
          <div className="mt-3 flex items-center justify-between gap-3">
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search name or email…"
              className="w-full sm:w-72 px-3 py-2 bg-black/60 border border-white/10 rounded-xl outline-none font-medium text-xs text-white placeholder-neutral-600 focus:border-lime-300/50"
            />
            <span className="text-[11px] text-neutral-500 tabular-nums whitespace-nowrap">{filtered.length} of {rows.length}</span>
          </div>

          <div className="overflow-x-auto -mx-1 px-1">
            <table className="w-full min-w-[640px] border-collapse text-left">
              <thead>
                <tr className="border-b border-white/[0.08] text-neutral-400">
                  <th className="pb-3 text-xs font-semibold text-left">
                    <span className="inline-flex items-center gap-2"><UserIconA className="w-4 h-4" /> Candidate</span>
                  </th>
                  <th className="pb-3 text-xs font-semibold text-center w-[180px]">
                    <span className="inline-flex items-center gap-2 justify-center"><GaugeIconA className="w-4 h-4" /> Status</span>
                  </th>
                  <th className="pb-3 text-xs font-semibold text-left w-[180px]">
                    <span className="inline-flex items-center gap-2"><ListIconA className="w-4 h-4" /> Detail</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {shown.length === 0 && (
                  <tr>
                    <td colSpan={3} className="py-6 text-center text-[13px] text-neutral-500">No candidates match “{query}”.</td>
                  </tr>
                )}
                {shown.map((r) => {
                  const meta = STATUS_META[r.status];
                  const detail =
                    r.status === "PRESENT"
                      ? r.submitted
                        ? "Attempted · submitted"
                        : "Attempted · still in progress"
                      : r.status === "ABSENT"
                        ? "Rostered · no attempt"
                        : "Attempted · not on roster";
                  return (
                    <tr key={`${r.email}-${r.status}`} className="border-b border-white/[0.04] last:border-0 hover:bg-white/[0.02]">
                      <td className="py-3 pr-4">
                        <p className="text-[13px] font-bold text-white truncate max-w-[260px]">{r.name}</p>
                        <p className="text-[11px] text-neutral-500 font-mono truncate max-w-[260px]">{r.email}</p>
                      </td>
                      <td className="py-3 px-3 text-center">
                        <DotPillA dot={meta.dot} label={meta.label} text={meta.text} />
                      </td>
                      <td className="py-3 px-3 text-[11.5px] text-neutral-400">{detail}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {pages > 1 && (
            <div className="mt-2 pt-3 border-t border-white/[0.06] flex items-center justify-between gap-3 text-[11px] text-neutral-400">
              <div className="flex items-center gap-2.5">
                <span>Rows per page</span>
                <FilterChip
                  label={String(per)}
                  options={[10, 25, 50].map((n) => ({
                    label: String(n),
                    active: per === n,
                    onSelect: () => setPer(n),
                  }))}
                />
                <span className="tabular-nums">
                  {`${page * per + 1}–${Math.min(filtered.length, (page + 1) * per)} of ${filtered.length} rows`}
                </span>
              </div>
              <div className="flex items-center gap-1">
                {[
                  { key: "first", icon: <ChevsLeftIconA />, target: 0, disabled: page === 0, title: "First page" },
                  { key: "prev", icon: <ChevLeftIconA />, target: page - 1, disabled: page === 0, title: "Previous page" },
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
                  { key: "next", icon: <ChevRightIconA />, target: page + 1, disabled: page + 1 >= pages, title: "Next page" },
                  { key: "last", icon: <ChevsRightIconA />, target: pages - 1, disabled: page + 1 >= pages, title: "Last page" },
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
          )}

          <p className="mt-3 text-[11px] text-neutral-500">
            Report-only register for <span className="text-neutral-300 font-semibold">{examTitle}</span>. Entry access is still governed by the approved-students panel; unrostered attempts are flagged here for hygiene, not blocked.
          </p>
        </>
      )}
    </div>
  );
}
