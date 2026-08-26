"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { verifyToken } from "@/lib/auth";
import { z } from "zod";

const scheduleSchema = z.object({
  title: z.string().min(3),
  durationMinutes: z.number().min(1),
  startTime: z.string().optional(),
  negativeMarking: z.number().min(0),
});

export async function createScheduledExamAction(formData: FormData, selectedQuestionIds: string[]) {
  const token = cookies().get("token")?.value;
  if (!token) return { error: "Unauthorized" };
  const payload = await verifyToken(token);
  if (!payload || payload.role !== "OWNER") return { error: "Unauthorized" };

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
  const startTime = startTimeStr ? new Date(startTimeStr) : new Date();

  // First, create the blueprint (Exam)
  const exam = await prisma.exam.create({
    data: {
      title,
      durationMinutes,
      negativeMarkingEnabled: negativeMarking > 0,
      negativeMarksValue: negativeMarking,
      createdBySetterId: payload.userId as string,
      questions: {
        connect: selectedQuestionIds.map((id) => ({ id }))
      }
    }
  });

  // Then, schedule a live session from it
  await prisma.examSession.create({
    data: {
      examId: exam.id,
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
      userId: payload.userId as string,
      action: "SCHEDULE_EXAM",
      details: `Scheduled one-off exam: ${title}`,
    }
  });

  revalidatePath("/dashboard/owner");
  return { success: true };
}

export async function reviewQuestionAction(questionId: string, action: "APPROVE" | "REJECT") {
  const token = cookies().get("token")?.value;
  if (!token) return { error: "Unauthorized" };
  const payload = await verifyToken(token);
  if (!payload || payload.role !== "OWNER") return { error: "Unauthorized" };

  await prisma.question.update({
    where: { id: questionId },
    data: { status: action === "APPROVE" ? "APPROVED" : "REJECTED" }
  });

  await prisma.auditLog.create({
    data: {
      userId: payload.userId as string,
      action: "REVIEW_QUESTION",
      details: `${action} question ${questionId}`,
    }
  });

  revalidatePath("/dashboard/owner");
  return { success: true };
}

export async function approveAllQuestionsAction() {
  const token = cookies().get("token")?.value;
  if (!token) return { error: "Unauthorized" };
  const payload = await verifyToken(token);
  if (!payload || payload.role !== "OWNER") return { error: "Unauthorized" };

  await prisma.question.updateMany({
    where: { status: { in: ["SUBMITTED", "DRAFT"] } },
    data: { status: "APPROVED" }
  });

  revalidatePath("/dashboard/owner");
  revalidatePath("/dashboard/setter/bank");
  return { success: true };
}
