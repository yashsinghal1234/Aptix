"use client";
import React, { useState } from "react";
import { AddQuestionForm } from "@/components/AddQuestionForm";
import { BulkUploadCSV } from "@/components/BulkUploadCSV";
import { BulkUploadText } from "@/components/BulkUploadText";
import { Flower } from "@/components/owner/OpsPanels";

export default function SetterDashboard() {
  const [activeTab, setActiveTab] = useState<"MANUAL" | "PASTE" | "CSV">("MANUAL");

  const tabs = [
    { k: "MANUAL" as const, label: "MANUAL ENTRY" },
    { k: "PASTE" as const, label: "PASTE & PARSE" },
    { k: "CSV" as const, label: "BULK UPLOAD" },
  ];

  return (
    <div className="max-w-[1440px] mx-auto space-y-4 pb-8">
      <div className="flex items-start justify-between gap-6 px-1 pt-1">
        <div>
          <p className="text-[10px] font-bold tracking-[0.22em] text-lime-200/80 mb-3">QUESTION STUDIO / Q-DRAFT</p>
          <h1 className="text-3xl sm:text-[40px] font-black text-white tracking-tight leading-none">
            Make every question count<span className="text-lime-300">.</span>
          </h1>
          <p className="text-[13px] text-neutral-400 mt-2.5">
            Author, validate, review. Sending an item queues it for approval.
          </p>
        </div>
        <Flower className="w-16 h-16 sm:w-20 sm:h-20 shrink-0 mt-1" />
      </div>

      <div className="flex flex-wrap gap-1.5 px-1">
        {tabs.map((t) => (
          <button
            key={t.k}
            onClick={() => setActiveTab(t.k)}
            className={`text-[10px] font-black tracking-[0.12em] rounded-lg px-3.5 py-2 border transition-all ${
              activeTab === t.k
                ? "text-black bg-lime-300 border-lime-300"
                : "text-neutral-400 bg-white/[0.04] border-white/10 hover:text-white"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {activeTab === "MANUAL" && <AddQuestionForm />}
      {activeTab === "PASTE" && <BulkUploadText />}
      {activeTab === "CSV" && <BulkUploadCSV />}
    </div>
  );
}
