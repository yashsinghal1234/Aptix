"use client";

import { useState } from "react";
import { createTemplateAction } from "@/app/actions/template";
import { useRouter } from "next/navigation";
import { FIXED_TOPICS, FIXED_DIFFICULTIES } from "@/lib/ai-question-analyzer";

export function CreateTemplateForm({ allQuestions }: { allQuestions: any[] }) {
  const router = useRouter();
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [rules, setRules] = useState<{id: string, category: string, difficultyLevel: string, count: number}[]>([]);
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const toggleQuestion = (id: string) => {
    const newSet = new Set(selectedIds);
    if (newSet.has(id)) newSet.delete(id);
    else newSet.add(id);
    setSelectedIds(newSet);
  };

  const addRule = () => {
    setRules([...rules, { id: Math.random().toString(), category: FIXED_TOPICS[0], difficultyLevel: "MEDIUM", count: 5 }]);
  };

  const updateRule = (id: string, field: string, value: string | number) => {
    setRules(rules.map(r => r.id === id ? { ...r, [field]: value } : r));
  };

  const removeRule = (id: string) => {
    setRules(rules.filter(r => r.id !== id));
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (selectedIds.size === 0 && rules.length === 0) {
      setError("Please select at least one fixed question or add at least one auto-pick rule.");
      window.scrollTo({ top: 0, behavior: 'smooth' });
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
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else {
      router.push("/dashboard/owner");
    }
  };

  const [filterTopic, setFilterTopic] = useState("");
  const [filterDiff, setFilterDiff] = useState("");

  const filteredQuestions = allQuestions.filter(q => {
    if (filterTopic && q.category !== filterTopic) return false;
    if (filterDiff && q.difficultyLevel !== filterDiff) return false;
    return true;
  });

  const selectAllFiltered = () => {
    const newSet = new Set(selectedIds);
    filteredQuestions.forEach(q => newSet.add(q.id));
    setSelectedIds(newSet);
  };

  const deselectAllFiltered = () => {
    const newSet = new Set(selectedIds);
    filteredQuestions.forEach(q => newSet.delete(q.id));
    setSelectedIds(newSet);
  };

  const isAllFilteredSelected = filteredQuestions.length > 0 && filteredQuestions.every(q => selectedIds.has(q.id));
  const isSomeFilteredSelected = filteredQuestions.some(q => selectedIds.has(q.id)) && !isAllFilteredSelected;

  const toggleAllFiltered = () => {
    if (isAllFilteredSelected) {
      deselectAllFiltered();
    } else {
      selectAllFiltered();
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-8 max-w-5xl mx-auto pb-24">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">Create Assessment Template</h1>
          <p className="text-neutral-400 text-xs mt-0.5">Define blueprint rules, scoring models, and security constraints</p>
        </div>
        <button 
          disabled={loading}
          type="submit"
          className="px-6 py-2.5 bg-white hover:bg-neutral-200 text-black text-xs font-bold rounded-xl shadow-md transition-all disabled:opacity-50 w-fit"
        >
          {loading ? "Saving..." : "Save Template"}
        </button>
      </div>

      {error && (
        <div className="bg-rose-950/40 text-rose-300 p-4 rounded-2xl text-xs font-bold border border-rose-800/60">
          {error}
        </div>
      )}

      {/* 1. Basic Info */}
      <section className="bg-[#0a0c10] p-6 sm:p-8 rounded-3xl border border-neutral-800 shadow-2xl">
        <div className="flex items-center gap-3 mb-6 pb-4 border-b border-neutral-800">
          <span className="w-7 h-7 rounded-xl bg-neutral-900 text-white font-extrabold text-xs flex items-center justify-center border border-neutral-700">1</span>
          <h3 className="text-base font-bold text-white tracking-tight">Basic Information</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-xs font-bold text-neutral-400 uppercase tracking-wider mb-2">Template Title</label>
            <input type="text" name="title" required placeholder="e.g. Engineering Placement Aptitude - Phase 1" className="w-full px-4 py-2.5 text-xs bg-neutral-900 border border-neutral-800 rounded-xl focus:bg-black focus:ring-1 focus:ring-neutral-700 outline-none transition-all font-medium text-white placeholder-neutral-600" />
          </div>
          <div>
            <label className="block text-xs font-bold text-neutral-400 uppercase tracking-wider mb-2">Subject / Category</label>
            <input type="text" name="subject" placeholder="e.g. General Aptitude, Core CS" className="w-full px-4 py-2.5 text-xs bg-neutral-900 border border-neutral-800 rounded-xl focus:bg-black focus:ring-1 focus:ring-neutral-700 outline-none transition-all font-medium text-white placeholder-neutral-600" />
          </div>
          <div className="md:col-span-2">
            <label className="block text-xs font-bold text-neutral-400 uppercase tracking-wider mb-2">Description</label>
            <input type="text" name="description" placeholder="Brief context about this assessment template..." className="w-full px-4 py-2.5 text-xs bg-neutral-900 border border-neutral-800 rounded-xl focus:bg-black focus:ring-1 focus:ring-neutral-700 outline-none transition-all font-medium text-white placeholder-neutral-600" />
          </div>
          <div className="md:col-span-2">
            <label className="block text-xs font-bold text-neutral-400 uppercase tracking-wider mb-2">Candidate Instructions</label>
            <textarea name="instructions" rows={2} placeholder="Detailed instructions displayed to the candidate before starting..." className="w-full px-4 py-2.5 text-xs bg-neutral-900 border border-neutral-800 rounded-xl focus:bg-black focus:ring-1 focus:ring-neutral-700 outline-none transition-all font-medium text-white placeholder-neutral-600 resize-none"></textarea>
          </div>
          <div className="md:col-span-2">
            <label className="block text-xs font-bold text-neutral-400 uppercase tracking-wider mb-1">
              Restricted Candidate Email Domain <span className="text-neutral-500 font-normal normal-case">(Optional)</span>
            </label>
            <input 
              type="text" 
              name="allowedEmailDomain" 
              placeholder="e.g. kiet.edu or @kiet.edu" 
              className="w-full px-4 py-2.5 text-xs bg-neutral-900 border border-neutral-800 rounded-xl focus:bg-black focus:ring-1 focus:ring-neutral-700 outline-none transition-all font-medium text-white placeholder-neutral-600" 
            />
            <p className="text-[11px] text-neutral-500 mt-1">If set, candidates must use an email ending with this domain to start the exam.</p>
          </div>
        </div>
      </section>

      {/* 2. Blueprint & Selection Mode */}
      <section className="bg-[#0a0c10] p-6 sm:p-8 rounded-3xl border border-neutral-800 shadow-2xl">
        <div className="flex items-center gap-3 mb-6 pb-4 border-b border-neutral-800">
          <span className="w-7 h-7 rounded-xl bg-neutral-900 text-white font-extrabold text-xs flex items-center justify-center border border-neutral-700">2</span>
          <h3 className="text-base font-bold text-white tracking-tight">Question Selection Strategy</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          <div>
            <label className="block text-xs font-bold text-neutral-400 uppercase tracking-wider mb-2">Selection Mode</label>
            <select name="selectionMode" className="w-full px-4 py-2.5 text-xs bg-neutral-900 border border-neutral-800 rounded-xl focus:bg-black focus:ring-1 focus:ring-neutral-700 outline-none transition-all font-semibold text-white">
              <option value="MANUAL">Manual (Fixed Questions)</option>
              <option value="RULE_BASED">Dynamic Blueprint (Auto-Pick Rules)</option>
              <option value="HYBRID">Hybrid (Fixed + Dynamic Auto-Pick)</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
          {/* Dynamic Auto-Pick Rules */}
          <div className="bg-[#0d0f14] p-6 rounded-2xl border border-neutral-800">
            <div className="flex justify-between items-center mb-4">
              <div>
                <h4 className="font-bold text-white text-xs uppercase tracking-wider">Dynamic Auto-Pick Rules</h4>
                <p className="text-[11px] text-neutral-400 mt-0.5">System will randomly draw questions per student matching these criteria</p>
              </div>
              <button type="button" onClick={addRule} className="text-xs font-bold text-neutral-200 hover:text-white bg-neutral-900 hover:bg-neutral-800 px-3 py-1.5 rounded-xl border border-neutral-700 transition-colors shrink-0">
                + Add Rule
              </button>
            </div>
            {rules.length === 0 ? (
              <p className="text-xs text-neutral-500 italic py-4 text-center bg-neutral-900/60 rounded-xl border border-neutral-800">No dynamic rules added yet.</p>
            ) : (
              <div className="space-y-3">
                {rules.map((rule) => (
                  <div key={rule.id} className="flex gap-2 items-center bg-neutral-900 p-3 rounded-xl border border-neutral-800 shadow-sm">
                    <select value={rule.category} onChange={e => updateRule(rule.id, "category", e.target.value)} className="text-xs border border-neutral-800 rounded-lg p-1.5 flex-1 bg-black font-medium text-neutral-200">
                      {FIXED_TOPICS.map((topic) => (
                        <option key={topic} value={topic}>{topic}</option>
                      ))}
                    </select>
                    <select value={rule.difficultyLevel} onChange={e => updateRule(rule.id, "difficultyLevel", e.target.value)} className="text-xs border border-neutral-800 rounded-lg p-1.5 flex-1 bg-black font-medium text-neutral-200">
                      {FIXED_DIFFICULTIES.map((diff) => (
                        <option key={diff} value={diff}>{diff === "MEDIUM" ? "Med" : diff.charAt(0) + diff.slice(1).toLowerCase()}</option>
                      ))}
                    </select>
                    <input type="number" min="1" value={rule.count} onChange={e => updateRule(rule.id, "count", parseInt(e.target.value)||1)} className="text-xs border border-neutral-800 rounded-lg p-1.5 w-16 bg-black font-bold text-white" />
                    <button type="button" onClick={() => removeRule(rule.id)} className="text-rose-400 hover:bg-rose-950/40 p-1.5 rounded-lg text-sm font-bold">&times;</button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Fixed Selection */}
          <div className="bg-[#0d0f14] p-6 rounded-2xl border border-neutral-800 flex flex-col h-[460px]">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
              <div className="flex items-center gap-2">
                <h4 className="font-bold text-white text-xs uppercase tracking-wider">
                  Fixed Questions ({selectedIds.size})
                </h4>
                <span className="text-[10px] font-semibold text-neutral-400">
                  of {allQuestions.length}
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={selectAllFiltered}
                  className="text-[11px] font-bold text-neutral-200 hover:text-white bg-neutral-900 hover:bg-neutral-800 px-2.5 py-1 rounded-lg border border-neutral-700 transition-colors"
                >
                  Select All {filteredQuestions.length > 0 ? `(${filteredQuestions.length})` : ''}
                </button>
                {selectedIds.size > 0 && (
                  <button
                    type="button"
                    onClick={() => setSelectedIds(new Set())}
                    className="text-[11px] font-bold text-neutral-400 hover:text-rose-400 hover:bg-rose-950/30 px-2.5 py-1 rounded-lg transition-colors"
                  >
                    Clear
                  </button>
                )}
              </div>
            </div>

            <div className="flex gap-2 mb-2.5">
              <select className="text-xs border border-neutral-800 rounded-xl p-2 flex-1 bg-neutral-900 font-medium text-neutral-200" value={filterTopic} onChange={e => setFilterTopic(e.target.value)}>
                <option value="">All Topics</option>
                {FIXED_TOPICS.map((topic) => (
                  <option key={topic} value={topic}>{topic}</option>
                ))}
              </select>
              <select className="text-xs border border-neutral-800 rounded-xl p-2 flex-1 bg-neutral-900 font-medium text-neutral-200" value={filterDiff} onChange={e => setFilterDiff(e.target.value)}>
                <option value="">All Diffs</option>
                <option value="EASY">Easy</option>
                <option value="MEDIUM">Med</option>
                <option value="HARD">Hard</option>
              </select>
            </div>

            {filteredQuestions.length > 0 && (
              <div 
                onClick={toggleAllFiltered} 
                className="flex items-center gap-2 px-3 py-2 bg-neutral-900 rounded-xl border border-neutral-800 mb-2 cursor-pointer select-none hover:bg-neutral-800 transition-colors"
              >
                <input 
                  type="checkbox" 
                  checked={isAllFilteredSelected} 
                  ref={el => { if (el) el.indeterminate = isSomeFilteredSelected; }}
                  onChange={() => {}} 
                  className="accent-white rounded cursor-pointer w-4 h-4" 
                />
                <span className="text-[11px] font-bold text-neutral-200">
                  {isAllFilteredSelected 
                    ? "Deselect All Filtered Questions" 
                    : `Select All ${filteredQuestions.length} Filtered Question${filteredQuestions.length === 1 ? '' : 's'}`}
                </span>
              </div>
            )}

            <div className="flex-1 overflow-y-auto space-y-2 pr-1.5">
              {filteredQuestions.length === 0 ? (
                <p className="text-xs text-neutral-500 italic py-8 text-center bg-neutral-900/60 rounded-xl border border-neutral-800">
                  No questions match the current filter.
                </p>
              ) : (
                filteredQuestions.map(q => (
                  <div key={q.id} onClick={() => toggleQuestion(q.id)} className={`p-3 rounded-xl border text-xs cursor-pointer transition-all ${selectedIds.has(q.id) ? 'bg-neutral-900 border-neutral-600 text-white font-semibold' : 'bg-black/60 border-neutral-800/80 hover:bg-neutral-900 text-neutral-300'}`}>
                    <div className="flex items-start gap-3">
                      <input type="checkbox" checked={selectedIds.has(q.id)} readOnly className="mt-0.5 accent-white rounded w-4 h-4 cursor-pointer" />
                      <div className="flex-1">
                        <div className="line-clamp-2">{q.text}</div>
                        {q.imageUrl && (
                          <img src={q.imageUrl} alt="Diagram" className="max-h-12 rounded border border-neutral-800 mt-1 object-contain" />
                        )}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </section>

      {/* 3. Scoring Rules */}
      <section className="bg-[#0a0c10] p-6 sm:p-8 rounded-3xl border border-neutral-800 shadow-2xl">
        <div className="flex items-center gap-3 mb-6 pb-4 border-b border-neutral-800">
          <span className="w-7 h-7 rounded-xl bg-neutral-900 text-white font-extrabold text-xs flex items-center justify-center border border-neutral-700">3</span>
          <h3 className="text-base font-bold text-white tracking-tight">Scoring Policy</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div>
            <label className="block text-xs font-bold text-neutral-400 uppercase tracking-wider mb-2">Marks Per Question</label>
            <input type="number" name="marksPerQuestion" defaultValue="1" step="0.5" min="0" className="w-full px-4 py-2.5 text-xs bg-neutral-900 border border-neutral-800 rounded-xl focus:bg-black focus:ring-1 focus:ring-neutral-700 outline-none transition-all font-medium text-white" />
          </div>
          <div>
            <label className="block text-xs font-bold text-neutral-400 uppercase tracking-wider mb-2">Pass Benchmark (%)</label>
            <input type="number" name="passCriteria" defaultValue="50" min="0" max="100" className="w-full px-4 py-2.5 text-xs bg-neutral-900 border border-neutral-800 rounded-xl focus:bg-black focus:ring-1 focus:ring-neutral-700 outline-none transition-all font-medium text-white" />
          </div>
          <div className="flex items-end pb-2">
            <label className="flex items-center gap-3 cursor-pointer">
              <input type="checkbox" name="negativeMarkingEnabled" className="w-4 h-4 rounded border-neutral-700 accent-white" />
              <span className="text-xs font-bold text-neutral-300">Enable Negative Marking</span>
            </label>
          </div>
          <div>
            <label className="block text-xs font-bold text-neutral-400 uppercase tracking-wider mb-2">Negative Deduction (e.g. 0.25)</label>
            <input type="number" name="negativeMarksValue" defaultValue="0" step="0.01" min="0" className="w-full px-4 py-2.5 text-xs bg-neutral-900 border border-neutral-800 rounded-xl focus:bg-black focus:ring-1 focus:ring-neutral-700 outline-none transition-all font-medium text-white" />
          </div>
          <div className="flex items-end pb-2">
            <label className="flex items-center gap-3 cursor-pointer">
              <input type="checkbox" name="partialCreditEnabled" className="w-4 h-4 rounded border-neutral-700 accent-white" />
              <span className="text-xs font-bold text-neutral-300">Enable Partial Credit (MSQ)</span>
            </label>
          </div>
        </div>
      </section>

      {/* 4. Timing Defaults */}
      <section className="bg-[#0a0c10] p-6 sm:p-8 rounded-3xl border border-neutral-800 shadow-2xl">
        <div className="flex items-center gap-3 mb-6 pb-4 border-b border-neutral-800">
          <span className="w-7 h-7 rounded-xl bg-neutral-900 text-white font-extrabold text-xs flex items-center justify-center border border-neutral-700">4</span>
          <h3 className="text-base font-bold text-white tracking-tight">Assessment Timing</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-xs font-bold text-neutral-400 uppercase tracking-wider mb-2">Exam Duration (minutes)</label>
            <input type="number" name="durationMinutes" defaultValue="60" required min="1" className="w-full px-4 py-2.5 text-xs bg-neutral-900 border border-neutral-800 rounded-xl focus:bg-black focus:ring-1 focus:ring-neutral-700 outline-none transition-all font-medium text-white" />
          </div>
          <div>
            <label className="block text-xs font-bold text-neutral-400 uppercase tracking-wider mb-2">Default Start Window (hours) <span className="text-neutral-500 font-normal">(Optional)</span></label>
            <input type="number" name="defaultStartWindowHours" min="1" placeholder="e.g. 24" className="w-full px-4 py-2.5 text-xs bg-neutral-900 border border-neutral-800 rounded-xl focus:bg-black focus:ring-1 focus:ring-neutral-700 outline-none transition-all font-medium text-white placeholder-neutral-600" />
          </div>
        </div>
      </section>

      {/* 5. Attempt Behavior */}
      <section className="bg-[#0a0c10] p-6 sm:p-8 rounded-3xl border border-neutral-800 shadow-2xl">
        <div className="flex items-center gap-3 mb-6 pb-4 border-b border-neutral-800">
          <span className="w-7 h-7 rounded-xl bg-neutral-900 text-white font-extrabold text-xs flex items-center justify-center border border-neutral-700">5</span>
          <h3 className="text-base font-bold text-white tracking-tight">Candidate Navigation Behavior</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          <div>
            <label className="block text-xs font-bold text-neutral-400 uppercase tracking-wider mb-2">Max Attempts Allowed</label>
            <input type="number" name="maxAttempts" defaultValue="1" min="1" className="w-full px-4 py-2.5 text-xs bg-neutral-900 border border-neutral-800 rounded-xl focus:bg-black focus:ring-1 focus:ring-neutral-700 outline-none transition-all font-medium text-white" />
          </div>
          <div>
            <label className="block text-xs font-bold text-neutral-400 uppercase tracking-wider mb-2">Question Layout Mode</label>
            <select name="questionDisplayMode" className="w-full px-4 py-2.5 text-xs bg-neutral-900 border border-neutral-800 rounded-xl focus:bg-black focus:ring-1 focus:ring-neutral-700 outline-none transition-all font-semibold text-white">
              <option value="ONE_AT_A_TIME">One Question at a time (Recommended)</option>
              <option value="ALL_ON_ONE_PAGE">All Questions on single page</option>
            </select>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <label className="flex items-center gap-3 cursor-pointer">
            <input type="checkbox" name="allowQuestionSkip" defaultChecked className="w-4 h-4 rounded border-neutral-700 accent-white" />
            <span className="text-xs font-bold text-neutral-300">Allow Question Skip</span>
          </label>
          <label className="flex items-center gap-3 cursor-pointer">
            <input type="checkbox" name="allowAnswerReview" defaultChecked className="w-4 h-4 rounded border-neutral-700 accent-white" />
            <span className="text-xs font-bold text-neutral-300">Allow Review Before Submit</span>
          </label>
          <label className="flex items-center gap-3 cursor-pointer">
            <input type="checkbox" name="allowBackNavigation" defaultChecked className="w-4 h-4 rounded border-neutral-700 accent-white" />
            <span className="text-xs font-bold text-neutral-300">Allow Back Navigation</span>
          </label>
        </div>
      </section>

      {/* 6. Result & Feedback Settings */}
      <section className="bg-[#0a0c10] p-6 sm:p-8 rounded-3xl border border-neutral-800 shadow-2xl">
        <div className="flex items-center gap-3 mb-6 pb-4 border-b border-neutral-800">
          <span className="w-7 h-7 rounded-xl bg-neutral-900 text-white font-extrabold text-xs flex items-center justify-center border border-neutral-700">6</span>
          <h3 className="text-base font-bold text-white tracking-tight">Feedback & Review Visibility</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          <div>
            <label className="block text-xs font-bold text-neutral-400 uppercase tracking-wider mb-2">Score Visibility</label>
            <select name="resultVisibility" className="w-full px-4 py-2.5 text-xs bg-neutral-900 border border-neutral-800 rounded-xl focus:bg-black focus:ring-1 focus:ring-neutral-700 outline-none transition-all font-medium text-white">
              <option value="IMMEDIATE">Immediate (Upon Submission)</option>
              <option value="AFTER_RELEASE">After Session Ends / Manual Release</option>
              <option value="NEVER">Never (Internal Audit Only)</option>
            </select>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <label className="flex items-center gap-3 cursor-pointer">
            <input type="checkbox" name="showCorrectAnswers" defaultChecked className="w-4 h-4 rounded border-neutral-700 accent-white" />
            <span className="text-xs font-bold text-neutral-300">Display Correct Keys upon Result</span>
          </label>
          <label className="flex items-center gap-3 cursor-pointer">
            <input type="checkbox" name="showExplanation" className="w-4 h-4 rounded border-neutral-700 accent-white" />
            <span className="text-xs font-bold text-neutral-300">Display Detailed Solution Explanations</span>
          </label>
        </div>
      </section>

      {/* 7. Integrity Settings */}
      <section className="bg-[#0a0c10] p-6 sm:p-8 rounded-3xl border border-neutral-800 shadow-2xl">
        <div className="flex items-center gap-3 mb-6 pb-4 border-b border-neutral-800">
          <span className="w-7 h-7 rounded-xl bg-neutral-900 text-white font-extrabold text-xs flex items-center justify-center border border-neutral-700">7</span>
          <h3 className="text-base font-bold text-white tracking-tight">Anti-Cheating & Proctoring</h3>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          <div>
            <label className="block text-xs font-bold text-neutral-400 uppercase tracking-wider mb-2">Tab Switch Threshold <span className="text-neutral-500 font-normal">(Auto-submit after N switches)</span></label>
            <input type="number" name="tabSwitchLimit" placeholder="e.g. 3 (leave blank for unlimited)" min="1" className="w-full px-4 py-2.5 text-xs bg-neutral-900 border border-neutral-800 rounded-xl focus:bg-black focus:ring-1 focus:ring-neutral-700 outline-none transition-all font-medium text-white placeholder-neutral-600" />
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <label className="flex items-center gap-3 cursor-pointer">
            <input type="checkbox" name="requireFullscreen" defaultChecked className="w-4 h-4 rounded border-neutral-700 accent-white" />
            <span className="text-xs font-bold text-neutral-300">Require Fullscreen Proctoring</span>
          </label>
          <label className="flex items-center gap-3 cursor-pointer">
            <input type="checkbox" name="disableCopyPaste" defaultChecked className="w-4 h-4 rounded border-neutral-700 accent-white" />
            <span className="text-xs font-bold text-neutral-300">Block Clipboard Copy/Paste</span>
          </label>
        </div>
      </section>

      <div className="flex justify-end pt-4">
        <button 
          disabled={loading}
          type="submit"
          className="px-8 py-3 bg-white hover:bg-neutral-200 text-black text-xs font-bold rounded-xl shadow-md transition-all disabled:opacity-50"
        >
          {loading ? "Saving Template..." : "Save Assessment Template →"}
        </button>
      </div>
    </form>
  );
}
