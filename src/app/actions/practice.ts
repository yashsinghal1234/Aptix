"use server";

import { prisma } from "@/lib/prisma";
import { cookies } from "next/headers";
import { verifyToken } from "@/lib/auth";

export const FIXED_PRACTICE_QUESTION_IDS = [
  "cmta9kftt000254k1m41dx4z4", // Q1: Simple Interest on ₹5,000 at 8% (Quantitative Aptitude)
  "cmta9kfw2000754k19rx2mlzi", // Q2: Next number in series: 2, 6, 12, 20, 30 (Logical Reasoning)
  "cmtx9o56e0000df5zlc8atjay", // Q3: C code output while loop (Domain Specific / Computer Science)
  "cmth64giz000f893j0h0uyoff", // Q4: Blood relations - Brother, sister, father (Domain Specific)
  "cmth64gjf000g893jan62h35x", // Q5: Coding - CODING -> DPEJOH, PYTHON -> QZUIPO (Domain Specific)
  "cmtx8x5g50000nghly8hpeuip", // Q6: Translator converting high-level language -> Compiler (Computer Science)
  "cmta9kfwi000854k1ic4894wp", // Q7: Ratio of boys to girls 3:2 (Quantitative Aptitude)
  "cmthgpewn000mi3gxhqxahg59", // Q8: Loop guaranteed to execute at least once -> Do-while (Domain Specific)
  "cmthgpetz000gi3gxw4f33qij", // Q9: Volatile memory -> RAM (Domain Specific / Hardware)
  "cmth64gik000e893jqjn9t32l", // Q10: Markup 40%, discount 25% -> 5% profit (Quantitative Aptitude)
];

export async function getPracticeQuestionsAction(params: {
  topic?: string;
  difficulty?: string;
  count?: number;
}) {
  try {
    const token = cookies().get("token")?.value;
    let userId: string | null = null;

    if (token) {
      const payload = await verifyToken(token);
      if (payload) userId = payload.userId as string;
    }

    const { count = 10 } = params;

    // Fetch the fixed 10 curated questions directly
    let questionsPool = await prisma.question.findMany({
      where: {
        id: { in: FIXED_PRACTICE_QUESTION_IDS }
      },
      select: {
        id: true,
        text: true,
        type: true,
        category: true,
        difficultyLevel: true,
        points: true,
        negativePoints: true,
        imageUrl: true,
        options: true,
        answerData: true
      }
    });

    // If any questions are missing in DB, fill up to count with other approved questions
    if (questionsPool.length < count) {
      const existingIds = new Set(questionsPool.map(q => q.id));
      const fallbackQuestions = await prisma.question.findMany({
        where: {
          id: { notIn: Array.from(existingIds) },
          status: "APPROVED"
        },
        select: {
          id: true,
          text: true,
          type: true,
          category: true,
          difficultyLevel: true,
          points: true,
          negativePoints: true,
          imageUrl: true,
          options: true,
          answerData: true
        },
        take: count - questionsPool.length
      });
      questionsPool = [...questionsPool, ...fallbackQuestions];
    }

    const formatted = questionsPool.map(q => {
      let parsedOptions: any[] = [];
      let correctAnswer: any = null;
      let explanation: string | null = null;

      try {
        parsedOptions = JSON.parse(q.options);
      } catch {
        parsedOptions = [];
      }

      try {
        const parsedAns = JSON.parse(q.answerData);
        correctAnswer = parsedAns.correctAnswer !== undefined 
          ? parsedAns.correctAnswer 
          : (parsedAns.correctAnswers ? (Array.isArray(parsedAns.correctAnswers) ? parsedAns.correctAnswers[0] : parsedAns.correctAnswers) : parsedAns.exact);
        explanation = parsedAns.explanation || null;
      } catch {
        correctAnswer = null;
        explanation = null;
      }

      // Check if explanation is on one of the option objects
      if (!explanation && Array.isArray(parsedOptions)) {
        const optWithExpl = parsedOptions.find(o => o && typeof o === "object" && o.explanation);
        if (optWithExpl) {
          explanation = optWithExpl.explanation;
        }
      }

      // Resolve the precise option text matching the answer
      const optTexts = parsedOptions.map(o => (typeof o === "string" ? o : o?.text || ""));
      let resolvedAnswerText = "";

      // 1. Direct match with an option's text
      if (correctAnswer !== undefined && correctAnswer !== null) {
        const directMatch = optTexts.find(
          t => t === correctAnswer || (typeof correctAnswer === "string" && t.trim().toLowerCase() === correctAnswer.trim().toLowerCase())
        );
        if (directMatch) {
          resolvedAnswerText = directMatch;
        }
      }

      // 2. Numeric index (0, 1, 2)
      if (!resolvedAnswerText && typeof correctAnswer === "number" && correctAnswer >= 0 && correctAnswer < optTexts.length) {
        resolvedAnswerText = optTexts[correctAnswer];
      }

      // 3. String numeric index if within range
      if (!resolvedAnswerText && typeof correctAnswer === "string" && /^\d+$/.test(correctAnswer.trim())) {
        const idx = parseInt(correctAnswer.trim(), 10);
        if (idx >= 0 && idx < optTexts.length) {
          resolvedAnswerText = optTexts[idx];
        }
      }

      // 4. Letter choice A, B, C, D
      if (!resolvedAnswerText && typeof correctAnswer === "string") {
        const cleaned = correctAnswer.trim().toUpperCase().replace(/[^A-D]/g, "");
        if (cleaned.length === 1) {
          const letterIdx = cleaned.charCodeAt(0) - 65;
          if (letterIdx >= 0 && letterIdx < optTexts.length) {
            resolvedAnswerText = optTexts[letterIdx];
          }
        }
      }

      // 5. Option object flag (isCorrect: true)
      if (!resolvedAnswerText && Array.isArray(parsedOptions)) {
        const flagged = parsedOptions.find(o => typeof o === "object" && (o?.isCorrect === true || o?.correct === true));
        if (flagged) resolvedAnswerText = flagged.text || "";
      }

      // 6. Option explanation contains "The correct answer is"
      if (!resolvedAnswerText && Array.isArray(parsedOptions)) {
        const explOpt = parsedOptions.find(o => typeof o === "object" && o?.explanation && typeof o.explanation === "string" && o.explanation.includes("The correct answer is"));
        if (explOpt) resolvedAnswerText = explOpt.text || "";
      }

      if (!resolvedAnswerText && correctAnswer) {
        resolvedAnswerText = String(correctAnswer);
      }

      return {
        id: q.id,
        text: q.text,
        type: q.type,
        category: q.category,
        difficultyLevel: q.difficultyLevel,
        points: q.points,
        negativePoints: q.negativePoints,
        imageUrl: q.imageUrl,
        options: parsedOptions,
        correctAnswer: resolvedAnswerText,
        explanation
      };
    });

    // Sort strictly according to the fixed order defined in FIXED_PRACTICE_QUESTION_IDS
    formatted.sort((a, b) => {
      const idxA = FIXED_PRACTICE_QUESTION_IDS.indexOf(a.id);
      const idxB = FIXED_PRACTICE_QUESTION_IDS.indexOf(b.id);
      if (idxA === -1 && idxB === -1) return 0;
      if (idxA === -1) return 1;
      if (idxB === -1) return -1;
      return idxA - idxB;
    });

    return { success: true, questions: formatted.slice(0, count) };
  } catch (error: any) {
    console.error("Practice questions fetch error:", error);
    return { success: false, error: error.message || "Failed to load practice questions" };
  }
}
