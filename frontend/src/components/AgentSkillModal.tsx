import React, { useState } from 'react';
import { FileCode, Sparkles, Copy, CheckCircle2, ArrowRight, ExternalLink } from 'lucide-react';

interface AgentSkillModalProps {
  onClose: () => void;
}

export const AgentSkillModal: React.FC<AgentSkillModalProps> = ({ onClose }) => {
  const [copied, setCopied] = useState(false);

  const skillPromptExample = `To automate event closure with EventFlow AI:
1. Call POST /api/events to create or fetch the target event.
2. Call POST /api/events/{id}/feedback-form/generate-ai to generate questions via Gemma 4.
3. Call POST /api/events/{id}/participants/upload-csv to register attendees.
4. Call POST /api/events/{id}/emails/send-feedback-invitations to dispatch links.
5. Call POST /api/events/{id}/analytics/regenerate-ai to synthesize feedback themes.
6. Call POST /api/events/{id}/certificates/generate-all to render verified vector PDFs with QR codes.
7. Call POST /api/events/{id}/emails/send-certificates to distribute credentials.
8. Call GET /api/events/{id}/closure-report to export executive report.`;

  const handleCopy = () => {
    navigator.clipboard.writeText(skillPromptExample);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white rounded-3xl max-w-2xl w-full p-6 sm:p-8 shadow-2xl border border-slate-200 max-h-[90vh] overflow-y-auto space-y-6">
        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-indigo-600 text-white flex items-center justify-center">
              <FileCode className="w-5 h-5 text-indigo-200" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">DigitalOcean Open-Source AI Agent Skill</h3>
              <p className="text-xs text-slate-500">Documented autonomous closure agent workflow (MIT License).</p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700 text-sm font-semibold p-1">
            ✕
          </button>
        </div>

        {/* Overview Box */}
        <div className="p-4 rounded-2xl bg-indigo-50/60 border border-indigo-200/80 text-xs text-indigo-950 space-y-2">
          <div className="font-bold flex items-center gap-1.5 text-indigo-900">
            <Sparkles className="w-4 h-4 text-indigo-600" />
            <span>Autonomous Post-Event Closure Skill</span>
          </div>
          <p className="leading-relaxed">
            This repository includes a reusable, documented open-source agent skill in{' '}
            <code className="bg-white px-1.5 py-0.5 rounded border border-indigo-200 font-mono text-[11px]">
              skills/eventflow-agent/SKILL.md
            </code>
            . It enables autonomous AI agents (such as AGY, Claude, Gemini, or LangChain agents) to orchestrate event closure without manual human intervention.
          </p>
        </div>

        {/* Workflow Diagram & Steps */}
        <div className="space-y-3">
          <span className="text-xs font-bold text-slate-900 uppercase tracking-wide block">
            End-to-End Autonomous Pipeline
          </span>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs">
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
              <div className="font-bold text-slate-800 mb-0.5">1. Gemma 4 Form Formulation</div>
              <p className="text-slate-500 text-[11px]">Analyzes event agenda, tracks, and speakers to synthesize tailored survey questions.</p>
            </div>
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
              <div className="font-bold text-slate-800 mb-0.5">2. Tokenized Distribution</div>
              <p className="text-slate-500 text-[11px]">Ingests CSV rosters and emails unique, tamper-resistant feedback tokens.</p>
            </div>
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
              <div className="font-bold text-slate-800 mb-0.5">3. Sentiment &amp; NPS Engine</div>
              <p className="text-slate-500 text-[11px]">Computes mathematical NPS and qualitative themes, praiseworthy highlights, and friction points.</p>
            </div>
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
              <div className="font-bold text-slate-800 mb-0.5">4. Cryptographic PDF Minting</div>
              <p className="text-slate-500 text-[11px]">Generates high-res vector certificates with dynamic QR verification codes and digital seals.</p>
            </div>
          </div>
        </div>

        {/* Actionable Prompt Example */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="font-bold text-slate-800">Agent Tool Protocol:</span>
            <button
              onClick={handleCopy}
              className="text-blue-600 hover:underline font-semibold flex items-center gap-1"
            >
              {copied ? <CheckCircle2 className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
              {copied ? 'Copied Workflow!' : 'Copy Workflow'}
            </button>
          </div>
          <pre className="p-4 rounded-xl bg-slate-900 text-slate-100 text-[11px] font-mono leading-relaxed whitespace-pre-wrap overflow-x-auto">
            {skillPromptExample}
          </pre>
        </div>

        <div className="pt-2 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 text-xs font-bold rounded-xl bg-slate-900 text-white hover:bg-slate-800"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
