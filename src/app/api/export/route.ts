import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifyToken } from "@/lib/auth";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const sessionId = url.searchParams.get("sessionId");

  if (!sessionId) {
    return new NextResponse("Missing sessionId", { status: 400 });
  }

  const token = cookies().get("token")?.value;
  if (!token) return new NextResponse("Unauthorized", { status: 401 });
  const payload = await verifyToken(token);
  if (!payload || payload.role !== "OWNER") return new NextResponse("Unauthorized", { status: 401 });

  const session = await prisma.examSession.findUnique({
    where: { id: sessionId },
    include: {
      exam: true,
      questions: true,
      cheatFlags: true,
      attempts: {
        where: { status: "SUBMITTED" },
        include: {
          user: true,
          responses: true
        }
      },
      questionStats: {
        include: { question: true }
      }
    }
  });

  if (!session) return new NextResponse("Session not found", { status: 404 });

  const totalMarks = session.questions.reduce((sum, q) => sum + q.points, 0) || session.totalMarks || session.exam.totalMarks || 1;

  // Generate CSV
  let csv = "CANDIDATE RESULTS\n";
  csv += "Rank,Name,Email,Score,Total Marks,Percentage,Status,Integrity Flags,Total Time (s),Submitted At\n";

  const rankedAttempts = session.attempts.map(attempt => {
    const flagsCount = session.cheatFlags.filter(f => f.userId === attempt.userId).length;
    return {
      ...attempt,
      flagsCount,
      score: attempt.responses.reduce((sum, r) => sum + r.earnedPoints, 0),
      time: attempt.responses.reduce((sum, r) => sum + r.timeTakenSeconds, 0)
    };
  }).sort((a, b) => b.score - a.score);

  rankedAttempts.forEach((a, i) => {
    const percentage = (a.score / totalMarks) * 100;
    const submittedTime = a.submittedAt ? new Date(a.submittedAt).toISOString() : "N/A";
    csv += `"${i+1}","${a.user.name}","${a.user.email}",${a.score.toFixed(1)},${totalMarks},${percentage.toFixed(2)}%,"${a.status}",${a.flagsCount},${a.time},"${submittedTime}"\n`;
  });

  csv += "\n\nITEM ANALYSIS (QUESTION PERFORMANCE)\n";
  csv += "Question ID,Question Text,p-value (Difficulty),Discrimination Index,Avg Time Spent (s),Distractors\n";

  session.questionStats.forEach(stat => {
    // Escape quotes in text
    const cleanText = stat.question.text.replace(/"/g, '""');
    const distractors = stat.distractors.replace(/"/g, '""');
    
    csv += `"${stat.questionId}","${cleanText}",${stat.pValue.toFixed(3)},${stat.discrimination.toFixed(3)},${stat.avgTimeSpent.toFixed(1)},"${distractors}"\n`;
  });

  // Return as downloadable file
  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv",
      "Content-Disposition": `attachment; filename="exam_report_${session.exam.title.replace(/\s+/g, '_')}_${session.id}.csv"`
    }
  });
}
