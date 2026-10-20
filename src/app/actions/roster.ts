"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { requireAuth } from "@/lib/auth";

import { parseRosterText } from "@/lib/roster-parser";
const MAX_ENTRIES = 5000;
const MAX_CHARS = 500_000;

export type RosterEntry = { email: string; name: string | null };

async function assertOwnerSession(sessionId: string) {
  const auth = await requireAuth(["OWNER"]);
  if ("error" in auth) return { error: auth.error as string };
  const session = await prisma.examSession.findUnique({ where: { id: sessionId }, select: { id: true } });
  if (!session) return { error: "Session not found" };
  return { auth };
}

export async function uploadRosterAction(sessionId: string, formData: FormData) {
  const check = await assertOwnerSession(sessionId);
  if ("error" in check) return { error: check.error };
  const { auth } = check;

  let text = String(formData.get("text") || "");
  const file = formData.get("file");
  if ((!text || !text.trim()) && file && typeof file !== "string") {
    const f = file as File;
    if (f.size > MAX_CHARS) return { error: "File too large. Keep roster under 500KB / 5000 emails." };
    text = await f.text();
  }
  if (!text || !text.trim()) return { error: "Upload a CSV file or paste emails (one per line: email or email,name)." };
  if (text.length > MAX_CHARS) return { error: "Roster too large. Keep under 5000 emails." };

  const { entries, skipped } = parseRosterText(text);
  if (entries.length === 0) return { error: "No valid emails found. Use lines like yash@example.com or yash@example.com,Yash Singhal." };

  // Uploads always append — every add simply adds students to the approved list
  await prisma.sessionRoster.createMany({
    data: entries.map((e) => ({ examSessionId: sessionId, email: e.email, name: e.name })),
    skipDuplicates: true,
  });

  await prisma.auditLog.create({
    data: {
      userId: (auth.payload.userId as string) || (auth.user.id as string),
      action: "ROSTER_UPLOAD",
      details: `Uploaded ${entries.length} roster emails (skipped ${skipped}) to session ${sessionId}`,
    },
  }).catch(() => {});

  revalidatePath(`/dashboard/owner/session/${sessionId}`);
  revalidatePath("/dashboard/owner");
  return { success: true, added: entries.length, skipped };
}

export async function getRosterAction(sessionId: string) {
  const auth = await requireAuth(["OWNER"]);
  if ("error" in auth) return { error: auth.error };
  const rosters = await prisma.sessionRoster.findMany({
    where: { examSessionId: sessionId },
    orderBy: { email: "asc" },
    take: MAX_ENTRIES,
  });
  return { success: true, rosters };
}

export async function removeRosterEntryAction(sessionId: string, email: string) {
  const check = await assertOwnerSession(sessionId);
  if ("error" in check) return { error: check.error };
  await prisma.sessionRoster.deleteMany({ where: { examSessionId: sessionId, email: email.toLowerCase().trim() } });
  revalidatePath(`/dashboard/owner/session/${sessionId}`);
  return { success: true };
}

export async function clearRosterAction(sessionId: string) {
  const check = await assertOwnerSession(sessionId);
  if ("error" in check) return { error: check.error };
  await prisma.sessionRoster.deleteMany({ where: { examSessionId: sessionId } });
  revalidatePath(`/dashboard/owner/session/${sessionId}`);
  return { success: true };
}

export async function getExamRosterAction(examId: string) {
  const auth = await requireAuth(["OWNER"]);
  if ("error" in auth) return { error: auth.error };
  const rosters = await prisma.examRoster.findMany({
    where: { examId },
    orderBy: { email: "asc" },
    take: MAX_ENTRIES,
  });
  return { success: true, rosters };
}

export async function uploadExamRosterAction(examId: string, formData: FormData) {
  const auth = await requireAuth(["OWNER"]);
  if ("error" in auth) return { error: auth.error };
  const exam = await prisma.exam.findUnique({ where: { id: examId }, select: { id: true } });
  if (!exam) return { error: "Exam not found" };

  const mode = String(formData.get("mode") || "replace");
  let text = String(formData.get("text") || "");
  const file = formData.get("file");
  if ((!text || !text.trim()) && file && typeof file !== "string") {
    const f = file as File;
    if (f.size > MAX_CHARS) return { error: "File too large. Keep roster under 500KB / 5000 emails." };
    text = await f.text();
  }
  if (!text || !text.trim()) return { error: "Upload a CSV file or paste emails." };
  if (text.length > MAX_CHARS) return { error: "Roster too large. Keep under 5000 emails." };

  const { entries, skipped } = parseRosterText(text);
  if (entries.length === 0) return { error: "No valid emails found." };

  if (mode === "replace") {
    await prisma.examRoster.deleteMany({ where: { examId } });
  }
  await prisma.examRoster.createMany({
    data: entries.map((e) => ({ examId, email: e.email, name: e.name })),
    skipDuplicates: true,
  });

  revalidatePath("/dashboard/owner");
  return { success: true, added: entries.length, skipped };
}
