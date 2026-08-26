import React from "react";
import { prisma } from "@/lib/prisma";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { verifyToken } from "@/lib/auth";
import Link from "next/link";

export default async function CandidateReportPage({ params }: { params: { sessionId: string, attemptId: string } }) {
  const token = cookies().get("token")?.value;
  if (!token) redirect("/");
  const payload = await verifyToken(token);
  if (!payload || payload.role !== "OWNER") redirect("/");

  const attempt = await prisma.candidateAttempt.findUnique({
    where: { id: params.attemptId },
    include: {
      user: true,
      session: {
        include: { exam: true }
      },
      responses: {
        include: { question: true }
      }
    }
  });

  if (!attempt) return <div>Attempt not found</div>;

  const totalScore = attempt.responses.reduce((sum, r) => sum + r.earnedPoints, 0);
  
  const sessionQuestions = await prisma.question.findMany({
    where: { examSessions: { some: { id: params.sessionId } } }
  });
  const totalMarks = sessionQuestions.reduce((sum, q) => sum + q.points, 0) || attempt.session.exam.totalMarks || 1;
  const percentage = (totalScore / totalMarks) * 100;
  const timeTakenTotal = attempt.responses.reduce((sum, r) => sum + r.timeTakenSeconds, 0);

  // Fetch cheat flags for this candidate in this session
  const cheatFlags = await prisma.cheatFlag.findMany({
    where: {
      userId: attempt.userId,
      examSessionId: params.sessionId
    }
  });

  return (
    <div className="max-w-7xl mx-auto space-y-8 pb-12">
      <div className="flex items-center justify-between border-b pb-6">
        <div>
          <Link href={`/dashboard/owner/results/${params.sessionId}`} className="text-sm font-medium text-slate-500 hover:text-indigo-600 mb-2 inline-block">
            &larr; Back to Session Analytics
          </Link>
          <h1 className="text-3xl font-bold text-slate-800">{attempt.user.name}'s Report</h1>
          <p className="text-slate-500 mt-1">{attempt.session.exam.title}</p>
        </div>
        <div className="text-right">
          <p className="text-sm text-slate-500">Total Score</p>
          <p className="text-3xl font-bold text-indigo-700">{totalScore.toFixed(1)} <span className="text-lg text-slate-400">/ {totalMarks}</span></p>
          <p className="text-sm font-medium text-slate-600">({percentage.toFixed(1)}%)</p>
        </div>
      </div>

      {cheatFlags.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-6">
          <h3 className="text-red-800 font-bold mb-3 flex items-center gap-2">
            ⚠️ Integrity Flags Triggered ({cheatFlags.length})
          </h3>
          <ul className="space-y-2">
            {cheatFlags.map(flag => (
              <li key={flag.id} className="text-sm text-red-700 flex justify-between bg-white/50 p-2 rounded">
                <span><strong>{flag.type}:</strong> {flag.description}</span>
                <span className="text-xs text-red-500">{flag.timestamp.toLocaleTimeString()}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
        <div className="p-6 border-b">
          <h2 className="text-xl font-bold text-slate-800">Question-by-Question Breakdown</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-slate-500">
              <tr>
                <th className="px-6 py-4 font-medium w-1/3">Question</th>
                <th className="px-6 py-4 font-medium">Selected Answer</th>
                <th className="px-6 py-4 font-medium">Correct Answer</th>
                <th className="px-6 py-4 font-medium">Points</th>
                <th className="px-6 py-4 font-medium">Time Spent</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {attempt.responses.map((response, idx) => {
                const isCorrect = response.isCorrect;
                return (
                  <tr key={response.id} className="hover:bg-slate-50">
                    <td className="px-6 py-4">
                      <p className="text-slate-800 font-medium mb-2">Q{idx + 1}. {response.question.text}</p>
                      {response.question.imageUrl && (
                        <img src={response.question.imageUrl} alt="Question figure" className="max-h-24 rounded border border-slate-200" />
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-block px-2 py-1 rounded text-xs font-medium ${isCorrect ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                        {response.selectedOption}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="inline-block px-2 py-1 rounded text-xs font-medium bg-slate-100 text-slate-700">
                        {response.question.answerData}
                      </span>
                    </td>
                    <td className="px-6 py-4 font-medium">
                      <span className={response.earnedPoints > 0 ? "text-green-600" : (response.earnedPoints < 0 ? "text-red-600" : "text-slate-500")}>
                        {response.earnedPoints > 0 ? '+' : ''}{response.earnedPoints}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-slate-500">
                      {response.timeTakenSeconds}s
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
