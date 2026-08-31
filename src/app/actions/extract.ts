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

export interface RawParsedItem {
  stem: string;
  options: string[];
  answerIndex: number;
  explanation?: string;
}

/**
 * Robust line-by-line question parser supporting multi-line stems, isolated "Question 1:" headers,
 * various option prefixes (A), A., [A], Option A), inline options, and custom explanations.
 */
export function parseTextBlobToRawItems(textBlob: string): RawParsedItem[] {
  const normalized = textBlob.replace(/\r\n/g, "\n").replace(/\r/g, "\n");
  const rawLines = normalized.split("\n").map(l => l.trim());

  const items: RawParsedItem[] = [];

  let curStemLines: string[] = [];
  let curOptions: string[] = [];
  let curAnswerIndex = 0;
  let curExplanationLines: string[] = [];
  let state: "IDLE" | "IN_STEM" | "IN_OPTIONS" | "IN_EXPLANATION" = "IDLE";

  const flushCurrentItem = () => {
    const stem = curStemLines.join("\n").trim();
    if (stem && curOptions.length >= 2) {
      const opts = [...curOptions];
      while (opts.length < 4) {
        opts.push(`Option ${String.fromCharCode(65 + opts.length)}`);
      }
      const explanation = curExplanationLines.join("\n").trim();
      items.push({
        stem,
        options: opts.slice(0, 4),
        answerIndex: Math.max(0, Math.min(opts.length - 1, curAnswerIndex)),
        explanation: explanation.length > 0 ? explanation : undefined
      });
    }
    curStemLines = [];
    curOptions = [];
    curAnswerIndex = 0;
    curExplanationLines = [];
    state = "IDLE";
  };

  const questionHeaderPrefixRegex = /^(?:(?:question|ques|problem|item)\s*(?:\d+|[a-z])?|q\.?\s*\d+|q\s*|\(?\d+\s*[\)\.\:\-])\s*[\:\.\-]?\s*(.*)$/i;
  const singleOptionPrefixRegex = /^(?:(?:\(?([A-Ea-e])\)|\[([A-Ea-e])\]|([A-Ea-e])[\.\:\-])|(?:option\s*([A-Ea-e1-5])[\.\:\-]?))\s*(.*)$/i;
  const answerPrefixRegex = /^(?:(?:correct\s*(?:answer|option)?|answer|ans|key)\s*(?:is|\:|\=|\-)?)\s*(.*)$/i;
  const explanationPrefixRegex = /^(?:(?:explanation|explain|solution|rationale|reason)\s*[\:\=\-]?\s*)(.*)$/i;

  for (let i = 0; i < rawLines.length; i++) {
    const line = rawLines[i];
    if (!line) {
      // Empty line - if we finished collecting options and answer for a question, we can prepare for the next
      continue;
    }

    // 1. Check Answer Line
    const ansMatch = line.match(answerPrefixRegex);
    if (ansMatch && (curOptions.length > 0 || state === "IN_OPTIONS")) {
      const rawAnsVal = ansMatch[1].trim();
      const letterMatch = rawAnsVal.match(/^[\(\[]?([A-Da-d1-4])[\)\]\.\:]?/);
      if (letterMatch) {
        const ch = letterMatch[1].toUpperCase();
        if (ch >= "A" && ch <= "D") {
          curAnswerIndex = ch.charCodeAt(0) - 65;
        } else if (ch >= "1" && ch <= "4") {
          curAnswerIndex = parseInt(ch, 10) - 1;
        }
      } else if (rawAnsVal && curOptions.length > 0) {
        const matchedIdx = curOptions.findIndex(o => 
          o.toLowerCase().trim() === rawAnsVal.toLowerCase().trim() ||
          rawAnsVal.toLowerCase().includes(o.toLowerCase().trim())
        );
        if (matchedIdx !== -1) curAnswerIndex = matchedIdx;
      }
      state = "IN_EXPLANATION";
      continue;
    }

    // 2. Check Explanation Line
    const expMatch = line.match(explanationPrefixRegex);
    if (expMatch && (state === "IN_OPTIONS" || state === "IN_EXPLANATION")) {
      state = "IN_EXPLANATION";
      if (expMatch[1].trim()) {
        curExplanationLines.push(expMatch[1].trim());
      }
      continue;
    }

    // 3. Check Option Line(s)
    // Check if multiple options are on a single line (e.g. "A) 120  B) 150  C) 180  D) 324")
    const multipleInlineMatches = line.split(/(?=\s+(?:\(?[A-Da-d]\)|\[[A-Da-d]\]|[A-Da-d][\.\:\-])\s+)/);
    if (multipleInlineMatches.length >= 2 && singleOptionPrefixRegex.test(multipleInlineMatches[0].trim())) {
      state = "IN_OPTIONS";
      for (const optChunk of multipleInlineMatches) {
        const m = optChunk.trim().match(singleOptionPrefixRegex);
        if (m) {
          const optText = (m[5] || "").trim();
          curOptions.push(optText);
        }
      }
      continue;
    }

    const singleOptMatch = line.match(singleOptionPrefixRegex);
    if (singleOptMatch && (state === "IN_STEM" || curStemLines.length > 0 || state === "IN_OPTIONS")) {
      state = "IN_OPTIONS";
      const optText = (singleOptMatch[5] || "").trim();
      curOptions.push(optText);
      continue;
    }

    // 4. Check Question Header / Start
    const qHeaderMatch = line.match(questionHeaderPrefixRegex);
    if (qHeaderMatch) {
      // If we already had an active question with options, flush it!
      if (curStemLines.length > 0 && curOptions.length >= 2) {
        flushCurrentItem();
      }

      state = "IN_STEM";
      const remainingStemText = qHeaderMatch[1].trim();
      if (remainingStemText) {
        curStemLines.push(remainingStemText);
      }
      continue;
    }

    // 5. Line Continuation
    if (state === "IN_STEM") {
      curStemLines.push(line);
    } else if (state === "IN_EXPLANATION") {
      curExplanationLines.push(line);
    } else if (state === "IN_OPTIONS") {
      if (curOptions.length > 0) {
        curOptions[curOptions.length - 1] += " " + line;
      }
    } else {
      state = "IN_STEM";
      curStemLines.push(line);
    }
  }

  flushCurrentItem();
  return items;
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
