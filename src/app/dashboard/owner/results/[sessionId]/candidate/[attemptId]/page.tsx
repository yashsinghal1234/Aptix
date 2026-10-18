import React from "react";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { requireAuth } from "@/lib/auth";
import CandidateAuditView from "@/components/owner/CandidateAuditView";

export const dynamic = "force-dynamic";

function parseOptionLabelAndText(q: any, rawVal?: string | null) {
  let val = unwrapAnswerValue(rawVal);
  if (!val || val === "—") return { label: "", text: "Unanswered" };
  let opts: any[] = [];
  try {
    if (Array.isArray(q.options)) opts = q.options;
    else if (typeof q.options === "string") opts = JSON.parse(q.options);
  } catch {}

  const letters = ["A", "B", "C", "D", "E", "F"];
  const valUpper = val.trim().toUpperCase();

  const letterIdx = letters.indexOf(valUpper);
  if (letterIdx !== -1 && opts[letterIdx]) {
    const optObj = opts[letterIdx];
    const text = typeof optObj === "string" ? optObj : (optObj.text || val);
    return { label: valUpper, text };
  }

  // Multi-letter selections like "A, B" — resolve each letter to its text
  const multiLetters = valUpper.split(/\s*,\s*/);
  if (multiLetters.length > 1 && multiLetters.every((l) => letters.includes(l) && opts[letters.indexOf(l)])) {
    const texts = multiLetters.map((l) => {
      const optObj = opts[letters.indexOf(l)];
      return typeof optObj === "string" ? optObj : optObj?.text || l;
    });
    return { label: valUpper, text: texts.join(" · ") };
  }

  const matchIdx = opts.findIndex((o) => {
    const oText = typeof o === "string" ? o : o?.text;
    return oText && String(oText).trim().toLowerCase() === val.trim().toLowerCase();
  });

  if (matchIdx !== -1) {
    const label = letters[matchIdx] || "A";
    return { label, text: val };
  }

  return { label: "", text: val };
}

/**
 * Stored answer values are sometimes JSON wrappers (e.g. {"correctAnswer":"..."} or
 * ["A","B"]) or a JSON-encoded string of one of those. Unwrap them down to the plain
 * answer value (letter, letter list, or literal text) so it can be matched to options.
 */
function unwrapAnswerValue(rawVal?: string | null): string | null {
  if (!rawVal) return null;
  let v = String(rawVal).trim();
  if (!v || v === "—") return v;

  const extract = (s: string): string | null => {
    try {
      const parsed = JSON.parse(s);
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
        if (typeof parsed.correctAnswer === "string") return parsed.correctAnswer.trim();
        if (parsed.correctAnswer != null) return String(parsed.correctAnswer);
        if (typeof parsed.answer === "string") return parsed.answer.trim();
      }
      if (Array.isArray(parsed)) return parsed.map(String).join(", ").trim();
    } catch {}
    // Regex fallback for truncated/wrapped JSON like {"correctAnswer":"..."}
    const m = s.match(/"correctAnswer"\s*:\s*"((?:[^"\\]|\\.)*)"/);
    if (m) return m[1].replace(/\\"/g, '"').trim();
    return null;
  };

  const first = extract(v);
  if (first != null) {
    const second = extract(first);
    return second ?? first;
  }
  return v;
}

export default async function CandidateReportPage({
  params,
}: {
  params: { sessionId: string; attemptId: string };
}) {
  const auth = await requireAuth(["OWNER"]);
  if ("error" in auth) redirect("/");

  const attempt = await prisma.candidateAttempt.findUnique({
    where: { id: params.attemptId },
    include: {
      user: true,
      session: {
        include: { exam: true, questions: true },
      },
      responses: {
        include: { question: true },
      },
    },
  });

  if (!attempt) return <div className="p-8 text-neutral-400">Attempt record not found.</div>;

  // Session questions
  const sessionQuestions =
    attempt.session.questions.length > 0
      ? attempt.session.questions
      : await prisma.question.findMany({
          where: { examSessions: { some: { id: params.sessionId } } },
        });

  // Cheat flags
  const cheatFlags = await prisma.cheatFlag.findMany({
    where: {
      userId: attempt.userId,
      examSessionId: params.sessionId,
    },
    orderBy: { timestamp: "asc" },
  });

  // Map candidate responses
  const responseMap = new Map(attempt.responses.map((r) => [r.questionId, r]));

  const questionsData = sessionQuestions.map((q, idx) => {
    const resp = responseMap.get(q.id);
    const hasResponse = !!resp;
    const isCorrect = hasResponse ? resp.isCorrect : null;
    const earnedPoints = resp?.earnedPoints ?? 0;
    const timeTaken = resp?.timeTakenSeconds ?? 0;

    const { label: selLabel, text: selText } = parseOptionLabelAndText(q, resp?.selectedOption);
    const { label: corLabel, text: corText } = parseOptionLabelAndText(q, q.answerData);

    let parsedOptions: any[] = [];
    try {
      if (Array.isArray(q.options)) parsedOptions = q.options;
      else if (typeof q.options === "string") parsedOptions = JSON.parse(q.options);
    } catch {}

    return {
      id: q.id,
      num: idx + 1,
      text: q.text,
      category: q.category || "General",
      imageUrl: q.imageUrl || null,
      options: parsedOptions,
      selectedLabel: selLabel,
      selectedText: selText,
      isCorrect,
      correctLabel: corLabel,
      correctText: corText,
      earnedPoints,
      timeTakenSeconds: timeTaken,
      explanation: (q as any).explanation || null,
    };
  });

  // Metrics
  const netScore = Math.round(attempt.responses.reduce((sum, r) => sum + r.earnedPoints, 0) * 10) / 10;
  // Last fallback 0 keeps totals honest when nothing is configured (no fabricated default)
  const totalMarks =
    sessionQuestions.reduce((sum, q) => sum + q.points, 0) || attempt.session.totalMarks || attempt.session.exam.totalMarks || 0;
  const correctCount = attempt.responses.filter((r) => r.isCorrect).length;
  const incorrectCount = attempt.responses.filter((r) => !r.isCorrect).length;
  const unansweredCount = Math.max(0, sessionQuestions.length - (correctCount + incorrectCount));
  const attemptedCount = correctCount + incorrectCount;
  const accuracyPct = attemptedCount > 0 ? (correctCount / attemptedCount) * 100 : 0;

  const positiveMarks = Math.round(
    attempt.responses.filter((r) => r.earnedPoints > 0).reduce((sum, r) => sum + r.earnedPoints, 0) * 10
  ) / 10;
  const negativeMarks = Math.round(
    Math.abs(attempt.responses.filter((r) => r.earnedPoints < 0).reduce((sum, r) => sum + r.earnedPoints, 0)) * 10
  ) / 10;

  // Timestamps
  const startTime = attempt.createdAt;
  const submittedTime = attempt.submittedAt || new Date(startTime.getTime() + attempt.session.durationMinutes * 60000);
  const elapsedSec = Math.max(1, Math.round((submittedTime.getTime() - startTime.getTime()) / 1000));
  const mins = Math.floor(elapsedSec / 60);
  const secs = elapsedSec % 60;
  const timeSpentFormatted = `${mins}m ${String(secs).padStart(2, "0")}s`;

  const formatIST = (d: Date) =>
    d.toLocaleTimeString("en-GB", { timeZone: "Asia/Kolkata", hour12: false });
  const startIST = formatIST(startTime);
  const submittedIST = formatIST(submittedTime);

  const examDateStr = (attempt.session.startTime || startTime).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });

  const durationMin = attempt.session.durationMinutes || 60;
  const endWindow = new Date(startTime.getTime() + durationMin * 60000);
  const examTimeWindow = `${startIST.slice(0, 5)}-${formatIST(endWindow).slice(0, 5)} IST`;

  // Real attempt ordinal within this session (1-indexed), instead of a hardcoded 1
  const siblingAttempts = await prisma.candidateAttempt.findMany({
    where: { userId: attempt.userId, examSessionId: params.sessionId, },
    orderBy: { createdAt: "asc" },
    select: { id: true },
  });
  const attemptNumber = Math.max(1, siblingAttempts.findIndex((a) => a.id === attempt.id) + 1);

  const flagsFormatted = cheatFlags.map((f) => ({
    id: f.id,
    type: f.type,
    description: f.description || f.type,
    timestamp: formatIST(new Date(f.timestamp)),
  }));

  return (
    <CandidateAuditView
      attemptId={attempt.id}
      sessionId={params.sessionId}
      candidateName={attempt.user.name}
      candidateEmail={attempt.user.email}
      attemptNumber={attemptNumber}
      examTitle={attempt.session.exam.title}
      sessionPin={attempt.session.pin}
      examDateStr={examDateStr}
      examTimeWindow={examTimeWindow}
      netScore={netScore}
      totalMarks={totalMarks}
      passCriteria={attempt.session.passCriteria || 50}
      accuracyPct={accuracyPct}
      correctCount={correctCount}
      incorrectCount={incorrectCount}
      unansweredCount={unansweredCount}
      attemptedCount={attemptedCount}
      positiveMarks={positiveMarks}
      negativeMarks={negativeMarks}
      timeSpentFormatted={timeSpentFormatted}
      submittedIST={submittedIST}
      flagsCount={cheatFlags.length}
      cheatFlags={flagsFormatted}
      questionsData={questionsData}
    />
  );
}
