"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";

function isOwner() {
  const role = cookies().get("userRole")?.value;
  return role === "OWNER";
}

export async function createSetterAction(formData: FormData) {
  if (!isOwner()) return { error: "Unauthorized" };

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
  if (!isOwner()) return { error: "Unauthorized" };

  await prisma.user.update({
    where: { id },
    data: { role: "CANDIDATE" } // Downgrade to candidate rather than delete
  });

  revalidatePath("/dashboard/owner");
  return { success: true };
}
