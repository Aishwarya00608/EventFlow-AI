import React, { useState } from 'react';
import { Plus, Calendar, MapPin, Building, Award, Sparkles } from 'lucide-react';
import { EventItem, api } from '../services/api';

interface CreateEventModalProps {
  onClose: () => void;
  onEventCreated: (event: EventItem) => void;
}

export const CreateEventModal: React.FC<CreateEventModalProps> = ({
  onClose,
  onEventCreated,
}) => {
  const [title, setTitle] = useState('');
  const [subtitle, setSubtitle] = useState('');
  const [eventType, setEventType] = useState('Hackathon');
  const [organization, setOrganization] = useState('');
  const [date, setDate] = useState('');
  const [location, setLocation] = useState('Virtual');
  const [description, setDescription] = useState('');
  const [tracksStr, setTracksStr] = useState('AI & Machine Learning, Open Source, Developer Tools');
  const [speakersStr, setSpeakersStr] = useState('');
  const [signerName, setSignerName] = useState('Dr. Sarah Chen');
  const [signerTitle, setSignerTitle] = useState('Lead Organizer & Director');
  const [certTitle, setCertTitle] = useState('Certificate of Participation');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      alert('Event title is required');
      return;
    }
    setIsSubmitting(true);
    try {
      const newEv = await api.createEvent({
        title: title.trim(),
        subtitle: subtitle.trim(),
        event_type: eventType,
        organization: organization.trim() || 'Tech Community',
        date: date.trim() || 'October 2026',
        location: location.trim() || 'Virtual',
        description: description.trim(),
        tracks: tracksStr.split(',').map((s) => s.trim()).filter(Boolean),
        speakers: speakersStr.split(',').map((s) => s.trim()).filter(Boolean),
        signature_name: signerName.trim(),
        signature_title: signerTitle.trim(),
        certificate_title: certTitle.trim(),
      });
      onEventCreated(newEv);
      onClose();
    } catch (err: any) {
      alert(err.message || 'Failed to create event');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div className="bg-white rounded-3xl max-w-xl w-full p-6 sm:p-8 shadow-2xl border border-slate-200 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-5">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-slate-900 text-white flex items-center justify-center">
              <Plus className="w-5 h-5 text-amber-300" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">Create New Event</h3>
              <p className="text-xs text-slate-500">Initialize post-event closure and AI survey pipeline.</p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700 text-sm font-semibold p-1">
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Event Title *</label>
            <input
              type="text"
              required
              placeholder="e.g. NextGen AI Hackathon 2026"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-3.5 py-2 text-sm bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-400"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Subtitle / Tagline</label>
            <input
              type="text"
              placeholder="e.g. 48-Hour Agentic Building Marathon"
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
              <label className="block text-xs font-semibold text-slate-700 mb-1">Host Organization</label>
              <input
                type="text"
                placeholder="e.g. Open Source Guild"
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
                placeholder="e.g. October 24-25, 2026"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full px-3.5 py-2 text-sm bg-white border border-slate-200 rounded-xl focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Location / Venue</label>
              <input
                type="text"
                placeholder="e.g. San Francisco & Discord"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                className="w-full px-3.5 py-2 text-sm bg-white border border-slate-200 rounded-xl focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Description</label>
            <textarea
              rows={2}
              placeholder="Brief summary of event goals, challenges, and audience..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-3.5 py-2 text-sm bg-white border border-slate-200 rounded-xl focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Competition Tracks / Themes (comma separated)</label>
            <input
              type="text"
              placeholder="AI Innovation, DigitalOcean Open-Source, DevTools"
              value={tracksStr}
              onChange={(e) => setTracksStr(e.target.value)}
              className="w-full px-3.5 py-2 text-sm bg-white border border-slate-200 rounded-xl focus:outline-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-3 pt-2 border-t border-slate-100">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Certificate Signer Name</label>
              <input
                type="text"
                value={signerName}
                onChange={(e) => setSignerName(e.target.value)}
                className="w-full px-3.5 py-2 text-sm bg-white border border-slate-200 rounded-xl focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Certificate Signer Title</label>
              <input
                type="text"
                value={signerTitle}
                onChange={(e) => setSignerTitle(e.target.value)}
                className="w-full px-3.5 py-2 text-sm bg-white border border-slate-200 rounded-xl focus:outline-none"
              />
            </div>
          </div>

          <div className="pt-3 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2 text-xs font-bold bg-slate-900 text-white rounded-xl hover:bg-slate-800 transition disabled:opacity-50"
            >
              {isSubmitting ? 'Creating Event...' : 'Create Event'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
