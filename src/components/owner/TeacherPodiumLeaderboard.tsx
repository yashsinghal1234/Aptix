"use client";

import React, { useState, useMemo } from "react";
import Link from "next/link";
import { getMascotById, Mascot } from "@/lib/mascots";

export interface TeacherCandidateEntry {
  id: string; // Attempt ID
  userId: string;
  userName: string;
  userEmail: string;
  status: string; // "SUBMITTED" | "IN_PROGRESS" | etc.
  score: number;
  totalMarks: number;
  answeredCount: number;
  totalQuestions: number;
  mascotId?: string | null;
  emoji?: string | null;
  gifUrl?: string | null;
  mascotName?: string | null;
  flagsCount: number;
  lastActivity?: number;
  passCriteria?: number;
  createdAt?: string | null;
  submittedAt?: string | null;
  timeTakenSeconds?: number | null;
}

interface TeacherPodiumLeaderboardProps {
  sessionId: string;
  candidates: TeacherCandidateEntry[];
  totalMarks: number;
  passCriteria?: number;
  isLive?: boolean;
}

export function TeacherPodiumLeaderboard({
  sessionId,
  candidates,
  totalMarks,
  passCriteria = 50,
  isLive = false,
}: TeacherPodiumLeaderboardProps) {
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState<"ALL" | "SUBMITTED" | "IN_PROGRESS">("ALL");

  // Candidates ranked by score descending, with ties broken by fastest submission speed
  const rankedAll = useMemo(() => {
    const sorted = [...candidates].sort((a, b) => {
      // 1. Primary: Higher score wins
      if (b.score !== a.score) return b.score - a.score;
      // 2. Status: Submitted attempts beat in-progress
      if (a.status === "SUBMITTED" && b.status !== "SUBMITTED") return -1;
      if (b.status === "SUBMITTED" && a.status !== "SUBMITTED") return 1;
      // 3. Speed Tie-breaker: How fast submitted (lower time taken or earlier submission timestamp wins!)
      const aTime = a.timeTakenSeconds ?? (a.submittedAt ? new Date(a.submittedAt).getTime() : (a.lastActivity ?? Infinity));
      const bTime = b.timeTakenSeconds ?? (b.submittedAt ? new Date(b.submittedAt).getTime() : (b.lastActivity ?? Infinity));
      if (aTime !== bTime) return aTime - bTime;
      // 4. Fallback tie-breaker: more questions answered
      return (b.answeredCount || 0) - (a.answeredCount || 0);
    });

    let currentRank = 0;
    return sorted.map((c, index) => {
      const prev = index > 0 ? sorted[index - 1] : null;
      const prevTime = prev ? (prev.timeTakenSeconds ?? (prev.submittedAt ? new Date(prev.submittedAt).getTime() : (prev.lastActivity ?? Infinity))) : null;
      const cTime = c.timeTakenSeconds ?? (c.submittedAt ? new Date(c.submittedAt).getTime() : (c.lastActivity ?? Infinity));
      
      const isExactTie = prev && prev.score === c.score && prev.status === c.status && prevTime === cTime;
      if (!isExactTie) {
        currentRank = index + 1;
      }

      const mascot = c.mascotId ? getMascotById(c.mascotId) : null;
      const pct = totalMarks > 0 ? (c.score / totalMarks) * 100 : 0;
      const isPassed = pct >= passCriteria;

      let timeFormatted = "";
      if (c.timeTakenSeconds != null) {
        const m = Math.floor(c.timeTakenSeconds / 60);
        const s = c.timeTakenSeconds % 60;
        timeFormatted = `${m}m ${s}s`;
      } else if (c.submittedAt) {
        timeFormatted = new Date(c.submittedAt).toLocaleTimeString("en-GB", { timeZone: "Asia/Kolkata", hour12: false });
      }

      return {
        ...c,
        denseRank: currentRank,
        pct,
        isPassed,
        resolvedMascot: mascot,
        displayGif: c.gifUrl || mascot?.gifUrl,
        displayEmoji: c.emoji || mascot?.emoji || "👤",
        displayName: c.mascotName || mascot?.name || "Standard",
        displayTimeTaken: timeFormatted,
      };
    });
  }, [candidates, totalMarks, passCriteria]);

  // Top 3 for the visual podium
  const top3 = useMemo(() => {
    // Only candidates who have engaged / scored or top 3 if available
    const active = rankedAll.slice(0, 3);
    if (active.length === 0) return [];

    // Order: 2nd place (left), 1st place (center), 3rd place (right)
    const first = active[0] || null;
    const second = active[1] || null;
    const third = active[2] || null;

    const maxScore = Math.max(...active.map((c) => c.score), 1);

    const ordered = [
      second ? { entry: second, place: "2nd", color: "bg-purple-400/20 border-purple-400/40 text-purple-300", pillarBg: "bg-gradient-to-t from-purple-950/60 to-purple-600/30 border-purple-500/40", height: 110 + Math.round(50 * (second.score / maxScore)), badge: "🥈 2ND" } : null,
      first ? { entry: first, place: "1st", color: "bg-lime-400/20 border-lime-400/40 text-lime-300", pillarBg: "bg-gradient-to-t from-lime-950/60 to-lime-500/30 border-lime-400/50", height: 150 + Math.round(50 * (first.score / maxScore)), badge: "👑 1ST" } : null,
      third ? { entry: third, place: "3rd", color: "bg-[#f2a488]/20 border-[#f2a488]/40 text-[#f2a488]", pillarBg: "bg-gradient-to-t from-orange-950/60 to-amber-600/30 border-amber-500/40", height: 85 + Math.round(45 * (third.score / maxScore)), badge: "🥉 3RD" } : null,
    ].filter(Boolean) as {
      entry: typeof rankedAll[0];
      place: string;
      color: string;
      pillarBg: string;
      height: number;
      badge: string;
    }[];

    return ordered;
  }, [rankedAll]);

  // Filtered list for the leaderboard table
  const filteredList = useMemo(() => {
    return rankedAll.filter((c) => {
      const matchSearch =
        search.trim() === "" ||
        c.userName.toLowerCase().includes(search.toLowerCase()) ||
        c.userEmail.toLowerCase().includes(search.toLowerCase()) ||
        (c.displayName && c.displayName.toLowerCase().includes(search.toLowerCase()));

      const matchStatus =
        filterStatus === "ALL" ||
        (filterStatus === "SUBMITTED" && c.status === "SUBMITTED") ||
        (filterStatus === "IN_PROGRESS" && c.status !== "SUBMITTED");

      return matchSearch && matchStatus;
    });
  }, [rankedAll, search, filterStatus]);

  // Cohort quick summary metrics
  const stats = useMemo(() => {
    const total = candidates.length;
    const submitted = candidates.filter((c) => c.status === "SUBMITTED").length;
    const avgScore = total > 0 ? candidates.reduce((s, c) => s + c.score, 0) / total : 0;
    const topScore = candidates.length > 0 ? Math.max(...candidates.map((c) => c.score)) : 0;
    const passingCount = candidates.filter((c) => (c.score / (totalMarks || 1)) * 100 >= passCriteria).length;

    return { total, submitted, avgScore, topScore, passingCount };
  }, [candidates, totalMarks, passCriteria]);

  return (
    <div className="rounded-2xl border border-white/10 bg-[#0e0f13] p-5 sm:p-7 shadow-2xl space-y-6">
      {/* ── Header Bar ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/10 pb-5">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="text-[10px] font-bold tracking-[0.2em] text-lime-400 uppercase bg-lime-400/10 border border-lime-400/30 px-2 py-0.5 rounded">
              TEACHER EXCLUSIVE
            </span>
            {isLive ? (
              <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-[10px] font-bold font-mono">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                LIVE PODIUM &amp; LEADERBOARD
              </span>
            ) : (
              <span className="text-[10px] font-bold tracking-[0.2em] text-neutral-400 uppercase">
                HISTORICAL PODIUM &amp; LEADERBOARD
              </span>
            )}
          </div>
          <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight flex items-center gap-2">
            Cohort Standings &amp; Podium
          </h2>
          <p className="text-xs text-neutral-400 mt-1">
            Real-time calculated rankings with mascot badges. Visible exclusively in your instructor cockpit.
          </p>
        </div>

        {/* Quick summary chips */}
        <div className="flex items-center gap-2 flex-wrap">
          <div className="px-3 py-1.5 rounded-xl bg-white/[0.04] border border-white/10 text-right">
            <span className="block text-[9px] font-mono text-neutral-500 uppercase tracking-wider">Top Score</span>
            <span className="text-sm font-black text-lime-300 tabular-nums">{stats.topScore.toFixed(1)} <span className="text-[10px] text-neutral-500 font-normal">/ {totalMarks}</span></span>
          </div>
          <div className="px-3 py-1.5 rounded-xl bg-white/[0.04] border border-white/10 text-right">
            <span className="block text-[9px] font-mono text-neutral-500 uppercase tracking-wider">Cohort Mean</span>
            <span className="text-sm font-black text-white tabular-nums">{stats.avgScore.toFixed(1)}</span>
          </div>
          <div className="px-3 py-1.5 rounded-xl bg-white/[0.04] border border-white/10 text-right">
            <span className="block text-[9px] font-mono text-neutral-500 uppercase tracking-wider">Pass Rate</span>
            <span className="text-sm font-black text-emerald-300 tabular-nums">
              {stats.total > 0 ? Math.round((stats.passingCount / stats.total) * 100) : 0}%
            </span>
          </div>
        </div>
      </div>

      {/* ── Top 3 Visual Podium ── */}
      {top3.length === 0 ? (
        <div className="py-12 px-4 rounded-xl bg-white/[0.02] border border-white/5 flex flex-col items-center justify-center text-center space-y-2">
          <div className="w-12 h-12 rounded-full bg-white/[0.04] border border-white/10 flex items-center justify-center text-neutral-400 text-xl">
            🏆
          </div>
          <p className="text-sm font-bold text-white">Podium Awaiting Candidate Activity</p>
          <p className="text-xs text-neutral-400 max-w-sm">
            As soon as candidates start answering questions, real-time ranked positions and animated mascot emblems will appear on the podium.
          </p>
        </div>
      ) : (
        <div className="pt-4 pb-2">
          <div className="flex items-end justify-center gap-3 sm:gap-6 max-w-2xl mx-auto px-2">
            {top3.map((p) => {
              const isFirst = p.place === "1st";
              const mascot = p.entry.resolvedMascot;

              return (
                <div key={p.place} className="flex flex-col items-center flex-1 max-w-[190px]">
                  {/* Mascot Avatar & Crown */}
                  <div className="relative mb-2 flex flex-col items-center">
                    {isFirst && (
                      <span className="text-2xl mb-1 filter drop-shadow-[0_2px_8px_rgba(250,204,21,0.6)] animate-bounce">
                        👑
                      </span>
                    )}

                    <div
                      className={`w-16 h-16 sm:w-20 sm:h-20 rounded-2xl overflow-hidden flex items-center justify-center relative border-2 shadow-2xl transition-all ${
                        isFirst
                          ? "border-lime-400 bg-lime-400/10 shadow-[0_0_30px_rgba(163,230,53,0.3)] ring-2 ring-lime-400/30"
                          : p.place === "2nd"
                            ? "border-purple-400 bg-purple-400/10 shadow-[0_0_20px_rgba(192,132,252,0.2)]"
                            : "border-amber-400 bg-amber-400/10 shadow-[0_0_20px_rgba(251,191,36,0.2)]"
                      }`}
                    >
                      {p.entry.displayGif ? (
                        <img
                          src={p.entry.displayGif}
                          alt={p.entry.displayName}
                          style={mascot?.imgZoom ? {
                            transform: `scale(${mascot.imgZoom})`,
                            transformOrigin: mascot.imgOrigin ?? "center",
                          } : undefined}
                          className={`w-full h-full object-contain filter drop-shadow-[0_4px_12px_rgba(0,0,0,0.6)] select-none pointer-events-none ${mascot?.imgZoom ? "" : "scale-[1.3]"}`}
                        />
                      ) : (
                        <span className="text-3xl sm:text-4xl">{p.entry.displayEmoji}</span>
                      )}
                    </div>

                    <span className={`mt-1.5 px-2 py-0.5 rounded-full text-[9px] font-black tracking-wider uppercase border font-mono ${p.color}`}>
                      {p.badge}
                    </span>
                  </div>

                  {/* Candidate Name & Info */}
                  <div className="text-center w-full px-1 mb-2">
                    <p className="text-xs sm:text-sm font-black text-white truncate" title={p.entry.userName}>
                      {p.entry.userName}
                    </p>
                    <p className="text-[10px] text-neutral-400 font-mono truncate" title={p.entry.userEmail}>
                      {p.entry.userEmail.split("@")[0]}
                    </p>
                    <div className="mt-1 flex items-center justify-center gap-1.5 flex-wrap">
                      <span className="text-[11px] font-black text-lime-300 font-mono tabular-nums">
                        {p.entry.score.toFixed(1)} pts
                      </span>
                      <span className="text-[10px] text-neutral-500 font-mono">
                        ({p.entry.pct.toFixed(0)}%)
                      </span>
                      {p.entry.displayTimeTaken && (
                        <span className="text-[10px] text-neutral-400 font-mono">
                          • ⏱ {p.entry.displayTimeTaken}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Pillar Block */}
                  <div
                    className={`w-full rounded-t-2xl border-t-2 border-x flex flex-col items-center justify-end pb-3 pt-4 shadow-xl ${p.pillarBg}`}
                    style={{ height: `${p.height}px` }}
                  >
                    <span className="text-3xl sm:text-4xl font-black text-white/90 leading-none">
                      {p.place[0]}
                    </span>
                    <span className="text-[10px] font-mono font-bold tracking-widest text-neutral-300 uppercase mt-1">
                      {p.place} PLACE
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Leaderboard Table ── */}
      <div className="border-t border-white/10 pt-5 space-y-4">
        {/* Controls: search and filter */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-bold text-white">Full Cohort Leaderboard</h3>
            <p className="text-xs text-neutral-400">
              Ranked by total score. Ties resolved by fastest submission speed.
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* Status pills */}
            <div className="inline-flex rounded-xl bg-white/[0.04] p-1 border border-white/10 text-xs">
              {(["ALL", "SUBMITTED", "IN_PROGRESS"] as const).map((st) => (
                <button
                  key={st}
                  type="button"
                  onClick={() => setFilterStatus(st)}
                  className={`px-3 py-1 rounded-lg text-[10px] font-bold transition-all cursor-pointer ${
                    filterStatus === st
                      ? "bg-lime-300 text-black shadow"
                      : "text-neutral-400 hover:text-white"
                  }`}
                >
                  {st === "ALL" ? "All" : st === "SUBMITTED" ? "Submitted" : "In Progress"}
                </button>
              ))}
            </div>

            {/* Search */}
            <input
              type="text"
              placeholder="Search candidate or mascot..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="px-3 py-1.5 bg-black/40 border border-white/10 rounded-xl text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-lime-300/60 w-44 sm:w-56"
            />
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto rounded-xl border border-white/10 bg-black/40">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-white/10 bg-white/[0.02] text-[10px] font-bold tracking-wider text-neutral-400 uppercase">
                <th className="py-3 px-4 w-16 text-center">Rank</th>
                <th className="py-3 px-4">Candidate</th>
                <th className="py-3 px-4">Spirit Mascot</th>
                <th className="py-3 px-4 text-center">Score</th>
                <th className="py-3 px-4 text-center">Accuracy / %</th>
                <th className="py-3 px-4 text-center">Status</th>
                <th className="py-3 px-4 text-center">Flags</th>
                <th className="py-3 px-4 text-right">Audit</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.06] font-sans">
              {filteredList.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-neutral-500 text-xs">
                    {search ? "No candidates match your search." : "No candidates found for this session."}
                  </td>
                </tr>
              ) : (
                filteredList.map((c) => {
                  const isTop3 = c.denseRank <= 3;
                  const rankIcon =
                    c.denseRank === 1 ? "🥇" : c.denseRank === 2 ? "🥈" : c.denseRank === 3 ? "🥉" : null;

                  return (
                    <tr
                      key={c.id}
                      className={`transition-colors hover:bg-white/[0.03] ${
                        c.denseRank === 1
                          ? "bg-lime-400/[0.02]"
                          : isTop3
                            ? "bg-white/[0.01]"
                            : ""
                      }`}
                    >
                      {/* Rank */}
                      <td className="py-3 px-4 text-center">
                        {rankIcon ? (
                          <span className="text-base" title={`Rank ${c.denseRank}`}>{rankIcon}</span>
                        ) : (
                          <span className="font-mono font-black text-neutral-400 text-xs tabular-nums">
                            #{c.denseRank}
                          </span>
                        )}
                      </td>

                      {/* Candidate */}
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2.5">
                          <span className="w-7 h-7 rounded-full bg-purple-600/60 border border-purple-400/30 text-white text-[10px] font-black flex items-center justify-center shrink-0">
                            {c.userName.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase()}
                          </span>
                          <div className="min-w-0">
                            <p className="font-bold text-white truncate max-w-[180px]">{c.userName}</p>
                            <p className="text-[10px] text-neutral-500 font-mono truncate max-w-[180px]">
                              {c.userEmail}
                            </p>
                          </div>
                        </div>
                      </td>

                      {/* Mascot */}
                      <td className="py-3 px-4">
                        <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-xl bg-white/[0.03] border border-white/5">
                          {c.displayGif ? (
                            <img
                              src={c.displayGif}
                              alt={c.displayName}
                              className="w-5 h-5 object-contain shrink-0 filter drop-shadow-[0_2px_4px_rgba(0,0,0,0.5)]"
                            />
                          ) : (
                            <span className="text-sm">{c.displayEmoji}</span>
                          )}
                          <span className="text-[11px] font-semibold text-neutral-200 truncate max-w-[110px]">
                            {c.displayName}
                          </span>
                        </div>
                      </td>

                      {/* Score */}
                      <td className="py-3 px-4 text-center font-mono">
                        <div>
                          <span className="text-sm font-black text-white tabular-nums">
                            {c.score.toFixed(1)}
                          </span>
                          <span className="text-[10px] text-neutral-500 ml-1">/ {totalMarks}</span>
                        </div>
                        {c.displayTimeTaken && (
                          <div className="text-[10px] text-neutral-400 font-sans mt-0.5 flex items-center justify-center gap-1">
                            <span>⏱</span>
                            <span>{c.displayTimeTaken}</span>
                          </div>
                        )}
                      </td>

                      {/* Accuracy & Progress */}
                      <td className="py-3 px-4 text-center font-mono">
                        <div className="inline-flex flex-col items-center">
                          <span className={`text-xs font-bold tabular-nums ${c.isPassed ? "text-lime-300" : "text-[#f2a488]"}`}>
                            {c.pct.toFixed(1)}%
                          </span>
                          <div className="w-16 h-1 rounded-full bg-white/10 mt-1 overflow-hidden">
                            <div
                              className={`h-full rounded-full ${c.isPassed ? "bg-lime-400" : "bg-[#f2a488]"}`}
                              style={{ width: `${Math.min(100, Math.max(3, c.pct))}%` }}
                            />
                          </div>
                        </div>
                      </td>

                      {/* Status */}
                      <td className="py-3 px-4 text-center">
                        {c.status === "SUBMITTED" ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-[10px] font-bold font-mono">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                            SUBMITTED
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-300 text-[10px] font-bold font-mono">
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
                            IN PROGRESS
                          </span>
                        )}
                      </td>

                      {/* Flags */}
                      <td className="py-3 px-4 text-center font-mono">
                        {c.flagsCount > 0 ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-rose-500/10 border border-rose-500/30 text-rose-300 text-[10px] font-bold">
                            ⚠️ {c.flagsCount}
                          </span>
                        ) : (
                          <span className="text-[10px] text-neutral-600">0</span>
                        )}
                      </td>

                      {/* Audit */}
                      <td className="py-3 px-4 text-right">
                        <Link
                          href={`/dashboard/owner/results/${sessionId}/candidate/${c.id}`}
                          className="px-2.5 py-1 bg-white/[0.05] hover:bg-white/10 border border-white/10 text-neutral-200 hover:text-white rounded-lg text-[10px] font-bold transition-all whitespace-nowrap inline-block"
                        >
                          Audit →
                        </Link>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
