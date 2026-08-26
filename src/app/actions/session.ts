"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { verifyToken } from "@/lib/auth";

export async function createSessionAction(formData: FormData) {
  const token = cookies().get("token")?.value;
  if (!token) return { error: "Unauthorized" };
  const payload = await verifyToken(token);
  if (!payload || payload.role !== "OWNER") return { error: "Unauthorized" };

  const examId = formData.get("examId") as string;
  if (!examId) return { error: "Missing examId" };
  
  const startTimeStr = formData.get("startTime") as string;
  const startTime = startTimeStr ? new Date(startTimeStr) : undefined;

  const template = await prisma.exam.findUnique({
    where: { id: examId },
    include: { questions: true, rules: true }
  });

  if (!template) return { error: "Template not found" };

  let snapshottedQuestions = [...template.questions];

  // Apply Auto-Pick Rules if they exist
  if (template.rules.length > 0) {
    for (const rule of template.rules) {
      // Find eligible questions in the bank
      const eligibleQs = await prisma.question.findMany({
        where: {
          status: "APPROVED",
          category: rule.category,
          difficultyLevel: rule.difficultyLevel
        }
      });
      
      // Randomly pick 'count' questions
      const shuffled = eligibleQs.sort(() => 0.5 - Math.random());
      const picked = shuffled.slice(0, rule.count);
      
      // Ensure we don't add duplicates if manual picks overlap
      for (const q of picked) {
        if (!snapshottedQuestions.find(sq => sq.id === q.id)) {
          snapshottedQuestions.push(q);
        }
      }
    }
  }

  if (snapshottedQuestions.length === 0) {
    return { error: "Could not create session: The template has no fixed questions, and the auto-pick rules did not find any matching questions in the bank." };
  }

  const session = await prisma.examSession.create({
    data: {
      examId,
      durationMinutes: template.durationMinutes,
      status: "SCHEDULED",
      startTime,
      totalMarks: template.totalMarks,
      passCriteria: template.passCriteria,
      negativeMarkingEnabled: template.negativeMarkingEnabled,
      negativeMarksValue: template.negativeMarksValue,
      partialCreditEnabled: template.partialCreditEnabled,
      configSnapshot: JSON.stringify({
        allowQuestionSkip: template.allowQuestionSkip,
        allowAnswerReview: template.allowAnswerReview,
        allowBackNavigation: template.allowBackNavigation,
        maxAttempts: template.maxAttempts,
        questionDisplayMode: template.questionDisplayMode,
        resultVisibility: template.resultVisibility,
        showCorrectAnswers: template.showCorrectAnswers,
        showExplanation: template.showExplanation,
        requireFullscreen: template.requireFullscreen,
        disableCopyPaste: template.disableCopyPaste,
        tabSwitchLimit: template.tabSwitchLimit,
        webcamRequired: template.webcamRequired,
        randomizeQuestionOrder: template.randomizeQuestionOrder,
        randomizeOptionOrder: template.randomizeOptionOrder,
      }),
      questions: {
        connect: snapshottedQuestions.map(q => ({ id: q.id }))
      }
    }
  });

  revalidatePath("/dashboard/owner");
  return { success: true, sessionId: session.id };
}

import { computeSessionAnalytics } from "./analytics";

export async function setSessionStatusAction(formData: FormData) {
  const token = cookies().get("token")?.value;
  if (!token) return { error: "Unauthorized" };
  const payload = await verifyToken(token);
  if (!payload || payload.role !== "OWNER") return { error: "Unauthorized" };

  const sessionId = formData.get("sessionId") as string;
  const status = formData.get("status") as string;

  if (status === "LIVE") {
    await prisma.examSession.update({
      where: { id: sessionId },
      data: { status, startTime: new Date() }
    });
  } else {
    await prisma.examSession.update({
      where: { id: sessionId },
      data: { status }
    });
    if (status === "COMPLETED") {
      await computeSessionAnalytics(sessionId).catch(e => console.error("Analytics error:", e));
    }
  }

  revalidatePath("/dashboard/owner");
  return { success: true };
}

export async function extendSessionTimeAction(formData: FormData) {
  const token = cookies().get("token")?.value;
  if (!token) return { error: "Unauthorized" };
  const payload = await verifyToken(token);
  if (!payload || payload.role !== "OWNER") return { error: "Unauthorized" };

  const sessionId = formData.get("sessionId") as string;
  const minutes = parseInt(formData.get("minutes") as string, 10);

  const session = await prisma.examSession.findUnique({ where: { id: sessionId } });
  if (!session) return { error: "Session not found" };

  // Calculate new extendedUntil
  const baseEnd = session.startTime 
    ? new Date(session.startTime.getTime() + session.durationMinutes * 60000) 
    : new Date();
  
  const currentExtended = session.extendedUntil || baseEnd;
  const newExtendedUntil = new Date(currentExtended.getTime() + minutes * 60000);

  await prisma.examSession.update({
    where: { id: sessionId },
    data: { extendedUntil: newExtendedUntil }
  });

  revalidatePath(`/dashboard/owner/session/${sessionId}`);
  return { success: true };
}

export async function extendCandidateTimeAction(formData: FormData) {
  const token = cookies().get("token")?.value;
  if (!token) return { error: "Unauthorized" };
  const payload = await verifyToken(token);
  if (!payload || payload.role !== "OWNER") return { error: "Unauthorized" };

  const attemptId = formData.get("attemptId") as string;
  const minutes = parseInt(formData.get("minutes") as string, 10);

  const attempt = await prisma.candidateAttempt.findUnique({ 
    where: { id: attemptId },
    include: { session: true }
  });
  if (!attempt) return { error: "Attempt not found" };

  const baseEnd = attempt.session.startTime 
    ? new Date(attempt.session.startTime.getTime() + attempt.session.durationMinutes * 60000) 
    : new Date();
  
  const currentExtended = attempt.extendedUntil || attempt.session.extendedUntil || baseEnd;
  const newExtendedUntil = new Date(currentExtended.getTime() + minutes * 60000);

  await prisma.candidateAttempt.update({
    where: { id: attemptId },
    data: { extendedUntil: newExtendedUntil }
  });

  revalidatePath(`/dashboard/owner/session/${attempt.examSessionId}`);
  return { success: true };
}

export async function endSessionAction(formData: FormData) {
  const token = cookies().get("token")?.value;
  if (!token) return { error: "Unauthorized" };
  const payload = await verifyToken(token);
  if (!payload || payload.role !== "OWNER") return { error: "Unauthorized" };

  const sessionId = formData.get("sessionId") as string;

  await prisma.examSession.update({
    where: { id: sessionId },
    data: { status: "COMPLETED" }
  });

  // Calculate analytics immediately
  const { computeSessionAnalytics } = await import("./analytics");
  await computeSessionAnalytics(sessionId).catch(e => console.error(e));

  revalidatePath(`/dashboard/owner/session/${sessionId}`);
  revalidatePath("/dashboard/owner");
  return { success: true };
}

export async function reopenCandidateAttemptAction(formData: FormData) {
  const token = cookies().get("token")?.value;
  if (!token) return { error: "Unauthorized" };
  const payload = await verifyToken(token);
  if (!payload || payload.role !== "OWNER") return { error: "Unauthorized" };

  const attemptId = formData.get("attemptId") as string;
  const minutes = parseInt(formData.get("minutes") as string || "10", 10);

  const attempt = await prisma.candidateAttempt.findUnique({
    where: { id: attemptId },
    include: { session: true }
  });

  if (!attempt) return { error: "Attempt not found" };

  const newExtendedUntil = new Date(Date.now() + minutes * 60000);

  await prisma.candidateAttempt.update({
    where: { id: attemptId },
    data: {
      status: "IN_PROGRESS",
      submittedAt: null,
      extendedUntil: newExtendedUntil
    }
  });

  if (attempt.session.status === "COMPLETED") {
    await prisma.examSession.update({
      where: { id: attempt.examSessionId },
      data: { status: "LIVE", extendedUntil: newExtendedUntil }
    });
  }

  revalidatePath(`/dashboard/owner/session/${attempt.examSessionId}`);
  revalidatePath("/dashboard/owner/candidates");
  return { success: true };
}

export async function resetCandidateAttemptAction(formData: FormData) {
  const token = cookies().get("token")?.value;
  if (!token) return { error: "Unauthorized" };
  const payload = await verifyToken(token);
  if (!payload || payload.role !== "OWNER") return { error: "Unauthorized" };

  const attemptId = formData.get("attemptId") as string;
  const minutes = parseInt(formData.get("minutes") as string || "0", 10);

  const attempt = await prisma.candidateAttempt.findUnique({
    where: { id: attemptId },
    include: { session: true }
  });

  if (!attempt) return { error: "Attempt not found" };

  // Clear previous responses and cheat flags
  await prisma.candidateResponse.deleteMany({ where: { attemptId } });
  await prisma.cheatFlag.deleteMany({ where: { userId: attempt.userId, examSessionId: attempt.examSessionId } });

  const durationMins = minutes > 0 ? minutes : attempt.session.durationMinutes;
  const newExtendedUntil = new Date(Date.now() + durationMins * 60000);

  // Reset attempt with fresh shuffle seed and time
  await prisma.candidateAttempt.update({
    where: { id: attemptId },
    data: {
      status: "IN_PROGRESS",
      submittedAt: null,
      createdAt: new Date(),
      shuffleSeed: Math.floor(Math.random() * 1000000),
      extendedUntil: newExtendedUntil
    }
  });

  if (attempt.session.status === "COMPLETED") {
    await prisma.examSession.update({
      where: { id: attempt.examSessionId },
      data: { status: "LIVE", extendedUntil: newExtendedUntil }
    });
  }

  revalidatePath(`/dashboard/owner/session/${attempt.examSessionId}`);
  revalidatePath("/dashboard/owner/candidates");
  return { success: true };
}
