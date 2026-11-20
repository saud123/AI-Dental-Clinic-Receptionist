"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { PatientNav } from "@/components/patient-nav";
import { getMyChatSessions } from "@/lib/api";
import { ChatSession } from "@/lib/types";
import { StatusChip } from "@/components/ui/status-chip";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { MessageSquare, ArrowRight, Clock, Plus } from "lucide-react";

export default function ChatHistoryPage() {
  const router = useRouter();
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function fetchSessions() {
      try {
        const list = await getMyChatSessions();
        setSessions(list);
      } catch (err) {
        console.error("Failed to fetch chat sessions:", err);
      } finally {
        setIsLoading(false);
      }
    }
    fetchSessions();
  }, []);

  return (
    <div className="min-h-screen bg-bg-light flex flex-col">
      <PatientNav />

      <main className="flex-1 max-w-5xl w-full mx-auto p-4 sm:p-6 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-display font-bold text-navy">
              Chat Session History
            </h1>
            <p className="text-sm text-text-muted mt-1">
              Review your previous interactions with the AI Receptionist and doctor handoffs
            </p>
          </div>
          <Link href="/chat">
            <Button variant="primary" size="md">
              <Plus className="w-4 h-4 mr-1.5" />
              Start New Chat
            </Button>
          </Link>
        </div>

        <Card className="shadow-elev1 border-border-default overflow-hidden">
          <CardHeader className="border-b border-border-default pb-4">
            <CardTitle className="text-lg font-display text-navy flex items-center gap-2">
              <Clock className="w-5 h-5 text-accent" />
              Past Conversations
            </CardTitle>
            <CardDescription className="text-xs text-text-muted">
              Select any session to view the full conversation transcript
            </CardDescription>
          </CardHeader>

          <CardContent className="p-0">
            {isLoading ? (
              <div className="p-12 text-center text-sm text-text-muted">
                Loading your chat history...
              </div>
            ) : sessions.length === 0 ? (
              <div className="p-8">
                <EmptyState
                  icon={MessageSquare}
                  title="No conversation history"
                  description="You haven't chatted with our AI Receptionist yet. Start a conversation whenever you're ready!"
                  actionLabel="Start a Chat"
                  onAction={() => {
                    router.push("/chat");
                  }}
                />
              </div>
            ) : (
              <div className="divide-y divide-border-default">
                {sessions.map((session) => (
                  <div
                    key={session.id}
                    className="p-4 sm:px-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-neutral-gray/40 transition-colors"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-3">
                        <span className="font-semibold text-navy text-sm sm:text-base">
                          Session #{session.id}
                        </span>
                        <StatusChip status={session.status} />
                      </div>
                      <div className="text-xs text-text-muted flex items-center gap-3">
                        <span>
                          Created: {new Date(session.created_at).toLocaleDateString([], {
                            year: "numeric",
                            month: "short",
                            day: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                        <span>•</span>
                        <span>
                          Last active: {new Date(session.updated_at).toLocaleDateString([], {
                            month: "short",
                            day: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <Link href={`/chat?session=${session.id}`}>
                        <Button variant="outline" size="sm" className="gap-1.5 text-xs">
                          <span>View Transcript</span>
                          <ArrowRight className="w-3.5 h-3.5" />
                        </Button>
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
