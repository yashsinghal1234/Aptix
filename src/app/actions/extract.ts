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

  const rawBlocks = textBlob.split(/(?=Q:|\n\d+\.|\n\d+\))/i).map(b => b.trim()).filter(b => b.length > 0);
  const parsedItems: { stem: string; options: string[]; answerIndex: number }[] = [];

  for (const block of rawBlocks) {
    const lines = block.split("\n").map(l => l.trim()).filter(l => l.length > 0);
    let stem = "";
    const options: string[] = [];
    let answerIndex = 0;

    for (const line of lines) {
      if (/^(Q:|Q\d+:|\d+\.|\d+\))/i.test(line)) {
        stem = line.replace(/^(Q:|Q\d+:|\d+\.|\d+\))\s*/i, "").trim();
      } else if (/^[A-D][\)\.\:]/i.test(line)) {
        options.push(line.replace(/^[A-D][\)\.\:]\s*/i, "").trim());
      } else if (/^(Answer|Ans|Correct)[\:\=]/i.test(line)) {
        const val = line.replace(/^(Answer|Ans|Correct)[\:\=]\s*/i, "").trim().toUpperCase();
        const letterIndex = ["A", "B", "C", "D"].indexOf(val.charAt(0));
        if (letterIndex !== -1) answerIndex = letterIndex;
      } else if (!stem) {
        stem = line;
      }
    }

    if (stem && options.length >= 2) {
      // Pad to 4 options if fewer
      while (options.length < 4) {
        options.push(`Option ${String.fromCharCode(65 + options.length)}`);
      }
      parsedItems.push({ stem, options: options.slice(0, 4), answerIndex });
    }
  }

  if (parsedItems.length === 0) {
    return {
      error: "No valid questions detected. Please ensure format starts with 'Q:' or '1.' and choices with 'A)', 'B)', 'C)', 'D)'."
    };
  }

  const analyzedQuestions: ParsedQuestionWithAI[] = [];
  for (const item of parsedItems) {
    const analyzed = await analyzeQuestionWithAI(item.stem, item.options, item.answerIndex);
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
