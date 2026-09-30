"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { verifyToken } from "@/lib/auth";
import { invalidateOwnerDashboardCache } from "@/lib/dashboard-cache";
import { z } from "zod";

const templateSchema = z.object({
  title: z.string().min(3),
  description: z.string().optional(),
  instructions: z.string().optional(),
  subject: z.string().optional(),
  allowedEmailDomain: z.string().nullable().optional(),
  
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

  const rawTitle = (formData.get("title") as string)?.trim() || "";
  const title = rawTitle ? rawTitle.charAt(0).toUpperCase() + rawTitle.slice(1) : "";

  const parsed = templateSchema.safeParse({
    title,
    description: formData.get("description") || undefined,
    instructions: formData.get("instructions") || undefined,
    subject: formData.get("subject") || undefined,
    allowedEmailDomain: (formData.get("allowedEmailDomain") as string)?.trim() || null,
    
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

  invalidateOwnerDashboardCache();
  revalidatePath("/dashboard/owner");
  return { success: true, templateId: template.id };
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

    invalidateOwnerDashboardCache();
    revalidatePath("/dashboard/owner");
    return { success: true };
  } catch (error) {
    console.error("Failed to delete template:", error);
    return { error: "Failed to delete template. Make sure there are no active sessions using it." };
  }
}

export async function duplicateTemplateAction(id: string) {
  const token = cookies().get("token")?.value;
  if (!token) return { error: "Unauthorized" };
  const payload = await verifyToken(token);
  if (!payload || payload.role !== "OWNER") return { error: "Unauthorized" };

  try {
    const existing = await prisma.exam.findUnique({
      where: { id },
      include: {
        questions: true,
        rules: true
      }
    });

    if (!existing) return { error: "Template not found" };

    const newTemplate = await prisma.exam.create({
      data: {
        title: `${existing.title} (Copy)`,
        description: existing.description,
        instructions: existing.instructions,
        subject: existing.subject,
        allowedEmailDomain: existing.allowedEmailDomain,
        createdBySetterId: existing.createdBySetterId || (payload.userId as string),
        selectionMode: existing.selectionMode,
        randomizeQuestionOrder: existing.randomizeQuestionOrder,
        randomizeOptionOrder: existing.randomizeOptionOrder,
        totalMarks: existing.totalMarks,
        marksPerQuestion: existing.marksPerQuestion,
        negativeMarkingEnabled: existing.negativeMarkingEnabled,
        negativeMarksValue: existing.negativeMarksValue,
        partialCreditEnabled: existing.partialCreditEnabled,
        passCriteria: existing.passCriteria,
        durationMinutes: existing.durationMinutes,
        defaultStartWindowHours: existing.defaultStartWindowHours,
        allowQuestionSkip: existing.allowQuestionSkip,
        allowAnswerReview: existing.allowAnswerReview,
        allowBackNavigation: existing.allowBackNavigation,
        maxAttempts: existing.maxAttempts,
        questionDisplayMode: existing.questionDisplayMode,
        resultVisibility: existing.resultVisibility,
        showCorrectAnswers: existing.showCorrectAnswers,
        showExplanation: existing.showExplanation,
        requireFullscreen: existing.requireFullscreen,
        disableCopyPaste: existing.disableCopyPaste,
        tabSwitchLimit: existing.tabSwitchLimit,
        webcamRequired: existing.webcamRequired,
        questions: {
          connect: existing.questions.map(q => ({ id: q.id }))
        },
        rules: {
          create: existing.rules.map(r => ({
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
        action: "DUPLICATE_TEMPLATE",
        details: `Duplicated template "${existing.title}" -> "${newTemplate.title}"`,
      }
    });

    invalidateOwnerDashboardCache();
    revalidatePath("/dashboard/owner");
    return { success: true, newTemplateId: newTemplate.id };
  } catch (error: any) {
    console.error("Failed to duplicate template:", error);
    return { error: error.message || "Failed to clone template" };
  }
}

export async function updateTemplateAction(formData: FormData) {
  const token = cookies().get("token")?.value;
  if (!token) return { error: "Unauthorized" };
  const payload = await verifyToken(token);
  if (!payload || payload.role !== "OWNER") return { error: "Unauthorized" };

  const id = formData.get("id") as string;
  if (!id) return { error: "Template ID is required" };

  try {
    const rawTitle = (formData.get("title") as string)?.trim();
    const title = rawTitle ? rawTitle.charAt(0).toUpperCase() + rawTitle.slice(1) : undefined;
    const instructions = formData.get("instructions") !== null ? (formData.get("instructions") as string) : undefined;
    const description = formData.get("description") !== null ? (formData.get("description") as string) : undefined;
    const durationMinutes = formData.get("durationMinutes") ? parseInt(formData.get("durationMinutes") as string, 10) : undefined;
    const passCriteria = formData.get("passCriteria") ? parseFloat(formData.get("passCriteria") as string) : undefined;
    const totalMarks = formData.get("totalMarks") ? parseFloat(formData.get("totalMarks") as string) : undefined;
    const allowedEmailDomain = formData.get("allowedEmailDomain") !== null 
      ? ((formData.get("allowedEmailDomain") as string)?.trim() || null) 
      : undefined;

    const negativeMarkingEnabled = formData.get("negativeMarkingEnabled") !== null 
      ? formData.get("negativeMarkingEnabled") === "true" || formData.get("negativeMarkingEnabled") === "on"
      : undefined;
    const negativeMarksValue = formData.get("negativeMarksValue") ? parseFloat(formData.get("negativeMarksValue") as string) : undefined;
    const requireFullscreen = formData.get("requireFullscreen") !== null
      ? formData.get("requireFullscreen") === "true" || formData.get("requireFullscreen") === "on"
      : undefined;
    const disableCopyPaste = formData.get("disableCopyPaste") !== null
      ? formData.get("disableCopyPaste") === "true" || formData.get("disableCopyPaste") === "on"
      : undefined;
    const webcamRequired = formData.get("webcamRequired") !== null
      ? formData.get("webcamRequired") === "true" || formData.get("webcamRequired") === "on"
      : undefined;
    const tabSwitchLimit = formData.get("tabSwitchLimit") !== null
      ? (formData.get("tabSwitchLimit") ? parseInt(formData.get("tabSwitchLimit") as string, 10) : null)
      : undefined;

    const updated = await prisma.exam.update({
      where: { id },
      data: {
        ...(title !== undefined && { title }),
        ...(instructions !== undefined && { instructions }),
        ...(description !== undefined && { description }),
        ...(durationMinutes !== undefined && !isNaN(durationMinutes) && { durationMinutes }),
        ...(passCriteria !== undefined && !isNaN(passCriteria) && { passCriteria }),
        ...(totalMarks !== undefined && !isNaN(totalMarks) && { totalMarks }),
        ...(allowedEmailDomain !== undefined && { allowedEmailDomain }),
        ...(negativeMarkingEnabled !== undefined && { negativeMarkingEnabled }),
        ...(negativeMarksValue !== undefined && !isNaN(negativeMarksValue) && { negativeMarksValue }),
        ...(requireFullscreen !== undefined && { requireFullscreen }),
        ...(disableCopyPaste !== undefined && { disableCopyPaste }),
        ...(webcamRequired !== undefined && { webcamRequired }),
        ...(tabSwitchLimit !== undefined && { tabSwitchLimit })
      }
    });

    await prisma.auditLog.create({
      data: {
        userId: payload.userId as string,
        action: "UPDATE_TEMPLATE",
        details: `Updated exam template "${updated.title}" (ID: ${id})`,
      }
    });

    revalidatePath("/dashboard/owner");
    return { success: true, template: updated };
  } catch (error: any) {
    console.error("Failed to update template:", error);
    return { error: error.message || "Failed to update template" };
  }
}


