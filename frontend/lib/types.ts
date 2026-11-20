export type UserRole = "patient" | "doctor" | "assistant" | "admin";

export interface User {
  id: number;
  email: string;
  full_name: string;
  role: UserRole;
  is_active: boolean;
  created_at: string;
}

export interface PatientProfile {
  id: number;
  email: string;
  full_name: string;
  phone: string | null;
  date_of_birth: string | null;
  address: string | null;
  is_active: boolean;
  created_at: string;
}

export interface DoctorProfile {
  id: number;
  email: string;
  full_name: string;
  specialty: string | null;
  bio: string | null;
  working_hours: string | null;
  is_available: boolean;
  created_at: string;
}

export type AppointmentStatus =
  | "booked"
  | "rescheduled_pending"
  | "rescheduled"
  | "cancelled"
  | "completed";

export interface Appointment {
  id: number;
  patient_id: number;
  doctor_id: number;
  scheduled_at: string;
  duration_minutes: number;
  status: AppointmentStatus;
  notes: string | null;
  created_at: string;
}

export type ChatSessionStatus =
  | "active"
  | "handed_off"
  | "in_doctor_thread"
  | "closed";

export interface ChatSession {
  id: number;
  patient_id: number;
  status: ChatSessionStatus;
  created_at: string;
  updated_at: string;
}

export type MessageSender = "patient" | "bot" | "doctor" | "system";

export interface ChatMessage {
  id: number;
  session_id: number;
  sender: MessageSender;
  content: string;
  is_voice: boolean;
  created_at: string;
}

export interface ChatSessionDetail extends ChatSession {
  messages: ChatMessage[];
}

export type DoctorThreadStatus =
  | "open"
  | "waiting_for_doctor"
  | "waiting_for_patient"
  | "closed";

export interface DoctorThread {
  id: number;
  session_id: number;
  appointment_id: number | null;
  patient_id: number;
  doctor_id: number;
  summary_text: string | null;
  status: DoctorThreadStatus;
  created_at: string;
  updated_at: string;
}

export type ThreadSender = "patient" | "doctor";

export interface ThreadMessage {
  id: number;
  thread_id: number;
  sender: ThreadSender;
  content: string;
  created_at: string;
}

export interface DoctorThreadDetail extends DoctorThread {
  messages: ThreadMessage[];
  patient_name: string;
  doctor_name: string;
}

export interface Review {
  id: number;
  patient_id: number;
  session_id: number | null;
  issue_solved: boolean | null;
  rating: number | null;
  comment: string | null;
  created_at: string;
}

export interface QrResponse {
  token: string;
  image: string;
  message: string;
}

export interface QrResolved {
  patient_id: number;
  full_name: string;
  email: string;
  phone: string | null;
  next_appointment_at: string | null;
}

export interface PendingThreadItem {
  id: number;
  patient_name: string;
  summary_preview: string;
  created_at: string;
}

export interface DashboardKpis {
  kpis: {
    total_patients: {
      total: number;
      new_this_month: number;
    };
    appointments: {
      today: number;
      this_week: number;
      completion_rate_30d: number;
    };
    pending_threads: number;
    rating: {
      average: number;
      count: number;
      last_30d_average: number;
    };
  };
  pending_threads: PendingThreadItem[];
}

export interface TtsResponse {
  audio_base64: string;
  format: string;
  dev_stub: boolean;
}

export interface AvailabilityBlockResponse {
  id: number;
  doctor_id: number;
  start_time: string;
  end_time: string;
  reason: string | null;
  affected_appointment_ids: number[];
}


export interface NotificationItem {
  id: number;
  user_id: number;
  type: string;
  title: string;
  body: string;
  link_url: string | null;
  is_read: boolean;
  created_at: string;
}
