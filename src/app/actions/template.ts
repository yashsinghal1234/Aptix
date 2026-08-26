"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { verifyToken } from "@/lib/auth";
import { z } from "zod";

const templateSchema = z.object({
  title: z.string().min(3),
  description: z.string().optional(),
  instructions: z.string().optional(),
  subject: z.string().optional(),
  
  selectionMode: z.string(),
  randomizeQuestionOrder: z.boolean(),
  randomizeOptionOrder: z.boolean(),
  
  totalMarks: z.number().min(0),
  marksPerQuestion: z.number().min(0),
  negativeMarkingEnabled: z.boolean(),
  negativeMarksValue: z.number().min(0),
  partialCreditEnabled: z.boolean(),
  passCriteria: z.number().min(0).max(100),
  
  durationMinutes: z.number().min(1),
  defaultStartWindowHours: z.number().nullable(),
  
  allowQuestionSkip: z.boolean(),
  allowAnswerReview: z.boolean(),
  allowBackNavigation: z.boolean(),
  maxAttempts: z.number().min(1),
  questionDisplayMode: z.string(),
  
  resultVisibility: z.string(),
  showCorrectAnswers: z.boolean(),
  showExplanation: z.boolean(),
  
  requireFullscreen: z.boolean(),
  disableCopyPaste: z.boolean(),
  tabSwitchLimit: z.number().nullable(),
  webcamRequired: z.boolean()
});

export async function createTemplateAction(formData: FormData, selectedQuestionIds: string[], rules: { category: string, difficultyLevel: string, count: number }[]) {
  const token = cookies().get("token")?.value;
  if (!token) return { error: "Unauthorized" };
  const payload = await verifyToken(token);
  if (!payload || payload.role !== "OWNER") return { error: "Unauthorized" };

  const parsed = templateSchema.safeParse({
    title: formData.get("title"),
    description: formData.get("description") || undefined,
    instructions: formData.get("instructions") || undefined,
    subject: formData.get("subject") || undefined,
    
    selectionMode: formData.get("selectionMode") || "MANUAL",
    randomizeQuestionOrder: formData.get("randomizeQuestionOrder") === "on",
    randomizeOptionOrder: formData.get("randomizeOptionOrder") === "on",
    
    totalMarks: parseFloat(formData.get("totalMarks") as string) || 0,
    marksPerQuestion: parseFloat(formData.get("marksPerQuestion") as string) || 1,
    negativeMarkingEnabled: formData.get("negativeMarkingEnabled") === "on",
    negativeMarksValue: parseFloat(formData.get("negativeMarksValue") as string) || 0,
    partialCreditEnabled: formData.get("partialCreditEnabled") === "on",
    passCriteria: parseFloat(formData.get("passCriteria") as string) || 50,
    
    durationMinutes: parseInt(formData.get("durationMinutes") as string, 10),
    defaultStartWindowHours: formData.get("defaultStartWindowHours") ? parseInt(formData.get("defaultStartWindowHours") as string, 10) : null,
    
    allowQuestionSkip: formData.get("allowQuestionSkip") === "on",
    allowAnswerReview: formData.get("allowAnswerReview") === "on",
    allowBackNavigation: formData.get("allowBackNavigation") === "on",
    maxAttempts: parseInt(formData.get("maxAttempts") as string, 10) || 1,
    questionDisplayMode: formData.get("questionDisplayMode") || "ONE_AT_A_TIME",
    
    resultVisibility: formData.get("resultVisibility") || "IMMEDIATE",
    showCorrectAnswers: formData.get("showCorrectAnswers") === "on",
    showExplanation: formData.get("showExplanation") === "on",
    
    requireFullscreen: formData.get("requireFullscreen") === "on",
    disableCopyPaste: formData.get("disableCopyPaste") === "on",
    tabSwitchLimit: formData.get("tabSwitchLimit") ? parseInt(formData.get("tabSwitchLimit") as string, 10) : null,
    webcamRequired: formData.get("webcamRequired") === "on"
  });

  if (!parsed.success) {
    return { error: "Invalid input. Please check the fields." };
  }
  
  if (selectedQuestionIds.length === 0 && rules.length === 0) {
    return { error: "You must select at least one fixed question or add at least one auto-pick rule." };
  }

  const data = parsed.data;

  if (data.totalMarks === 0) {
    const qCount = data.selectionMode === "MANUAL" 
      ? selectedQuestionIds.length 
      : rules.reduce((acc, r) => acc + r.count, 0);
    data.totalMarks = qCount * data.marksPerQuestion;
  }

  const template = await prisma.exam.create({
    data: {
      ...data,
      createdBySetterId: payload.userId as string,
      questions: {
        connect: selectedQuestionIds.map((id) => ({ id }))
      },
      rules: {
        create: rules.map(r => ({
          category: r.category,
          difficultyLevel: r.difficultyLevel,
          count: r.count
        }))
      }
    }
  });

  await prisma.auditLog.create({
    data: {
      userId: payload.userId as string,
      action: "CREATE_TEMPLATE",
      details: `Created exam template: ${data.title}`,
    }
  });

  revalidatePath("/dashboard/owner");
  return { success: true };
}

export async function deleteTemplateAction(id: string) {
  const token = cookies().get("token")?.value;
  if (!token) return { error: "Unauthorized" };
  const payload = await verifyToken(token);
  if (!payload || payload.role !== "OWNER") return { error: "Unauthorized" };

  try {
    // Soft delete the template
    await prisma.exam.update({
      where: { id },
      data: { isDeleted: true }
    });

    await prisma.auditLog.create({
      data: {
        userId: payload.userId as string,
        action: "DELETE_TEMPLATE",
        details: `Deleted exam template ID: ${id}`,
      }
    });

    revalidatePath("/dashboard/owner");
    return { success: true };
  } catch (error) {
    console.error("Failed to delete template:", error);
    return { error: "Failed to delete template. Make sure there are no active sessions using it." };
  }
}

