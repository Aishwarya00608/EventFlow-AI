import React, { useState } from 'react';
import {
  Calendar,
  MapPin,
  Building,
  Tag,
  Users,
  Award,
  Edit,
  CheckCircle2,
  Share2,
  ExternalLink
} from 'lucide-react';
import { EventItem, api } from '../services/api';

interface EventOverviewTabProps {
  event: EventItem;
  onRefresh: () => void;
  onOpenTestFeedback: () => void;
  onOpenVerify: () => void;
}

export const EventOverviewTab: React.FC<EventOverviewTabProps> = ({
  event,
  onRefresh,
  onOpenTestFeedback,
  onOpenVerify,
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [title, setTitle] = useState(event.title);
  const [subtitle, setSubtitle] = useState(event.subtitle);
  const [eventType, setEventType] = useState(event.event_type);
  const [organization, setOrganization] = useState(event.organization);
  const [date, setDate] = useState(event.date);
  const [location, setLocation] = useState(event.location);
  const [description, setDescription] = useState(event.description);
  const [tracksStr, setTracksStr] = useState((event.tracks || []).join(', '));
  const [speakersStr, setSpeakersStr] = useState((event.speakers || []).join(', '));
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      await api.updateEvent(event.id, {
        title,
        subtitle,
        event_type: eventType,
        organization,
        date,
        location,
        description,
        tracks: tracksStr.split(',').map((s) => s.trim()).filter(Boolean),
        speakers: speakersStr.split(',').map((s) => s.trim()).filter(Boolean),
      });
      setIsEditing(false);
      onRefresh();
    } catch (err: any) {
      alert(err.message || 'Failed to update event');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Event Header Banner */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200/90 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider bg-slate-900 text-white">
              {event.event_type}
            </span>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
              {event.status}
            </span>
          </div>
          <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight">{event.title}</h2>
          {event.subtitle && <p className="text-sm text-slate-500 mt-0.5">{event.subtitle}</p>}
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsEditing(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-xl bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 shadow-sm transition"
          >
            <Edit className="w-3.5 h-3.5" /> Edit Details
          </button>
        </div>
      </div>

      {/* Main Metadata Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Info Column 1: Schedule & Venue */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200/90 shadow-sm space-y-4">
          <span className="text-xs font-bold text-slate-900 uppercase tracking-wide block">
            Schedule &amp; Logistics
          </span>
          <div className="space-y-3 text-xs">
            <div className="flex items-start gap-2.5">
              <Calendar className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
              <div>
                <div className="font-semibold text-slate-800">Event Date</div>
                <div className="text-slate-500">{event.date || 'Not specified'}</div>
              </div>
            </div>

            <div className="flex items-start gap-2.5">
              <MapPin className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
              <div>
                <div className="font-semibold text-slate-800">Location / Platform</div>
                <div className="text-slate-500">{event.location || 'Virtual'}</div>
              </div>
            </div>

            <div className="flex items-start gap-2.5">
              <Building className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
              <div>
                <div className="font-semibold text-slate-800">Host Organization</div>
                <div className="text-slate-500">{event.organization}</div>
              </div>
            </div>
          </div>
        </div>

        {/* Info Column 2: Tracks & Challenges */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200/90 shadow-sm space-y-4">
          <span className="text-xs font-bold text-slate-900 uppercase tracking-wide block">
            Tracks &amp; Themes ({event.tracks?.length || 0})
          </span>
          <div className="flex flex-wrap gap-1.5">
            {event.tracks && event.tracks.length > 0 ? (
              event.tracks.map((t, idx) => (
                <span
                  key={idx}
                  className="px-2.5 py-1 rounded-lg text-xs font-medium bg-slate-50 border border-slate-200 text-slate-700"
                >
                  {t}
                </span>
              ))
            ) : (
              <span className="text-xs text-slate-400">No tracks specified.</span>
            )}
          </div>
        </div>

        {/* Info Column 3: Speakers & Mentors */}
        <div className="bg-white rounded-2xl p-5 border border-slate-200/90 shadow-sm space-y-4">
          <span className="text-xs font-bold text-slate-900 uppercase tracking-wide block">
            Distinguished Speakers &amp; Mentors
          </span>
          <ul className="space-y-1.5 text-xs text-slate-600">
            {event.speakers && event.speakers.length > 0 ? (
              event.speakers.map((s, idx) => (
                <li key={idx} className="flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-indigo-500" />
                  <span>{s}</span>
                </li>
              ))
            ) : (
              <span className="text-xs text-slate-400">No speakers specified.</span>
            )}
          </ul>
        </div>
      </div>

      {/* Description */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200/90 shadow-sm">
        <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wide mb-2">Event Scope &amp; Objectives</h4>
        <p className="text-xs sm:text-sm text-slate-600 leading-relaxed whitespace-pre-line">
          {event.description || 'No description provided.'}
        </p>
      </div>

      {/* Edit Modal */}
      {isEditing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl max-w-xl w-full p-6 shadow-xl border border-slate-200 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-slate-900">Edit Event Details</h3>
              <button onClick={() => setIsEditing(false)} className="text-slate-400 hover:text-slate-600 text-sm font-semibold">
                ✕
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Event Title</label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full px-3.5 py-2 text-sm bg-white border border-slate-200 rounded-xl focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Subtitle / Tagline</label>
                <input
                  type="text"
                  value={subtitle}
                  onChange={(e) => setSubtitle(e.target.value)}
                  className="w-full px-3.5 py-2 text-sm bg-white border border-slate-200 rounded-xl focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Event Type</label>
                  <select
                    value={eventType}
                    onChange={(e) => setEventType(e.target.value)}
                    className="w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-xl focus:outline-none"
                  >
                    <option value="Hackathon">Hackathon</option>
                    <option value="Conference">Conference</option>
                    <option value="Workshop">Workshop</option>
                    <option value="Meetup">Meetup</option>
                    <option value="Webinar">Webinar</option>
                    <option value="College Fest">College Fest</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Organization</label>
                  <input
                    type="text"
                    value={organization}
                    onChange={(e) => setOrganization(e.target.value)}
                    className="w-full px-3.5 py-2 text-sm bg-white border border-slate-200 rounded-xl focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Date</label>
                  <input
                    type="text"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="w-full px-3.5 py-2 text-sm bg-white border border-slate-200 rounded-xl focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Location</label>
                  <input
                    type="text"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    className="w-full px-3.5 py-2 text-sm bg-white border border-slate-200 rounded-xl focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Description</label>
                <textarea
                  rows={3}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full px-3.5 py-2 text-sm bg-white border border-slate-200 rounded-xl focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Tracks (comma separated)</label>
                <input
                  type="text"
                  value={tracksStr}
                  onChange={(e) => setTracksStr(e.target.value)}
                  className="w-full px-3.5 py-2 text-sm bg-white border border-slate-200 rounded-xl focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Speakers (comma separated)</label>
                <input
                  type="text"
                  value={speakersStr}
                  onChange={(e) => setSpeakersStr(e.target.value)}
                  className="w-full px-3.5 py-2 text-sm bg-white border border-slate-200 rounded-xl focus:outline-none"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsEditing(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-5 py-2 text-xs font-semibold bg-slate-900 text-white rounded-xl hover:bg-slate-800 transition"
                >
                  {isSaving ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
