"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { requireAuth } from "@/lib/auth";
import { z } from "zod";

import { uploadImageAction } from "@/app/actions/upload";
import { invalidateOwnerDashboardCache, invalidateQuestionBankCache } from "@/lib/dashboard-cache";

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
  const auth = await requireAuth(["OWNER", "SETTER"]);
  if ("error" in auth) return null;
  return { id: auth.user.id, userId: auth.user.id, role: auth.user.role };
}

/** Lightweight pre-save duplicate signal (same non-AI Jaccard engine as submit-time enforcement). */
export async function checkDuplicateAction(stem: string, category: string) {
  const user = await getAuthorizedUser();
  if (!user) return { error: "Unauthorized" };
  const text = (stem || "").trim();
  if (text.length < 10) return { match: null, short: true };
  const { findDuplicateInQuestionList } = await import("@/lib/question-duplicate-checker");
  const existing = await prisma.question.findMany({
    where: category ? { category: { equals: category, mode: "insensitive" } } : {},
    select: { id: true, text: true },
  });
  const match = findDuplicateInQuestionList(text, existing);
  if (!match.isDuplicate) return { match: null };
  return {
    match: {
      similarity: Math.round(match.similarity * 100),
      isExact: match.isExact,
      matchedId: match.matchedId || null,
      matchedStem: (match.matchedStem || "").substring(0, 120),
    },
  };
}

/** Batch pre-save duplicate signals for CSV/paste imports (one bank read, many stems). */
export async function checkDuplicatesAction(stems: string[]) {
  const user = await getAuthorizedUser();
  if (!user) return { error: "Unauthorized" };
  const { findDuplicateInQuestionList } = await import("@/lib/question-duplicate-checker");
  const existing = await prisma.question.findMany({ select: { id: true, text: true } });
  return {
    matches: stems.map((stem) => {
      const text = (stem || "").trim();
      if (text.length < 10) return null;
      const match = findDuplicateInQuestionList(text, existing);
      if (!match.isDuplicate) return null;
      return {
        similarity: Math.round(match.similarity * 100),
        isExact: match.isExact,
        matchedId: match.matchedId || null,
        matchedStem: (match.matchedStem || "").substring(0, 120),
      };
    }),
  };
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

  // NaN guards: a cleared points input used to become NaN, which Prisma
  // rejects as a server crash leaving the form spinner hanging forever.
  const pointsRaw = parseFloat((formData.get("points") as string) || "");
  const negRaw = parseFloat((formData.get("negativePoints") as string) || "");
  const points = Number.isFinite(pointsRaw) && pointsRaw > 0 ? pointsRaw : 1.0;
  const negativePoints = Number.isFinite(negRaw) && negRaw >= 0 ? negRaw : 0.0;

  let answerData = "{}";

  // Answer-integrity: every question must be answerable by a candidate.
  // This previously allowed empty multi-correct sets and blank answers,
  // producing questions that could never be scored correctly.
  let correctAnswerIndex: number | null = null;
  if (qType === "MCQ_SINGLE" || qType === "TRUE_FALSE") {
    correctAnswerIndex = parseInt(formData.get("correctAnswer") as string, 10);
    if (!Number.isInteger(correctAnswerIndex) || correctAnswerIndex < 0 || correctAnswerIndex >= options.length) {
      return { error: "Select which option is correct before saving." };
    }
  }

  if (qType === "MCQ_SINGLE" || qType === "TRUE_FALSE") {
    answerData = JSON.stringify({ correctAnswer: options[correctAnswerIndex as number].text });
  } else if (qType === "MCQ_MULTI") {
    let multiCorrect: number[];
    try {
      multiCorrect = JSON.parse(formData.get("multiCorrect") as string);
    } catch {
      return { error: "Invalid answer data for multi-correct question. Please re-select your answers." };
    }
    if (!Array.isArray(multiCorrect)) multiCorrect = [];
    if (multiCorrect.length === 0) {
      return { error: "Multiple-correct question: tick at least one correct option before saving." };
    }
    if (multiCorrect.some((i) => !Number.isInteger(i) || i < 0 || i >= options.length)) {
      return { error: "The ticked answers are out of range. Please re-select your answers." };
    }
    const correctAnswers = multiCorrect.map((i: number) => options[i].text);
    answerData = JSON.stringify({ correctAnswers });
  } else if (qType === "NUMERIC") {
    const exact = parseFloat(formData.get("numericExact") as string);
    const tolerance = parseFloat(formData.get("numericTolerance") as string);
    if (!Number.isFinite(exact)) {
      return { error: "Numeric question needs an exact target answer." };
    }
    answerData = JSON.stringify({ exact, tolerance: Number.isFinite(tolerance) ? tolerance : 0 });
  } else if (qType === "FILL_BLANK") {
    let blanksRaw: { id: string; accepted: string; points: number; caseSensitive: boolean }[];
    let partialCredit: boolean;
    try {
      blanksRaw = JSON.parse(formData.get("blanksData") as string);
      partialCredit = JSON.parse(formData.get("partialCredit") as string);
    } catch {
      return { error: "Invalid blank answer data. Please re-enter the blank answers." };
    }
    if (!Array.isArray(blanksRaw) || blanksRaw.length === 0) {
      return { error: "Fill-blank question needs at least one blank with accepted answers." };
    }
    const blanksObj: any = {};
    for (const b of blanksRaw) {
      const accepted = (b.accepted || "")
        .split(",")
        .map((s: string) => s.trim())
        .filter(Boolean);
      if (accepted.length === 0) {
        return { error: `Blank [${b.id}] has no accepted answers. Type at least one accepted answer for every blank.` };
      }
      blanksObj[b.id] = {
        accepted,
        points: Number.isFinite(b.points) ? b.points : 1,
        caseSensitive: b.caseSensitive
      };
    }
    answerData = JSON.stringify({ blanks: blanksObj, partialCredit });
  }

  // Intelligent Duplicate & Similarity Detection
  // - Stems are screened with the shared Jaccard engine inside a
  //   case-insensitive category scope (subject identity is case-insensitive).
  // - Image-only questions previously bypassed dedup and all shared the
  //   literal fallback stem; they are deduped on the image source instead.
  if (rawText.length > 0) {
    const { findDuplicateInQuestionList } = await import("@/lib/question-duplicate-checker");
    const existingQuestions = await prisma.question.findMany({
      where: { category: { equals: category, mode: "insensitive" } },
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
  } else if (imageUrl) {
    const imageDuplicate = await prisma.question.findFirst({
      where: { imageUrl },
      select: { id: true }
    });
    if (imageDuplicate) {
      return { error: "A question with this exact image attachment already exists in the bank." };
    }
  }

  const isOwner = user.role === "OWNER";
  await prisma.question.create({
    data: {
      text,
      imageUrl,
      options: JSON.stringify(options),
      answerData,
      category,
      difficultyLevel,
      status: isDraft ? "DRAFT" : isOwner ? "APPROVED" : "SUBMITTED",
      authorId: user.userId as string,
      type: qType,
      points,
      negativePoints
    }
  });

  // Mirror the question's subject into the Subject table so it stays
  // selectable in SubjectSelector and grouped under its bank tab — CSV and
  // free-text categories previously landed permanently in UNASSIGNED.
  if (category.trim().length >= 2) {
    await prisma.subject.upsert({
      where: { name: category.trim() },
      update: {},
      create: { name: category.trim() }
    }).catch(() => {});
  }

  revalidatePath("/dashboard/setter");
  revalidatePath("/dashboard/setter/bank");
  revalidatePath("/dashboard/owner");
  revalidatePath("/dashboard/owner/template/new");
  revalidatePath("/dashboard/owner/templates");
  invalidateOwnerDashboardCache();
  invalidateQuestionBankCache();
  return { success: true };
}

/* =======================================================================
 * QUICK GRID — bulk typed authoring (CodeTantra-style spreadsheet rows)
 * ===================================================================== */
export interface QuickGridRowInput {
  stem: string;
  options: [string, string, string, string];
  key: string;
  qType: string;
  category: string;
  difficulty?: string;
  points?: number;
  negativePoints?: number;
}

/**
 * Saves an entire Quick-Grid batch in ONE server round-trip (the CSV importer
 * previously paid one request per row). Rows failing validation abort the
 * batch with a row-numbered error; duplicates are skipped silently and
 * reported, and distinct categories get Subject rows for selector parity.
 */
export async function saveQuickGridQuestionsAction(
  rows: QuickGridRowInput[],
  asDraft = true
): Promise<{ error?: string; count?: number; skippedDuplicates?: number; approvedAsOwner?: boolean }> {
  const user = await getAuthorizedUser();
  if (!user) return { error: "Unauthorized" };

  if (!Array.isArray(rows) || rows.length === 0) {
    return { error: "The grid is empty — add at least one row." };
  }
  if (rows.length > 100) {
    return { error: "Quick-Grid saves up to 100 rows per batch. Split larger batches." };
  }

  const { buildAnswerData, canonicalQType, toCorrectIndex } = await import("@/lib/question-import");
  const { findDuplicateInQuestionList } = await import("@/lib/question-duplicate-checker");
  const isOwner = user.role === "OWNER";

  const bank = await prisma.question.findMany({ select: { id: true, text: true, category: true } });

  const data: any[] = [];
  const touchedCategories: string[] = [];
  let skippedDuplicates = 0;

  for (let i = 0; i < rows.length; i++) {
    const r = rows[i];
    const stem = (r.stem || "").trim();
    const category = (r.category || "").trim();
    const qType = canonicalQType(r.qType);

    if (stem.length < 5) return { error: `Row ${i + 1}: question stem is missing or too short.` };
    if (category.length < 2) return { error: `Row ${i + 1}: subject/category needs at least 2 characters.` };

    const rawOptions = (r.options || []).map((o) => (o || "").trim());
    let optionsPayload: string[] = [];
    let answerData: string;

    if (qType === "MCQ_SINGLE" || qType === "MCQ_MULTI") {
      if (rawOptions.some((o) => !o)) {
        return { error: `Row ${i + 1}: all four options must be filled for ${qType === "MCQ_MULTI" ? "multi-correct" : "single-choice"} rows.` };
      }
      optionsPayload = rawOptions;
      const keyRes = buildAnswerData(qType, r.key, rawOptions);
      if ("error" in keyRes) return { error: `Row ${i + 1}: ${keyRes.error}.` };
      answerData = keyRes.answerData;
    } else if (qType === "TRUE_FALSE") {
      const tIdx = toCorrectIndex(r.key);
      const lowered = (r.key || "").trim().toLowerCase();
      const idx = tIdx !== null && tIdx <= 1 ? tIdx : lowered.startsWith("t") || lowered.startsWith("y") ? 0 : lowered.startsWith("f") || lowered.startsWith("n") ? 1 : null;
      if (idx === null) return { error: `Row ${i + 1}: True/False key must be True/False (T/F works too).` };
      optionsPayload = ["True", "False"];
      answerData = JSON.stringify({ correctAnswer: optionsPayload[idx] });
    } else {
      const keyRes = buildAnswerData(qType, r.key, []);
      if ("error" in keyRes) return { error: `Row ${i + 1}: ${keyRes.error}.` };
      answerData = keyRes.answerData;
    }

    // Duplicate screening on the same Jaccard engine as the manual path
    const catLower = category.toLowerCase();
    const pool = bank.filter((b) => b.category.toLowerCase() === catLower);
    const dup = findDuplicateInQuestionList(stem, pool);
    if (dup.isDuplicate) {
      skippedDuplicates++;
      continue;
    }

    const pointsRaw = Number(r.points);
    const negRaw = Number(r.negativePoints);
    data.push({
      text: stem,
      options: JSON.stringify(optionsPayload),
      answerData,
      category,
      difficultyLevel: ["EASY", "MEDIUM", "HARD"].includes((r.difficulty || "").toUpperCase()) ? (r.difficulty as string).toUpperCase() : "MEDIUM",
      status: asDraft ? "DRAFT" : isOwner ? "APPROVED" : "SUBMITTED",
      authorId: user.userId as string,
      type: qType,
      points: Number.isFinite(pointsRaw) && pointsRaw > 0 ? pointsRaw : 1.0,
      negativePoints: Number.isFinite(negRaw) && negRaw >= 0 ? negRaw : 0.0,
    });
    touchedCategories.push(category);
  }

  if (data.length > 0) {
    await prisma.question.createMany({ data });
  }

  // Mirror distinct subjects so they stay selectable everywhere
  for (const category of Array.from(new Set(touchedCategories))) {
    await prisma.subject.upsert({
      where: { name: category },
      update: {},
      create: { name: category },
    }).catch(() => {});
  }

  revalidatePath("/dashboard/setter");
  revalidatePath("/dashboard/setter/bank");
  revalidatePath("/dashboard/owner");
  revalidatePath("/dashboard/owner/template/new");
  revalidatePath("/dashboard/owner/templates");
  invalidateOwnerDashboardCache();
  invalidateQuestionBankCache();

  return {
    count: data.length,
    skippedDuplicates,
    approvedAsOwner: !asDraft && isOwner && data.length > 0,
  };
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

    // Ownership check: Only the author of the question or an OWNER can delete it
    const existingQ = await prisma.question.findUnique({
      where: { id },
      select: { authorId: true }
    });

    if (!existingQ) {
      return { error: "Question not found" };
    }

    if (user.role !== "OWNER" && existingQ.authorId !== user.id) {
      return { error: "Forbidden: You can only delete questions that you authored." };
    }

    await prisma.candidateResponse.deleteMany({
      where: { questionId: id }
    });

    await prisma.question.delete({
      where: { id }
    });

    revalidatePath("/dashboard/setter");
    revalidatePath("/dashboard/setter/bank");
    invalidateOwnerDashboardCache();
    invalidateQuestionBankCache();
    return { success: true };
  } catch (error: any) {
    console.error("Failed to delete question:", error);
    return { error: error.message || "Failed to delete question" };
  }
}
