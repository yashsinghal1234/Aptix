"use client";
import React, { useState } from "react";
import { AddQuestionForm } from "@/components/AddQuestionForm";
import { BulkUploadCSV } from "@/components/BulkUploadCSV";
import { BulkUploadText } from "@/components/BulkUploadText";

export default function SetterDashboard() {
  const [activeTab, setActiveTab] = useState<"MANUAL" | "PASTE" | "CSV">("MANUAL");

  return (
    <div className="space-y-8 max-w-4xl mx-auto pb-12">
      <div className="flex justify-between items-end border-b pb-4">
        <div>
          <h2 className="text-3xl font-bold text-slate-800">Question Adder</h2>
          <p className="text-slate-500 mt-2">Author new questions manually, parse text, or bulk upload CSV.</p>
        </div>
        <a href="/dashboard/setter/bank" className="text-indigo-600 font-semibold hover:text-indigo-800 bg-indigo-50 px-4 py-2 rounded-lg transition-colors flex items-center gap-2">
          <span>Question Bank</span>
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7"></path></svg>
        </a>
      </div>
      
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="flex border-b border-slate-200 bg-slate-50">
          <button 
            onClick={() => setActiveTab("MANUAL")}
            className={`flex-1 py-4 px-6 text-sm font-semibold transition-colors border-b-2 ${activeTab === "MANUAL" ? "border-indigo-600 text-indigo-600 bg-white" : "border-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-100"}`}
          >
            Manual Authoring
          </button>
          <button 
            onClick={() => setActiveTab("PASTE")}
            className={`flex-1 py-4 px-6 text-sm font-semibold transition-colors border-b-2 ${activeTab === "PASTE" ? "border-indigo-600 text-indigo-600 bg-white" : "border-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-100"}`}
          >
            Paste & Parse
          </button>
          <button 
            onClick={() => setActiveTab("CSV")}
            className={`flex-1 py-4 px-6 text-sm font-semibold transition-colors border-b-2 ${activeTab === "CSV" ? "border-indigo-600 text-indigo-600 bg-white" : "border-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-100"}`}
          >
            CSV Upload
          </button>
        </div>
        
        <div className="p-8">
          {activeTab === "MANUAL" && <AddQuestionForm />}
          {activeTab === "PASTE" && <BulkUploadText />}
          {activeTab === "CSV" && <BulkUploadCSV />}
        </div>
      </div>
    </div>
  );
}
