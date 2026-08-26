import React from "react";
import { prisma } from "@/lib/prisma";
import { SetterForm, RemoveSetterButton } from "@/components/SetterForm";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { ReviewQuestions } from "@/components/ReviewQuestions";
import { verifyToken } from "@/lib/auth";
import Link from "next/link";
import { createSessionAction, setSessionStatusAction } from "@/app/actions/session";
import { deleteTemplateAction } from "@/app/actions/template";
import { ActiveSessionsList } from "@/components/ActiveSessionsList";

export default async function OwnerDashboard() {
  const token = cookies().get("token")?.value;
  if (!token) redirect("/");
  
  const payload = await verifyToken(token);
  if (!payload || payload.role !== "OWNER") redirect("/");

  // Fetch all setters
  const setters = await prisma.user.findMany({
    where: { role: "SETTER" }
  });

  const pendingQuestions = await prisma.question.findMany({
    where: { status: "SUBMITTED" },
    orderBy: { createdAt: "asc" }
  });

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
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">Executive Dashboard</h1>
          <p className="text-slate-500 text-xs mt-1">Manage assessment templates, live proctored sessions, and setter roles.</p>
        </div>
        <Link 
          href="/dashboard/owner/template/new"
          className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-md hover:shadow-lg transition-all w-fit"
        >
          <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4"></path></svg>
          <span>Create Template</span>
        </Link>
      </div>

      {/* Top Metric Cards (matching reference design stats widgets) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        <div className="bg-white p-5 rounded-2xl border border-slate-200/70 shadow-soft flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-brand-50 text-brand-600 flex items-center justify-center border border-brand-100 shrink-0">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"></path></svg>
          </div>
          <div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Templates</p>
            <p className="text-2xl font-black text-slate-900 mt-0.5">{templates.length}</p>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/70 shadow-soft flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-100 shrink-0">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5.636 18.364a9 9 0 010-12.728m12.728 0a9 9 0 010 12.728m-9.9-2.829a5 5 0 010-7.07m7.072 0a5 5 0 010 7.07M13 12a1 1 0 11-2 0 1 1 0 012 0z"></path></svg>
          </div>
          <div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Active Sessions</p>
            <p className="text-2xl font-black text-emerald-600 mt-0.5">{activeSessions.length}</p>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/70 shadow-soft flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-cyan-50 text-cyan-600 flex items-center justify-center border border-cyan-100 shrink-0">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"></path></svg>
          </div>
          <div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Registered</p>
            <p className="text-2xl font-black text-cyan-600 mt-0.5">{totalUsersCount} Users</p>
            <p className="text-[10px] text-slate-400 font-medium">{totalCandidatesCount} Candidates &bull; {totalSettersCount} Setters</p>
          </div>
        </div>

        <a href="#review-queue" className="bg-white p-5 rounded-2xl border border-slate-200/70 shadow-soft flex items-center gap-4 hover:border-amber-300 transition-colors">
          <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center border border-amber-100 shrink-0">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path></svg>
          </div>
          <div>
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Pending Review</p>
            <p className="text-2xl font-black text-amber-600 mt-0.5">{pendingQuestions.length} Qs</p>
          </div>
        </a>
      </div>

      {/* Question Review Queue */}
      <div id="review-queue" className="grid grid-cols-1 gap-8">
        <ReviewQuestions questions={pendingQuestions} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Templates */}
        <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-soft flex flex-col justify-between">
          <div>
            <div className="flex justify-between items-center mb-6 pb-4 border-b border-slate-100">
              <div>
                <h2 className="text-base font-bold text-slate-900 tracking-tight">Exam Templates</h2>
                <p className="text-xs text-slate-400">Pre-configured test structures and question rules</p>
              </div>
              <Link 
                href="/dashboard/owner/template/new"
                className="px-3 py-1.5 bg-brand-50 hover:bg-brand-100 text-brand-600 text-xs font-bold rounded-xl transition-colors border border-brand-100"
              >
                + New
              </Link>
            </div>
            {templates.length === 0 ? (
              <div className="text-center py-10 bg-slate-50/50 rounded-2xl border border-dashed border-slate-200">
                <p className="text-slate-400 text-xs font-semibold">No exam templates created yet.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {templates.map(template => (
                  <div key={template.id} className="p-4 border border-slate-200/80 rounded-2xl hover:bg-slate-50/60 transition-all">
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <h3 className="font-bold text-slate-900 text-sm">{template.title}</h3>
                        <p className="text-[11px] text-slate-500 mt-0.5 font-medium">
                          {template.durationMinutes} mins &bull; {template._count.questions} Fixed Questions &bull; {template._count.rules} Rules
                        </p>
                      </div>
                      <form action={async () => {
                        "use server";
                        await deleteTemplateAction(template.id);
                      }}>
                        <button className="text-[11px] px-2.5 py-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors font-bold">
                          Delete
                        </button>
                      </form>
                    </div>

                    <form action={async (formData) => {
                      "use server";
                      await createSessionAction(formData);
                    }} className="flex flex-col sm:flex-row gap-2 pt-3 border-t border-slate-100">
                      <input type="hidden" name="examId" value={template.id} />
                      <input 
                        type="datetime-local" 
                        name="startTime" 
                        className="text-xs px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-brand-500 focus:outline-none flex-1 text-slate-700 font-medium"
                        title="Schedule Start Time (Optional)"
                      />
                      <button className="text-xs px-4 py-1.5 bg-brand-600 hover:bg-brand-700 text-white rounded-xl font-bold transition-all shadow-brand whitespace-nowrap">
                        Launch Session &rarr;
                      </button>
                    </form>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Live Sessions */}
        <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-soft flex flex-col justify-between">
          <div>
            <div className="flex justify-between items-center mb-6 pb-4 border-b border-slate-100">
              <div>
                <h2 className="text-base font-bold text-slate-900 tracking-tight">Active Sessions</h2>
                <p className="text-xs text-slate-400">Scheduled and live assessments requiring proctoring</p>
              </div>
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
            </div>
            <ActiveSessionsList initialSessions={activeSessions} />
          </div>
        </div>
      </div>

      {/* Manage Setters */}
      <div className="space-y-6 pt-4" id="setters">
        <div className="border-t border-slate-200/80 pt-8">
          <SetterForm />
          
          <div className="bg-white rounded-3xl border border-slate-200/80 shadow-soft overflow-hidden mt-6">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center">
              <div>
                <h3 className="font-bold text-slate-900 text-sm tracking-tight">Authorized Question Authors</h3>
                <p className="text-xs text-slate-400 mt-0.5">Faculty and question contributors with authoring permissions</p>
              </div>
              <span className="text-xs font-bold text-brand-600 bg-brand-50 px-2.5 py-1 rounded-full border border-brand-100">
                {setters.length} Total
              </span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50/80 text-slate-500 uppercase tracking-wider font-bold">
                  <tr>
                    <th className="px-6 py-3.5">Name</th>
                    <th className="px-6 py-3.5">Email</th>
                    <th className="px-6 py-3.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {setters.length === 0 && (
                    <tr>
                      <td colSpan={3} className="px-6 py-8 text-center text-slate-400 font-medium">
                        No authors or setters added yet.
                      </td>
                    </tr>
                  )}
                  {setters.map((s, i) => (
                    <tr key={i} className="hover:bg-slate-50/60 transition-colors">
                      <td className="px-6 py-4 font-bold text-slate-900">{s.name}</td>
                      <td className="px-6 py-4 text-slate-600 font-medium">{s.email}</td>
                      <td className="px-6 py-4 text-right">
                        <RemoveSetterButton id={s.id} />
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
