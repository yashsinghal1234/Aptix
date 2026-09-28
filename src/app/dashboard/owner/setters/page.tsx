import React from "react";
import { prisma } from "@/lib/prisma";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { verifyToken } from "@/lib/auth";
import Link from "next/link";
import { SetterForm, RemoveSetterButton } from "@/components/SetterForm";
import { ResetStaffPasswordModal } from "@/components/ResetStaffPasswordModal";

export const dynamic = "force-dynamic";

export default async function ManageSettersPage() {
  const token = cookies().get("token")?.value;
  if (!token) redirect("/");

  const payload = await verifyToken(token);
  if (!payload || payload.role !== "OWNER") redirect("/");

  // Fetch all setters and questions concurrently
  const [setters, allQuestions] = await Promise.all([
    prisma.user.findMany({
      where: { role: "SETTER" },
      orderBy: { createdAt: "desc" }
    }),
    prisma.question.findMany({
      select: { id: true, authorId: true, status: true, category: true }
    })
  ]);

  // Compute question contribution counts per setter
  const questionsByAuthor = allQuestions.reduce((acc: Record<string, number>, q) => {
    acc[q.authorId] = (acc[q.authorId] || 0) + 1;
    return acc;
  }, {});

  const totalAuthors = setters.length;
  const totalQuestionsAuthored = setters.reduce((sum, s) => sum + (questionsByAuthor[s.id] || 0), 0);
  const totalBankQuestions = allQuestions.length;
  const categoriesCount = new Set(allQuestions.map(q => q.category)).size;

  return (
    <div className="max-w-7xl mx-auto space-y-8 pb-12">
      {/* Breadcrumb & Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-neutral-800 pb-4">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Link 
              href="/dashboard/owner" 
              className="text-xs font-bold text-neutral-400 hover:text-white transition-colors flex items-center gap-1.5"
            >
              <span>&larr;</span>
              <span>Executive Dashboard</span>
            </Link>
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">Manage Question Setters</h1>
          <p className="text-neutral-400 text-sm mt-1">
            Authorize faculty contributors, provision temporary activation credentials, and track authoring output.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/dashboard/setter/bank"
            className="px-4.5 py-2.5 bg-neutral-900 hover:bg-neutral-800 text-neutral-200 text-sm font-bold rounded-xl border border-neutral-800 transition-colors flex items-center gap-2 shadow-xs"
          >
            <svg className="w-4 h-4 text-neutral-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
            </svg>
            <span>Question Bank</span>
          </Link>
        </div>
      </div>

      {/* Staff Overview Metric Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        <div className="bg-[#0a0c10] p-5 rounded-2xl border border-neutral-800 hover:border-neutral-700 shadow-md flex items-center gap-4 transition-all">
          <div className="w-12 h-12 rounded-2xl bg-neutral-900 text-neutral-300 flex items-center justify-center border border-neutral-800 shrink-0">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
          </div>
          <div>
            <p className="text-sm font-bold text-neutral-400 uppercase tracking-wider">Total Authors</p>
            <p className="text-3xl font-black text-white mt-1">{totalAuthors}</p>
            <p className="text-xs text-neutral-400 font-medium mt-1">Authorized faculty members</p>
          </div>
        </div>

        <div className="bg-[#0a0c10] p-5 rounded-2xl border border-neutral-800 hover:border-neutral-700 shadow-md flex items-center gap-4 transition-all">
          <div className="w-12 h-12 rounded-2xl bg-neutral-900 text-neutral-300 flex items-center justify-center border border-neutral-800 shrink-0">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <div>
            <p className="text-sm font-bold text-neutral-400 uppercase tracking-wider">Questions Authored</p>
            <p className="text-3xl font-black text-white mt-1">{totalQuestionsAuthored}</p>
            <p className="text-xs text-neutral-400 font-medium mt-1">Contributed by authors</p>
          </div>
        </div>

        <div className="bg-[#0a0c10] p-5 rounded-2xl border border-neutral-800 hover:border-neutral-700 shadow-md flex items-center gap-4 transition-all">
          <div className="w-12 h-12 rounded-2xl bg-neutral-900 text-neutral-300 flex items-center justify-center border border-neutral-800 shrink-0">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
            </svg>
          </div>
          <div>
            <p className="text-sm font-bold text-neutral-400 uppercase tracking-wider">Question Bank</p>
            <p className="text-3xl font-black text-white mt-1">{totalBankQuestions}</p>
            <p className="text-xs text-neutral-400 font-medium mt-1">Total items in repository</p>
          </div>
        </div>

        <div className="bg-[#0a0c10] p-5 rounded-2xl border border-neutral-800 hover:border-neutral-700 shadow-md flex items-center gap-4 transition-all">
          <div className="w-12 h-12 rounded-2xl bg-neutral-900 text-neutral-300 flex items-center justify-center border border-neutral-800 shrink-0">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
            </svg>
          </div>
          <div>
            <p className="text-sm font-bold text-neutral-400 uppercase tracking-wider">Subject Domains</p>
            <p className="text-3xl font-black text-white mt-1">{categoriesCount}</p>
            <p className="text-xs text-neutral-400 font-medium mt-1">Assessment disciplines covered</p>
          </div>
        </div>
      </div>

      {/* Authorize New Author Form */}
      <div>
        <SetterForm />
      </div>

      {/* Authorized Authors Roster */}
      <div className="bg-[#0a0c10] rounded-3xl border border-neutral-800 shadow-md overflow-hidden">
        <div className="p-6 border-b border-neutral-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[#07080c]">
          <div>
            <h2 className="text-lg font-bold text-white tracking-tight">Authorized Faculty & Author Roster</h2>
            <p className="text-sm text-neutral-400 mt-0.5">Faculty author permissions and question contributions</p>
          </div>
          <span className="text-xs font-bold text-neutral-300 bg-neutral-900 px-3 py-1.5 rounded-full border border-neutral-800 self-start sm:self-auto">
            {totalAuthors} Total Authors
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-neutral-900/80 text-neutral-400 uppercase tracking-wider font-bold text-xs">
              <tr>
                <th className="px-6 py-4">Author</th>
                <th className="px-6 py-4">Questions Authored</th>
                <th className="px-6 py-4">Provisioned Date</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-800/80">
              {setters.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-6 py-12 text-center text-neutral-500 font-medium">
                    No authors or setters added yet. Authorize faculty using the form above.
                  </td>
                </tr>
              ) : (
                setters.map((s) => {
                  const authoredCount = questionsByAuthor[s.id] || 0;
                  const initials = (s.name || "ST")
                    .trim()
                    .split(" ")
                    .map((n: string) => n[0])
                    .join("")
                    .slice(0, 2)
                    .toUpperCase();

                  return (
                    <tr key={s.id} className="hover:bg-neutral-900/40 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-neutral-800 border border-neutral-700 text-white font-black text-xs flex items-center justify-center shrink-0">
                            {initials}
                          </div>
                          <div>
                            <p className="font-bold text-white text-sm">{s.name}</p>
                            <p className="text-xs text-neutral-400 font-medium">{s.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-sm font-bold text-neutral-200">
                          {authoredCount} {authoredCount === 1 ? "Question" : "Questions"}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-xs text-neutral-400 font-medium">
                        {s.createdAt ? new Date(s.createdAt).toLocaleDateString([], { month: "short", day: "numeric", year: "numeric" }) : "—"}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <ResetStaffPasswordModal userId={s.id} userName={s.name} userEmail={s.email} />
                          <RemoveSetterButton id={s.id} />
                        </div>
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
