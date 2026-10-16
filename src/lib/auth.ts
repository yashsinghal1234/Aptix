import { jwtVerify, SignJWT } from "jose";

const getJwtSecretKey = () => {
  const secret = process.env.JWT_SECRET;
  if (!secret || secret.trim().length < 32) {
    throw new Error("CRITICAL SECURITY CONFIGURATION ERROR: JWT_SECRET must be set and at least 32 characters long in all environments.");
  }
  return new TextEncoder().encode(secret);
};

export async function signToken(payload: any, expiresIn: string = "24h") {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuer("aptix")
    .setAudience("aptix-users")
    .setJti(crypto.randomUUID())
    .setIssuedAt()
    .setExpirationTime(expiresIn)
    .sign(getJwtSecretKey());
}

export async function verifyToken(token: string) {
  try {
    const { payload } = await jwtVerify(token, getJwtSecretKey(), {
      issuer: "aptix",
      audience: "aptix-users",
    });
    return payload;
  } catch (error) {
    return null;
  }
}

/**
 * Generates a 6-character high-entropy PIN using CSPRNG (crypto.randomInt)
 * Alphabet (32 chars) ^ 6 chars = ~1.07 billion combinations (1000x stronger than 4-char)
 */
export function generateSessionPin(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const array = new Uint32Array(6);
  crypto.getRandomValues(array);
  let code = "";
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(array[i] % chars.length);
  }
  return `APT-${code}`;
}

/**
 * Validates the caller's JWT token against the database tokenVersion and checks required roles.
 * Returns { user, payload } on success, or throws/returns { error } on failure.
 */
export async function requireAuth(allowedRoles?: string[], explicitToken?: string) {
  let token = explicitToken;
  if (!token) {
    try {
      const { cookies } = await import("next/headers");
      token = cookies().get("token")?.value;
    } catch {
      // In contexts where next/headers cookies() is not available
    }
  }

  if (!token) return { error: "Unauthorized: Missing session token" };

  const payload = await verifyToken(token);
  if (!payload || !payload.userId) return { error: "Unauthorized: Invalid or expired session token" };

  try {
    const { prisma } = await import("@/lib/prisma");
    const user = await prisma.user.findUnique({
      where: { id: payload.userId as string },
      select: { id: true, email: true, role: true, tokenVersion: true, name: true }
    });

    if (!user) return { error: "Unauthorized: User account no longer exists" };

    // Revocation check: verify tokenVersion matches database
    const tokenVersionInJwt = typeof payload.tokenVersion === "number" ? payload.tokenVersion : 0;
    if (tokenVersionInJwt !== (user.tokenVersion ?? 0)) {
      return { error: "Unauthorized: Session has been revoked. Please log in again." };
    }

    // Role check if specified
    if (allowedRoles && allowedRoles.length > 0 && !allowedRoles.includes(user.role)) {
      return { error: `Forbidden: Requires one of [${allowedRoles.join(", ")}] permissions` };
    }

    return { user, payload };
  } catch (err: any) {
    // Graceful fallback for non-Node/edge contexts: enforce token payload role
    const userRole = (payload.role as string) || "CANDIDATE";
    if (allowedRoles && allowedRoles.length > 0 && !allowedRoles.includes(userRole)) {
      return { error: `Forbidden: Requires one of [${allowedRoles.join(", ")}] permissions` };
    }

    return {
      user: {
        id: payload.userId as string,
        email: (payload.email as string) || "",
        role: userRole,
        tokenVersion: (payload.tokenVersion as number) ?? 0,
        name: (payload.name as string) || ""
      },
      payload
    };
  }
}


