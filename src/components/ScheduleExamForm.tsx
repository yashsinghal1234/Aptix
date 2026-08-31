"use client";

import { useState } from "react";
import { createScheduledExamAction } from "@/app/actions/schedule";
import { useRouter } from "next/navigation";

export function ScheduleExamForm({ allQuestions }: { allQuestions: any[] }) {
  const router = useRouter();
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const toggleQuestion = (id: string) => {
    const newSet = new Set(selectedIds);
    if (newSet.has(id)) newSet.delete(id);
    else newSet.add(id);
    setSelectedIds(newSet);
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (selectedIds.size === 0) {
      setError("Please select at least one question.");
      return;
    }
    setLoading(true);
    setError(null);

    const formData = new FormData(e.currentTarget);
    formData.append("timezoneOffset", new Date().getTimezoneOffset().toString());

    const startTimeVal = formData.get("startTime") as string;
    if (startTimeVal) {
      const localDate = new Date(startTimeVal);
      if (!isNaN(localDate.getTime())) {
        formData.set("startTime", localDate.toISOString());
      }
    }
    
    const res = await createScheduledExamAction(formData, Array.from(selectedIds));
    
    if (res.error) {
      setError(res.error);
      setLoading(false);
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
    <form onSubmit={handleSubmit} className="space-y-8 max-w-5xl mx-auto pb-12">
      {error && (
        <div className="bg-red-50 text-red-700 p-4 rounded-lg font-medium">
          {error}
        </div>
      )}

      {/* Basic Settings */}
      <div className="bg-white p-8 rounded-xl border shadow-sm">
        <h3 className="text-xl font-bold text-slate-800 mb-6">Exam Configuration</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Title</label>
            <input 
              type="text" 
              name="title" 
              required 
              placeholder="e.g. Mid-term Assessment"
              className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Subject</label>
            <input 
              type="text" 
              name="subject" 
              required 
              placeholder="e.g. Computer Science"
              className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Start Time</label>
            <input 
              type="datetime-local" 
              name="startTime" 
              required 
              className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Duration (Minutes)</label>
            <input 
              type="number" 
              name="durationMinutes" 
              required 
              min="1"
              defaultValue="60"
              className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none"
            />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-8">
        {/* Fixed Question Selection */}
        <div className="bg-white p-8 rounded-xl border shadow-sm flex flex-col max-h-[600px]">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
            <div>
              <h3 className="text-xl font-bold text-slate-800">Select Questions</h3>
              <p className="text-sm text-slate-500 mt-1">Pick specific questions from the bank for this session.</p>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold text-indigo-600 bg-indigo-50 px-3 py-1 rounded-full border border-indigo-100">
                {selectedIds.size} of {allQuestions.length} Selected
              </span>
              <button
                type="button"
                onClick={selectAllFiltered}
                className="text-xs font-bold text-indigo-600 hover:text-indigo-800 bg-indigo-50 hover:bg-indigo-100 px-3 py-1.5 rounded-lg transition-colors"
              >
                Select All {filteredQuestions.length > 0 ? `(${filteredQuestions.length})` : ''}
              </button>
              {selectedIds.size > 0 && (
                <button
                  type="button"
                  onClick={() => setSelectedIds(new Set())}
                  className="text-xs font-bold text-slate-500 hover:text-rose-600 hover:bg-rose-50 px-3 py-1.5 rounded-lg transition-colors"
                >
                  Clear
                </button>
              )}
            </div>
          </div>

          <div className="flex gap-4 mb-4">
            <select 
              className="px-3 py-1.5 text-sm border rounded-lg bg-white flex-1 font-medium text-slate-700" 
              value={filterTopic} 
              onChange={e => setFilterTopic(e.target.value)}
            >
              <option value="">All Topics</option>
              <option value="Logical">Logical</option>
              <option value="Quantitative">Quantitative</option>
              <option value="Verbal">Verbal</option>
              <option value="Technical">Technical</option>
            </select>
            <select 
              className="px-3 py-1.5 text-sm border rounded-lg bg-white flex-1 font-medium text-slate-700" 
              value={filterDiff} 
              onChange={e => setFilterDiff(e.target.value)}
            >
              <option value="">All Difficulties</option>
              <option value="EASY">Easy</option>
              <option value="MEDIUM">Medium</option>
              <option value="HARD">Hard</option>
            </select>
          </div>

          {filteredQuestions.length > 0 && (
            <div 
              onClick={toggleAllFiltered} 
              className="flex items-center gap-2.5 px-3.5 py-2.5 bg-slate-100/90 rounded-xl border border-slate-200/80 mb-3 cursor-pointer select-none hover:bg-slate-200/70 transition-colors"
            >
              <input 
                type="checkbox" 
                checked={isAllFilteredSelected} 
                ref={el => { if (el) el.indeterminate = isSomeFilteredSelected; }}
                onChange={() => {}} 
                className="accent-indigo-600 rounded cursor-pointer w-4 h-4" 
              />
              <span className="text-xs font-bold text-slate-700">
                {isAllFilteredSelected 
                  ? "Deselect All Filtered Questions" 
                  : `Select All ${filteredQuestions.length} Filtered Question${filteredQuestions.length === 1 ? '' : 's'}`}
              </span>
            </div>
          )}
          
          <div className="divide-y overflow-y-auto flex-1 pr-2">
            {filteredQuestions.length === 0 ? (
              <p className="text-slate-500 text-center py-8 text-sm">No questions found matching current filter.</p>
            ) : (
              filteredQuestions.map(q => (
                <div key={q.id} className="py-4 flex gap-4 items-start hover:bg-slate-50 p-2 rounded transition-colors cursor-pointer" onClick={() => toggleQuestion(q.id)}>
                  <input 
                    type="checkbox" 
                    checked={selectedIds.has(q.id)}
                    onChange={() => {}} 
                    className="mt-1.5 w-4 h-4 accent-indigo-600 rounded cursor-pointer"
                  />
                  <div className="flex-1">
                    <div className="flex gap-2 items-center mb-1">
                      <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider bg-slate-100 px-1.5 py-0.5 rounded">{q.category}</span>
                      <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider bg-slate-100 px-1.5 py-0.5 rounded">{q.difficultyLevel || 'Medium'}</span>
                    </div>
                    <p className="text-sm font-medium text-slate-800 line-clamp-2">{q.text}</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      <div className="flex justify-end gap-4 pt-4 border-t">
        <button 
          type="button" 
          onClick={() => router.back()}
          className="px-6 py-3 font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors"
        >
          Cancel
        </button>
        <button 
          type="submit" 
          disabled={loading}
          className="px-6 py-3 font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl transition-colors disabled:opacity-50"
        >
          {loading ? "Scheduling Exam..." : "Schedule Exam"}
        </button>
      </div>
    </form>
  );
}
