"use client";

import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { KpiCard } from "@/components/ui/kpi-card";
import { Avatar } from "@/components/ui/avatar";
import { ChatBubble } from "@/components/ui/chat-bubble";
import { StatusChip } from "@/components/ui/status-chip";
import { EmptyState } from "@/components/ui/empty-state";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { MessageSquare } from "lucide-react";

export default function StyleGuidePage() {
  const [dialogOpen, setDialogOpen] = useState(false);

  return (
    <div className="min-h-screen bg-surface p-8 max-w-6xl mx-auto space-y-12">
      <div>
        <h1 className="text-display text-on-surface">Design System & Style Guide</h1>
        <p className="text-body-lg text-ink-muted mt-2">
          Living documentation of tokens, typography, and core components for Smile Dental AI Receptionist.
        </p>
      </div>

      {/* 1. Colors */}
      <section className="space-y-4">
        <h2 className="text-headline-md text-on-surface border-b border-border pb-2">
          1. Color Palette Swatches
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-4">
          <div className="space-y-1">
            <div className="h-16 rounded-card bg-accent shadow-elev1" />
            <span className="text-label-sm font-semibold">Accent</span>
            <span className="text-caption text-ink-muted block">#0D9488</span>
          </div>
          <div className="space-y-1">
            <div className="h-16 rounded-card bg-[#CCFBF1] border border-accent-border shadow-elev1" />
            <span className="text-label-sm font-semibold">Mint (Surface 30%)</span>
            <span className="text-caption text-ink-muted block">#CCFBF1</span>
          </div>
          <div className="space-y-1">
            <div className="h-16 rounded-card bg-success shadow-elev1" />
            <span className="text-label-sm font-semibold">Success</span>
            <span className="text-caption text-ink-muted block">#16A34A</span>
          </div>
          <div className="space-y-1">
            <div className="h-16 rounded-card bg-warning shadow-elev1" />
            <span className="text-label-sm font-semibold">Warning</span>
            <span className="text-caption text-ink-muted block">#D97706</span>
          </div>
          <div className="space-y-1">
            <div className="h-16 rounded-card bg-danger shadow-elev1" />
            <span className="text-label-sm font-semibold">Danger</span>
            <span className="text-caption text-ink-muted block">#DC2626</span>
          </div>
          <div className="space-y-1">
            <div className="h-16 rounded-card bg-ink shadow-elev1" />
            <span className="text-label-sm font-semibold">Ink</span>
            <span className="text-caption text-ink-muted block">#111827</span>
          </div>
          <div className="space-y-1">
            <div className="h-16 rounded-card bg-white border border-border shadow-elev1" />
            <span className="text-label-sm font-semibold">Border & Surface</span>
            <span className="text-caption text-ink-muted block">#E5E7EB / #FFFFFF</span>
          </div>
        </div>
      </section>

      {/* 2. Typography */}
      <section className="space-y-4">
        <h2 className="text-headline-md text-on-surface border-b border-border pb-2">
          2. Typography Scale
        </h2>
        <div className="space-y-3 bg-white p-6 rounded-card border border-border">
          <div>
            <span className="text-caption text-ink-muted uppercase">display (44px)</span>
            <div className="text-display">Smile Dental Care</div>
          </div>
          <div>
            <span className="text-caption text-ink-muted uppercase">headline-lg (32px)</span>
            <div className="text-headline-lg">AI Receptionist & Patient Portal</div>
          </div>
          <div>
            <span className="text-caption text-ink-muted uppercase">headline-md (24px)</span>
            <div className="text-headline-md">Doctor Dashboard & Triage Inbox</div>
          </div>
          <div>
            <span className="text-caption text-ink-muted uppercase">headline-sm (20px)</span>
            <div className="text-headline-sm">Today&apos;s Appointment Schedule</div>
          </div>
          <div>
            <span className="text-caption text-ink-muted uppercase">kpi (36px tabular)</span>
            <div className="text-kpi text-accent tabular">148 Patients</div>
          </div>
          <div>
            <span className="text-caption text-ink-muted uppercase">body-lg (18px)</span>
            <div className="text-body-lg">
              Providing modern, compassionate dental triage with automated intelligence.
            </div>
          </div>
          <div>
            <span className="text-caption text-ink-muted uppercase">body-md (15px)</span>
            <div className="text-body-md">
              Please arrive 10 minutes prior to your cleaning to present your digital QR pass.
            </div>
          </div>
          <div>
            <span className="text-caption text-ink-muted uppercase">label-md (14px) / label-sm (12px)</span>
            <div className="flex gap-4 items-center">
              <span className="text-label-md font-medium">Full Name (label-md)</span>
              <span className="text-label-sm font-medium text-ink-muted">Optional note (label-sm)</span>
            </div>
          </div>
        </div>
      </section>

      {/* 3. Buttons (4 variants x 3 sizes) */}
      <section className="space-y-4">
        <h2 className="text-headline-md text-on-surface border-b border-border pb-2">
          3. Buttons (4 variants × 3 sizes)
        </h2>
        <div className="space-y-4 bg-white p-6 rounded-card border border-border">
          <div className="flex flex-wrap items-center gap-4">
            <Button variant="primary" size="sm">Primary Sm</Button>
            <Button variant="primary" size="md">Primary Md</Button>
            <Button variant="primary" size="lg">Primary Lg</Button>
          </div>
          <div className="flex flex-wrap items-center gap-4">
            <Button variant="secondary" size="sm">Secondary Sm</Button>
            <Button variant="secondary" size="md">Secondary Md</Button>
            <Button variant="secondary" size="lg">Secondary Lg</Button>
          </div>
          <div className="flex flex-wrap items-center gap-4">
            <Button variant="ghost" size="sm">Ghost Sm</Button>
            <Button variant="ghost" size="md">Ghost Md</Button>
            <Button variant="ghost" size="lg">Ghost Lg</Button>
          </div>
          <div className="flex flex-wrap items-center gap-4">
            <Button variant="danger" size="sm">Danger Sm</Button>
            <Button variant="danger" size="md">Danger Md</Button>
            <Button variant="danger" size="lg">Danger Lg</Button>
          </div>
        </div>
      </section>

      {/* 4. Form Inputs */}
      <section className="space-y-4">
        <h2 className="text-headline-md text-on-surface border-b border-border pb-2">
          4. Inputs & Textarea
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-white p-6 rounded-card border border-border">
          <div className="space-y-2">
            <Label htmlFor="demo-input">Standard 44px Input with Glow</Label>
            <Input id="demo-input" placeholder="e.g. ali@example.com" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="demo-textarea">Textarea (min-h 80px)</Label>
            <Textarea id="demo-textarea" placeholder="Describe symptoms or reasons for visit..." />
          </div>
        </div>
      </section>

      {/* 5. Cards & KPI Cards */}
      <section className="space-y-4">
        <h2 className="text-headline-md text-on-surface border-b border-border pb-2">
          5. Cards & KPI Cards
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
          <KpiCard label="Total Patients" value="142" sub="+12 this month" />
          <KpiCard label="Appointments Today" value="8" sub="24 this week" />
          <KpiCard label="Pending Threads" value="3" sub="awaiting reply" />
          <KpiCard label="Average Rating" value="4.9" sub="38 reviews" />
        </div>
      </section>

      {/* 6. Badges & Status Chips */}
      <section className="space-y-4">
        <h2 className="text-headline-md text-on-surface border-b border-border pb-2">
          6. Badges & Status Chips
        </h2>
        <div className="bg-white p-6 rounded-card border border-border space-y-4">
          <div>
            <span className="text-label-sm font-semibold text-ink-muted block mb-2">Badges</span>
            <div className="flex flex-wrap gap-2">
              <Badge variant="accent">Accent Badge</Badge>
              <Badge variant="success">Confirmed</Badge>
              <Badge variant="warning">Pending Review</Badge>
              <Badge variant="danger">Cancelled</Badge>
              <Badge variant="neutral">Draft</Badge>
            </div>
          </div>
          <div>
            <span className="text-label-sm font-semibold text-ink-muted block mb-2">Status Chips</span>
            <div className="flex flex-wrap gap-2">
              <StatusChip status="waiting" />
              <StatusChip status="replied" />
              <StatusChip status="active" />
              <StatusChip status="closed" />
            </div>
          </div>
        </div>
      </section>

      {/* 7. Avatars */}
      <section className="space-y-4">
        <h2 className="text-headline-md text-on-surface border-b border-border pb-2">
          7. Neutral Avatars (Neutral gray fill + white initials)
        </h2>
        <div className="flex items-center gap-4 bg-white p-6 rounded-card border border-border">
          <Avatar name="Ali Hassan" size="sm" />
          <Avatar name="Dr. Ahmed Khan" size="md" />
          <Avatar name="Dr. Sara Tariq" size="lg" />
        </div>
      </section>

      {/* 8. Chat Bubbles */}
      <section className="space-y-4">
        <h2 className="text-headline-md text-on-surface border-b border-border pb-2">
          8. Chat Bubbles (Bot mint, Patient accent, System caption)
        </h2>
        <div className="bg-white p-6 rounded-card border border-border space-y-2 max-w-2xl">
          <ChatBubble
            sender="bot"
            content="Hello! I'm your AI dental assistant. How can I help you today?"
            timestamp="10:00 AM"
            onPlayVoice={() => {}}
          />
          <ChatBubble
            sender="patient"
            content="I have a mild toothache on my lower molar for 2 days."
            timestamp="10:01 AM"
          />
          <ChatBubble
            sender="bot"
            content="I understand. Is there any swelling, fever, or pain when chewing? That helps us prioritize."
            timestamp="10:01 AM"
            onPlayVoice={() => {}}
          />
          <ChatBubble
            sender="system"
            content="Doctor thread requested. Dr. Ahmed has been notified."
            timestamp="10:02 AM"
          />
        </div>
      </section>

      {/* 9. Empty State */}
      <section className="space-y-4">
        <h2 className="text-headline-md text-on-surface border-b border-border pb-2">
          9. Empty State
        </h2>
        <EmptyState
          icon={<MessageSquare className="w-8 h-8" />}
          title="No pending threads — all caught up"
          description="You have responded to all patient inquiries and triage requests."
          actionLabel="Check Calendar"
          onAction={() => {}}
        />
      </section>

      {/* 10. Dialog Modal */}
      <section className="space-y-4 pb-12">
        <h2 className="text-headline-md text-on-surface border-b border-border pb-2">
          10. Dialog Modal
        </h2>
        <div className="bg-white p-6 rounded-card border border-border">
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="primary">Open Sample Dialog</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Confirm Appointment Booking</DialogTitle>
                <DialogDescription>
                  Review the booking details before sending notification to patient.
                </DialogDescription>
              </DialogHeader>
              <div className="py-4 space-y-2">
                <div className="flex justify-between text-body-sm">
                  <span className="text-ink-muted">Patient:</span>
                  <span className="font-medium">Ali Hassan</span>
                </div>
                <div className="flex justify-between text-body-sm">
                  <span className="text-ink-muted">Doctor:</span>
                  <span className="font-medium">Dr. Ahmed Khan</span>
                </div>
                <div className="flex justify-between text-body-sm">
                  <span className="text-ink-muted">Time:</span>
                  <span className="font-medium">Tomorrow at 10:00 AM</span>
                </div>
              </div>
              <DialogFooter>
                <Button variant="ghost" onClick={() => setDialogOpen(false)}>
                  Cancel
                </Button>
                <Button variant="primary" onClick={() => setDialogOpen(false)}>
                  Confirm Booking
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </section>
    </div>
  );
}
