"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { LaunchSessionForm } from "./LaunchSessionForm";
import { updateTemplateAction, duplicateTemplateAction, deleteTemplateAction } from "@/app/actions/template";
import { rescheduleSessionAction } from "@/app/actions/session";

interface ExamRule {
  id: string;
  category: string;
  difficultyLevel: string;
  count: number;
}

interface AttachedQuestion {
  id: string;
  text: string;
  category: string;
  points: number;
  difficultyLevel: string;
}

interface ActiveSessionData {
  id: string;
  pin: string | null;
  status: string;
  startTime: Date | string | null;
  durationMinutes: number;
  allowedEmailDomain: string | null;
  _count?: { attempts: number };
}

export interface TemplateData {
  id: string;
  title: string;
  description?: string | null;
  instructions?: string | null;
  subject?: string | null;
  allowedEmailDomain?: string | null;
  selectionMode: string;
  randomizeQuestionOrder: boolean;
  randomizeOptionOrder: boolean;
  totalMarks: number;
  marksPerQuestion: number;
  negativeMarkingEnabled: boolean;
  negativeMarksValue: number;
  partialCreditEnabled: boolean;
  passCriteria: number;
  durationMinutes: number;
  defaultStartWindowHours?: number | null;
  allowQuestionSkip: boolean;
  allowAnswerReview: boolean;
  allowBackNavigation: boolean;
  maxAttempts: number;
  questionDisplayMode: string;
  resultVisibility: string;
  showCorrectAnswers: boolean;
  showExplanation: boolean;
  requireFullscreen: boolean;
  disableCopyPaste: boolean;
  tabSwitchLimit?: number | null;
  webcamRequired: boolean;
  createdAt: Date | string;
  _count: {
    questions: number;
    rules: number;
    sessions: number;
  };
  rules?: ExamRule[];
  questions?: AttachedQuestion[];
  sessions?: ActiveSessionData[];
}

export function OwnerTemplatesManager({
  templates: initialTemplates,
  highlightId
}: {
  templates: TemplateData[];
  highlightId?: string;
}) {
  const router = useRouter();
  const [templates, setTemplates] = useState<TemplateData[]>(initialTemplates);
  const [selectedTemplate, setSelectedTemplate] = useState<TemplateData | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editFormData, setEditFormData] = useState<any>({});
  const [updating, setUpdating] = useState(false);
  const [updateMessage, setUpdateMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Reschedule state
  const [reschedulingSessionId, setReschedulingSessionId] = useState<string | null>(null);
  const [newScheduleTime, setNewScheduleTime] = useState("");
  const [rescheduleLoading, setRescheduleLoading] = useState(false);
  const [rescheduleMsg, setRescheduleMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  useEffect(() => {
    setTemplates(initialTemplates);
    if (selectedTemplate) {
      const refreshed = initialTemplates.find(t => t.id === selectedTemplate.id);
      if (refreshed) setSelectedTemplate(refreshed);
    }
  }, [initialTemplates]);

  // Open sidebar if requested or on highlight
  const openSidebar = (template: TemplateData, editMode = false) => {
    setSelectedTemplate(template);
    setIsEditing(editMode);
    setEditFormData({
      title: template.title,
      instructions: template.instructions || "",
      durationMinutes: template.durationMinutes,
      passCriteria: template.passCriteria,
      totalMarks: template.totalMarks,
      negativeMarkingEnabled: template.negativeMarkingEnabled,
      negativeMarksValue: template.negativeMarksValue,
      requireFullscreen: template.requireFullscreen,
      disableCopyPaste: template.disableCopyPaste,
      webcamRequired: template.webcamRequired,
      tabSwitchLimit: template.tabSwitchLimit ?? "",
      allowedEmailDomain: template.allowedEmailDomain || ""
    });
    setUpdateMessage(null);
    setRescheduleMsg(null);
    setReschedulingSessionId(null);
  };

  const closeSidebar = () => {
    setSelectedTemplate(null);
    setIsEditing(false);
    setUpdateMessage(null);
    setRescheduleMsg(null);
    setReschedulingSessionId(null);
  };

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") closeSidebar();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const handleUpdateTemplate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTemplate) return;

    setUpdating(true);
    setUpdateMessage(null);

    const formData = new FormData();
    formData.append("id", selectedTemplate.id);
    formData.append("title", editFormData.title);
    formData.append("instructions", editFormData.instructions);
    formData.append("durationMinutes", editFormData.durationMinutes.toString());
    formData.append("passCriteria", editFormData.passCriteria.toString());
    formData.append("totalMarks", editFormData.totalMarks.toString());
    formData.append("negativeMarkingEnabled", editFormData.negativeMarkingEnabled ? "true" : "false");
    formData.append("negativeMarksValue", editFormData.negativeMarksValue.toString());
    formData.append("requireFullscreen", editFormData.requireFullscreen ? "true" : "false");
    formData.append("disableCopyPaste", editFormData.disableCopyPaste ? "true" : "false");
    formData.append("webcamRequired", editFormData.webcamRequired ? "true" : "false");
    if (editFormData.tabSwitchLimit !== "") {
      formData.append("tabSwitchLimit", editFormData.tabSwitchLimit.toString());
    }
    formData.append("allowedEmailDomain", editFormData.allowedEmailDomain);

    try {
      const res = await updateTemplateAction(formData);
      if (res?.error) {
        setUpdateMessage({ type: "error", text: res.error });
      } else if (res?.success && res.template) {
        setUpdateMessage({ type: "success", text: "Template updated successfully!" });
        // Update local state
        setTemplates(prev => prev.map(t => t.id === selectedTemplate.id ? { ...t, ...res.template } : t));
        setSelectedTemplate(prev => prev ? { ...prev, ...res.template } : null);
        setIsEditing(false);
        router.refresh();
      }
    } catch (err: any) {
      setUpdateMessage({ type: "error", text: err.message || "Failed to update template" });
    } finally {
      setUpdating(false);
    }
  };

  const handleReschedule = async (sessionId: string) => {
    if (!newScheduleTime) return;
    setRescheduleLoading(true);
    setRescheduleMsg(null);

    try {
      const formData = new FormData();
      formData.append("sessionId", sessionId);
      formData.append("startTime", newScheduleTime);
      formData.append("timezoneOffset", new Date().getTimezoneOffset().toString());

      const res = await rescheduleSessionAction(formData);
      if (res?.error) {
        setRescheduleMsg({ type: "error", text: res.error });
      } else if (res?.success) {
        setRescheduleMsg({ type: "success", text: "Schedule time updated successfully!" });
        setReschedulingSessionId(null);
        setNewScheduleTime("");
        router.refresh();
      }
    } catch (err: any) {
      setRescheduleMsg({ type: "error", text: err.message || "Failed to reschedule session" });
    } finally {
      setRescheduleLoading(false);
    }
  };

  return (
    <>
      {/* Templates Table Container matching Image 3 */}
      <div id="templates" className="bg-[#0b0c10] rounded-[28px] border border-neutral-800/80 shadow-2xl overflow-hidden scroll-mt-6">
        <div className="p-6 sm:p-8 border-b border-neutral-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[#0e1017]">
          <div>
            <span className="text-[11px] font-extrabold tracking-widest text-[#a855f7] uppercase block mb-1">
              Assessment Library
            </span>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              Reusable templates
            </h2>
            <p className="text-xs sm:text-sm text-neutral-400 mt-0.5">
              {templates.length} templates available in this view
            </p>
          </div>
          <Link 
            href="/dashboard/owner/template/new"
            className="px-5 py-2.5 bg-[#171922] hover:bg-[#202330] text-neutral-200 hover:text-white text-xs sm:text-sm font-bold rounded-2xl transition-all border border-neutral-800 flex items-center gap-2 cursor-pointer shadow-sm whitespace-nowrap self-start sm:self-auto"
          >
            <span className="text-base font-normal leading-none">+</span>
            <span>New template</span>
          </Link>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-[#0e1017] text-neutral-400 uppercase tracking-wider font-bold text-xs border-b border-neutral-800/80">
              <tr>
                <th className="px-6 sm:px-8 py-4 align-middle">Template</th>
                <th className="px-6 py-4 align-middle">Duration</th>
                <th className="px-6 py-4 align-middle">Questions</th>
                <th className="px-6 py-4 align-middle">Delivery</th>
                <th className="px-6 py-4 align-middle">Pass</th>
                <th className="px-6 sm:px-8 py-4 align-middle text-right"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-800/80">
              {templates.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-neutral-500 font-medium">
                    No exam templates created yet. Create your first template to schedule and conduct assessments.
                  </td>
                </tr>
              ) : (
                templates.map(template => {
                  const isHighlighted = highlightId === template.id;
                  const activeSessionsCount = template.sessions?.length || 0;
                  const deliveryType = template.webcamRequired
                    ? "AI proctored"
                    : template.requireFullscreen || template.disableCopyPaste
                    ? "Browser locked"
                    : "Standard";

                  return (
                    <tr 
                      key={template.id} 
                      id={`template-${template.id}`}
                      onClick={() => openSidebar(template)}
                      className={`group transition-all cursor-pointer ${
                        isHighlighted 
                          ? 'bg-[#0f1915] border-l-4 border-l-emerald-500 shadow-[inset_0_0_20px_rgba(16,185,129,0.06)]' 
                          : 'hover:bg-neutral-900/40'
                      }`}
                    >
                      {/* Clickable Template Title Cell */}
                      <td className="px-6 sm:px-8 py-5 align-middle select-none">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="font-bold text-white text-sm capitalize group-hover:text-violet-400 transition-colors">
                            {template.title}
                          </p>
                          {isHighlighted && (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 animate-pulse">
                              Ready to Schedule
                            </span>
                          )}
                          {activeSessionsCount > 0 && (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-violet-500/10 text-violet-300 border border-violet-500/30">
                              {activeSessionsCount} Scheduled/Live
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-neutral-400 mt-1 font-medium">
                          {template.subject || "Talent acquisition"} &middot; Used {template.sessions?.length || 0} times
                        </p>
                      </td>

                      {/* Duration */}
                      <td className="px-6 py-5 align-middle whitespace-nowrap">
                        <span className="inline-flex items-center gap-1.5 text-xs text-neutral-300 font-medium">
                          <svg className="w-3.5 h-3.5 text-neutral-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          <span>{template.durationMinutes} min</span>
                        </span>
                      </td>

                      {/* Questions */}
                      <td className="px-6 py-5 align-middle whitespace-nowrap">
                        <span className="text-xs text-neutral-300 font-medium">
                          {template._count.questions || 60} items
                        </span>
                      </td>

                      {/* Delivery */}
                      <td className="px-6 py-5 align-middle whitespace-nowrap">
                        <span className="text-xs text-neutral-300 font-medium">
                          {deliveryType}
                        </span>
                      </td>

                      {/* Pass Standard */}
                      <td className="px-6 py-5 align-middle whitespace-nowrap">
                        <span className="text-xs text-neutral-300 font-medium">
                          {template.passCriteria}%
                        </span>
                      </td>

                      {/* Action Arrow (Matching Image 3) */}
                      <td className="px-6 sm:px-8 py-5 align-middle text-right whitespace-nowrap">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            openSidebar(template);
                          }}
                          className="w-9 h-9 rounded-xl bg-neutral-900/90 hover:bg-neutral-800 border border-neutral-800 text-neutral-400 group-hover:text-white inline-flex items-center justify-center transition cursor-pointer"
                          title="Open template details"
                        >
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                          </svg>
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>


      {/* Slide-Over Details & Update Sidebar Drawer */}
      {selectedTemplate && (
        <div className="fixed inset-0 z-50 overflow-hidden flex justify-end animate-fadeIn">
          {/* Backdrop */}
          <div 
            onClick={closeSidebar}
            className="fixed inset-0 bg-black/70 backdrop-blur-xs transition-opacity cursor-pointer"
          />

          {/* Drawer Window */}
          <div className="relative w-full max-w-xl bg-[#0a0c10] border-l border-neutral-800 shadow-2xl h-full flex flex-col z-10 overflow-hidden">
            {/* Drawer Header */}
            <div className="p-6 border-b border-neutral-800 bg-[#07080c] flex items-center justify-between shrink-0">
              <div className="min-w-0 pr-4">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-[10px] uppercase tracking-wider font-extrabold px-2 py-0.5 rounded-full bg-neutral-900 border border-neutral-700 text-neutral-300">
                    Template Blueprint
                  </span>
                  {selectedTemplate.allowedEmailDomain && (
                    <span className="text-[10px] font-semibold bg-amber-500/10 text-amber-300 px-2 py-0.5 rounded-md border border-amber-500/30">
                      @{selectedTemplate.allowedEmailDomain.replace(/^@/, '')}
                    </span>
                  )}
                </div>
                <h3 className="text-xl font-extrabold text-white mt-1 capitalize truncate">
                  {selectedTemplate.title}
                </h3>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => setIsEditing(!isEditing)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all border flex items-center gap-1.5 cursor-pointer ${
                    isEditing 
                      ? 'bg-neutral-800 text-white border-neutral-700' 
                      : 'bg-white hover:bg-neutral-200 text-black border-white shadow-sm'
                  }`}
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                  <span>{isEditing ? "View Blueprint" : "Update Exam"}</span>
                </button>

                <button
                  type="button"
                  onClick={closeSidebar}
                  title="Close sidebar"
                  className="p-2 text-neutral-400 hover:text-white hover:bg-neutral-800 rounded-xl transition-colors cursor-pointer"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Notification messages */}
            {updateMessage && (
              <div className={`p-4 border-b text-xs font-semibold flex items-center justify-between ${
                updateMessage.type === "success" 
                  ? 'bg-emerald-950/40 border-emerald-800/60 text-emerald-300' 
                  : 'bg-rose-950/40 border-rose-800/60 text-rose-300'
              }`}>
                <span>{updateMessage.text}</span>
                <button onClick={() => setUpdateMessage(null)} className="font-bold text-sm ml-2">&times;</button>
              </div>
            )}

            {/* Drawer Body */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {/* EDIT FORM MODE */}
              {isEditing ? (
                <form onSubmit={handleUpdateTemplate} className="space-y-5">
                  <div className="flex items-center justify-between pb-2 border-b border-neutral-800">
                    <h4 className="text-sm font-bold text-white uppercase tracking-wider">Update Exam Specifications</h4>
                    <span className="text-[11px] text-neutral-400">Save changes to reflect immediately</span>
                  </div>

                  {/* Title & Instructions */}
                  <div className="space-y-3.5">
                    <div>
                      <label className="block text-xs font-bold text-neutral-300 uppercase tracking-wider mb-1.5">
                        Template Title
                      </label>
                      <input 
                        type="text"
                        required
                        value={editFormData.title}
                        onChange={e => setEditFormData({ ...editFormData, title: e.target.value })}
                        className="w-full text-sm px-3.5 py-2.5 bg-neutral-900 border border-neutral-700 rounded-xl text-white focus:border-white focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-neutral-300 uppercase tracking-wider mb-1.5">
                        Instructions / Guidelines
                      </label>
                      <textarea 
                        rows={3}
                        value={editFormData.instructions}
                        onChange={e => setEditFormData({ ...editFormData, instructions: e.target.value })}
                        placeholder="Instructions displayed to candidates before starting..."
                        className="w-full text-sm px-3.5 py-2 bg-neutral-900 border border-neutral-700 rounded-xl text-white focus:border-white focus:outline-none"
                      />
                    </div>
                  </div>

                  {/* Assessment Parameters Grid */}
                  <div className="grid grid-cols-2 gap-3.5">
                    <div>
                      <label className="block text-xs font-bold text-neutral-300 uppercase tracking-wider mb-1.5">
                        Duration (Mins)
                      </label>
                      <input 
                        type="number"
                        min="1"
                        required
                        value={editFormData.durationMinutes}
                        onChange={e => setEditFormData({ ...editFormData, durationMinutes: parseInt(e.target.value, 10) || 1 })}
                        className="w-full text-sm px-3.5 py-2 bg-neutral-900 border border-neutral-700 rounded-xl text-white focus:border-white focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-neutral-300 uppercase tracking-wider mb-1.5">
                        Pass Criteria (%)
                      </label>
                      <input 
                        type="number"
                        min="0"
                        max="100"
                        required
                        value={editFormData.passCriteria}
                        onChange={e => setEditFormData({ ...editFormData, passCriteria: parseFloat(e.target.value) || 0 })}
                        className="w-full text-sm px-3.5 py-2 bg-neutral-900 border border-neutral-700 rounded-xl text-white focus:border-white focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-neutral-300 uppercase tracking-wider mb-1.5">
                        Total Marks
                      </label>
                      <input 
                        type="number"
                        min="0"
                        value={editFormData.totalMarks}
                        onChange={e => setEditFormData({ ...editFormData, totalMarks: parseFloat(e.target.value) || 0 })}
                        className="w-full text-sm px-3.5 py-2 bg-neutral-900 border border-neutral-700 rounded-xl text-white focus:border-white focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-neutral-300 uppercase tracking-wider mb-1.5">
                        Allowed Domain
                      </label>
                      <input 
                        type="text"
                        placeholder="e.g. kiet.edu"
                        value={editFormData.allowedEmailDomain}
                        onChange={e => setEditFormData({ ...editFormData, allowedEmailDomain: e.target.value })}
                        className="w-full text-sm px-3.5 py-2 bg-neutral-900 border border-neutral-700 rounded-xl text-white focus:border-white focus:outline-none"
                      />
                    </div>
                  </div>

                  {/* Negative Marking */}
                  <div className="p-4 bg-neutral-900/50 rounded-2xl border border-neutral-800 space-y-3">
                    <label className="flex items-center gap-3 cursor-pointer">
                      <input 
                        type="checkbox"
                        checked={editFormData.negativeMarkingEnabled}
                        onChange={e => setEditFormData({ ...editFormData, negativeMarkingEnabled: e.target.checked })}
                        className="w-4 h-4 rounded accent-emerald-500 cursor-pointer"
                      />
                      <span className="text-xs font-bold text-white">Enable Negative Marking</span>
                    </label>

                    {editFormData.negativeMarkingEnabled && (
                      <div>
                        <label className="block text-xs text-neutral-400 mb-1">Deduction per incorrect answer</label>
                        <input 
                          type="number"
                          step="0.25"
                          min="0"
                          value={editFormData.negativeMarksValue}
                          onChange={e => setEditFormData({ ...editFormData, negativeMarksValue: parseFloat(e.target.value) || 0 })}
                          className="w-full text-sm px-3.5 py-2 bg-neutral-900 border border-neutral-700 rounded-xl text-white focus:border-white focus:outline-none"
                        />
                      </div>
                    )}
                  </div>

                  {/* Security & Integrity Toggles */}
                  <div className="p-4 bg-neutral-900/50 rounded-2xl border border-neutral-800 space-y-3">
                    <p className="text-xs font-bold text-neutral-300 uppercase tracking-wider mb-2">Integrity & Anti-Cheat Controls</p>

                    <label className="flex items-center gap-3 cursor-pointer">
                      <input 
                        type="checkbox"
                        checked={editFormData.requireFullscreen}
                        onChange={e => setEditFormData({ ...editFormData, requireFullscreen: e.target.checked })}
                        className="w-4 h-4 rounded accent-emerald-500 cursor-pointer"
                      />
                      <span className="text-xs font-medium text-white">Enforce Fullscreen Lockdown</span>
                    </label>

                    <label className="flex items-center gap-3 cursor-pointer">
                      <input 
                        type="checkbox"
                        checked={editFormData.disableCopyPaste}
                        onChange={e => setEditFormData({ ...editFormData, disableCopyPaste: e.target.checked })}
                        className="w-4 h-4 rounded accent-emerald-500 cursor-pointer"
                      />
                      <span className="text-xs font-medium text-white">Disable Copy & Paste</span>
                    </label>

                    <label className="flex items-center gap-3 cursor-pointer">
                      <input 
                        type="checkbox"
                        checked={editFormData.webcamRequired}
                        onChange={e => setEditFormData({ ...editFormData, webcamRequired: e.target.checked })}
                        className="w-4 h-4 rounded accent-emerald-500 cursor-pointer"
                      />
                      <span className="text-xs font-medium text-white">Require Webcam Proctoring</span>
                    </label>

                    <div>
                      <label className="block text-xs text-neutral-400 mb-1">Max Tab Switch Violations (leave empty for unlimited)</label>
                      <input 
                        type="number"
                        min="1"
                        placeholder="e.g. 3"
                        value={editFormData.tabSwitchLimit}
                        onChange={e => setEditFormData({ ...editFormData, tabSwitchLimit: e.target.value === "" ? "" : parseInt(e.target.value, 10) })}
                        className="w-full text-sm px-3.5 py-2 bg-neutral-900 border border-neutral-700 rounded-xl text-white focus:border-white focus:outline-none"
                      />
                    </div>
                  </div>

                  {/* Submit Actions */}
                  <div className="flex items-center gap-3 pt-2">
                    <button
                      type="submit"
                      disabled={updating}
                      className="flex-1 py-2.5 px-4 bg-white hover:bg-neutral-200 text-black font-extrabold text-sm rounded-xl transition-all shadow-md cursor-pointer disabled:opacity-50"
                    >
                      {updating ? "Saving Changes..." : "Save Template Updates"}
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsEditing(false)}
                      className="py-2.5 px-4 bg-neutral-900 hover:bg-neutral-800 text-neutral-300 font-bold text-sm rounded-xl border border-neutral-700 transition-colors cursor-pointer"
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              ) : (
                /* VIEW DETAILS MODE */
                <div className="space-y-6">
                  {/* SCHEDULED & ACTIVE EXAMS SECTION */}
                  <div className="p-5 rounded-2xl bg-neutral-900/30 border border-neutral-800 space-y-4">
                    <div className="flex items-center justify-between border-b border-neutral-800 pb-3">
                      <div>
                        <h4 className="text-sm font-bold text-white tracking-tight flex items-center gap-2">
                          <span>Scheduled &amp; Active Exams</span>
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-neutral-800 text-neutral-300">
                            {selectedTemplate.sessions?.length || 0}
                          </span>
                        </h4>
                        <p className="text-xs text-neutral-400 mt-0.5">Live sessions or exams scheduled for the future</p>
                      </div>
                    </div>

                    {rescheduleMsg && (
                      <div className={`p-3 rounded-xl text-xs font-semibold ${
                        rescheduleMsg.type === "success" 
                          ? 'bg-emerald-950/40 border border-emerald-800/60 text-emerald-300' 
                          : 'bg-rose-950/40 border border-rose-800/60 text-rose-300'
                      }`}>
                        {rescheduleMsg.text}
                      </div>
                    )}

                    {(!selectedTemplate.sessions || selectedTemplate.sessions.length === 0) ? (
                      <div className="py-5 text-center bg-black/40 rounded-xl border border-neutral-800/80">
                        <p className="text-xs text-neutral-400 font-medium">No live or scheduled sessions for this template.</p>
                        <p className="text-[11px] text-neutral-500 mt-0.5">Launch immediately or pick a schedule date & time below.</p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {selectedTemplate.sessions.map(session => {
                          const isLive = session.status === "LIVE";
                          const isRescheduling = reschedulingSessionId === session.id;
                          const startTimeFormatted = session.startTime 
                            ? new Date(session.startTime).toLocaleString(undefined, { 
                                dateStyle: "medium", 
                                timeStyle: "short" 
                              })
                            : "Immediate / Live";

                          return (
                            <div 
                              key={session.id} 
                              className={`p-4 rounded-xl border transition-all space-y-3 ${
                                isLive 
                                  ? 'bg-emerald-950/20 border-emerald-500/40' 
                                  : 'bg-neutral-900/60 border-neutral-800'
                              }`}
                            >
                              <div className="flex items-center justify-between gap-2 flex-wrap">
                                <div className="flex items-center gap-2">
                                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider ${
                                    isLive 
                                      ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30' 
                                      : 'bg-neutral-800 text-neutral-300 border border-neutral-700'
                                  }`}>
                                    {session.status}
                                  </span>
                                  {session.pin && (
                                    <span 
                                      onClick={() => navigator.clipboard.writeText(session.pin!)}
                                      title="Click to copy PIN"
                                      className="font-mono text-xs font-extrabold bg-neutral-900 border border-neutral-700 px-2 py-0.5 rounded text-white cursor-pointer select-none"
                                    >
                                      PIN: {session.pin}
                                    </span>
                                  )}
                                  <span className="text-xs text-neutral-400 font-bold">
                                    {session._count?.attempts || 0} Candidates
                                  </span>
                                </div>

                                <div className="flex items-center gap-2">
                                  <Link
                                    href={`/dashboard/owner/session/${session.id}`}
                                    className="px-2.5 py-1 text-xs font-bold bg-neutral-800 hover:bg-neutral-700 text-neutral-200 rounded-lg transition-colors"
                                  >
                                    Live Monitor &rarr;
                                  </Link>
                                </div>
                              </div>

                              {/* Start Time info & Reschedule Trigger */}
                              <div className="flex items-center justify-between text-xs text-neutral-300 bg-black/40 p-2.5 rounded-lg border border-neutral-800 flex-wrap gap-2">
                                <div>
                                  <span className="text-neutral-500 text-[11px] font-medium block">Scheduled Time:</span>
                                  <span className="font-bold text-white">{startTimeFormatted}</span>
                                </div>

                                <button
                                  type="button"
                                  onClick={() => {
                                    setReschedulingSessionId(isRescheduling ? null : session.id);
                                    setNewScheduleTime("");
                                    setRescheduleMsg(null);
                                  }}
                                  className="px-3 py-1 bg-white hover:bg-neutral-200 text-black text-xs font-bold rounded-lg transition-colors cursor-pointer"
                                >
                                  {isRescheduling ? "Cancel" : "Change Schedule Time"}
                                </button>
                              </div>

                              {/* Reschedule inline form */}
                              {isRescheduling && (
                                <div className="p-3 bg-neutral-900 rounded-xl border border-neutral-700 space-y-2.5 animate-fadeIn">
                                  <label className="block text-xs font-bold text-white">
                                    Select New Start Date &amp; Time
                                  </label>
                                  <div className="flex flex-col sm:flex-row gap-2">
                                    <input 
                                      type="datetime-local"
                                      required
                                      value={newScheduleTime}
                                      onChange={e => setNewScheduleTime(e.target.value)}
                                      style={{ colorScheme: "dark" }}
                                      className="flex-1 text-xs px-3 py-2 bg-neutral-950 border border-neutral-700 rounded-lg text-white font-medium focus:border-white focus:outline-none"
                                    />
                                    <button
                                      type="button"
                                      disabled={rescheduleLoading || !newScheduleTime}
                                      onClick={() => handleReschedule(session.id)}
                                      className="px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-black font-extrabold text-xs rounded-lg transition-colors cursor-pointer disabled:opacity-50 whitespace-nowrap"
                                    >
                                      {rescheduleLoading ? "Updating..." : "Update Schedule Time"}
                                    </button>
                                  </div>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {/* Launch / Schedule directly from sidebar */}
                    <div className="pt-2 border-t border-neutral-800">
                      <p className="text-xs font-bold text-neutral-400 uppercase tracking-wider mb-2">Schedule A New Assessment</p>
                      <LaunchSessionForm templateId={selectedTemplate.id} />
                    </div>
                  </div>

                  {/* BLUEPRINT SUMMARY METRICS */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div className="p-3.5 bg-neutral-900/50 rounded-xl border border-neutral-800">
                      <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider">Duration</p>
                      <p className="text-lg font-black text-white mt-0.5">{selectedTemplate.durationMinutes} mins</p>
                    </div>

                    <div className="p-3.5 bg-neutral-900/50 rounded-xl border border-neutral-800">
                      <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider">Pass Standard</p>
                      <p className="text-lg font-black text-white mt-0.5">{selectedTemplate.passCriteria}%</p>
                    </div>

                    <div className="p-3.5 bg-neutral-900/50 rounded-xl border border-neutral-800">
                      <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider">Total Marks</p>
                      <p className="text-lg font-black text-white mt-0.5">{selectedTemplate.totalMarks}</p>
                    </div>

                    <div className="p-3.5 bg-neutral-900/50 rounded-xl border border-neutral-800">
                      <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider">Fixed Questions</p>
                      <p className="text-lg font-black text-white mt-0.5">{selectedTemplate._count.questions}</p>
                    </div>
                  </div>

                  {/* SECURITY & PROCTORING AUDIT */}
                  <div className="p-5 rounded-2xl bg-neutral-900/30 border border-neutral-800 space-y-3">
                    <h4 className="text-xs font-bold text-neutral-300 uppercase tracking-wider">Security &amp; Proctoring Matrix</h4>
                    <div className="grid grid-cols-2 gap-2.5 text-xs">
                      <div className="flex items-center gap-2 p-2 rounded-lg bg-neutral-900/70 border border-neutral-800">
                        <span className={`w-2 h-2 rounded-full ${selectedTemplate.requireFullscreen ? 'bg-emerald-400' : 'bg-neutral-600'}`} />
                        <span className="text-neutral-300">Fullscreen Lock:</span>
                        <span className="font-bold text-white ml-auto">{selectedTemplate.requireFullscreen ? "Enforced" : "Off"}</span>
                      </div>

                      <div className="flex items-center gap-2 p-2 rounded-lg bg-neutral-900/70 border border-neutral-800">
                        <span className={`w-2 h-2 rounded-full ${selectedTemplate.disableCopyPaste ? 'bg-emerald-400' : 'bg-neutral-600'}`} />
                        <span className="text-neutral-300">Copy &amp; Paste:</span>
                        <span className="font-bold text-white ml-auto">{selectedTemplate.disableCopyPaste ? "Blocked" : "Allowed"}</span>
                      </div>

                      <div className="flex items-center gap-2 p-2 rounded-lg bg-neutral-900/70 border border-neutral-800">
                        <span className={`w-2 h-2 rounded-full ${selectedTemplate.webcamRequired ? 'bg-emerald-400' : 'bg-neutral-600'}`} />
                        <span className="text-neutral-300">Webcam Monitor:</span>
                        <span className="font-bold text-white ml-auto">{selectedTemplate.webcamRequired ? "Required" : "Optional"}</span>
                      </div>

                      <div className="flex items-center gap-2 p-2 rounded-lg bg-neutral-900/70 border border-neutral-800">
                        <span className={`w-2 h-2 rounded-full ${selectedTemplate.tabSwitchLimit ? 'bg-amber-400' : 'bg-neutral-600'}`} />
                        <span className="text-neutral-300">Tab Switch Limit:</span>
                        <span className="font-bold text-white ml-auto">{selectedTemplate.tabSwitchLimit ?? "None"}</span>
                      </div>
                    </div>
                  </div>

                  {/* AUTO-PICK RULES (If Any) */}
                  {selectedTemplate.rules && selectedTemplate.rules.length > 0 && (
                    <div className="p-5 rounded-2xl bg-neutral-900/30 border border-neutral-800 space-y-3">
                      <h4 className="text-xs font-bold text-neutral-300 uppercase tracking-wider">Dynamic Auto-Pick Rules ({selectedTemplate.rules.length})</h4>
                      <div className="space-y-2">
                        {selectedTemplate.rules.map(rule => (
                          <div key={rule.id} className="flex items-center justify-between text-xs p-2.5 rounded-lg bg-neutral-900 border border-neutral-800">
                            <div>
                              <span className="font-bold text-white">{rule.category}</span>
                              <span className="text-neutral-500 ml-2 font-mono text-[11px]">&bull; {rule.difficultyLevel}</span>
                            </div>
                            <span className="px-2 py-0.5 rounded bg-neutral-800 text-neutral-200 font-bold text-[11px]">
                              {rule.count} questions
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* ATTACHED QUESTIONS PREVIEW (If Any) */}
                  {selectedTemplate.questions && selectedTemplate.questions.length > 0 && (
                    <div className="p-5 rounded-2xl bg-neutral-900/30 border border-neutral-800 space-y-3">
                      <div className="flex items-center justify-between">
                        <h4 className="text-xs font-bold text-neutral-300 uppercase tracking-wider">Fixed Question Pool ({selectedTemplate._count.questions})</h4>
                      </div>
                      <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                        {selectedTemplate.questions.map((q, idx) => (
                          <div key={q.id} className="p-2.5 rounded-lg bg-neutral-900 border border-neutral-800 text-xs flex items-start gap-2">
                            <span className="text-neutral-500 font-mono font-bold shrink-0">{idx + 1}.</span>
                            <div className="flex-1 min-w-0">
                              <p className="text-white truncate font-medium">{q.text}</p>
                              <div className="flex items-center gap-2 mt-1 text-[10px] text-neutral-400">
                                <span className="bg-neutral-800 px-1.5 py-0.5 rounded text-neutral-300">{q.category}</span>
                                <span>{q.difficultyLevel}</span>
                                <span>&bull;</span>
                                <span className="font-bold text-emerald-400">{q.points} pt{q.points !== 1 ? 's' : ''}</span>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* QUICK MAINTENANCE ACTIONS */}
                  <div className="pt-2 flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => setIsEditing(true)}
                      className="flex-1 py-2.5 px-4 bg-white hover:bg-neutral-200 text-black font-extrabold text-xs rounded-xl transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer"
                    >
                      <svg className="w-4 h-4 text-black" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                      <span>Update Exam Specifications</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
