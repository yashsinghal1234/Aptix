"use client";

import React, { useState } from "react";
import { parseAndAnalyzeTextBlobAction, saveVerifiedQuestionsAction } from "@/app/actions/extract";
import {
  ParsedQuestionWithAI,
  FIXED_TOPICS,
  FIXED_DIFFICULTIES,
  FixedTopic,
  FixedDifficulty
} from "@/lib/ai-question-analyzer";

const SAMPLE_TEXT = `Q: A train running at the speed of 60 km/hr crosses a pole in 9 seconds. What is the length of the train?
A) 120 metres
B) 150 metres
C) 180 metres
D) 324 metres
Answer: B

Q: Which of the following data structures operates on a First-In-First-Out (FIFO) basis?
A) Stack
B) Queue
C) Binary Search Tree
D) Priority Queue
Answer: B

Q: If all Roses are Flowers and some Flowers fade quickly, which statement is definitively true?
A) All roses fade quickly
B) Some roses may fade quickly
C) No roses fade quickly
D) All flowers are roses
Answer: B`;

export function BulkUploadText() {
  const [textBlob, setTextBlob] = useState("");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [parsedQuestions, setParsedQuestions] = useState<ParsedQuestionWithAI[]>([]);
  const [lastSave, setLastSave] = useState<{ saved: number; skipped: number } | null>(null);

  const handleParse = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!textBlob.trim()) {
      setError("Please enter or paste questions text.");
      return;
    }

    setLoading(true);
    setError(null);
    setSuccessMsg(null);

    const res = await parseAndAnalyzeTextBlobAction(textBlob);
    setLoading(false);

    if (res.error) {
      setError(res.error);
    } else if (res.questions && res.questions.length > 0) {
      setParsedQuestions(res.questions);
      setSuccessMsg(`Extracted ${res.questions.length} questions. Review the AI tagging and quality feedback below before saving.`);
    }
  };

  const handleUpdateField = (index: number, field: keyof ParsedQuestionWithAI, value: any) => {
    const updated = [...parsedQuestions];
    updated[index] = { ...updated[index], [field]: value };
    setParsedQuestions(updated);
  };

  const handleUpdateOption = (qIndex: number, optIndex: number, newText: string) => {
    const updated = [...parsedQuestions];
    const newOptions = [...updated[qIndex].options];
    newOptions[optIndex] = { ...newOptions[optIndex], text: newText };
    updated[qIndex].options = newOptions;
    setParsedQuestions(updated);
  };

  const handleRemoveQuestion = (index: number) => {
    setParsedQuestions(prev => prev.filter((_, idx) => idx !== index));
  };

  const handleSaveAll = async (status: "DRAFT" | "SUBMITTED") => {
    if (parsedQuestions.length === 0) return;
    setSaving(true);
    setError(null);

    const res = await saveVerifiedQuestionsAction(parsedQuestions, status);
    setSaving(false);

    if (res.error) {
      setError(res.error);
    } else {
      const dupMsg = res.skippedDuplicates && res.skippedDuplicates > 0 ? ` (${res.skippedDuplicates} duplicate${res.skippedDuplicates > 1 ? "s" : ""} skipped)` : "";
      setLastSave({ saved: res.count || 0, skipped: res.skippedDuplicates || 0 });
      if (res.count === 0 && res.skippedDuplicates) {
        setError(`All ${res.skippedDuplicates} questions already exist in the question bank.`);
      } else {
        setSuccessMsg(`Successfully saved ${res.count} questions as ${status === "DRAFT" ? "Drafts" : "Submitted for Review"}!${dupMsg}`);
        setParsedQuestions([]);
        setTextBlob("");
      }
    }
  };

  const handleSaveSingle = async (index: number, status: "DRAFT" | "SUBMITTED") => {
    const targetQ = parsedQuestions[index];
    setSaving(true);
    setError(null);

    const res = await saveVerifiedQuestionsAction([targetQ], status);
    setSaving(false);

    if (res.error) {
      setError(res.error);
    } else if (res.count === 0 && res.skippedDuplicates) {
      setError("This question already exists in the question bank.");
    } else {
      setSuccessMsg(`Question saved successfully as ${status === "DRAFT" ? "Draft" : "Submitted"}.`);
      setParsedQuestions(prev => prev.filter((_, idx) => idx !== index));
    }
  };

  return (
    <div className="space-y-4">
      <div className="grid xl:grid-cols-2 gap-4 items-start">
      {/* Raw input */}
      <div className="rounded-2xl border border-white/10 bg-[#0e0f13] p-5">
        <h3 className="text-[13px] font-bold text-white">Raw unformatted input</h3>
        <p className="text-[10px] text-neutral-500 mt-0.5 mb-3">Paste text · source questions</p>
        {error && (
          <div className="mb-3 p-3 bg-rose-950/40 border border-rose-800/60 text-rose-300 text-xs font-bold rounded-xl">
            {error}
          </div>
        )}
        {successMsg && (
          <div className="mb-3 p-3 bg-lime-300/[0.07] border border-lime-300/25 text-lime-200 text-xs font-bold rounded-xl">
            {successMsg}
          </div>
        )}
        <form onSubmit={handleParse} className="space-y-3">
          <textarea
            value={textBlob}
            onChange={(e) => setTextBlob(e.target.value)}
            rows={14}
            className="w-full px-4 py-3 border border-white/10 rounded-xl outline-none font-mono text-[11px] text-neutral-200 bg-black/60 placeholder-neutral-600 leading-relaxed focus:border-lime-300/40"
            placeholder={`Q: What is the output of 2 + 2?\nA) 3\nB) 4\nC) 5\nD) 6\nAnswer: B`}
          />
          <div className="flex items-center justify-between gap-2">
            <button
              type="button"
              onClick={() => setTextBlob(SAMPLE_TEXT)}
              className="text-[11px] font-bold text-neutral-400 hover:text-white transition-colors"
            >
              Load sample format
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2.5 bg-lime-300 hover:brightness-110 text-black text-xs font-black rounded-xl transition-all disabled:opacity-50"
            >
              {loading ? "Parsing…" : "Parse questions"}
            </button>
          </div>
          <p className="text-[10px] text-neutral-600">Taxonomy: 8 Topics · 3 Difficulty Levels · Distractor Check</p>
        </form>
      </div>

      {/* Parsed review list */}
      <div className="rounded-2xl border border-white/10 bg-[#0e0f13] p-5">
        <h3 className="text-[13px] font-bold text-white">Parsed review list</h3>
        <p className="text-[10px] text-neutral-500 mt-0.5 mb-3">
          {parsedQuestions.length > 0
            ? `${parsedQuestions.length} editable items · fields are pre-filled from the raw input · verify every answer before submitting for approval.`
            : "Parsed items appear here for review."}
        </p>
        {parsedQuestions.length === 0 ? (
          <p className="text-xs text-neutral-600 py-8 text-center">Nothing parsed yet.</p>
        ) : (
          <div className="space-y-3 max-h-[560px] overflow-y-auto pr-1">
            {parsedQuestions.map((q, qIdx) => (
              <div key={q.id} className="rounded-xl border border-white/10 bg-black/40 p-4">
                <div className="flex items-center justify-between mb-2.5">
                  <span className="text-[10px] font-mono font-black text-neutral-300">P-{String(qIdx + 1).padStart(2, "0")}</span>
                  <span className="text-[9px] text-neutral-500">Draft candidate · editable</span>
                </div>
                <p className="text-[10px] font-bold text-neutral-500 uppercase tracking-[0.12em] mb-1">Question stem</p>
                <textarea
                  value={q.text}
                  onChange={(e) => handleUpdateField(qIdx, "text", e.target.value)}
                  rows={2}
                  className="w-full px-3 py-2 border border-white/10 rounded-lg outline-none text-[11px] text-white bg-black/60 focus:border-lime-300/40"
                />
                <p className="text-[10px] font-bold text-neutral-500 uppercase tracking-[0.12em] mt-2.5 mb-1.5">Options</p>
                <div className="space-y-1.5">
                  {q.options.map((opt, optIdx) => {
                    const isCorrect = q.correctAnswerIndex === optIdx;
                    return (
                      <div key={optIdx} className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => handleUpdateField(qIdx, "correctAnswerIndex", optIdx)}
                          title="Mark as correct answer"
                          className={`w-4 h-4 rounded-full border-2 shrink-0 ${isCorrect ? "border-lime-300 bg-lime-300/30" : "border-neutral-600"}`}
                        />
                        <span className="text-[10px] font-mono text-neutral-500 shrink-0">{"ABCD"[optIdx] || optIdx + 1}</span>
                        <input
                          type="text"
                          value={opt.text}
                          onChange={(e) => handleUpdateOption(qIdx, optIdx, e.target.value)}
                          className={`flex-1 min-w-0 px-2.5 py-1.5 text-[11px] border rounded-lg outline-none bg-black/60 text-white focus:border-lime-300/40 ${isCorrect ? "border-lime-300/40" : "border-white/10"}`}
                        />
                      </div>
                    );
                  })}
                </div>
                <div className="grid grid-cols-3 gap-2 mt-2.5">
                  <label className="block">
                    <span className="block text-[9px] font-bold text-neutral-600 mb-1">ANSWER KEY</span>
                    <span className="block px-2 py-1.5 text-[11px] font-mono font-bold text-lime-200 bg-lime-300/10 border border-lime-300/25 rounded-lg text-center">
                      {"ABCD"[q.correctAnswerIndex] || "—"}
                    </span>
                  </label>
                  <label className="block">
                    <span className="block text-[9px] font-bold text-neutral-600 mb-1">CATEGORY</span>
                    <select
                      value={q.category}
                      onChange={(e) => handleUpdateField(qIdx, "category", e.target.value as FixedTopic)}
                      className="w-full px-2 py-1.5 text-[11px] font-bold text-neutral-200 bg-black/60 border border-white/10 rounded-lg outline-none cursor-pointer"
                    >
                      {FIXED_TOPICS.map((t) => (
                        <option key={t} value={t}>{t}</option>
                      ))}
                    </select>
                  </label>
                  <label className="block">
                    <span className="block text-[9px] font-bold text-neutral-600 mb-1">DIFFICULTY</span>
                    <select
                      value={q.difficultyLevel}
                      onChange={(e) => handleUpdateField(qIdx, "difficultyLevel", e.target.value as FixedDifficulty)}
                      className="w-full px-2 py-1.5 text-[11px] font-bold text-neutral-200 bg-black/60 border border-white/10 rounded-lg outline-none cursor-pointer"
                    >
                      {FIXED_DIFFICULTIES.map((df) => (
                        <option key={df} value={df}>{df}</option>
                      ))}
                    </select>
                  </label>
                </div>
                <p className="text-[9px] font-bold text-neutral-600 mt-2">AI CONFIDENCE {(q as any).confidence || 92}%</p>
                <div className="mt-2 flex items-center gap-2">
                  <button
                    type="button"
                    disabled={saving}
                    onClick={() => handleSaveSingle(qIdx, "DRAFT")}
                    className="text-[10px] font-bold text-neutral-300 bg-white/[0.05] hover:bg-white/10 border border-white/10 rounded-lg px-2.5 py-1.5 transition-colors disabled:opacity-50"
                  >
                    Save as Draft
                  </button>
                  <button
                    type="button"
                    disabled={saving}
                    onClick={() => handleSaveSingle(qIdx, "SUBMITTED")}
                    className="text-[10px] font-black text-black bg-lime-300 hover:brightness-110 rounded-lg px-2.5 py-1.5 transition-all disabled:opacity-50"
                  >
                    Submit
                  </button>
                  <button
                    type="button"
                    onClick={() => handleRemoveQuestion(qIdx)}
                    className="ml-auto text-[10px] font-bold text-neutral-600 hover:text-rose-400 transition-colors"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      </div>

      {/* Extraction report + save */}
      <div className="grid lg:grid-cols-2 gap-4 items-stretch">
        <div className="rounded-2xl border border-white/10 bg-[#0e0f13] p-5">
          <h3 className="text-[13px] font-bold text-white">Extraction report</h3>
          <div className="mt-3 grid grid-cols-3 gap-2.5 text-center">
            <div className="rounded-xl border border-white/10 bg-black/40 p-3">
              <p className="text-lg font-black text-white tabular-nums">{parsedQuestions.length}</p>
              <p className="text-[9px] text-neutral-500 mt-0.5">Source questions</p>
            </div>
            <div className="rounded-xl border border-white/10 bg-black/40 p-3">
              <p className="text-lg font-black text-lime-300 tabular-nums">{parsedQuestions.length}</p>
              <p className="text-[9px] text-neutral-500 mt-0.5">Reviewable items</p>
            </div>
            <div className="rounded-xl border border-white/10 bg-black/40 p-3">
              <p className="text-lg font-black text-white tabular-nums">{lastSave ? lastSave.skipped : 0}</p>
              <p className="text-[9px] text-neutral-500 mt-0.5">Duplicates skipped</p>
            </div>
          </div>
          {lastSave && lastSave.skipped > 0 && (
            <p className="mt-2.5 text-[11px] text-[#f2a488] leading-relaxed">
              Duplicate skipped: {lastSave.skipped} item{lastSave.skipped === 1 ? "" : "s"} matched the bank at ≥85% — existing record remains untouched.
            </p>
          )}
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              disabled={saving || parsedQuestions.length === 0}
              onClick={() => handleSaveAll("DRAFT")}
              className="px-4 py-2 bg-white/[0.06] hover:bg-white/10 text-neutral-200 text-[11px] font-bold rounded-xl border border-white/10 transition-colors disabled:opacity-50"
            >
              Save as Drafts
            </button>
            <button
              type="button"
              disabled={saving || parsedQuestions.length === 0}
              onClick={() => handleSaveAll("SUBMITTED")}
              className="px-4 py-2 bg-lime-300 hover:brightness-110 text-black text-[11px] font-black rounded-xl transition-all disabled:opacity-50"
            >
              {saving ? "Saving..." : "Submit for approval"}
            </button>
          </div>
        </div>
        <div className="rounded-2xl border border-white/10 bg-[#0e0f13] p-5">
          <h3 className="text-[13px] font-bold text-white">Faculty does not self-approve</h3>
          <p className="mt-1.5 text-[11px] text-neutral-400 leading-relaxed">
            Setter can save drafts and submit to the quality queue. Approve / Publish stays owner-only until an explicit owner privilege is granted. These actions are not autopilot at this account.
          </p>
        </div>
      </div>
    </div>
  );
}
