"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { verifyToken } from "@/lib/auth";
import { z } from "zod";

import { uploadImageAction } from "@/app/actions/upload";

const optionSchema = z.object({
  text: z.string(),
  explanation: z.string().nullable().optional(),
  imageUrl: z.string().nullable().optional()
});

const questionSchema = z.object({
  text: z.string().optional().default(""),
  category: z.string().min(2),
  difficultyLevel: z.enum(["EASY", "MEDIUM", "HARD"]),
  imageUrl: z.string().nullable().optional(),
  isDraft: z.boolean().default(false)
});

async function getAuthorizedUser() {
  const token = cookies().get("token")?.value;
  if (!token) return null;
  const payload = await verifyToken(token);
  if (!payload || (payload.role !== "OWNER" && payload.role !== "SETTER")) return null;
  return payload;
}

export async function createQuestionAction(formData: FormData) {
  const user = await getAuthorizedUser();
  if (!user) return { error: "Unauthorized" };

  const qType = (formData.get("qType") as string) || "MCQ_SINGLE";

  const options: { text: string; explanation: string | null; imageUrl: string | null }[] = [];
  if (qType === "MCQ_SINGLE" || qType === "MCQ_MULTI") {
    for (let i = 0; i < 4; i++) {
      const text = formData.get(`option${i}`) as string;
      const explanation = formData.get(`explanation${i}`) as string || null;
      const imgFile = formData.get(`optionImage${i}`) as File;
      let optImageUrl = null;
      
      if (imgFile && imgFile.size > 0) {
        const imgData = new FormData();
        imgData.append("image", imgFile);
        const res = await uploadImageAction(imgData);
        if (res.url) optImageUrl = res.url;
      }
      options.push({ text, explanation, imageUrl: optImageUrl });
    }
  } else if (qType === "TRUE_FALSE") {
    options.push({ text: "True", explanation: null, imageUrl: null });
    options.push({ text: "False", explanation: null, imageUrl: null });
  }

  const rawText = ((formData.get("text") as string) || "").trim();
  const imageUrl = (formData.get("imageUrl") as string) || null;

  if (!rawText && !imageUrl) {
    return { error: "Please enter question text or attach a question image/diagram." };
  }

  const textToSave = rawText || "Refer to the image attachment above.";

  const parsed = questionSchema.safeParse({
    text: textToSave,
    category: formData.get("category"),
    difficultyLevel: formData.get("difficultyLevel") || "MEDIUM",
    imageUrl: imageUrl,
    isDraft: formData.get("actionType") === "draft"
  });

  if (!parsed.success) {
    return { error: "Invalid input fields." };
  }

  const { text, category, difficultyLevel, isDraft } = parsed.data;
  const points = parseFloat((formData.get("points") as string) || "1.0");
  const negativePoints = parseFloat((formData.get("negativePoints") as string) || "0.0");

  let answerData = "{}";
  
  if (qType === "MCQ_SINGLE" || qType === "TRUE_FALSE") {
    const correctAnswerIndex = parseInt(formData.get("correctAnswer") as string, 10);
    answerData = JSON.stringify({ correctAnswer: options[correctAnswerIndex].text });
  } else if (qType === "MCQ_MULTI") {
    const multiCorrect = JSON.parse(formData.get("multiCorrect") as string);
    const correctAnswers = multiCorrect.map((i: number) => options[i].text);
    answerData = JSON.stringify({ correctAnswers });
  } else if (qType === "NUMERIC") {
    const exact = parseFloat(formData.get("numericExact") as string);
    const tolerance = parseFloat(formData.get("numericTolerance") as string);
    answerData = JSON.stringify({ exact, tolerance });
  } else if (qType === "FILL_BLANK") {
    const blanksRaw = JSON.parse(formData.get("blanksData") as string);
    const partialCredit = JSON.parse(formData.get("partialCredit") as string);
    const blanksObj: any = {};
    for (const b of blanksRaw) {
      blanksObj[b.id] = {
        accepted: b.accepted.split(",").map((s: string) => s.trim()),
        points: b.points,
        caseSensitive: b.caseSensitive
      };
    }
    answerData = JSON.stringify({ blanks: blanksObj, partialCredit });
  }

  // Intelligent Duplicate & Similarity Detection
  if (rawText.length > 0) {
    const { findDuplicateInQuestionList } = await import("@/lib/question-duplicate-checker");
    const existingQuestions = await prisma.question.findMany({
      where: { category },
      select: { id: true, text: true }
    });

    const match = findDuplicateInQuestionList(text, existingQuestions);
    if (match.isDuplicate) {
      if (match.isExact) {
        return { error: "Exact duplicate question already exists in this category." };
      } else {
        return { 
          error: `High-similarity duplicate question detected (${Math.round(match.similarity * 100)}% match with: "${match.matchedStem?.substring(0, 80)}...").` 
        };
      }
    }
  }

  await prisma.question.create({
    data: {
      text,
      imageUrl,
      options: JSON.stringify(options),
      answerData,
      category,
      difficultyLevel,
      status: isDraft ? "DRAFT" : "SUBMITTED",
      authorId: user.userId as string,
      type: qType,
      points,
      negativePoints
    }
  });

  revalidatePath("/dashboard/setter");
  revalidatePath("/dashboard/setter/bank");
  return { success: true };
}

export async function deleteQuestionAction(id: string) {
  const user = await getAuthorizedUser();
  if (!user) return { error: "Unauthorized" };

  try {
    // Question Bank Integrity Lock: Prevent deleting questions attached to active or completed sessions
    const attachedSession = await prisma.examSession.findFirst({
      where: {
        questions: { some: { id } },
        status: { in: ["LIVE", "COMPLETED"] }
      },
      include: { exam: { select: { title: true } } }
    });

    if (attachedSession) {
      return {
        error: `Cannot delete locked question: It is bound to an active or completed assessment session ("${attachedSession.exam?.title || attachedSession.id}"). Deletion is blocked to preserve scoring records.`
      };
    }

    await prisma.candidateResponse.deleteMany({
      where: { questionId: id }
    });

    await prisma.question.delete({
      where: { id }
    });

    revalidatePath("/dashboard/setter");
    revalidatePath("/dashboard/setter/bank");
    return { success: true };
  } catch (error: any) {
    console.error("Failed to delete question:", error);
    return { error: error.message || "Failed to delete question" };
  }
}
