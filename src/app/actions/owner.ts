"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { verifyToken } from "@/lib/auth";

async function isOwner() {
  const token = cookies().get("token")?.value;
  if (!token) return false;
  const payload = await verifyToken(token);
  return payload?.role === "OWNER";
}

export async function createSetterAction(formData: FormData) {
  if (!(await isOwner())) return { error: "Unauthorized" };

  const name = formData.get("name") as string;
  const email = formData.get("email") as string;

  if (!name || !email) return { error: "Missing fields" };

  await prisma.user.upsert({
    where: { email: email.toLowerCase() },
    update: { role: "SETTER", name },
    create: { email: email.toLowerCase(), name, role: "SETTER" }
  });

  revalidatePath("/dashboard/owner");
  return { success: true };
}

export async function removeSetterAction(id: string) {
  if (!(await isOwner())) return { error: "Unauthorized" };

  await prisma.user.update({
    where: { id },
    data: { role: "CANDIDATE" } // Downgrade to candidate rather than delete
  });

  revalidatePath("/dashboard/owner");
  return { success: true };
}
