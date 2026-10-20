"use client";

import { useState, useRef, useEffect } from "react";
import { createTemplateAction } from "@/app/actions/template";
import { useRouter } from "next/navigation";
import { FIXED_TOPICS, FIXED_DIFFICULTIES } from "@/lib/ai-question-analyzer";
import { ExamTemplateReviewModal } from "@/components/ExamTemplateReviewModal";
import * as XLSX from "xlsx";

const DRAFT_KEY = "aptix_template_draft_v1";

interface DraftState {
  fields: Record<string, string>;
  checks: Record<string, boolean>;
  rules: { id: string; category: string; difficultyLevel: string; count: number }[];
  selectedIds: string[];
  selectionMode: string;
  marksPerQuestion: string;
}

const DEFAULT_FIELDS: Record<string, string> = {
  title: "",
  subject: "",
  description: "",
  instructions: "",
  allowedEmailDomain: "",
  passCriteria: "50",
  negativeMarksValue: "0.25",
  durationMinutes: "60",
  defaultStartWindowHours: "1",
  maxAttempts: "1",
  tabSwitchLimit: "5",
  questionDisplayMode: "ONE_AT_A_TIME",
  resultVisibility: "IMMEDIATE",
  selectionMode: "MANUAL",
};

const DEFAULT_CHECKS: Record<string, boolean> = {
  negativeMarkingEnabled: false,
  partialCreditEnabled: false,
  allowQuestionSkip: true,
  allowAnswerReview: true,
  allowBackNavigation: true,
  showCorrectAnswers: true,
  showExplanation: false,
  requireFullscreen: true,
  disableCopyPaste: true,
  isGamified: false,
  enableStreakHighlights: false,
};

function loadDraft(): DraftState | null {
  try {
    const raw = localStorage.getItem(DRAFT_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

/* ── Controls ────────────────────────────────────── */

function Switch({
  name,
  checked,
  defaultChecked,
  onChange,
}: {
  name: string;
  checked?: boolean;
  defaultChecked?: boolean;
  onChange?: (v: boolean) => void;
}) {
  const [internalOn, setInternalOn] = useState(!!defaultChecked);
  const on = checked !== undefined ? checked : internalOn;

  const toggle = () => {
    const next = !on;
    if (checked === undefined) {
      setInternalOn(next);
    }
    onChange?.(next);
  };

  return (
    <div className="relative inline-flex items-center shrink-0">
      <input type="hidden" name={name} value={on ? "on" : "off"} />
      <button
        type="button"
        role="switch"
        aria-checked={on}
        onClick={toggle}
        className={`relative inline-block w-9 h-5 rounded-full transition-colors cursor-pointer ${on ? "bg-lime-300" : "bg-white/15"}`}
      >
        <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-black transition-all ${on ? "left-[18px]" : "left-0.5"}`} />
      </button>
    </div>
  );
}

function LockedSwitch({ on, label, hint }: { on: boolean; label: string; hint?: string }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <div>
        <p className="text-xs font-bold text-neutral-200">{label}</p>
        {hint && <p className="text-[10px] text-neutral-500 mt-0.5">{hint}</p>}
      </div>
      <span title="Follows the Gamified Mode master switch" className={`relative w-9 h-5 rounded-full shrink-0 ${on ? "bg-lime-300" : "bg-white/15"}`}>
        <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-black transition-all ${on ? "left-[18px]" : "left-0.5"}`} />
      </span>
    </div>
  );
}

function Segmented<T extends string>({
  name,
  options,
  value,
  defaultValue,
  onChange,
}: {
  name: string;
  options: { value: T; label: string }[];
  value?: T;
  defaultValue?: T;
  onChange?: (v: T) => void;
}) {
  const [internalVal, setInternalVal] = useState<T>((defaultValue ?? options[0]?.value) as T);
  const val = value !== undefined ? value : internalVal;

  return (
    <div className="flex flex-wrap gap-1.5">
      {options.map((o) => (
        <label key={o.value} className="cursor-pointer">
          <input
            type="radio"
            name={name}
            value={o.value}
            checked={val === o.value}
            onChange={() => {
              if (value === undefined) {
                setInternalVal(o.value);
              }
              onChange?.(o.value);
            }}
            className="peer sr-only"
          />
          <span className="inline-block text-[10px] font-black tracking-wide px-3 py-1.5 rounded-lg border transition-all peer-checked:bg-lime-300 peer-checked:text-black peer-checked:border-lime-300 bg-white/[0.04] border-white/10 text-neutral-400 hover:text-white">
            {o.label}
          </span>
        </label>
      ))}
    </div>
  );
}

/* ── Shared styles ───────────────────────────────── */
const INPUT =
  "w-full px-4 py-3 text-xs bg-black/60 border border-white/10 rounded-xl outline-none transition-all font-medium text-white placeholder-neutral-600 hover:border-white/20 focus:border-lime-300/50";
const LABEL = "block text-[10px] font-bold text-neutral-500 uppercase tracking-[0.14em] mb-1.5";
const CARD = "rounded-2xl border border-white/10 bg-[#0e0f13] p-5 sm:p-7";

const STEPS = [
  "Basic information",
  "Question strategy",
  "Scoring, timing & navigation",
];

/* ── Form ────────────────────────────────────────── */

export function CreateTemplateForm({ allQuestions }: { allQuestions: any[] }) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const isLoadedRef = useRef(false);

  const [step, setStep] = useState(0);
  const [fields, setFields] = useState<Record<string, string>>(() => {
    if (typeof window !== "undefined") {
      const saved = loadDraft();
      if (saved?.fields) return { ...DEFAULT_FIELDS, ...saved.fields };
    }
    return DEFAULT_FIELDS;
  });

  const [checks, setChecks] = useState<Record<string, boolean>>(() => {
    if (typeof window !== "undefined") {
      const saved = loadDraft();
      if (saved?.checks) return { ...DEFAULT_CHECKS, ...saved.checks };
    }
    return DEFAULT_CHECKS;
  });

  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => {
    if (typeof window !== "undefined") {
      const saved = loadDraft();
      if (saved?.selectedIds) return new Set(saved.selectedIds);
    }
    return new Set();
  });

  // Roster (approved students) upload state
  const [rosterMsg, setRosterMsg] = useState<string | null>(null);
  const [rosterCount, setRosterCount] = useState<number>(0);
  const rosterPreview = (fields.rosterText || "").trim().split("\n").filter(Boolean);

  const handleRosterFile = async (file: File) => {
    setRosterMsg(null);
    try {
      const buf = await file.arrayBuffer();
      const wb = XLSX.read(buf, { type: "array" });
      const ws = wb.Sheets[wb.SheetNames[0]];
      let rows = XLSX.utils.sheet_to_json<unknown[]>(ws, { header: 1, blankrows: false });
      const cellText = (c: unknown): string => {
        if (c == null) return "";
        if (typeof c === "object") return String((c as { v?: unknown }).v ?? "").trim();
        return String(c).trim();
      };
      const isEmail = (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);

      // Header-aware column detection: find the Email column, then a Name column
      // (anything else in the sheet — remarks, roll numbers, phone, dates — is ignored)
      let emailCol = -1;
      let nameCol = -1;
      if (rows.length > 0 && Array.isArray(rows[0])) {
        const header: string[] = rows[0].map(cellText);
        emailCol = header.findIndex((h) => /e-?mail|mail/i.test(h));
        nameCol = header.findIndex((h) => /\bfull\s*name\b|\bname\b|student|candidate/i.test(h) && !/e-?mail|mail/i.test(h));
        if (emailCol !== -1) rows = rows.slice(1).filter((r) => Array.isArray(r));
      }

      const lines: string[] = [];
      for (const row of rows) {
        if (!Array.isArray(row)) continue;
        let email = "";
        let name = "";

        if (emailCol !== -1) {
          // Header-based mode: read strictly from the detected columns
          const ev = cellText(row[emailCol]);
          if (isEmail(email = ev.toLowerCase()) === false) continue;
          if (nameCol !== -1 && nameCol !== emailCol && cellText(row[nameCol])) {
            name = cellText(row[nameCol]);
          }
        } else {
          // No recognizable header: scan each cell; first valid email = email,
          // last cell that looks like a human name = name
          for (const v0 of row) {
            const v = cellText(v0);
            if (!v) continue;
            if (!email && isEmail(v)) {
              email = v.toLowerCase();
            } else if (email && !isEmail(v) && !/^\d+(\.\d+)?$/.test(v) && v.length <= 60) {
              name = v;
            }
          }
        }
        if (!email) continue;
        lines.push(name ? `${email},${name}` : email);
      }
      const uniq = Array.from(new Set(lines));
      if (uniq.length === 0) {
        setRosterMsg("No valid email addresses found in the file.");
        setRosterCount(0);
        return;
      }
      updateField("rosterText", uniq.join("\n"));
      setRosterCount(uniq.length);
      setRosterMsg(`${uniq.length} student${uniq.length === 1 ? "" : "s"} imported from ${file.name}. Only the Email and Name columns were read.`);
    } catch {
      setRosterMsg("Could not read the file — use an .xlsx or .csv with one student per row.");
      setRosterCount(0);
    }
  };

  const [rules, setRules] = useState<{ id: string; category: string; difficultyLevel: string; count: number }[]>(() => {
    if (typeof window !== "undefined") {
      const saved = loadDraft();
      if (saved?.rules) return saved.rules;
    }
    return [];
  });

  const [selectionMode, setSelectionMode] = useState<string>(() => {
    if (typeof window !== "undefined") {
      const saved = loadDraft();
      if (saved?.selectionMode) return saved.selectionMode;
      if (saved?.fields?.selectionMode) return saved.fields.selectionMode;
    }
    return "MANUAL";
  });

  const [marksPerQuestion, setMarksPerQuestion] = useState<string>(() => {
    if (typeof window !== "undefined") {
      const saved = loadDraft();
      if (saved?.marksPerQuestion) return saved.marksPerQuestion;
      if (saved?.fields?.marksPerQuestion) return saved.fields.marksPerQuestion;
    }
    return "1";
  });

  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [savingDraft, setSavingDraft] = useState(false);
  const [showReviewModal, setShowReviewModal] = useState(false);

  const [filterTopic, setFilterTopic] = useState("");
  const [filterDiff, setFilterDiff] = useState("");
  const [query, setQuery] = useState("");
  const [qPage, setQPage] = useState(0);
  const Q_PER = 6;

  // Read-only question info drawer (like the question bank drawer, but info only)
  const [detailId, setDetailId] = useState<string | null>(null);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setDetailId(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const detailQ = detailId ? allQuestions.find((q) => q.id === detailId) || null : null;

  const parseQuestionDetail = (q: any) => {
    let options: string[] = [];
    let optionImages: (string | null)[] = [];
    let optionCorrect: string | undefined;
    let optionExplanation: string | undefined;
    try {
      const parsed = JSON.parse(q.options || "[]");
      options = parsed.map((o: any) => {
        if (typeof o === "string") {
          optionImages.push(null);
          return o;
        }
        if (o.isCorrect && !optionCorrect) optionCorrect = o.text;
        if (o.explanation && !optionExplanation) optionExplanation = o.explanation;
        optionImages.push(o.imageUrl || null);
        return o.text;
      });
    } catch {}
    let ans: any = {};
    try {
      ans = JSON.parse(q.answerData || "{}");
    } catch {}
    return {
      options,
      optionImages,
      correctAnswer: ans.correctAnswer ?? (ans.exact !== undefined ? String(ans.exact) : optionCorrect),
      correctAnswers: ans.correctAnswers ?? (ans.acceptedAnswers ?? undefined),
      explanation: ans.explanation ?? optionExplanation,
    };
  };

  const updateField = (name: string, val: string) => {
    setFields((prev) => ({ ...prev, [name]: val }));
  };

  const updateCheck = (name: string, val: boolean) => {
    setChecks((prev) => ({ ...prev, [name]: val }));
  };

  // Subject-first creation: picking a blueprint subject auto-filters the
  // question pool to that subject's bank.
  useEffect(() => {
    const sub = (fields.subject || "").trim().toLowerCase();
    if (!sub) return;
    const match = allCategories.find((c) => c.toLowerCase() === sub);
    if (match && match !== filterTopic) {
      setFilterTopic(match);
      setQPage(0);
    }
  }, [fields.subject]);
  // Restore draft from browser localStorage on initial mount
  useEffect(() => {
    const saved = loadDraft();
    if (saved) {
      if (saved.fields) setFields((prev) => ({ ...prev, ...saved.fields }));
      if (saved.checks) setChecks((prev) => ({ ...prev, ...saved.checks }));
      if (saved.rules) setRules(saved.rules);
      if (saved.selectedIds) setSelectedIds(new Set(saved.selectedIds));
      if (saved.selectionMode) setSelectionMode(saved.selectionMode);
      if (saved.marksPerQuestion) setMarksPerQuestion(saved.marksPerQuestion);
    }
    isLoadedRef.current = true;
  }, []);

  // Auto-save draft on any user change
  useEffect(() => {
    if (!isLoadedRef.current || typeof window === "undefined") return;
    try {
      const hasAnyContent =
        !!fields.title ||
        !!fields.subject ||
        !!fields.description ||
        !!fields.instructions ||
        !!fields.allowedEmailDomain ||
        rules.length > 0 ||
        selectedIds.size > 0;

      if (hasAnyContent) {
        const draftData: DraftState = {
          fields,
          checks,
          rules,
          selectedIds: Array.from(selectedIds),
          selectionMode: fields.selectionMode || selectionMode,
          marksPerQuestion,
        };
        localStorage.setItem(DRAFT_KEY, JSON.stringify(draftData));
      }
    } catch {}
  }, [fields, checks, rules, selectedIds, selectionMode, marksPerQuestion]);

  /* derived */
  const filteredQuestions = allQuestions.filter((q) => {
    if (filterTopic && q.category !== filterTopic) return false;
    if (filterDiff && q.difficultyLevel !== filterDiff) return false;
    if (query && !`${q.text} ${q.id}`.toLowerCase().includes(query.toLowerCase())) return false;
    return true;
  });
  const qPages = Math.max(1, Math.ceil(filteredQuestions.length / Q_PER));
  const qShown = filteredQuestions.slice(qPage * Q_PER, qPage * Q_PER + Q_PER);
  const selectedCount = selectedIds.size;
  const selectedShown = filteredQuestions.filter((q) => selectedIds.has(q.id)).length;

  const approvedFor = (category: string, difficulty: string) =>
    allQuestions.filter((q) => q.category === category && q.difficultyLevel === difficulty).length;

  const rulesDemand = rules.reduce((a, r) => a + (Number(r.count) || 0), 0);
  const totalQuestions = selectedCount + rulesDemand;
  const mpq = parseFloat(marksPerQuestion) || 0;
  const maxMarks = Math.round(totalQuestions * mpq * 100) / 100;
  const shortfall = rules.filter((r) => (Number(r.count) || 0) > approvedFor(r.category, r.difficultyLevel));
  const poolReady = rules.length > 0 && shortfall.length === 0;

  /* handlers */
  const allCategories = Array.from(
    new Set([
      ...allQuestions.map((q) => q.category).filter(Boolean),
      ...FIXED_TOPICS,
    ])
  ).sort();

  const toggleQuestion = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };
  const addRule = () => {
    setRules((r) => [...r, { id: Math.random().toString(), category: allCategories[0] || FIXED_TOPICS[0], difficultyLevel: "MEDIUM", count: 5 }]);
  };
  const updateRule = (id: string, field: string, value: string | number) => {
    setRules((rs) => rs.map((r) => (r.id === id ? { ...r, [field]: value } : r)));
  };
  const removeRule = (id: string) => {
    setRules((rs) => rs.filter((r) => r.id !== id));
  };

  const collectDraft = (): DraftState => {
    return {
      fields,
      checks,
      rules,
      selectedIds: Array.from(selectedIds),
      selectionMode: fields.selectionMode || selectionMode,
      marksPerQuestion,
    };
  };

  const saveDraft = () => {
    setSavingDraft(true);
    try {
      localStorage.setItem(DRAFT_KEY, JSON.stringify(collectDraft()));
    } catch {}
    setSavingDraft(false);
  };

  const handleOpenReview = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!fields.title.trim()) {
      setError("Please enter an assessment title.");
      setStep(0);
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }
    if (selectedIds.size === 0 && rules.length === 0) {
      setError("Please select at least one fixed question or add at least one auto-pick rule.");
      setStep(1);
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }
    setError(null);
    setShowReviewModal(true);
  };

  const executeFinalSubmit = async () => {
    setLoading(true);
    setError(null);

    const formData = formRef.current ? new FormData(formRef.current) : new FormData();
    // Explicitly enforce state fields and checks into formData so nothing can ever desync
    Object.entries(fields).forEach(([k, v]) => {
      formData.set(k, v || "");
    });
    Object.entries(checks).forEach(([k, v]) => {
      if (v) formData.set(k, "on");
      else formData.delete(k);
    });
    formData.set("marksPerQuestion", marksPerQuestion);
    // Derive selection strategy from what the owner actually built — no manual mode switcher
    formData.set(
      "selectionMode",
      rules.length > 0 && selectedIds.size > 0 ? "HYBRID" : rules.length > 0 ? "RULE_BASED" : "MANUAL"
    );
    formData.set("totalMarks", String(maxMarks));

    const cleanedRules = rules.map(({ category, difficultyLevel, count }) => ({ category, difficultyLevel, count }));

    const res = await createTemplateAction(formData, Array.from(selectedIds), cleanedRules);

    if (res.error) {
      setError(res.error);
      setLoading(false);
    } else {
      try {
        localStorage.removeItem(DRAFT_KEY);
      } catch {}
      setShowReviewModal(false);
      const target = res.templateId
        ? `/dashboard/owner?highlight=${res.templateId}#templates`
        : `/dashboard/owner#templates`;
      router.push(target);
    }
  };

  const goStep = (n: number) => {
    setStep(Math.max(0, Math.min(STEPS.length - 1, n)));
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const currentSelectionMode = fields.selectionMode || selectionMode;
  const isGamified = !!checks.isGamified;
  const negOn = !!checks.negativeMarkingEnabled;

  return (
    <form ref={formRef} onSubmit={handleOpenReview} noValidate className="pb-24">
      {/* Header */}
      <div className="px-1 pt-1">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div>
            <h1 className="text-3xl sm:text-[40px] font-black text-white tracking-tight leading-none">
              Build a better assessment<span className="text-lime-300">.</span>
            </h1>
          </div>
          <div className="flex gap-2 shrink-0">
            <button
              type="button"
              onClick={saveDraft}
              disabled={savingDraft}
              className="px-5 py-2.5 text-xs font-bold text-neutral-200 bg-white/[0.05] hover:bg-white/10 border border-white/10 rounded-xl transition-all disabled:opacity-50"
            >
              {savingDraft ? "Saving…" : "Save Draft"}
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-5 py-2.5 text-xs font-black text-black bg-lime-300 hover:brightness-110 rounded-xl transition-all disabled:opacity-50 shadow-[0_0_24px_rgba(190,242,100,0.25)]"
            >
              {loading ? "Saving…" : "Save Blueprint"}
            </button>
          </div>
        </div>
        {error && (
          <div className="mt-3">
            <p className="text-[11px] font-bold text-rose-300 bg-rose-950/40 border border-rose-800/50 rounded-xl px-3 py-2">{error}</p>
          </div>
        )}
      </div>

      <div className="mt-5">
        {/* Main column */}
        <div className="space-y-4 min-w-0">
          {/* STEP 1 */}
          <section className={`${CARD} ${step !== 0 ? "hidden" : ""}`} hidden={step !== 0}>
            <div className="flex items-center justify-between gap-3 mb-4">
              <h2 className="text-[15px] font-bold text-white">Basic information</h2>
              <div className="flex items-center gap-2 shrink-0">
                <button type="button" onClick={() => goStep(step - 1)} disabled={step === 0} className="px-4 py-2 text-xs font-bold text-neutral-200 bg-white/[0.05] hover:bg-white/10 border border-white/10 rounded-xl transition-all disabled:opacity-40 cursor-pointer">← Back</button>
                {step < STEPS.length - 1 && (
                  <button type="button" onClick={() => goStep(step + 1)} className="px-4 py-2 text-xs font-black text-black bg-lime-300 hover:brightness-110 rounded-xl transition-all cursor-pointer">Next →</button>
                )}
              </div>
            </div>
            <div className="grid md:grid-cols-2 gap-x-5 gap-y-4">
              <div>
                <label className={LABEL}>Assessment title</label>
                <input
                  name="title"
                  required
                  value={fields.title}
                  onChange={(e) => updateField("title", e.target.value)}
                  placeholder="Final Term Examination"
                  className={INPUT}
                />
              </div>
              <div>
                <label className={LABEL}>Category</label>
                <input
                  name="subject"
                  value={fields.subject}
                  onChange={(e) => updateField("subject", e.target.value)}
                  placeholder="Mathematics"
                  className={INPUT}
                />
              </div>
              <div className="md:col-span-2">
                <label className={LABEL}>Description</label>
                <input
                  name="description"
                  value={fields.description}
                  onChange={(e) => updateField("description", e.target.value)}
                  placeholder="Assessment description"
                  className={INPUT}
                />
              </div>
              <div className="md:col-span-2">
                <label className={LABEL}>Candidate instructions</label>
                <textarea
                  name="instructions"
                  rows={2}
                  value={fields.instructions}
                  onChange={(e) => updateField("instructions", e.target.value)}
                  placeholder="Shown to candidates before the exam starts"
                  className={`${INPUT} resize-none`}
                />
              </div>
              <div className="md:col-span-2">
                <label className={LABEL}>Approved students</label>
                <div className="flex flex-wrap items-center gap-3">
                  <label className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-white/10 bg-white/[0.05] hover:bg-white/10 text-neutral-200 text-xs font-bold transition-colors cursor-pointer">
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                    </svg>
                    Upload Excel / CSV
                    <input
                      type="file"
                      accept=".xlsx,.xls,.csv"
                      className="hidden"
                      onChange={(e) => {
                        const f = e.target.files?.[0];
                        if (f) void handleRosterFile(f);
                        e.target.value = "";
                      }}
                    />
                  </label>
                  <span className="text-xs text-neutral-400 font-mono tabular-nums">
                    {rosterCount > 0 ? `${rosterCount} approved` : ""}
                  </span>
                </div>

                {rosterMsg && (
                  <p className={`text-[10px] mt-1.5 ${rosterCount > 0 ? "text-lime-300" : "text-[#f2a488]"}`}>{rosterMsg}</p>
                )}

                {rosterPreview.length > 0 && fields.rosterText?.trim() && (
                  <div className="mt-2 flex items-start justify-between gap-3 rounded-xl border border-white/10 bg-black/40 px-3 py-2.5">
                    <div className="font-mono text-[10px] text-neutral-400 leading-relaxed overflow-hidden max-h-24">
                      {rosterPreview.slice(0, 4).map((line) => (
                        <p key={line} className="truncate">{line}</p>
                      ))}
                      {rosterPreview.length > 4 && (
                        <p className="text-neutral-600">+{rosterPreview.length - 4} more…</p>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => { updateField("rosterText", ""); setRosterCount(0); setRosterMsg(null); }}
                      className="text-[10px] font-bold text-neutral-500 hover:text-rose-300 transition-colors shrink-0 cursor-pointer"
                    >
                      Clear roster
                    </button>
                  </div>
                )}
              </div>
            </div>
          </section>

          {/* STEP 2 */}
          <section className={`${CARD} ${step !== 1 ? "hidden" : ""}`} hidden={step !== 1}>
            <div className="flex items-center justify-between gap-3 mb-4">
              <h2 className="text-[15px] font-bold text-white">Question Selection Strategy</h2>
              <div className="flex items-center gap-2 shrink-0">
                <button type="button" onClick={() => goStep(step - 1)} disabled={step === 0} className="px-4 py-2 text-xs font-bold text-neutral-200 bg-white/[0.05] hover:bg-white/10 border border-white/10 rounded-xl transition-all disabled:opacity-40 cursor-pointer">← Back</button>
                {step < STEPS.length - 1 && (
                  <button type="button" onClick={() => goStep(step + 1)} className="px-4 py-2 text-xs font-black text-black bg-lime-300 hover:brightness-110 rounded-xl transition-all cursor-pointer">Next →</button>
                )}
              </div>
            </div>

            <div className="bg-black/50 p-5 rounded-2xl border border-white/10">
              <div className="flex flex-col md:flex-row items-stretch md:items-center gap-2.5 mb-3 w-full">
                <input
                  value={query}
                  onChange={(e) => { setQuery(e.target.value); setQPage(0); }}
                  placeholder="Search stem, category or question ID"
                  className="flex-1 min-w-0 px-4 py-2.5 text-xs bg-black/60 border border-white/10 rounded-xl outline-none transition-all font-medium text-white placeholder-neutral-600 hover:border-white/20 focus:border-lime-300/50"
                />
                <select
                  value={filterTopic}
                  onChange={(e) => { setFilterTopic(e.target.value); setQPage(0); }}
                  className="w-full md:w-44 shrink-0 px-3 py-2.5 text-xs bg-black/60 border border-white/10 rounded-xl outline-none transition-all font-medium text-white hover:border-white/20 focus:border-lime-300/50 cursor-pointer"
                >
                  <option value="" className="bg-[#12141a] text-white">All categories</option>
                  {allCategories.map((t) => (<option key={t} value={t} className="bg-[#12141a] text-white">{t}</option>))}
                </select>
                <select
                  value={filterDiff}
                  onChange={(e) => { setFilterDiff(e.target.value); setQPage(0); }}
                  className="w-full md:w-32 shrink-0 px-3 py-2.5 text-xs bg-black/60 border border-white/10 rounded-xl outline-none transition-all font-medium text-white hover:border-white/20 focus:border-lime-300/50 cursor-pointer"
                >
                  <option value="" className="bg-[#12141a] text-white">All levels</option>
                  <option value="EASY" className="bg-[#12141a] text-white">Easy</option>
                  <option value="MEDIUM" className="bg-[#12141a] text-white">Medium</option>
                  <option value="HARD" className="bg-[#12141a] text-white">Hard</option>
                </select>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedIds((prev) => {
                      const next = new Set(prev);
                      const all = filteredQuestions.every((q) => next.has(q.id));
                      filteredQuestions.forEach((q) => { if (all) next.delete(q.id); else next.add(q.id); });
                      return next;
                    });
                  }}
                  className="flex items-center justify-center gap-2 text-[11px] font-bold text-neutral-200 hover:text-white bg-white/[0.06] hover:bg-white/10 px-3.5 py-2.5 rounded-xl border border-white/15 transition-colors shrink-0 whitespace-nowrap cursor-pointer"
                >
                  <input
                    type="checkbox"
                    checked={filteredQuestions.length > 0 && filteredQuestions.every((q) => selectedIds.has(q.id))}
                    onChange={() => {}}
                    className="accent-[#bef264] w-4 h-4 cursor-pointer"
                  />
                  <span>
                    {filteredQuestions.length > 0 && filteredQuestions.every((q) => selectedIds.has(q.id))
                      ? `Deselect all (${filteredQuestions.length})`
                      : `Select all (${filteredQuestions.length})`}
                  </span>
                </button>
              </div>
              <div className="space-y-2">
                {qShown.length === 0 && (
                  <p className="text-xs text-neutral-500 italic py-4 text-center">No questions match the current filter.</p>
                )}
                {qShown.map((q) => {
                  const sel = selectedIds.has(q.id);
                  const imgUrl = (q as any).imageUrl as string | undefined;
                  return (
                    <div key={q.id} onClick={() => setDetailId(q.id)} className={`grid ${imgUrl ? "grid-cols-[auto_auto_1fr_auto_auto]" : "grid-cols-[auto_1fr_auto_auto]"} gap-3 items-center p-3 rounded-xl border text-xs cursor-pointer transition-all bg-white/[0.02] border-white/10 hover:bg-white/[0.05]`}>
                      <input
                        type="checkbox"
                        checked={sel}
                        onClick={(e) => e.stopPropagation()}
                        onChange={() => toggleQuestion(q.id)}
                        className="accent-[#bef264] w-4 h-4 cursor-pointer"
                      />
                      {imgUrl && (
                        <img src={imgUrl} alt="" className="w-10 h-10 rounded-lg object-cover border border-white/10 shrink-0" />
                      )}
                      <p className="text-neutral-200 line-clamp-2 leading-relaxed min-w-0">{q.text}</p>
                      <p className="text-[10px] text-neutral-500 whitespace-nowrap hidden sm:block">{q.category}</p>
                      <p className="text-[10px] font-bold text-neutral-400 whitespace-nowrap">{q.difficultyLevel}</p>
                    </div>
                  );
                })}
              </div>
              <div className="mt-3 flex items-center justify-end gap-1.5">
                <button type="button" disabled={qPage === 0} onClick={() => setQPage((p) => p - 1)} className="px-2.5 py-1 rounded-md border border-white/10 text-neutral-300 disabled:opacity-40 hover:bg-white/5">← Previous</button>
                <button type="button" disabled={qPage + 1 >= qPages} onClick={() => setQPage((p) => p + 1)} className="px-2.5 py-1 rounded-md border border-white/10 text-neutral-300 disabled:opacity-40 hover:bg-white/5">Next →</button>
              </div>
            </div>
          </section>

          {/* STEP 3 · merged Scoring + Timing + Navigation */}
          <section className={`${CARD} ${step !== 2 ? "hidden" : ""}`} hidden={step !== 2}>
            <div className="flex items-center justify-between gap-3 mb-4">
              <h2 className="text-[15px] font-bold text-white">Scoring, Timing &amp; Navigation</h2>
              <div className="flex items-center gap-2 shrink-0">
                <button type="button" onClick={() => goStep(step - 1)} disabled={step === 0} className="px-4 py-2 text-xs font-bold text-neutral-200 bg-white/[0.05] hover:bg-white/10 border border-white/10 rounded-xl transition-all disabled:opacity-40 cursor-pointer">← Back</button>
                {step < STEPS.length - 1 && (
                  <button type="button" onClick={() => goStep(step + 1)} className="px-4 py-2 text-xs font-black text-black bg-lime-300 hover:brightness-110 rounded-xl transition-all cursor-pointer">Next →</button>
                )}
              </div>
            </div>

            {/* Row 1 · points + pass % */}
            <div className="grid sm:grid-cols-2 gap-x-5 gap-y-4 mb-3">
              <div>
                <label className={LABEL}>Points per question</label>
                <input
                  type="number"
                  name="marksPerQuestion"
                  value={marksPerQuestion}
                  onChange={(e) => {
                    setMarksPerQuestion(e.target.value);
                    updateField("marksPerQuestion", e.target.value);
                  }}
                  step="0.5"
                  min="0"
                  className={`${INPUT} tabular-nums`}
                />
              </div>
              <div>
                <label className={LABEL}>Passing percentage</label>
                <input
                  type="number"
                  name="passCriteria"
                  value={fields.passCriteria}
                  onChange={(e) => updateField("passCriteria", e.target.value)}
                  min="0"
                  max="100"
                  className={`${INPUT} tabular-nums`}
                />
              </div>
            </div>

            {/* Row 2 · switches */}
            <div className="space-y-2.5 mb-3">
              <div className="flex flex-wrap gap-2.5">
                <div className="flex-1 min-w-[280px] flex items-center justify-between gap-3 bg-black/40 rounded-xl border border-white/10 px-4 py-3">
                  <span className="text-xs font-bold text-white shrink-0">Negative marking</span>
                  <div className="flex items-center gap-2.5 shrink-0">
                    <input
                      type="number"
                      name="negativeMarksValue"
                      value={fields.negativeMarksValue}
                      onChange={(e) => updateField("negativeMarksValue", e.target.value)}
                      step="0.01"
                      min="0"
                      disabled={!negOn}
                      className={`${INPUT} tabular-nums w-20 disabled:cursor-not-allowed ${negOn ? "" : "opacity-40 pointer-events-none"}`}
                    />
                    <Switch
                      name="negativeMarkingEnabled"
                      checked={checks.negativeMarkingEnabled}
                      onChange={(v) => updateCheck("negativeMarkingEnabled", v)}
                    />
                  </div>
                </div>
                <div className="flex-1 min-w-[240px] flex items-center justify-between gap-3 bg-black/40 rounded-xl border border-white/10 px-4 py-3">
                  <span className="text-xs font-bold text-white shrink-0">MSQ partial credit</span>
                  <Switch
                    name="partialCreditEnabled"
                    checked={checks.partialCreditEnabled}
                    onChange={(v) => updateCheck("partialCreditEnabled", v)}
                  />
                </div>
              </div>

              {/* Navigation toggles on one line */}
              <div className="flex flex-wrap gap-2.5">
                {[
                  ["allowQuestionSkip", "Allow Skip", true],
                  ["allowAnswerReview", "Review Before Submit", true],
                  ["allowBackNavigation", "Allow Back Navigation", true],
                ].map(([n, l, fb]) => (
                  <div key={n as string} className="flex-1 min-w-[190px] flex items-center justify-between gap-3 bg-black/40 rounded-xl border border-white/10 px-4 py-3">
                    <p className="text-xs font-bold text-white">{l}</p>
                    <Switch
                      name={n as string}
                      checked={checks[n as string] ?? (fb as boolean)}
                      onChange={(v) => updateCheck(n as string, v)}
                    />
                  </div>
                ))}
              </div>
            </div>

            {/* Row 3 · duration + start window + attempts on one line */}
            <div className="grid grid-cols-3 gap-x-4 gap-y-4 mb-3">
              <div>
                <label className={LABEL}>Duration (min)</label>
                <input
                  type="number"
                  name="durationMinutes"
                  value={fields.durationMinutes}
                  onChange={(e) => updateField("durationMinutes", e.target.value)}
                  required
                  min="1"
                  className={`${INPUT} tabular-nums`}
                />
              </div>
              <div>
                <label className={LABEL}>Start window (hrs)</label>
                <input
                  type="number"
                  name="defaultStartWindowHours"
                  value={fields.defaultStartWindowHours}
                  onChange={(e) => updateField("defaultStartWindowHours", e.target.value)}
                  min="1"
                  className={`${INPUT} tabular-nums`}
                />
              </div>
              <div>
                <label className={LABEL}>Max attempts</label>
                <input
                  type="number"
                  name="maxAttempts"
                  value={fields.maxAttempts}
                  onChange={(e) => updateField("maxAttempts", e.target.value)}
                  min="1"
                  className={`${INPUT} tabular-nums`}
                />
              </div>
            </div>

            {/* Row 4 · proctoring on one line */}
            <div className="flex flex-wrap gap-2.5 mb-3">
              <div className="flex-1 min-w-[240px] flex items-center justify-between gap-3 bg-black/40 rounded-xl border border-white/10 px-4 py-3">
                <span className="text-xs font-bold text-white shrink-0">Tab-switch limit</span>
                <input
                  type="number"
                  name="tabSwitchLimit"
                  value={fields.tabSwitchLimit}
                  onChange={(e) => updateField("tabSwitchLimit", e.target.value)}
                  min="1"
                  placeholder="5"
                  className={`${INPUT} tabular-nums w-16`}
                />
              </div>
              <div className="flex-1 min-w-[200px] flex items-center justify-between gap-3 bg-black/40 rounded-xl border border-white/10 px-4 py-3">
                <p className="text-xs font-bold text-white">Require fullscreen</p>
                <Switch
                  name="requireFullscreen"
                  checked={checks.requireFullscreen}
                  onChange={(v) => updateCheck("requireFullscreen", v)}
                />
              </div>
              <div className="flex-1 min-w-[200px] flex items-center justify-between gap-3 bg-black/40 rounded-xl border border-white/10 px-4 py-3">
                <p className="text-xs font-bold text-white">Disable copy / paste</p>
                <Switch
                  name="disableCopyPaste"
                  checked={checks.disableCopyPaste}
                  onChange={(v) => updateCheck("disableCopyPaste", v)}
                />
              </div>
            </div>

            {/* Row 5 · result visibility + feedback toggles on one line */}
            <div className="flex flex-wrap items-center gap-2.5 mb-3">
              <Segmented
                name="resultVisibility"
                value={(["IMMEDIATE", "AFTER_RELEASE", "NEVER"] as const).includes(fields.resultVisibility as any) ? (fields.resultVisibility as "IMMEDIATE" | "AFTER_RELEASE" | "NEVER") : "IMMEDIATE"}
                onChange={(v) => updateField("resultVisibility", v)}
                options={[
                  { value: "IMMEDIATE", label: "IMMEDIATE" },
                  { value: "AFTER_RELEASE", label: "AFTER RELEASE" },
                  { value: "NEVER", label: "NEVER" },
                ]}
              />
            </div>
            <div className="flex flex-wrap gap-2.5">
              <div className="flex-1 min-w-[220px] flex items-center justify-between gap-3 bg-black/40 rounded-xl border border-white/10 px-4 py-3">
                <p className="text-xs font-bold text-white">Show correct answers</p>
                <Switch
                  name="showCorrectAnswers"
                  checked={checks.showCorrectAnswers}
                  onChange={(v) => updateCheck("showCorrectAnswers", v)}
                />
              </div>
              <div className="flex-1 min-w-[220px] flex items-center justify-between gap-3 bg-black/40 rounded-xl border border-white/10 px-4 py-3">
                <p className="text-xs font-bold text-white">Show explanations</p>
                <Switch
                  name="showExplanation"
                  checked={checks.showExplanation}
                  onChange={(v) => updateCheck("showExplanation", v)}
                />
              </div>
              <div className="flex-1 min-w-[220px] flex items-center justify-between gap-3 bg-black/40 rounded-xl border border-white/10 px-4 py-3">
                <p className="text-xs font-bold text-white">Gamified quiz mode</p>
                <Switch
                  name="isGamified"
                  checked={checks.isGamified}
                  onChange={(v) => updateCheck("isGamified", v)}
                />
              </div>
            </div>

            {/* Bottom Step 3 Action: Review & Submit Blueprint */}
            <div className="mt-6 pt-5 border-t border-white/10 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div>
                <p className="text-xs font-bold text-white">Step 3 of 3 complete</p>
                <p className="text-[11px] text-neutral-400 mt-0.5">Audit question allocation, scoring, and proctoring rules before finalizing.</p>
              </div>
              <button
                type="button"
                onClick={() => handleOpenReview()}
                className="w-full sm:w-auto px-6 py-3 text-xs font-black text-black bg-lime-300 hover:brightness-110 rounded-xl transition-all shadow-[0_0_24px_rgba(190,242,100,0.25)] flex items-center justify-center gap-2 cursor-pointer"
              >
                <span>Review &amp; Submit Blueprint →</span>
              </button>
            </div>
          </section>

          {/* Hidden inputs for computed totals */}
          <input type="hidden" name="totalMarks" value={maxMarks} />
        </div>
      </div>

      {/* ── Read-only question info drawer (question bank style, info only) ── */}
      {detailQ && (() => {
        const d = parseQuestionDetail(detailQ);
        const correctSet = new Set<string>(
          [
            ...(d.correctAnswer ? [d.correctAnswer] : []),
            ...(Array.isArray(d.correctAnswers) ? d.correctAnswers : []),
          ].map((s: string) => s.trim().toLowerCase())
        );
        const levelLabel = detailQ.difficultyLevel === "EASY" ? "Easy" : detailQ.difficultyLevel === "HARD" ? "Hard" : "Medium";
        return (
          <div className="fixed inset-0 z-[60] overflow-hidden flex justify-end" style={{ marginTop: 0 }}>
            <div
              onClick={() => setDetailId(null)}
              className="fixed inset-0 bg-black/75 backdrop-blur-xs transition-opacity cursor-pointer"
            />
            <div className="relative w-full sm:max-w-2xl md:max-w-3xl lg:max-w-[820px] bg-[#121215] border-l border-neutral-800 shadow-2xl h-full flex flex-col z-10 overflow-hidden">
              {/* Header */}
              <div className="p-5 sm:p-6 border-b border-neutral-800 bg-[#0e0e11] shrink-0">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center flex-wrap gap-2 mb-2.5">
                      <span className="bg-lime-300 text-black text-xs font-extrabold px-3.5 h-7 flex items-center max-w-[260px] truncate rounded-full">
                        {detailQ.category || "General"}
                      </span>
                      <span className="bg-neutral-700 text-white text-xs font-extrabold px-3.5 h-7 flex items-center rounded-full">
                        {detailQ.type || "MCQ"}
                      </span>
                      <span
                        className={`text-xs font-extrabold px-3.5 h-7 flex items-center rounded-full ${
                          levelLabel === "Easy" ? "bg-emerald-500 text-black" : levelLabel === "Hard" ? "bg-rose-500 text-white" : "bg-amber-400 text-black"
                        }`}
                      >
                        {levelLabel}
                      </span>
                    </div>
                    <h3 className="text-base sm:text-lg font-black text-neutral-100 tracking-tight">Question Details</h3>
                  </div>
                  <button
                    type="button"
                    onClick={() => setDetailId(null)}
                    title="Close (Esc)"
                    className="p-2 text-neutral-400 hover:text-white hover:bg-neutral-800 rounded-xl transition-colors cursor-pointer"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>

              {/* Body */}
              <div className="flex-1 overflow-y-auto p-5 sm:p-6 space-y-5">
                {/* Figure (only when the question actually has an image) */}
                {detailQ.imageUrl && (
                  <div className="bg-black/60 rounded-xl p-4 border border-neutral-800 flex items-center justify-center">
                    <img src={detailQ.imageUrl} alt="" className="max-h-60 rounded-lg object-contain" />
                  </div>
                )}

                {/* Stem */}
                <div className="rounded-2xl border border-neutral-800/80 bg-[#18181c]/70 p-4 sm:p-5">
                  <span className="block text-[10px] font-bold tracking-[0.14em] text-neutral-400 uppercase mb-2">Question Stem</span>
                  <p className="text-sm sm:text-base font-bold text-neutral-100 leading-relaxed select-text">{detailQ.text}</p>
                </div>

                {/* Options */}
                <div className="rounded-2xl border border-neutral-800/80 bg-[#18181c]/70 p-4 sm:p-5">
                  <span className="block text-[10px] font-bold tracking-[0.14em] text-neutral-400 uppercase mb-3">Options &amp; Correct Answer</span>
                  {d.options.length > 0 ? (
                    <div className="space-y-2.5">
                      {d.options.map((opt, i) => {
                        const letter = String.fromCharCode(65 + i);
                        const isCorrect = correctSet.has(opt.trim().toLowerCase());
                        const optImg = d.optionImages[i];
                        return (
                          <div
                            key={i}
                            className={`p-3 rounded-xl border flex items-start gap-3 transition-colors ${
                              isCorrect ? "bg-lime-400/[0.08] border-lime-400/40 text-white" : "bg-[#131316] border-neutral-800 text-neutral-300"
                            }`}
                          >
                            <span
                              className={`w-6 h-6 rounded-lg text-xs font-mono font-bold flex items-center justify-center shrink-0 ${
                                isCorrect ? "bg-lime-300 text-black font-black" : "bg-neutral-800 text-neutral-400 font-semibold"
                              }`}
                            >
                              {letter}
                            </span>
                            <p className="flex-1 text-xs leading-relaxed pt-0.5 break-words select-text font-medium">{opt}</p>
                            {optImg && (
                              <img src={optImg} alt="" className="h-12 w-12 object-cover rounded-xl border border-neutral-800 shrink-0" />
                            )}
                            {isCorrect && (
                              <span className="shrink-0 inline-flex items-center gap-1 text-[10px] font-black tracking-wide text-lime-300 bg-lime-400/20 border border-lime-400/30 px-2 py-0.5 rounded-full">
                                ✓ Correct Answer
                              </span>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  ) : d.correctAnswer ? (
                    <div className="p-3.5 rounded-xl border border-lime-400/30 bg-lime-400/[0.08]">
                      <span className="block text-[10px] font-bold text-lime-300 uppercase tracking-wider mb-1">Accepted Answer</span>
                      <p className="text-sm font-mono font-bold text-white select-text">{d.correctAnswer}</p>
                    </div>
                  ) : (
                    <p className="text-xs text-neutral-500 italic">No structured options attached.</p>
                  )}
                </div>

                {/* Explanation */}
                <div className="rounded-2xl border border-neutral-800/80 bg-[#18181c]/70 p-4 sm:p-5">
                  <span className="block text-[10px] font-bold tracking-[0.14em] text-neutral-400 uppercase mb-2">Explanation &amp; Solution Notes</span>
                  {d.explanation ? (
                    <div className="p-3.5 rounded-xl border border-neutral-800 bg-[#131316] text-xs sm:text-[13px] text-neutral-200 leading-relaxed select-text">
                      {d.explanation}
                    </div>
                  ) : (
                    <p className="text-xs text-neutral-500 italic">No explanation set for this question.</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      {/* ── Exam Template Review Dialog Box ── */}
      <ExamTemplateReviewModal
        isOpen={showReviewModal}
        onClose={() => setShowReviewModal(false)}
        onConfirmSubmit={executeFinalSubmit}
        isSubmitting={loading}
        error={error}
        onJumpToStep={(s) => {
          setShowReviewModal(false);
          goStep(s);
        }}
        fields={fields}
        checks={checks}
        rules={rules}
        selectedIds={selectedIds}
        allQuestions={allQuestions}
        rosterCount={rosterCount}
        rosterPreview={rosterPreview}
        totalMarks={maxMarks}
        totalQuestions={totalQuestions}
        shortfall={shortfall}
      />
    </form>
  );
}
