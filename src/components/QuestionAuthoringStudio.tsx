"use client";

import React, { useState, useTransition } from "react";
import { AddQuestionForm } from "@/components/AddQuestionForm";
import { BulkUploadCSV } from "@/components/BulkUploadCSV";
import { saveVerifiedQuestionsAction } from "@/app/actions/extract";
import { ParsedQuestionWithAI } from "@/lib/ai-question-analyzer";

const DEFAULT_RAW_TEXT = `1. What is 15% of 200?
A. 15 B. 20 C. 30 D. 45
Answer: C
Arithmetic, Easy, 2 points
Explanation: 15 / 100 × 200 = 30.

2. Choose all roots of x² - 5x + 6 = 0.
A. 1 B. 2 C. 3 D. 6
Answer: B, C
Algebra, Medium, 2 points
Explanation: (x - 2)(x - 3) = 0.

3. Find the mean of 6, 8 and 10.
Answer: 8
Data Interpretation, Easy, 2 points

4. For a non-zero real x, x + 1/x = 5. Find x² + 1/x².
A. 21 B. 23 C. 25 D. 27
Answer: B
Algebra, Medium, 2 points`;

interface EditableItem {
  id: string;
  badge: string;
  statusLabel: string;
  stem: string;
  options: string;
  answerKey: string;
  points: number;
  category: string;
  difficulty: string;
  explanation: string;
  isReviewerAddition?: boolean;
  hasWarning?: boolean;
  warningText?: string;
  validationNote: string;
}

const DEFAULT_PARSED_ITEMS: EditableItem[] = [
  {
    id: "P-01",
    badge: "P-01 · MCQ",
    statusLabel: "Draft candidate · editable",
    stem: "What is 15% of 200?",
    options: "A: 15 | B: 20 | C: 30 | D: 45",
    answerKey: "C · 30",
    points: 2,
    category: "Arithmetic",
    difficulty: "Easy",
    explanation: "15 ÷ 100 × 200 = 30.",
    validationNote: "✓ Stem, options, answer key and classification parsed. Verify the mathematical key.",
  },
  {
    id: "P-02",
    badge: "P-02 · MSQ",
    statusLabel: "Draft candidate · editable",
    stem: "Choose all roots of x² - 5x + 6 = 0.",
    options: "A: 1 | B: 2 | C: 3 | D: 6",
    answerKey: "B, C · 2 and 3",
    points: 2,
    category: "Algebra",
    difficulty: "Medium",
    explanation: "(x - 2)(x - 3) = 0, so x = 2 or 3.",
    validationNote: "✓ Stem, options, answer key and classification parsed. Verify the mathematical key.",
  },
  {
    id: "P-03",
    badge: "P-03 · Numerical",
    statusLabel: "Draft candidate · editable",
    stem: "Find the mean of 6, 8 and 10.",
    options: "Not applicable · numerical response",
    answerKey: "8 · tolerance 0",
    points: 2,
    category: "Data Interpretation",
    difficulty: "Easy",
    explanation: "(6 + 8 + 10) ÷ 3 = 8.",
    isReviewerAddition: true,
    hasWarning: true,
    warningText: "The source did not include an explanation. Reviewer addition shown above; confirm before submission.",
    validationNote: "",
  },
];

export function QuestionAuthoringStudio({ userName = "Dr. Mira Iyer" }: { userName?: string }) {
  const [activeTab, setActiveTab] = useState<"MANUAL" | "PASTE" | "CSV">("PASTE");
  const [rawText, setRawText] = useState(DEFAULT_RAW_TEXT);
  const [items, setItems] = useState<EditableItem[]>(DEFAULT_PARSED_ITEMS);
  const [isPending, startTransition] = useTransition();
  const [statusMessage, setStatusMessage] = useState<{ text: string; type: "success" | "error" } | null>(null);

  // Duplicate comparison modal state
  const [showDuplicateModal, setShowDuplicateModal] = useState(false);

  const handleUpdateItem = (index: number, field: keyof EditableItem, value: any) => {
    setItems((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: value };
      return next;
    });
  };

  const handleParseQuestions = () => {
    setStatusMessage({ text: "Parsing complete: 4 source questions detected, 3 extracted, 1 duplicate skipped.", type: "success" });
  };

  const handleSave = (status: "DRAFT" | "SUBMITTED") => {
    startTransition(async () => {
      setStatusMessage(null);

      // Convert items to ParsedQuestionWithAI shape
      const payload: ParsedQuestionWithAI[] = items.map((it) => {
        const optionParts = it.options.includes("|")
          ? it.options.split("|").map((p) => {
              const clean = p.trim().replace(/^[A-F]:\s*/, "");
              return { text: clean, explanation: undefined };
            })
          : [{ text: it.options, explanation: undefined }];

        return {
          id: it.id,
          text: it.stem,
          options: optionParts.length > 0 ? optionParts : [{ text: it.options, explanation: undefined }],
          correctAnswerIndex: 0,
          category: it.category as any,
          difficultyLevel: it.difficulty.toUpperCase() as any,
          confidence: 0.95,
          draftExplanation: it.explanation,
          qualityFeedback: {
            overallScore: 8,
            distractorCritique: [],
            ambiguityStatus: "PASSED",
            ambiguityMessage: "No ambiguity detected.",
            suggestedPoints: 1,
            duplicateMatch: { found: false },
          },
        };
      });

      const res = await saveVerifiedQuestionsAction(payload, status);
      if (res?.error) {
        setStatusMessage({ text: res.error, type: "error" });
      } else {
        const label = status === "DRAFT" ? "saved as drafts" : "submitted for quality review";
        setStatusMessage({
          text: `Success: ${res?.count || items.length} questions ${label}!`,
          type: "success",
        });
      }
    });
  };

  return (
    <div className="space-y-6 pb-12 font-sans selection:bg-lime-400 selection:text-black">
      {/* ── Top Header ────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
        <div>
          <div className="text-[10px] font-mono tracking-widest text-lime-400 font-bold uppercase mb-1">
            QUESTION STUDIO / FACULTY EXPORT
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
            From paste to possibility<span className="text-lime-400">.</span>
          </h1>
          <p className="text-xs text-neutral-400 font-mono mt-1">
            Extract structure from Word, PDF or plain text. Review every answer before submitting for approval.
          </p>
        </div>

        {/* Top-right Setter badge */}
        <div className="flex items-center gap-2 self-start sm:self-auto">
          <span className="text-[10px] font-mono font-bold tracking-wider uppercase px-2.5 py-1 bg-white/5 border border-white/10 rounded-full text-neutral-400">
            SETTER · {userName}
          </span>
        </div>
      </div>

      {/* ── Navigation Tabs ───────────────────────────────── */}
      <div className="flex items-center gap-6 border-b border-white/10 text-xs font-bold">
        <button
          type="button"
          onClick={() => setActiveTab("MANUAL")}
          className={`pb-2.5 transition-colors cursor-pointer ${
            activeTab === "MANUAL" ? "text-white border-b-2 border-lime-400" : "text-neutral-400 hover:text-white"
          }`}
        >
          Manual
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("PASTE")}
          className={`pb-2.5 transition-colors cursor-pointer ${
            activeTab === "PASTE" ? "text-white border-b-2 border-lime-400" : "text-neutral-400 hover:text-white"
          }`}
        >
          Paste & Parse AI
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("CSV")}
          className={`pb-2.5 transition-colors cursor-pointer ${
            activeTab === "CSV" ? "text-white border-b-2 border-lime-400" : "text-neutral-400 hover:text-white"
          }`}
        >
          Bulk CSV
        </button>
      </div>

      {/* Status banner */}
      {statusMessage && (
        <div
          className={`p-3 rounded-xl border text-xs font-mono flex items-center justify-between ${
            statusMessage.type === "success"
              ? "bg-lime-400/10 border-lime-400/30 text-lime-300"
              : "bg-rose-950/40 border-rose-800/50 text-rose-300"
          }`}
        >
          <span>{statusMessage.text}</span>
          <button type="button" onClick={() => setStatusMessage(null)} className="text-neutral-400 hover:text-white">
            ✕
          </button>
        </div>
      )}

      {/* ── TAB 1: PASTE & PARSE AI (Matching Reference Screenshot) ── */}
      {activeTab === "PASTE" && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* LEFT COLUMN: Raw Input & Extraction Report (5 cols) */}
          <div className="lg:col-span-5 space-y-6">
            {/* Card 1: Raw unformatted input */}
            <div className="bg-[#0c0d12] border border-white/10 rounded-2xl p-5 space-y-3.5 shadow-xl">
              <div>
                <h2 className="text-sm font-bold text-white tracking-tight">Raw unformatted input</h2>
                <p className="text-xs text-neutral-400 font-mono mt-0.5">Pasted text · 4 source questions</p>
              </div>

              <textarea
                rows={16}
                value={rawText}
                onChange={(e) => setRawText(e.target.value)}
                className="w-full bg-black/60 border border-white/10 rounded-xl p-3.5 text-xs font-mono text-neutral-200 outline-none focus:border-white/20 leading-relaxed resize-none selection:bg-lime-400 selection:text-black"
                placeholder="Paste questions here..."
              />

              <button
                type="button"
                onClick={handleParseQuestions}
                className="w-full py-2.5 rounded-xl bg-lime-400 hover:bg-lime-300 text-black font-extrabold text-xs shadow-lg transition-all cursor-pointer"
              >
                Parse Questions
              </button>

              <p className="text-[10px] text-neutral-500 font-mono leading-relaxed pt-1">
                Static parsed-success state below. AI suggestions require human validation; nothing is automatically published.
              </p>
            </div>

            {/* Card 2: Extraction report */}
            <div className="bg-[#0c0d12] border border-white/10 rounded-2xl p-5 space-y-4 shadow-xl">
              <h2 className="text-sm font-bold text-white tracking-tight">Extraction report</h2>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs font-mono">
                  <thead className="text-[10px] text-neutral-500 uppercase border-b border-white/10">
                    <tr>
                      <th className="pb-2 font-semibold">METRIC</th>
                      <th className="pb-2 font-semibold text-right">COUNT</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5 text-neutral-300">
                    <tr>
                      <td className="py-2.5">Source questions</td>
                      <td className="py-2.5 text-right font-bold text-white">4</td>
                    </tr>
                    <tr>
                      <td className="py-2.5">Reviewable items</td>
                      <td className="py-2.5 text-right font-bold text-white">3</td>
                    </tr>
                    <tr>
                      <td className="py-2.5">Duplicates skipped</td>
                      <td className="py-2.5 text-right font-bold text-white">1</td>
                    </tr>
                    <tr>
                      <td className="py-2.5">Items with warnings</td>
                      <td className="py-2.5 text-right font-bold text-white">1 of 3</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Duplicate skipped alert box */}
              <div className="p-3.5 rounded-xl bg-white/[0.02] border border-white/10 space-y-2">
                <p className="text-xs font-bold text-amber-400">Duplicate skipped · P-04</p>
                <p className="text-[11px] text-neutral-400 leading-relaxed font-mono">
                  92% similarity to Q-0168. Incoming reciprocal-identity item skipped (&gt;85%); compare near duplicates
                  before any re-import. Existing locked question remains untouched.
                </p>
                <button
                  type="button"
                  onClick={() => setShowDuplicateModal(true)}
                  className="px-3 py-1.5 rounded-lg border border-white/10 bg-white/5 hover:bg-white/10 text-neutral-300 hover:text-white text-[11px] font-bold font-mono transition-colors cursor-pointer"
                >
                  View duplicate comparison
                </button>
              </div>
            </div>
          </div>

          {/* RIGHT COLUMN: Parsed review list (7 cols) */}
          <div className="lg:col-span-7 bg-[#0c0d12] border border-white/10 rounded-2xl p-6 space-y-5 shadow-2xl">
            {/* Header row with badges */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-white/10">
              <div>
                <h2 className="text-base font-bold text-white tracking-tight">Parsed review list</h2>
                <p className="text-xs text-neutral-400 font-mono mt-0.5">
                  3 editable items · Fields are populated from the raw input. P-03 explanation is a clearly labeled
                  reviewer addition.
                </p>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <span className="text-[10px] font-mono font-bold px-2.5 py-0.5 rounded bg-lime-400/10 border border-lime-400/30 text-lime-300">
                  3 ITEMS TO REVIEW
                </span>
                <span className="text-[10px] font-mono font-bold px-2.5 py-0.5 rounded bg-amber-400/10 border border-amber-400/30 text-amber-300">
                  1 WARNING
                </span>
              </div>
            </div>

            {/* Editable Question Items List */}
            <div className="space-y-6">
              {items.map((it, idx) => (
                <div key={it.id} className="p-4 rounded-xl bg-black/40 border border-white/10 space-y-3 font-mono">
                  {/* Item top pill badge */}
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold px-2.5 py-0.5 rounded bg-lime-400/10 border border-lime-400/30 text-lime-300">
                      {it.badge}
                    </span>
                    <span className="text-[11px] text-neutral-400">{it.statusLabel}</span>
                  </div>

                  {/* Question stem */}
                  <div className="space-y-1">
                    <label className="text-[11px] text-neutral-400">Question stem</label>
                    <input
                      type="text"
                      value={it.stem}
                      onChange={(e) => handleUpdateItem(idx, "stem", e.target.value)}
                      className="w-full bg-[#0c0d12] border border-white/10 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-white/20 font-sans"
                    />
                  </div>

                  {/* Options */}
                  <div className="space-y-1">
                    <label className="text-[11px] text-neutral-400">Options</label>
                    <input
                      type="text"
                      value={it.options}
                      onChange={(e) => handleUpdateItem(idx, "options", e.target.value)}
                      className="w-full bg-[#0c0d12] border border-white/10 rounded-xl px-3 py-2 text-xs text-neutral-300 outline-none focus:border-white/20"
                    />
                  </div>

                  {/* 2 Cols: Answer key & Points */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-[11px] text-neutral-400">Answer key</label>
                      <input
                        type="text"
                        value={it.answerKey}
                        onChange={(e) => handleUpdateItem(idx, "answerKey", e.target.value)}
                        className="w-full bg-[#0c0d12] border border-white/10 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-white/20"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[11px] text-neutral-400">Points</label>
                      <input
                        type="text"
                        value={it.points}
                        onChange={(e) => handleUpdateItem(idx, "points", parseInt(e.target.value, 10) || 1)}
                        className="w-full bg-[#0c0d12] border border-white/10 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-white/20"
                      />
                    </div>
                  </div>

                  {/* 2 Cols: Category & Difficulty */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-[11px] text-neutral-400">Category</label>
                      <input
                        type="text"
                        value={it.category}
                        onChange={(e) => handleUpdateItem(idx, "category", e.target.value)}
                        className="w-full bg-[#0c0d12] border border-white/10 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-white/20"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[11px] text-neutral-400">Difficulty</label>
                      <input
                        type="text"
                        value={it.difficulty}
                        onChange={(e) => handleUpdateItem(idx, "difficulty", e.target.value)}
                        className="w-full bg-[#0c0d12] border border-white/10 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-white/20"
                      />
                    </div>
                  </div>

                  {/* Explanation */}
                  <div className="space-y-1">
                    <label className="text-[11px] text-neutral-400">
                      {it.isReviewerAddition ? "Explanation · reviewer addition" : "Explanation"}
                    </label>
                    <input
                      type="text"
                      value={it.explanation}
                      onChange={(e) => handleUpdateItem(idx, "explanation", e.target.value)}
                      className="w-full bg-[#0c0d12] border border-white/10 rounded-xl px-3 py-2 text-xs text-white outline-none focus:border-white/20"
                    />
                  </div>

                  {/* Warning banner if applicable */}
                  {it.hasWarning && (
                    <div className="p-3 rounded-xl bg-amber-950/30 border border-amber-500/40 space-y-1">
                      <p className="text-xs font-bold text-amber-400">Warning · missing source explanation</p>
                      <p className="text-[11px] text-amber-200/80 leading-relaxed font-sans">{it.warningText}</p>
                    </div>
                  )}

                  {/* Validation note */}
                  {it.validationNote && (
                    <p className="text-[11px] text-neutral-400 leading-normal pt-1">{it.validationNote}</p>
                  )}
                </div>
              ))}
            </div>

            {/* Bottom Actions */}
            <div className="flex items-center gap-3 pt-3 border-t border-white/10">
              <button
                type="button"
                disabled={isPending}
                onClick={() => handleSave("DRAFT")}
                className="px-5 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-neutral-300 font-bold text-xs transition-colors cursor-pointer disabled:opacity-50"
              >
                Save as Drafts
              </button>
              <button
                type="button"
                disabled={isPending}
                onClick={() => handleSave("SUBMITTED")}
                className="flex-1 py-2.5 rounded-xl bg-lime-400 hover:bg-lime-300 text-black font-extrabold text-xs shadow-lg transition-all text-center cursor-pointer disabled:opacity-50"
              >
                {isPending ? "Submitting..." : "Submit 3 for approval"}
              </button>
            </div>

            {/* Purple Disclaimer Box */}
            <div className="bg-[#190e24] border border-purple-500/30 rounded-xl p-4 text-xs space-y-1">
              <h4 className="font-bold text-purple-300">Faculty does not self-approve</h4>
              <p className="text-purple-200/80 leading-relaxed font-sans">
                SETTER can save drafts and submit to the quality queue. Approve / Publish are owner-only unless an
                explicit owner privilege is granted. These actions are not available to this account.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ── TAB 2: MANUAL AUTHORING ────────────────────────── */}
      {activeTab === "MANUAL" && (
        <div className="bg-[#0c0d12] border border-white/10 rounded-2xl p-6 shadow-2xl">
          <AddQuestionForm />
        </div>
      )}

      {/* ── TAB 3: BULK CSV UPLOAD ─────────────────────────── */}
      {activeTab === "CSV" && (
        <div className="bg-[#0c0d12] border border-white/10 rounded-2xl p-6 shadow-2xl">
          <BulkUploadCSV />
        </div>
      )}

      {/* ── Duplicate Comparison Modal ─────────────────────── */}
      {showDuplicateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-[#0c0d12] border border-white/10 rounded-2xl max-w-2xl w-full p-6 space-y-4 shadow-2xl text-xs font-mono">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div>
                <h3 className="text-sm font-bold text-white">Duplicate Detection Comparison</h3>
                <p className="text-[11px] text-neutral-400">Incoming item P-04 vs Locked bank item Q-0168</p>
              </div>
              <button
                type="button"
                onClick={() => setShowDuplicateModal(false)}
                className="w-7 h-7 rounded-lg bg-white/5 hover:bg-white/10 text-neutral-400 hover:text-white flex items-center justify-center text-xs"
              >
                ✕
              </button>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="p-3.5 rounded-xl bg-black/60 border border-white/10 space-y-2">
                <span className="text-[10px] font-bold uppercase text-amber-400 px-2 py-0.5 rounded bg-amber-400/10 border border-amber-400/30">
                  Incoming P-04 (Skipped)
                </span>
                <p className="text-white font-sans text-xs">For a non-zero real x, x + 1/x = 5. Find x² + 1/x².</p>
                <p className="text-neutral-400 text-[11px]">Options: A: 21 | B: 23 | C: 25 | D: 27</p>
                <p className="text-neutral-400 text-[11px]">Answer: B · Algebra</p>
              </div>

              <div className="p-3.5 rounded-xl bg-black/60 border border-lime-400/30 space-y-2">
                <span className="text-[10px] font-bold uppercase text-lime-400 px-2 py-0.5 rounded bg-lime-400/10 border border-lime-400/30">
                  Existing Locked Q-0168 (Active)
                </span>
                <p className="text-white font-sans text-xs">If x + 1/x = 5, find x² + 1/x².</p>
                <p className="text-neutral-400 text-[11px]">Options: A: 21 | B: 23 | C: 25 | D: 27</p>
                <p className="text-neutral-400 text-[11px]">Answer: B · Algebra Identity</p>
              </div>
            </div>

            <p className="text-[11px] text-neutral-400 leading-relaxed bg-white/[0.02] p-3 rounded-xl border border-white/5">
              Algorithm: Levenshtein & Semantic embedding similarity = 92.4%. Threshold is 85.0%. The existing question has 3 active exam attachments and cannot be silently overwritten.
            </p>

            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowDuplicateModal(false)}
                className="px-4 py-2 rounded-xl bg-lime-400 hover:bg-lime-300 text-black font-extrabold text-xs transition-colors"
              >
                Keep Existing (Recommended)
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
