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

  // Generate CSV
  // We will create two sections or just export the Item Analysis first, 
  // followed by Candidate Scores. Let's export candidate scores per question.

  let csv = "CANDIDATE RESULTS\n";
  csv += "Rank,Name,Email,Total Score,Percentage,Total Time (s)\n";

  const rankedAttempts = session.attempts.map(attempt => ({
    ...attempt,
    score: attempt.responses.reduce((sum, r) => sum + r.earnedPoints, 0),
    time: attempt.responses.reduce((sum, r) => sum + r.timeTakenSeconds, 0)
  })).sort((a, b) => b.score - a.score);

  rankedAttempts.forEach((a, i) => {
    const percentage = (a.score / session.exam.totalMarks) * 100;
    csv += `"${i+1}","${a.user.name}","${a.user.email}",${a.score},${percentage.toFixed(2)}%,${a.time}\n`;
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
