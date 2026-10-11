"use client";

import { useState, useRef } from "react";
import { createTemplateAction } from "@/app/actions/template";
import { useRouter } from "next/navigation";
import { FIXED_TOPICS, FIXED_DIFFICULTIES } from "@/lib/ai-question-analyzer";

const DRAFT_KEY = "aptix_template_draft_v1";

interface DraftState {
  fields: Record<string, string>;
  checks: Record<string, boolean>;
  rules: { id: string; category: string; difficultyLevel: string; count: number }[];
  selectedIds: string[];
  selectionMode: string;
  marksPerQuestion: string;
}

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

function Switch({ name, defaultChecked, onChange }: { name: string; defaultChecked?: boolean; onChange?: (v: boolean) => void }) {
  const [on, setOn] = useState(!!defaultChecked);
  return (
    <label className="relative inline-flex cursor-pointer shrink-0">
      <input
        type="checkbox"
        name={name}
        checked={on}
        onChange={(e) => {
          setOn(e.target.checked);
          onChange?.(e.target.checked);
        }}
        className="peer sr-only"
      />
      <span className={`block w-9 h-5 rounded-full transition-colors ${on ? "bg-lime-300" : "bg-white/15"}`}>
        <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-black transition-all ${on ? "left-[18px]" : "left-0.5"}`} />
      </span>
    </label>
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
  defaultValue,
  onChange,
}: {
  name: string;
  options: { value: T; label: string }[];
  defaultValue: T;
  onChange?: (v: T) => void;
}) {
  const [val, setVal] = useState<T>(defaultValue);
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
              setVal(o.value);
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
  "Scoring",
  "Timing",
  "Navigation",
  "Feedback",
  "Proctoring",
  "Gamification",
];

/* ── Form ────────────────────────────────────────── */

export function CreateTemplateForm({ allQuestions }: { allQuestions: any[] }) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const [draft] = useState<DraftState | null>(() => (typeof window !== "undefined" ? loadDraft() : null));
  const [draftNote, setDraftNote] = useState<string | null>(() =>
    typeof window !== "undefined" && loadDraft() ? "Draft restored from this browser." : null
  );

  const [step, setStep] = useState(0);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(
    () => new Set(draft?.selectedIds || [])
  );
  const [rules, setRules] = useState<{ id: string; category: string; difficultyLevel: string; count: number }[]>(
    () => draft?.rules || []
  );
  const [selectionMode, setSelectionMode] = useState(draft?.selectionMode || "MANUAL");
  const [marksPerQuestion, setMarksPerQuestion] = useState(draft?.marksPerQuestion || "1");
  const [negOn, setNegOn] = useState(!!draft?.checks.negativeMarkingEnabled);
  const [isGamified, setIsGamified] = useState(!!draft?.checks.isGamified);

  const [loading, setLoading] = useState(false);
  const [savingDraft, setSavingDraft] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [filterTopic, setFilterTopic] = useState("");
  const [filterDiff, setFilterDiff] = useState("");
  const [query, setQuery] = useState("");
  const [qPage, setQPage] = useState(0);
  const Q_PER = 4;

  const d = (name: string, fallback = "") => draft?.fields[name] ?? fallback;
  const dc = (name: string, fallback: boolean) => (draft ? (draft.checks[name] ?? fallback) : fallback);

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
  const toggleQuestion = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };
  const addRule = () => {
    setRules((r) => [...r, { id: Math.random().toString(), category: FIXED_TOPICS[0], difficultyLevel: "MEDIUM", count: 5 }]);
  };
  const updateRule = (id: string, field: string, value: string | number) => {
    setRules((rs) => rs.map((r) => (r.id === id ? { ...r, [field]: value } : r)));
  };
  const removeRule = (id: string) => {
    setRules((rs) => rs.filter((r) => r.id !== id));
  };

  const collectDraft = (): DraftState => {
    const fd = formRef.current ? new FormData(formRef.current) : new FormData();
    const fields: Record<string, string> = {};
    const checks: Record<string, boolean> = {};
    ["title", "subject", "description", "instructions", "allowedEmailDomain", "marksPerQuestion", "passCriteria", "negativeMarksValue", "durationMinutes", "defaultStartWindowHours", "maxAttempts", "questionDisplayMode", "resultVisibility", "tabSwitchLimit", "selectionMode"].forEach((k) => {
      const v = fd.get(k);
      if (typeof v === "string") fields[k] = v;
    });
    ["negativeMarkingEnabled", "partialCreditEnabled", "allowQuestionSkip", "allowAnswerReview", "allowBackNavigation", "showCorrectAnswers", "showExplanation", "requireFullscreen", "disableCopyPaste", "isGamified"].forEach((k) => {
      checks[k] = fd.get(k) === "on";
    });
    return { fields, checks, rules, selectedIds: Array.from(selectedIds), selectionMode, marksPerQuestion };
  };

  const saveDraft = () => {
    setSavingDraft(true);
    try {
      localStorage.setItem(DRAFT_KEY, JSON.stringify(collectDraft()));
      setDraftNote("Draft saved in this browser.");
    } catch {
      setDraftNote("Could not save draft in this browser.");
    }
    setSavingDraft(false);
  };

  const discardDraft = () => {
    try {
      localStorage.removeItem(DRAFT_KEY);
    } catch {}
    setDraftNote(null);
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (selectedIds.size === 0 && rules.length === 0) {
      setError("Please select at least one fixed question or add at least one auto-pick rule.");
      setStep(1);
      window.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }
    setLoading(true);
    setError(null);

    const formData = new FormData(e.currentTarget);
    const cleanedRules = rules.map(({ category, difficultyLevel, count }) => ({ category, difficultyLevel, count }));

    const res = await createTemplateAction(formData, Array.from(selectedIds), cleanedRules);

    if (res.error) {
      setError(res.error);
      setLoading(false);
      window.scrollTo({ top: 0, behavior: "smooth" });
    } else {
      try {
        localStorage.removeItem(DRAFT_KEY);
      } catch {}
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

  const modeLabel = selectionMode === "MANUAL" ? "Manual only" : selectionMode === "RULE_BASED" ? "Hybrid selection" : "Hybrid selection";

  return (
    <form ref={formRef} onSubmit={handleSubmit} className="pb-24">
      {/* Header */}
      <div className="px-1 pt-1">
        <p className="text-[10px] font-bold tracking-[0.18em] text-neutral-500 mb-2 font-mono">
          BLUEPRINT / NEW · /dashboard/owner/template/new
        </p>
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div>
            <h1 className="text-3xl sm:text-[40px] font-black text-white tracking-tight leading-none">
              Build a better assessment<span className="text-lime-300">.</span>
            </h1>
            <p className="text-[13px] text-neutral-400 mt-2.5">
              A new draft based on the Quantitative Aptitude · Q4 specification. No changes to the existing live template.
            </p>
            <p className="mt-2 text-[10px] font-mono text-neutral-500">
              <span className="text-lime-200/80 font-bold">DRAFT ONLY · Max {STEPS.length}</span>
              {"  "}{step + 1} complete section{step === 0 ? "" : "s"} · {modeLabel} · All settings visible
            </p>
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
        {(draftNote || error) && (
          <div className="mt-3 flex flex-wrap items-center gap-2">
            {draftNote && (
              <p className="text-[11px] font-semibold text-lime-200 bg-lime-300/10 border border-lime-300/25 rounded-xl px-3 py-2">
                {draftNote}{" "}
                <button type="button" onClick={discardDraft} className="underline underline-offset-2 hover:text-white ml-1">
                  Discard
                </button>
              </p>
            )}
            {error && (
              <p className="text-[11px] font-bold text-rose-300 bg-rose-950/40 border border-rose-800/50 rounded-xl px-3 py-2">{error}</p>
            )}
          </div>
        )}
      </div>

      <div className="mt-5 grid lg:grid-cols-[220px_1fr] gap-4 items-start">
        {/* Left rail */}
        <div className="space-y-4 lg:sticky lg:top-4">
          <div className="rounded-2xl border border-white/10 bg-[#0e0f13] p-4">
            <p className="text-[10px] font-bold tracking-[0.16em] text-neutral-500 mb-2.5">JUMP TO SECTION</p>
            <div className="space-y-1">
              {STEPS.map((s, i) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => goStep(i)}
                  className={`w-full text-left text-xs rounded-lg px-3 py-2 transition-all flex items-center gap-2.5 ${
                    i === step
                      ? "bg-white/[0.07] text-white font-bold"
                      : "text-neutral-400 hover:text-white hover:bg-white/[0.04] font-medium"
                  }`}
                >
                  <span className={`font-mono ${i === step ? "text-lime-300" : "text-neutral-600"}`}>{i + 1}</span>
                  <span className="capitalize">{s}</span>
                </button>
              ))}
            </div>
            <p className="mt-3 text-[10px] text-neutral-600 leading-relaxed">Static section anchors. Read downward to view the complete builder.</p>
          </div>

          {/* Blueprint summary */}
          <div className="rounded-2xl border border-white/10 bg-[#0e0f13] p-4">
            <p className="text-[10px] font-bold tracking-[0.16em] text-neutral-500 mb-2">BLUEPRINT SUMMARY</p>
            <p className="text-[26px] leading-none font-black text-lime-300 tabular-nums">
              {totalQuestions} <span className="text-neutral-500">/ {Math.round(maxMarks)}</span>
            </p>
            <p className="text-[10px] text-neutral-500 mt-1">questions / maximum marks</p>
            <div className="mt-3 grid grid-cols-[1fr_auto_auto_auto] gap-x-2 gap-y-1.5 items-center text-[10px] min-w-0">
              <p className="text-neutral-600 font-bold">SUBJECT</p>
              <p className="text-neutral-600 font-bold text-right">DIFFICULTY</p>
              <p className="text-neutral-600 font-bold text-right">COUNT</p>
              <p className="text-neutral-600 font-bold text-right">AVAILABLE</p>
              {rules.length === 0 && <p className="col-span-4 text-neutral-600 py-2">No blueprint rules yet.</p>}
              {rules.map((r) => {
                const avail = approvedFor(r.category, r.difficultyLevel);
                const ok = (Number(r.count) || 0) <= avail;
                return (
                  <div key={r.id} className="contents">
                    <p className="text-neutral-300 truncate min-w-0">{r.category.split(" ")[0]}</p>
                    <p className="text-neutral-500 text-right">{r.difficultyLevel.slice(0, 4)}</p>
                    <p className="text-white font-bold tabular-nums text-right">{r.count}</p>
                    <p className={`font-bold tabular-nums text-right ${ok ? "text-lime-200" : "text-[#f2a488]"}`}>{avail}</p>
                  </div>
                );
              })}
            </div>
            <button
              type="button"
              onClick={() => { addRule(); goStep(1); }}
              className="mt-3 text-[11px] font-bold text-lime-200 hover:text-lime-100 transition-colors"
            >
              + Add blueprint rule
            </button>
            <p className="mt-2 text-[10px] text-neutral-500 tabular-nums">
              Dynamic totals: {totalQuestions} questions, {Math.round(maxMarks)} marks · {selectedCount} fixed + {rulesDemand} dynamic
            </p>
            <p className="text-[10px] text-neutral-500">Fixed question selected · {selectedCount} selected</p>
            <div className={`mt-2.5 rounded-xl border p-2.5 text-[10px] leading-relaxed ${poolReady || rules.length === 0 ? "border-lime-300/25 bg-lime-300/[0.05] text-neutral-300" : "border-[#f2a488]/30 bg-[#f2a488]/[0.06] text-[#f2a488]"}`}>
              {rules.length === 0
                ? "Pool sufficiency: add a rule or fixed question to validate the bank."
                : poolReady
                  ? `Pool sufficiency: ready — bank covers every rule demand.`
                  : `Pool shortfall: ${shortfall.map((r) => `${r.category.split(" ")[0]} ${r.difficultyLevel.slice(0, 4)} needs ${r.count}`).join("; ")}.`}
            </div>
          </div>
        </div>

        {/* Main column */}
        <div className="space-y-4 min-w-0" key={step}>
          {/* STEP 1 */}
          <section className={CARD} hidden={step !== 0}>
            <h2 className="text-[15px] font-bold text-white mb-4">1 · Basic information</h2>
            <div className="grid md:grid-cols-2 gap-x-5 gap-y-4">
              <div>
                <label className={LABEL}>Assessment title</label>
                <input name="title" required defaultValue={d("title")} placeholder="Quantitative Aptitude · Q4" className={INPUT} />
              </div>
              <div>
                <label className={LABEL}>Category</label>
                <input name="subject" defaultValue={d("subject")} placeholder="Quantitative Aptitude" className={INPUT} />
              </div>
              <div className="md:col-span-2">
                <label className={LABEL}>Description</label>
                <input name="description" defaultValue={d("description")} placeholder="Engineering cohort 2026 · foundational quantitative reasoning across algebra, arithmetic and data." className={INPUT} />
              </div>
              <div className="md:col-span-2">
                <label className={LABEL}>Candidate instructions</label>
                <textarea name="instructions" rows={2} defaultValue={d("instructions")} placeholder="Answer all 40 questions. Calculators are not permitted. Review marked questions before submitting." className={`${INPUT} resize-none`} />
              </div>
              <div className="md:col-span-2">
                <label className={LABEL}>Restricted email domain <span className="normal-case font-medium text-neutral-600">(optional)</span></label>
                <input name="allowedEmailDomain" defaultValue={d("allowedEmailDomain")} placeholder="@northbridge.edu" className={INPUT} />
                <p className="text-[10px] text-neutral-600 mt-1.5">Institution: Northbridge University · Cohort: ENG-26. Domain restriction applies at candidate authentication.</p>
              </div>
            </div>
          </section>

          {/* STEP 2 */}
          <section className={CARD} hidden={step !== 1}>
            <h2 className="text-[15px] font-bold text-white mb-4">2 · Question Selection Strategy</h2>
            <div className="flex flex-wrap items-center gap-2 mb-1.5">
              <span className="text-[9px] font-black tracking-[0.14em] text-neutral-500">MODE</span>
              <Segmented
                name="selectionMode"
                defaultValue={(["MANUAL", "RULE_BASED", "HYBRID"] as const).includes(selectionMode as any) ? (selectionMode as "MANUAL" | "RULE_BASED" | "HYBRID") : "MANUAL"}
                onChange={(v) => setSelectionMode(v)}
                options={[
                  { value: "MANUAL", label: "MANUAL ONLY" },
                  { value: "RULE_BASED", label: "HYBRID BLUEPRINT" },
                  { value: "HYBRID", label: "HYBRID" },
                ]}
              />
            </div>

            <div className="bg-black/50 p-5 rounded-2xl border border-white/10 mb-4">
              <div className="flex justify-between items-center gap-3 mb-3">
                <h4 className="font-extrabold text-white text-[12px] uppercase tracking-[0.12em]">Dynamic Auto-Pick Rules</h4>
                <button type="button" onClick={addRule} className="text-[11px] font-black text-black bg-lime-300 hover:brightness-110 px-3 py-1.5 rounded-lg transition-all shrink-0">
                  + Add Rule
                </button>
              </div>
              {rules.length > 0 && (
                <div className="space-y-2.5">
                  {rules.map((rule) => (
                    <div key={rule.id} className="flex gap-2 items-center bg-[#16171c] p-2.5 rounded-xl border border-white/10">
                      <select value={rule.category} onChange={(e) => updateRule(rule.id, "category", e.target.value)} className="text-xs border border-white/10 rounded-lg p-2 flex-1 bg-black font-medium text-neutral-200 outline-none cursor-pointer min-w-0">
                        {FIXED_TOPICS.map((t) => (<option key={t} value={t}>{t}</option>))}
                      </select>
                      <select value={rule.difficultyLevel} onChange={(e) => updateRule(rule.id, "difficultyLevel", e.target.value)} className="text-xs border border-white/10 rounded-lg p-2 bg-black font-medium text-neutral-200 outline-none cursor-pointer">
                        {FIXED_DIFFICULTIES.map((df) => (<option key={df} value={df}>{df === "MEDIUM" ? "Med" : df.charAt(0) + df.slice(1).toLowerCase()}</option>))}
                      </select>
                      <input type="number" min="1" value={rule.count} onChange={(e) => updateRule(rule.id, "count", parseInt(e.target.value) || 1)} className="text-xs border border-white/10 rounded-lg p-2 w-16 bg-black font-bold text-white outline-none tabular-nums" />
                      <span className="text-[10px] text-neutral-500 tabular-nums whitespace-nowrap">/ {approvedFor(rule.category, rule.difficultyLevel)}</span>
                      <button type="button" onClick={() => removeRule(rule.id)} aria-label="Remove rule" className="text-neutral-500 hover:text-rose-400 p-1.5 text-lg font-bold leading-none">×</button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="bg-black/50 p-5 rounded-2xl border border-white/10">
              <input
                value={query}
                onChange={(e) => { setQuery(e.target.value); setQPage(0); }}
                placeholder="Search stem, category or question ID"
                className={`${INPUT} mb-3`}
              />
              <div className="grid sm:grid-cols-2 gap-2.5 mb-3">
                <label className="block">
                  <span className={LABEL}>Subject filter</span>
                  <select value={filterTopic} onChange={(e) => { setFilterTopic(e.target.value); setQPage(0); }} className={`${INPUT} cursor-pointer`}>
                    <option value="">All categories</option>
                    {FIXED_TOPICS.map((t) => (<option key={t} value={t}>{t}</option>))}
                  </select>
                </label>
                <label className="block">
                  <span className={LABEL}>Difficulty filter</span>
                  <select value={filterDiff} onChange={(e) => { setFilterDiff(e.target.value); setQPage(0); }} className={`${INPUT} cursor-pointer`}>
                    <option value="">All levels</option>
                    <option value="EASY">Easy</option>
                    <option value="MEDIUM">Medium</option>
                    <option value="HARD">Hard</option>
                  </select>
                </label>
              </div>
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
                className="text-[11px] font-bold text-neutral-200 hover:text-white bg-white/[0.06] hover:bg-white/10 px-3 py-1.5 rounded-lg border border-white/15 transition-colors mb-3"
              >
                ☑ Select all filtered · {filteredQuestions.length} questions
              </button>
              <div className="space-y-2">
                {qShown.length === 0 && (
                  <p className="text-xs text-neutral-500 italic py-4 text-center">No questions match the current filter.</p>
                )}
                {qShown.map((q) => {
                  const sel = selectedIds.has(q.id);
                  return (
                    <div key={q.id} onClick={() => toggleQuestion(q.id)} className="grid grid-cols-[auto_auto_1fr_auto_auto] gap-3 items-center p-3 rounded-xl border text-xs cursor-pointer transition-all bg-white/[0.02] border-white/10 hover:bg-white/[0.05]">
                      <input type="checkbox" checked={sel} readOnly className="accent-[#bef264] w-4 h-4 cursor-pointer" />
                      {(q as any).imageUrl ? (
                        <img src={(q as any).imageUrl} alt="" className="w-10 h-10 rounded-lg object-cover border border-white/10 shrink-0" />
                      ) : (
                        <span className="w-10 h-10 rounded-lg bg-white/[0.04] border border-white/10 flex items-center justify-center text-[9px] font-black text-neutral-600 shrink-0">Q</span>
                      )}
                      <p className="text-neutral-200 line-clamp-2 leading-relaxed min-w-0">{q.text}</p>
                      <p className="text-[10px] text-neutral-500 whitespace-nowrap hidden sm:block">{q.category}</p>
                      <p className="text-[10px] font-bold text-neutral-400 whitespace-nowrap">{q.difficultyLevel}</p>
                    </div>
                  );
                })}
              </div>
              <div className="mt-3 flex items-center justify-between text-[10px] text-neutral-500">
                <span>Showing {selectedShown} of {selectedCount} selected · page {qPage + 1}–{qPages}</span>
                <span className="flex gap-1.5">
                  <button type="button" disabled={qPage === 0} onClick={() => setQPage((p) => p - 1)} className="px-2.5 py-1 rounded-md border border-white/10 text-neutral-300 disabled:opacity-40 hover:bg-white/5">← Previous</button>
                  <button type="button" disabled={qPage + 1 >= qPages} onClick={() => setQPage((p) => p + 1)} className="px-2.5 py-1 rounded-md border border-white/10 text-neutral-300 disabled:opacity-40 hover:bg-white/5">Next →</button>
                </span>
              </div>
              <div className="mt-3 rounded-xl border border-lime-300/25 bg-lime-300/[0.05] p-3">
                <p className="text-[11px] font-bold text-lime-200">Selection totals reconcile</p>
                <p className="text-[10px] text-neutral-400 mt-1 tabular-nums">
                  {selectedCount} fixed + {rulesDemand} dynamic = {totalQuestions} questions, {Math.round(maxMarks)} marks · pool {poolReady || rules.length === 0 ? "sufficient" : "short — see sidebar"}.
                </p>
              </div>
            </div>
          </section>

          {/* STEP 3 */}
          <section className={CARD} hidden={step !== 2}>
            <h2 className="text-[15px] font-bold text-white mb-4">3 · Scoring</h2>
            <div className="grid md:grid-cols-2 gap-x-5 gap-y-4">
              <div>
                <label className={LABEL}>Points per question</label>
                <input type="number" name="marksPerQuestion" value={marksPerQuestion} onChange={(e) => setMarksPerQuestion(e.target.value)} step="0.5" min="0" className={`${INPUT} tabular-nums`} />
              </div>
              <div>
                <label className={LABEL}>Passing percentage</label>
                <input type="number" name="passCriteria" defaultValue={d("passCriteria", "50")} min="0" max="100" className={`${INPUT} tabular-nums`} />
              </div>
            </div>
            <div className="mt-4 space-y-3">
              <div className="flex items-center justify-between gap-3 bg-black/40 rounded-xl border border-white/10 px-4 py-3">
                <div>
                  <p className="text-xs font-bold text-white">Negative marking</p>
                  <p className="text-[10px] text-neutral-500 mt-0.5">Deduction for incorrect response</p>
                </div>
                <Switch name="negativeMarkingEnabled" defaultChecked={dc("negativeMarkingEnabled", false)} onChange={setNegOn} />
              </div>
              <div className={negOn ? "" : "opacity-40 pointer-events-none select-none"}>
                <input type="number" name="negativeMarksValue" defaultValue={d("negativeMarksValue", "0.25")} step="0.01" min="0" disabled={!negOn} className={`${INPUT} tabular-nums disabled:cursor-not-allowed`} />
                {!negOn && <p className="mt-1.5 text-[10px] text-neutral-600">Enable Negative marking above to set a deduction.</p>}
              </div>
              <div className="flex items-center justify-between gap-3 bg-black/40 rounded-xl border border-white/10 px-4 py-3">
                <div>
                  <p className="text-xs font-bold text-white">MSQ partial credit</p>
                  <p className="text-[10px] text-neutral-500 mt-0.5">Unanswered: 0. Partial credit is OFF for this blueprint; MSQ requires the full correct set, otherwise −0.5. If enabled, award proportional credit only when no incorrect option is selected. Maximum marks remain {Math.round(maxMarks)}.</p>
                </div>
                <Switch name="partialCreditEnabled" defaultChecked={dc("partialCreditEnabled", false)} />
              </div>
            </div>
          </section>

          {/* STEP 4 */}
          <section className={CARD} hidden={step !== 3}>
            <h2 className="text-[15px] font-bold text-white mb-4">4 · Timing</h2>
            <div className="grid md:grid-cols-2 gap-x-5 gap-y-4">
              <div>
                <label className={LABEL}>Duration in minutes</label>
                <input type="number" name="durationMinutes" defaultValue={d("durationMinutes", "60")} required min="1" className={`${INPUT} tabular-nums`} />
              </div>
              <div>
                <label className={LABEL}>Default start window in hours</label>
                <input type="number" name="defaultStartWindowHours" defaultValue={d("defaultStartWindowHours", "1")} min="1" className={`${INPUT} tabular-nums`} />
              </div>
            </div>
            <p className="mt-3 text-[10px] text-neutral-500 leading-relaxed">
              Session example: 10 Oct 2026, 09:00–10:00 IST. Server-calibrated time is authoritative. A scheduled session may set an explicit opening and deadline; this draft does not open an exam.
            </p>
          </section>

          {/* STEP 5 */}
          <section className={CARD} hidden={step !== 4}>
            <h2 className="text-[15px] font-bold text-white mb-4">5 · Navigation</h2>
            <label className={LABEL}>Maximum attempts</label>
            <input type="number" name="maxAttempts" defaultValue={d("maxAttempts", "1")} min="1" className={`${INPUT} tabular-nums mb-4`} />
            <div className="flex items-center gap-2 mb-4">
              <Segmented
                name="questionDisplayMode"
                defaultValue={(d("questionDisplayMode", "ONE_AT_A_TIME") as "ONE_AT_A_TIME" | "ALL_ON_ONE_PAGE") === "ALL_ON_ONE_PAGE" ? "ALL_ON_ONE_PAGE" : "ONE_AT_A_TIME"}
                options={[
                  { value: "ONE_AT_A_TIME", label: "● ONE AT A TIME" },
                  { value: "ALL_ON_ONE_PAGE", label: "○ ALL ON ONE PAGE" },
                ]}
              />
            </div>
            <div className="space-y-2.5">
              {[
                ["allowQuestionSkip", "Allow Skip", true],
                ["allowAnswerReview", "Review Before Submit", true],
                ["allowBackNavigation", "Allow Back Navigation", true],
              ].map(([n, l, fb]) => (
                <div key={n as string} className="flex items-center justify-between gap-3 bg-black/40 rounded-xl border border-white/10 px-4 py-3">
                  <p className="text-xs font-bold text-white">{l}</p>
                  <Switch name={n as string} defaultChecked={dc(n as string, fb as boolean)} />
                </div>
              ))}
            </div>
            <p className="mt-3 text-[10px] text-neutral-500">Review markers may overlap answered questions. Returning to a question retains its saved response.</p>
          </section>

          {/* STEP 6 */}
          <section className={CARD} hidden={step !== 5}>
            <h2 className="text-[15px] font-bold text-white mb-4">6 · Feedback</h2>
            <div className="flex items-center gap-2 mb-4">
              <Segmented
                name="resultVisibility"
                defaultValue={(["IMMEDIATE", "AFTER_RELEASE", "NEVER"] as const).includes(d("resultVisibility", "IMMEDIATE") as any) ? (d("resultVisibility", "IMMEDIATE") as "IMMEDIATE" | "AFTER_RELEASE" | "NEVER") : "IMMEDIATE"}
                options={[
                  { value: "IMMEDIATE", label: "○ IMMEDIATE" },
                  { value: "AFTER_RELEASE", label: "● AFTER SESSION RELEASE" },
                  { value: "NEVER", label: "○ NEVER" },
                ]}
              />
            </div>
            <div className="space-y-2.5">
              <div className="flex items-center justify-between gap-3 bg-black/40 rounded-xl border border-white/10 px-4 py-3">
                <p className="text-xs font-bold text-white">Show correct answers after owner release</p>
                <Switch name="showCorrectAnswers" defaultChecked={dc("showCorrectAnswers", true)} />
              </div>
              <div className="flex items-center justify-between gap-3 bg-black/40 rounded-xl border border-white/10 px-4 py-3">
                <p className="text-xs font-bold text-white">Show explanations after owner release</p>
                <Switch name="showExplanation" defaultChecked={dc("showExplanation", false)} />
              </div>
            </div>
            <div className="mt-3 rounded-xl border border-white/10 bg-black/40 p-3">
              <p className="text-[10px] text-neutral-400 leading-relaxed">Owner-controlled candidate visibility. Explanations stay hidden until the session is released. Owner audit answer keys are always available to the authorized owner, independently of this setting.</p>
            </div>
          </section>

          {/* STEP 7 */}
          <section className={CARD} hidden={step !== 6}>
            <h2 className="text-[15px] font-bold text-white mb-4">7 · Proctoring</h2>
            <div className="mb-3">
              <label className={LABEL}>Tab-switch threshold N · auto-submit</label>
              <input type="number" name="tabSwitchLimit" defaultValue={d("tabSwitchLimit", "5")} min="1" placeholder="5 verified events" className={`${INPUT} tabular-nums`} />
            </div>
            <div className="space-y-2.5">
              <div className="flex items-center justify-between gap-3 bg-black/40 rounded-xl border border-white/10 px-4 py-3">
                <p className="text-xs font-bold text-white">Require fullscreen</p>
                <Switch name="requireFullscreen" defaultChecked={dc("requireFullscreen", true)} />
              </div>
              <div className="flex items-center justify-between gap-3 bg-black/40 rounded-xl border border-white/10 px-4 py-3">
                <p className="text-xs font-bold text-white">Disable copy / paste</p>
                <Switch name="disableCopyPaste" defaultChecked={dc("disableCopyPaste", true)} />
              </div>
            </div>
            <p className="mt-3 text-[10px] text-neutral-500 leading-relaxed">Warnings appear before the threshold. Focus events require context; a flag is not an automatic cheating verdict. Optional display, VM/RDP and extension checks depend on browser capability and cannot guarantee detection.</p>
          </section>

          {/* STEP 8 */}
          <section className={CARD} hidden={step !== 7}>
            <h2 className="text-[15px] font-bold text-white mb-4">8 · Gamification</h2>
            <div className="space-y-2.5">
              <div className="flex items-center justify-between gap-3 bg-black/40 rounded-xl border border-white/10 px-4 py-3">
                <div>
                  <p className="text-xs font-bold text-white">Kahoot / Wayground-inspired mode · Idrisified</p>
                  <p className="text-[10px] text-neutral-500 mt-0.5">Master switch for every playful mechanic below.</p>
                </div>
                <Switch name="isGamified" defaultChecked={dc("isGamified", false)} onChange={setIsGamified} />
              </div>
              <div className="rounded-xl border border-white/10 bg-black/40 px-4 py-3 space-y-3">
                <LockedSwitch on={isGamified} label="Spirit Mascot selector" hint="Candidates pick an emblem before launch." />
                <LockedSwitch on={isGamified} label="Correct-answer streak highlights" hint="Live multipliers stay cosmetic." />
                <LockedSwitch on={isGamified} label="Result podium display" hint="Celebration board on the scorecard." />
              </div>
            </div>
            <div className="mt-3 rounded-xl border border-lime-300/25 bg-lime-300/[0.05] p-3">
              <p className="text-[10px] text-neutral-300 leading-relaxed">Flavor only. Never extra marks. Six mascot choices are cosmetic. The selected spirit appears in the exam header, invigilator roster and result podium. No scoring, timing, partial-credit or ranking advantage is granted.</p>
            </div>
          </section>

          {/* Wizard nav */}
          <div className="rounded-2xl border border-white/10 bg-[#0e0f13] p-5">
            <p className="text-[13px] font-bold text-white">Ready to save</p>
            <p className="text-[11px] text-neutral-400 mt-1 tabular-nums">
              {totalQuestions} questions · {Math.round(maxMarks)} maximum marks · {selectedCount} fixed + {rulesDemand} dynamic picks{poolReady || rules.length === 0 ? "" : " · pool shortfall — see sidebar"}. Saving creates a versioned draft, not a live session.
            </p>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => goStep(step - 1)}
                disabled={step === 0}
                className="px-5 py-2.5 text-xs font-bold text-neutral-200 bg-white/[0.05] hover:bg-white/10 border border-white/10 rounded-xl transition-all disabled:opacity-40"
              >
                ← Back
              </button>
              {step < STEPS.length - 1 ? (
                <button
                  type="button"
                  onClick={() => goStep(step + 1)}
                  className="px-5 py-2.5 text-xs font-black text-black bg-lime-300 hover:brightness-110 rounded-xl transition-all"
                >
                  Next →
                </button>
              ) : (
                <button
                  type="submit"
                  disabled={loading}
                  className="px-5 py-2.5 text-xs font-black text-black bg-lime-300 hover:brightness-110 rounded-xl transition-all disabled:opacity-50"
                >
                  {loading ? "Saving…" : "Save Blueprint"}
                </button>
              )}
              <span className="ml-auto flex gap-2">
                <button type="button" onClick={() => goStep(0)} className="px-4 py-2.5 text-xs font-bold text-neutral-400 hover:text-white transition-colors">
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={saveDraft}
                  disabled={savingDraft}
                  className="px-4 py-2.5 text-xs font-bold text-neutral-200 bg-white/[0.05] hover:bg-white/10 border border-white/10 rounded-xl transition-all disabled:opacity-50"
                >
                  Save Draft
                </button>
              </span>
            </div>
          </div>
        </div>
      </div>
    </form>
  );
}
