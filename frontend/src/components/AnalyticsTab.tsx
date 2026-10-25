import React, { useState, useEffect } from 'react';
import {
  Sparkles,
  RefreshCw,
  ThumbsUp,
  MessageSquare,
  TrendingUp,
  CheckCircle2,
  AlertTriangle,
  Lightbulb,
  Award,
  Star,
  Users
} from 'lucide-react';
import { EventItem, AIAnalysisData, api } from '../services/api';

interface AnalyticsTabProps {
  event: EventItem;
  analytics: AIAnalysisData | null;
  onRefreshAnalytics: () => void;
}

export const AnalyticsTab: React.FC<AnalyticsTabProps> = ({
  event,
  analytics,
  onRefreshAnalytics,
}) => {
  const [isReanalyzing, setIsReanalyzing] = useState(false);
  const [submissions, setSubmissions] = useState<any[]>([]);
  const [loadingSubmissions, setLoadingSubmissions] = useState(false);

  useEffect(() => {
    fetchSubmissions();
  }, [event.id]);

  const fetchSubmissions = async () => {
    setLoadingSubmissions(true);
    try {
      const res = await fetch(`/api/events/${event.id}/feedback-submissions`);
      if (res.ok) {
        const data = await res.json();
        setSubmissions(data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingSubmissions(false);
    }
  };

  const handleReanalyze = async () => {
    setIsReanalyzing(true);
    try {
      await api.regenerateAIAnalytics(event.id);
      onRefreshAnalytics();
      fetchSubmissions();
    } catch (err: any) {
      alert(err.message || 'Failed to re-analyze feedback');
    } finally {
      setIsReanalyzing(false);
    }
  };

  const pos = analytics?.sentiment_positive ?? 78;
  const neu = analytics?.sentiment_neutral ?? 15;
  const neg = analytics?.sentiment_negative ?? 7;
  const nps = analytics?.nps_score ?? 0;

  return (
    <div className="space-y-6">
      {/* Top AI Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200/90 shadow-sm">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <h3 className="text-base font-bold text-slate-900">AI Feedback Synthesis &amp; Sentiment</h3>
            <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
              <Sparkles className="w-3 h-3 text-amber-500" />
              {analytics?.model_used || 'Gemma 4 via Gemini API'}
            </span>
          </div>
          <p className="text-xs text-slate-500">
            Real-time qualitative distillation and thematic clustering of all attendee submissions.
          </p>
        </div>

        <button
          onClick={handleReanalyze}
          disabled={isReanalyzing}
          className="inline-flex items-center gap-2 px-4 py-2 text-xs font-bold rounded-xl bg-slate-900 hover:bg-slate-800 text-white shadow-sm transition disabled:opacity-50 shrink-0"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isReanalyzing ? 'animate-spin' : ''}`} />
          {isReanalyzing ? 'Synthesizing...' : 'Re-Run Gemma 4 Analysis'}
        </button>
      </div>

      {/* Two Column Layout: NPS & Sentiment vs Executive Summary */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: NPS Score & Sentiment Distribution */}
        <div className="bg-white rounded-2xl p-6 border border-slate-200/90 shadow-sm space-y-6">
          {/* NPS Score Card */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Net Promoter Score</span>
              <ThumbsUp className="w-4 h-4 text-amber-500" />
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-4xl font-extrabold text-slate-900 tracking-tight">
                {nps > 0 ? `+${nps}` : nps}
              </span>
              <span className="text-xs text-emerald-600 font-semibold bg-emerald-50 px-2 py-0.5 rounded-full">
                {nps >= 50 ? 'World Class' : nps >= 0 ? 'Favorable' : 'Needs Focus'}
              </span>
            </div>
            <p className="text-[11px] text-slate-400 mt-1">Calculated: % Promoters (9-10) minus % Detractors (0-6)</p>
          </div>

          <div className="border-t border-slate-100 pt-4">
            <span className="text-xs font-semibold text-slate-700 block mb-3">Sentiment Distribution</span>
            {/* Multi-color Sentiment Bar */}
            <div className="w-full h-3 rounded-full overflow-hidden flex bg-slate-100 mb-2">
              <div
                style={{ width: `${pos}%` }}
                className="bg-emerald-500 h-full transition-all duration-700"
                title={`Positive: ${pos}%`}
              />
              <div
                style={{ width: `${neu}%` }}
                className="bg-amber-400 h-full transition-all duration-700"
                title={`Neutral: ${neu}%`}
              />
              <div
                style={{ width: `${neg}%` }}
                className="bg-slate-400 h-full transition-all duration-700"
                title={`Constructive: ${neg}%`}
              />
            </div>

            <div className="grid grid-cols-3 text-center text-xs pt-1">
              <div>
                <span className="font-bold text-emerald-700">{pos}%</span>
                <div className="text-[10px] text-slate-400">Positive</div>
              </div>
              <div>
                <span className="font-bold text-amber-700">{neu}%</span>
                <div className="text-[10px] text-slate-400">Neutral</div>
              </div>
              <div>
                <span className="font-bold text-slate-600">{neg}%</span>
                <div className="text-[10px] text-slate-400">Constructive</div>
              </div>
            </div>
          </div>

          {/* Submissions count summary */}
          <div className="border-t border-slate-100 pt-4 flex items-center justify-between text-xs text-slate-500">
            <span className="flex items-center gap-1.5">
              <Users className="w-4 h-4 text-slate-400" />
              Total Submissions
            </span>
            <span className="font-bold text-slate-900">{submissions.length}</span>
          </div>
        </div>

        {/* Right Column (2 cols): Executive Summary */}
        <div className="lg:col-span-2 bg-white rounded-2xl p-6 border border-slate-200/90 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Sparkles className="w-4 h-4 text-blue-600" />
              <h4 className="text-sm font-bold text-slate-900 uppercase tracking-wide">Executive Synthesis</h4>
            </div>
            <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-line">
              {analytics?.executive_summary || 'Awaiting initial feedback responses.'}
            </p>
          </div>

          <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400">
            <span>Model: {analytics?.model_used || 'Gemma 4'}</span>
            <span>Last Analyzed: {analytics ? new Date(analytics.analyzed_at).toLocaleTimeString() : 'N/A'}</span>
          </div>
        </div>
      </div>

      {/* Highlights, Criticisms, and Action Plan Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {/* Key Highlights */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200/90 shadow-sm">
          <div className="flex items-center gap-2 text-emerald-700 mb-3 font-bold text-sm">
            <CheckCircle2 className="w-4 h-4" />
            <span>Top Praises &amp; Highlights</span>
          </div>
          <ul className="space-y-2.5 text-xs text-slate-600">
            {(analytics?.key_highlights || [
              'Hands-on workshop engagement exceeded participant expectations',
              'Mentors were approachable and responsive on technical roadblocks',
              'Smooth logistical execution throughout the event sprint'
            ]).map((item, idx) => (
              <li key={idx} className="flex items-start gap-2">
                <span className="text-emerald-500 font-bold shrink-0">✓</span>
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Critical Improvements */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200/90 shadow-sm">
          <div className="flex items-center gap-2 text-amber-700 mb-3 font-bold text-sm">
            <AlertTriangle className="w-4 h-4" />
            <span>Friction Points &amp; Criticisms</span>
          </div>
          <ul className="space-y-2.5 text-xs text-slate-600">
            {(analytics?.critical_improvements || [
              'Longer buffer period requested between hacking deadline and judging',
              'Pre-event sandbox access would accelerate day-1 momentum'
            ]).map((item, idx) => (
              <li key={idx} className="flex items-start gap-2">
                <span className="text-amber-500 font-bold shrink-0">⚠</span>
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Actionable Recommendations */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200/90 shadow-sm">
          <div className="flex items-center gap-2 text-indigo-700 mb-3 font-bold text-sm">
            <Lightbulb className="w-4 h-4" />
            <span>Action Plan for Next Edition</span>
          </div>
          <ul className="space-y-2.5 text-xs text-slate-600">
            {(analytics?.actionable_recommendations || [
              'Institute 30-minute dedicated mentor office hour slots on day 1',
              'Distribute sample project scaffolds and API tokens 48h prior',
              'Enable instant cryptographic credential unlocks post-demo'
            ]).map((item, idx) => (
              <li key={idx} className="flex items-start gap-2">
                <span className="w-4 h-4 rounded-full bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold text-[10px] shrink-0">
                  {idx + 1}
                </span>
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Raw Attendee Feedback Submissions Table */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200/90 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <h4 className="text-sm font-bold text-slate-900">Individual Participant Submissions ({submissions.length})</h4>
          <span className="text-xs text-slate-400">Chronological feed</span>
        </div>

        {submissions.length === 0 ? (
          <div className="py-8 text-center text-xs text-slate-400">
            No submissions recorded yet. Share the survey link to collect responses.
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {submissions.map((s) => (
              <div key={s.id} className="py-3.5 space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-slate-900">{s.participant_name}</span>
                    {s.nps_score !== null && (
                      <span className="px-2 py-0.5 rounded-full bg-amber-50 text-amber-800 font-semibold text-[10px]">
                        NPS: {s.nps_score}/10
                      </span>
                    )}
                    {s.overall_rating && (
                      <span className="flex items-center gap-0.5 text-amber-500 font-semibold text-[10px]">
                        <Star className="w-3 h-3 fill-amber-400" /> {s.overall_rating}
                      </span>
                    )}
                  </div>
                  <span className="text-[11px] text-slate-400">
                    {new Date(s.submitted_at).toLocaleDateString()} {new Date(s.submitted_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
                {s.comments && (
                  <p className="text-xs text-slate-600 bg-slate-50/70 p-2.5 rounded-xl border border-slate-100">
                    "{s.comments}"
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
