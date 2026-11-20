"use client";

import React, { Suspense, useEffect, useState, useRef } from "react";
import Link from "next/link";
import { getThread, sendThreadMessage } from "@/lib/api";
import { DoctorThreadDetail, ThreadMessage } from "@/lib/types";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { StatusChip } from "@/components/ui/status-chip";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  ArrowLeft,
  Send,
  User,
  Stethoscope,
  Clock,
  FileText,
} from "lucide-react";
import { cn } from "@/lib/utils";

function ThreadDetailContent({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const [threadId, setThreadId] = useState<number | null>(null);
  const [thread, setThread] = useState<DoctorThreadDetail | null>(null);
  const [messages, setMessages] = useState<ThreadMessage[]>([]);
  const [replyText, setReplyText] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    params.then((p) => {
      setThreadId(Number(p.id));
    });
  }, [params]);

  // Initial load
  useEffect(() => {
    if (!threadId) return;

    async function loadThread() {
      try {
        const detail = await getThread(threadId!);
        setThread(detail);
        setMessages(detail.messages || []);
      } catch (err) {
        console.error("Failed to load thread:", err);
      } finally {
        setIsLoading(false);
      }
    }
    loadThread();
  }, [threadId]);

  useEffect(() => {
  if (!threadId) return;
  const interval = setInterval(async () => {
    try {
      const detail = await getThread(threadId);
      setThread(detail);
      setMessages(detail.messages || []);
    } catch (err) {
      console.error("Failed to poll thread:", err);
    }
  }, 3000);
  return () => clearInterval(interval);
}, [threadId]);

  // Poll thread every 3s so new messages (e.g. from the doctor) appear automatically
  useEffect(() => {
    if (!threadId) return;
    const interval = setInterval(async () => {
      try {
        const detail = await getThread(threadId);
        setThread(detail);
        setMessages(detail.messages || []);
      } catch (err) {
        console.error("Failed to poll thread:", err);
      }
    }, 3000);
    return () => clearInterval(interval);
  }, [threadId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSendReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!replyText.trim() || !threadId || isSending) return;

    const content = replyText.trim();
    setReplyText("");
    setIsSending(true);

    try {
      const newMsg = await sendThreadMessage(threadId, content);
      setMessages((prev) => [...prev, newMsg]);
    } catch (err) {
      console.error("Failed to send thread reply:", err);
      alert("Failed to send message. Please try again.");
    } finally {
      setIsSending(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex-1 p-6 flex items-center justify-center text-sm text-text-muted">
        Loading patient conversation thread...
      </div>
    );
  }

  if (!thread) {
    return (
      <div className="flex-1 p-6 flex flex-col items-center justify-center space-y-4">
        <p className="text-navy font-semibold">Thread not found</p>
        <Link href="/dashboard">
          <Button variant="outline" size="sm">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Dashboard
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="flex-1 p-4 sm:p-6 lg:p-8 flex flex-col max-w-5xl w-full mx-auto space-y-4">
      {/* Top Bar with Back Link */}
      <div className="flex items-center justify-between">
        <Link href="/dashboard">
          <Button variant="ghost" size="sm" className="gap-1.5 text-xs text-text-muted hover:text-navy">
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Dashboard</span>
          </Button>
        </Link>
        <div className="flex items-center gap-2">
          <span className="text-xs text-text-muted">Status:</span>
          <StatusChip status={thread.status} />
        </div>
      </div>

      {/* Patient & Handoff Summary Card */}
      <Card className="shadow-elev1 border-border-default">
        <CardHeader className="pb-3 border-b border-border-default">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="flex items-center gap-3">
              <Avatar name={thread.patient_name || "Patient"} size="md" />
              <div>
                <CardTitle className="text-base font-display text-navy flex items-center gap-2">
                  <span>{thread.patient_name}</span>
                </CardTitle>
                <div className="text-xs text-text-muted flex items-center gap-3 mt-0.5">
                  <span className="flex items-center gap-1">
                    <User className="w-3 h-3 text-text-muted" />
                    Patient ID #{thread.patient_id}
                  </span>
                  <span>•</span>
                  <span className="flex items-center gap-1">
                    <Stethoscope className="w-3 h-3 text-accent" />
                    Dr. {thread.doctor_name}
                  </span>
                </div>
              </div>
            </div>
            <div className="text-xs text-text-muted flex items-center gap-1.5 self-start sm:self-auto">
              <Clock className="w-3.5 h-3.5" />
              <span>
                {new Date(thread.created_at).toLocaleString([], {
                  month: "short",
                  day: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </span>
            </div>
          </div>
        </CardHeader>
        {thread.summary_text && (
          <CardContent className="pt-3 pb-3 bg-neutral-gray/30">
            <div className="flex items-start gap-2 text-xs">
              <FileText className="w-4 h-4 text-accent shrink-0 mt-0.5" />
              <div>
                <span className="font-semibold text-navy">AI Clinical Summary: </span>
                <span className="text-text-dark">{thread.summary_text}</span>
              </div>
            </div>
          </CardContent>
        )}
      </Card>

      {/* Message History & Chat Box */}
      <div className="flex-1 flex flex-col bg-white border border-border-default rounded-card shadow-sm overflow-hidden min-h-[420px]">
        {/* Messages list */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
          {messages.length === 0 ? (
            <div className="text-center py-12 text-xs text-text-muted">
              No direct messages yet. Send a response below to initiate clinical correspondence.
            </div>
          ) : (
            messages.map((m) => {
              const isDoctor = m.sender === "doctor";
              return (
                <div
                  key={m.id}
                  className={cn(
                    "flex flex-col max-w-[80%]",
                    isDoctor ? "ml-auto items-end" : "mr-auto items-start"
                  )}
                >
                  <div className="flex items-center gap-2 mb-1 text-[11px] text-text-muted px-1">
                    <span className="font-medium">
                      {isDoctor ? `Dr. ${thread.doctor_name}` : thread.patient_name}
                    </span>
                    <span>•</span>
                    <span>
                      {new Date(m.created_at).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                  </div>
                  <div
                    className={cn(
                      "p-3.5 rounded-card text-sm leading-relaxed",
                      isDoctor
                        ? "bg-accent text-white rounded-br-none shadow-xs"
                        : "bg-mint-soft text-text-dark rounded-bl-none border border-border-default shadow-xs"
                    )}
                  >
                    {m.content}
                  </div>
                </div>
              );
            })
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Reply form */}
        <form
          onSubmit={handleSendReply}
          className="p-3 border-t border-border-default bg-white flex items-center gap-2"
        >
          <Textarea
            value={replyText}
            onChange={(e) => setReplyText(e.target.value)}
            placeholder="Type your clinical response or advice to the patient..."
            className="flex-1 min-h-[44px] max-h-32 py-2.5 resize-none text-xs"
            rows={1}
            disabled={isSending}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSendReply(e);
              }
            }}
          />
          <Button
            type="submit"
            variant="primary"
            size="md"
            disabled={!replyText.trim() || isSending}
            className="shrink-0 gap-1.5"
          >
            <span>{isSending ? "Sending..." : "Send Reply"}</span>
            <Send className="w-4 h-4" />
          </Button>
        </form>
      </div>
    </div>
  );
}

export default function ThreadDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  return (
    <Suspense
      fallback={
        <div className="flex-1 p-6 flex items-center justify-center text-sm text-text-muted">
          Loading conversation thread...
        </div>
      }
    >
      <ThreadDetailContent params={params} />
    </Suspense>
  );
}