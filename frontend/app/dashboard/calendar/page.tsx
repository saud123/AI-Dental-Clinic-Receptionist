"use client";

import React, { useEffect, useState } from "react";
import {
  getAllAppointments,
  cancelAppointment,
  rescheduleAppointment,
  getPatients,
} from "@/lib/api";
import { Appointment, PatientProfile } from "@/lib/types";
import { StatusChip } from "@/components/ui/status-chip";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { EmptyState } from "@/components/ui/empty-state";
import {
  Calendar as CalendarIcon,
  Clock,
  User,
  AlertTriangle,
  RotateCcw,
  XCircle,
  FileText,
} from "lucide-react";

export default function CalendarPage() {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [patients, setPatients] = useState<PatientProfile[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Reschedule state
  const [rescheduleTarget, setRescheduleTarget] = useState<Appointment | null>(null);
  const [newDateTime, setNewDateTime] = useState("");
  const [isRescheduling, setIsRescheduling] = useState(false);

  // Cancel state
  const [cancelTarget, setCancelTarget] = useState<Appointment | null>(null);
  const [isCancelling, setIsCancelling] = useState(false);

  const fetchData = async () => {
    try {
      const [appts, patientList] = await Promise.all([
        getAllAppointments().catch(() => []),
        getPatients().catch(() => []),
      ]);
      setAppointments(appts);
      setPatients(patientList);
    } catch (err) {
      console.error("Failed to load calendar appointments:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const patientMap = new Map<number, PatientProfile>();
  patients.forEach((p) => patientMap.set(p.id, p));

  const handleCancelSubmit = async () => {
    if (!cancelTarget) return;
    setIsCancelling(true);
    try {
      await cancelAppointment(cancelTarget.id);
      setCancelTarget(null);
      await fetchData();
    } catch (err: unknown) {
      if (err instanceof Error) {
        alert(err.message);
      } else {
        alert("Failed to cancel appointment.");
      }
    } finally {
      setIsCancelling(false);
    }
  };

  const handleRescheduleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rescheduleTarget || !newDateTime) return;
    setIsRescheduling(true);
    try {
      await rescheduleAppointment(
        rescheduleTarget.id,
        new Date(newDateTime).toISOString()
      );
      setRescheduleTarget(null);
      setNewDateTime("");
      await fetchData();
    } catch (err: unknown) {
      if (err instanceof Error) {
        alert(err.message);
      } else {
        alert("Failed to reschedule appointment.");
      }
    } finally {
      setIsRescheduling(false);
    }
  };

  return (
    <div className="flex-1 p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl w-full mx-auto">
      <div>
        <h1 className="text-2xl font-display font-bold text-navy flex items-center gap-2">
          <CalendarIcon className="w-6 h-6 text-accent" />
          Clinic Calendar & Appointments
        </h1>
        <p className="text-sm text-text-muted mt-1">
          Monitor scheduled patient visits, adjust schedules, or cancel appointments
        </p>
      </div>

      <Card className="shadow-elev1 border-border-default overflow-hidden">
        <CardHeader className="border-b border-border-default pb-4">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base font-display text-navy">
              All Scheduled Appointments ({appointments.length})
            </CardTitle>
          </div>
          <CardDescription className="text-xs text-text-muted">
            All appointments booked via online portal, AI receptionist, or clinic desk
          </CardDescription>
        </CardHeader>

        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-12 text-center text-sm text-text-muted">
              Loading appointments...
            </div>
          ) : appointments.length === 0 ? (
            <div className="p-8">
              <EmptyState
                icon={CalendarIcon}
                title="No appointments on the schedule"
                description="There are currently no patient appointments booked."
              />
            </div>
          ) : (
            <div className="divide-y divide-border-default">
              {appointments.map((appt) => {
                const patient = patientMap.get(appt.patient_id);
                const canModify =
                  appt.status === "booked" ||
                  appt.status === "rescheduled" ||
                  appt.status === "rescheduled_pending";

                return (
                  <div
                    key={appt.id}
                    className="p-4 sm:px-6 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-neutral-gray/30 transition-colors"
                  >
                    <div className="space-y-1.5 flex-1">
                      <div className="flex items-center gap-3">
                        <span className="font-semibold text-navy text-sm sm:text-base">
                          {patient?.full_name || `Patient #${appt.patient_id}`}
                        </span>
                        <StatusChip status={appt.status} />
                      </div>

                      <div className="flex flex-wrap items-center gap-y-1 gap-x-4 text-xs text-text-muted">
                        <span className="flex items-center gap-1.5 font-medium text-navy">
                          <Clock className="w-3.5 h-3.5 text-accent" />
                          {new Date(appt.scheduled_at).toLocaleString([], {
                            weekday: "short",
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                        <span>•</span>
                        <span>Duration: {appt.duration_minutes} min</span>
                        <span>•</span>
                        <span className="flex items-center gap-1">
                          <User className="w-3 h-3 text-text-muted" />
                          Doctor ID #{appt.doctor_id}
                        </span>
                      </div>

                      {appt.notes && (
                        <div className="text-xs text-text-dark flex items-start gap-1.5 mt-1 bg-neutral-gray/60 p-2 rounded-btn">
                          <FileText className="w-3.5 h-3.5 text-text-muted shrink-0 mt-0.5" />
                          <span>Notes: {appt.notes}</span>
                        </div>
                      )}
                    </div>

                    {canModify && (
                      <div className="flex items-center gap-2 self-start md:self-auto">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setRescheduleTarget(appt);
                            setNewDateTime(
                              new Date(appt.scheduled_at).toISOString().slice(0, 16)
                            );
                          }}
                          className="text-xs gap-1"
                        >
                          <RotateCcw className="w-3.5 h-3.5 text-accent" />
                          Reschedule
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setCancelTarget(appt)}
                          className="text-xs text-danger hover:bg-danger/10 hover:text-danger gap-1"
                        >
                          <XCircle className="w-3.5 h-3.5" />
                          Cancel
                        </Button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Reschedule Dialog */}
      <Dialog
        open={Boolean(rescheduleTarget)}
        onOpenChange={(open) => !open && setRescheduleTarget(null)}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Reschedule Appointment</DialogTitle>
            <DialogDescription>
              Choose a new date and time for Appointment #{rescheduleTarget?.id}.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleRescheduleSubmit} className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="rescheduleTime">New Scheduled Date & Time</Label>
              <Input
                id="rescheduleTime"
                type="datetime-local"
                value={newDateTime}
                onChange={(e) => setNewDateTime(e.target.value)}
                required
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setRescheduleTarget(null)}
                disabled={isRescheduling}
              >
                Close
              </Button>
              <Button
                type="submit"
                variant="primary"
                disabled={isRescheduling || !newDateTime}
              >
                {isRescheduling ? "Updating..." : "Confirm Reschedule"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Cancel Confirmation Dialog */}
      <Dialog
        open={Boolean(cancelTarget)}
        onOpenChange={(open) => !open && setCancelTarget(null)}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-danger">
              <AlertTriangle className="w-5 h-5 text-danger" />
              Cancel Appointment
            </DialogTitle>
            <DialogDescription>
              Are you sure you want to cancel Appointment #{cancelTarget?.id}? This action marks the visit as cancelled.
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => setCancelTarget(null)}
              disabled={isCancelling}
            >
              Keep Appointment
            </Button>
            <Button
              type="button"
              variant="danger"
              onClick={handleCancelSubmit}
              disabled={isCancelling}
            >
              {isCancelling ? "Cancelling..." : "Yes, Cancel"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
