import React from 'react';
import { Mail, CheckCircle2, Clock, AlertCircle } from 'lucide-react';
import { EmailLogItem } from '../services/api';

interface EmailPreviewModalProps {
  log: EmailLogItem;
  onClose: () => void;
}

export const EmailPreviewModal: React.FC<EmailPreviewModalProps> = ({ log, onClose }) => {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white rounded-3xl max-w-2xl w-full p-6 shadow-2xl border border-slate-200 max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-4 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-purple-50 text-purple-700 flex items-center justify-center">
              <Mail className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-slate-900">Rendered HTML Email Preview</h3>
                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                    log.status === 'delivered'
                      ? 'bg-emerald-100 text-emerald-800'
                      : 'bg-purple-100 text-purple-800'
                  }`}
                >
                  {log.status === 'simulated_sent' ? 'Simulated Sent' : log.status}
                </span>
              </div>
              <div className="text-xs text-slate-400">
                To: <span className="text-slate-700 font-medium">{log.recipient_name}</span> ({log.recipient_email})
              </div>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700 text-sm font-semibold p-1">
            ✕
          </button>
        </div>

        {/* Subject */}
        <div className="px-3 py-2 bg-slate-50 rounded-xl text-xs font-semibold text-slate-800 mb-4 shrink-0 border border-slate-100">
          <span className="text-slate-400 font-normal mr-1.5">Subject:</span>
          {log.subject}
        </div>

        {/* Rendered HTML Container */}
        <div className="flex-1 overflow-y-auto rounded-xl border border-slate-200 bg-[#fafaf9] p-4 shadow-inner">
          <div
            dangerouslySetInnerHTML={{ __html: log.html_preview }}
            className="w-full"
          />
        </div>

        <div className="pt-4 flex items-center justify-between text-xs text-slate-400 shrink-0">
          <span>Sent at: {new Date(log.sent_at).toLocaleString()}</span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl bg-slate-900 text-white font-semibold hover:bg-slate-800 transition"
          >
            Close Preview
          </button>
        </div>
      </div>
    </div>
  );
};
