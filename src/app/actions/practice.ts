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

// Reliable curated fallback to ensure instant loading even if database is cold-starting or unreachable
const CURATED_FALLBACK_QUESTIONS = [
  {
    id: "cmta9kftt000254k1m41dx4z4",
    text: "What is the simple interest on ₹5,000 at 8% per annum for 2 years?",
    type: "MCQ_SINGLE",
    category: "Quantitative Aptitude",
    difficultyLevel: "MEDIUM",
    points: 1,
    negativePoints: 0,
    imageUrl: null,
    options: [{ text: "₹600" }, { text: "₹700" }, { text: "₹800" }, { text: "₹900" }],
    correctAnswer: "₹800",
    explanation: 'The correct answer is "₹800". In Quantitative Aptitude, Simple Interest = (P × R × T) / 100 = (5000 × 8 × 2) / 100 = ₹800.'
  },
  {
    id: "cmta9kfw2000754k19rx2mlzi",
    text: "What is the next number in the series: 2, 6, 12, 20, 30, ?",
    type: "MCQ_SINGLE",
    category: "Logical Reasoning",
    difficultyLevel: "MEDIUM",
    points: 1,
    negativePoints: 0,
    imageUrl: null,
    options: [{ text: "36" }, { text: "40" }, { text: "42" }, { text: "44" }],
    correctAnswer: "42",
    explanation: 'The correct answer is "42". The differences between consecutive terms are +4, +6, +8, +10, so the next difference is +12: 30 + 12 = 42.'
  },
  {
    id: "cmtx9o56e0000df5zlc8atjay",
    text: "Give the output of the following given code:\n\n#include <stdio.h>\nint main() {\n    int a = 5;\n    while(a > -2) {\n        printf(\"%d \", a);\n        a -= 3;\n    }\n    return 0;\n}",
    type: "MCQ_SINGLE",
    category: "Domain Specific",
    difficultyLevel: "EASY",
    points: 1,
    negativePoints: 0,
    imageUrl: null,
    options: [{ text: "5 2" }, { text: "5 2 0" }, { text: "5 2 -2" }, { text: "5 2 -1" }],
    correctAnswer: "5 2 -1",
    explanation: 'Loop execution: a = 5 (> -2: prints 5, a becomes 2). Next: a = 2 (> -2: prints 2, a becomes -1). Next: a = -1 (> -2: prints -1, a becomes -4). Next: a = -4 is not > -2, so loop terminates. Final output is "5 2 -1".'
  },
  {
    id: "cmth64giz000f893j0h0uyoff",
    text: "A is the brother of B. B is the sister of C. C is the father of D. How is A related to D?",
    type: "MCQ_SINGLE",
    category: "Domain Specific",
    difficultyLevel: "MEDIUM",
    points: 1,
    negativePoints: 0,
    imageUrl: null,
    options: [{ text: "Father" }, { text: "Grandfather" }, { text: "Uncle" }, { text: "Brother" }],
    correctAnswer: "Uncle",
    explanation: 'C is the father of D. A is the brother of C. Therefore, A is the paternal uncle of D.'
  },
  {
    id: "cmth64gjf000g893jan62h35x",
    text: 'If "CODING" is written as "DPEJOH", how is "PYTHON" written?',
    type: "MCQ_SINGLE",
    category: "Domain Specific",
    difficultyLevel: "EASY",
    points: 1,
    negativePoints: 0,
    imageUrl: null,
    options: [{ text: "QZUIPO" }, { text: "QZUJPO" }, { text: "PZUIPO" }, { text: "QZTIPO" }],
    correctAnswer: "QZUIPO",
    explanation: 'Each letter is shifted by +1 in the alphabet: P->Q, Y->Z, T->U, H->I, O->P, N->O. Result: QZUIPO.'
  },
  {
    id: "cmtx8x5g50000nghly8hpeuip",
    text: "Which translator converts high-level language into machine/object code?",
    type: "MCQ_SINGLE",
    category: "Computer Science & Tech",
    difficultyLevel: "HARD",
    points: 1,
    negativePoints: 0,
    imageUrl: null,
    options: [{ text: "Compiler" }, { text: "Router" }, { text: "Loader" }, { text: "Assembler" }],
    correctAnswer: "Compiler",
    explanation: "A compiler translates entire source code written in a high-level programming language into machine code or object code before execution."
  },
  {
    id: "cmta9kfwi000854k1ic4894wp",
    text: "The ratio of boys to girls in a class is 3:2. If there are 30 boys, how many girls are there?",
    type: "MCQ_SINGLE",
    category: "Quantitative Aptitude",
    difficultyLevel: "MEDIUM",
    points: 1,
    negativePoints: 0,
    imageUrl: null,
    options: [{ text: "15" }, { text: "20" }, { text: "25" }, { text: "30" }],
    correctAnswer: "20",
    explanation: "Ratio boys:girls = 3:2. 3 parts = 30 boys, so 1 part = 10. Number of girls = 2 parts = 2 × 10 = 20."
  },
  {
    id: "cmthgpewn000mi3gxhqxahg59",
    text: "Which loop is guaranteed to execute at least once?",
    type: "MCQ_SINGLE",
    category: "Domain Specific",
    difficultyLevel: "EASY",
    points: 1,
    negativePoints: 0,
    imageUrl: null,
    options: [{ text: "For" }, { text: "While" }, { text: "Do-while" }, { text: "None" }],
    correctAnswer: "Do-while",
    explanation: "A do-while loop evaluates its condition at the bottom of the loop body (exit-controlled), guaranteeing that the code executes at least once."
  },
  {
    id: "cmthgpetz000gi3gxw4f33qij",
    text: "Which of the following is volatile memory?",
    type: "MCQ_SINGLE",
    category: "Domain Specific",
    difficultyLevel: "EASY",
    points: 1,
    negativePoints: 0,
    imageUrl: null,
    options: [{ text: "SSD" }, { text: "Hard Disk" }, { text: "RAM" }, { text: "DVD" }],
    correctAnswer: "RAM",
    explanation: "RAM (Random Access Memory) requires continuous electrical power to maintain its data; when power is lost, data is cleared, making it volatile."
  },
  {
    id: "cmth64gik000e893jqjn9t32l",
    text: "A shopkeeper marks up an item by 40% and then gives a discount of 25%. What is his overall profit or loss percentage?",
    type: "MCQ_SINGLE",
    category: "Quantitative Aptitude",
    difficultyLevel: "MEDIUM",
    points: 1,
    negativePoints: 0,
    imageUrl: null,
    options: [{ text: "5% profit" }, { text: "5% loss" }, { text: "10% profit" }, { text: "15% loss" }],
    correctAnswer: "5% profit",
    explanation: "Let Cost Price = 100. Marked Price = 140. Selling Price after 25% discount = 140 × 0.75 = 105. Profit = 105 - 100 = 5% profit."
  }
];

export async function getPracticeQuestionsAction(params: {
  topic?: string;
  difficulty?: string;
  count?: number;
}) {
  try {
    const { count = 10 } = params;

    let dbQuestions: any[] = [];
    try {
      dbQuestions = await prisma.question.findMany({
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
    } catch (dbErr) {
      console.warn("Database query failed or timed out, serving curated questions fallback:", dbErr);
    }

    if (dbQuestions && dbQuestions.length >= count) {
      const formatted = dbQuestions.map(q => {
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

        if (!explanation && Array.isArray(parsedOptions)) {
          const optWithExpl = parsedOptions.find(o => o && typeof o === "object" && o.explanation);
          if (optWithExpl) {
            explanation = optWithExpl.explanation;
          }
        }

        const optTexts = parsedOptions.map(o => (typeof o === "string" ? o : o?.text || ""));
        let resolvedAnswerText = "";

        if (correctAnswer !== undefined && correctAnswer !== null) {
          const directMatch = optTexts.find(
            t => t === correctAnswer || (typeof correctAnswer === "string" && t.trim().toLowerCase() === correctAnswer.trim().toLowerCase())
          );
          if (directMatch) {
            resolvedAnswerText = directMatch;
          }
        }

        if (!resolvedAnswerText && typeof correctAnswer === "number" && correctAnswer >= 0 && correctAnswer < optTexts.length) {
          resolvedAnswerText = optTexts[correctAnswer];
        }

        if (!resolvedAnswerText && typeof correctAnswer === "string" && /^\d+$/.test(correctAnswer.trim())) {
          const idx = parseInt(correctAnswer.trim(), 10);
          if (idx >= 0 && idx < optTexts.length) {
            resolvedAnswerText = optTexts[idx];
          }
        }

        if (!resolvedAnswerText && typeof correctAnswer === "string") {
          const cleaned = correctAnswer.trim().toUpperCase().replace(/[^A-D]/g, "");
          if (cleaned.length === 1) {
            const letterIdx = cleaned.charCodeAt(0) - 65;
            if (letterIdx >= 0 && letterIdx < optTexts.length) {
              resolvedAnswerText = optTexts[letterIdx];
            }
          }
        }

        if (!resolvedAnswerText && Array.isArray(parsedOptions)) {
          const flagged = parsedOptions.find(o => typeof o === "object" && (o?.isCorrect === true || o?.correct === true));
          if (flagged) resolvedAnswerText = flagged.text || "";
        }

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

      formatted.sort((a, b) => {
        const idxA = FIXED_PRACTICE_QUESTION_IDS.indexOf(a.id);
        const idxB = FIXED_PRACTICE_QUESTION_IDS.indexOf(b.id);
        if (idxA === -1 && idxB === -1) return 0;
        if (idxA === -1) return 1;
        if (idxB === -1) return -1;
        return idxA - idxB;
      });

      return { success: true, questions: formatted.slice(0, count) };
    }

    // Always reliably serve the curated fallback questions if DB returns less or fails
    return { success: true, questions: CURATED_FALLBACK_QUESTIONS.slice(0, count) };
  } catch (error: any) {
    console.warn("Unexpected practice handler error, serving curated fallback:", error);
    return { success: true, questions: CURATED_FALLBACK_QUESTIONS.slice(0, 10) };
  }
}
