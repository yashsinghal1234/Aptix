"use server";

import { randomInt } from "crypto";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { signToken, verifyToken, requireAuth } from "@/lib/auth";
import { hashPassword, verifyPassword, validatePasswordPolicy } from "@/lib/password";
import { 
  checkRateLimit, 
  recordFailedAttempt, 
  resetRateLimit,
  getSafeClientIp,
  checkDualRateLimit,
  recordDualFailedAttempt,
  resetDualRateLimit
} from "@/lib/rate-limiter";


function formatAuthError(error: any, fallbackMessage: string): string {
  if (!error) return fallbackMessage;
  const msg = String(error?.message || error || "").toLowerCase();
  const code = String(error?.code || "").toUpperCase();
  const name = String(error?.name || "").toLowerCase();

  // 1. Missing or unconfigured DATABASE_URL
  if (!process.env.DATABASE_URL || msg.includes("environment variable not found: database_url") || msg.includes("database_url")) {
    return "Configuration error: DATABASE_URL environment variable is missing in your deployment settings.";
  }

  // 2. Authentication failure
  if (code === "P1000" || msg.includes("authentication failed")) {
    return "Database authentication failed (P1000). Check database username and password in deployment settings.";
  }

  // 3. Unreachable database host / Neon asleep or invalid host
  if (code === "P1001" || msg.includes("can't reach database server") || msg.includes("cannot reach database server")) {
    return "Database server unreachable (P1001). Please check if your Neon project is active and DATABASE_URL is set in deployment settings.";
  }

  // 4. Database does not exist
  if (code === "P1003") {
    return "Database does not exist (P1003). Please check the database name in DATABASE_URL.";
  }

  // 5. Connection lag, pool timeout or server termination
  if (
    ["P1002", "P1008", "P1017"].includes(code) ||
    name.includes("prismaclientrustpanicerror") ||
    msg.includes("etimedout") ||
    msg.includes("econnrefused") ||
    msg.includes("econnreset") ||
    msg.includes("socket hang up") ||
    msg.includes("connection closed") ||
    msg.includes("connection terminated") ||
    msg.includes("connection timeout") ||
    msg.includes("connection timed out") ||
    msg.includes("database connection") ||
    msg.includes("unable to connect to prisma")
  ) {
    return "Database service is temporarily unavailable. The server is connecting to Neon, please retry in a moment.";
  }

  if (code) {
    return `Database error [${code}]: Please retry or check deployment logs.`;
  }

  if (error?.message && !error.message.includes("PrismaClient") && !error.message.includes("\n")) {
    return error.message;
  }

  return fallbackMessage;
}

/**
 * Candidate Login Action (Zero-password, validated by Exam PIN and optional domain requirements)
 */
export async function candidateLoginAction(formData: FormData) {
  try {
    const pin = formData.get("examPin") as string;
    const name = formData.get("name") as string;
    const email = formData.get("email") as string;

    if (!pin || !pin.trim()) {
      return { field: "examPin", error: "Please enter your Exam PIN." };
    }
    if (!name || !name.trim()) {
      return { field: "name", error: "Please enter your full candidate name." };
    }
    if (!email || !email.trim()) {
      return { field: "email", error: "Please enter your email address." };
    }

    const normalizedPin = pin.trim().toUpperCase();
    const normalizedEmail = email.trim().toLowerCase();
    const ssoName = name.trim();

    // ── College SSO verification (Google Workspace, SSO-first-then-PIN) ──
    // Identity is proven by Google before any exam access. When Google OAuth
    // is configured, anonymous PIN login is disabled: the browser must hold a
    // verified Google session for the same email.
    let ssoVerified = false;
    let googleName: string | null = null;
    try {
      const { auth: ssoAuth } = await import("@/auth");
      const ssoSession = await ssoAuth().catch(() => null);
      const ssoEmail = ssoSession?.user?.email?.toLowerCase().trim();
      if (ssoEmail && ssoEmail === normalizedEmail) {
        ssoVerified = true;
        googleName = (ssoSession?.user?.name || "").trim() || null;
      }
    } catch {}

    const ssoEnforced = !!process.env.GOOGLE_CLIENT_ID;

    const trimmedName = (ssoVerified && googleName ? googleName : ssoName) || ssoName || normalizedEmail.split("@")[0];

    // ── Name Validation ────────────────────────────────────────────────────────
    // Skipped when SSO proved the identity (Google profile name is trusted).
    if (!ssoVerified) {
    // Reject obviously fake, single-word, or numeric names
    const nameWords = trimmedName.split(/\s+/).filter(Boolean);
    if (nameWords.length < 2) {
      return { field: "name", error: "Please enter your full name (First and Last name are required)." };
    }
    if (trimmedName.length < 5) {
      return { field: "name", error: "Full name must be at least 5 characters." };
    }
    if (/\d/.test(trimmedName)) {
      return { field: "name", error: "Name cannot contain numbers. Please enter your real full name." };
    }
    const FAKE_NAME_PATTERNS = ["test", "asdf", "qwerty", "admin", "user", "demo", "temp", "hello", "abc", "xxx", "dummy"];
    const lowerName = trimmedName.toLowerCase();
    if (FAKE_NAME_PATTERNS.some(p => lowerName === p || nameWords.some(w => w.toLowerCase() === p))) {
      return { field: "name", error: "Please enter your real full name as it appears on your ID." };
    }
    }
    // ──────────────────────────────────────────────────────────────────────────

    const headerList = headers();
    const clientIp = getSafeClientIp(headerList);
    const candidateTargetKey = `candidate_${normalizedPin}_${normalizedEmail}`;

    const { allowed, retryAfterSeconds, reason } = await checkDualRateLimit(clientIp, candidateTargetKey, {
      ipLimit: 80,
      ipWindowMs: 15 * 60 * 1000,
      targetLimit: 6,
      targetWindowMs: 5 * 60 * 1000
    });
    if (!allowed) {
      return {
        field: "examPin",
        error: reason === "ip_limit"
          ? `Security Lockout: High volume of attempts detected from your IP. Please wait ${retryAfterSeconds} seconds before trying again.`
          : `Security Lockout: Too many failed login attempts for this session. Please wait ${retryAfterSeconds} seconds before trying again.`
      };
    }

    // 1. Verify that session exists with this PIN
    const session = await prisma.examSession.findFirst({
      where: { pin: normalizedPin },
      include: { exam: true }
    });

    if (!session) {
      await recordDualFailedAttempt(clientIp, candidateTargetKey);
      return { 
        field: "examPin",
        error: "Exam PIN not found. Please double-check the code provided by your instructor or proctor." 
      };
    }

    if (session.status === "COMPLETED") {
      await recordDualFailedAttempt(clientIp, candidateTargetKey);
      return { 
        field: "examPin",
        error: "This examination session has already concluded and is no longer accepting submissions." 
      };
    }

    if (session.status === "CANCELLED") {
      await recordDualFailedAttempt(clientIp, candidateTargetKey);
      return { 
        field: "examPin",
        error: "This examination session has been cancelled by the proctor." 
      };
    }

    // 2. Validate institutional domain requirements
    // Explicit per-session or per-exam domain takes priority.
    // If not configured, we auto-infer from existing session candidates:
    // if real candidates already logged in with @kiet.edu, block @gmail.com/@test.com.
    const domainReq = session.allowedEmailDomain?.trim().toLowerCase() || session.exam?.allowedEmailDomain?.trim().toLowerCase();
    let effectiveDomain = domainReq ? (domainReq.startsWith("@") ? domainReq.substring(1) : domainReq) : null;

    if (!effectiveDomain) {
      // Auto-infer: find the most common email domain of existing confirmed candidates in this session
      const existingAttempts = await prisma.candidateAttempt.findMany({
        where: { examSessionId: session.id },
        include: { user: { select: { email: true } } },
        take: 5,
      });
      const domains = existingAttempts
        .map(a => a.user?.email?.split("@")[1]?.toLowerCase())
        .filter((d): d is string => !!d && d !== "test.com" && d !== "example.com");
      if (domains.length >= 2) {
        // If 2+ candidates already have the same domain, treat it as the de-facto domain
        const domainCounts: Record<string, number> = {};
        domains.forEach(d => { domainCounts[d] = (domainCounts[d] || 0) + 1; });
        const mostCommon = Object.entries(domainCounts).sort((a, b) => b[1] - a[1])[0];
        if (mostCommon && mostCommon[1] >= 2) effectiveDomain = mostCommon[0];
      }
    }

    if (effectiveDomain) {
      const emailDomain = normalizedEmail.split("@")[1];
      if (!emailDomain || (emailDomain !== effectiveDomain && !emailDomain.endsWith(`.${effectiveDomain}`))) {
        await recordDualFailedAttempt(clientIp, candidateTargetKey);
        return {
          field: "email",
          error: `Restricted Access: This exam requires a @${effectiveDomain} institutional email address.`
        };
      }
    }

    // 2b. Session allowlist (roster) enforcement - scales to 500+ without OTP emails.
    // Two paths in: (A) Google-SSO verified college email, or (B) manual
    // name+email that matches the uploaded roster for this session's PIN.
    // Empty roster + SSO configured = SSO required (open sessions stay verified).
    const rosterCount = await prisma.sessionRoster.count({ where: { examSessionId: session.id } });
    if (rosterCount > 0) {
      const allowed = await prisma.sessionRoster.findUnique({
        where: { examSessionId_email: { examSessionId: session.id, email: normalizedEmail } },
      });
      if (!allowed) {
        await recordDualFailedAttempt(clientIp, candidateTargetKey);
        return {
          field: "email",
          error: "This email is not on the approved list for this session. Contact your proctor.",
        };
      }
      if (!ssoVerified && allowed.name) {
        const norm = (s: string) => s.toLowerCase().replace(/[^a-z ]/g, " ").split(/\s+/).filter(Boolean).sort().join(" ");
        if (norm(allowed.name) && norm(trimmedName) !== norm(allowed.name)) {
          await recordDualFailedAttempt(clientIp, candidateTargetKey);
          return {
            field: "name",
            error: "Name does not match the approved list for this email. Enter your name as registered.",
          };
        }
      }
    } else if (ssoEnforced && !ssoVerified) {
      await recordDualFailedAttempt(clientIp, candidateTargetKey);
      return {
        field: "email",
        error: "Verify your college Google account first, then enter your exam PIN.",
      };
    }

    const blocked = await prisma.sessionBlocked.findUnique({
      where: { examSessionId_email: { examSessionId: session.id, email: normalizedEmail } },
    });
    if (blocked) {
      await recordDualFailedAttempt(clientIp, candidateTargetKey);
      return { field: "email", error: "You have been blocked from this session by the proctor." };
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
      // Only set candidate name if not already set (prevents student impersonation & name tampering)
      if (trimmedName && !candidate.name && candidate.role === "CANDIDATE") {
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
          shuffleSeed: randomInt(100000, 9999999),
          status: "IN_PROGRESS"
        }
      });
    }

    // 5. Sign Candidate Token bound to this specific session & attempt
    const token = await signToken({
      userId: candidate.id,
      role: "CANDIDATE",
      tokenVersion: candidate.tokenVersion ?? 0,
      examSessionId: session.id,
      attemptId: attempt.id,
      email: normalizedEmail,
      name: candidate.name,
      ssoVerified,
      emailVerified: ssoVerified || !!candidate.emailVerifiedAt,
    });

    if (ssoVerified && !candidate.emailVerifiedAt) {
      await prisma.user.update({ where: { id: candidate.id }, data: { emailVerifiedAt: new Date() } }).catch(() => {});
    }

    cookies().set("token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/"
    });

    await resetDualRateLimit(clientIp, candidateTargetKey);
    return { success: true, redirectUrl: "/?started=true" };
  } catch (error: any) {
    if (error?.digest?.startsWith("NEXT_REDIRECT") || error?.message === "NEXT_REDIRECT") {
      throw error;
    }
    console.error("Candidate login error:", error);
    return { error: formatAuthError(error, "Failed to start assessment. Please try again.") };
  }
}

/**
 * Staff / Instructor Login Action (Strictly password-protected for Owners and Setters)
 */
export async function staffLoginAction(formData: FormData) {
  try {
    const email = formData.get("email") as string;
    const password = formData.get("password") as string;
    const rememberMe = formData.get("rememberMe") === "on" || formData.get("rememberMe") === "true";

    if (!email || !email.trim()) {
      return { field: "email", error: "Please enter your staff email address." };
    }
    if (!password) {
      return { field: "password", error: "Please enter your account password." };
    }

    const normalizedEmail = email.trim().toLowerCase();

    const headerList = headers();
    const clientIp = getSafeClientIp(headerList);
    const staffTargetKey = `staff_${normalizedEmail}`;

    const { allowed, retryAfterSeconds, reason } = await checkDualRateLimit(clientIp, staffTargetKey, {
      ipLimit: 40,
      ipWindowMs: 15 * 60 * 1000,
      targetLimit: 5,
      targetWindowMs: 5 * 60 * 1000
    });
    if (!allowed) {
      return {
        field: "password",
        error: reason === "ip_limit"
          ? `IP temporarily locked due to excessive failed attempts. Please wait ${retryAfterSeconds} seconds.`
          : `Account temporarily locked due to repeated failed logins. Please wait ${retryAfterSeconds} seconds before retrying.`
      };
    }

    // 1. Authenticate Staff / Owner Accounts via Database
    const existingUser = await prisma.user.findUnique({
      where: { email: normalizedEmail }
    });

    if (!existingUser) {
      await recordDualFailedAttempt(clientIp, staffTargetKey);
      return { 
        field: "email", 
        error: "Invalid email or password." 
      };
    }

    if (existingUser.role === "CANDIDATE") {
      return { 
        field: "email", 
        error: "This email belongs to a candidate account. Please switch to the Candidate PIN portal to enter an exam." 
      };
    }

    if (existingUser.role !== "SETTER" && existingUser.role !== "OWNER") {
      return { 
        field: "email", 
        error: "Access denied. Only authorized staff and owners can access this portal." 
      };
    }

    // Verify Password against cryptographic scrypt hash
    let isValid = false;
    if (existingUser.passwordHash) {
      isValid = verifyPassword(password, existingUser.passwordHash);
    }

    if (!isValid) {
      await recordDualFailedAttempt(clientIp, staffTargetKey);
      return { field: "password", error: "Invalid email or password." };
    }

    await resetDualRateLimit(clientIp, staffTargetKey);

    const userRole = existingUser.role;

    const token = await signToken({
      userId: existingUser.id,
      role: userRole,
      tokenVersion: existingUser.tokenVersion ?? 0,
      email: normalizedEmail,
      name: existingUser.name,
      mustChangePassword: existingUser.mustChangePassword === true
    });

    cookies().set("token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      ...(rememberMe ? { maxAge: 60 * 60 * 24 * 7 } : {})
    });

    if (existingUser.mustChangePassword) {
      return { success: true, redirectUrl: "/admin/setup-password" };
    } else if (userRole === "OWNER") {
      return { success: true, redirectUrl: "/dashboard/owner" };
    } else {
      return { success: true, redirectUrl: "/dashboard/setter" };
    }
  } catch (error: any) {
    if (error?.digest?.startsWith("NEXT_REDIRECT") || error?.message === "NEXT_REDIRECT") {
      throw error;
    }
    console.error("Staff login error:", error);
    return { error: formatAuthError(error, "Authentication error occurred. Please try again.") };
  }
}

/**
 * First-Time Password Setup Action (Author sets their private password)
 */
export async function setupFirstTimePasswordAction(formData: FormData) {
  const auth = await requireAuth();
  if ("error" in auth || !auth.user) {
    return { error: "Session expired. Please log in again." };
  }

  const newPassword = (formData.get("newPassword") as string)?.trim();
  const confirmPassword = (formData.get("confirmPassword") as string)?.trim();

  const policy = validatePasswordPolicy(newPassword);
  if (!policy.valid) {
    return { error: policy.error || "Password does not meet security requirements." };
  }

  if (newPassword !== confirmPassword) {
    return { error: "Passwords do not match." };
  }

  const userId = auth.user.id;
  const user = await prisma.user.findUnique({
    where: { id: userId }
  });

  if (!user) {
    return { error: "User account not found." };
  }

  const nextVersion = (user.tokenVersion ?? 0) + 1;

  // Update password, clear mustChangePassword flag, and revoke stale sessions
  await prisma.user.update({
    where: { id: userId },
    data: {
      passwordHash: hashPassword(newPassword),
      mustChangePassword: false,
      tokenVersion: nextVersion
    }
  });

  // Issue a fresh full token without mustChangePassword flag
  const freshToken = await signToken({
    userId: user.id,
    role: user.role,
    email: user.email,
    name: user.name,
    tokenVersion: nextVersion,
    mustChangePassword: false
  });

  cookies().set("token", freshToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/"
  });

  return { 
    success: true, 
    redirectUrl: user.role === "OWNER" ? "/dashboard/owner" : "/dashboard/setter" 
  };
}

export async function logoutAction() {
  const cookieStore = cookies();
  const token = cookieStore.get("token")?.value;
  if (token) {
    try {
      const payload = await verifyToken(token);
      if (payload?.userId) {
        await prisma.user.update({
          where: { id: payload.userId as string },
          data: { tokenVersion: { increment: 1 } }
        }).catch(() => {});
      }
    } catch {}
  }

  cookieStore.set("token", "", {
    path: "/",
    expires: new Date(0),
    maxAge: 0,
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
  });
  redirect("/");
}

/**
 * Staff SSO login: exchanges a verified Google session for an Aptix staff JWT.
 * Only succeeds if the Google email already belongs to an OWNER/SETTER account.
 * Never auto-provisions staff (prevents privilege escalation).
 */
export async function staffSsoLoginAction(rememberMe = false) {
  const { auth: ssoAuth } = await import("@/auth");
  const ssoSession = await ssoAuth().catch(() => null);
  const email = ssoSession?.user?.email?.toLowerCase().trim();
  if (!email) return { error: "College Google sign-in required. Click 'Continue with college Google' first." };

  const existingUser = await prisma.user.findUnique({ where: { email } });
  if (!existingUser) return { error: "Invalid email or password." };
  if (existingUser.role !== "SETTER" && existingUser.role !== "OWNER") {
    return { error: "Access denied. Only authorized staff and owners can access this portal." };
  }

  const token = await signToken({
    userId: existingUser.id,
    role: existingUser.role,
    tokenVersion: existingUser.tokenVersion ?? 0,
    email,
    name: existingUser.name,
    ssoVerified: true,
    emailVerified: true,
    mustChangePassword: existingUser.mustChangePassword === true,
  });

  cookies().set("token", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    ...(rememberMe ? { maxAge: 60 * 60 * 24 * 7 } : {}),
  });

  if (!existingUser.emailVerifiedAt) {
    await prisma.user.update({ where: { id: existingUser.id }, data: { emailVerifiedAt: new Date() } }).catch(() => {});
  }

  if (existingUser.mustChangePassword) return { success: true, redirectUrl: "/admin/setup-password" };
  return { success: true, redirectUrl: existingUser.role === "OWNER" ? "/dashboard/owner" : "/dashboard/setter" };
}

/**
 * Returns the verified college Google identity for the current browser, if any.
 */
export async function getSsoIdentityAction() {
  const { auth: ssoAuth } = await import("@/auth");
  const ssoSession = await ssoAuth().catch(() => null);
  const email = ssoSession?.user?.email?.toLowerCase().trim();
  if (!email) return { signedIn: false as const };
  return { signedIn: true as const, email, name: ssoSession?.user?.name || null };
}

/**
 * Owner-only: Delete a fraudulent or test submission from the leaderboard.
 * Removes all candidate responses and the attempt row itself.
 */
export async function deleteAttemptAction(attemptId: string) {
  const auth = await requireAuth(["OWNER"]);
  if ("error" in auth) {
    return { error: "Forbidden: Only exam owners can delete submissions." };
  }

  try {
    await prisma.candidateResponse.deleteMany({ where: { attemptId } });
    await prisma.candidateAttempt.delete({ where: { id: attemptId } });
    return { success: true };
  } catch (err: any) {
    console.error("deleteAttemptAction error:", err);
    return { error: "Failed to delete attempt. It may already be removed." };
  }
}



