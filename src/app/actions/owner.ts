"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { verifyToken } from "@/lib/auth";
import { hashPassword, verifyPassword } from "@/lib/password";

async function getAuthPayload() {
  const token = cookies().get("token")?.value;
  if (!token) return null;
  return await verifyToken(token);
}

async function isOwner() {
  const payload = await getAuthPayload();
  return payload?.role === "OWNER";
}

function generateRandomPassword() {
  const num = Math.floor(1000 + Math.random() * 9000);
  return `Setter@${num}`;
}

export async function createSetterAction(formData: FormData) {
  if (!(await isOwner())) return { error: "Unauthorized" };

  const name = formData.get("name") as string;
  const email = formData.get("email") as string;
  let password = (formData.get("password") as string)?.trim();

  if (!name || !email) return { error: "Name and email are required" };

  if (!password) {
    password = generateRandomPassword();
  }

  const normalizedEmail = email.toLowerCase().trim();
  const passwordHash = hashPassword(password);

  await prisma.user.upsert({
    where: { email: normalizedEmail },
    update: { 
      role: "SETTER", 
      name: name.trim(),
      passwordHash: passwordHash,
      mustChangePassword: true
    },
    create: { 
      email: normalizedEmail, 
      name: name.trim(), 
      role: "SETTER",
      passwordHash: passwordHash,
      mustChangePassword: true
    }
  });

  revalidatePath("/dashboard/owner");
  return { 
    success: true, 
    email: normalizedEmail, 
    name: name.trim(), 
    password,
    mustChangePassword: true
  };
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

/**
 * Allows any logged-in staff member (Owner or Setter) to change their password
 */
export async function changePasswordAction(formData: FormData) {
  const payload = await getAuthPayload();
  if (!payload || !["OWNER", "SETTER"].includes(payload.role as string)) {
    return { error: "Unauthorized" };
  }

  const currentPassword = formData.get("currentPassword") as string;
  const newPassword = formData.get("newPassword") as string;
  const confirmPassword = formData.get("confirmPassword") as string;

  if (!newPassword || newPassword.length < 6) {
    return { error: "New password must be at least 6 characters long." };
  }

  if (newPassword !== confirmPassword) {
    return { error: "New passwords do not match." };
  }

  const user = await prisma.user.findUnique({
    where: { id: payload.userId as string }
  });

  if (!user) {
    return { error: "User account not found." };
  }

  // If user already has a password set, verify current password
  if (user.passwordHash) {
    if (!currentPassword) {
      return { error: "Please enter your current password." };
    }
    const isCurrentValid = verifyPassword(currentPassword, user.passwordHash);
    if (!isCurrentValid) {
      return { error: "Current password is incorrect." };
    }
  }

  // Update with new hashed password
  await prisma.user.update({
    where: { id: user.id },
    data: { 
      passwordHash: hashPassword(newPassword),
      mustChangePassword: false
    }
  });

  return { success: true, message: "Password updated successfully." };
}

/**
 * Allows the Owner to reset the password for any staff member
 */
export async function adminResetUserPasswordAction(userId: string, customPassword?: string) {
  if (!(await isOwner())) return { error: "Unauthorized" };

  const user = await prisma.user.findUnique({
    where: { id: userId }
  });

  if (!user) {
    return { error: "User account not found" };
  }

  const temporaryPassword = (customPassword && customPassword.trim().length >= 6)
    ? customPassword.trim()
    : `Reset@${Math.floor(1000 + Math.random() * 9000)}`;

  const passwordHash = hashPassword(temporaryPassword);

  await prisma.user.update({
    where: { id: userId },
    data: {
      passwordHash: passwordHash,
      mustChangePassword: true
    }
  });

  revalidatePath("/dashboard/owner");

  return {
    success: true,
    email: user.email,
    name: user.name,
    temporaryPassword
  };
}


