"use client";

import React, { useState } from "react";
import { createAvailabilityBlock } from "@/lib/api";
import { AvailabilityBlockResponse } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Clock,
  ShieldAlert,
  CheckCircle2,
  Calendar,
  AlertCircle,
  Plus,
} from "lucide-react";

export default function AvailabilityPage() {
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [reason, setReason] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<AvailabilityBlockResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setResult(null);

    if (!startTime || !endTime) {
      setError("Please specify both start and end times.");
      return;
    }

    if (new Date(endTime) <= new Date(startTime)) {
      setError("End time must be after start time.");
      return;
    }

    setIsLoading(true);

    try {
      const res = await createAvailabilityBlock({
        start_time: new Date(startTime).toISOString(),
        end_time: new Date(endTime).toISOString(),
        reason: reason || undefined,
      });
      setResult(res);
      // Reset form
      setStartTime("");
      setEndTime("");
      setReason("");
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("Failed to create availability block.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex-1 p-4 sm:p-6 lg:p-8 space-y-6 max-w-4xl w-full mx-auto">
      <div>
        <h1 className="text-2xl font-display font-bold text-navy flex items-center gap-2">
          <Clock className="w-6 h-6 text-accent" />
          Doctor Availability Blocks
        </h1>
        <p className="text-sm text-text-muted mt-1">
          Block clinical hours for leave, training, or emergencies. Conflicting appointments are automatically detected and flagged.
        </p>
      </div>

      {/* Success Notification Banner */}
      {result && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-card space-y-2">
          <div className="flex items-center gap-2 text-emerald-800 font-semibold text-sm">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            <span>
              Availability block #{result.id} successfully created!
            </span>
          </div>
          <p className="text-xs text-emerald-700">
            {result.affected_appointment_ids.length > 0 ? (
              <>
                <strong>{result.affected_appointment_ids.length}</strong> affected appointment(s)
                will receive reschedule notifications.
              </>
            ) : (
              "No existing patient appointments conflicted with this time window."
            )}
          </p>
          {result.affected_appointment_ids.length > 0 && (
            <div className="flex items-center gap-2 pt-1 flex-wrap">
              <span className="text-xs text-emerald-800 font-medium">
                Affected IDs:
              </span>
              {result.affected_appointment_ids.map((id) => (
                <Badge key={id} variant="warning" className="text-xs font-mono">
                  Appt #{id}
                </Badge>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Error Banner */}
      {error && (
        <div className="p-3.5 bg-danger/10 border border-danger/20 text-danger rounded-card text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <Card className="shadow-elev1 border-border-default">
        <CardHeader className="border-b border-border-default pb-4">
          <CardTitle className="text-base font-display text-navy flex items-center gap-2">
            <Plus className="w-4 h-4 text-accent" />
            Schedule New Out-of-Office Block
          </CardTitle>
          <CardDescription className="text-xs text-text-muted">
            Mark your calendar as unavailable. The AI Receptionist will prevent bookings during this period.
          </CardDescription>
        </CardHeader>

        <CardContent className="pt-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="startTime">Block Start Time</Label>
                <Input
                  id="startTime"
                  type="datetime-local"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="endTime">Block End Time</Label>
                <Input
                  id="endTime"
                  type="datetime-local"
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="reason">Reason (optional)</Label>
              <Textarea
                id="reason"
                placeholder="e.g. Annual Dental Seminar, Personal leave, Clinic maintenance"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                rows={3}
              />
            </div>

            <div className="p-3 bg-mint-soft/60 border border-accent/20 rounded-btn text-xs text-text-dark flex items-start gap-2">
              <ShieldAlert className="w-4 h-4 text-accent shrink-0 mt-0.5" />
              <span>
                <strong>Automated Reschedule Flow:</strong> When this block is saved, any patient with an appointment scheduled inside this interval will have their appointment flagged for rescheduling.
              </span>
            </div>

            <div className="pt-2 flex justify-end">
              <Button
                type="submit"
                variant="primary"
                disabled={isLoading}
                className="gap-1.5"
              >
                <Calendar className="w-4 h-4" />
                {isLoading ? "Creating Block..." : "Create Availability Block"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
