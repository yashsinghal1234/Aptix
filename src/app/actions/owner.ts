"use server";

import { randomBytes } from "crypto";
import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { requireAuth } from "@/lib/auth";
import { hashPassword, verifyPassword, validatePasswordPolicy } from "@/lib/password";
import { invalidateSettersCache } from "@/lib/dashboard-cache";

async function isOwner() {
  const auth = await requireAuth(["OWNER"]);
  return !("error" in auth);
}

function generateRandomPassword() {
  const bytes = randomBytes(12).toString("base64url");
  return `Set!${bytes}`;
}

export async function createSetterAction(formData: FormData) {
  if (!(await isOwner())) return { error: "Unauthorized" };

  const name = formData.get("name") as string;
  const email = formData.get("email") as string;
  let password = (formData.get("password") as string)?.trim();

  if (!name || !email) return { error: "Name and email are required" };

  if (!password) {
    password = generateRandomPassword();
  } else {
    const policy = validatePasswordPolicy(password);
    if (!policy.valid) {
      return { error: policy.error };
    }
  }

  const normalizedEmail = email.toLowerCase().trim();
  const existingUser = await prisma.user.findUnique({ where: { email: normalizedEmail } });
  if (existingUser && existingUser.role === "OWNER") {
    return { error: "Cannot modify an Owner account through Setter management." };
  }

  const passwordHash = hashPassword(password);
  const rcField = formData.get("requireChange");
  const mustChange = rcField === null ? true : rcField === "on" || rcField === "true";

  const assignedSubject = (formData.get("assignedSubject") as string)?.trim() || null;

  await prisma.user.upsert({
    where: { email: normalizedEmail },
    update: { 
      role: "SETTER", 
      name: name.trim(),
      passwordHash: passwordHash,
      mustChangePassword: mustChange,
      assignedSubject: assignedSubject || undefined,
      tokenVersion: { increment: 1 },
    },
    create: { 
      email: normalizedEmail, 
      name: name.trim(), 
      role: "SETTER",
      passwordHash: passwordHash,
      mustChangePassword: mustChange,
      assignedSubject: assignedSubject,
    }
  });

  revalidatePath("/dashboard/owner");
  revalidatePath("/dashboard/owner/setters");
  invalidateSettersCache();
  return { 
    success: true, 
    email: normalizedEmail, 
    name: name.trim(), 
    password,
    mustChangePassword: mustChange
  };
}

export async function removeSetterAction(id: string) {
  if (!(await isOwner())) return { error: "Unauthorized" };

  await prisma.user.update({
    where: { id },
    data: { 
      role: "CANDIDATE",
      passwordHash: null,
      mustChangePassword: false,
      tokenVersion: { increment: 1 }
    }
  });

  revalidatePath("/dashboard/owner");
  revalidatePath("/dashboard/owner/setters");
  invalidateSettersCache();
  return { success: true };
}

/**
 * Allows any logged-in staff member (Owner or Setter) to change their password
 */
export async function changePasswordAction(formData: FormData) {
  const auth = await requireAuth(["OWNER", "SETTER"]);
  if ("error" in auth) {
    return { error: auth.error };
  }
  const { user: authUser } = auth;

  const currentPassword = formData.get("currentPassword") as string;
  const newPassword = formData.get("newPassword") as string;
  const confirmPassword = formData.get("confirmPassword") as string;

  const policy = validatePasswordPolicy(newPassword);
  if (!policy.valid) {
    return { error: policy.error || "Password does not meet security requirements." };
  }

  if (newPassword !== confirmPassword) {
    return { error: "New passwords do not match." };
  }

  const user = await prisma.user.findUnique({
    where: { id: authUser.id }
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

  // Update with new hashed password and revoke old sessions
  await prisma.user.update({
    where: { id: user.id },
    data: { 
      passwordHash: hashPassword(newPassword),
      mustChangePassword: false,
      tokenVersion: { increment: 1 }
    }
  });

  return { success: true, message: "Password updated successfully." };
}

/**
 * Allows the Owner to reset the password for any staff member
 */
export async function adminResetUserPasswordAction(userId: string, customPassword?: string, requireChange: boolean = true) {
  if (!(await isOwner())) return { error: "Unauthorized" };

  const user = await prisma.user.findUnique({
    where: { id: userId }
  });

  if (!user) {
    return { error: "User account not found" };
  }

  if (customPassword && customPassword.trim()) {
    const policy = validatePasswordPolicy(customPassword.trim());
    if (!policy.valid) {
      return { error: policy.error };
    }
  }

  const temporaryPassword = (customPassword && customPassword.trim().length >= 8)
    ? customPassword.trim()
    : `Rst!${randomBytes(12).toString("base64url")}`;

  const passwordHash = hashPassword(temporaryPassword);

  await prisma.user.update({
    where: { id: userId },
    data: {
      passwordHash: passwordHash,
      mustChangePassword: requireChange,
      tokenVersion: { increment: 1 }
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


