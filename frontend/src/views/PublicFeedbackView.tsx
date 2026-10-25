import React, { useState, useEffect } from 'react';
import confetti from 'canvas-confetti';
import {
  Award,
  CheckCircle2,
  Star,
  Download,
  ExternalLink,
  ArrowLeft,
  Sparkles,
  HelpCircle,
  ThumbsUp
} from 'lucide-react';
import { api } from '../services/api';

interface PublicFeedbackViewProps {
  token: string;
  onBackToDashboard: () => void;
  onOpenVerify: (certId: string) => void;
}

export const PublicFeedbackView: React.FC<PublicFeedbackViewProps> = ({
  token,
  onBackToDashboard,
  onOpenVerify,
}) => {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const [answers, setAnswers] = useState<Record<string, any>>({});
  const [npsScore, setNpsScore] = useState<number | null>(null);
  const [overallRating, setOverallRating] = useState<number>(5);
  const [comments, setComments] = useState<string>('');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submittedResult, setSubmittedResult] = useState<any>(null);

  useEffect(() => {
    loadFeedbackPage();
  }, [token]);

  const loadFeedbackPage = async () => {
    setLoading(true);
    setError(null);
    try {
      if (token === 'preview') {
        // Mock preview for testing
        setData({
          participant: {
            name: 'Alex Rivera (Preview Mode)',
            email: 'alex.rivera@example.com',
            role: 'Hacker',
            already_submitted: false,
          },
          event: {
            title: 'HackFlow Global AI Hackathon 2026',
            organization: 'MLH & EventFlow Open Source',
            date: 'October 24-25, 2026',
            event_type: 'Hackathon',
          },
          form: {
            title: 'Participant Experience & Feedback Survey',
            description:
              'Thank you for joining HackFlow! Please take 2 minutes to share your thoughts. Completing this survey automatically verifies and unlocks your official certificate.',
            questions: [
              {
                id: 'q1',
                prompt: 'How would you rate your overall hackathon experience?',
                type: 'rating',
                required: true,
              },
              {
                id: 'q2',
                prompt: 'How likely are you to recommend HackFlow to fellow builders? (0 = Not likely, 10 = Absolutely)',
                type: 'nps',
                required: true,
              },
              {
                id: 'q3',
                prompt: 'Which track or challenge did your project target?',
                type: 'choice',
                options: ['Gemma 4 AI Innovation', 'DigitalOcean Open-Source', 'Developer Tools', 'Climate Tech'],
                required: false,
              },
              {
                id: 'q4',
                prompt: 'Were the mentors and sponsor office hours helpful during your build sprint?',
                type: 'choice',
                options: ['Yes, very supportive', 'Neutral', 'Could be improved'],
                required: false,
              },
              {
                id: 'q5',
                prompt: 'What was your favorite moment, and what is one thing we could improve for next year?',
                type: 'text',
                required: true,
              },
            ],
          },
          certificate_id: 'EF-HACK-1001',
        });
        setLoading(false);
        return;
      }

      const res = await api.getPublicFeedback(token);
      setData(res);
      if (res.participant?.already_submitted) {
        setSubmittedResult({
          certificate_id: res.certificate_id || 'EF-HACK-1001',
          verify_url: `/verify/${res.certificate_id || 'EF-HACK-1001'}`,
          download_url: `/static/certificates/${res.certificate_id || 'EF-HACK-1001'}.pdf`,
        });
      }
    } catch (e: any) {
      setError(e.message || 'Invalid or expired feedback link');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      if (token === 'preview') {
        // Simulate
        setTimeout(() => {
          confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } });
          setSubmittedResult({
            certificate_id: 'EF-HACK-1001',
            verify_url: '/verify/EF-HACK-1001',
            download_url: '/static/certificates/EF-HACK-1001.pdf',
          });
          setIsSubmitting(false);
        }, 800);
        return;
      }

      const res = await api.submitPublicFeedback(token, {
        answers,
        nps_score: npsScore ?? 10,
        overall_rating: overallRating,
        comments,
      });

      confetti({ particleCount: 120, spread: 80, origin: { y: 0.6 } });
      setSubmittedResult(res);
    } catch (err: any) {
      alert(err.message || 'Failed to submit feedback');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#fbfbf9] flex items-center justify-center p-4">
        <div className="text-sm font-semibold text-slate-500 animate-pulse">Loading survey...</div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-[#fbfbf9] flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-3xl p-8 border border-slate-200 text-center shadow-lg">
          <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mx-auto mb-4">
            ✕
          </div>
          <h2 className="text-xl font-bold text-slate-900 mb-2">Invalid Feedback Link</h2>
          <p className="text-xs text-slate-500 mb-6">{error || 'This survey link does not exist or has expired.'}</p>
          <button
            onClick={onBackToDashboard}
            className="px-5 py-2.5 text-xs font-bold rounded-xl bg-slate-900 text-white"
          >
            Return to Dashboard
          </button>
        </div>
      </div>
    );
  }

  const { participant, event, form } = data;

  return (
    <div className="min-h-screen bg-[#fbfbf9] py-10 px-4 sm:px-6">
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Navigation & Brand */}
        <div className="flex items-center justify-between">
          <button
            onClick={onBackToDashboard}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-900 transition"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Back to Dashboard
          </button>
          <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800">
            <Award className="w-4 h-4 text-amber-500" />
            <span>EventFlow AI Credential Service</span>
          </div>
        </div>

        {/* Post-Submission Celebration Card */}
        {submittedResult ? (
          <div className="bg-white rounded-3xl p-8 border border-emerald-200/80 shadow-lg text-center space-y-5 animate-in fade-in duration-500">
            <div className="w-16 h-16 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto border-2 border-emerald-200">
              <CheckCircle2 className="w-8 h-8" />
            </div>

            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-emerald-600 bg-emerald-50 px-3 py-1 rounded-full">
                Feedback Recorded ✓
              </span>
              <h2 className="text-2xl font-black text-slate-900 tracking-tight mt-3">
                Your Certificate is Unlocked!
              </h2>
              <p className="text-xs sm:text-sm text-slate-500 mt-1 max-w-md mx-auto">
                Thank you, <strong>{participant.name}</strong>! Your feedback for <strong>{event.title}</strong> has been saved and your verified credentials are now authenticated.
              </p>
            </div>

            {/* Certificate ID Pill */}
            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 max-w-sm mx-auto">
              <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                Official Credential ID
              </div>
              <div className="font-mono text-lg font-bold text-slate-900 mt-0.5">
                {submittedResult.certificate_id}
              </div>
            </div>

            {/* Download & Verification Actions */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
              <a
                href={submittedResult.download_url}
                target="_blank"
                rel="noreferrer"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-md transition"
              >
                <Download className="w-4 h-4" /> Download Official PDF
              </a>

              <button
                onClick={() => onOpenVerify(submittedResult.certificate_id)}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs shadow-md transition"
              >
                <ExternalLink className="w-4 h-4" /> View Public Verification
              </button>
            </div>
          </div>
        ) : (
          /* Survey Form Card */
          <div className="bg-white rounded-3xl p-6 sm:p-10 border border-slate-200/90 shadow-sm space-y-8">
            {/* Header Greeting */}
            <div className="border-b border-slate-100 pb-6">
              <div className="flex items-center gap-2 mb-2">
                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider bg-slate-900 text-white">
                  {event.event_type}
                </span>
                <span className="text-xs font-semibold text-slate-400">{event.organization}</span>
              </div>
              <h1 className="text-2xl font-black text-slate-900 tracking-tight">{form.title}</h1>
              <p className="text-xs sm:text-sm text-slate-500 mt-2 leading-relaxed">
                Hi <strong>{participant.name}</strong>, {form.description}
              </p>
            </div>

            {/* Questions Form */}
            <form onSubmit={handleSubmit} className="space-y-7">
              {form.questions.map((q: any, idx: number) => (
                <div key={q.id || idx} className="space-y-3">
                  <label className="block text-sm font-bold text-slate-800">
                    <span className="text-slate-400 mr-1.5">{idx + 1}.</span>
                    {q.prompt}
                    {q.required && <span className="text-rose-500 ml-1">*</span>}
                  </label>

                  {/* Rating Question: 1-5 Stars */}
                  {q.type === 'rating' && (
                    <div className="flex items-center gap-2 pt-1">
                      {[1, 2, 3, 4, 5].map((starVal) => {
                        const currentVal = answers[q.id] ?? overallRating;
                        return (
                          <button
                            key={starVal}
                            type="button"
                            onClick={() => {
                              setAnswers({ ...answers, [q.id]: starVal });
                              setOverallRating(starVal);
                            }}
                            className={`p-2.5 rounded-xl border transition-all ${
                              currentVal >= starVal
                                ? 'bg-amber-50 border-amber-300 text-amber-500'
                                : 'bg-slate-50 border-slate-200 text-slate-300 hover:text-amber-300'
                            }`}
                          >
                            <Star className="w-6 h-6 fill-current" />
                          </button>
                        );
                      })}
                      <span className="text-xs font-bold text-slate-600 ml-2">
                        {answers[q.id] ?? overallRating} / 5 Stars
                      </span>
                    </div>
                  )}

                  {/* NPS Question: 0-10 Scale */}
                  {q.type === 'nps' && (
                    <div>
                      <div className="grid grid-cols-11 gap-1 pt-1">
                        {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((num) => (
                          <button
                            key={num}
                            type="button"
                            onClick={() => {
                              setAnswers({ ...answers, [q.id]: num });
                              setNpsScore(num);
                            }}
                            className={`py-2.5 rounded-xl text-xs font-bold border transition-all ${
                              (answers[q.id] ?? npsScore) === num
                                ? 'bg-slate-900 text-white border-slate-900 shadow-sm scale-105'
                                : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                            }`}
                          >
                            {num}
                          </button>
                        ))}
                      </div>
                      <div className="flex justify-between text-[10px] text-slate-400 font-medium px-1 mt-1.5">
                        <span>Not likely at all</span>
                        <span>Extremely likely</span>
                      </div>
                    </div>
                  )}

                  {/* Multiple Choice Question */}
                  {q.type === 'choice' && q.options && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                      {q.options.map((opt: string) => {
                        const isSelected = answers[q.id] === opt;
                        return (
                          <button
                            key={opt}
                            type="button"
                            onClick={() => setAnswers({ ...answers, [q.id]: opt })}
                            className={`p-3 text-left rounded-xl border text-xs font-medium transition ${
                              isSelected
                                ? 'bg-blue-50 border-blue-400 text-blue-900 shadow-xs'
                                : 'bg-slate-50/70 border-slate-200 text-slate-700 hover:bg-slate-100'
                            }`}
                          >
                            {opt}
                          </button>
                        );
                      })}
                    </div>
                  )}

                  {/* Boolean / Yes-No Toggle */}
                  {q.type === 'boolean' && (
                    <div className="flex gap-2 pt-1">
                      {['Yes, very supportive', 'Neutral', 'Could be improved'].map((opt) => (
                        <button
                          key={opt}
                          type="button"
                          onClick={() => setAnswers({ ...answers, [q.id]: opt })}
                          className={`px-4 py-2 rounded-xl border text-xs font-semibold transition ${
                            answers[q.id] === opt
                              ? 'bg-slate-900 text-white border-slate-900'
                              : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                          }`}
                        >
                          {opt}
                        </button>
                      ))}
                    </div>
                  )}

                  {/* Text / Comments */}
                  {q.type === 'text' && (
                    <textarea
                      rows={3}
                      required={q.required}
                      placeholder="Share your candid thoughts, highlights, or suggestions..."
                      value={answers[q.id] ?? comments}
                      onChange={(e) => {
                        setAnswers({ ...answers, [q.id]: e.target.value });
                        setComments(e.target.value);
                      }}
                      className="w-full p-3.5 text-xs bg-slate-50 border border-slate-200 rounded-2xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-400"
                    />
                  )}
                </div>
              ))}

              <div className="pt-4 border-t border-slate-100">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full py-3.5 px-6 rounded-2xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-sm shadow-md transition disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  <Sparkles className="w-4 h-4 text-amber-300" />
                  {isSubmitting ? 'Recording Feedback & Unlocking Certificate...' : 'Submit Feedback & Unlock Certificate'}
                </button>
                <p className="text-[11px] text-center text-slate-400 mt-2">
                  🔒 Your verified credentials will be cryptographically minted immediately upon submission.
                </p>
              </div>
            </form>
          </div>
        )}
      </div>
    </div>
  );
};
