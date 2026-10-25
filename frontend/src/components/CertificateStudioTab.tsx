import React, { useState } from 'react';
import {
  Award,
  Sparkles,
  Download,
  Upload,
  CheckCircle2,
  QrCode,
  FileText,
  Eye,
  RefreshCw,
  ExternalLink
} from 'lucide-react';
import { EventItem, api } from '../services/api';

interface CertificateStudioTabProps {
  event: EventItem;
  onRefreshEvent: () => void;
  onOpenVerify: (certId: string) => void;
}

export const CertificateStudioTab: React.FC<CertificateStudioTabProps> = ({
  event,
  onRefreshEvent,
  onOpenVerify,
}) => {
  const [templateId, setTemplateId] = useState(event.certificate_template_id || 'modern_minimal');
  const [certTitle, setCertTitle] = useState(event.certificate_title || 'Certificate of Participation');
  const [sigName, setSigName] = useState(event.signature_name || 'Alex Morgan');
  const [sigTitle, setSigTitle] = useState(event.signature_title || 'Lead Organizer');
  const [issueDate, setIssueDate] = useState(event.certificate_issue_date || event.date || 'October 25, 2026');
  const [requireFeedback, setRequireFeedback] = useState(event.require_feedback_for_cert);

  const [isSaving, setIsSaving] = useState(false);
  const [isGeneratingBulk, setIsGeneratingBulk] = useState(false);
  const [bulkResult, setBulkResult] = useState<{ count: number; zipUrl: string } | null>(null);
  const [sampleRecipient, setSampleRecipient] = useState('Elena Rostova');

  const templates = [
    {
      id: 'modern_minimal',
      name: 'Modern Minimalist',
      desc: 'Crisp white card aesthetic with fine hairline framing and subtle indigo accents.',
      badgeColor: 'bg-indigo-50 text-indigo-700',
    },
    {
      id: 'tech_hackathon',
      name: 'Tech Hackathon Matrix',
      desc: 'Deep indigo border with vibrant cyan accent bar and corner grid markers.',
      badgeColor: 'bg-cyan-50 text-cyan-700',
    },
    {
      id: 'academic_gold',
      name: 'Executive Academic Gold',
      desc: 'Warm ivory canvas with dual gold-foil borders and classic serif styling.',
      badgeColor: 'bg-amber-50 text-amber-700',
    },
    {
      id: 'creative_cyan',
      name: 'Creative Sky & Mint',
      desc: 'Fresh pastel background with sky blue banner and mint base accents.',
      badgeColor: 'bg-emerald-50 text-emerald-700',
    },
  ];

  const handleSaveSettings = async () => {
    setIsSaving(true);
    try {
      await api.updateEvent(event.id, {
        certificate_template_id: templateId,
        certificate_title: certTitle,
        signature_name: sigName,
        signature_title: sigTitle,
        certificate_issue_date: issueDate,
        require_feedback_for_cert: requireFeedback,
      });
      alert('Certificate configuration updated successfully!');
      onRefreshEvent();
    } catch (err: any) {
      alert(err.message || 'Failed to update certificate settings');
    } finally {
      setIsSaving(false);
    }
  };

  const handleBulkGenerate = async (force: boolean = false) => {
    setIsGeneratingBulk(true);
    setBulkResult(null);
    try {
      const res = await api.generateAllCertificates(event.id, force);
      setBulkResult({ count: res.generated_count, zipUrl: res.zip_url });
      alert(`Success! Generated ${res.generated_count} vector PDF certificates.`);
      onRefreshEvent();
    } catch (err: any) {
      alert(err.message || 'Failed to generate certificates');
    } finally {
      setIsGeneratingBulk(false);
    }
  };

  const handleCustomTemplateUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const formData = new FormData();
    formData.append('file', file);
    try {
      const res = await fetch(`/api/events/${event.id}/certificates/upload-custom-template`, {
        method: 'POST',
        body: formData,
      });
      if (res.ok) {
        alert('Custom background template uploaded!');
        setTemplateId('custom');
        onRefreshEvent();
      } else {
        const err = await res.json();
        alert(err.detail || 'Upload failed');
      }
    } catch (e: any) {
      alert(e.message);
    }
  };

  const sampleCertId = 'EF-HACK-1001';

  return (
    <div className="space-y-6">
      {/* Top Banner: Bulk Generation Action */}
      <div className="bg-white rounded-2xl p-5 border border-slate-200/90 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Award className="w-5 h-5 text-indigo-600" />
            <h3 className="text-base font-bold text-slate-900">Certificate Studio &amp; Batch Engine</h3>
          </div>
          <p className="text-xs text-slate-500">
            Vector ReportLab PDF rendering, dynamic QR verification codes, and official digital seals.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => handleBulkGenerate(false)}
            disabled={isGeneratingBulk}
            className="inline-flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-xl bg-slate-900 hover:bg-slate-800 text-white shadow-sm transition disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isGeneratingBulk ? 'animate-spin' : ''}`} />
            {isGeneratingBulk ? 'Rendering PDFs...' : 'Generate All Eligible'}
          </button>

          <button
            onClick={() => handleBulkGenerate(true)}
            disabled={isGeneratingBulk}
            className="inline-flex items-center gap-2 px-3 py-2 text-xs font-semibold rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition"
            title="Generate for all participants regardless of feedback completion"
          >
            Force Generate All
          </button>

          <a
            href={`/api/events/${event.id}/certificates/download-zip`}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm transition"
          >
            <Download className="w-3.5 h-3.5" />
            Download ZIP
          </a>
        </div>
      </div>

      {/* Main Studio Grid: Template Selector & Live Preview */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column (5 cols): Template Themes & Customizer Controls */}
        <div className="lg:col-span-5 space-y-5">
          {/* Template Selection */}
          <div className="bg-white rounded-2xl p-5 border border-slate-200/90 shadow-sm space-y-3">
            <span className="text-xs font-bold text-slate-900 uppercase tracking-wide block">
              Choose Certificate Theme
            </span>
            <div className="space-y-2">
              {templates.map((t) => (
                <div
                  key={t.id}
                  onClick={() => setTemplateId(t.id)}
                  className={`p-3 rounded-xl border cursor-pointer transition-all ${
                    templateId === t.id
                      ? 'border-indigo-600 bg-indigo-50/40 ring-1 ring-indigo-500 shadow-sm'
                      : 'border-slate-200 hover:border-slate-300 bg-white'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-bold text-slate-900">{t.name}</span>
                    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${t.badgeColor}`}>
                      {templateId === t.id ? 'Selected ✓' : 'Theme'}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 leading-relaxed">{t.desc}</p>
                </div>
              ))}
            </div>

            {/* Custom Template Uploader */}
            <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
              <span className="text-slate-600 font-medium">Or upload custom background:</span>
              <label className="cursor-pointer px-3 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-lg transition inline-flex items-center gap-1">
                <Upload className="w-3 h-3" /> Upload PNG/PDF
                <input
                  type="file"
                  accept=".png,.jpg,.jpeg,.pdf"
                  onChange={handleCustomTemplateUpload}
                  className="hidden"
                />
              </label>
            </div>
          </div>

          {/* Configuration Form */}
          <div className="bg-white rounded-2xl p-5 border border-slate-200/90 shadow-sm space-y-3">
            <span className="text-xs font-bold text-slate-900 uppercase tracking-wide block">
              Certificate Text &amp; Signer Details
            </span>

            <div>
              <label className="block text-[11px] font-semibold text-slate-600 mb-1">Certificate Heading</label>
              <input
                type="text"
                value={certTitle}
                onChange={(e) => setCertTitle(e.target.value)}
                className="w-full px-3 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">Signer Name</label>
                <input
                  type="text"
                  value={sigName}
                  onChange={(e) => setSigName(e.target.value)}
                  className="w-full px-3 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">Signer Title</label>
                <input
                  type="text"
                  value={sigTitle}
                  onChange={(e) => setSigTitle(e.target.value)}
                  className="w-full px-3 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-600 mb-1">Issue Date</label>
              <input
                type="text"
                value={issueDate}
                onChange={(e) => setIssueDate(e.target.value)}
                className="w-full px-3 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none"
              />
            </div>

            <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
              <label className="flex items-center gap-2 text-xs text-slate-700 cursor-pointer">
                <input
                  type="checkbox"
                  checked={requireFeedback}
                  onChange={(e) => setRequireFeedback(e.target.checked)}
                  className="rounded text-slate-900 focus:ring-0 cursor-pointer"
                />
                <span className="font-medium">Require Feedback to Unlock</span>
              </label>

              <button
                onClick={handleSaveSettings}
                disabled={isSaving}
                className="px-4 py-1.5 text-xs font-bold rounded-lg bg-slate-900 text-white hover:bg-slate-800 transition disabled:opacity-50"
              >
                {isSaving ? 'Saving...' : 'Save Settings'}
              </button>
            </div>
          </div>
        </div>

        {/* Right Column (7 cols): High-Fidelity Live Interactive Certificate Preview */}
        <div className="lg:col-span-7 space-y-4">
          <div className="bg-white rounded-2xl p-5 border border-slate-200/90 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-900 uppercase tracking-wide">
                  Live Certificate Preview
                </span>
                <span className="text-[10px] text-slate-400 font-mono">Letter Landscape (11 x 8.5)</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-500">Preview Name:</span>
                <input
                  type="text"
                  value={sampleRecipient}
                  onChange={(e) => setSampleRecipient(e.target.value)}
                  className="px-2 py-0.5 text-xs bg-slate-50 border border-slate-200 rounded-md w-32 focus:outline-none"
                />
              </div>
            </div>

            {/* High fidelity interactive certificate mockup container */}
            <div
              className={`w-full aspect-[1.33/1] rounded-xl p-8 relative flex flex-col justify-between overflow-hidden shadow-md select-none transition-all ${
                templateId === 'academic_gold'
                  ? 'bg-[#fefdf9] border-4 border-[#b45309]'
                  : templateId === 'tech_hackathon'
                  ? 'bg-[#fafafc] border-2 border-slate-900'
                  : templateId === 'creative_cyan'
                  ? 'bg-slate-50 border border-slate-200'
                  : 'bg-white border-2 border-slate-200'
              }`}
            >
              {/* Template accents */}
              {templateId === 'tech_hackathon' && (
                <div className="absolute top-0 left-0 right-0 h-2 bg-cyan-600" />
              )}
              {templateId === 'creative_cyan' && (
                <div className="absolute top-0 left-0 right-0 h-3 bg-sky-500" />
              )}
              {templateId === 'academic_gold' && (
                <div className="absolute inset-2 border border-amber-500/50 pointer-events-none" />
              )}

              {/* Header Org & Title */}
              <div className="text-center pt-2">
                <div className="text-[11px] font-bold uppercase tracking-widest text-slate-400 mb-1">
                  {event.organization || 'ORGANIZING COMMITTEE'}
                </div>
                <h2 className="text-2xl font-black tracking-tight text-slate-900 uppercase">
                  {certTitle}
                </h2>
                <div className="text-[11px] font-medium text-slate-400 mt-1 uppercase tracking-wider">
                  This certificate is proudly presented to
                </div>
              </div>

              {/* Recipient Name */}
              <div className="text-center my-auto py-4">
                <div className="text-3xl font-extrabold text-slate-900 tracking-tight mb-1 font-serif">
                  {sampleRecipient}
                </div>
                <div className="w-48 h-0.5 bg-blue-600 mx-auto mb-3" />
                <p className="text-xs text-slate-600 max-w-md mx-auto">
                  for active participation and successful completion of <strong>{event.title}</strong>
                </p>
                <p className="text-[11px] text-slate-400 mt-1">
                  Organized on {issueDate} • Venue: {event.location}
                </p>
              </div>

              {/* Footer: Dynamic QR, Seal & Signature */}
              <div className="flex items-end justify-between border-t border-slate-100 pt-3">
                {/* QR Code */}
                <div className="flex items-center gap-2">
                  <div className="w-14 h-14 bg-white border border-slate-200 rounded p-1 flex items-center justify-center shadow-xs">
                    <QrCode className="w-12 h-12 text-slate-900" />
                  </div>
                  <div className="text-[10px] text-slate-400">
                    <div>Scan to Verify</div>
                    <div className="font-mono font-bold text-slate-800">{sampleCertId}</div>
                  </div>
                </div>

                {/* Seal Badge */}
                <div className="w-16 h-16 rounded-full border-2 border-amber-600 bg-amber-50/80 flex flex-col items-center justify-center text-amber-900 shadow-xs">
                  <div className="text-[8px] tracking-widest font-bold">★★★</div>
                  <div className="text-[9px] font-black tracking-wider uppercase">VERIFIED</div>
                  <div className="text-[6px] tracking-tight">EVENTFLOW</div>
                </div>

                {/* Organizer Signature */}
                <div className="text-center w-36">
                  <div className="font-serif italic text-lg text-slate-900 leading-none mb-1">
                    {sigName}
                  </div>
                  <div className="w-full h-px bg-slate-300 mb-1" />
                  <div className="text-[10px] font-bold text-slate-800">{sigName}</div>
                  <div className="text-[9px] text-slate-400 leading-tight">{sigTitle}</div>
                </div>
              </div>
            </div>

            {/* Quick Actions for Preview */}
            <div className="mt-4 flex items-center justify-between text-xs">
              <span className="text-slate-500">Live vector engine renders exact 300 DPI print-ready PDFs.</span>
              <button
                onClick={() => onOpenVerify(sampleCertId)}
                className="inline-flex items-center gap-1 font-semibold text-blue-600 hover:underline"
              >
                <ExternalLink className="w-3 h-3" /> Test Public Verification Portal
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
