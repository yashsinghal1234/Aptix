"use client";
import React, { useState } from "react";
import { AddQuestionForm } from "@/components/AddQuestionForm";
import { BulkUploadCSV } from "@/components/BulkUploadCSV";
import { BulkUploadText } from "@/components/BulkUploadText";

export default function SetterDashboard() {
  const [activeTab, setActiveTab] = useState<"MANUAL" | "PASTE" | "CSV">("MANUAL");

  return (
    <div className="space-y-8 max-w-4xl mx-auto pb-12">
      <div className="flex justify-between items-end border-b border-neutral-800 pb-4">
        <div>
          <h2 className="text-3xl font-extrabold text-white tracking-tight">Question Adder</h2>
          <p className="text-neutral-400 text-xs mt-1">Author new questions manually, parse text, or bulk upload CSV.</p>
        </div>
        <a href="/dashboard/setter/bank" className="text-neutral-200 font-bold hover:text-white bg-neutral-900 hover:bg-neutral-800 px-4 py-2 rounded-xl transition-all border border-neutral-800 flex items-center gap-2 text-xs">
          <span>Question Bank</span>
          <svg className="w-4 h-4 text-neutral-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7"></path></svg>
        </a>
      </div>
      
      <div className="bg-[#0a0c10] rounded-3xl shadow-md border border-neutral-800 overflow-hidden">
        <div className="flex border-b border-neutral-800 bg-[#07080c]">
          <button 
            onClick={() => setActiveTab("MANUAL")}
            className={`flex-1 py-4 px-6 text-xs sm:text-sm font-bold tracking-wide transition-all border-b-2 cursor-pointer ${activeTab === "MANUAL" ? "border-white text-white bg-neutral-900/60" : "border-transparent text-neutral-400 hover:text-white hover:bg-neutral-900/30"}`}
          >
            Manual Authoring
          </button>
          <button 
            onClick={() => setActiveTab("PASTE")}
            className={`flex-1 py-4 px-6 text-xs sm:text-sm font-bold tracking-wide transition-all border-b-2 cursor-pointer ${activeTab === "PASTE" ? "border-white text-white bg-neutral-900/60" : "border-transparent text-neutral-400 hover:text-white hover:bg-neutral-900/30"}`}
          >
            Paste & Parse
          </button>
          <button 
            onClick={() => setActiveTab("CSV")}
            className={`flex-1 py-4 px-6 text-xs sm:text-sm font-bold tracking-wide transition-all border-b-2 cursor-pointer ${activeTab === "CSV" ? "border-white text-white bg-neutral-900/60" : "border-transparent text-neutral-400 hover:text-white hover:bg-neutral-900/30"}`}
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
