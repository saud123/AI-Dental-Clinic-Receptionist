"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { PatientNav } from "@/components/patient-nav";
import { getPendingReviews, submitReview } from "@/lib/api";
import { ChatSession } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Star, CheckCircle, MessageSquare, ThumbsUp, ThumbsDown } from "lucide-react";
import { cn } from "@/lib/utils";

interface ReviewFormState {
  solved: boolean;
  rating: number;
  comment: string;
  isSubmitting: boolean;
}

export default function ReviewsPage() {
  const router = useRouter();
  const [pendingSessions, setPendingSessions] = useState<ChatSession[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [formStates, setFormStates] = useState<Record<number, ReviewFormState>>({});
  const [submittedSessionIds, setSubmittedSessionIds] = useState<number[]>([]);

  const fetchPending = async () => {
    try {
      const list = await getPendingReviews();
      setPendingSessions(list);
      // Initialize form states
      const initial: Record<number, ReviewFormState> = {};
      list.forEach((s) => {
        initial[s.id] = {
          solved: true,
          rating: 5,
          comment: "",
          isSubmitting: false,
        };
      });
      setFormStates(initial);
    } catch (err) {
      console.error("Failed to fetch pending reviews:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchPending();
  }, []);

  const updateForm = (sessionId: number, updates: Partial<ReviewFormState>) => {
    setFormStates((prev) => ({
      ...prev,
      [sessionId]: { ...prev[sessionId], ...updates },
    }));
  };

  const handleSubmit = async (sessionId: number) => {
    const st = formStates[sessionId];
    if (!st) return;

    updateForm(sessionId, { isSubmitting: true });

    try {
      await submitReview({
        session_id: sessionId,
        issue_solved: st.solved,
        rating: st.rating,
        comment: st.comment || undefined,
      });
      setSubmittedSessionIds((prev) => [...prev, sessionId]);
      setPendingSessions((prev) => prev.filter((s) => s.id !== sessionId));
    } catch (err: unknown) {
      if (err instanceof Error) {
        alert(err.message);
      } else {
        alert("Failed to submit feedback.");
      }
    } finally {
      updateForm(sessionId, { isSubmitting: false });
    }
  };

  return (
    <div className="min-h-screen bg-bg-light flex flex-col">
      <PatientNav />

      <main className="flex-1 max-w-4xl w-full mx-auto p-4 sm:p-6 space-y-6">
        <div>
          <h1 className="text-2xl font-display font-bold text-navy">
            Patient Feedback & Reviews
          </h1>
          <p className="text-sm text-text-muted mt-1">
            Help us improve our AI receptionist and dental clinical care with your feedback
          </p>
        </div>

        {isLoading ? (
          <div className="p-12 text-center text-sm text-text-muted">
            Checking for pending session feedback...
          </div>
        ) : pendingSessions.length === 0 ? (
          <Card className="shadow-elev1 border-border-default">
            <CardContent className="p-8">
              <EmptyState
                icon={CheckCircle}
                title="All caught up!"
                description="You don't have any pending reviews. Thank you for keeping your feedback up to date!"
                actionLabel="Return to Chat"
                onAction={() => {
                  router.push("/chat");
                }}
              />
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-6">
            {pendingSessions.map((session) => {
              const state = formStates[session.id] || {
                solved: true,
                rating: 5,
                comment: "",
                isSubmitting: false,
              };

              return (
                <Card
                  key={session.id}
                  className="shadow-elev1 border-border-default overflow-hidden"
                >
                  <CardHeader className="border-b border-border-default pb-3 bg-white">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <MessageSquare className="w-5 h-5 text-accent" />
                        <CardTitle className="text-base font-display text-navy">
                          Chat Session #{session.id} Feedback
                        </CardTitle>
                      </div>
                      <span className="text-xs text-text-muted">
                        {new Date(session.created_at).toLocaleDateString([], {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        })}
                      </span>
                    </div>
                    <CardDescription className="text-xs text-text-muted mt-1">
                      Let us know how this consultation went and whether your questions were resolved
                    </CardDescription>
                  </CardHeader>

                  <CardContent className="pt-4 space-y-4">
                    {/* Solved Question */}
                    <div className="space-y-1.5">
                      <Label className="text-xs text-navy font-semibold">
                        Did this conversation resolve your request or dental concern?
                      </Label>
                      <div className="flex gap-3 pt-1">
                        <button
                          type="button"
                          onClick={() => updateForm(session.id, { solved: true })}
                          className={cn(
                            "flex items-center justify-center gap-2 px-4 py-2 text-xs font-medium rounded-btn border transition-colors",
                            state.solved
                              ? "bg-emerald-50 border-emerald-500 text-emerald-700 font-semibold"
                              : "border-border-default hover:bg-neutral-gray text-text-muted"
                          )}
                        >
                          <ThumbsUp className="w-3.5 h-3.5" />
                          <span>Yes, it helped</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => updateForm(session.id, { solved: false })}
                          className={cn(
                            "flex items-center justify-center gap-2 px-4 py-2 text-xs font-medium rounded-btn border transition-colors",
                            !state.solved
                              ? "bg-danger/10 border-danger text-danger font-semibold"
                              : "border-border-default hover:bg-neutral-gray text-text-muted"
                          )}
                        >
                          <ThumbsDown className="w-3.5 h-3.5" />
                          <span>No, still unresolved</span>
                        </button>
                      </div>
                    </div>

                    {/* Star Rating */}
                    <div className="space-y-1.5">
                      <Label className="text-xs text-navy font-semibold">
                        Overall experience rating
                      </Label>
                      <div className="flex items-center gap-1.5 py-1">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <button
                            key={star}
                            type="button"
                            onClick={() => updateForm(session.id, { rating: star })}
                            className="p-1 hover:scale-110 transition-transform"
                          >
                            <Star
                              className={cn(
                                "w-6 h-6",
                                star <= state.rating
                                  ? "text-amber-400 fill-amber-400"
                                  : "text-border-default"
                              )}
                            />
                          </button>
                        ))}
                        <span className="ml-2 text-xs font-medium text-text-muted">
                          {state.rating} / 5 Stars
                        </span>
                      </div>
                    </div>

                    {/* Comment */}
                    <div className="space-y-1.5">
                      <Label htmlFor={`comment-${session.id}`} className="text-xs text-navy font-semibold">
                        Comments or suggestions (optional)
                      </Label>
                      <Textarea
                        id={`comment-${session.id}`}
                        placeholder="Tell us what went well or what could be improved..."
                        value={state.comment}
                        onChange={(e) =>
                          updateForm(session.id, { comment: e.target.value })
                        }
                        rows={2}
                      />
                    </div>

                    <div className="pt-2 flex justify-end">
                      <Button
                        variant="primary"
                        size="sm"
                        disabled={state.isSubmitting}
                        onClick={() => handleSubmit(session.id)}
                      >
                        {state.isSubmitting ? "Submitting..." : "Submit Review"}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
