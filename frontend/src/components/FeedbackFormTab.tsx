import React, { useState, useEffect } from 'react';
import {
  Sparkles,
  Plus,
  Trash2,
  Save,
  CheckCircle2,
  ExternalLink,
  Copy,
  Sliders,
  HelpCircle,
  Layers,
  ArrowRight
} from 'lucide-react';
import { EventItem, FeedbackFormData, QuestionItem, api } from '../services/api';

interface FeedbackFormTabProps {
  event: EventItem;
  onOpenTestFeedback: (token?: string) => void;
}

export const FeedbackFormTab: React.FC<FeedbackFormTabProps> = ({ event, onOpenTestFeedback }) => {
  const [formData, setFormData] = useState<FeedbackFormData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isGeneratingAI, setIsGeneratingAI] = useState(false);
  const [customFocus, setCustomFocus] = useState('');
  const [questionCount, setQuestionCount] = useState(5);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  useEffect(() => {
    loadForm();
  }, [event.id]);

  const loadForm = async () => {
    setIsLoading(true);
    try {
      const data = await api.getFeedbackForm(event.id);
      setFormData(data);
    } catch (err: any) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleGenerateAI = async () => {
    setIsGeneratingAI(true);
    try {
      const data = await api.generateAIQuestions(event.id, customFocus, questionCount);
      setFormData(data);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err: any) {
      alert(err.message || 'Failed to generate questions with Gemma');
    } finally {
      setIsGeneratingAI(false);
    }
  };

  const handleSave = async () => {
    if (!formData) return;
    setIsSaving(true);
    try {
      await api.updateFeedbackForm(event.id, formData);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err: any) {
      alert(err.message || 'Failed to save form');
    } finally {
      setIsSaving(false);
    }
  };

  const handleAddQuestion = () => {
    if (!formData) return;
    const newQ: QuestionItem = {
      id: `q_${Date.now()}`,
      prompt: 'New Question',
      type: 'rating',
      required: true,
      category: 'overall',
    };
    setFormData({
      ...formData,
      questions: [...formData.questions, newQ],
    });
  };

  const handleRemoveQuestion = (id: string) => {
    if (!formData) return;
    setFormData({
      ...formData,
      questions: formData.questions.filter((q) => q.id !== id),
    });
  };

  const handleUpdateQuestion = (id: string, updates: Partial<QuestionItem>) => {
    if (!formData) return;
    setFormData({
      ...formData,
      questions: formData.questions.map((q) => (q.id === id ? { ...q, ...updates } : q)),
    });
  };

  if (isLoading || !formData) {
    return (
      <div className="p-12 text-center text-slate-400 animate-pulse text-sm">
        Loading feedback form configuration...
      </div>
    );
  }

  const sampleToken = 'preview';
  const publicUrl = `${window.location.origin}/?view=feedback&token=${sampleToken}`;

  return (
    <div className="space-y-6">
      {/* 1. Gemma 4 AI Question Formulation Card */}
      <div className="bg-gradient-to-r from-blue-50/80 via-indigo-50/50 to-white rounded-2xl p-6 border border-blue-200/80 shadow-sm relative overflow-hidden">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-sm">
              <Sparkles className="w-5 h-5 text-amber-200" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-slate-900">Gemma 4 Survey Synthesizer</h3>
                <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-blue-100 text-blue-700">
                  AI Generator
                </span>
              </div>
              <p className="text-xs text-slate-500">
                Generate domain-specific questions tailored to <strong>{event.title}</strong> and its tracks.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-slate-600">Question count:</span>
            <select
              value={questionCount}
              onChange={(e) => setQuestionCount(Number(e.target.value))}
              className="px-2 py-1 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none"
            >
              <option value={3}>3 Questions (Express)</option>
              <option value={5}>5 Questions (Standard)</option>
              <option value={7}>7 Questions (Detailed)</option>
            </select>
          </div>
        </div>

        {/* Custom prompt guidance input */}
        <div className="flex flex-col sm:flex-row gap-2">
          <input
            type="text"
            placeholder="Optional focus: e.g. Focus on mentorship responsiveness, WiFi reliability, and judging fairness..."
            value={customFocus}
            onChange={(e) => setCustomFocus(e.target.value)}
            className="flex-1 px-4 py-2.5 text-xs bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 shadow-sm"
          />
          <button
            onClick={handleGenerateAI}
            disabled={isGeneratingAI}
            className="inline-flex items-center justify-center gap-2 px-5 py-2.5 text-xs font-bold rounded-xl bg-blue-600 hover:bg-blue-700 text-white shadow-sm transition disabled:opacity-50 shrink-0"
          >
            <Sparkles className="w-4 h-4 text-amber-200" />
            {isGeneratingAI ? 'Gemma 4 Formulating...' : 'Generate with Gemma 4'}
          </button>
        </div>
      </div>

      {/* 2. Public Link Preview Banner */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200/90 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2.5 w-full sm:w-auto">
          <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
            <CheckCircle2 className="w-4 h-4" />
          </div>
          <div className="overflow-hidden">
            <div className="font-semibold text-slate-800">Public Survey Link for Participants</div>
            <div className="text-slate-400 truncate max-w-sm">{publicUrl}</div>
          </div>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
          <button
            onClick={() => {
              navigator.clipboard.writeText(publicUrl);
              setCopiedLink(true);
              setTimeout(() => setCopiedLink(false), 2000);
            }}
            className="px-3 py-1.5 rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 font-medium transition"
          >
            {copiedLink ? 'Copied Link!' : 'Copy Form Link'}
          </button>
          <button
            onClick={() => onOpenTestFeedback()}
            className="inline-flex items-center gap-1 px-3.5 py-1.5 rounded-lg bg-slate-900 text-white font-medium hover:bg-slate-800 transition"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            Test Participant View
          </button>
        </div>
      </div>

      {/* 3. Survey Builder: Title & Description */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200/90 shadow-sm space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
          <div>
            <h3 className="text-base font-bold text-slate-900">Form Configuration &amp; Questions</h3>
            <p className="text-xs text-slate-500">Edit titles, prompts, question types, or reorder questions.</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleAddQuestion}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition"
            >
              <Plus className="w-3.5 h-3.5" /> Add Question
            </button>
            <button
              onClick={handleSave}
              disabled={isSaving}
              className="inline-flex items-center gap-1.5 px-4 py-1.5 text-xs font-bold rounded-xl bg-slate-900 hover:bg-slate-800 text-white shadow-sm transition"
            >
              <Save className="w-3.5 h-3.5" />
              {isSaving ? 'Saving...' : saveSuccess ? 'Saved ✓' : 'Save Form'}
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Survey Title</label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              className="w-full px-3.5 py-2 text-sm bg-white border border-slate-200 rounded-xl focus:outline-none"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Attendee Description / Subtitle</label>
            <input
              type="text"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full px-3.5 py-2 text-sm bg-white border border-slate-200 rounded-xl focus:outline-none"
            />
          </div>
        </div>

        {/* Questions List */}
        <div className="space-y-3 pt-2">
          {formData.questions.map((q, idx) => (
            <div
              key={q.id || idx}
              className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 hover:bg-white hover:border-slate-300 transition-all space-y-3"
            >
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-slate-200 text-slate-700 flex items-center justify-center text-xs font-bold">
                    {idx + 1}
                  </span>
                  <select
                    value={q.type}
                    onChange={(e) => handleUpdateQuestion(q.id, { type: e.target.value as any })}
                    className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-white border border-slate-200 text-slate-700 focus:outline-none"
                  >
                    <option value="rating">Rating (1 to 5 Stars)</option>
                    <option value="nps">NPS Scale (0 to 10 Score)</option>
                    <option value="choice">Multiple Choice</option>
                    <option value="boolean">Yes / No Toggle</option>
                    <option value="text">Open Text Response</option>
                  </select>

                  <select
                    value={q.category || 'overall'}
                    onChange={(e) => handleUpdateQuestion(q.id, { category: e.target.value })}
                    className="px-2 py-1 text-xs text-slate-500 bg-transparent border-0 focus:outline-none"
                  >
                    <option value="overall">Category: Overall</option>
                    <option value="content">Category: Content &amp; Tracks</option>
                    <option value="organization">Category: Mentors &amp; Logistics</option>
                  </select>
                </div>

                <div className="flex items-center gap-3">
                  <label className="flex items-center gap-1.5 text-xs text-slate-600 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={q.required}
                      onChange={(e) => handleUpdateQuestion(q.id, { required: e.target.checked })}
                      className="rounded text-slate-900 focus:ring-0 cursor-pointer"
                    />
                    <span>Required</span>
                  </label>
                  <button
                    onClick={() => handleRemoveQuestion(q.id)}
                    className="p-1 text-slate-400 hover:text-rose-600 rounded transition"
                    title="Delete question"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Prompt Input */}
              <input
                type="text"
                value={q.prompt}
                onChange={(e) => handleUpdateQuestion(q.id, { prompt: e.target.value })}
                className="w-full px-3.5 py-2 text-sm bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-slate-400"
                placeholder="Enter question prompt..."
              />

              {/* Options for Choice questions */}
              {q.type === 'choice' && (
                <div className="space-y-1.5 pl-2 border-l-2 border-indigo-200">
                  <label className="text-[11px] font-semibold text-slate-500">Choice Options (comma separated):</label>
                  <input
                    type="text"
                    value={(q.options || []).join(', ')}
                    onChange={(e) =>
                      handleUpdateQuestion(q.id, {
                        options: e.target.value.split(',').map((s) => s.trim()).filter(Boolean),
                      })
                    }
                    placeholder="e.g. AI Innovation, Cloud, Web3, Design"
                    className="w-full px-3 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none"
                  />
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
