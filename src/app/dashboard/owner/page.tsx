import React from "react";
import { prisma } from "@/lib/prisma";
import { SetterForm, RemoveSetterButton } from "@/components/SetterForm";
import { ResetStaffPasswordModal } from "@/components/ResetStaffPasswordModal";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { ReviewQuestions } from "@/components/ReviewQuestions";
import { verifyToken } from "@/lib/auth";
import Link from "next/link";
import { createSessionAction, setSessionStatusAction } from "@/app/actions/session";
import { deleteTemplateAction, duplicateTemplateAction } from "@/app/actions/template";
import { ActiveSessionsList } from "@/components/ActiveSessionsList";
import { LaunchSessionForm } from "@/components/LaunchSessionForm";

export const dynamic = "force-dynamic";

export default async function OwnerDashboard() {
  const token = cookies().get("token")?.value;
  if (!token) redirect("/");
  
  const payload = await verifyToken(token);
  if (!payload || payload.role !== "OWNER") redirect("/");

  // Fetch all dashboard data concurrently
  const [
    setters,
    allQuestions,
    templates,
    activeSessions,
    totalUsersCount,
    totalCandidatesCount
  ] = await Promise.all([
    prisma.user.findMany({
      where: { role: "SETTER" },
      orderBy: { createdAt: "desc" }
    }),
    prisma.question.findMany({
      orderBy: { createdAt: "desc" }
    }),
    prisma.exam.findMany({
      where: { isDeleted: false },
      orderBy: { createdAt: "desc" },
      include: {
        _count: { select: { questions: true, rules: true, sessions: true } }
      }
    }),
    prisma.examSession.findMany({
      where: { status: { in: ["SCHEDULED", "LIVE"] } },
      orderBy: { createdAt: "desc" },
      include: {
        exam: true,
        _count: { select: { attempts: true } }
      }
    }),
    prisma.user.count(),
    prisma.user.count({ where: { role: "CANDIDATE" } })
  ]);

  const pendingQuestions = allQuestions.filter(q => q.status === "SUBMITTED");
  const totalSettersCount = setters.length;
  const liveSessionsCount = activeSessions.filter(s => s.status === "LIVE").length;

  return (
    <div className="max-w-7xl mx-auto space-y-7 pb-12">
      {/* Node & System telemetry tag */}
      <div className="flex items-center gap-3">
        <span className="text-[11px] font-mono font-bold tracking-wider text-neutral-400">NODE 01 // PRODUCTION</span>
        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[11px] font-bold">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)]" />
          System Normal
        </span>
      </div>

      {/* Main Title + Search bar + Action button */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">Executive Dashboard</h1>
          <p className="text-neutral-400 text-xs sm:text-sm mt-1">Manage assessment templates, live proctored sessions, and setter governance.</p>
        </div>
        <div className="flex items-center gap-3 flex-wrap sm:flex-nowrap">
          <div className="relative flex-1 sm:flex-initial">
            <svg className="w-4 h-4 text-neutral-500 absolute left-3.5 top-1/2 -translate-y-1/2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input 
              type="text" 
              placeholder="Filter modules, UUID..." 
              className="pl-9 pr-4 py-2 bg-white text-black placeholder-neutral-500 text-xs rounded-full font-medium shadow-sm focus:outline-none focus:ring-2 focus:ring-white/80 w-full sm:w-56"
            />
          </div>
          <Link 
            href="/dashboard/owner/template/new"
            className="inline-flex items-center justify-center gap-1.5 px-4 py-2 bg-neutral-900 hover:bg-neutral-800 text-white text-xs font-bold rounded-full shadow-md border border-neutral-700 transition-all cursor-pointer whitespace-nowrap"
          >
            <svg className="w-4 h-4 text-neutral-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v3m0 0v3m0-3h3m-3 0H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>Create Template</span>
          </Link>
        </div>
      </div>

      {/* Top Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1 */}
        <div className="bg-[#08090d] p-5 rounded-2xl border border-neutral-800/90 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between text-neutral-400">
            <span className="text-[11px] font-mono font-bold tracking-wider uppercase text-neutral-400">EXAM TEMPLATES</span>
            <svg className="w-4 h-4 text-neutral-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
            </svg>
          </div>
          <div className="flex items-baseline justify-between mt-3 mb-4">
            <span className="text-3xl font-extrabold text-white">{templates.length}</span>
            <span className="text-[11px] font-semibold text-neutral-400 bg-neutral-900 border border-neutral-800 px-2 py-0.5 rounded-full">
              +0% this week
            </span>
          </div>
          <div className="flex items-center justify-between text-[11px] text-neutral-400 border-t border-neutral-800/80 pt-3">
            <span>Active Configuration</span>
            <span className="font-semibold text-neutral-300">{templates.length} In-Bank</span>
          </div>
        </div>

        {/* Card 2 */}
        <div className="bg-[#08090d] p-5 rounded-2xl border border-neutral-800/90 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between text-neutral-400">
            <span className="text-[11px] font-mono font-bold tracking-wider uppercase text-neutral-400">ACTIVE SESSIONS</span>
            <svg className="w-4 h-4 text-neutral-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8.111 16.404a5.5 5.5 0 017.778 0M12 20h.01m-7.08-7.071a10 10 0 0114.142 0M1.393 9.393a15 15 0 0121.214 0" />
            </svg>
          </div>
          <div className="flex items-baseline justify-between mt-3 mb-4">
            <span className="text-3xl font-extrabold text-white">{activeSessions.length}</span>
            <span className="text-[11px] font-semibold text-neutral-400 bg-neutral-900 border border-neutral-800 px-2 py-0.5 rounded-full">
              {activeSessions.length > 0 ? "Live Proctored" : "Idle / Ready"}
            </span>
          </div>
          <div className="flex items-center justify-between text-[11px] text-neutral-400 border-t border-neutral-800/80 pt-3">
            <span>Proctor Engine</span>
            <span className="font-semibold text-neutral-300">Telemetry Standby</span>
          </div>
        </div>

        {/* Card 3 */}
        <div className="bg-[#08090d] p-5 rounded-2xl border border-neutral-800/90 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between text-neutral-400">
            <span className="text-[11px] font-mono font-bold tracking-wider uppercase text-neutral-400">REGISTERED</span>
            <svg className="w-4 h-4 text-neutral-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
          </div>
          <div className="flex items-baseline justify-between mt-3 mb-4">
            <span className="text-2xl sm:text-3xl font-extrabold text-white">{totalUsersCount} Users</span>
            <span className="text-[11px] font-semibold text-neutral-400 bg-neutral-900 border border-neutral-800 px-2 py-0.5 rounded-full font-mono">
              C1 52 +46
            </span>
          </div>
          <div className="flex items-center justify-between text-[11px] text-neutral-400 border-t border-neutral-800/80 pt-3">
            <span>{totalCandidatesCount} Candidates</span>
            <span className="font-semibold text-neutral-300">{totalSettersCount} Setters</span>
          </div>
        </div>

        {/* Card 4 */}
        <div className="bg-[#08090d] p-5 rounded-2xl border border-neutral-800/90 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between text-neutral-400">
            <span className="text-[11px] font-mono font-bold tracking-wider uppercase text-neutral-400">PENDING REVIEW</span>
            <svg className="w-4 h-4 text-neutral-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div className="flex items-baseline justify-between mt-3 mb-4">
            <span className="text-3xl font-extrabold text-white">{pendingQuestions.length} Qs</span>
            <span className="text-[11px] font-semibold text-neutral-400 bg-neutral-900 border border-neutral-800 px-2 py-0.5 rounded-full">
              {pendingQuestions.length === 0 ? "All Cleared" : "Action Needed"}
            </span>
          </div>
          <div className="flex items-center justify-between text-[11px] text-neutral-400 border-t border-neutral-800/80 pt-3">
            <span>Approval Queue</span>
            <span className="font-semibold text-neutral-300">0 In Flight</span>
          </div>
        </div>
      </div>

      {/* Question Review Queue */}
      <div id="review-queue" className="grid grid-cols-1 gap-8">
        <ReviewQuestions questions={allQuestions} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Templates */}
        <div className="bg-[#0a0c10] p-6 rounded-3xl border border-neutral-800 shadow-md flex flex-col justify-between">
          <div>
            <div className="flex justify-between items-center mb-6 pb-4 border-b border-neutral-800">
              <div>
                <div className="flex items-center gap-2">
                  <svg className="w-4 h-4 text-neutral-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  <h2 className="text-base font-bold text-white tracking-tight">Exam Templates</h2>
                </div>
                <p className="text-xs text-neutral-400 mt-1">Pre-configured test structures and rule catalogs</p>
              </div>
              <Link 
                href="/dashboard/owner/template/new"
                className="text-xs font-bold text-neutral-300 hover:text-white flex items-center gap-1 transition-colors"
              >
                <span>+ New</span>
              </Link>
            </div>
            {templates.length === 0 ? (
              <div className="text-center py-10 bg-neutral-900/30 rounded-2xl border border-dashed border-neutral-800">
                <p className="text-neutral-500 text-xs font-semibold">No exam templates created yet.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {templates.map(template => (
                  <div key={template.id} className="p-4 border border-neutral-800/90 rounded-2xl bg-[#08090d] hover:border-neutral-700 transition-all">
                    <div className="flex justify-between items-start mb-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-bold text-white text-sm">{template.title}</h3>
                        <span className="text-[10px] font-extrabold uppercase px-2 py-0.2 bg-neutral-900 text-neutral-300 border border-neutral-700 rounded-md">
                          ACTIVE
                        </span>
                        <span className="text-[10px] font-extrabold uppercase px-2 py-0.2 bg-neutral-900 text-neutral-400 border border-neutral-800 rounded-md">
                          DRAFT SYNC
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <form action={async () => {
                          "use server";
                          await duplicateTemplateAction(template.id);
                        }}>
                          <button 
                            type="submit" 
                            title="Duplicate this template"
                            className="p-1 text-neutral-400 hover:text-white transition-colors cursor-pointer"
                          >
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7v8a2 2 0 002 2h6M8 7V5a2 2 0 012-2h4.586a1 1 0 01.707.293l4.414 4.414a1 1 0 01.293.707V15a2 2 0 01-2 2h-2M8 7H6a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2v-2" />
                            </svg>
                          </button>
                        </form>
                        <form action={async () => {
                          "use server";
                          await deleteTemplateAction(template.id);
                        }}>
                          <button 
                            type="submit"
                            title="Delete template"
                            className="p-1 text-neutral-500 hover:text-rose-400 transition-colors cursor-pointer"
                          >
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        </form>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 text-xs text-neutral-400 mb-3">
                      <span>⏱ {template.durationMinutes} mins</span>
                      <span>•</span>
                      <span>📋 {template._count.questions} Fixed Questions</span>
                      <span>•</span>
                      <span>{template._count.rules} Rules</span>
                    </div>

                    <div className="flex items-center justify-between text-[11px] font-mono text-neutral-500 pb-3 border-b border-neutral-800/80">
                      <span>ID: APTX-TMPL-{template.id.slice(0, 4).toUpperCase()}</span>
                      <span>Updated 2h ago</span>
                    </div>

                    <LaunchSessionForm templateId={template.id} />
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Live Sessions */}
        <div className="bg-[#0a0c10] p-6 rounded-3xl border border-neutral-800 shadow-md flex flex-col justify-between">
          <div>
            <div className="flex justify-between items-center mb-6 pb-4 border-b border-neutral-800">
              <div>
                <div className="flex items-center gap-2">
                  <svg className="w-4 h-4 text-neutral-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                  <h2 className="text-base font-bold text-white tracking-tight">Active Sessions</h2>
                </div>
                <p className="text-xs text-neutral-400 mt-1">Scheduled and live assessments requiring proctoring</p>
              </div>
              <div className="flex items-center gap-1.5 text-xs text-neutral-300">
                <span>Live Sync</span>
                <span className="w-2 h-2 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)] animate-pulse" />
              </div>
            </div>
            <ActiveSessionsList initialSessions={activeSessions} />
          </div>
        </div>
      </div>

      {/* Manage Setters */}
      <div className="space-y-6 pt-4" id="setters">
        <div className="border-t border-neutral-800 pt-8">
          <SetterForm />
          
          <div className="bg-[#0a0c10] rounded-3xl border border-neutral-800 shadow-md overflow-hidden mt-6">
            <div className="p-6 border-b border-neutral-800 flex justify-between items-center">
              <div>
                <h3 className="font-bold text-white text-lg tracking-tight">Authorized Question Authors</h3>
                <p className="text-sm text-neutral-400 mt-0.5">Faculty and question contributors with authoring permissions</p>
              </div>
              <span className="text-sm font-bold text-neutral-300 bg-neutral-900 px-3 py-1 rounded-full border border-neutral-800">
                {setters.length} Total
              </span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-neutral-900/80 text-neutral-400 uppercase tracking-wider font-bold text-xs">
                  <tr>
                    <th className="px-6 py-4">Name</th>
                    <th className="px-6 py-4">Email</th>
                    <th className="px-6 py-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-800/80">
                  {setters.length === 0 && (
                    <tr>
                      <td colSpan={3} className="px-6 py-8 text-center text-neutral-500 font-medium">
                        No authors or setters added yet.
                      </td>
                    </tr>
                  )}
                  {setters.map((s, i) => (
                    <tr key={i} className="hover:bg-neutral-900/40 transition-colors">
                      <td className="px-6 py-4 font-bold text-white">{s.name}</td>
                      <td className="px-6 py-4 text-neutral-400 font-medium">{s.email}</td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <ResetStaffPasswordModal userId={s.id} userName={s.name} userEmail={s.email} />
                          <RemoveSetterButton id={s.id} />
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
