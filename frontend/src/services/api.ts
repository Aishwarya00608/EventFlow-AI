// API client for EventFlow AI

export interface EventItem {
  id: string;
  title: string;
  subtitle: string;
  event_type: string;
  organization: string;
  date: string;
  location: string;
  description: string;
  tracks: string[];
  speakers: string[];
  certificate_template_id: string;
  custom_template_path?: string;
  signature_name: string;
  signature_title: string;
  certificate_title: string;
  certificate_issue_date: string;
  require_feedback_for_cert: boolean;
  status: string;
  created_at: string;
  updated_at: string;
  total_participants: number;
  feedback_sent_count: number;
  feedback_submitted_count: number;
  certificates_generated_count: number;
  certificates_emailed_count: number;
  average_rating: number | null;
  nps_score: number | null;
}

export interface ParticipantItem {
  id: string;
  event_id: string;
  name: string;
  email: string;
  role: string;
  organization: string;
  feedback_token: string;
  feedback_status: 'Not Sent' | 'Sent' | 'Submitted';
  feedback_submitted_at: string | null;
  certificate_id: string;
  certificate_status: 'Pending' | 'Generated' | 'Emailed';
  certificate_file_path: string | null;
  certificate_emailed_at: string | null;
  created_at: string;
}

export interface QuestionItem {
  id: string;
  prompt: string;
  type: 'rating' | 'nps' | 'choice' | 'text' | 'boolean';
  options?: string[] | null;
  required: boolean;
  category?: string;
}

export interface FeedbackFormData {
  id: string;
  event_id: string;
  title: string;
  description: string;
  questions: QuestionItem[];
  is_published: boolean;
}

export interface AIAnalysisData {
  id: string;
  event_id: string;
  executive_summary: string;
  sentiment_positive: number;
  sentiment_neutral: number;
  sentiment_negative: number;
  nps_score: number;
  key_highlights: string[];
  critical_improvements: string[];
  actionable_recommendations: string[];
  track_feedback_breakdown: Record<string, number>;
  model_used: string;
  analyzed_at: string;
}

export interface EmailLogItem {
  id: string;
  event_id: string;
  participant_id: string | null;
  recipient_email: string;
  recipient_name: string;
  email_type: string;
  subject: string;
  status: 'delivered' | 'simulated_sent' | 'failed';
  error_message: string | null;
  html_preview: string;
  sent_at: string;
}

export interface SystemSettings {
  gemini_api_key_configured: boolean;
  gemma_model_id: string;
  resend_api_key_configured: boolean;
  resend_from_email: string;
  simulation_mode: boolean;
  frontend_url: string;
}

export interface CertificateVerifyData {
  valid: boolean;
  certificate_id: string;
  participant_name: string;
  event_title: string;
  event_organization: string;
  event_date: string;
  role: string;
  issue_date: string;
  certificate_title: string;
  download_url?: string;
  verification_hash?: string;
}

const API_BASE = '/api';

export const api = {
  // Events
  async getEvents(): Promise<EventItem[]> {
    const res = await fetch(`${API_BASE}/events`);
    if (!res.ok) throw new Error('Failed to fetch events');
    return res.json();
  },

  async getEvent(id: string): Promise<EventItem> {
    const res = await fetch(`${API_BASE}/events/${id}`);
    if (!res.ok) throw new Error('Failed to fetch event');
    return res.json();
  },

  async createEvent(data: Partial<EventItem>): Promise<EventItem> {
    const res = await fetch(`${API_BASE}/events`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error('Failed to create event');
    return res.json();
  },

  async updateEvent(id: string, data: Partial<EventItem>): Promise<EventItem> {
    const res = await fetch(`${API_BASE}/events/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error('Failed to update event');
    return res.json();
  },

  async deleteEvent(id: string): Promise<void> {
    const res = await fetch(`${API_BASE}/events/${id}`, { method: 'DELETE' });
    if (!res.ok) throw new Error('Failed to delete event');
  },

  async seedSampleParticipants(eventId: string): Promise<{ message: string }> {
    const res = await fetch(`${API_BASE}/events/${eventId}/seed-sample-participants`, { method: 'POST' });
    if (!res.ok) throw new Error('Failed to load sample participants');
    return res.json();
  },

  // Participants
  async getParticipants(eventId: string, search?: string, feedbackStatus?: string, certStatus?: string): Promise<ParticipantItem[]> {
    const params = new URLSearchParams();
    if (search) params.append('search', search);
    if (feedbackStatus) params.append('feedback_status', feedbackStatus);
    if (certStatus) params.append('cert_status', certStatus);
    const res = await fetch(`${API_BASE}/events/${eventId}/participants?${params.toString()}`);
    if (!res.ok) throw new Error('Failed to fetch participants');
    return res.json();
  },

  async addParticipant(eventId: string, data: { name: string; email: string; role: string; organization: string }): Promise<ParticipantItem> {
    const res = await fetch(`${API_BASE}/events/${eventId}/participants`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || 'Failed to add participant');
    }
    return res.json();
  },

  async uploadCSV(eventId: string, file: File): Promise<{ success: boolean; created_count: number; message: string }> {
    const formData = new FormData();
    formData.append('file', file);
    const res = await fetch(`${API_BASE}/events/${eventId}/participants/upload-csv`, {
      method: 'POST',
      body: formData,
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || 'Failed to upload CSV');
    }
    return res.json();
  },

  async deleteParticipant(id: string): Promise<void> {
    const res = await fetch(`${API_BASE}/participants/${id}`, { method: 'DELETE' });
    if (!res.ok) throw new Error('Failed to delete participant');
  },

  // Feedback Form
  async getFeedbackForm(eventId: string): Promise<FeedbackFormData> {
    const res = await fetch(`${API_BASE}/events/${eventId}/feedback-form`);
    if (!res.ok) throw new Error('Failed to fetch feedback form');
    return res.json();
  },

  async updateFeedbackForm(eventId: string, data: Partial<FeedbackFormData>): Promise<FeedbackFormData> {
    const res = await fetch(`${API_BASE}/events/${eventId}/feedback-form`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error('Failed to update feedback form');
    return res.json();
  },

  async generateAIQuestions(eventId: string, customFocus?: string, count: number = 5): Promise<FeedbackFormData> {
    const res = await fetch(`${API_BASE}/events/${eventId}/feedback-form/generate-ai`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ event_id: eventId, custom_focus: customFocus, target_question_count: count }),
    });
    if (!res.ok) throw new Error('Failed to generate questions with Gemma');
    return res.json();
  },

  // Public Feedback
  async getPublicFeedback(token: string): Promise<any> {
    const res = await fetch(`${API_BASE}/public/feedback/${token}`);
    if (!res.ok) throw new Error('Invalid feedback token');
    return res.json();
  },

  async submitPublicFeedback(token: string, payload: { answers: Record<string, any>; nps_score?: number; overall_rating?: number; comments?: string }): Promise<any> {
    const res = await fetch(`${API_BASE}/public/feedback/${token}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error('Failed to submit feedback');
    return res.json();
  },

  // Certificates
  async generateAllCertificates(eventId: string, forceAll: boolean = false): Promise<any> {
    const res = await fetch(`${API_BASE}/events/${eventId}/certificates/generate-all?force_all=${forceAll}`, { method: 'POST' });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || 'Failed to generate certificates');
    }
    return res.json();
  },

  async generateSingleCertificate(participantId: string): Promise<any> {
    const res = await fetch(`${API_BASE}/participants/${participantId}/certificate/generate`, { method: 'POST' });
    if (!res.ok) throw new Error('Failed to generate certificate');
    return res.json();
  },

  async verifyCertificate(certId: string): Promise<CertificateVerifyData> {
    const res = await fetch(`${API_BASE}/public/verify/${certId}`);
    if (!res.ok) throw new Error('Certificate verification failed');
    return res.json();
  },

  // Emails
  async sendFeedbackInvitations(eventId: string, participantIds?: string[]): Promise<any> {
    const res = await fetch(`${API_BASE}/events/${eventId}/emails/send-feedback-invitations`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ participant_ids: participantIds }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || 'Failed to send invitations');
    }
    return res.json();
  },

  async sendCertificates(eventId: string, participantIds?: string[]): Promise<any> {
    const res = await fetch(`${API_BASE}/events/${eventId}/emails/send-certificates`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ participant_ids: participantIds }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.detail || 'Failed to send certificates');
    }
    return res.json();
  },

  async getEmailLogs(eventId: string): Promise<EmailLogItem[]> {
    const res = await fetch(`${API_BASE}/events/${eventId}/emails/logs`);
    if (!res.ok) throw new Error('Failed to fetch email logs');
    return res.json();
  },

  // Analytics
  async getAnalytics(eventId: string): Promise<AIAnalysisData> {
    const res = await fetch(`${API_BASE}/events/${eventId}/analytics`);
    if (!res.ok) throw new Error('Failed to fetch analytics');
    return res.json();
  },

  async regenerateAIAnalytics(eventId: string): Promise<AIAnalysisData> {
    const res = await fetch(`${API_BASE}/events/${eventId}/analytics/regenerate-ai`, { method: 'POST' });
    if (!res.ok) throw new Error('Failed to regenerate analytics');
    return res.json();
  },

  async getClosureReport(eventId: string): Promise<string> {
    const res = await fetch(`${API_BASE}/events/${eventId}/closure-report`);
    if (!res.ok) throw new Error('Failed to fetch closure report');
    return res.text();
  },

  // Settings
  async getSettings(): Promise<SystemSettings> {
    const res = await fetch(`${API_BASE}/settings`);
    if (!res.ok) throw new Error('Failed to fetch settings');
    return res.json();
  },

  async updateSettings(data: Partial<SystemSettings & { gemini_api_key?: string; resend_api_key?: string }>): Promise<SystemSettings> {
    const res = await fetch(`${API_BASE}/settings`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!res.ok) throw new Error('Failed to update settings');
    return res.json();
  },
};
