import React, { useState, useEffect } from 'react';
import {
  Users,
  Sparkles,
  Award,
  Mail,
  FileText,
  LayoutDashboard,
  ExternalLink,
  ChevronRight,
  TrendingUp,
  Send,
  QrCode,
  CheckCircle2
} from 'lucide-react';
import { Navbar } from './components/Navbar';
import { MetricsBar } from './components/MetricsBar';
import { EventOverviewTab } from './components/EventOverviewTab';
import { ParticipantsTab } from './components/ParticipantsTab';
import { FeedbackFormTab } from './components/FeedbackFormTab';
import { AnalyticsTab } from './components/AnalyticsTab';
import { CertificateStudioTab } from './components/CertificateStudioTab';
import { EmailHubTab } from './components/EmailHubTab';
import { ClosureReportTab } from './components/ClosureReportTab';
import { SettingsModal } from './components/SettingsModal';
import { CreateEventModal } from './components/CreateEventModal';
import { EmailPreviewModal } from './components/EmailPreviewModal';
import { PublicFeedbackView } from './views/PublicFeedbackView';
import { PublicVerifyView } from './views/PublicVerifyView';
import {
  EventItem,
  ParticipantItem,
  AIAnalysisData,
  SystemSettings,
  EmailLogItem,
  api
} from './services/api';

export function App() {
  // Routing / View state
  const [currentView, setCurrentView] = useState<'dashboard' | 'feedback' | 'verify'>('dashboard');
  const [routeToken, setRouteToken] = useState<string>('');
  const [routeCertId, setRouteCertId] = useState<string>('');

  // Active Data State
  const [events, setEvents] = useState<EventItem[]>([]);
  const [selectedEvent, setSelectedEvent] = useState<EventItem | null>(null);
  const [participants, setParticipants] = useState<ParticipantItem[]>([]);
  const [analytics, setAnalytics] = useState<AIAnalysisData | null>(null);
  const [settings, setSettings] = useState<SystemSettings | null>(null);

  // Active Tab inside Dashboard
  const [activeTab, setActiveTab] = useState<
    'overview' | 'participants' | 'feedback_form' | 'analytics' | 'certificates' | 'emails' | 'closure_report'
  >('participants');

  // Modals state
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [previewEmailLog, setPreviewEmailLog] = useState<EmailLogItem | null>(null);

  const [isLoading, setIsLoading] = useState(true);

  // Check URL params on initial load for public routes
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const viewParam = params.get('view');
    const tokenParam = params.get('token');
    const certParam = params.get('cert_id');

    if (viewParam === 'feedback' && tokenParam) {
      setCurrentView('feedback');
      setRouteToken(tokenParam);
    } else if (viewParam === 'verify' && certParam) {
      setCurrentView('verify');
      setRouteCertId(certParam);
    } else {
      setCurrentView('dashboard');
    }
  }, []);

  // Fetch initial data
  useEffect(() => {
    loadInitialData();
  }, []);

  // Fetch participants & analytics when selected event changes
  useEffect(() => {
    if (selectedEvent) {
      loadEventSubData(selectedEvent.id);
    }
  }, [selectedEvent?.id]);

  const loadInitialData = async () => {
    setIsLoading(true);
    try {
      const [eventsData, settingsData] = await Promise.all([
        api.getEvents(),
        api.getSettings(),
      ]);
      setEvents(eventsData);
      setSettings(settingsData);
      if (eventsData.length > 0) {
        setSelectedEvent(eventsData[0]);
      }
    } catch (e) {
      console.error('Failed to load initial data', e);
    } finally {
      setIsLoading(false);
    }
  };

  const loadEventSubData = async (eventId: string) => {
    try {
      const [partData, analyticsData, refreshedEvent] = await Promise.all([
        api.getParticipants(eventId),
        api.getAnalytics(eventId).catch(() => null),
        api.getEvent(eventId),
      ]);
      setParticipants(partData);
      setAnalytics(analyticsData);
      setSelectedEvent(refreshedEvent);
    } catch (e) {
      console.error('Failed to load event sub data', e);
    }
  };

  const handleRefreshCurrentEvent = () => {
    if (selectedEvent) {
      loadEventSubData(selectedEvent.id);
    }
  };

  const handleOpenTestFeedback = (token?: string) => {
    const targetToken = token || (participants.length > 0 ? participants[0].feedback_token : 'preview');
    setRouteToken(targetToken);
    setCurrentView('feedback');
    window.history.pushState({}, '', `/?view=feedback&token=${targetToken}`);
  };

  const handleOpenVerify = (certId?: string) => {
    const targetId = certId || (participants.length > 0 ? participants[0].certificate_id : 'EF-HACK-1001');
    setRouteCertId(targetId);
    setCurrentView('verify');
    window.history.pushState({}, '', `/?view=verify&cert_id=${targetId}`);
  };

  const handleBackToDashboard = () => {
    setCurrentView('dashboard');
    window.history.pushState({}, '', '/');
    handleRefreshCurrentEvent();
  };

  // If attendee public feedback view is active
  if (currentView === 'feedback') {
    return (
      <PublicFeedbackView
        token={routeToken}
        onBackToDashboard={handleBackToDashboard}
        onOpenVerify={(certId) => handleOpenVerify(certId)}
      />
    );
  }

  // If public certificate verification view is active
  if (currentView === 'verify') {
    return (
      <PublicVerifyView
        certId={routeCertId}
        onBackToDashboard={handleBackToDashboard}
      />
    );
  }

  // Main Dashboard View
  return (
    <div className="min-h-screen bg-[#fbfbf9] text-slate-900 flex flex-col font-sans selection:bg-slate-200">
      {/* Top Navbar */}
      <Navbar
        events={events}
        selectedEvent={selectedEvent}
        onSelectEvent={(ev) => setSelectedEvent(ev)}
        onOpenCreateModal={() => setIsCreateOpen(true)}
        onOpenSettingsModal={() => setIsSettingsOpen(true)}
        settings={settings}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-8 py-6 space-y-6">
        {isLoading ? (
          <div className="py-24 text-center text-slate-400 animate-pulse text-sm">
            Initializing EventFlow AI Workspace...
          </div>
        ) : !selectedEvent ? (
          <div className="bg-white rounded-3xl p-12 text-center border border-slate-200 shadow-sm max-w-md mx-auto my-12">
            <Award className="w-12 h-12 text-slate-400 mx-auto mb-3" />
            <h2 className="text-xl font-bold text-slate-900 mb-1">No Events Found</h2>
            <p className="text-xs text-slate-500 mb-6">Create your first event to start automating post-event closure.</p>
            <button
              onClick={() => setIsCreateOpen(true)}
              className="px-5 py-2.5 rounded-xl bg-slate-900 text-white font-bold text-xs"
            >
              + Create Event
            </button>
          </div>
        ) : (
          <>
            {/* Life OS Summary Metrics Bar */}
            <MetricsBar event={selectedEvent} analytics={analytics} />

            {/* Main Two-Column Layout */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              {/* Left Column (8.5 cols): Workflow Navigation Tabs & Active Stage View */}
              <div className="lg:col-span-8 space-y-4">
                {/* Horizontal Workflow Tabs */}
                <div className="bg-white p-1.5 rounded-2xl border border-slate-200/90 shadow-sm flex items-center gap-1 overflow-x-auto text-xs font-semibold">
                  <button
                    onClick={() => setActiveTab('participants')}
                    className={`px-3.5 py-2 rounded-xl flex items-center gap-1.5 whitespace-nowrap transition ${
                      activeTab === 'participants'
                        ? 'bg-slate-900 text-white shadow-xs'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                    }`}
                  >
                    <Users className="w-3.5 h-3.5" />
                    <span>Participants ({participants.length})</span>
                  </button>

                  <button
                    onClick={() => setActiveTab('feedback_form')}
                    className={`px-3.5 py-2 rounded-xl flex items-center gap-1.5 whitespace-nowrap transition ${
                      activeTab === 'feedback_form'
                        ? 'bg-slate-900 text-white shadow-xs'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                    }`}
                  >
                    <Sparkles className="w-3.5 h-3.5 text-blue-400" />
                    <span>AI Survey (Gemma 4)</span>
                  </button>

                  <button
                    onClick={() => setActiveTab('analytics')}
                    className={`px-3.5 py-2 rounded-xl flex items-center gap-1.5 whitespace-nowrap transition ${
                      activeTab === 'analytics'
                        ? 'bg-slate-900 text-white shadow-xs'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                    }`}
                  >
                    <TrendingUp className="w-3.5 h-3.5 text-emerald-500" />
                    <span>Sentiment &amp; NPS</span>
                  </button>

                  <button
                    onClick={() => setActiveTab('certificates')}
                    className={`px-3.5 py-2 rounded-xl flex items-center gap-1.5 whitespace-nowrap transition ${
                      activeTab === 'certificates'
                        ? 'bg-slate-900 text-white shadow-xs'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                    }`}
                  >
                    <Award className="w-3.5 h-3.5 text-indigo-500" />
                    <span>Certificate Studio</span>
                  </button>

                  <button
                    onClick={() => setActiveTab('emails')}
                    className={`px-3.5 py-2 rounded-xl flex items-center gap-1.5 whitespace-nowrap transition ${
                      activeTab === 'emails'
                        ? 'bg-slate-900 text-white shadow-xs'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                    }`}
                  >
                    <Mail className="w-3.5 h-3.5 text-purple-500" />
                    <span>Email Hub</span>
                  </button>

                  <button
                    onClick={() => setActiveTab('closure_report')}
                    className={`px-3.5 py-2 rounded-xl flex items-center gap-1.5 whitespace-nowrap transition ${
                      activeTab === 'closure_report'
                        ? 'bg-slate-900 text-white shadow-xs'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                    }`}
                  >
                    <FileText className="w-3.5 h-3.5 text-slate-500" />
                    <span>Executive Report</span>
                  </button>

                  <button
                    onClick={() => setActiveTab('overview')}
                    className={`px-3 py-2 rounded-xl flex items-center gap-1.5 whitespace-nowrap transition ${
                      activeTab === 'overview'
                        ? 'bg-slate-900 text-white shadow-xs'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                    }`}
                  >
                    <LayoutDashboard className="w-3.5 h-3.5 text-slate-400" />
                    <span>Details</span>
                  </button>
                </div>

                {/* Active Tab Panel */}
                <div className="transition-all duration-300">
                  {activeTab === 'participants' && (
                    <ParticipantsTab
                      event={selectedEvent}
                      participants={participants}
                      onRefresh={handleRefreshCurrentEvent}
                      onOpenTestFeedback={(token) => handleOpenTestFeedback(token)}
                      onOpenVerify={(certId) => handleOpenVerify(certId)}
                    />
                  )}

                  {activeTab === 'feedback_form' && (
                    <FeedbackFormTab
                      event={selectedEvent}
                      onOpenTestFeedback={() => handleOpenTestFeedback()}
                    />
                  )}

                  {activeTab === 'analytics' && (
                    <AnalyticsTab
                      event={selectedEvent}
                      analytics={analytics}
                      onRefreshAnalytics={handleRefreshCurrentEvent}
                    />
                  )}

                  {activeTab === 'certificates' && (
                    <CertificateStudioTab
                      event={selectedEvent}
                      onRefreshEvent={handleRefreshCurrentEvent}
                      onOpenVerify={(certId) => handleOpenVerify(certId)}
                    />
                  )}

                  {activeTab === 'emails' && (
                    <EmailHubTab
                      event={selectedEvent}
                      settings={settings}
                      onRefreshEvent={handleRefreshCurrentEvent}
                      onOpenEmailPreview={(log) => setPreviewEmailLog(log)}
                    />
                  )}

                  {activeTab === 'closure_report' && (
                    <ClosureReportTab event={selectedEvent} />
                  )}

                  {activeTab === 'overview' && (
                    <EventOverviewTab
                      event={selectedEvent}
                      onRefresh={handleRefreshCurrentEvent}
                      onOpenTestFeedback={() => handleOpenTestFeedback()}
                      onOpenVerify={() => handleOpenVerify()}
                    />
                  )}
                </div>
              </div>

              {/* Right Column (3.5 cols): Action Center & Real-Time Operations Panel */}
              <div className="lg:col-span-4 space-y-5">
                {/* 1. Fast Action Shortcuts Card */}
                <div className="bg-white rounded-2xl p-5 border border-slate-200/90 shadow-sm space-y-3">
                  <span className="text-xs font-bold text-slate-900 uppercase tracking-wide block">
                    Workflow Actions
                  </span>

                  <button
                    onClick={() => setActiveTab('feedback_form')}
                    className="w-full p-3 rounded-xl border border-slate-200 hover:border-slate-300 bg-slate-50/60 hover:bg-slate-100/80 text-left transition flex items-center justify-between group"
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                        <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                      </div>
                      <div>
                        <div className="text-xs font-bold text-slate-800">Synthesize AI Survey</div>
                        <div className="text-[10px] text-slate-400">Generate questions with Gemma 4</div>
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-slate-400 group-hover:translate-x-0.5 transition-transform" />
                  </button>

                  <button
                    onClick={() => setActiveTab('emails')}
                    className="w-full p-3 rounded-xl border border-slate-200 hover:border-slate-300 bg-slate-50/60 hover:bg-slate-100/80 text-left transition flex items-center justify-between group"
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center shrink-0">
                        <Send className="w-3.5 h-3.5" />
                      </div>
                      <div>
                        <div className="text-xs font-bold text-slate-800">Dispatch Invitations</div>
                        <div className="text-[10px] text-slate-400">Email unique tokens to attendees</div>
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-slate-400 group-hover:translate-x-0.5 transition-transform" />
                  </button>

                  <button
                    onClick={() => setActiveTab('certificates')}
                    className="w-full p-3 rounded-xl border border-slate-200 hover:border-slate-300 bg-slate-50/60 hover:bg-slate-100/80 text-left transition flex items-center justify-between group"
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
                        <Award className="w-3.5 h-3.5" />
                      </div>
                      <div>
                        <div className="text-xs font-bold text-slate-800">Render Certificates</div>
                        <div className="text-[10px] text-slate-400">Batch vector PDF with QR code</div>
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-slate-400 group-hover:translate-x-0.5 transition-transform" />
                  </button>
                </div>

                {/* 2. Quick Attendee Experience Sandbox */}
                <div className="bg-white rounded-2xl p-5 border border-slate-200/90 shadow-sm space-y-3">
                  <span className="text-xs font-bold text-slate-900 uppercase tracking-wide block">
                    Participant Sandbox
                  </span>
                  <p className="text-[11px] text-slate-500 leading-relaxed">
                    Test the exact participant submission flow and cryptographic certificate verification portal.
                  </p>

                  <div className="space-y-2 pt-1">
                    <button
                      onClick={() => handleOpenTestFeedback()}
                      className="w-full py-2.5 px-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition shadow-xs"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      Test Attendee Survey Form
                    </button>

                    <button
                      onClick={() => handleOpenVerify()}
                      className="w-full py-2.5 px-3 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 text-slate-800 font-semibold text-xs flex items-center justify-center gap-1.5 transition shadow-xs"
                    >
                      <QrCode className="w-3.5 h-3.5 text-indigo-600" />
                      Test Public Verification Portal
                    </button>
                  </div>
                </div>

                {/* 3. Post-Event Closure Progress Checklist */}
                <div className="bg-white rounded-2xl p-5 border border-slate-200/90 shadow-sm space-y-3">
                  <span className="text-xs font-bold text-slate-900 uppercase tracking-wide block">
                    Closure Progress
                  </span>
                  <div className="space-y-2 text-xs">
                    <div className="flex items-center justify-between text-slate-700">
                      <span className="flex items-center gap-2">
                        <span className={`w-2 h-2 rounded-full ${participants.length > 0 ? 'bg-emerald-500' : 'bg-slate-300'}`} />
                        Roster Ingestion
                      </span>
                      <span className="text-[11px] font-semibold text-slate-500">{participants.length} added</span>
                    </div>
                    <div className="flex items-center justify-between text-slate-700">
                      <span className="flex items-center gap-2">
                        <span className={`w-2 h-2 rounded-full ${selectedEvent.feedback_submitted_count > 0 ? 'bg-emerald-500' : 'bg-slate-300'}`} />
                        Feedback Collection
                      </span>
                      <span className="text-[11px] font-semibold text-slate-500">{selectedEvent.feedback_submitted_count} submitted</span>
                    </div>
                    <div className="flex items-center justify-between text-slate-700">
                      <span className="flex items-center gap-2">
                        <span className={`w-2 h-2 rounded-full ${selectedEvent.certificates_generated_count > 0 ? 'bg-emerald-500' : 'bg-slate-300'}`} />
                        Certificate Issuance
                      </span>
                      <span className="text-[11px] font-semibold text-slate-500">{selectedEvent.certificates_generated_count} ready</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200/80 bg-white py-6 mt-12 text-center text-xs text-slate-400">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div>
            <span className="font-semibold text-slate-700">EventFlow AI</span> — From the last session to the final certificate, automated.
          </div>
          <div className="flex items-center gap-4 text-[11px]">
            <span>MIT Open Source</span>
            <span>Powered by Gemma 4 &amp; Gemini API</span>
            <span>FastAPI &amp; React</span>
          </div>
        </div>
      </footer>

      {/* Modals */}
      {isSettingsOpen && (
        <SettingsModal
          settings={settings}
          onClose={() => setIsSettingsOpen(false)}
          onRefreshSettings={loadInitialData}
        />
      )}

      {isCreateOpen && (
        <CreateEventModal
          onClose={() => setIsCreateOpen(false)}
          onEventCreated={(ev) => {
            setEvents([ev, ...events]);
            setSelectedEvent(ev);
          }}
        />
      )}

      {previewEmailLog && (
        <EmailPreviewModal
          log={previewEmailLog}
          onClose={() => setPreviewEmailLog(null)}
        />
      )}
    </div>
  );
}
export default App;
