import {
  Appointment,
  AvailabilityBlockResponse,
  ChatMessage,
  ChatSession,
  ChatSessionDetail,
  DashboardKpis,
  DoctorProfile,
  DoctorThread,
  DoctorThreadDetail,
  PatientProfile,
  QrResponse,
  QrResolved,
  Review,
  ThreadMessage,
  TtsResponse,
  User,
} from "./types";

export class ApiError extends Error {
  status: number;
  data: unknown;

  constructor(status: number, message: string, data?: unknown) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.data = data;
  }
}

export async function api<T>(path: string, options: RequestInit = {}): Promise<T> {
  const url = `/api/proxy${path.startsWith("/") ? path : `/${path}`}`;
  const headers = new Headers(options.headers || {});
  if (!headers.has("Content-Type") && options.body && !(options.body instanceof FormData)) {
    headers.set("Content-Type", "application/json");
  }

  const res = await fetch(url, {
    ...options,
    headers,
  });

  if (res.status === 401) {
    if (typeof window !== "undefined" && !window.location.pathname.startsWith("/login")) {
      // eslint-disable-next-line @next/next/no-location-assign-relative-destination
      window.location.href = "/login";
    }
    throw new ApiError(401, "Unauthorized");
  }

  const contentType = res.headers.get("content-type") || "";
  const isJson = contentType.includes("application/json");
  const data = isJson ? await res.json().catch(() => null) : await res.text().catch(() => "");

  if (!res.ok) {
    const errorMsg =
      data && typeof data === "object" && "detail" in data
        ? String((data as { detail: unknown }).detail)
        : res.statusText || "Request failed";
    throw new ApiError(res.status, errorMsg, data);
  }

  return data as T;
}

// ── Auth Endpoints (Talks directly to /api/auth/*) ─────────────────────
export async function login(email: string, password: string): Promise<{ user: User }> {
  const res = await fetch("/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  const data = await res.json().catch(() => null);
  if (!res.ok) {
    throw new ApiError(
      res.status,
      data?.detail || "Invalid email or password",
      data
    );
  }
  return data;
}

export async function register(payload: {
  email: string;
  password: string;
  full_name: string;
  role?: string;
}): Promise<User> {
  const res = await fetch("/api/auth/register", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const data = await res.json().catch(() => null);
  if (!res.ok) {
    throw new ApiError(res.status, data?.detail || "Registration failed", data);
  }
  return data;
}

export async function getMe(): Promise<User> {
  const res = await fetch("/api/auth/me", {
    method: "GET",
  });
  if (!res.ok) {
    throw new ApiError(res.status, "Not authenticated");
  }
  return res.json();
}

export async function logout(): Promise<void> {
  await fetch("/api/auth/logout", { method: "POST" });
}

// ── Proxy Endpoints (Call FastAPI via /api/proxy/*) ───────────────────
export const getPatientMe = () => api<PatientProfile>("/patients/me");

export const updatePatientMe = (payload: {
  full_name?: string;
  phone?: string;
  date_of_birth?: string;
  address?: string;
}) =>
  api<PatientProfile>("/patients/me", {
    method: "PATCH",
    body: JSON.stringify(payload),
  });

export const getPatients = () => api<PatientProfile[]>("/patients");

export const getPatientById = (id: number) =>
  api<PatientProfile>(`/patients/${id}`);

export const getDoctors = () => api<DoctorProfile[]>("/doctors");

export const getDoctorById = (id: number) =>
  api<DoctorProfile>(`/doctors/${id}`);

export const bookAppointment = (payload: {
  doctor_id: number;
  scheduled_at: string;
  duration_minutes?: number;
  notes?: string;
}) =>
  api<Appointment>("/appointments", {
    method: "POST",
    body: JSON.stringify(payload),
  });

export const getMyAppointments = () => api<Appointment[]>("/appointments/me");

export const getAllAppointments = () => api<Appointment[]>("/appointments");

export const getAppointmentById = (id: number) =>
  api<Appointment>(`/appointments/${id}`);

export const cancelAppointment = (id: number) =>
  api<Appointment>(`/appointments/${id}/cancel`, { method: "PATCH" });

export const rescheduleAppointment = (id: number, scheduled_at: string) =>
  api<Appointment>(`/appointments/${id}/reschedule`, {
    method: "PATCH",
    body: JSON.stringify({ scheduled_at }),
  });

export const createAvailabilityBlock = (payload: {
  start_time: string;
  end_time: string;
  reason?: string;
}) =>
  api<AvailabilityBlockResponse>("/appointments/availability-blocks", {
    method: "POST",
    body: JSON.stringify(payload),
  });

export async function createOrResumeChatSession(
  forceNew = false
): Promise<ChatSession> {
  const qs = forceNew ? "?force_new=true" : "";
  return api<ChatSession>(`/chat/sessions${qs}`, { method: "POST" });
}

export const getMyChatSessions = () => api<ChatSession[]>("/chat/sessions/me");

export const getChatSession = (id: number) =>
  api<ChatSessionDetail>(`/chat/sessions/${id}`);

export const sendChatMessage = (
  sessionId: number,
  payload: { content: string; is_voice?: boolean }
) =>
  api<ChatMessage>(`/chat/sessions/${sessionId}/messages`, {
    method: "POST",
    body: JSON.stringify(payload),
  });

export const closeChatSession = (sessionId: number) =>
  api<ChatSession>(`/chat/sessions/${sessionId}/close`, { method: "POST" });

export const requestHandoff = (payload: {
  doctor_id: number;
  appointment_id?: number | null;
  session_id?: number | null;
}) =>
  api<DoctorThread>("/threads/handoff", {
    method: "POST",
    body: JSON.stringify(payload),
  });

export const getMyThreads = () => api<DoctorThread[]>("/threads/me");

export const getThreads = () => api<DoctorThread[]>("/threads");

export const getThread = (id: number) =>
  api<DoctorThreadDetail>(`/threads/${id}`);

export const sendThreadMessage = (id: number, content: string) =>
  api<ThreadMessage>(`/threads/${id}/messages`, {
    method: "POST",
    body: JSON.stringify({ content }),
  });

export const getPendingReviews = () => api<ChatSession[]>("/reviews/pending");

export const submitReview = (payload: {
  session_id?: number | null;
  issue_solved?: boolean | null;
  rating?: number | null;
  comment?: string | null;
}) =>
  api<Review>("/reviews", {
    method: "POST",
    body: JSON.stringify(payload),
  });

export const getMyQr = () => api<QrResponse>("/qr/me");

export const revokeMyQr = () =>
  api<void>("/qr/me/revoke", { method: "POST" });

export const resolveQr = (token: string) =>
  api<QrResolved>("/qr/resolve", {
    method: "POST",
    body: JSON.stringify({ token }),
  });

export const textToSpeech = (text: string) =>
  api<TtsResponse>("/voice/tts", {
    method: "POST",
    body: JSON.stringify({ text }),
  });

export const getDashboardKpis = () => api<DashboardKpis>("/dashboard/kpis");
