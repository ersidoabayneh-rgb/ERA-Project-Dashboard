import React from 'react';
import { FileText, X, ShieldAlert, Landmark, CheckCircle2, Download } from 'lucide-react';

interface InternalMemorandumModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function InternalMemorandumModal({ isOpen, onClose }: InternalMemorandumModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-2xl w-full p-6 shadow-2xl space-y-5 animate-in fade-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-4">
          <div className="flex items-center gap-3">
            <span className="p-2.5 bg-blue-600 text-white rounded-2xl shadow-xs">
              <Landmark className="w-5 h-5" />
            </span>
            <div>
              <h3 className="text-base font-black text-slate-900 dark:text-white uppercase tracking-tight">
                Ethiopian Roads Administration — Internal Memorandum
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-mono">
                Ref: ERA/GD/MC/049/2026 • Official Directive & Policy Notice
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-4 text-xs text-slate-700 dark:text-slate-300 font-sans leading-relaxed max-h-[60vh] overflow-y-auto pr-2">
          <div className="p-3.5 bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 rounded-2xl flex items-start gap-2.5">
            <ShieldAlert className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
            <div>
              <strong className="text-blue-900 dark:text-blue-200 block mb-0.5">Mandatory Compliance Notice for All ERA Personnel & Credentials</strong>
              All project data entry, monthly IPC billing reviews, submittal logging, and linear progress updates must strictly adhere to FIDIC contract conditions and Ethiopian Roads Administration governance guidelines.
            </div>
          </div>

          <div className="space-y-2">
            <h4 className="font-bold text-slate-900 dark:text-white uppercase tracking-wider text-[11px]">
              1. Editor Data Entry & Approval Workflow
            </h4>
            <p>
              In accordance with ERA circular governance, any data entered or modified by isolation editors (`editor`, `era_editor`, `consultant_editor`, `contractor_editor`) is held in secure private draft workspaces. Changes require formal review and approval by authorized Approvers and Administrators before being committed to the live project master database.
            </p>
          </div>

          <div className="space-y-2">
            <h4 className="font-bold text-slate-900 dark:text-white uppercase tracking-wider text-[11px]">
              2. Work Program Locking & Critical Path Evaluation
            </h4>
            <p>
              Once a contractor's Work Program is formally approved (`workProgramApproved: true`), the schedule is locked against arbitrary modifications. Contractor performance and career/schedule progress are evaluated strictly by comparing actual execution against the approved critical path activities (`critical === true`).
            </p>
          </div>

          <div className="space-y-2">
            <h4 className="font-bold text-slate-900 dark:text-white uppercase tracking-wider text-[11px]">
              3. Role-Based Group Report Access & Visibility
            </h4>
            <p>
              Group report metrics (Compliance & Performance Audits, Consultant & Contractor Grading, Matured Payments over 56 days, Personnel Workload, and Progress Plan Comparisons) are restricted to authorized Directorate, CPM, PMO, and ERA Approver credentials.
            </p>
          </div>
        </div>

        <div className="border-t border-slate-200 dark:border-slate-800 pt-4 flex items-center justify-end gap-3">
          <button
            onClick={() => {
              alert("Internal Memorandum downloaded successfully.");
            }}
            className="px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold rounded-xl transition flex items-center gap-1.5 cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Download Official PDF</span>
          </button>
          <button
            onClick={onClose}
            className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl transition shadow-sm cursor-pointer"
          >
            Acknowledge & Close
          </button>
        </div>
      </div>
    </div>
  );
}
