"use server";

import { prisma } from "@/lib/prisma";
import { cookies } from "next/headers";
import { verifyToken } from "@/lib/auth";

export interface IncidentReportParams {
  attemptId?: string;
  sessionId?: string;
  errorType: string;
  message: string;
  stack?: string;
  context?: Record<string, any>;
}

export async function reportClientIncidentAction(params: IncidentReportParams) {
  try {
    const token = cookies().get("token")?.value;
    let candidateUserId: string | null = null;

    if (token) {
      const payload = await verifyToken(token);
      if (payload?.userId) candidateUserId = payload.userId as string;
    }

    console.error(`[INCIDENT_LOG] Type: ${params.errorType} | Msg: ${params.message}`, {
      attemptId: params.attemptId,
      sessionId: params.sessionId,
      userId: candidateUserId,
      context: params.context,
      stack: params.stack
    });

    // If session ID exists, log into CheatFlag / Proctor Stream so the owner is notified in real time
    if (params.sessionId) {
      await prisma.cheatFlag.create({
        data: {
          examSessionId: params.sessionId,
          userId: candidateUserId || "ANONYMOUS",
          type: "WINDOW_BLUR", // Standard flag category displayed in proctor feed
          description: `[CRASH / INCIDENT] ${params.errorType}: ${params.message.slice(0, 200)}`,
          timestamp: new Date()
        }
      }).catch(err => console.warn("Failed to record incident to proctor feed:", err));
    }

    return { success: true };
  } catch (err: any) {
    console.error("Failed to process incident report:", err);
    return { success: false, error: err.message };
  }
}
