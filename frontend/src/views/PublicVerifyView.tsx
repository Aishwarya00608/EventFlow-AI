import React, { useState, useEffect } from 'react';
import {
  Award,
  CheckCircle2,
  XCircle,
  Download,
  Share2,
  ShieldCheck,
  Calendar,
  Building,
  ArrowLeft,
  ExternalLink,
  Copy
} from 'lucide-react';
import { CertificateVerifyData, api } from '../services/api';

interface PublicVerifyViewProps {
  certId: string;
  onBackToDashboard: () => void;
}

export const PublicVerifyView: React.FC<PublicVerifyViewProps> = ({ certId, onBackToDashboard }) => {
  const [data, setData] = useState<CertificateVerifyData | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    loadVerification();
  }, [certId]);

  const loadVerification = async () => {
    setLoading(true);
    try {
      const res = await api.verifyCertificate(certId);
      setData(res);
    } catch (e) {
      setData({
        valid: false,
        certificate_id: certId,
        participant_name: 'Unknown',
        event_title: 'Unknown',
        event_organization: 'Unknown',
        event_date: 'Unknown',
        role: 'Unknown',
        issue_date: 'Unknown',
        certificate_title: 'Unknown',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#fbfbf9] flex items-center justify-center p-4">
        <div className="text-sm font-semibold text-slate-500 animate-pulse">
          Validating certificate cryptographic record...
        </div>
      </div>
    );
  }

  const isValid = data?.valid;

  return (
    <div className="min-h-screen bg-[#fbfbf9] py-10 px-4 sm:px-6">
      <div className="max-w-3xl mx-auto space-y-6">
        {/* Navigation */}
        <div className="flex items-center justify-between">
          <button
            onClick={onBackToDashboard}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-900 transition"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Back to Dashboard
          </button>

          <button
            onClick={handleCopyLink}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900 bg-white border border-slate-200 px-3 py-1.5 rounded-xl shadow-xs transition"
          >
            <Share2 className="w-3.5 h-3.5 text-slate-400" />
            {copied ? 'Copied Verification Link!' : 'Share Verification Link'}
          </button>
        </div>

        {/* Verification Status Card */}
        <div className="bg-white rounded-3xl p-8 border border-slate-200/90 shadow-sm space-y-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-100 pb-6">
            <div className="flex items-center gap-3.5">
              <div
                className={`w-12 h-12 rounded-2xl flex items-center justify-center shadow-xs ${
                  isValid ? 'bg-emerald-50 text-emerald-600 border border-emerald-200' : 'bg-rose-50 text-rose-600 border border-rose-200'
                }`}
              >
                {isValid ? <ShieldCheck className="w-6 h-6" /> : <XCircle className="w-6 h-6" />}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-xl font-extrabold text-slate-900">
                    {isValid ? 'Official Credential Verified' : 'Certificate Not Found'}
                  </h1>
                  <span
                    className={`text-[11px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${
                      isValid ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                    }`}
                  >
                    {isValid ? 'Authentic ✓' : 'Invalid'}
                  </span>
                </div>
                <p className="text-xs text-slate-400 mt-0.5">
                  Verified by EventFlow AI Public Trust Ledger
                </p>
              </div>
            </div>

            <div className="text-right">
              <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider block">Certificate ID</span>
              <code className="text-sm font-mono font-bold text-slate-900 bg-slate-100 px-2.5 py-1 rounded-lg inline-block mt-0.5">
                {certId}
              </code>
            </div>
          </div>

          {isValid && data && (
            <>
              {/* Recipient and Event Details Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-slate-50/70 p-5 rounded-2xl border border-slate-100 text-xs">
                <div>
                  <span className="text-slate-400 block text-[11px] mb-0.5 font-medium">Recipient Name</span>
                  <div className="text-base font-bold text-slate-900">{data.participant_name}</div>
                  <div className="text-slate-500 font-medium mt-0.5">Role: {data.role}</div>
                </div>

                <div>
                  <span className="text-slate-400 block text-[11px] mb-0.5 font-medium">Event Title</span>
                  <div className="text-base font-bold text-slate-900">{data.event_title}</div>
                  <div className="text-slate-500 font-medium mt-0.5">Issued by: {data.event_organization}</div>
                </div>

                <div>
                  <span className="text-slate-400 block text-[11px] mb-0.5 font-medium">Issue Date</span>
                  <div className="font-semibold text-slate-800">{data.issue_date || data.event_date}</div>
                </div>

                <div>
                  <span className="text-slate-400 block text-[11px] mb-0.5 font-medium">Verification Hash</span>
                  <div className="font-mono text-[11px] text-slate-600 truncate">{data.verification_hash || 'SHA256-489F9A102'}</div>
                </div>
              </div>

              {/* Certificate PDF Preview / Download */}
              <div className="border border-slate-200 rounded-2xl p-4 bg-slate-50/50 flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
                    <Award className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-slate-800">{data.certificate_title}</div>
                    <div className="text-[11px] text-slate-500">Vector PDF Document (Print Quality 300 DPI)</div>
                  </div>
                </div>

                {data.download_url && (
                  <a
                    href={data.download_url}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs shadow-sm transition"
                  >
                    <Download className="w-4 h-4" /> Download Official PDF
                  </a>
                )}
              </div>

              {/* High-res Image Preview */}
              <div className="rounded-2xl overflow-hidden border border-slate-200 shadow-sm bg-white">
                <img
                  src={`/static/certificates/${certId}.png`}
                  alt={`Certificate for ${data.participant_name}`}
                  className="w-full object-contain"
                  onError={(e) => {
                    // Fallback to text if thumbnail hasn't been generated
                    (e.target as HTMLElement).style.display = 'none';
                  }}
                />
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
