"use server";

import { PRACTICE_QUESTIONS, FIXED_PRACTICE_QUESTION_IDS, PracticeQuestion } from "@/lib/practiceConstants";

export { FIXED_PRACTICE_QUESTION_IDS };

export async function getPracticeQuestionsAction(params?: {
  topic?: string;
  difficulty?: string;
  count?: number;
}) {
  const count = params?.count || 10;
  return {
    success: true,
    questions: PRACTICE_QUESTIONS.slice(0, count)
  };
}
