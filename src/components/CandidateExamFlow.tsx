"use client";

import { useState } from "react";
import { MascotSelector } from "@/components/MascotSelector";
import { ExamInterface } from "@/components/ExamInterface";

interface CandidateExamFlowProps {
  candidateName: string;
  session: any;
  attempt: any;
  dbQuestions: any[];
  initialAnswers: Record<string, string>;
  isGamified: boolean;
  initialMascotId: string | null;
}

export function CandidateExamFlow({
  candidateName,
  session,
  attempt,
  dbQuestions,
  initialAnswers,
  isGamified,
  initialMascotId,
}: CandidateExamFlowProps) {
  // If exam is gamified and candidate hasn't chosen a mascot yet, show selector
  const [mascotId, setMascotId] = useState<string | null>(initialMascotId);
  const needsMascotSelection = isGamified && !mascotId;

  if (needsMascotSelection) {
    return (
      <MascotSelector
        candidateName={candidateName}
        sessionId={session.id}
        examTitle={session.exam?.title}
        examMeta={`${session.questions?.length ?? dbQuestions.length} questions · ${session.durationMinutes} minutes`}
        onConfirm={(chosenId) => setMascotId(chosenId)}
      />
    );
  }

  return (
    <ExamInterface
      candidateName={candidateName}
      session={session}
      attempt={attempt}
      dbQuestions={dbQuestions}
      initialAnswers={initialAnswers}
      mascotId={mascotId}
      isGamified={isGamified}
    />
  );
}
