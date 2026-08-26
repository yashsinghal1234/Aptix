"use server";

import { prisma } from "@/lib/prisma";
import { cookies } from "next/headers";
import { verifyToken } from "@/lib/auth";

export async function logCheatSignalAction(examSessionId: string, type: string, description?: string) {
  const token = cookies().get("token")?.value;
  if (!token) return { error: "Unauthorized" };
  
  const payload = await verifyToken(token);
  if (!payload || !payload.userId) return { error: "Unauthorized" };

  const userId = payload.userId as string;

  try {
    // Only log integrity signals for actively IN_PROGRESS attempts
    const activeAttempt = await prisma.candidateAttempt.findFirst({
      where: {
        userId,
        examSessionId,
        status: "IN_PROGRESS"
      }
    });

    if (!activeAttempt) {
      // If attempt is already SUBMITTED or session is closed, ignore post-exam window blurs
      return { success: false, reason: "Attempt is not in progress" };
    }

    await prisma.cheatFlag.create({
      data: {
        userId,
        examSessionId,
        type,
        description
      }
    });
    return { success: true };
  } catch (error) {
    console.error("Failed to log cheat signal:", error);
    return { error: "Internal error" };
  }
}
