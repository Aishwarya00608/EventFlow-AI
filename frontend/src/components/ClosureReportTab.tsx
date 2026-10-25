import React, { useState, useEffect } from 'react';
import { FileText, Copy, Download, RefreshCw, CheckCircle2, Sparkles } from 'lucide-react';
import { EventItem, api } from '../services/api';

interface ClosureReportTabProps {
  event: EventItem;
}

export const ClosureReportTab: React.FC<ClosureReportTabProps> = ({ event }) => {
  const [report, setReport] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    fetchReport();
  }, [event.id]);

  const fetchReport = async () => {
    setIsLoading(true);
    try {
      const text = await api.getClosureReport(event.id);
      setReport(text);
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(report);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const blob = new Blob([report], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `EventFlow_Closure_Report_${event.title.replace(/\s+/g, '_')}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-2xl p-6 border border-slate-200/90 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <FileText className="w-5 h-5 text-indigo-600" />
            <h3 className="text-base font-bold text-slate-900">Executive Event Closure Report</h3>
            <span className="text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200">
              Gemma 4 Synthesized
            </span>
          </div>
          <p className="text-xs text-slate-500">
            A complete, publication-ready post-event closure summary formatted for sponsors, leadership, and community stakeholders.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={fetchReport}
            className="p-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 transition"
            title="Refresh Report"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={handleCopy}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-xl bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 shadow-sm transition"
          >
            {copied ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
            {copied ? 'Copied Markdown!' : 'Copy Markdown'}
          </button>
          <button
            onClick={handleDownload}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-xl bg-slate-900 hover:bg-slate-800 text-white shadow-sm transition"
          >
            <Download className="w-3.5 h-3.5" />
            Download .md Report
          </button>
        </div>
      </div>

      {/* Markdown Document Preview Card */}
      <div className="bg-white rounded-2xl p-8 border border-slate-200/90 shadow-sm">
        {isLoading ? (
          <div className="py-16 text-center text-slate-400 animate-pulse text-sm">
            Generating executive closure report...
          </div>
        ) : (
          <div className="prose prose-slate max-w-none text-xs sm:text-sm font-sans leading-relaxed whitespace-pre-wrap font-mono bg-slate-50/50 p-6 rounded-xl border border-slate-100 overflow-x-auto">
            {report}
          </div>
        )}
      </div>
    </div>
  );
};
