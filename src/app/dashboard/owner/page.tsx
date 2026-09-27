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

  // Fetch all setters
  const setters = await prisma.user.findMany({
    where: { role: "SETTER" }
  });

  const allQuestions = await prisma.question.findMany({
    orderBy: { createdAt: "desc" }
  });

  const pendingQuestions = allQuestions.filter(q => q.status === "SUBMITTED");

  // Fetch Exam Templates
  const templates = await prisma.exam.findMany({
    where: { isDeleted: false },
    orderBy: { createdAt: "desc" },
    include: {
      _count: { select: { questions: true, rules: true, sessions: true } }
    }
  });

  // Fetch Active Sessions
  const activeSessions = await prisma.examSession.findMany({
    where: { status: { in: ["SCHEDULED", "LIVE"] } },
    orderBy: { createdAt: "desc" },
    include: {
      exam: true,
      _count: { select: { attempts: true } }
    }
  });

  // Compute quick metrics
  const totalUsersCount = await prisma.user.count();
  const totalCandidatesCount = await prisma.user.count({ where: { role: "CANDIDATE" } });
  const totalSettersCount = await prisma.user.count({ where: { role: "SETTER" } });
  const liveSessionsCount = activeSessions.filter(s => s.status === "LIVE").length;

  return (
    <div className="max-w-7xl mx-auto space-y-8 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-white tracking-tight">Executive Dashboard</h1>
          <p className="text-neutral-400 text-xs mt-1">Manage assessment templates, live proctored sessions, and setter roles.</p>
        </div>
        <Link 
          href="/dashboard/owner/template/new"
          className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-white hover:bg-neutral-200 text-black text-xs font-bold rounded-xl shadow-md border border-white transition-all w-fit cursor-pointer"
        >
          <svg className="w-4 h-4 text-black" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 4v16m8-8H4"></path></svg>
          <span>Create Template</span>
        </Link>
      </div>

      {/* Top Metric Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        <div className="bg-[#0a0c10] p-5 rounded-2xl border border-neutral-800 hover:border-neutral-700 shadow-md flex items-center gap-4 transition-all">
          <div className="w-12 h-12 rounded-2xl bg-neutral-900 text-white flex items-center justify-center border border-neutral-800 shrink-0">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"></path></svg>
          </div>
          <div>
            <p className="text-xs font-bold text-neutral-400 uppercase tracking-wider">Templates</p>
            <p className="text-2xl font-black text-white mt-0.5">{templates.length}</p>
          </div>
        </div>

        <div className="bg-[#0a0c10] p-5 rounded-2xl border border-neutral-800 hover:border-neutral-700 shadow-md flex items-center gap-4 transition-all">
          <div className="w-12 h-12 rounded-2xl bg-emerald-950/40 text-emerald-400 flex items-center justify-center border border-emerald-800/40 shrink-0">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5.636 18.364a9 9 0 010-12.728m12.728 0a9 9 0 010 12.728m-9.9-2.829a5 5 0 010-7.07m7.072 0a5 5 0 010 7.07M13 12a1 1 0 11-2 0 1 1 0 012 0z"></path></svg>
          </div>
          <div>
            <p className="text-xs font-bold text-neutral-400 uppercase tracking-wider">Active Sessions</p>
            <p className="text-2xl font-black text-emerald-400 mt-0.5">{activeSessions.length}</p>
          </div>
        </div>

        <div className="bg-[#0a0c10] p-5 rounded-2xl border border-neutral-800 hover:border-neutral-700 shadow-md flex items-center gap-4 transition-all">
          <div className="w-12 h-12 rounded-2xl bg-sky-950/40 text-sky-400 flex items-center justify-center border border-sky-800/40 shrink-0">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"></path></svg>
          </div>
          <div>
            <p className="text-xs font-bold text-neutral-400 uppercase tracking-wider">Registered</p>
            <p className="text-2xl font-black text-sky-400 mt-0.5">{totalUsersCount} Users</p>
            <p className="text-[10px] text-neutral-400 font-medium">{totalCandidatesCount} Candidates &bull; {totalSettersCount} Setters</p>
          </div>
        </div>

        <a href="#review-queue" className="bg-[#0a0c10] p-5 rounded-2xl border border-neutral-800 hover:border-amber-500/50 shadow-md flex items-center gap-4 transition-colors">
          <div className="w-12 h-12 rounded-2xl bg-amber-950/40 text-amber-400 flex items-center justify-center border border-amber-800/40 shrink-0">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg>
          </div>
          <div>
            <p className="text-xs font-bold text-neutral-400 uppercase tracking-wider">Pending Review</p>
            <p className="text-2xl font-black text-amber-400 mt-0.5">{pendingQuestions.length} Qs</p>
          </div>
        </a>
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
                <h2 className="text-base font-bold text-white tracking-tight">Exam Templates</h2>
                <p className="text-xs text-neutral-400">Pre-configured test structures and question rules</p>
              </div>
              <Link 
                href="/dashboard/owner/template/new"
                className="px-3 py-1.5 bg-neutral-900 hover:bg-neutral-800 text-neutral-200 text-xs font-bold rounded-xl transition-colors border border-neutral-800"
              >
                + New
              </Link>
            </div>
            {templates.length === 0 ? (
              <div className="text-center py-10 bg-neutral-900/30 rounded-2xl border border-dashed border-neutral-800">
                <p className="text-neutral-500 text-xs font-semibold">No exam templates created yet.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {templates.map(template => (
                  <div key={template.id} className="p-4 border border-neutral-800 rounded-2xl bg-[#0d0f14]/60 hover:bg-[#12151d] hover:border-neutral-700 transition-all">
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <h3 className="font-bold text-white text-sm">{template.title}</h3>
                        <p className="text-[11px] text-neutral-400 mt-0.5 font-medium">
                          {template.durationMinutes} mins &bull; {template._count.questions} Fixed Questions &bull; {template._count.rules} Rules
                        </p>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <form action={async () => {
                          "use server";
                          await duplicateTemplateAction(template.id);
                        }}>
                          <button 
                            type="submit" 
                            title="Duplicate this template with all questions and rules"
                            className="text-[11px] px-2.5 py-1 text-neutral-400 hover:text-white hover:bg-neutral-800 rounded-lg transition-colors font-bold flex items-center gap-1"
                          >
                            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7v8a2 2 0 002 2h6M8 7V5a2 2 0 012-2h4.586a1 1 0 01.707.293l4.414 4.414a1 1 0 01.293.707V15a2 2 0 01-2 2h-2M8 7H6a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2v-2" />
                            </svg>
                            <span>Duplicate</span>
                          </button>
                        </form>
                        <form action={async () => {
                          "use server";
                          await deleteTemplateAction(template.id);
                        }}>
                          <button className="text-[11px] px-2.5 py-1 text-neutral-500 hover:text-rose-400 hover:bg-rose-950/40 rounded-lg transition-colors font-bold">
                            Delete
                          </button>
                        </form>
                      </div>
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
                <h2 className="text-base font-bold text-white tracking-tight">Active Sessions</h2>
                <p className="text-xs text-neutral-400">Scheduled and live assessments requiring proctoring</p>
              </div>
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)] animate-pulse" />
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
                <h3 className="font-bold text-white text-sm tracking-tight">Authorized Question Authors</h3>
                <p className="text-xs text-neutral-400 mt-0.5">Faculty and question contributors with authoring permissions</p>
              </div>
              <span className="text-xs font-bold text-neutral-300 bg-neutral-900 px-2.5 py-1 rounded-full border border-neutral-800">
                {setters.length} Total
              </span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-neutral-900/80 text-neutral-400 uppercase tracking-wider font-bold">
                  <tr>
                    <th className="px-6 py-3.5">Name</th>
                    <th className="px-6 py-3.5">Email</th>
                    <th className="px-6 py-3.5 text-right">Actions</th>
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
