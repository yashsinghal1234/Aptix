"use server";

import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { verifyToken } from "@/lib/auth";
import { revalidatePath } from "next/cache";

export async function extractQuestionsAction(textBlob: string) {
  const token = cookies().get("token")?.value;
  if (!token) return { error: "Not logged in" };
  
  const payload = await verifyToken(token);
  if (!payload || (payload.role !== "SETTER" && payload.role !== "OWNER")) return { error: "Unauthorized" };

  // Simple parser logic for text block
  // Assumes format:
  // Q: What is 2+2?
  // A) 3
  // B) 4
  // C) 5
  // D) 6
  // Answer: B

  const questions = [];
  const lines = textBlob.split("\n").map(l => l.trim()).filter(l => l.length > 0);
  
  let currentQ: any = null;
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    
    if (line.startsWith("Q:")) {
      if (currentQ) {
        questions.push(currentQ);
      }
      currentQ = { stem: line.substring(2).trim(), options: [], answer: null };
    } else if (line.match(/^[A-D]\)/)) {
      if (currentQ) {
        currentQ.options.push(line.substring(2).trim());
      }
    } else if (line.startsWith("Answer:")) {
      if (currentQ) {
        const ansLetter = line.substring(7).trim().toUpperCase();
        const index = ["A", "B", "C", "D"].indexOf(ansLetter);
        currentQ.answer = index;
      }
    }
  }
  if (currentQ) questions.push(currentQ);

  let createdCount = 0;
  for (const q of questions) {
    if (q.options.length !== 4 || q.answer === null || q.answer === -1) continue;

    const formattedOptions = q.options.map((text: string) => ({
      text,
      explanation: null,
      imageUrl: null
    }));

    const correctAnswerText = formattedOptions[q.answer].text;

    await prisma.question.create({
      data: {
        text: q.stem,
        options: JSON.stringify(formattedOptions),
        answerData: JSON.stringify({ correctAnswer: correctAnswerText }),
        category: "Logical", // default for extraction
        difficultyLevel: "MEDIUM",
        status: "DRAFT", // always draft from extraction
        isExtracted: true,
        authorId: payload.userId as string,
        type: "MCQ_SINGLE",
        points: 1.0,
        negativePoints: 0.0
      }
    });
    createdCount++;
  }

  revalidatePath("/dashboard/setter");
  return { success: true, count: createdCount };
}
