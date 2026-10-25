import React, { useState } from 'react';
import { Settings, Sparkles, Mail, Save, FileCode } from 'lucide-react';
import { SystemSettings, api } from '../services/api';

interface SettingsModalProps {
  settings: SystemSettings | null;
  onClose: () => void;
  onRefreshSettings: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  settings,
  onClose,
  onRefreshSettings,
}) => {
  const [geminiKey, setGeminiKey] = useState('');
  const [modelId, setModelId] = useState(settings?.gemma_model_id || 'gemini-2.5-flash');
  const [resendKey, setResendKey] = useState('');
  const [resendFrom, setResendFrom] = useState(settings?.resend_from_email || 'EventFlow AI <onboarding@resend.dev>');
  const [simulationMode, setSimulationMode] = useState(settings?.simulation_mode ?? true);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [showSkill, setShowSkill] = useState(false);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      await api.updateSettings({
        gemini_api_key: geminiKey || undefined,
        gemma_model_id: modelId,
        resend_api_key: resendKey || undefined,
        resend_from_email: resendFrom,
        simulation_mode: simulationMode,
      });
      setSaveSuccess(true);
      setTimeout(() => {
        setSaveSuccess(false);
        onRefreshSettings();
        onClose();
      }, 1000);
    } catch (err: any) {
      alert(err.message || 'Failed to update settings');
    } finally {
      setIsSaving(false);
    }
  };

  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  return (
    <div
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4"
    >
      <div className="bg-white rounded-3xl max-w-xl w-full p-6 sm:p-8 shadow-2xl border border-slate-200 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-5">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-slate-900 text-white flex items-center justify-center">
              <Settings className="w-5 h-5 text-amber-300" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">System &amp; API Configuration</h3>
              <p className="text-xs text-slate-500">Configure Gemma 4 AI models and Resend email credentials.</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-700 text-base font-bold p-1 rounded-lg hover:bg-slate-100 transition"
            aria-label="Close settings"
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSave} className="space-y-5">
          {/* Section 1: Gemma 4 / Gemini API */}
          <div className="p-4 rounded-2xl bg-slate-50/70 border border-slate-200/80 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 font-bold text-xs text-slate-800">
                <Sparkles className="w-4 h-4 text-blue-600" />
                <span>Gemma 4 AI Settings (Google GenAI)</span>
              </div>
              <span
                className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                  settings?.gemini_api_key_configured
                    ? 'bg-emerald-100 text-emerald-800'
                    : 'bg-amber-100 text-amber-800'
                }`}
              >
                {settings?.gemini_api_key_configured ? 'Key Configured ✓' : 'Using Local Heuristic'}
              </span>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                Gemini API Key (for Gemma 4 models)
              </label>
              <input
                type="password"
                placeholder={settings?.gemini_api_key_configured ? '••••••••••••••••••••••••' : 'Enter Gemini / Google API Key...'}
                value={geminiKey}
                onChange={(e) => setGeminiKey(e.target.value)}
                className="w-full px-3 py-1.5 text-xs bg-white border border-slate-200 rounded-xl focus:outline-none"
              />
              <span className="text-[10px] text-slate-400 mt-1 block">
                Leave blank to keep existing key. If no key is set, EventFlow AI uses its deterministic domain engine.
              </span>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-600 mb-1">Model Identifier</label>
              <select
                value={modelId}
                onChange={(e) => setModelId(e.target.value)}
                className="w-full px-3 py-1.5 text-xs bg-white border border-slate-200 rounded-xl focus:outline-none font-medium"
              >
                <option value="gemini-2.5-flash">gemini-2.5-flash (Recommended default for Gemma 4 workflow)</option>
                <option value="gemma-2-9b-it">gemma-2-9b-it (Open-Weights Gemma 2)</option>
                <option value="gemma-2-27b-it">gemma-2-27b-it (High-Capacity Gemma 2)</option>
                <option value="gemini-1.5-flash">gemini-1.5-flash</option>
                <option value="gemini-2.0-flash">gemini-2.0-flash</option>
              </select>
            </div>
          </div>

          {/* Section 2: Resend Email & Simulation Mode */}
          <div className="p-4 rounded-2xl bg-slate-50/70 border border-slate-200/80 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 font-bold text-xs text-slate-800">
                <Mail className="w-4 h-4 text-purple-600" />
                <span>Transactional Email (Resend)</span>
              </div>
              <span
                className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                  settings?.resend_api_key_configured
                    ? 'bg-emerald-100 text-emerald-800'
                    : 'bg-purple-100 text-purple-800'
                }`}
              >
                {settings?.resend_api_key_configured ? 'Resend Key Set' : 'Simulation Mode'}
              </span>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-600 mb-1">Resend API Key</label>
              <input
                type="password"
                placeholder={settings?.resend_api_key_configured ? '••••••••••••••••••••••••' : 're_xxxxxxxxxxxxxx'}
                value={resendKey}
                onChange={(e) => setResendKey(e.target.value)}
                className="w-full px-3 py-1.5 text-xs bg-white border border-slate-200 rounded-xl focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-slate-600 mb-1">Sender Email / Name</label>
              <input
                type="text"
                value={resendFrom}
                onChange={(e) => setResendFrom(e.target.value)}
                className="w-full px-3 py-1.5 text-xs bg-white border border-slate-200 rounded-xl focus:outline-none"
              />
            </div>

            <div className="pt-2 border-t border-slate-200/60 flex items-center justify-between">
              <div>
                <div className="text-xs font-semibold text-slate-800">Interactive Email Simulation Mode</div>
                <div className="text-[10px] text-slate-400">
                  When enabled, emails are logged and previewable without sending real messages.
                </div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={simulationMode}
                  onChange={(e) => setSimulationMode(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-9 h-5 bg-slate-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-purple-600"></div>
              </label>
            </div>
          </div>

          {/* Section 3: Open-Source AI Agent Skill (Secondary Reference) */}
          <div className="p-4 rounded-2xl bg-slate-50/70 border border-slate-200/80 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 font-bold text-xs text-slate-800">
                <FileCode className="w-4 h-4 text-indigo-600" />
                <span>Autonomous AI Agent Skill</span>
              </div>
              <button
                type="button"
                onClick={() => setShowSkill(!showSkill)}
                className="text-[11px] font-semibold text-indigo-600 hover:text-indigo-800 hover:underline"
              >
                {showSkill ? 'Hide Details' : 'View Protocol'}
              </button>
            </div>
            <p className="text-[11px] text-slate-500 leading-relaxed">
              Specification at <code className="bg-slate-100 px-1 py-0.5 rounded text-[10px] font-mono">skills/eventflow-agent/SKILL.md</code> enables external AI agents to orchestrate event closure via API.
            </p>
            {showSkill && (
              <div className="mt-2 pt-2 border-t border-slate-200/60 text-[10px] font-mono bg-slate-900 text-slate-200 p-3 rounded-xl max-h-40 overflow-y-auto space-y-1">
                <div>1. POST /api/events (create/fetch event)</div>
                <div>2. POST /api/events/{'{id}'}/feedback-form/generate-ai (Gemma 4 survey generation)</div>
                <div>3. POST /api/events/{'{id}'}/participants/upload-csv (attendee roster ingestion)</div>
                <div>4. POST /api/events/{'{id}'}/emails/send-feedback-invitations (distribute survey tokens)</div>
                <div>5. POST /api/events/{'{id}'}/analytics/regenerate-ai (Gemma 4 feedback analysis)</div>
                <div>6. POST /api/events/{'{id}'}/certificates/generate-all (ReportLab PDF batch rendering)</div>
                <div>7. POST /api/events/{'{id}'}/emails/send-certificates (deliver credentials)</div>
                <div>8. GET /api/events/{'{id}'}/closure-report (export executive report)</div>
              </div>
            )}
          </div>

          <div className="pt-2 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="px-5 py-2 text-xs font-bold bg-slate-900 text-white rounded-xl hover:bg-slate-800 transition disabled:opacity-50 flex items-center gap-1.5"
            >
              <Save className="w-3.5 h-3.5" />
              {isSaving ? 'Saving Settings...' : saveSuccess ? 'Saved ✓' : 'Save Configurations'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
