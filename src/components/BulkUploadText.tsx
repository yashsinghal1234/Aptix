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
    <div className="space-y-8">
      {/* Paste & Extract Input Box */}
      <div className="bg-[#0a0c10] p-6 rounded-3xl border border-neutral-800 shadow-2xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
          <div>
            <h3 className="font-extrabold text-white text-lg">AI Paste & Parse Extractor</h3>
            <p className="text-xs text-neutral-400 mt-0.5">
              Paste questions in standard text format. The AI engine applies fixed taxonomy tagging, distractor quality audits, and duplicate checks.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setTextBlob(SAMPLE_TEXT)}
            className="text-xs font-bold text-neutral-300 hover:text-white bg-neutral-900 hover:bg-neutral-800 px-3 py-1.5 rounded-xl border border-neutral-800 transition-colors w-fit"
          >
            Load Sample Format
          </button>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-rose-950/40 border border-rose-800/60 text-rose-300 text-xs font-bold rounded-xl flex items-center gap-2">
            <svg className="w-4 h-4 shrink-0 text-rose-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
            {error}
          </div>
        )}

        {successMsg && (
          <div className="mb-4 p-3 bg-emerald-950/40 border border-emerald-800/60 text-emerald-300 text-xs font-bold rounded-xl flex items-center gap-2">
            <svg className="w-4 h-4 shrink-0 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path></svg>
            {successMsg}
          </div>
        )}

        <form onSubmit={handleParse} className="space-y-4">
          <div>
            <textarea
              value={textBlob}
              onChange={(e) => setTextBlob(e.target.value)}
              rows={8}
              className="w-full px-4 py-3 border border-neutral-800 rounded-xl focus:ring-1 focus:ring-neutral-700 outline-none font-mono text-xs text-white bg-neutral-900 placeholder-neutral-600 leading-relaxed"
              placeholder={`Q: What is the output of 2 + 2?\nA) 3\nB) 4\nC) 5\nD) 6\nAnswer: B`}
            />
          </div>

          <div className="flex items-center justify-between">
            <span className="text-[11px] text-neutral-500 font-medium">
              Taxonomy: 8 Topics &bull; 3 Difficulty Levels &bull; Distractor Check
            </span>
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-2.5 bg-white hover:bg-neutral-200 text-black text-xs font-bold rounded-xl shadow-md transition-all flex items-center gap-2 disabled:opacity-50"
            >
              {loading ? (
                <>
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-black" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Analyzing & Tagging...
                </>
              ) : (
                <>
                  <svg className="w-4 h-4 text-black" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path></svg>
                  Parse & Run AI Quality Check →
                </>
              )}
            </button>
          </div>
        </form>
      </div>

      {/* Parsed Questions & AI Quality Feedback Deck */}
      {parsedQuestions.length > 0 && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[#0d0f14] text-white p-5 rounded-2xl border border-neutral-800 shadow-md">
            <div>
              <h4 className="font-extrabold text-base tracking-tight text-white">
                Review & Confirm ({parsedQuestions.length} Questions Extracted)
              </h4>
              <p className="text-xs text-neutral-400 mt-0.5">
                AI has auto-classified topics and audited distractor quality. You can edit any field or accept directly.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={saving}
                onClick={() => handleSaveAll("DRAFT")}
                className="px-4 py-2 bg-neutral-900 hover:bg-neutral-800 text-neutral-300 text-xs font-bold rounded-xl border border-neutral-800 transition-colors disabled:opacity-50"
              >
                Save All as Drafts
              </button>
              <button
                type="button"
                disabled={saving}
                onClick={() => handleSaveAll("SUBMITTED")}
                className="px-4 py-2 bg-white hover:bg-neutral-200 text-black text-xs font-black rounded-xl shadow transition-colors disabled:opacity-50"
              >
                {saving ? "Saving..." : "Accept & Submit All"}
              </button>
            </div>
          </div>

          <div className="space-y-6">
            {parsedQuestions.map((q, qIdx) => (
              <div
                key={q.id}
                className="bg-[#0a0c10] rounded-3xl border border-neutral-800 shadow-2xl overflow-hidden transition-all"
              >
                {/* Card Header with AI Tagging Pills */}
                <div className="bg-[#07080c] px-6 py-4 border-b border-neutral-800 flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <span className="w-7 h-7 rounded-xl bg-neutral-800 text-white text-xs font-black flex items-center justify-center border border-neutral-700 shadow-sm">
                      {qIdx + 1}
                    </span>
                    <span className="text-xs font-extrabold text-white uppercase tracking-wider">
                      Question #{qIdx + 1}
                    </span>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    {/* Fixed Topic Selector */}
                    <div className="flex items-center gap-1.5 bg-neutral-900 px-2.5 py-1 rounded-xl border border-neutral-800">
                      <span className="text-[10px] font-bold text-neutral-500 uppercase">Topic:</span>
                      <select
                        value={q.category}
                        onChange={(e) => handleUpdateField(qIdx, "category", e.target.value as FixedTopic)}
                        className="text-xs font-bold text-neutral-200 bg-transparent outline-none cursor-pointer"
                      >
                        {FIXED_TOPICS.map((topic) => (
                          <option key={topic} value={topic} className="bg-neutral-900 text-white">
                            {topic}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Fixed Difficulty Selector */}
                    <div className="flex items-center gap-1.5 bg-neutral-900 px-2.5 py-1 rounded-xl border border-neutral-800">
                      <span className="text-[10px] font-bold text-neutral-500 uppercase">Difficulty:</span>
                      <select
                        value={q.difficultyLevel}
                        onChange={(e) => handleUpdateField(qIdx, "difficultyLevel", e.target.value as FixedDifficulty)}
                        className="text-xs font-bold text-neutral-200 bg-transparent outline-none cursor-pointer"
                      >
                        {FIXED_DIFFICULTIES.map((diff) => (
                          <option key={diff} value={diff} className="bg-neutral-900 text-white">
                            {diff}
                          </option>
                        ))}
                      </select>
                    </div>

                    <span className="text-[11px] font-bold text-emerald-400 bg-emerald-950/60 px-2.5 py-1 rounded-xl border border-emerald-500/30">
                      {q.confidence}% AI Confidence
                    </span>
                  </div>
                </div>

                <div className="p-6 space-y-6">
                  {/* Question Stem */}
                  <div>
                    <label className="block text-xs font-bold text-neutral-400 uppercase tracking-wider mb-1.5">
                      Question Stem
                    </label>
                    <textarea
                      value={q.text}
                      onChange={(e) => handleUpdateField(qIdx, "text", e.target.value)}
                      rows={3}
                      className="w-full px-4 py-2.5 border border-neutral-800 rounded-xl focus:ring-1 focus:ring-neutral-700 outline-none text-sm font-medium text-white bg-neutral-900 placeholder-neutral-600"
                    />
                  </div>

                  {/* Options & Correct Answer Radio */}
                  <div>
                    <div className="flex justify-between items-center mb-2">
                      <label className="block text-xs font-bold text-neutral-400 uppercase tracking-wider">
                        Options (Select Radio for Correct Answer)
                      </label>
                      <span className="text-[11px] text-neutral-500 font-medium">
                        Correct: Option {String.fromCharCode(65 + q.correctAnswerIndex)}
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {q.options.map((opt, optIdx) => {
                        const isCorrect = q.correctAnswerIndex === optIdx;
                        return (
                          <div
                            key={optIdx}
                            onClick={() => handleUpdateField(qIdx, "correctAnswerIndex", optIdx)}
                            className={`p-3.5 rounded-2xl border transition-all cursor-pointer flex items-center gap-3 ${
                              isCorrect
                                ? "border-emerald-500/60 bg-emerald-950/30"
                                : "border-neutral-800 hover:border-neutral-700 bg-[#0d0f14]"
                            }`}
                          >
                            <div className="flex items-center justify-center">
                              <input
                                type="radio"
                                name={`correct_${q.id}`}
                                checked={isCorrect}
                                onChange={() => handleUpdateField(qIdx, "correctAnswerIndex", optIdx)}
                                className="w-4 h-4 text-emerald-500 focus:ring-emerald-500 cursor-pointer accent-emerald-500"
                              />
                            </div>
                            <span className="w-6 h-6 rounded-lg bg-neutral-800 text-neutral-200 text-xs font-bold flex items-center justify-center shrink-0 border border-neutral-700">
                              {String.fromCharCode(65 + optIdx)}
                            </span>
                            <input
                              type="text"
                              value={opt.text}
                              onClick={(e) => e.stopPropagation()}
                              onChange={(e) => handleUpdateOption(qIdx, optIdx, e.target.value)}
                              className="w-full text-xs font-medium text-white bg-transparent outline-none border-b border-transparent focus:border-neutral-600"
                            />
                            {isCorrect && (
                              <span className="text-[10px] font-extrabold text-emerald-400 bg-emerald-950/80 border border-emerald-500/30 px-2 py-0.5 rounded-full shrink-0">
                                Correct
                              </span>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* AI Draft Explanation */}
                  <div>
                    <label className="block text-xs font-bold text-neutral-400 uppercase tracking-wider mb-1.5">
                      Draft Explanation (Why this is correct)
                    </label>
                    <textarea
                      value={q.draftExplanation}
                      onChange={(e) => handleUpdateField(qIdx, "draftExplanation", e.target.value)}
                      rows={2}
                      className="w-full px-4 py-2 border border-neutral-800 rounded-xl focus:ring-1 focus:ring-neutral-700 outline-none text-xs font-medium text-white bg-neutral-900 placeholder-neutral-600"
                      placeholder="Step-by-step reasoning for candidates..."
                    />
                  </div>

                  {/* AI Quality & Sanity Audit Feedback Card */}
                  <div className="bg-[#0d0f14] p-4 rounded-2xl border border-neutral-800 space-y-3">
                    <div className="flex items-center justify-between border-b border-neutral-800 pb-2">
                      <div className="flex items-center gap-2">
                        <svg className="w-4 h-4 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"></path></svg>
                        <span className="text-xs font-black text-white uppercase tracking-wide">
                          AI Item Quality & Sanity Audit
                        </span>
                      </div>
                      <span className="text-xs font-extrabold text-emerald-400 bg-emerald-950/60 border border-emerald-500/30 px-2.5 py-0.5 rounded-full">
                        Health Score: {q.qualityFeedback.overallScore}/10
                      </span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
                      {/* Distractor Quality */}
                      <div className="bg-neutral-900 p-3 rounded-xl border border-neutral-800">
                        <span className="font-bold text-neutral-200 block mb-1 flex items-center gap-1.5">
                          <svg className="w-3.5 h-3.5 text-neutral-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                          </svg>
                          Distractor Health:
                        </span>
                        <ul className="text-neutral-400 space-y-1 text-[11px] list-disc list-inside">
                          {q.qualityFeedback.distractorCritique.map((c, i) => (
                            <li key={i}>{c}</li>
                          ))}
                        </ul>
                      </div>

                      {/* Ambiguity Check */}
                      <div className="bg-neutral-900 p-3 rounded-xl border border-neutral-800">
                        <span className="font-bold text-neutral-200 block mb-1 flex items-center gap-1.5">
                          <svg className="w-3.5 h-3.5 text-neutral-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 6l3 1m0 0l-3 9a5.002 5.002 0 006.001 0M6 7l3 9M6 7l6-2m6 2l3-1m-3 1l-3 9a5.002 5.002 0 006.001 0M18 7l3 9m-3-9l-6-2m0-2v2m0 16V5m0 16H9m3 0h3" />
                          </svg>
                          Ambiguity Check:
                        </span>
                        <div className="flex items-center gap-1.5 mb-1">
                          <span
                            className={`w-2 h-2 rounded-full ${
                              q.qualityFeedback.ambiguityStatus === "PASSED" ? "bg-emerald-400" : "bg-amber-400"
                            }`}
                          />
                          <span
                            className={`font-bold text-[11px] ${
                              q.qualityFeedback.ambiguityStatus === "PASSED" ? "text-emerald-400" : "text-amber-400"
                            }`}
                          >
                            {q.qualityFeedback.ambiguityStatus === "PASSED" ? "Single Valid Answer" : "Ambiguity Warning"}
                          </span>
                        </div>
                        <p className="text-neutral-400 text-[11px] leading-tight">
                          {q.qualityFeedback.ambiguityMessage}
                        </p>
                      </div>

                      {/* Duplicate Bank Check */}
                      <div className="bg-neutral-900 p-3 rounded-xl border border-neutral-800">
                        <span className="font-bold text-neutral-200 block mb-1 flex items-center gap-1.5">
                          <svg className="w-3.5 h-3.5 text-neutral-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                          </svg>
                          Question Bank Duplication:
                        </span>
                        {q.qualityFeedback.duplicateMatch.found ? (
                          <div className="text-amber-400 text-[11px] font-medium leading-tight flex items-center gap-1.5">
                            <svg className="w-3.5 h-3.5 text-amber-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                            </svg>
                            <span>Similar question already in bank ({q.qualityFeedback.duplicateMatch.similarityScore}% match).</span>
                          </div>
                        ) : (
                          <div className="text-emerald-400 text-[11px] font-medium flex items-center gap-1.5">
                            <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"></path></svg>
                            Unique item (No duplicates found).
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Single Question Actions */}
                  <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                    <button
                      type="button"
                      onClick={() => handleRemoveQuestion(qIdx)}
                      className="text-xs font-bold text-rose-400 hover:text-rose-300 hover:bg-rose-950/40 px-3 py-1.5 rounded-xl transition-colors"
                    >
                      Delete / Skip
                    </button>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        disabled={saving}
                        onClick={() => handleSaveSingle(qIdx, "DRAFT")}
                        className="px-3.5 py-1.5 bg-neutral-900 hover:bg-neutral-800 text-neutral-300 text-xs font-bold rounded-xl border border-neutral-800 transition-colors disabled:opacity-50"
                      >
                        Save as Draft
                      </button>
                      <button
                        type="button"
                        disabled={saving}
                        onClick={() => handleSaveSingle(qIdx, "SUBMITTED")}
                        className="px-4 py-1.5 bg-white hover:bg-neutral-200 text-black text-xs font-bold rounded-xl shadow-sm transition-colors disabled:opacity-50"
                      >
                        Accept & Submit for Review →
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
