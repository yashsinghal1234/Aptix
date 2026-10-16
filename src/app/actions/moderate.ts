"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { requireAuth } from "@/lib/auth";
import { markCachedAttemptSubmitted } from "@/lib/exam-cache";

async function assertOwner(sessionId: string) {
  const auth = await requireAuth(["OWNER"]);
  if ("error" in auth) return { error: auth.error as string };
  const s = await prisma.examSession.findUnique({ where: { id: sessionId }, select: { id: true } });
  if (!s) return { error: "Session not found" };
  return { auth };
}

export async function isEmailBlocked(sessionId: string, email: string) {
  const b = await prisma.sessionBlocked.findUnique({
    where: { examSessionId_email: { examSessionId: sessionId, email: email.toLowerCase().trim() } },
  });
  return !!b;
}

export async function blockCandidateAction(sessionId: string, email: string, reason?: string) {
  const check = await assertOwner(sessionId);
  if ("error" in check) return { error: check.error };
  const { auth } = check;
  const em = email.toLowerCase().trim();

  await prisma.sessionBlocked.upsert({
    where: { examSessionId_email: { examSessionId: sessionId, email: em } },
    update: { reason: reason?.slice(0, 200) || "Blocked by proctor mid-exam" },
    create: { examSessionId: sessionId, email: em, reason: reason?.slice(0, 200) || "Blocked by proctor mid-exam" },
  });

  const user = await prisma.user.findUnique({ where: { email: em }, select: { id: true } });
  if (user) {
    await prisma.user.update({ where: { id: user.id }, data: { tokenVersion: { increment: 1 } } }).catch(() => {});
    const att = await prisma.candidateAttempt.findFirst({ where: { userId: user.id, examSessionId: sessionId, status: "IN_PROGRESS" } });
    if (att) {
      await prisma.candidateAttempt.update({ where: { id: att.id }, data: { status: "SUBMITTED", submittedAt: new Date() } });
      markCachedAttemptSubmitted(att.id);
    }
  }

  await prisma.auditLog.create({
    data: {
      userId: (auth.payload.userId as string) || auth.user.id,
      action: "BLOCK_CANDIDATE",
      details: `Blocked ${em} in session ${sessionId}. Reason: ${reason || "mid-exam restriction"}`,
    },
  }).catch(() => {});

  revalidatePath(`/dashboard/owner/session/${sessionId}`);
  return { success: true };
}

export async function unblockCandidateAction(sessionId: string, email: string) {
  const check = await assertOwner(sessionId);
  if ("error" in check) return { error: check.error };
  await prisma.sessionBlocked.deleteMany({ where: { examSessionId: sessionId, email: email.toLowerCase().trim() } });
  revalidatePath(`/dashboard/owner/session/${sessionId}`);
  return { success: true };
}

export async function getBlockedAction(sessionId: string) {
  const auth = await requireAuth(["OWNER"]);
  if ("error" in auth) return { error: auth.error };
  const blocked = await prisma.sessionBlocked.findMany({ where: { examSessionId: sessionId }, orderBy: { email: "asc" } });
  return { success: true, blocked };
}
