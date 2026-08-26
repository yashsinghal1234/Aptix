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

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-slate-800">Owner Dashboard</h1>
      </div>

      {pendingQuestions.length > 0 && (
        <div className="grid grid-cols-1 gap-8">
          <ReviewQuestions questions={pendingQuestions} />
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Templates */}
        <div className="bg-white p-6 rounded-xl border shadow-sm">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-bold text-slate-800">Exam Templates</h2>
            <Link 
              href="/dashboard/owner/template/new"
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-lg transition-colors"
            >
              + New Template
            </Link>
          </div>
          {templates.length === 0 ? (
            <p className="text-slate-500 text-sm">No exam templates created yet.</p>
          ) : (
            <div className="space-y-4">
              {templates.map(template => (
                <div key={template.id} className="flex justify-between items-center p-4 border rounded-lg hover:bg-slate-50">
                  <div>
                    <h3 className="font-semibold text-slate-800">{template.title}</h3>
                    <p className="text-xs text-slate-500">
                      {template.durationMinutes} mins | {template._count.questions} Fixed Qs | {template._count.rules} Rules
                    </p>
                  </div>
                  <div className="flex flex-col gap-2 items-end">
                    <form action={createSessionAction} className="flex flex-col gap-2 items-end">
                      <input type="hidden" name="examId" value={template.id} />
                      <div className="flex gap-2">
                        <input 
                          type="datetime-local" 
                          name="startTime" 
                          className="text-xs px-2 py-1.5 border rounded focus:ring-indigo-500 focus:outline-none"
                          title="Schedule Start Time (Optional)"
                        />
                        <button className="text-xs px-3 py-1.5 bg-indigo-50 text-indigo-700 rounded font-medium hover:bg-indigo-100 transition-colors">
                          Launch Session
                        </button>
                      </div>
                    </form>
                    <form action={async () => {
                      "use server";
                      await deleteTemplateAction(template.id);
                    }}>
                      <button className="text-xs px-3 py-1.5 bg-red-50 text-red-700 rounded font-medium hover:bg-red-100 transition-colors">
                        Delete
                      </button>
                    </form>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Live Sessions */}
        <div className="bg-white p-6 rounded-xl border shadow-sm">
          <h2 className="text-xl font-bold text-slate-800 mb-6">Active Sessions</h2>
          <ActiveSessionsList initialSessions={activeSessions} />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-8">
        {/* Manage Setters */}
        <div id="setters">
          <SetterForm />
          <div className="bg-white rounded-xl border shadow-sm overflow-hidden mt-4">
            <div className="p-6 border-b flex justify-between items-center">
              <h3 className="font-semibold text-slate-800">Active Exam Setters</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 text-slate-500">
                  <tr>
                    <th className="px-6 py-4 font-medium">Name</th>
                    <th className="px-6 py-4 font-medium">Email</th>
                    <th className="px-6 py-4 font-medium text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {setters.length === 0 && (
                    <tr>
                      <td colSpan={3} className="px-6 py-8 text-center text-slate-500">
                        No setters added yet.
                      </td>
                    </tr>
                  )}
                  {setters.map((s, i) => (
                    <tr key={i} className="hover:bg-slate-50 transition-colors">
                      <td className="px-6 py-4 font-medium text-slate-900">{s.name}</td>
                      <td className="px-6 py-4 text-slate-600">{s.email}</td>
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
