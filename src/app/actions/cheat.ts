"use server";

import { prisma } from "@/lib/prisma";
import { cookies } from "next/headers";
import { verifyToken } from "@/lib/auth";

export async function logCheatSignalAction(examSessionId: string, type: string, description?: string) {
  const token = cookies().get("token")?.value;
  if (!token) return { error: "Unauthorized" };
  
  const payload = await verifyToken(token);
  if (!payload || !payload.userId) return { error: "Unauthorized" };

  try {
    await prisma.cheatFlag.create({
      data: {
        userId: payload.userId as string,
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
