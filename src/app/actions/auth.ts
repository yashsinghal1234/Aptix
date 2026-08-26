"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { signToken } from "@/lib/auth";

const OWNER_EMAILS = ["admin@aptix.com", "singhalyash307@gmail.com"];

export async function loginAction(formData: FormData) {
  const name = formData.get("name") as string;
  const email = formData.get("email") as string;

  if (!email || !name) {
    return { error: "Name and email are required" };
  }

  const normalizedEmail = email.toLowerCase();

  let role = "CANDIDATE";
  let userId = "0";

  // 1. Check if Owner
  if (OWNER_EMAILS.includes(normalizedEmail)) {
    role = "OWNER";
    let ownerUser = await prisma.user.findUnique({
      where: { email: normalizedEmail }
    });
    if (!ownerUser) {
      ownerUser = await prisma.user.create({
        data: { name, email: normalizedEmail, role: "OWNER" }
      });
    } else if (ownerUser.role !== "OWNER") {
      ownerUser = await prisma.user.update({
        where: { email: normalizedEmail },
        data: { role: "OWNER" }
      });
    }
    userId = ownerUser.id;
  } else {
    // 2. Check if Setter
    const setter = await prisma.user.findFirst({
      where: { email: normalizedEmail, role: "SETTER" }
    });

    if (setter) {
      role = "SETTER";
      userId = setter.id;
    } else {
      // 3. Candidate
      let candidate = await prisma.user.findUnique({
        where: { email: normalizedEmail }
      });

      if (!candidate) {
        candidate = await prisma.user.create({
          data: { name, email: normalizedEmail, role: "CANDIDATE" }
        });
      }
      userId = candidate.id;
    }
  }

  const token = await signToken({ userId, role, email: normalizedEmail, name });
  
  cookies().set("token", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/"
  });
  
  if (role === "OWNER") redirect("/dashboard/owner");
  if (role === "SETTER") redirect("/dashboard/setter");
  
  // Force full refresh to clear current state and trigger ProctoringWrapper
  redirect("/?started=true");
}

export async function logoutAction() {
  cookies().delete("token");
  redirect("/");
}
