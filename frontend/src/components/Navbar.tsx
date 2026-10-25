import React from 'react';
import { Sparkles, Plus, Settings, ChevronDown, Calendar, Award } from 'lucide-react';
import { EventItem, SystemSettings } from '../services/api';

interface NavbarProps {
  events: EventItem[];
  selectedEvent: EventItem | null;
  onSelectEvent: (event: EventItem) => void;
  onOpenCreateModal: () => void;
  onOpenSettingsModal: () => void;
  settings: SystemSettings | null;
}

export const Navbar: React.FC<NavbarProps> = ({
  events,
  selectedEvent,
  onSelectEvent,
  onOpenCreateModal,
  onOpenSettingsModal,
  settings,
}) => {
  return (
    <header className="sticky top-0 z-30 bg-[#fbfbf9]/90 backdrop-blur-md border-b border-slate-200/80 px-4 sm:px-8 py-3.5 transition-all">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-3">
        {/* Brand & Tagline */}
        <div className="flex items-center gap-3.5 w-full md:w-auto justify-between md:justify-start">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-slate-900 text-white flex items-center justify-center shadow-sm ring-1 ring-slate-800">
              <Award className="w-5 h-5 text-amber-300" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-lg tracking-tight text-slate-900">EventFlow AI</span>
                <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200/60">
                  Gemma 4
                </span>
              </div>
              <p className="text-xs text-slate-500 font-normal hidden sm:block">
                From the last session to the final certificate — automated.
              </p>
            </div>
          </div>

          {/* Quick Mobile Controls */}
          <div className="flex items-center gap-2 md:hidden">
            <button
              onClick={onOpenSettingsModal}
              className="p-2 rounded-lg bg-white border border-slate-200 text-slate-600 hover:text-slate-900 shadow-sm"
              title="Settings"
            >
              <Settings className="w-4 h-4" />
            </button>
            <button
              onClick={onOpenCreateModal}
              className="p-2 rounded-lg bg-slate-900 text-white shadow-sm"
              title="New Event"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Center: Active Event Selector */}
        <div className="flex items-center gap-3 w-full md:w-auto">
          {events.length > 0 && selectedEvent && (
            <div className="relative group w-full md:w-auto">
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white border border-slate-200/90 shadow-sm hover:border-slate-300 transition-all cursor-pointer">
                <Calendar className="w-4 h-4 text-slate-400 shrink-0" />
                <select
                  value={selectedEvent.id}
                  onChange={(e) => {
                    const found = events.find((ev) => ev.id === e.target.value);
                    if (found) onSelectEvent(found);
                  }}
                  className="bg-transparent font-medium text-sm text-slate-800 focus:outline-none cursor-pointer pr-4 appearance-none"
                >
                  {events.map((ev) => (
                    <option key={ev.id} value={ev.id}>
                      {ev.title} ({ev.event_type})
                    </option>
                  ))}
                </select>
                <ChevronDown className="w-3.5 h-3.5 text-slate-400 pointer-events-none -ml-3" />
              </div>
            </div>
          )}

          <button
            onClick={onOpenCreateModal}
            className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-xl bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 hover:text-slate-900 shadow-sm transition"
          >
            <Plus className="w-3.5 h-3.5" />
            New Event
          </button>
        </div>

        {/* Right: AI & System Status, Settings */}
        <div className="hidden md:flex items-center gap-2.5">
          {/* Gemma 4 Pill */}
          <div
            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${
              settings?.gemini_api_key_configured
                ? 'bg-blue-50/70 text-blue-700 border-blue-200'
                : 'bg-amber-50/70 text-amber-700 border-amber-200'
            }`}
            title={
              settings?.gemini_api_key_configured
                ? `Using live model: ${settings.gemma_model_id}`
                : 'Using intelligent heuristic engine. Add Gemini API Key in Settings to connect live Gemma 4.'
            }
          >
            <Sparkles className="w-3 h-3 text-current" />
            <span>{settings?.gemini_api_key_configured ? 'Gemma 4 Live' : 'AI Offline/Local'}</span>
          </div>

          {/* Email Mode Pill */}
          <div
            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${
              !settings?.simulation_mode && settings?.resend_api_key_configured
                ? 'bg-emerald-50/70 text-emerald-700 border-emerald-200'
                : 'bg-purple-50/70 text-purple-700 border-purple-200'
            }`}
            title={
              !settings?.simulation_mode && settings?.resend_api_key_configured
                ? 'Emails delivered live via Resend'
                : 'Email Simulation Mode active: HTML preview and dispatch logs available'
            }
          >
            <span className="w-1.5 h-1.5 rounded-full bg-current animate-pulse" />
            <span>{!settings?.simulation_mode && settings?.resend_api_key_configured ? 'Resend Live' : 'Email Simulation'}</span>
          </div>

          {/* Settings Modal Trigger */}
          <button
            onClick={onOpenSettingsModal}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-xl bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 hover:text-slate-900 shadow-sm transition"
            title="Configure API Keys & Models"
          >
            <Settings className="w-3.5 h-3.5 text-slate-500" />
            <span>Settings</span>
          </button>
        </div>
      </div>
    </header>
  );
};
