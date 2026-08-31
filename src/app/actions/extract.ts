"use server";

import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { verifyToken } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import {
  analyzeQuestionWithAI,
  ParsedQuestionWithAI,
  FIXED_TOPICS,
  FIXED_DIFFICULTIES
} from "@/lib/ai-question-analyzer";
import { parseTextBlobToRawItems } from "@/lib/question-parser";

async function getAuthorizedUser() {
  const token = cookies().get("token")?.value;
  if (!token) return null;
  const payload = await verifyToken(token);
  if (!payload || (payload.role !== "SETTER" && payload.role !== "OWNER")) return null;
  return payload;
}

/**
 * Parses raw text, applies fixed taxonomy classification & generates AI quality feedback
 */
export async function parseAndAnalyzeTextBlobAction(textBlob: string): Promise<{
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

  const analyzedQuestions: ParsedQuestionWithAI[] = [];
  for (const item of parsedItems) {
    const analyzed = await analyzeQuestionWithAI(item.stem, item.options, item.answerIndex, item.explanation);
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
  correctIndex: number
): Promise<{ error?: string; analysis?: ParsedQuestionWithAI }> {
  const user = await getAuthorizedUser();
  if (!user) return { error: "Unauthorized" };

  if (!text || text.trim().length === 0) {
    return { error: "Please enter question text." };
  }

  const analysis = await analyzeQuestionWithAI(text, options, correctIndex);
  return { analysis };
}

/**
 * Saves reviewed questions into the database
 */
export async function saveVerifiedQuestionsAction(
  questions: ParsedQuestionWithAI[],
  status: "DRAFT" | "SUBMITTED" = "SUBMITTED"
): Promise<{ error?: string; count?: number }> {
  const user = await getAuthorizedUser();
  if (!user) return { error: "Unauthorized" };

  if (!questions || questions.length === 0) {
    return { error: "No questions provided to save." };
  }

  let createdCount = 0;

  for (const q of questions) {
    const formattedOptions = q.options.map((opt, idx) => ({
      text: opt.text,
      explanation: idx === q.correctAnswerIndex ? (q.draftExplanation || opt.explanation || null) : (opt.explanation || null),
      imageUrl: opt.imageUrl || null
    }));

    const correctText = formattedOptions[q.correctAnswerIndex]?.text || formattedOptions[0]?.text;

    await prisma.question.create({
      data: {
        text: q.text,
        options: JSON.stringify(formattedOptions),
        answerData: JSON.stringify({ correctAnswer: correctText }),
        category: q.category,
        difficultyLevel: q.difficultyLevel,
        status: status,
        isExtracted: true,
        authorId: user.userId as string,
        type: "MCQ_SINGLE",
        points: q.difficultyLevel === "HARD" ? 2.0 : 1.0,
        negativePoints: 0.0
      }
    });

    createdCount++;
  }

  revalidatePath("/dashboard/setter");
  revalidatePath("/dashboard/setter/bank");
  revalidatePath("/dashboard/owner");
  return { count: createdCount };
}
