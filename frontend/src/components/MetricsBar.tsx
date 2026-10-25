import React from 'react';
import { Users, MessageSquareText, ThumbsUp, Award, ArrowUpRight, TrendingUp } from 'lucide-react';
import { EventItem, AIAnalysisData } from '../services/api';

interface MetricsBarProps {
  event: EventItem;
  analytics: AIAnalysisData | null;
}

export const MetricsBar: React.FC<MetricsBarProps> = ({ event, analytics }) => {
  const completionRate = event.total_participants > 0
    ? Math.round((event.feedback_submitted_count / event.total_participants) * 100)
    : 0;

  const certRate = event.total_participants > 0
    ? Math.round((event.certificates_generated_count / event.total_participants) * 100)
    : 0;

  const nps = analytics?.nps_score ?? event.nps_score ?? 0;
  const posSentiment = analytics?.sentiment_positive ?? 80;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      {/* 1. Participants Metric Card */}
      <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-[0_2px_10px_rgba(0,0,0,0.02)] hover:shadow-md transition-all">
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Participants</span>
          <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
            <Users className="w-4 h-4" />
          </div>
        </div>
        <div className="flex items-baseline gap-2">
          <span className="text-3xl font-extrabold text-slate-900 tracking-tight">{event.total_participants}</span>
          <span className="text-xs text-slate-500 font-medium">registered</span>
        </div>
        <div className="mt-3 flex items-center gap-1.5 text-xs text-slate-500">
          <span className="inline-block w-2 h-2 rounded-full bg-blue-500" />
          <span>{event.feedback_sent_count} feedback links dispatched</span>
        </div>
      </div>

      {/* 2. Feedback Response Rate Metric Card */}
      <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-[0_2px_10px_rgba(0,0,0,0.02)] hover:shadow-md transition-all">
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Survey Responses</span>
          <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
            <MessageSquareText className="w-4 h-4" />
          </div>
        </div>
        <div className="flex items-baseline gap-2">
          <span className="text-3xl font-extrabold text-slate-900 tracking-tight">{event.feedback_submitted_count}</span>
          <span className="text-xs font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200/60">
            {completionRate}% completed
          </span>
        </div>
        {/* Progress bar */}
        <div className="mt-3 w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
          <div
            className="bg-emerald-500 h-1.5 rounded-full transition-all duration-500"
            style={{ width: `${Math.min(completionRate, 100)}%` }}
          />
        </div>
      </div>

      {/* 3. AI Sentiment & NPS Metric Card */}
      <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-[0_2px_10px_rgba(0,0,0,0.02)] hover:shadow-md transition-all">
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Net Promoter Score</span>
          <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
            <ThumbsUp className="w-4 h-4" />
          </div>
        </div>
        <div className="flex items-baseline gap-2">
          <span className="text-3xl font-extrabold text-slate-900 tracking-tight">
            {nps > 0 ? `+${nps}` : nps}
          </span>
          <span className="text-xs text-slate-500 font-medium">
            (NPS scale -100 to +100)
          </span>
        </div>
        <div className="mt-3 flex items-center gap-1.5 text-xs text-emerald-700">
          <TrendingUp className="w-3.5 h-3.5" />
          <span>{posSentiment}% positive sentiment via Gemma 4</span>
        </div>
      </div>

      {/* 4. Certificates Status Metric Card */}
      <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-[0_2px_10px_rgba(0,0,0,0.02)] hover:shadow-md transition-all">
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Certificates Ready</span>
          <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
            <Award className="w-4 h-4" />
          </div>
        </div>
        <div className="flex items-baseline gap-2">
          <span className="text-3xl font-extrabold text-slate-900 tracking-tight">{event.certificates_generated_count}</span>
          <span className="text-xs text-slate-500 font-medium">of {event.total_participants} generated</span>
        </div>
        <div className="mt-3 flex items-center justify-between text-xs text-slate-500">
          <span className="text-indigo-600 font-medium">{event.certificates_emailed_count} emailed</span>
          <span className="font-semibold text-slate-700">{certRate}%</span>
        </div>
      </div>
    </div>
  );
};
