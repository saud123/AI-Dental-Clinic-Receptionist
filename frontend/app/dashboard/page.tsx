"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/lib/auth";
import { getDashboardKpis, getThreads } from "@/lib/api";
import { DashboardKpis, DoctorThread } from "@/lib/types";
import { KpiCard } from "@/components/ui/kpi-card";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { StatusChip } from "@/components/ui/status-chip";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Button } from "@/components/ui/button";
import {
  Bell,
  Mail,
  ArrowRight,
  AlertCircle,
} from "lucide-react";

export default function DashboardPage() {
  const { user } = useAuth();
  const [data, setData] = useState<DashboardKpis | null>(null);
  const [allThreads, setAllThreads] = useState<DoctorThread[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        const [kpiRes, threadList] = await Promise.all([
          getDashboardKpis(),
          getThreads().catch(() => []),
        ]);
        setData(kpiRes);
        setAllThreads(threadList);
      } catch (err) {
        console.error("Failed to load dashboard data:", err);
      } finally {
        setIsLoading(false);
      }
    }
    loadData();
  }, []);

  const todayFormatted = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });

  const displayName = user
    ? user.role === "doctor"
      ? `Dr. ${user.full_name}`
      : user.full_name
    : "Staff Member";

  if (isLoading) {
    return (
      <div className="flex-1 p-6 flex items-center justify-center text-sm text-text-muted">
        Loading clinic dashboard...
      </div>
    );
  }

  const kpis = data?.kpis;
  const pendingThreads = data?.pending_threads || [];

  return (
    <div className="flex-1 p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl w-full mx-auto">
      {/* Top Header */}
      <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-border-default">
        <div>
          <h1 className="text-2xl font-display font-bold text-navy">
            Welcome, {displayName}
          </h1>
          <p className="text-xs text-text-muted mt-1">{todayFormatted}</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative p-2 rounded-btn border border-border-default bg-white text-navy shadow-xs">
            <Bell className="w-4 h-4 text-text-muted" />
            {pendingThreads.length > 0 && (
              <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-accent ring-2 ring-white" />
            )}
          </div>
          <Badge variant="accent" className="text-xs">
            Active Shift
          </Badge>
        </div>
      </header>

      {/* Pending Threads Alert Banner */}
      {pendingThreads.length > 0 && (
        <div className="p-4 bg-mint-soft border border-accent/20 rounded-card flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-accent shrink-0" />
            <div>
              <p className="text-sm font-semibold text-navy">
                Action Required: {pendingThreads.length} patient thread
                {pendingThreads.length === 1 ? "" : "s"} awaiting reply
              </p>
              <p className="text-xs text-text-dark">
                Patients escalated from the AI receptionist are waiting for clinical response.
              </p>
            </div>
          </div>
          <a href="#inbox">
            <Button variant="primary" size="sm" className="text-xs shrink-0">
              View Inbox
            </Button>
          </a>
        </div>
      )}

      {/* 4 KPI Cards */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          label="Total Patients"
          value={kpis?.total_patients.total ?? 0}
          subLabel={`+${kpis?.total_patients.new_this_month ?? 0} this month`}
          className="bg-gradient-to-br from-white to-slate-50 shadow-md hover:shadow-xl border-slate-100/80"
        />
        <KpiCard
          label="Appointments Today"
          value={kpis?.appointments.today ?? 0}
          subLabel={`${kpis?.appointments.this_week ?? 0} scheduled this week`}
          className="bg-gradient-to-br from-white to-teal-50/30 shadow-md hover:shadow-xl border-slate-100/80"
        />
        <KpiCard
          label="Pending Threads"
          value={kpis?.pending_threads ?? 0}
          subLabel={
            (kpis?.pending_threads ?? 0) > 0 ? "Awaiting reply" : "All caught up"
          }
          className="bg-gradient-to-br from-white to-amber-50/30 shadow-md hover:shadow-xl border-slate-100/80"
        />
        <KpiCard
          label="Average Clinic Rating"
          value={
            kpis?.rating.average
              ? `${kpis.rating.average.toFixed(1)} ★`
              : "5.0 ★"
          }
          subLabel={`${kpis?.rating.count ?? 0} verified patient reviews`}
          className="bg-gradient-to-br from-white to-slate-50 shadow-md hover:shadow-xl border-slate-100/80"
        />
      </section>

      {/* Inbox / Doctor Threads Section */}
      <section id="inbox" className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Mail className="w-5 h-5 text-accent" />
            <h2 className="text-lg font-display font-semibold text-navy">
              Handoff Inbox & Doctor Threads
            </h2>
          </div>
          <span className="text-xs text-text-muted">
            {pendingThreads.length} pending
          </span>
        </div>

        <Card className="shadow-elev1 border-border-default overflow-hidden">
          <CardContent className="p-0">
            {pendingThreads.length === 0 ? (
              <div className="p-8">
                <EmptyState
                  icon={Mail}
                  title="No pending threads"
                  description="All patient handoffs have been addressed. You're completely caught up!"
                />
              </div>
            ) : (
              <div className="divide-y divide-border-default">
                {pendingThreads.map((thread) => (
                  <Link
                    key={thread.id}
                    href={`/dashboard/threads/${thread.id}`}
                    className="p-4 sm:px-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-neutral-gray/40 transition-colors block"
                  >
                    <div className="flex items-start sm:items-center gap-3.5">
                      <Avatar name={thread.patient_name || "Patient"} size="md" />
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-2.5">
                          <span className="font-semibold text-sm text-navy">
                            {thread.patient_name}
                          </span>
                          <StatusChip status="waiting_for_doctor" />
                        </div>
                        <p className="text-xs text-text-muted line-clamp-1 max-w-lg">
                          {thread.summary_preview || "Patient requested doctor consultation regarding dental care."}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-4 text-xs text-text-muted">
                      <span>
                        {new Date(thread.created_at).toLocaleDateString([], {
                          month: "short",
                          day: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                      <Button variant="ghost" size="sm" className="text-xs text-accent gap-1">
                        <span>Open Thread</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </section>

      {/* All Threads History (if more than pending) */}
      {allThreads.length > pendingThreads.length && (
        <section className="space-y-3 pt-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-navy">
              All Previous Threads ({allThreads.length})
            </h3>
          </div>
          <Card className="border-border-default shadow-xs">
            <CardContent className="p-0">
              <div className="divide-y divide-border-default">
                {allThreads.map((t) => (
                  <Link
                    key={t.id}
                    href={`/dashboard/threads/${t.id}`}
                    className="p-3.5 px-4 flex items-center justify-between text-xs hover:bg-neutral-gray/30 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <span className="font-medium text-navy">Thread #{t.id}</span>
                      <StatusChip status={t.status} />
                      <span className="text-text-muted truncate max-w-xs">
                        {t.summary_text || "Patient handoff"}
                      </span>
                    </div>
                    <span className="text-text-muted">
                      {new Date(t.created_at).toLocaleDateString([], {
                        month: "short",
                        day: "numeric",
                      })}
                    </span>
                  </Link>
                ))}
              </div>
            </CardContent>
          </Card>
        </section>
      )}
    </div>
  );
}
