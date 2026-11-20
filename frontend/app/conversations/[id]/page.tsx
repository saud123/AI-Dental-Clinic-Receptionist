"use client";

import React, { Suspense, useEffect, useState, useRef } from "react";
import Link from "next/link";
import { getThread, sendThreadMessage } from "@/lib/api";
import { DoctorThreadDetail, ThreadMessage } from "@/lib/types";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { StatusChip } from "@/components/ui/status-chip";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Send, Clock, Stethoscope } from "lucide-react";
import { cn } from "@/lib/utils";

function ThreadDetailContent({ params }: { params: Promise<{ id: string }> }) {
  const [threadId, setThreadId] = useState<number | null>(null);
  const [thread, setThread] = useState<DoctorThreadDetail | null>(null);
  const [messages, setMessages] = useState<ThreadMessage[]>([]);
  const [replyText, setReplyText] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSending, setIsSending] = useState(false);
  
  // Scroll management states
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const [isNearBottom, setIsNearBottom] = useState(true);

  useEffect(() => {
    params.then((p) => setThreadId(Number(p.id)));
  }, [params]);

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const { scrollTop, scrollHeight, clientHeight } = e.currentTarget;
    setIsNearBottom(scrollHeight - scrollTop - clientHeight < 100);
  };

  // Initial Load
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

  // 3-Second Polling with Deduplication
  useEffect(() => {
    if (!threadId) return;
    const interval = setInterval(async () => {
      try {
        const detail = await getThread(threadId);
        setThread(detail);
        
        // FIXED: Deduplicate messages by ID to prevent "two children with same key" error
        const uniqueMessages = Array.from(
          new Map((detail.messages || []).map((m: any) => [m.id, m])).values()
        ) as ThreadMessage[];
        setMessages(uniqueMessages);
      } catch (err) {
        console.error("Failed to poll thread:", err);
      }
    }, 3000);
    return () => clearInterval(interval);
  }, [threadId]);

  // Scroll to bottom ONLY if user is already at the bottom
  useEffect(() => {
    if (isNearBottom) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, isNearBottom]);

  const handleSendReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!replyText.trim() || !threadId || isSending) return;

    const content = replyText.trim();
    setReplyText("");
    setIsSending(true);

    try {
      const newMsg = await sendThreadMessage(threadId, content);
      // Append new message, deduplicated
      setMessages((prev) => {
        const existing = prev.filter(m => m.id !== newMsg.id);
        return [...existing, newMsg];
      });
      setIsNearBottom(true); // Force scroll down when I send a message
    } catch (err) {
      console.error("Failed to send:", err);
      alert("Failed to send message. Please try again.");
    } finally {
      setIsSending(false);
    }
  };

  if (isLoading) return <div className="p-6 text-center text-sm text-text-muted">Loading conversation...</div>;
  if (!thread) return <div className="p-6 text-center text-navy font-semibold">Thread not found</div>;

  const docName = thread.doctor_name?.replace(/^Dr\.\s*/i, '') || "Doctor";

  return (
    <div className="flex-1 p-4 sm:p-6 lg:p-8 flex flex-col max-w-5xl w-full mx-auto space-y-4">
      
      {/* Top Bar */}
      <div className="flex items-center justify-between">
        <Link href="/conversations">
          <Button variant="ghost" size="sm" className="gap-1.5 text-xs text-text-muted hover:text-navy">
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Conversations</span>
          </Button>
        </Link>
        <div className="flex items-center gap-2">
          <span className="text-xs text-text-muted">Status:</span>
          <StatusChip status={thread.status} />
        </div>
      </div>

      {/* Doctor Info Card */}
      <Card className="shadow-elev1 border-border-default">
        <CardHeader className="pb-3 border-b border-border-default">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-3">
              <Avatar name={docName} size="md" />
              <div>
                <CardTitle className="text-base font-display text-navy">
                  Dr. {docName}
                </CardTitle>
                <div className="text-xs text-text-muted flex items-center gap-1.5 mt-0.5">
                  <Stethoscope className="w-3.5 h-3.5 text-accent" />
                  <span>Smile Dental Clinic</span>
                </div>
              </div>
            </div>
            <div className="text-xs text-text-muted flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5" />
              <span>{new Date(thread.created_at).toLocaleDateString()}</span>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Chat Box */}
      <div className="flex-1 flex flex-col bg-white border border-border-default rounded-card shadow-sm overflow-hidden min-h-[420px]">
        {/* FIXED: Added onScroll handler here */}
        <div 
          onScroll={handleScroll}
          className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4"
        >
          {messages.length === 0 ? (
            <div className="text-center py-12 text-xs text-text-muted">
              No messages yet. Say hello to your doctor!
            </div>
          ) : (
            messages.map((m) => {
              const isMe = m.sender === "patient";
              return (
                <div
                  key={m.id}
                  className={cn(
                    "flex flex-col max-w-[80%]",
                    isMe ? "ml-auto items-end" : "mr-auto items-start"
                  )}
                >
                  <div className="flex items-center gap-2 mb-1 text-[11px] text-text-muted px-1">
                    <span className="font-medium">
                      {isMe ? "You" : `Dr. ${docName}`}
                    </span>
                    <span>•</span>
                    <span>
                      {new Date(m.created_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    </span>
                  </div>
                  <div
                    className={cn(
                      "p-3.5 rounded-card text-sm leading-relaxed",
                      isMe
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

        {/* Reply Input */}
        <form onSubmit={handleSendReply} className="p-3 border-t border-border-default bg-white flex items-center gap-2">
          <Textarea
            value={replyText}
            onChange={(e) => setReplyText(e.target.value)}
            placeholder="Type your message to the doctor..."
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
          <Button type="submit" variant="primary" size="md" disabled={!replyText.trim() || isSending} className="shrink-0 gap-1.5">
            <span>{isSending ? "Sending..." : "Send"}</span>
            <Send className="w-4 h-4" />
          </Button>
        </form>
      </div>
    </div>
  );
}

export default function ThreadDetailPage({ params }: { params: Promise<{ id: string }> }) {
  return (
    <Suspense fallback={<div className="p-6 text-center text-sm text-text-muted">Loading conversation...</div>}>
      <ThreadDetailContent params={params} />
    </Suspense>
  );
}