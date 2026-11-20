"use client";

import React, { Suspense, useEffect, useRef, useState, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import { PatientNav } from "@/components/patient-nav";
import {
  createOrResumeChatSession,
  getMyChatSessions,
  getChatSession,
  sendChatMessage,
  closeChatSession,
  getDoctors,
  requestHandoff,
  bookAppointment,
  submitReview,
  textToSpeech,
} from "@/lib/api";
import { ChatSession, ChatMessage, DoctorProfile } from "@/lib/types";
import { ChatBubble } from "@/components/ui/chat-bubble";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { StatusChip } from "@/components/ui/status-chip";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Send, Mic, MicOff, Plus, Stethoscope, Calendar, Sparkles, Star,
  CheckCircle2, Clock, XCircle, PhoneOff
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/lib/auth";
import { useVoiceAssistant } from "@/lib/useVoiceAssistant"; // Ensure import is correct

// ============================================================================
// MAIN PAGE COMPONENT
// ============================================================================
interface SpeechRecognitionEvent {
  results: { [index: number]: { [index: number]: { transcript: string } } };
}
interface SpeechRecognitionInstance {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onresult: (event: SpeechRecognitionEvent) => void;
  onerror: (event: unknown) => void;
  onend: () => void;
  start: () => void;
  stop: () => void;
}
type SpeechRecognitionConstructor = new () => SpeechRecognitionInstance;

function ChatContent() {
  const { user } = useAuth();
  const searchParams = useSearchParams();
  const requestedSessionId = searchParams.get("session");

  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [activeSession, setActiveSession] = useState<ChatSession | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const prevUserIdRef = useRef<number | null | undefined>(undefined);

  // Reset active session and messages on logout or user ID change (Session overlap protection)
  useEffect(() => {
    if (prevUserIdRef.current !== undefined && prevUserIdRef.current !== user?.id) {
      setActiveSession(null);
      setMessages([]);
      setSessions([]);
    }
    prevUserIdRef.current = user?.id;
    if (!user) {
      setActiveSession(null);
      setMessages([]);
      setSessions([]);
    }
  }, [user]);
  const [inputMessage, setInputMessage] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [isLoadingSession, setIsLoadingSession] = useState(true);

  const [doctors, setDoctors] = useState<DoctorProfile[]>([]);
  const [isHandoffOpen, setIsHandoffOpen] = useState(false);
  const [selectedDoctorId, setSelectedDoctorId] = useState<number | null>(null);
  const [isHandoffLoading, setIsHandoffLoading] = useState(false);

  const [isBookingOpen, setIsBookingOpen] = useState(false);
  const [bookingDoctorId, setBookingDoctorId] = useState<number | null>(null);
  const [bookingTime, setBookingTime] = useState("");
  const [bookingNotes, setBookingNotes] = useState("");
  const [isBookingLoading, setIsBookingLoading] = useState(false);
  const [bookingSuccess, setBookingSuccess] = useState<string | null>(null);

  const [isReviewOpen, setIsReviewOpen] = useState(false);
  const [reviewRating, setReviewRating] = useState<number>(5);
  const [reviewSolved, setReviewSolved] = useState<boolean>(true);
  const [reviewComment, setReviewComment] = useState("");
  const [isReviewSubmitting, setIsReviewSubmitting] = useState(false);

  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);
  const transcriptRef = useRef<string>("");
  const [playingMsgId, setPlayingMsgId] = useState<number | null>(null);

  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  // --- VOICE ASSISTANT STATE ---
  const [isVoiceModeActive, setIsVoiceModeActive] = useState(false);
  // token line hatadi gayi hai
  const { isProcessing, error, start, stop } = useVoiceAssistant(activeSession?.id || null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };
  useEffect(() => { scrollToBottom(); }, [messages]);

  const loadSession = async (sessionId: number) => {
    setIsLoadingSession(true);
    try {
      const detail = await getChatSession(sessionId);
      setActiveSession(detail);
      setMessages(detail.messages || []);
    } catch (err) {
      console.error("Failed to load session:", err);
    } finally {
      setIsLoadingSession(false);
    }
  };

  const handleNewChat = async (startVoice: boolean = false) => {
    setIsLoadingSession(true);
    try {
      const newSession = await createOrResumeChatSession(true);
      setActiveSession(newSession);
      const detail = await getChatSession(newSession.id);
      setMessages(detail.messages || []);
      const updatedSessions = await getMyChatSessions();
      setSessions(updatedSessions);
      
      if (startVoice) {
        setIsVoiceModeActive(true);
      }
    } catch (err) {
      console.error("Failed to create new session:", err);
    } finally {
      setIsLoadingSession(false);
    }
  };

  // Trigger voice when active session is set and voice mode is on
  useEffect(() => {
    // token condition hata di gayi hai
    if (isVoiceModeActive && activeSession?.id) {
      start();
    }
    return () => {
      stop();
    };
  }, [isVoiceModeActive, activeSession?.id, start, stop]); // token dependency hata di

  useEffect(() => {
    async function init() {
      try {
        const [sessionList, docList] = await Promise.all([
          getMyChatSessions(),
          getDoctors(),
        ]);
        setSessions(sessionList);
        setDoctors(docList);
        if (docList.length > 0) {
          setSelectedDoctorId(docList[0].id);
          setBookingDoctorId(docList[0].id);
        }

        if (requestedSessionId) {
          const match = sessionList.find((s) => s.id === Number(requestedSessionId));
          if (match) {
            await loadSession(match.id);
            return;
          }
        }

        const activeFromList = sessionList.find((s) => s.status === "active");
        if (activeFromList) {
          await loadSession(activeFromList.id);
        } else {
          await handleNewChat();
        }
      } catch (err) {
        console.error("Failed to initialize chat:", err);
      } finally {
        setIsLoadingSession(false);
      }
    }
    init();
  }, [requestedSessionId]);

  const handleSendMessage = async (e?: React.FormEvent, overrideText?: string) => {
    if (e) e.preventDefault();
    const content = (overrideText || inputMessage).trim();
    if (!content || !activeSession || isSending) return;

    setInputMessage("");
    setIsSending(true);

    const tempPatientMsg: ChatMessage = {
      id: Date.now(),
      session_id: activeSession.id,
      sender: "patient",
      content,
      is_voice: !!overrideText,
      created_at: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, tempPatientMsg]);

    try {
      const reply = await sendChatMessage(activeSession.id, {
        content,
        is_voice: !!overrideText,
      });

      setMessages((prev) => [
        ...prev.filter((m) => m.id !== tempPatientMsg.id),
        tempPatientMsg,
        reply,
      ]);

      if (reply.sender === "bot") {
        handleTts(reply.id, reply.content);
      }

      const updatedSessions = await getMyChatSessions();
      setSessions(updatedSessions);
    } catch (err) {
      console.error("Failed to send message:", err);
      const message = err instanceof Error ? err.message : "Failed to send";

      if (message.includes("Requires role")) {
        alert("This page is for patients only. Redirecting to your dashboard...");
        window.location.href = "/dashboard";
        return;
      }

      if (message.includes("Session is not active") || message.includes("409")) {
        alert("This chat was closed — starting a new one.");
        await handleNewChat();
        return;
      }

      alert(message);
    } finally {
      setIsSending(false);
    }
  };

  const handleTts = async (msgId: number, text: string) => {
    if (playingMsgId === msgId) {
      setPlayingMsgId(null);
      if ("speechSynthesis" in window) window.speechSynthesis.cancel();
      return;
    }
    setPlayingMsgId(msgId);
    try {
      const res = await textToSpeech(text);
      if (res.dev_stub || !res.audio_base64) {
        if ("speechSynthesis" in window) {
          window.speechSynthesis.cancel();
          const utterance = new SpeechSynthesisUtterance(text);
          utterance.onend = () => setPlayingMsgId(null);
          utterance.onerror = () => setPlayingMsgId(null);
          window.speechSynthesis.speak(utterance);
        } else {
          setPlayingMsgId(null);
        }
      } else {
        const audio = new Audio(`data:audio/${res.format || "mp3"};base64,${res.audio_base64}`);
        audio.onended = () => setPlayingMsgId(null);
        audio.onerror = () => setPlayingMsgId(null);
        await audio.play();
      }
    } catch {
      if ("speechSynthesis" in window) {
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.onend = () => setPlayingMsgId(null);
        utterance.onerror = () => setPlayingMsgId(null);
        window.speechSynthesis.speak(utterance);
      } else {
        setPlayingMsgId(null);
      }
    }
  };

  const toggleSpeechRecognition = () => {
    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
      return;
    }

    const SpeechRec =
      (window as unknown as { SpeechRecognition?: SpeechRecognitionConstructor }).SpeechRecognition ||
      (window as unknown as { webkitSpeechRecognition?: SpeechRecognitionConstructor }).webkitSpeechRecognition;

    if (!SpeechRec) {
      alert("Speech recognition is not supported in this browser. Please use Chrome or Edge.");
      return;
    }

    const recognition = new SpeechRec();
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = "en-US";
    transcriptRef.current = "";

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      const transcript = event.results[0]?.[0]?.transcript;
      if (transcript) {
        transcriptRef.current = transcript;
        setInputMessage(transcript);
      }
    };
    recognition.onerror = () => setIsListening(false);
    recognition.onend = () => {
      setIsListening(false);
      if (transcriptRef.current.trim()) {
        const textToSend = transcriptRef.current;
        transcriptRef.current = "";
        setTimeout(() => handleSendMessage(undefined, textToSend), 100);
      }
    };

    recognitionRef.current = recognition;
    recognition.start();
    setIsListening(true);
  };

  const handleHandoffSubmit = async () => {
    if (!selectedDoctorId || !activeSession) return;
    setIsHandoffLoading(true);
    try {
      await requestHandoff({ doctor_id: selectedDoctorId, session_id: activeSession.id });
      setIsHandoffOpen(false);
      await loadSession(activeSession.id);
      const updatedSessions = await getMyChatSessions();
      setSessions(updatedSessions);
    } catch (err) {
      console.error("Handoff failed:", err);
      alert("Failed to request doctor handoff. Please try again.");
    } finally {
      setIsHandoffLoading(false);
    }
  };

  const handleBookingSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!bookingDoctorId || !bookingTime) return;
    setIsBookingLoading(true);
    setBookingSuccess(null);
    try {
      const appt = await bookAppointment({
        doctor_id: bookingDoctorId,
        scheduled_at: new Date(bookingTime).toISOString(),
        duration_minutes: 30,
        notes: bookingNotes || undefined,
      });
      setBookingSuccess(`Appointment booked successfully for ${new Date(appt.scheduled_at).toLocaleString()}`);
      setTimeout(() => {
        setIsBookingOpen(false);
        setBookingSuccess(null);
        setBookingNotes("");
      }, 2000);
    } catch (err: unknown) {
      if (err instanceof Error) alert(err.message);
      else alert("Failed to book appointment. Please check availability.");
    } finally {
      setIsBookingLoading(false);
    }
  };

  const handleCloseSession = async () => {
    if (!activeSession) return;
    try {
      await closeChatSession(activeSession.id);
      setIsReviewOpen(true);
    } catch (err) {
      console.error("Failed to close session:", err);
    }
  };

  const handleReviewSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeSession) return;
    setIsReviewSubmitting(true);
    try {
      await submitReview({
        session_id: activeSession.id,
        issue_solved: reviewSolved,
        rating: reviewRating,
        comment: reviewComment || undefined,
      });
      setIsReviewOpen(false);
      const updated = await getMyChatSessions();
      setSessions(updated);
      await loadSession(activeSession.id);
    } catch (err) {
      console.error("Failed to submit review:", err);
      alert("Could not submit review.");
    } finally {
      setIsReviewSubmitting(false);
    }
  };

  const endVoiceCall = async () => {
    stop();
    setIsVoiceModeActive(false);
    // Reload messages from DB to show voice transcript in text chat
    if (activeSession?.id) {
      const detail = await getChatSession(activeSession.id);
      setMessages(detail.messages || []);
    }
  };

  const primaryDoctorName = doctors[0]?.full_name || "Ahmed";
  const isHandedOff = activeSession && activeSession.status !== "active";

  return (
    <div className="flex flex-col h-screen bg-bg-light">
      <PatientNav />

      <div className="flex-1 flex overflow-hidden max-w-7xl w-full mx-auto p-3 sm:p-4 gap-4">
        {/* Sidebar */}
        <aside className="hidden lg:flex flex-col w-[280px] bg-white border border-border-default rounded-card shadow-sm overflow-hidden">
          <div className="p-3.5 border-b border-border-default flex items-center justify-between">
            <h2 className="text-sm font-semibold text-navy flex items-center gap-2">
              <Clock className="w-4 h-4 text-accent" />
              Chat Sessions
            </h2>
            <Button variant="primary" size="sm" onClick={() => handleNewChat(false)} className="gap-1 h-8 px-2.5 text-xs">
              <Plus className="w-3.5 h-3.5" />
              New
            </Button>
          </div>

          <div className="flex-1 overflow-y-auto p-2 space-y-1.5">
            {sessions.map((s) => {
              const isSelected = activeSession?.id === s.id;
              return (
                <button
                  key={s.id}
                  onClick={() => { setIsVoiceModeActive(false); stop(); loadSession(s.id); }}
                  className={cn(
                    "w-full text-left p-2.5 rounded-btn transition-colors border",
                    isSelected ? "bg-mint-soft border-accent/40 shadow-xs" : "border-transparent hover:bg-neutral-gray"
                  )}
                >
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-navy">Session #{s.id}</span>
                    <StatusChip status={s.status} />
                  </div>
                  <div className="text-[11px] text-text-muted mt-1 truncate">
                    {new Date(s.created_at).toLocaleDateString([], { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
                  </div>
                </button>
              );
            })}
          </div>

          {activeSession && activeSession.status === "active" && (
            <div className="p-3 border-t border-border-default bg-neutral-gray/50">
              <Button variant="outline" size="sm" onClick={handleCloseSession} className="w-full text-xs text-text-muted hover:text-navy">
                <XCircle className="w-3.5 h-3.5 mr-1 text-danger" />
                Close Session & Review
              </Button>
            </div>
          )}
        </aside>

        {/* Main chat area */}
        <main className="flex-1 flex flex-col bg-white/70 backdrop-blur-xl shadow-2xl border border-white/20 rounded-2xl overflow-hidden relative">
          
          {/* Header */}
          <header className="p-3.5 px-4 border-b border-border-default/60 flex items-center justify-between bg-white/80 backdrop-blur-md z-10">
            <div className="flex items-center gap-3">
              <div className="relative">
                <div className="w-10 h-10 rounded-full bg-accent text-white flex items-center justify-center shadow-xs">
                  <Sparkles className="w-5 h-5" />
                </div>
                <span className="absolute bottom-0 right-0 w-3 h-3 rounded-full bg-emerald-500 border-2 border-white animate-pulse" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="font-display font-semibold text-base text-navy">AI Dental Receptionist</h1>
                  <span className="text-[11px] text-emerald-600 font-medium flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block animate-pulse" />
                    Online
                  </span>
                </div>
                <p className="text-xs text-text-muted">Ask about treatments, book appointments, or request a doctor</p>
              </div>
            </div>

            <div className="flex items-center gap-1.5">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleNewChat(true)} // Starts Voice Mode
                className="text-xs text-accent hover:bg-mint-soft font-medium border border-accent/20"
              >
                <Mic className="w-3.5 h-3.5 mr-1" />
                Talk to AI Receptionist (Voice)
              </Button>
              <Button variant="ghost" size="sm" onClick={() => setIsHandoffOpen(true)} className="text-xs text-accent hover:bg-mint-soft font-medium" disabled={!!isHandedOff}>
                <Stethoscope className="w-3.5 h-3.5 mr-1" /> Talk to Doctor
              </Button>
            </div>
          </header>

          {/* 👇 VOICE CALL UI OVERLAY 👇 */}
          {isVoiceModeActive ? (
            <div className="absolute inset-0 bg-gradient-to-br from-navy via-slate-900 to-navy z-50 flex flex-col items-center justify-center text-white p-6 backdrop-blur-md transition-all duration-300">
              <div className="w-32 h-32 rounded-full bg-accent/20 flex items-center justify-center mb-6 relative">
                <div className={cn("absolute inset-0 rounded-full bg-accent/40 animate-ping", !isProcessing && "opacity-0")} />
                {isProcessing ? <Sparkles className="w-12 h-12 text-accent animate-pulse" /> : <Mic className="w-12 h-12 text-accent" />}
              </div>
              
              <h2 className="text-2xl font-semibold mb-2">
                {isProcessing ? "AI is thinking..." : "Listening..."}
              </h2>
              <p className="text-white/60 text-sm mb-12 text-center max-w-sm">
                {isProcessing ? "Processing your request and generating voice response." : "Speak clearly. I will stop listening when you pause."}
              </p>
              
              {error && <p className="text-red-400 text-sm mb-4 bg-red-900/30 px-4 py-2 rounded-lg">{error}</p>}

              <Button 
                variant="danger" 
                size="lg" 
                onClick={endVoiceCall}
                className="rounded-full bg-red-500 hover:bg-red-600 text-white shadow-lg shadow-red-500/30 h-14 px-8"
              >
                <PhoneOff className="w-5 h-5 mr-2" />
                End Call
              </Button>
            </div>
          ) : (
            // 👇 NORMAL TEXT CHAT UI 👇
            <>
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {isLoadingSession ? (
                  <div className="flex items-center justify-center h-full text-sm text-text-muted">
                    Loading session messages...
                  </div>
                ) : messages.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full text-center p-6 space-y-3">
                    <div className="w-12 h-12 rounded-full bg-mint-soft text-accent flex items-center justify-center">
                      <Sparkles className="w-6 h-6" />
                    </div>
                    <h3 className="font-display font-semibold text-navy text-lg">Welcome to Smile Dental</h3>
                    <p className="text-xs text-text-muted max-w-sm">
                      Hi there! I am your AI dental receptionist. Tell me your symptoms, ask about clinic hours, or say "book me an appointment tomorrow at 3pm" and I'll take care of it.
                    </p>
                  </div>
                ) : (
                  messages.map((m) => (
                    <ChatBubble
                      key={m.id}
                      sender={m.sender}
                      content={m.content}
                      timestamp={m.created_at}
                      isVoice={m.is_voice}
                      onPlayAudio={m.sender === "bot" ? () => handleTts(m.id, m.content) : undefined}
                      isPlaying={playingMsgId === m.id}
                    />
                  ))
                )}
                <div ref={messagesEndRef} />
              </div>

              {!isHandedOff && (
                <div className="px-4 py-2 bg-neutral-gray/50 border-t border-border-default">
                  <div className="flex flex-col sm:flex-row items-center justify-between gap-2 p-2.5 bg-white border border-border-default rounded-btn shadow-xs">
                    <div className="flex items-center gap-2 text-xs">
                      <Stethoscope className="w-4 h-4 text-accent" />
                      <span className="text-navy font-medium">Prefer a human? Speak directly to Dr. {primaryDoctorName}.</span>
                    </div>
                    <div className="flex items-center gap-2 w-full sm:w-auto">
                      <Button variant="ghost" size="sm" onClick={() => setIsBookingOpen(true)} className="text-xs h-7 px-2.5 text-text-muted hover:text-navy">
                        <Calendar className="w-3.5 h-3.5 mr-1" /> Book Manually
                      </Button>
                      <Button variant="secondary" size="sm" onClick={() => setIsHandoffOpen(true)} className="text-xs h-7 px-2.5 bg-mint-soft text-accent hover:bg-mint-soft/80">
                        Talk to Doctor
                      </Button>
                    </div>
                  </div>
                </div>
              )}

              {isHandedOff ? (
                <div className="p-4 border-t border-border-default bg-mint-soft/30 flex flex-col sm:flex-row items-center justify-between gap-4">
                  <div className="flex items-center gap-2 text-sm text-navy font-medium">
                    <Stethoscope className="w-5 h-5 text-accent" />
                    This chat has been handed off to a doctor.
                  </div>
                  <div className="flex gap-2 w-full sm:w-auto">
                    <Button variant="outline" onClick={() => handleNewChat(false)} className="w-full sm:w-auto">
                      <Sparkles className="w-4 h-4 mr-1" /> Back to AI Receptionist
                    </Button>
                    <Button variant="primary" onClick={() => (window.location.href = "/conversations")} className="w-full sm:w-auto">
                      Go to Doctor Conversation →
                    </Button>
                  </div>
                </div>
              ) : (
                <form onSubmit={(e) => handleSendMessage(e)} className="p-3 border-t border-border-default bg-white flex items-center gap-2">
                  <Button
                    type="button"
                    variant={isListening ? "danger" : "ghost"}
                    size="icon"
                    onClick={toggleSpeechRecognition}
                    title={isListening ? "Listening... click to stop" : "Speak message"}
                    className={cn("h-11 w-11 shrink-0", isListening && "animate-pulse")}
                  >
                    {isListening ? <MicOff className="w-5 h-5 text-danger" /> : <Mic className="w-5 h-5 text-text-muted hover:text-accent" />}
                  </Button>
                  <Input
                    value={inputMessage}
                    onChange={(e) => setInputMessage(e.target.value)}
                    placeholder="e.g. 'Book me a cleaning tomorrow at 3pm' or 'What are your hours?'"
                    className="flex-1"
                    disabled={isSending}
                  />
                  <Button type="submit" variant="primary" size="icon" disabled={!inputMessage.trim() || isSending} className="h-11 w-11 shrink-0">
                    <Send className="w-4 h-4" />
                  </Button>
                </form>
              )}
            </>
          )}
        </main>
      </div>

      {/* Handoff Dialog */}
      <Dialog open={isHandoffOpen} onOpenChange={setIsHandoffOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Talk to a Doctor</DialogTitle>
            <DialogDescription>
              Escalate this chat to a licensed dentist. They will review the conversation and respond to your thread.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>Select Doctor</Label>
              <select
                className="w-full h-11 px-3 rounded-btn border border-border-default bg-white text-sm focus:outline-none focus:ring-2 focus:ring-accent/30"
                value={selectedDoctorId || ""}
                onChange={(e) => setSelectedDoctorId(Number(e.target.value))}
              >
                {doctors.map((d) => (
                  <option key={d.id} value={d.id}>
                    Dr. {d.full_name} {d.specialty ? `(${d.specialty})` : ""}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setIsHandoffOpen(false)} disabled={isHandoffLoading}>
              Cancel
            </Button>
            <Button variant="primary" onClick={handleHandoffSubmit} disabled={isHandoffLoading || !selectedDoctorId}>
              {isHandoffLoading ? "Submitting..." : "Submit Request"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Manual Booking Dialog */}
      <Dialog open={isBookingOpen} onOpenChange={setIsBookingOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Book a Dental Appointment</DialogTitle>
            <DialogDescription>Select an available dentist and your preferred time.</DialogDescription>
          </DialogHeader>
          {bookingSuccess ? (
            <div className="p-6 text-center space-y-3">
              <CheckCircle2 className="w-10 h-10 text-emerald-600 mx-auto" />
              <p className="text-sm font-semibold text-navy">{bookingSuccess}</p>
            </div>
          ) : (
            <form onSubmit={handleBookingSubmit} className="space-y-4 py-2">
              <div className="space-y-1.5">
                <Label>Select Doctor</Label>
                <select
                  className="w-full h-11 px-3 rounded-btn border border-border-default bg-white text-sm focus:outline-none focus:ring-2 focus:ring-accent/30"
                  value={bookingDoctorId || ""}
                  onChange={(e) => setBookingDoctorId(Number(e.target.value))}
                  required
                >
                  {doctors.map((d) => (
                    <option key={d.id} value={d.id}>
                      Dr. {d.full_name} {d.specialty ? `(${d.specialty})` : ""}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-1.5">
                <Label>Preferred Date & Time</Label>
                <Input type="datetime-local" value={bookingTime} onChange={(e) => setBookingTime(e.target.value)} required />
              </div>
              <div className="space-y-1.5">
                <Label>Reason / Notes</Label>
                <Textarea placeholder="e.g. Regular teeth cleaning" value={bookingNotes} onChange={(e) => setBookingNotes(e.target.value)} rows={2} />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <Button type="button" variant="outline" onClick={() => setIsBookingOpen(false)} disabled={isBookingLoading}>Cancel</Button>
                <Button type="submit" variant="primary" disabled={isBookingLoading || !bookingTime}>
                  {isBookingLoading ? "Booking..." : "Confirm Booking"}
                </Button>
              </div>
            </form>
          )}
        </DialogContent>
      </Dialog>

      {/* Review Dialog */}
      <Dialog open={isReviewOpen} onOpenChange={setIsReviewOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Session Review</DialogTitle>
            <DialogDescription>How was your experience with our AI receptionist today?</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleReviewSubmit} className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Was your issue solved?</Label>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setReviewSolved(true)}
                  className={cn("flex-1 py-2 text-sm font-medium rounded-btn border transition-colors", reviewSolved ? "bg-emerald-50 border-emerald-500 text-emerald-700 font-semibold" : "border-border-default hover:bg-neutral-gray")}
                >
                  Yes, solved
                </button>
                <button
                  type="button"
                  onClick={() => setReviewSolved(false)}
                  className={cn("flex-1 py-2 text-sm font-medium rounded-btn border transition-colors", !reviewSolved ? "bg-danger/10 border-danger text-danger font-semibold" : "border-border-default hover:bg-neutral-gray")}
                >
                  No, still need help
                </button>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Rating</Label>
              <div className="flex items-center gap-1.5 justify-center py-2">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button key={star} type="button" onClick={() => setReviewRating(star)} className="p-1 hover:scale-110 transition-transform">
                    <Star className={cn("w-7 h-7", star <= reviewRating ? "text-amber-400 fill-amber-400" : "text-border-default")} />
                  </button>
                ))}
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Additional Feedback (optional)</Label>
              <Textarea placeholder="Share any comments..." value={reviewComment} onChange={(e) => setReviewComment(e.target.value)} rows={3} />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => setIsReviewOpen(false)} disabled={isReviewSubmitting}>Skip</Button>
              <Button type="submit" variant="primary" disabled={isReviewSubmitting}>
                {isReviewSubmitting ? "Submitting..." : "Submit Feedback"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default function ChatPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-bg-light flex items-center justify-center text-sm text-text-muted">Loading AI Receptionist...</div>}>
      <ChatContent />
    </Suspense>
  );
}