import React, { useState } from 'react';
import {
  Search,
  Upload,
  UserPlus,
  FileSpreadsheet,
  Copy,
  ExternalLink,
  Award,
  Trash2,
  CheckCircle2,
  Clock,
  Sparkles,
  Download,
  AlertCircle
} from 'lucide-react';
import { ParticipantItem, EventItem, api } from '../services/api';

interface ParticipantsTabProps {
  event: EventItem;
  participants: ParticipantItem[];
  onRefresh: () => void;
  onOpenTestFeedback: (token: string) => void;
  onOpenVerify: (certId: string) => void;
}

export const ParticipantsTab: React.FC<ParticipantsTabProps> = ({
  event,
  participants,
  onRefresh,
  onOpenTestFeedback,
  onOpenVerify,
}) => {
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState('All');
  const [isUploading, setIsUploading] = useState(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [copiedToken, setCopiedToken] = useState<string | null>(null);

  // New Participant Form State
  const [newName, setNewName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newRole, setNewRole] = useState('Attendee');
  const [newOrg, setNewOrg] = useState('');
  const [formError, setFormError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Filter logic
  const filtered = participants.filter((p) => {
    const matchesSearch =
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.email.toLowerCase().includes(search.toLowerCase()) ||
      p.organization.toLowerCase().includes(search.toLowerCase()) ||
      p.certificate_id.toLowerCase().includes(search.toLowerCase());

    const matchesRole = roleFilter === 'All' || p.role.toLowerCase() === roleFilter.toLowerCase();
    const matchesStatus =
      statusFilter === 'All' ||
      (statusFilter === 'Submitted' && p.feedback_status === 'Submitted') ||
      (statusFilter === 'Sent' && p.feedback_status === 'Sent') ||
      (statusFilter === 'Generated' && p.certificate_status === 'Generated');

    return matchesSearch && matchesRole && matchesStatus;
  });

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedToken(id);
    setTimeout(() => setCopiedToken(null), 2000);
  };

  const handleAddParticipant = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim() || !newEmail.trim()) {
      setFormError('Name and email are required');
      return;
    }
    setIsSubmitting(true);
    setFormError('');
    try {
      await api.addParticipant(event.id, {
        name: newName.trim(),
        email: newEmail.trim(),
        role: newRole,
        organization: newOrg.trim(),
      });
      setIsAddModalOpen(false);
      setNewName('');
      setNewEmail('');
      setNewOrg('');
      onRefresh();
    } catch (err: any) {
      setFormError(err.message || 'Failed to add participant');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploading(true);
    try {
      const res = await api.uploadCSV(event.id, file);
      alert(res.message);
      setIsUploadModalOpen(false);
      onRefresh();
    } catch (err: any) {
      alert(err.message || 'Error uploading CSV');
    } finally {
      setIsUploading(false);
      e.target.value = '';
    }
  };

  const handleSeedSample = async () => {
    try {
      const res = await api.seedSampleParticipants(event.id);
      alert(res.message);
      onRefresh();
    } catch (err: any) {
      alert(err.message || 'Failed to seed sample roster');
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to remove this participant?')) {
      try {
        await api.deleteParticipant(id);
        onRefresh();
      } catch (err: any) {
        alert(err.message);
      }
    }
  };

  const handleGenerateSingle = async (id: string) => {
    try {
      await api.generateSingleCertificate(id);
      onRefresh();
    } catch (err: any) {
      alert(err.message);
    }
  };

  return (
    <div className="space-y-5">
      {/* Top Controls: Search, Filters & Action Buttons */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        {/* Search */}
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by name, email, college, or cert code..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 text-sm bg-white border border-slate-200/90 rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-400 shadow-sm"
          />
        </div>

        {/* Buttons */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={handleSeedSample}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-xl bg-amber-50 text-amber-800 border border-amber-200 hover:bg-amber-100 transition shadow-sm"
            title="Populate 12 realistic participants for testing"
          >
            <Sparkles className="w-3.5 h-3.5" />
            Load Sample Roster
          </button>
          <button
            onClick={() => setIsUploadModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-xl bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 shadow-sm transition"
          >
            <Upload className="w-3.5 h-3.5 text-slate-500" />
            Upload CSV
          </button>
          <button
            onClick={() => setIsAddModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-xl bg-slate-900 text-white hover:bg-slate-800 shadow-sm transition"
          >
            <UserPlus className="w-3.5 h-3.5" />
            Add Participant
          </button>
        </div>
      </div>

      {/* Role & Status Pill Filters */}
      <div className="flex items-center justify-between flex-wrap gap-2 text-xs">
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-slate-400 font-medium mr-1">Role:</span>
          {['All', 'Hacker', 'Attendee', 'Winner', 'Mentor', 'Speaker'].map((r) => (
            <button
              key={r}
              onClick={() => setRoleFilter(r)}
              className={`px-2.5 py-1 rounded-lg font-medium transition ${
                roleFilter === r
                  ? 'bg-slate-900 text-white'
                  : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
              }`}
            >
              {r}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-1.5">
          <span className="text-slate-400 font-medium mr-1">Status:</span>
          {['All', 'Submitted', 'Sent', 'Generated'].map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`px-2.5 py-1 rounded-lg font-medium transition ${
                statusFilter === s
                  ? 'bg-slate-900 text-white'
                  : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
              }`}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {/* Participants Table */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-100 bg-[#fafaf9]/80 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                <th className="py-3.5 px-4">Participant</th>
                <th className="py-3.5 px-4">Role &amp; Org</th>
                <th className="py-3.5 px-4">Feedback Status</th>
                <th className="py-3.5 px-4">Certificate ID &amp; Status</th>
                <th className="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-slate-400 text-sm">
                    No participants found matching your filters.
                  </td>
                </tr>
              ) : (
                filtered.map((p) => {
                  const feedbackUrl = `${window.location.origin}/?view=feedback&token=${p.feedback_token}`;
                  return (
                    <tr key={p.id} className="hover:bg-slate-50/70 transition-colors">
                      {/* Name & Email */}
                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-slate-900">{p.name}</div>
                        <div className="text-xs text-slate-500">{p.email}</div>
                      </td>

                      {/* Role & Org */}
                      <td className="py-3.5 px-4">
                        <span
                          className={`inline-block px-2 py-0.5 rounded-full text-xs font-semibold mb-1 ${
                            p.role.toLowerCase() === 'winner'
                              ? 'bg-amber-100 text-amber-800 border border-amber-200'
                              : p.role.toLowerCase() === 'mentor'
                              ? 'bg-purple-100 text-purple-800'
                              : p.role.toLowerCase() === 'speaker'
                              ? 'bg-indigo-100 text-indigo-800'
                              : 'bg-slate-100 text-slate-700'
                          }`}
                        >
                          {p.role}
                        </span>
                        <div className="text-xs text-slate-500">{p.organization || '—'}</div>
                      </td>

                      {/* Feedback Status & Links */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-2">
                          <span
                            className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                              p.feedback_status === 'Submitted'
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                : p.feedback_status === 'Sent'
                                ? 'bg-blue-50 text-blue-700 border border-blue-200'
                                : 'bg-slate-100 text-slate-600'
                            }`}
                          >
                            {p.feedback_status === 'Submitted' && <CheckCircle2 className="w-3 h-3" />}
                            {p.feedback_status === 'Sent' && <Clock className="w-3 h-3" />}
                            {p.feedback_status}
                          </span>

                          {/* Quick test/copy buttons for feedback */}
                          {p.feedback_status !== 'Submitted' && (
                            <div className="flex items-center gap-1">
                              <button
                                onClick={() => handleCopy(feedbackUrl, p.id)}
                                className="p-1 rounded text-slate-400 hover:text-slate-700 hover:bg-slate-100"
                                title="Copy unique feedback link"
                              >
                                {copiedToken === p.id ? (
                                  <span className="text-[10px] text-emerald-600 font-semibold">Copied!</span>
                                ) : (
                                  <Copy className="w-3.5 h-3.5" />
                                )}
                              </button>
                              <button
                                onClick={() => onOpenTestFeedback(p.feedback_token)}
                                className="p-1 rounded text-slate-400 hover:text-blue-600 hover:bg-blue-50"
                                title="Open attendee feedback form"
                              >
                                <ExternalLink className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          )}
                        </div>
                      </td>

                      {/* Certificate Status & Code */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-2 mb-1">
                          <code className="text-xs font-mono font-bold text-slate-800 bg-slate-100 px-1.5 py-0.5 rounded">
                            {p.certificate_id}
                          </code>
                          <button
                            onClick={() => onOpenVerify(p.certificate_id)}
                            className="p-1 rounded text-slate-400 hover:text-indigo-600 hover:bg-indigo-50"
                            title="Open public verification page"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                          </button>
                        </div>
                        <div className="flex items-center gap-2">
                          <span
                            className={`inline-block text-[11px] font-medium px-2 py-0.2 rounded-full ${
                              p.certificate_status === 'Generated' || p.certificate_status === 'Emailed'
                                ? 'text-indigo-700 bg-indigo-50'
                                : 'text-slate-400'
                            }`}
                          >
                            {p.certificate_status}
                          </span>
                          {p.certificate_file_path && (
                            <a
                              href={`/static/certificates/${p.certificate_id}.pdf`}
                              target="_blank"
                              rel="noreferrer"
                              className="text-xs text-blue-600 hover:underline flex items-center gap-0.5"
                            >
                              <Download className="w-3 h-3" /> PDF
                            </a>
                          )}
                        </div>
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => handleGenerateSingle(p.id)}
                            className="p-1.5 rounded-lg text-slate-600 hover:text-indigo-600 hover:bg-indigo-50 transition"
                            title="Generate / Re-render certificate PDF"
                          >
                            <Award className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(p.id)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition"
                            title="Delete participant"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* CSV Upload Modal */}
      {isUploadModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-xl border border-slate-200">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-slate-900">Upload Participant Roster</h3>
              <button
                onClick={() => setIsUploadModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 text-sm font-semibold"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-slate-500 mb-4">
              Upload a CSV file containing participant records. Column headers are auto-detected (Name, Email, Role, Organization).
            </p>

            <div className="border-2 border-dashed border-slate-200 rounded-xl p-8 text-center hover:border-slate-400 transition cursor-pointer relative bg-slate-50/50">
              <FileSpreadsheet className="w-10 h-10 text-slate-400 mx-auto mb-2" />
              <div className="text-sm font-semibold text-slate-700">Click to choose CSV file</div>
              <div className="text-xs text-slate-400 mt-1">.csv files up to 10MB</div>
              <input
                type="file"
                accept=".csv"
                onChange={handleFileUpload}
                disabled={isUploading}
                className="absolute inset-0 opacity-0 cursor-pointer"
              />
            </div>

            <div className="mt-4 p-3 bg-slate-50 rounded-xl border border-slate-100 flex items-center justify-between text-xs text-slate-600">
              <span>Need a sample template?</span>
              <a
                href="/sample_data/sample_hackathon_participants.csv"
                download="sample_participants.csv"
                className="font-semibold text-blue-600 hover:underline flex items-center gap-1"
              >
                <Download className="w-3 h-3" /> Download Sample CSV
              </a>
            </div>

            {isUploading && (
              <div className="mt-3 text-center text-xs font-semibold text-indigo-600 animate-pulse">
                Processing CSV and indexing participants...
              </div>
            )}
          </div>
        </div>
      )}

      {/* Add Participant Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-slate-200">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-slate-900">Add Participant</h3>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 text-sm font-semibold"
              >
                ✕
              </button>
            </div>

            {formError && (
              <div className="mb-4 p-2.5 bg-rose-50 text-rose-700 text-xs rounded-xl border border-rose-200 flex items-center gap-1.5">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleAddParticipant} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Full Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Maya Lin"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className="w-full px-3.5 py-2 text-sm bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-400"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Email Address</label>
                <input
                  type="email"
                  required
                  placeholder="maya.lin@example.com"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  className="w-full px-3.5 py-2 text-sm bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-400"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Role</label>
                  <select
                    value={newRole}
                    onChange={(e) => setNewRole(e.target.value)}
                    className="w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-xl focus:outline-none"
                  >
                    <option value="Hacker">Hacker</option>
                    <option value="Attendee">Attendee</option>
                    <option value="Winner">Winner</option>
                    <option value="Mentor">Mentor</option>
                    <option value="Speaker">Speaker</option>
                    <option value="Volunteer">Volunteer</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Organization / College</label>
                  <input
                    type="text"
                    placeholder="e.g. Stanford University"
                    value={newOrg}
                    onChange={(e) => setNewOrg(e.target.value)}
                    className="w-full px-3.5 py-2 text-sm bg-white border border-slate-200 rounded-xl focus:outline-none"
                  />
                </div>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 text-xs font-semibold bg-slate-900 text-white rounded-xl hover:bg-slate-800 transition"
                >
                  {isSubmitting ? 'Adding...' : 'Add Participant'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
