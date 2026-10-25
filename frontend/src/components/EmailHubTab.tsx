import React, { useState, useEffect } from 'react';
import {
  Mail,
  Send,
  CheckCircle2,
  Clock,
  Eye,
  RefreshCw,
  AlertCircle,
  Sparkles,
  Info
} from 'lucide-react';
import { EventItem, EmailLogItem, SystemSettings, api } from '../services/api';

interface EmailHubTabProps {
  event: EventItem;
  settings: SystemSettings | null;
  onRefreshEvent: () => void;
  onOpenEmailPreview: (log: EmailLogItem) => void;
}

export const EmailHubTab: React.FC<EmailHubTabProps> = ({
  event,
  settings,
  onRefreshEvent,
  onOpenEmailPreview,
}) => {
  const [logs, setLogs] = useState<EmailLogItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSendingFeedback, setIsSendingFeedback] = useState(false);
  const [isSendingCerts, setIsSendingCerts] = useState(false);

  useEffect(() => {
    fetchLogs();
  }, [event.id]);

  const fetchLogs = async () => {
    setIsLoading(true);
    try {
      const data = await api.getEmailLogs(event.id);
      setLogs(data);
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSendFeedbackInvites = async () => {
    setIsSendingFeedback(true);
    try {
      const res = await api.sendFeedbackInvitations(event.id);
      alert(res.message);
      fetchLogs();
      onRefreshEvent();
    } catch (err: any) {
      alert(err.message || 'Failed to dispatch feedback invitations');
    } finally {
      setIsSendingFeedback(false);
    }
  };

  const handleSendCertificates = async () => {
    setIsSendingCerts(true);
    try {
      const res = await api.sendCertificates(event.id);
      alert(res.message);
      fetchLogs();
      onRefreshEvent();
    } catch (err: any) {
      alert(err.message || 'Failed to dispatch certificates');
    } finally {
      setIsSendingCerts(false);
    }
  };

  const isLive = !settings?.simulation_mode && settings?.resend_api_key_configured;

  return (
    <div className="space-y-6">
      {/* Top Banner: Dispatch Operations & Live/Simulation Status */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200/90 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-5">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Mail className="w-5 h-5 text-purple-600" />
            <h3 className="text-base font-bold text-slate-900">Email Dispatcher &amp; Delivery Tracking</h3>
            <span
              className={`text-[11px] font-semibold px-2.5 py-0.5 rounded-full border ${
                isLive
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                  : 'bg-purple-50 text-purple-700 border-purple-200'
              }`}
            >
              {isLive ? 'Live Resend API Active' : 'Simulation Mode (Inspection Ready)'}
            </span>
          </div>
          <p className="text-xs text-slate-500">
            {isLive
              ? `Delivering transactional emails from ${settings?.resend_from_email}`
              : 'Safely simulating delivery without spamming real participant mailboxes. Click "Preview" below to inspect exact rendered HTML.'}
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            onClick={handleSendFeedbackInvites}
            disabled={isSendingFeedback}
            className="inline-flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-xl bg-slate-900 hover:bg-slate-800 text-white shadow-sm transition disabled:opacity-50"
          >
            <Send className={`w-3.5 h-3.5 ${isSendingFeedback ? 'animate-pulse' : ''}`} />
            {isSendingFeedback ? 'Dispatching...' : 'Dispatch Feedback Links'}
          </button>

          <button
            onClick={handleSendCertificates}
            disabled={isSendingCerts}
            className="inline-flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-xl bg-purple-600 hover:bg-purple-700 text-white shadow-sm transition disabled:opacity-50"
          >
            <Send className={`w-3.5 h-3.5 ${isSendingCerts ? 'animate-pulse' : ''}`} />
            {isSendingCerts ? 'Dispatching...' : 'Dispatch Certificates'}
          </button>

          <button
            onClick={fetchLogs}
            className="p-2 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 transition"
            title="Refresh logs"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Email Dispatch Audit Log Table */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h4 className="text-sm font-bold text-slate-900">Email Delivery Audit Trail ({logs.length})</h4>
            <p className="text-xs text-slate-400">Chronological history with rendered HTML preview inspection</p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-100 bg-[#fafaf9]/80 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                <th className="py-3 px-4">Recipient</th>
                <th className="py-3 px-4">Type &amp; Subject</th>
                <th className="py-3 px-4">Delivery Status</th>
                <th className="py-3 px-4">Sent At</th>
                <th className="py-3 px-4 text-right">Inspect</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {logs.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-slate-400">
                    No emails dispatched yet. Click "Dispatch Feedback Links" or "Dispatch Certificates" above.
                  </td>
                </tr>
              ) : (
                logs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3 px-4">
                      <div className="font-semibold text-slate-900">{log.recipient_name}</div>
                      <div className="text-[11px] text-slate-500">{log.recipient_email}</div>
                    </td>
                    <td className="py-3 px-4">
                      <span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-bold uppercase mb-1 bg-slate-100 text-slate-700">
                        {log.email_type.replace('_', ' ')}
                      </span>
                      <div className="text-slate-700 font-medium">{log.subject}</div>
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold ${
                          log.status === 'delivered'
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : log.status === 'simulated_sent'
                            ? 'bg-purple-50 text-purple-700 border border-purple-200'
                            : 'bg-rose-50 text-rose-700 border border-rose-200'
                        }`}
                      >
                        {log.status === 'delivered' && <CheckCircle2 className="w-3 h-3" />}
                        {log.status === 'simulated_sent' && <Clock className="w-3 h-3" />}
                        {log.status === 'failed' && <AlertCircle className="w-3 h-3" />}
                        {log.status === 'simulated_sent' ? 'Sent (Simulated)' : log.status}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-slate-500">
                      {new Date(log.sent_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} •{' '}
                      {new Date(log.sent_at).toLocaleDateString()}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <button
                        onClick={() => onOpenEmailPreview(log)}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 font-medium transition"
                        title="View exact rendered HTML email"
                      >
                        <Eye className="w-3 h-3 text-slate-400" />
                        Preview HTML
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
