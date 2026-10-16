import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import { prisma } from "@/lib/prisma";

const ALLOWED_DOMAINS = (process.env.SSO_ALLOWED_DOMAINS || "kiet.edu")
  .split(",")
  .map((d) => d.trim().toLowerCase().replace(/^@/, ""))
  .filter(Boolean);

function domainOf(email: string) {
  return email.toLowerCase().split("@")[1] || "";
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  trustHost: true,
  secret: process.env.AUTH_SECRET || process.env.JWT_SECRET,
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID || "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || "",
      authorization: {
        params: {
          prompt: "select_account",
          hd: ALLOWED_DOMAINS[0] || undefined,
        } as Record<string, string>,
      },
    }),
  ],
  callbacks: {
    async signIn({ account, profile }) {
      if (account?.provider !== "google") return false;
      const p = profile as unknown as {
        email?: string;
        email_verified?: boolean;
        hd?: string;
        name?: string;
        sub?: string;
      } | null;
      const email = (p?.email || "").toLowerCase().trim();
      if (!email || p?.email_verified !== true) return false;
      const hd = (p?.hd || "").toLowerCase();
      const dom = domainOf(email);
      const okDomain = ALLOWED_DOMAINS.includes(dom) || (hd && ALLOWED_DOMAINS.includes(hd));
      if (!okDomain) return "/?sso_error=domain";
      try {
        const existing = await prisma.user.findUnique({ where: { email } });
        if (!existing) {
          await prisma.user.create({
            data: {
              email,
              name: (p?.name || email.split("@")[0]).slice(0, 120),
              role: "CANDIDATE",
              emailVerifiedAt: new Date(),
              googleId: p?.sub || null,
            },
          });
        } else {
          const patch: Record<string, unknown> = {};
          if (!existing.emailVerifiedAt) patch.emailVerifiedAt = new Date();
          if (p?.sub && (existing as unknown as Record<string, unknown>).googleId !== p.sub) {
            patch.googleId = p.sub;
          }
          if (Object.keys(patch).length > 0) {
            await prisma.user.update({ where: { email }, data: patch as never });
          }
        }
      } catch {
        return false;
      }
      return true;
    },
    async session({ session }) {
      return session;
    },
  },
});
