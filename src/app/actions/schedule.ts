"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { requireAuth } from "@/lib/auth";
import { invalidateOwnerDashboardCache, invalidateQuestionBankCache } from "@/lib/dashboard-cache";
import { z } from "zod";

const scheduleSchema = z.object({
  title: z.string().min(3),
  durationMinutes: z.number().min(1),
  startTime: z.string().optional(),
  negativeMarking: z.number().min(0),
});

function parseStartTime(startTimeStr: string | null | undefined, tzOffsetStr: string | null | undefined): Date {
  if (!startTimeStr || !startTimeStr.trim()) return new Date();
  
  if (startTimeStr.includes("Z") || /[+-]\d{2}:\d{2}$/.test(startTimeStr)) {
    const d = new Date(startTimeStr);
    return isNaN(d.getTime()) ? new Date() : d;
  }

  const rawDate = new Date(startTimeStr);
  if (isNaN(rawDate.getTime())) return new Date();

  const tzOffset = tzOffsetStr ? parseInt(tzOffsetStr, 10) : 0;
  if (!isNaN(tzOffset) && tzOffset !== 0) {
    return new Date(rawDate.getTime() + tzOffset * 60000);
  }
  return rawDate;
}

export async function createScheduledExamAction(formData: FormData, selectedQuestionIds: string[]) {
  const auth = await requireAuth(["OWNER"]);
  if ("error" in auth) return { error: auth.error };
  const { user } = auth;

  const tzOffsetStr = formData.get("timezoneOffset") as string;
  const parsed = scheduleSchema.safeParse({
    title: formData.get("title"),
    durationMinutes: parseInt(formData.get("durationMinutes") as string, 10),
    startTime: formData.get("startTime"),
    negativeMarking: parseFloat(formData.get("negativeMarking") as string) || 0,
  });

  if (!parsed.success || selectedQuestionIds.length === 0) {
    return { error: "Invalid input. Please check the fields." };
  }

  const { title, durationMinutes, startTime: startTimeStr, negativeMarking } = parsed.data;
  const startTime = parseStartTime(startTimeStr, tzOffsetStr);
  const allowedEmailDomain = (formData.get("allowedEmailDomain") as string)?.trim() || null;

  const { generateSessionPin } = await import("@/lib/auth");
  let pin = generateSessionPin();
  while (await prisma.examSession.findUnique({ where: { pin } })) {
    pin = generateSessionPin();
  }

  // First, create the blueprint (Exam)
  const exam = await prisma.exam.create({
    data: {
      title,
      durationMinutes,
      allowedEmailDomain,
      negativeMarkingEnabled: negativeMarking > 0,
      negativeMarksValue: negativeMarking,
      createdBySetterId: user.id,
      questions: {
        connect: selectedQuestionIds.map((id) => ({ id }))
      }
    }
  });

  // Then, schedule a live session from it
  await prisma.examSession.create({
    data: {
      pin,
      examId: exam.id,
      allowedEmailDomain,
      durationMinutes,
      startTime,
      status: "SCHEDULED",
      questions: {
        connect: selectedQuestionIds.map((id) => ({ id }))
      }
    }
  });

  await prisma.auditLog.create({
    data: {
      userId: user.id,
      action: "SCHEDULE_EXAM",
      details: `Scheduled one-off exam: ${title} (PIN: ${pin})`,
    }
  });

  revalidatePath("/dashboard/owner");
  return { success: true, pin };
}

export async function reviewQuestionAction(questionId: string, action: "APPROVE" | "REJECT") {
  const auth = await requireAuth(["OWNER", "SETTER"]);
  if ("error" in auth) return { error: auth.error };
  const { user } = auth;

  const question = await prisma.question.findUnique({
    where: { id: questionId },
  });
  if (!question) return { error: "Question not found" };

  // Four-eyes principle: Setters cannot approve their own submitted questions
  if (user.role === "SETTER" && action === "APPROVE" && question.authorId === user.id) {
    return { error: "Four-eyes principle: Setters cannot approve their own submitted questions. An Owner or peer must review it." };
  }

  await prisma.question.update({
    where: { id: questionId },
    data: { status: action === "APPROVE" ? "APPROVED" : "REJECTED" }
  });

  await prisma.auditLog.create({
    data: {
      userId: user.id,
      action: "REVIEW_QUESTION",
      details: `${action} question ${questionId}`,
    }
  });

  invalidateOwnerDashboardCache();
  invalidateQuestionBankCache();
  revalidatePath("/dashboard/owner");
  revalidatePath("/dashboard/setter/bank");
  revalidatePath("/dashboard/setter");
  return { success: true };
}

export async function approveAllQuestionsAction() {
  const auth = await requireAuth(["OWNER"]);
  if ("error" in auth) return { error: auth.error };
  const { user } = auth;

  await prisma.question.updateMany({
    where: { status: { in: ["SUBMITTED", "DRAFT"] } },
    data: { status: "APPROVED" }
  });

  await prisma.auditLog.create({
    data: {
      userId: user.id,
      action: "APPROVE_ALL_QUESTIONS",
      details: "Batch-approved all submitted/draft questions",
    }
  });

  invalidateOwnerDashboardCache();
  invalidateQuestionBankCache();
  revalidatePath("/dashboard/owner");
  revalidatePath("/dashboard/setter/bank");
  revalidatePath("/dashboard/setter");
  return { success: true };
}
