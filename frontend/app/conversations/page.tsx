"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { getMyChatSessions } from "@/lib/api";
import { StatusChip } from "@/components/ui/status-chip";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { Bell, MessageSquare } from "lucide-react";

interface ChatSessionWithExtras {
  id: number;
  status: string;
  doctor_id: number | null;
  doctor_thread_id: number | null; // <-- FIXED: Added this line
  last_message_preview: string | null;
  unread_count: number;
  doctor_info: { id: number; name: string } | null;
  updated_at: string;
  created_at: string;
}

export default function ConversationsPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [sessions, setSessions] = useState<ChatSessionWithExtras[]>([]);
  const [unreadTotal, setUnreadTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  
  useEffect(() => {
    if (!user) return;
    const loadSessions = async () => {
      try {
        const list = await getMyChatSessions();
        const transformed = list.map((session: any) => ({
          id: session.id,
          status: session.status,
          doctor_id: session.doctor_id,
          doctor_thread_id: session.doctor_thread_id || null, // <-- FIXED: Added mapping
          last_message_preview: session.last_message_preview || null,
          unread_count: session.unread_count || 0,
          doctor_info: session.doctor_info || null,
          updated_at: session.updated_at || new Date().toISOString(),
          created_at: session.created_at || new Date().toISOString(),
        }));
        setSessions(transformed);
        const total = transformed.reduce((sum, s) => sum + s.unread_count, 0);
        setUnreadTotal(total);
      } catch (err) {
        console.error("Failed to load conversations", err);
      } finally {
        setIsLoading(false);
      }
    };
    loadSessions();
  }, [user]);
  
  return (
    <div className="p-4 sm:p-6 lg:p-8">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center">
            <Bell className="w-4 h-4 text-accent mr-2" /> Conversations
          </CardTitle>
          <div className="text-xs text-muted/70">
            {unreadTotal} unread messages
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="p-12 text-center text-sm text-muted">Loading conversations...</div>
          ) : sessions.length === 0 ? (
            <EmptyState
              icon={MessageSquare}
              title="No conversations yet"
              description="Start a new chat or talk to a doctor"
              actionLabel="Talk to a Doctor"
              onAction={() => router.push("/chat")}
            />
          ) : (
            <div className="divide-y divide-border-default">
              {sessions.map((session) => (
                <div
                  key={session.id}
                  className="p-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-4 hover:bg-neutral-gray/40 transition-colors"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-3">
                      <span className="font-semibold text-navy">
                        {session.doctor_info ? `Dr. ${session.doctor_info.name}` : `Session #${session.id}`}
                      </span>
                      <StatusChip status={session.status} />
                    </div>
                    {session.last_message_preview && (
                      <p className="text-xs text-muted mt-1">
                        {session.last_message_preview}
                      </p>
                    )}
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted/70">
                      {new Date(session.updated_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                    </span>
                    
                    <Badge 
                      variant={session.unread_count > 0 ? "accent" : "neutral"}
                      className="text-xs"
                    >
                      {session.unread_count}
                    </Badge>
                  </div>
                  
                  <Link 
                    href={`/conversations/${session.doctor_thread_id || session.id}`}
                    className="text-accent text-sm font-medium hover:underline"
                  >
                    View
                  </Link>

                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}