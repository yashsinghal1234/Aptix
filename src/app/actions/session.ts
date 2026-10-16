"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { requireAuth } from "@/lib/auth";
import { parseRosterText } from "@/lib/roster-parser";
import { randomInt } from "crypto";
import { invalidateOwnerDashboardCache } from "@/lib/dashboard-cache";
import { invalidateSessionQuestionsCache } from "@/lib/exam-cache";

function parseStartTime(startTimeStr: string | null | undefined, tzOffsetStr: string | null | undefined): Date | undefined {
  if (!startTimeStr || !startTimeStr.trim()) return undefined;
  
  if (startTimeStr.includes("Z") || /[+-]\d{2}:\d{2}$/.test(startTimeStr)) {
    const d = new Date(startTimeStr);
    return isNaN(d.getTime()) ? undefined : d;
  }

  const rawDate = new Date(startTimeStr);
  if (isNaN(rawDate.getTime())) return undefined;

  const tzOffset = tzOffsetStr ? parseInt(tzOffsetStr, 10) : 0;
  if (!isNaN(tzOffset) && tzOffset !== 0) {
    return new Date(rawDate.getTime() + tzOffset * 60000);
  }
  return rawDate;
}

function normalizeCategory(cat: string): string {
  if (!cat) return cat;
  const lower = cat.toLowerCase().trim();
  if (lower.startsWith("quant")) return "Quantitative Aptitude";
  if (lower.startsWith("logic")) return "Logical Reasoning";
  if (lower.startsWith("verb")) return "Verbal Ability";
  if (lower.startsWith("data") || lower.startsWith("di")) return "Data Interpretation";
  if (lower.startsWith("abstract")) return "Abstract Reasoning";
  if (lower.startsWith("comp") || lower.startsWith("tech")) return "Computer Science & Tech";
  if (lower.startsWith("gen")) return "General Awareness";
  if (lower.startsWith("domain")) return "Domain Specific";
  return cat;
}

export async function createSessionAction(formData: FormData) {
  const auth = await requireAuth(["OWNER"]);
  if ("error" in auth) return { error: auth.error };

  const examId = formData.get("examId") as string;
  if (!examId) return { error: "Missing examId" };
  
  const startTimeStr = formData.get("startTime") as string;
  const tzOffsetStr = formData.get("timezoneOffset") as string;
  const startTime = parseStartTime(startTimeStr, tzOffsetStr);

  const template = await prisma.exam.findUnique({
    where: { id: examId },
    include: { questions: true, rules: true, rosters: true }
  });

  if (!template) return { error: "Template not found" };

  let snapshottedQuestions = [...template.questions];

  // Apply Auto-Pick Rules if they exist
  if (template.rules.length > 0) {
    for (const rule of template.rules) {
      const normCat = normalizeCategory(rule.category);

      // Find eligible questions in the bank matching category and difficulty level
      let eligibleQs = await prisma.question.findMany({
        where: {
          status: "APPROVED",
          difficultyLevel: rule.difficultyLevel,
          OR: [
            { category: rule.category },
            { category: normCat },
            { category: { contains: rule.category, mode: "insensitive" } },
            { category: { contains: normCat, mode: "insensitive" } }
          ]
        }
      });
      
      // If fewer questions found than requested, fallback to any difficulty level for this category
      if (eligibleQs.length < rule.count) {
        const existingIds = eligibleQs.map(q => q.id);
        const fallbackQs = await prisma.question.findMany({
          where: {
            status: "APPROVED",
            OR: [
              { category: rule.category },
              { category: normCat },
              { category: { contains: rule.category, mode: "insensitive" } },
              { category: { contains: normCat, mode: "insensitive" } }
            ],
            ...(existingIds.length > 0 ? { id: { notIn: existingIds } } : {})
          }
        });
        eligibleQs = [...eligibleQs, ...fallbackQs];
      }

      // Randomly pick 'count' questions using CSPRNG Fisher-Yates shuffle
      const shuffled = [...eligibleQs];
      for (let i = shuffled.length - 1; i > 0; i--) {
        const j = randomInt(0, i + 1);
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
      }
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
    return { error: "Could not create session: The template has no fixed questions, and no approved questions in the bank matched the auto-pick rules." };
  }

  const { generateSessionPin } = await import("@/lib/auth");
  let pin = generateSessionPin();
  // Ensure uniqueness
  while (await prisma.examSession.findUnique({ where: { pin } })) {
    pin = generateSessionPin();
  }

  const isScheduled = !!startTimeStr && startTime && startTime.getTime() > Date.now();
  const initialStatus = isScheduled ? "SCHEDULED" : "LIVE";
  const sessionStartTime = isScheduled ? startTime : (startTime || new Date());

  const session = await prisma.examSession.create({
    data: {
      pin,
      examId,
      allowedEmailDomain: template.allowedEmailDomain,
      durationMinutes: template.durationMinutes,
      status: initialStatus,
      startTime: sessionStartTime,
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
        isGamified: template.description?.includes("[MODE:GAMIFIED]") || formData.get("isGamified") === "on",
        resultsReleased: false,
      }),
      questions: {
        connect: snapshottedQuestions.map(q => ({ id: q.id }))
      }
    }
  });

  invalidateOwnerDashboardCache();
  revalidatePath("/dashboard/owner");

  let rosterAdded = 0;
  const inherited = (template.rosters || []).map((r) => ({ examSessionId: session.id, email: r.email, name: r.name }));
  const extraText = ((formData.get("rosterText") as string) || "").slice(0, 500_000);
  let extra: { examSessionId: string; email: string; name: string | null }[] = [];
  if (extraText.trim()) {
    extra = parseRosterText(extraText).entries
      .slice(0, 5000)
      .map((e) => ({ examSessionId: session.id, email: e.email, name: e.name }));
  }
  const combined = new Map<string, { examSessionId: string; email: string; name: string | null }>();
  for (const r of [...inherited, ...extra]) if (!combined.has(r.email)) combined.set(r.email, r);
  if (combined.size > 0) {
    await prisma.sessionRoster.createMany({ data: [...combined.values()], skipDuplicates: true });
    rosterAdded = combined.size;
  }

  invalidateOwnerDashboardCache();
  revalidatePath("/dashboard/owner");
  return { success: true, sessionId: session.id, pin, rosterAdded };
}

import { computeSessionAnalytics } from "./analytics";

export async function setSessionStatusAction(formData: FormData) {
  const auth = await requireAuth(["OWNER"]);
  if ("error" in auth) return { error: auth.error };

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
      // Auto-submit any attempts that are still in progress
      await prisma.candidateAttempt.updateMany({
        where: { examSessionId: sessionId, status: "IN_PROGRESS" },
        data: { status: "SUBMITTED", submittedAt: new Date() }
      });
      await computeSessionAnalytics(sessionId).catch(e => console.error("Analytics error:", e));
    }
  }

  invalidateOwnerDashboardCache();
  revalidatePath("/dashboard/owner");
  revalidatePath(`/dashboard/owner/session/${sessionId}`);
  return { success: true };
}

export async function extendSessionTimeAction(formData: FormData) {
  const auth = await requireAuth(["OWNER"]);
  if ("error" in auth) return { error: auth.error };

  const sessionId = formData.get("sessionId") as string;
  const { validateExtensionMinutes, getBaseEnd } = await import("@/lib/deadline");
  const { minutes, error } = validateExtensionMinutes(formData.get("minutes"), 120);
  if (error || minutes === undefined) return { error: error || "Invalid minutes" };

  const session = await prisma.examSession.findUnique({ where: { id: sessionId } });
  if (!session) return { error: "Session not found" };

  // Stack onto the current global deadline (never rewrite history)
  const baseEnd = getBaseEnd(session);
  const currentExtended = session.extendedUntil || baseEnd;
  const newExtendedUntil = new Date(currentExtended.getTime() + minutes * 60000);

  await prisma.examSession.update({
    where: { id: sessionId },
    data: { extendedUntil: newExtendedUntil }
  });

  await prisma.auditLog.create({
    data: {
      userId: (auth.payload.userId as string) || auth.user.id,
      action: "EXTEND_SESSION",
      details: `Extended session ${sessionId} by ${minutes}m (new deadline ${newExtendedUntil.toISOString()})`,
    },
  }).catch(() => {});

  revalidatePath(`/dashboard/owner/session/${sessionId}`);
  return { success: true };
}

export async function extendCandidateTimeAction(formData: FormData) {
  const auth = await requireAuth(["OWNER"]);
  if ("error" in auth) return { error: auth.error };

  const attemptId = formData.get("attemptId") as string;
  const { validateExtensionMinutes, getBaseEnd } = await import("@/lib/deadline");
  const { minutes, error } = validateExtensionMinutes(formData.get("minutes"), 120);
  if (error || minutes === undefined) return { error: error || "Invalid minutes" };

  const attempt = await prisma.candidateAttempt.findUnique({ 
    where: { id: attemptId },
    include: { session: true }
  });
  if (!attempt) return { error: "Attempt not found" };

  // Per-candidate only: never touches the global session deadline
  const baseEnd = getBaseEnd(attempt.session);
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
  const auth = await requireAuth(["OWNER"]);
  if ("error" in auth) return { error: auth.error };

  const sessionId = formData.get("sessionId") as string;

  await prisma.examSession.update({
    where: { id: sessionId },
    data: { status: "COMPLETED" }
  });

  // Auto-submit any attempts that are still in progress
  await prisma.candidateAttempt.updateMany({
    where: { examSessionId: sessionId, status: "IN_PROGRESS" },
    data: { status: "SUBMITTED", submittedAt: new Date() }
  });

  // Calculate analytics immediately
  const { computeSessionAnalytics } = await import("./analytics");
  await computeSessionAnalytics(sessionId).catch(e => console.error(e));

  revalidatePath(`/dashboard/owner/session/${sessionId}`);
  revalidatePath("/dashboard/owner");
  return { success: true };
}

export async function reopenCandidateAttemptAction(formData: FormData) {
  const auth = await requireAuth(["OWNER"]);
  if ("error" in auth) return { error: auth.error };

  const attemptId = formData.get("attemptId") as string;
  const { validateExtensionMinutes } = await import("@/lib/deadline");
  const parsed = validateExtensionMinutes((formData.get("minutes") as string) || "10", 120);
  const minutes = parsed.minutes ?? 10;
  if (parsed.error && formData.get("minutes")) return { error: parsed.error };

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

  // Per-candidate only: flip a concluded hall back to LIVE so the client can
  // resume, but NEVER touch the global session.extendedUntil here, otherwise
  // every other candidate silently inherits this extension.
  if (attempt.session.status === "COMPLETED") {
    await prisma.examSession.update({
      where: { id: attempt.examSessionId },
      data: { status: "LIVE" }
    });
  }

  await prisma.auditLog.create({
    data: {
      userId: (auth.payload.userId as string) || auth.user.id,
      action: "REOPEN_ATTEMPT",
      details: `Reopened attempt ${attemptId} for +${minutes}m (until ${newExtendedUntil.toISOString()})`,
    },
  }).catch(() => {});

  revalidatePath(`/dashboard/owner/session/${attempt.examSessionId}`);
  revalidatePath("/dashboard/owner/candidates");
  return { success: true };
}

export async function resetCandidateAttemptAction(formData: FormData) {
  const auth = await requireAuth(["OWNER"]);
  if ("error" in auth) return { error: auth.error };

  const attemptId = formData.get("attemptId") as string;
  const { validateExtensionMinutes } = await import("@/lib/deadline");
  const rawMinutes = (formData.get("minutes") as string) || "0";

  const attempt = await prisma.candidateAttempt.findUnique({
    where: { id: attemptId },
    include: { session: true }
  });

  if (!attempt) return { error: "Attempt not found" };

  // Clear previous responses and cheat flags
  await prisma.candidateResponse.deleteMany({ where: { attemptId } });
  await prisma.cheatFlag.deleteMany({ where: { userId: attempt.userId, examSessionId: attempt.examSessionId } });

  const durationMins = rawMinutes !== "0" ? (validateExtensionMinutes(rawMinutes, 180).minutes ?? attempt.session.durationMinutes) : attempt.session.durationMinutes;
  const newExtendedUntil = new Date(Date.now() + durationMins * 60000);

  // Reset attempt with fresh shuffle seed and time
  await prisma.candidateAttempt.update({
    where: { id: attemptId },
    data: {
      status: "IN_PROGRESS",
      submittedAt: null,
      createdAt: new Date(),
      shuffleSeed: randomInt(100000, 9999999),
      extendedUntil: newExtendedUntil
    }
  });

  if (attempt.session.status === "COMPLETED") {
    await prisma.examSession.update({
      where: { id: attempt.examSessionId },
      data: { status: "LIVE" }
    });
  }

  await prisma.auditLog.create({
    data: {
      userId: (auth.payload.userId as string) || auth.user.id,
      action: "RESET_ATTEMPT",
      details: `Reset attempt ${attemptId} with fresh window ${durationMins}m`,
    },
  }).catch(() => {});

  revalidatePath(`/dashboard/owner/session/${attempt.examSessionId}`);
  revalidatePath("/dashboard/owner/candidates");
  return { success: true };
}

export async function rescheduleSessionAction(formData: FormData) {
  const auth = await requireAuth(["OWNER"]);
  if ("error" in auth) return { error: auth.error };
  const { payload } = auth;

  const sessionId = formData.get("sessionId") as string;
  const startTimeStr = formData.get("startTime") as string;
  const tzOffsetStr = formData.get("timezoneOffset") as string;

  if (!sessionId) return { error: "Session ID is required" };
  if (!startTimeStr) return { error: "New start time is required" };

  const newStartTime = parseStartTime(startTimeStr, tzOffsetStr);
  if (!newStartTime || isNaN(newStartTime.getTime())) {
    return { error: "Invalid date & time format" };
  }

  const session = await prisma.examSession.findUnique({
    where: { id: sessionId },
    include: { exam: true }
  });

  if (!session) return { error: "Session not found" };
  if (session.status === "COMPLETED") {
    return { error: "Cannot reschedule a completed session" };
  }

  const now = new Date();
  const nextStatus = newStartTime <= now ? "LIVE" : "SCHEDULED";

  const updatedSession = await prisma.examSession.update({
    where: { id: sessionId },
    data: {
      startTime: newStartTime,
      status: nextStatus
    }
  });

  await prisma.auditLog.create({
    data: {
      userId: payload.userId as string,
      action: "RESCHEDULE_SESSION",
      details: `Rescheduled session "${session.exam.title}" (${session.pin || session.id}) to ${newStartTime.toISOString()}`,
    }
  });

  revalidatePath("/dashboard/owner");
  revalidatePath(`/dashboard/owner/session/${sessionId}`);
  return { success: true, session: updatedSession };
}

export async function toggleReleaseResultsAction(formData: FormData) {
  const auth = await requireAuth(["OWNER", "SETTER"]);
  if ("error" in auth) return { error: auth.error };
  const { payload } = auth;

  const sessionId = formData.get("sessionId") as string;
  const released = formData.get("released") === "true";

  const session = await prisma.examSession.findUnique({ 
    where: { id: sessionId },
    include: { exam: true }
  });
  if (!session) return { error: "Session not found" };

  if (payload.role === "SETTER" && session.exam.createdBySetterId !== payload.userId) {
    return { error: "Forbidden: You are not authorized to manage this session." };
  }

  let snap: any = {};
  if (session.configSnapshot) {
    try {
      snap = JSON.parse(session.configSnapshot);
    } catch {}
  }
  snap.resultsReleased = released;

  await prisma.examSession.update({
    where: { id: sessionId },
    data: { configSnapshot: JSON.stringify(snap) }
  });

  await prisma.auditLog.create({
    data: {
      userId: payload.userId as string,
      action: released ? "RELEASE_RESULTS" : "WITHHOLD_RESULTS",
      details: `${released ? "Released" : "Withheld"} candidate results for session "${session.exam.title}" (${session.pin || session.id})`,
    }
  });

  invalidateOwnerDashboardCache();
  revalidatePath("/dashboard/owner");
  revalidatePath(`/dashboard/owner/session/${sessionId}`);
  revalidatePath(`/dashboard/owner/results/${sessionId}`);
  return { success: true, resultsReleased: released };
}

export async function togglePodiumRevealAction(formData: FormData) {
  const auth = await requireAuth(["OWNER", "SETTER"]);
  if ("error" in auth) return { error: auth.error };
  const { payload } = auth;

  const sessionId = String(formData.get("sessionId") || "");
  const revealed = formData.get("revealed") === "true";

  const session = await prisma.examSession.findUnique({ 
    where: { id: sessionId },
    include: { exam: true }
  });
  if (!session) return { error: "Session not found" };

  if (payload.role === "SETTER" && session.exam.createdBySetterId !== payload.userId) {
    return { error: "Forbidden: You are not authorized to manage this session." };
  }

  let snap: any = {};
  if (session.configSnapshot) {
    try {
      snap = JSON.parse(session.configSnapshot);
    } catch {}
  }
  snap.podiumRevealed = revealed;

  await prisma.examSession.update({
    where: { id: sessionId },
    data: { configSnapshot: JSON.stringify(snap) }
  });

  await prisma.auditLog.create({
    data: {
      userId: payload.userId as string,
      action: revealed ? "REVEAL_PODIUM" : "HIDE_PODIUM",
      details: `${revealed ? "Revealed" : "Hidden"} cohort podium for session "${session.exam.title}" (${session.pin || session.id})`,
    }
  });

  invalidateOwnerDashboardCache();
  revalidatePath("/dashboard/owner");
  revalidatePath(`/dashboard/owner/session/${sessionId}`);
  revalidatePath(`/dashboard/owner/results/${sessionId}`);
  return { success: true, podiumRevealed: revealed };
}

export async function toggleGamifiedModeAction(formData: FormData) {
  const auth = await requireAuth(["OWNER", "SETTER"]);
  if ("error" in auth) return { error: auth.error };
  const { payload } = auth;

  const sessionId = formData.get("sessionId") as string;
  const gamified = formData.get("gamified") === "true";

  const session = await prisma.examSession.findUnique({
    where: { id: sessionId },
    include: { exam: true }
  });
  if (!session) return { error: "Session not found" };

  let snap: any = {};
  if (session.configSnapshot) {
    try {
      snap = JSON.parse(session.configSnapshot);
    } catch {}
  }
  snap.isGamified = gamified;

  await prisma.examSession.update({
    where: { id: sessionId },
    data: { configSnapshot: JSON.stringify(snap) }
  });

  if (session.exam) {
    let desc: string = session.exam.description || "";
    if (gamified && !desc.includes("[MODE:GAMIFIED]")) {
      desc = desc ? `${desc} [MODE:GAMIFIED]` : "[MODE:GAMIFIED]";
      await prisma.exam.update({ where: { id: session.exam.id }, data: { description: desc } });
    } else if (!gamified && desc.includes("[MODE:GAMIFIED]")) {
      desc = desc.replace(/\s*\[MODE:GAMIFIED\]/g, "").trim();
      await prisma.exam.update({ where: { id: session.exam.id }, data: { description: desc } });
    }
  }

  await prisma.auditLog.create({
    data: {
      userId: payload.userId as string,
      action: gamified ? "ENABLE_GAMIFIED_MODE" : "DISABLE_GAMIFIED_MODE",
      details: `${gamified ? "Enabled" : "Disabled"} gamified mode for session "${session.exam?.title || session.id}"`,
    }
  });

  invalidateOwnerDashboardCache();
  invalidateSessionQuestionsCache(sessionId);
  revalidatePath("/dashboard/owner");
  revalidatePath(`/dashboard/owner/session/${sessionId}`);
  revalidatePath(`/dashboard/owner/results/${sessionId}`);
  return { success: true, isGamified: gamified };
}

