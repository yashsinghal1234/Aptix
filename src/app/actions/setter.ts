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
  text: z.string().min(1),
  category: z.string().min(2),
  difficultyLevel: z.enum(["EASY", "MEDIUM", "HARD"]),
  imageUrl: z.string().nullable(),
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

  const options = [];
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

  const parsed = questionSchema.safeParse({
    text: formData.get("text"),
    category: formData.get("category"),
    difficultyLevel: formData.get("difficultyLevel") || "MEDIUM",
    imageUrl: formData.get("imageUrl") || null,
    isDraft: formData.get("actionType") === "draft"
  });

  if (!parsed.success) {
    return { error: "Invalid input fields." };
  }

  const { text, category, difficultyLevel, imageUrl, isDraft } = parsed.data;
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

  // Duplicate detection
  const duplicate = await prisma.question.findFirst({
    where: { text: { equals: text } }
  });

  if (duplicate) {
    return { error: "A question with exactly the same text already exists." };
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
    await prisma.candidateResponse.deleteMany({
      where: { questionId: id }
    });

    await prisma.question.delete({
      where: { id }
    });

    revalidatePath("/dashboard/setter");
    return { success: true };
  } catch (error) {
    console.error(error);
    return { error: "Failed to delete question" };
  }
}
