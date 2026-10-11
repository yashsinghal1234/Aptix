"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { verifyToken } from "@/lib/auth";

const DEFAULT_SUBJECTS = [
  "Machine Learning",
  "Mathematics",
  "Quantitative Aptitude",
  "Logical Reasoning",
  "Computer Science & Tech",
  "Domain Specific"
];

async function getAuthPayload() {
  const token = cookies().get("token")?.value;
  if (!token) return null;
  return await verifyToken(token);
}

export async function getSubjectsAction(): Promise<{ id: string; name: string; code: string | null }[]> {
  try {
    let subjects = await prisma.subject.findMany({
      orderBy: { name: "asc" },
      select: { id: true, name: true, code: true }
    });

    if (subjects.length === 0) {
      // Seed default subjects if empty
      for (const name of DEFAULT_SUBJECTS) {
        await prisma.subject.upsert({
          where: { name },
          update: {},
          create: { name }
        });
      }
      subjects = await prisma.subject.findMany({
        orderBy: { name: "asc" },
        select: { id: true, name: true, code: true }
      });
    }

    return subjects;
  } catch (error) {
    console.error("Error fetching subjects:", error);
    return DEFAULT_SUBJECTS.map((name, i) => ({ id: `sub-${i}`, name, code: null }));
  }
}

export async function createSubjectAction(name: string, code?: string) {
  const payload = await getAuthPayload();
  if (!payload || (payload.role !== "OWNER" && payload.role !== "SETTER")) {
    return { error: "Unauthorized to add subjects" };
  }

  const cleanName = name?.trim();
  if (!cleanName || cleanName.length < 2) {
    return { error: "Subject name must be at least 2 characters long." };
  }

  try {
    // Check if subject exists (case-insensitive)
    const existing = await prisma.subject.findFirst({
      where: {
        name: {
          equals: cleanName,
          mode: "insensitive"
        }
      }
    });

    if (existing) {
      return { success: true, subject: existing };
    }

    const created = await prisma.subject.create({
      data: {
        name: cleanName,
        code: code?.trim() || null
      }
    });

    revalidatePath("/dashboard/owner");
    revalidatePath("/dashboard/owner/template/new");
    revalidatePath("/dashboard/owner/setters");
    revalidatePath("/dashboard/setter");

    return { success: true, subject: created };
  } catch (error: any) {
    console.error("Error creating subject:", error);
    return { error: error?.message || "Failed to create subject" };
  }
}
