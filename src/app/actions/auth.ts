"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { signToken, verifyToken } from "@/lib/auth";
import { hashPassword, verifyPassword } from "@/lib/password";

const OWNER_EMAILS = ["admin@aptix.com", "singhalyash307@gmail.com"];
const DEFAULT_OWNER_PASSWORD = "282007@aA";

/**
 * Candidate Login Action (Zero-password, validated by Exam PIN and optional domain requirements)
 */
export async function candidateLoginAction(formData: FormData) {
  try {
    const pin = formData.get("examPin") as string;
    const name = formData.get("name") as string;
    const email = formData.get("email") as string;

    if (!pin || !pin.trim()) {
      return { error: "Please enter a valid Exam PIN." };
    }
    if (!name || !name.trim()) {
      return { error: "Please enter your full name." };
    }
    if (!email || !email.trim()) {
      return { error: "Please enter your email address." };
    }

    const normalizedPin = pin.trim().toUpperCase();
    const normalizedEmail = email.trim().toLowerCase();
    const trimmedName = name.trim();

    // 1. Verify that active session exists with this PIN
    const session = await prisma.examSession.findFirst({
      where: {
        pin: normalizedPin,
        status: { in: ["SCHEDULED", "LIVE"] }
      },
      include: { exam: true }
    });

    if (!session) {
      return { error: "Invalid or expired Exam PIN. Please check the code with your instructor." };
    }

    // 2. Validate institutional domain requirements if configured for this assessment
    const domainReq = session.allowedEmailDomain?.trim().toLowerCase() || session.exam?.allowedEmailDomain?.trim().toLowerCase();
    if (domainReq) {
      const cleanDomain = domainReq.startsWith("@") ? domainReq.substring(1) : domainReq;
      const emailDomain = normalizedEmail.split("@")[1];
      
      if (!emailDomain || (emailDomain !== cleanDomain && !emailDomain.endsWith(`.${cleanDomain}`))) {
        return { 
          error: `Institutional access restricted. Your email must end with @${cleanDomain} (e.g. yourname@${cleanDomain}).` 
        };
      }
    }

    // 3. Find or create candidate User
    let candidate = await prisma.user.findUnique({
      where: { email: normalizedEmail }
    });

    if (!candidate) {
      candidate = await prisma.user.create({
        data: {
          name: trimmedName,
          email: normalizedEmail,
          role: "CANDIDATE"
        }
      });
    } else {
      // Update candidate name if provided
      if (trimmedName && candidate.name !== trimmedName && candidate.role === "CANDIDATE") {
        candidate = await prisma.user.update({
          where: { id: candidate.id },
          data: { name: trimmedName }
        });
      }
    }

    // 4. Find or create candidate attempt for this specific session
    let attempt = await prisma.candidateAttempt.findFirst({
      where: {
        userId: candidate.id,
        examSessionId: session.id
      }
    });

    if (!attempt) {
      attempt = await prisma.candidateAttempt.create({
        data: {
          userId: candidate.id,
          examSessionId: session.id,
          shuffleSeed: Math.floor(Math.random() * 1000000),
          status: "IN_PROGRESS"
        }
      });
    }

    // 5. Sign Candidate Token bound to this specific session & attempt
    const token = await signToken({
      userId: candidate.id,
      role: "CANDIDATE",
      examSessionId: session.id,
      attemptId: attempt.id,
      email: normalizedEmail,
      name: candidate.name
    });

    cookies().set("token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/"
    });

    redirect("/?started=true");
  } catch (error: any) {
    if (error?.digest?.startsWith("NEXT_REDIRECT") || error?.message === "NEXT_REDIRECT") {
      throw error;
    }
    console.error("Candidate login error:", error);
    return { error: error?.message || "Failed to start assessment. Please check database connection." };
  }
}

/**
 * Staff / Instructor Login Action (Strictly password-protected for Owners and Setters)
 */
export async function staffLoginAction(formData: FormData) {
  try {
    const email = formData.get("email") as string;
    const password = formData.get("password") as string;

    if (!email || !email.trim()) {
      return { error: "Email address is required." };
    }
    if (!password) {
      return { error: "Password is required." };
    }

    const normalizedEmail = email.trim().toLowerCase();

    // 1. Check Owner Accounts
    if (OWNER_EMAILS.includes(normalizedEmail)) {
      let ownerUser = await prisma.user.findUnique({
        where: { email: normalizedEmail }
      });

      let isValid = false;
      if (ownerUser?.passwordHash) {
        isValid = verifyPassword(password, ownerUser.passwordHash) || password === DEFAULT_OWNER_PASSWORD;
      } else {
        isValid = password === DEFAULT_OWNER_PASSWORD;
      }

      if (!isValid) {
        return { error: "Invalid staff credentials." };
      }

      // Auto-seed/update password hash and role
      if (!ownerUser) {
        ownerUser = await prisma.user.create({
          data: {
            name: normalizedEmail.split("@")[0].toUpperCase(),
            email: normalizedEmail,
            role: "OWNER",
            passwordHash: hashPassword(password)
          }
        });
      } else if (ownerUser.role !== "OWNER" || !ownerUser.passwordHash) {
        ownerUser = await prisma.user.update({
          where: { email: normalizedEmail },
          data: { role: "OWNER", passwordHash: hashPassword(password) }
        });
      }

      const token = await signToken({
        userId: ownerUser.id,
        role: "OWNER",
        email: normalizedEmail,
        name: ownerUser.name
      });

      cookies().set("token", token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/"
      });

      redirect("/dashboard/owner");
    }

    // 2. Check Authorized Setters
    const setter = await prisma.user.findFirst({
      where: { email: normalizedEmail, role: "SETTER" }
    });

    if (!setter) {
      return { error: "No staff account found with this email. Please contact the administrator." };
    }

    let isSetterValid = false;
    if (setter.passwordHash) {
      isSetterValid = verifyPassword(password, setter.passwordHash);
    } else {
      isSetterValid = password === DEFAULT_OWNER_PASSWORD;
    }

    if (!isSetterValid) {
      return { error: "Invalid staff credentials." };
    }

    if (!setter.passwordHash) {
      await prisma.user.update({
        where: { id: setter.id },
        data: { passwordHash: hashPassword(password) }
      });
    }

    const token = await signToken({
      userId: setter.id,
      role: "SETTER",
      email: normalizedEmail,
      name: setter.name,
      mustChangePassword: setter.mustChangePassword === true
    });

    cookies().set("token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/"
    });

    if (setter.mustChangePassword) {
      redirect("/admin/setup-password");
    } else {
      redirect("/dashboard/setter");
    }
  } catch (error: any) {
    if (error?.digest?.startsWith("NEXT_REDIRECT") || error?.message === "NEXT_REDIRECT") {
      throw error;
    }
    console.error("Staff login error:", error);
    return { error: error?.message || "Authentication error occurred. Please check database connection." };
  }
}

/**
 * First-Time Password Setup Action (Author sets their private password)
 */
export async function setupFirstTimePasswordAction(formData: FormData) {
  const token = cookies().get("token")?.value;
  if (!token) {
    return { error: "Session expired. Please log in again." };
  }

  const payload = await verifyToken(token);
  if (!payload || !payload.userId) {
    return { error: "Session invalid. Please log in again." };
  }

  const newPassword = (formData.get("newPassword") as string)?.trim();
  const confirmPassword = (formData.get("confirmPassword") as string)?.trim();

  if (!newPassword || newPassword.length < 6) {
    return { error: "Password must be at least 6 characters long." };
  }

  if (newPassword !== confirmPassword) {
    return { error: "Passwords do not match." };
  }

  const userId = payload.userId as string;
  const user = await prisma.user.findUnique({
    where: { id: userId }
  });

  if (!user) {
    return { error: "User account not found." };
  }

  // Update password and clear mustChangePassword flag
  await prisma.user.update({
    where: { id: userId },
    data: {
      passwordHash: hashPassword(newPassword),
      mustChangePassword: false
    }
  });

  // Issue a fresh full token without mustChangePassword flag
  const freshToken = await signToken({
    userId: user.id,
    role: user.role,
    email: user.email,
    name: user.name,
    mustChangePassword: false
  });

  cookies().set("token", freshToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/"
  });

  redirect(user.role === "OWNER" ? "/dashboard/owner" : "/dashboard/setter");
}

export async function logoutAction() {
  cookies().delete("token");
  redirect("/");
}


