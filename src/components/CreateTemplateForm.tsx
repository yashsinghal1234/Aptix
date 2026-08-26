"use client";

import { useState } from "react";
import { createTemplateAction } from "@/app/actions/template";
import { useRouter } from "next/navigation";

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
    setRules([...rules, { id: Math.random().toString(), category: "Quantitative", difficultyLevel: "MEDIUM", count: 5 }]);
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

  return (
    <form onSubmit={handleSubmit} className="space-y-8 max-w-6xl mx-auto pb-24">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-slate-800">Create Exam Template</h1>
        <button 
          disabled={loading}
          type="submit"
          className="px-6 py-2.5 bg-indigo-600 text-white font-bold rounded-lg shadow hover:bg-indigo-700 transition-colors disabled:opacity-50"
        >
          {loading ? "Saving..." : "Save Template"}
        </button>
      </div>

      {error && (
        <div className="bg-red-50 text-red-700 p-4 rounded-lg font-medium border border-red-200">
          {error}
        </div>
      )}

      {/* 1. Basic Info */}
      <section className="bg-white p-8 rounded-xl border shadow-sm">
        <h3 className="text-xl font-bold text-slate-800 mb-6 border-b pb-4">1. Basic Information</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">Template Title</label>
            <input type="text" name="title" required placeholder="e.g. Standard React Developer Assessment" className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500" />
          </div>
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">Subject / Category</label>
            <input type="text" name="subject" placeholder="e.g. Computer Science" className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500" />
          </div>
          <div className="col-span-2">
            <label className="block text-sm font-semibold text-slate-700 mb-2">Short Description</label>
            <input type="text" name="description" placeholder="Brief summary of what this exam tests" className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500" />
          </div>
          <div className="col-span-2">
            <label className="block text-sm font-semibold text-slate-700 mb-2">Candidate Instructions</label>
            <textarea name="instructions" rows={3} placeholder="These instructions will be shown to candidates before they start." className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500" />
          </div>
        </div>
      </section>

      {/* 2. Question Selection */}
      <section className="bg-white p-8 rounded-xl border shadow-sm">
        <h3 className="text-xl font-bold text-slate-800 mb-6 border-b pb-4">2. Question Selection</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">Selection Mode</label>
            <select name="selectionMode" className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500">
              <option value="MANUAL">Manual (Fixed Questions)</option>
              <option value="RULE_BASED">Rule-Based (Auto-Pick)</option>
              <option value="HYBRID">Hybrid (Both)</option>
            </select>
          </div>
          <div className="flex items-end pb-2">
            <label className="flex items-center gap-3 cursor-pointer">
              <input type="checkbox" name="randomizeQuestionOrder" className="w-5 h-5 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500" />
              <span className="text-sm font-medium text-slate-700">Randomize Question Order</span>
            </label>
          </div>
          <div className="flex items-end pb-2">
            <label className="flex items-center gap-3 cursor-pointer">
              <input type="checkbox" name="randomizeOptionOrder" className="w-5 h-5 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500" />
              <span className="text-sm font-medium text-slate-700">Randomize Option Order</span>
            </label>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Rule-Based */}
          <div className="bg-slate-50 p-6 rounded-xl border">
            <div className="flex justify-between items-center mb-4">
              <h4 className="font-bold text-slate-800">Auto-Pick Rules</h4>
              <button type="button" onClick={addRule} className="text-xs bg-indigo-100 text-indigo-700 px-3 py-1.5 rounded font-bold">+ Rule</button>
            </div>
            {rules.length === 0 ? (
              <p className="text-sm text-slate-500 text-center py-6">No rules defined.</p>
            ) : (
              <div className="space-y-3">
                {rules.map(rule => (
                  <div key={rule.id} className="flex gap-2 items-center bg-white p-2 border rounded shadow-sm">
                    <select value={rule.category} onChange={e => updateRule(rule.id, "category", e.target.value)} className="text-sm border rounded p-1.5 flex-1">
                      <option value="Quantitative">Quant</option>
                      <option value="Logical">Logical</option>
                      <option value="Verbal">Verbal</option>
                      <option value="Technical">Tech</option>
                    </select>
                    <select value={rule.difficultyLevel} onChange={e => updateRule(rule.id, "difficultyLevel", e.target.value)} className="text-sm border rounded p-1.5 flex-1">
                      <option value="EASY">Easy</option>
                      <option value="MEDIUM">Med</option>
                      <option value="HARD">Hard</option>
                    </select>
                    <input type="number" min="1" value={rule.count} onChange={e => updateRule(rule.id, "count", parseInt(e.target.value)||1)} className="text-sm border rounded p-1.5 w-16" />
                    <button type="button" onClick={() => removeRule(rule.id)} className="text-red-500 px-2">&times;</button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Fixed Selection */}
          <div className="bg-slate-50 p-6 rounded-xl border flex flex-col h-[400px]">
            <div className="flex justify-between items-center mb-4">
              <h4 className="font-bold text-slate-800">Fixed Questions ({selectedIds.size})</h4>
            </div>
            <div className="flex gap-2 mb-3">
              <select className="text-xs border rounded p-1.5 flex-1" value={filterTopic} onChange={e => setFilterTopic(e.target.value)}>
                <option value="">All Topics</option>
                <option value="Logical">Logical</option>
                <option value="Quantitative">Quant</option>
                <option value="Verbal">Verbal</option>
                <option value="Technical">Tech</option>
              </select>
              <select className="text-xs border rounded p-1.5 flex-1" value={filterDiff} onChange={e => setFilterDiff(e.target.value)}>
                <option value="">All Diffs</option>
                <option value="EASY">Easy</option>
                <option value="MEDIUM">Med</option>
                <option value="HARD">Hard</option>
              </select>
            </div>
            <div className="flex-1 overflow-y-auto space-y-2 pr-2">
              {filteredQuestions.map(q => (
                <div key={q.id} onClick={() => toggleQuestion(q.id)} className={`p-3 rounded-lg border text-sm cursor-pointer transition-colors ${selectedIds.has(q.id) ? 'bg-indigo-50 border-indigo-500' : 'bg-white hover:bg-slate-50'}`}>
                  <div className="flex items-start gap-3">
                    <input type="checkbox" checked={selectedIds.has(q.id)} readOnly className="mt-1" />
                    <div className="flex-1 line-clamp-2">{q.text}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* 3. Scoring Rules */}
      <section className="bg-white p-8 rounded-xl border shadow-sm">
        <h3 className="text-xl font-bold text-slate-800 mb-6 border-b pb-4">3. Scoring Rules</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">Marks Per Question</label>
            <input type="number" name="marksPerQuestion" defaultValue="1" step="0.5" min="0" className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500" />
          </div>
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">Pass Criteria (%)</label>
            <input type="number" name="passCriteria" defaultValue="50" min="0" max="100" className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500" />
          </div>
          <div className="flex items-end pb-2">
            <label className="flex items-center gap-3 cursor-pointer">
              <input type="checkbox" name="negativeMarkingEnabled" className="w-5 h-5 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500" />
              <span className="text-sm font-medium text-slate-700">Enable Negative Marking</span>
            </label>
          </div>
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">Negative Marks (e.g. 0.25)</label>
            <input type="number" name="negativeMarksValue" defaultValue="0" step="0.01" min="0" className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500" />
          </div>
          <div className="flex items-end pb-2">
            <label className="flex items-center gap-3 cursor-pointer">
              <input type="checkbox" name="partialCreditEnabled" className="w-5 h-5 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500" />
              <span className="text-sm font-medium text-slate-700">Enable Partial Credit (MSQ)</span>
            </label>
          </div>
        </div>
      </section>

      {/* 4. Timing Defaults */}
      <section className="bg-white p-8 rounded-xl border shadow-sm">
        <h3 className="text-xl font-bold text-slate-800 mb-6 border-b pb-4">4. Timing Defaults</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">Exam Duration (minutes)</label>
            <input type="number" name="durationMinutes" defaultValue="60" required min="1" className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500" />
          </div>
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">Default Start Window (hours) <span className="text-slate-400 font-normal">(Optional)</span></label>
            <input type="number" name="defaultStartWindowHours" min="1" placeholder="e.g. 24" className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500" />
          </div>
        </div>
      </section>

      {/* 5. Attempt Behavior */}
      <section className="bg-white p-8 rounded-xl border shadow-sm">
        <h3 className="text-xl font-bold text-slate-800 mb-6 border-b pb-4">5. Attempt Behavior</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">Max Attempts</label>
            <input type="number" name="maxAttempts" defaultValue="1" min="1" className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500" />
          </div>
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">Question Display Mode</label>
            <select name="questionDisplayMode" className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500">
              <option value="ONE_AT_A_TIME">One at a time (Standard)</option>
              <option value="ALL_ON_ONE_PAGE">All on one page</option>
            </select>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <label className="flex items-center gap-3 cursor-pointer">
            <input type="checkbox" name="allowQuestionSkip" defaultChecked className="w-5 h-5 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500" />
            <span className="text-sm font-medium text-slate-700">Allow Question Skip</span>
          </label>
          <label className="flex items-center gap-3 cursor-pointer">
            <input type="checkbox" name="allowAnswerReview" defaultChecked className="w-5 h-5 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500" />
            <span className="text-sm font-medium text-slate-700">Allow Review Before Submit</span>
          </label>
          <label className="flex items-center gap-3 cursor-pointer">
            <input type="checkbox" name="allowBackNavigation" defaultChecked className="w-5 h-5 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500" />
            <span className="text-sm font-medium text-slate-700">Allow Back Navigation</span>
          </label>
        </div>
      </section>

      {/* 6. Result & Feedback Settings */}
      <section className="bg-white p-8 rounded-xl border shadow-sm">
        <h3 className="text-xl font-bold text-slate-800 mb-6 border-b pb-4">6. Result & Feedback Settings</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">Result Visibility</label>
            <select name="resultVisibility" className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500">
              <option value="IMMEDIATE">Immediate (Upon Submission)</option>
              <option value="AFTER_RELEASE">After Manual Release</option>
              <option value="NEVER">Never (Internal Only)</option>
            </select>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <label className="flex items-center gap-3 cursor-pointer">
            <input type="checkbox" name="showCorrectAnswers" defaultChecked className="w-5 h-5 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500" />
            <span className="text-sm font-medium text-slate-700">Show Correct Answers in Result</span>
          </label>
          <label className="flex items-center gap-3 cursor-pointer">
            <input type="checkbox" name="showExplanation" className="w-5 h-5 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500" />
            <span className="text-sm font-medium text-slate-700">Show Answer Explanations</span>
          </label>
        </div>
      </section>

      {/* 7. Integrity Settings */}
      <section className="bg-white p-8 rounded-xl border shadow-sm">
        <h3 className="text-xl font-bold text-slate-800 mb-6 border-b pb-4">7. Integrity Settings</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-2">Tab Switch Limit <span className="text-slate-400 font-normal">(Auto-submit after N switches)</span></label>
            <input type="number" name="tabSwitchLimit" placeholder="e.g. 3" min="1" className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500" />
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <label className="flex items-center gap-3 cursor-pointer">
            <input type="checkbox" name="requireFullscreen" defaultChecked className="w-5 h-5 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500" />
            <span className="text-sm font-medium text-slate-700">Require Fullscreen</span>
          </label>
          <label className="flex items-center gap-3 cursor-pointer">
            <input type="checkbox" name="disableCopyPaste" defaultChecked className="w-5 h-5 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500" />
            <span className="text-sm font-medium text-slate-700">Disable Copy/Paste</span>
          </label>
          <label className="flex items-center gap-3 cursor-pointer opacity-50" title="Coming soon">
            <input type="checkbox" name="webcamRequired" disabled className="w-5 h-5 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500" />
            <span className="text-sm font-medium text-slate-700">Require Webcam (Not Supported)</span>
          </label>
        </div>
      </section>

      <div className="flex justify-end pt-4">
        <button 
          disabled={loading}
          type="submit"
          className="px-8 py-3 bg-indigo-600 text-white text-lg font-bold rounded-lg shadow hover:bg-indigo-700 transition-colors disabled:opacity-50"
        >
          {loading ? "Saving Template..." : "Save Exam Template"}
        </button>
      </div>
    </form>
  );
}
