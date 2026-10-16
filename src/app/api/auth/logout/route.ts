import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { verifyToken } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

async function handleLogout(request: Request) {
  const token = cookies().get("token")?.value;
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

  const response = NextResponse.redirect(new URL("/", request.url), 303);
  response.cookies.set("token", "", {
    path: "/",
    maxAge: 0,
    expires: new Date(0),
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
  });
  return response;
}

export async function GET(request: Request) {
  return handleLogout(request);
}

export async function POST(request: Request) {
  return handleLogout(request);
}
