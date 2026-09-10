import { cookies } from "next/headers";
import { verifyToken } from "@/lib/auth";
import { DashboardNav } from "@/components/DashboardNav";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const token = cookies().get("token")?.value;
  let role = "CANDIDATE";
  if (token) {
    const payload = await verifyToken(token);
    if (payload) role = payload.role as string;
  }
  const isOwner = role === "OWNER";

  return <DashboardNav isOwner={isOwner}>{children}</DashboardNav>;
}
