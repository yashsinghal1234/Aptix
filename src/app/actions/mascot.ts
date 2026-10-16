"use server";

import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";

export async function saveCandidateMascotAction(sessionId: string, mascotId: string) {
  try {
    const auth = await requireAuth();
    if ("error" in auth || !auth.user) return { error: "Unauthorized" };

    const userId = auth.user.id;

    // Check if mascot is already recorded for this user and session
    const existing = await prisma.auditLog.findFirst({
      where: {
        userId,
        action: "CHOSEN_MASCOT",
        details: { contains: sessionId }
      }
    });

    if (existing) {
      await prisma.auditLog.update({
        where: { id: existing.id },
        data: {
          details: JSON.stringify({ mascotId, sessionId, updatedAt: new Date().toISOString() }),
          timestamp: new Date()
        }
      });
    } else {
      await prisma.auditLog.create({
        data: {
          userId,
          action: "CHOSEN_MASCOT",
          details: JSON.stringify({ mascotId, sessionId, createdAt: new Date().toISOString() })
        }
      });
    }

    return { success: true, mascotId };
  } catch (error: any) {
    console.error("Failed to save candidate mascot:", error);
    return { error: error.message || "Failed to record mascot selection." };
  }
}

export async function getCandidateMascot(userId: string, sessionId: string): Promise<string | null> {
  try {
    // Ownership: candidates see only their own, owners see any
    const auth = await requireAuth();
    if ("error" in auth || !auth.user) return null;
    if (auth.user.id !== userId && auth.user.role !== "OWNER") return null;

    const log = await prisma.auditLog.findFirst({
      where: {
        userId,
        action: "CHOSEN_MASCOT",
        details: { contains: sessionId }
      },
      orderBy: { timestamp: "desc" }
    });

    if (!log || !log.details) return null;
    const parsed = JSON.parse(log.details);
    return parsed.mascotId || null;
  } catch {
    return null;
  }
}

export async function getSessionMascotsMap(sessionId: string): Promise<Record<string, string>> {
  try {
    const auth = await requireAuth(["OWNER"]);
    if ("error" in auth) return {};
    const logs = await prisma.auditLog.findMany({
      where: {
        action: "CHOSEN_MASCOT",
        details: { contains: sessionId }
      },
      orderBy: { timestamp: "desc" }
    });

    const map: Record<string, string> = {};
    for (const log of logs) {
      if (log.details && !map[log.userId]) {
        try {
          const parsed = JSON.parse(log.details);
          if (parsed.mascotId) {
            map[log.userId] = parsed.mascotId;
          }
        } catch {}
      }
    }
    return map;
  } catch {
    return {};
  }
}
