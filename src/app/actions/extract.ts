"use server";

import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import {
  analyzeQuestionWithAI,
  ParsedQuestionWithAI,
  FIXED_TOPICS,
  FIXED_DIFFICULTIES
} from "@/lib/ai-question-analyzer";
import { parseTextBlobToRawItems } from "@/lib/question-parser";
import { invalidateOwnerDashboardCache, invalidateQuestionBankCache } from "@/lib/dashboard-cache";
import { findDuplicateInQuestionList } from "@/lib/question-duplicate-checker";

async function getAuthorizedUser() {
  const auth = await requireAuth(["OWNER", "SETTER"]);
  if ("error" in auth) return null;
  return auth;
}

/**
 * Parses raw text, applies fixed taxonomy classification & generates AI quality feedback
 */
export async function parseAndAnalyzeTextBlobAction(
  textBlob: string,
  defaultCategory?: string
): Promise<{
  error?: string;
  questions?: ParsedQuestionWithAI[];
}> {
  const user = await getAuthorizedUser();
  if (!user) return { error: "Unauthorized. Please log in as an Author or Admin." };

  if (!textBlob || textBlob.trim().length === 0) {
    return { error: "Please enter text to extract questions from." };
  }

  const parsedItems = parseTextBlobToRawItems(textBlob);

  if (parsedItems.length === 0) {
    return {
      error: "No valid questions detected. Please ensure format includes question text and choices (e.g. Question 1:, A), B), C), D) and Answer: B)."
    };
  }

  let dbSubjectNames: string[] = [];
  try {
    const subjects = await prisma.subject.findMany({ select: { name: true } });
    dbSubjectNames = subjects.map(s => s.name);
  } catch (e) {
    console.error("Could not fetch db subjects for analyzer:", e);
  }

  const analyzedQuestions: ParsedQuestionWithAI[] = [];
  for (const item of parsedItems) {
    const categoryToUse = item.category || defaultCategory || undefined;
    const analyzed = await analyzeQuestionWithAI(
      item.stem,
      item.options,
      item.answerIndex,
      item.explanation,
      categoryToUse,
      dbSubjectNames
    );
    // Carry the raw parser's type detection through to the review list and save
    analyzed.qType = item.qType || "MCQ_SINGLE";
    analyzed.answerText = item.answerText;
    analyzed.tolerance = item.tolerance;
    analyzedQuestions.push(analyzed);
  }

  return { questions: analyzedQuestions };
}

/**
 * Real-time AI Quality Check for Manual Authoring
 */
export async function analyzeSingleQuestionAction(
  text: string,
  options: string[],
  correctIndex: number,
  customCategory?: string
): Promise<{ error?: string; analysis?: ParsedQuestionWithAI }> {
  const user = await getAuthorizedUser();
  if (!user) return { error: "Unauthorized" };

  if (!text || text.trim().length === 0) {
    return { error: "Please enter question text." };
  }

  const analysis = await analyzeQuestionWithAI(text, options, correctIndex, undefined, customCategory);
  return { analysis };
}

/**
 * Saves reviewed questions into the database
 */
export async function saveVerifiedQuestionsAction(
  questions: ParsedQuestionWithAI[],
  status: "DRAFT" | "SUBMITTED" = "SUBMITTED"
): Promise<{ error?: string; count?: number; skippedDuplicates?: number; approvedAsOwner?: boolean }> {
  const user = await getAuthorizedUser();
  if (!user) return { error: "Unauthorized" };

  if (!questions || questions.length === 0) {
    return { error: "No questions provided to save." };
  }

  let createdCount = 0;
  let skippedDuplicates = 0;

  // Owner-submitted content skips the review queue entirely: the owner IS the
  // reviewer, so forcing their own paste through SUBMITTED simply hides it
  // from template creation with no second reviewer to unblock it.
  const isOwner = user.user.role === "OWNER";
  const effectiveStatus = status === "SUBMITTED" && isOwner ? "APPROVED" : status;

  // Load the bank once (not per question) and screen with the same Jaccard
  // engine as the manual path — not just exact string equality.
  const bank = await prisma.question.findMany({
    select: { id: true, text: true, category: true },
  });

  for (const q of questions) {
    const catLower = (q.category || "").toLowerCase();
    const pool = catLower ? bank.filter((b) => b.category.toLowerCase() === catLower) : bank;
    const match = findDuplicateInQuestionList(q.text, pool);
    if (match.isDuplicate) {
      skippedDuplicates++;
      continue;
    }

    const formattedOptions = q.options.map((opt, idx) => ({
      text: opt.text,
      explanation: idx === q.correctAnswerIndex ? (q.draftExplanation || opt.explanation || null) : (opt.explanation || null),
      imageUrl: opt.imageUrl || null
    }));

    // Per-type answer payloads — mirrors the shapes the manual authoring path
    // writes (see setter.ts createQuestionAction) so the score engine reads
    // pasted questions identically.
    const qType = q.qType || "MCQ_SINGLE";
    let answerData: string;
    let optionPayload = formattedOptions;

    if (qType === "FILL_BLANK") {
      const accepted = (q.answerText || "").split(",").map(s => s.trim()).filter(Boolean);
      if (accepted.length === 0) { skippedDuplicates++; continue; }
      optionPayload = [];
      answerData = JSON.stringify({
        blanks: { "1": { accepted, points: 1, caseSensitive: false } },
        partialCredit: true
      });
    } else if (qType === "NUMERIC") {
      const exact = parseFloat(q.answerText || "");
      if (!Number.isFinite(exact)) { skippedDuplicates++; continue; }
      optionPayload = [];
      answerData = JSON.stringify({ exact, tolerance: q.tolerance ?? 0 });
    } else if (qType === "TRUE_FALSE") {
      answerData = JSON.stringify({
        correctAnswer: formattedOptions[q.correctAnswerIndex]?.text || formattedOptions[0]?.text
      });
    } else {
      answerData = JSON.stringify({
        correctAnswer: formattedOptions[q.correctAnswerIndex]?.text || formattedOptions[0]?.text
      });
    }

    // Ensure custom category exists in Subject table so it remains selectable across platform
    if (q.category && q.category.trim().length >= 2) {
      try {
        await prisma.subject.upsert({
          where: { name: q.category.trim() },
          update: {},
          create: { name: q.category.trim() }
        });
      } catch (e) {
        // ignore duplicate / race
      }
    }

    await prisma.question.create({
      data: {
        text: q.text,
        options: JSON.stringify(optionPayload),
        answerData,
        category: q.category,
        difficultyLevel: q.difficultyLevel,
        status: effectiveStatus,
        isExtracted: true,
        authorId: user.user.id,
        type: qType,
        points: 1.0,
        negativePoints: 0.0
      }
    });

    // The question added it to the bank; mirror it into the Subject table so
    // it stays selectable in SubjectSelector and grouped in bank tabs.
    if (q.category && q.category.trim().length >= 2) {
      await prisma.subject.upsert({
        where: { name: q.category.trim() },
        update: {},
        create: { name: q.category.trim() }
      }).catch(() => {});
    }

    createdCount++;
  }

  revalidatePath("/dashboard/setter");
  revalidatePath("/dashboard/setter/bank");
  revalidatePath("/dashboard/owner");
  revalidatePath("/dashboard/owner/templates");
  invalidateOwnerDashboardCache();
  invalidateQuestionBankCache();
  return { count: createdCount, skippedDuplicates, approvedAsOwner: effectiveStatus === "APPROVED" && createdCount > 0 };
}
