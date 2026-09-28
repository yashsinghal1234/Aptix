import { cookies } from "next/headers";
import { verifyToken } from "@/lib/auth";
import { PracticeInterface } from "@/components/PracticeInterface";

export const dynamic = "force-dynamic";

export default async function PracticePage() {
  const token = cookies().get("token")?.value;
  let candidateName = "Candidate";

  if (token) {
    const payload = await verifyToken(token);
    if (payload?.name) candidateName = payload.name as string;
  }

  return <PracticeInterface candidateName={candidateName} />;
}
