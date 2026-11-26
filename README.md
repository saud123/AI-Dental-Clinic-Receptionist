# Smile Dental — AI Receptionist & Clinic Management Platform

<p align="center">
  <img src="https://raw.githubusercontent.com/saud123/AI-Dental-Clinic-Receptionist/main/AJWXcNflGnD57pSPVaiUJWVm8HpfNexknSkjGx-OSjobNmI0pblWfD5Nh8RUbyukkFgI7bGTfDrxBbn57xYLtT9ywX7vfQr3qsIIo3Llr5acVgddV3Dr2_T3ZMfB7CJeLZJv1D5SusaoTV77LSaqOzAuc9kebR7jq4Tm1pvpCs5B6790z-LAJpYeU2HTPGHPl2pi4I6T6LLK_8MpyLlpvwvlBIktG0MUnqZ80VK1uht5x7n65DpFdc4mlcBqKOKU0rn" alt="Smile Dental AI Receptionist Platform Preview" width="100%" />
</p>

### Autonomous Front-Desk Operations, Voice AI & Intelligent Appointment Management for Modern Dental Clinics

An AI-powered dental clinic receptionist and clinical staff portal designed to automate 24/7 patient inquiries, streamline natural-language appointment booking, manage doctor availability, and deliver seamless human-in-the-loop doctor handoffs.

---

## 🎥 Video Demonstration

[![Smile Dental Showcase](https://img.youtube.com/vi/QULMX-63Avw/maxresdefault.jpg)](https://youtu.be/QULMX-63Avw?si=aYJfW-EGAcVV7yyJ)

▶️ **[Watch the Full Product Walkthrough on YouTube](https://youtu.be/QULMX-63Avw?si=aYJfW-EGAcVV7yyJ)**

---

## The Business Problem

**Patient Inquiries Are Constant. Front-Desk Capacity Is Not.**

Dental clinics frequently lose bookings and overwhelm front-desk staff due to repetitive phone calls, manual calendar coordination, after-hours patient inquiries, and fragmented follow-ups.

Managing appointments manually requires checking dentist schedules across specialties, verifying patient history, sending confirmation and rescheduling emails, coordinating walk-in check-ins, and escalating urgent clinical cases—all while attending to patients in the clinic.

Traditional booking forms lack conversational flexibility, while naive chatbot implementations introduce major operational risks: double-booked time slots, hallucinated clinical advice, lost patient context, and dead-end conversations when a licensed dentist is needed.

**The objective:** Build an intelligent front-desk and clinical management platform that combines conversational text and voice AI with deterministic calendar scheduling, persistent session memory, automated email notifications, and one-click doctor handoff.

---

## My Approach

I approached this as a full-stack AI engineering and healthcare workflow automation problem rather than simply building a clinic Q&A bot.

### 1. Multimodal AI Receptionist (Text & Voice)

Designed a 24/7 patient reception interface supporting both natural-language text chat and spoken AI audio replies:

- **Natural-Language Appointment Booking:** Patients simply type or speak what they need (e.g., *"Book an appointment with Dr. Ahmed Khan next month"*), and the AI identifies the right doctor, specialty (e.g., Orthodontics, General Dentistry), and available slot.
- **Real-Time Doctor Availability Validation:** Checks live clinic schedules before offering or confirming slots, preventing double bookings and automatically syncing confirmed visits to the clinic calendar.
- **Persistent Session History:** Saves every patient conversation thread with full message and audio history across sessions.

### 2. Seamless One-Click Handoff & AI Clinical Summaries

Built a dedicated **Clinic Staff & Doctor Portal** alongside a structured escalation workflow:

- **One-Click Handoff to a Real Doctor:** Patients can escalate their chat directly to a licensed dentist (such as Dr. Ahmed Khan) with a single click—transferring the entire conversation context to the doctor's inbox without losing history.
- **AI Clinical Summaries for Doctors:** Automatically generates concise clinical summaries of escalated patient cases so doctors can review symptoms, requested appointments, and context before replying in real time.
- **Conversation State Tracking:** Tracks every thread across clear lifecycle states (`Active`, `Waiting For Doctor`, `Waiting For Patient`, `In Doctor Thread`, `Handed Off`, `Closed`).

### 3. Smart Clinic Calendar & Automated Patient Notifications

Separated conversational AI intent from deterministic scheduling and email automation:

- **Multi-View Clinic Calendar:** Interactive Day, Week, Month, and Agenda views with color-coded appointment statuses (`Booked`, `Rescheduled`, `Completed`, `Cancelled`) and one-click rescheduling.
- **Doctor Availability Blocks:** Allows doctors to block out-of-office hours for leave, training, or emergencies—automatically preventing AI bookings during blocked windows and flagging conflicting appointments for rescheduling.
- **Instant Email Confirmations & Reschedule Alerts:** Automatically dispatches formatted email confirmations and schedule-change notifications directly to the patient's inbox.

### 4. Patient Directory & Reception QR Check-In

Streamlined front-desk operations and patient record management:

- **Patient Directory & Clinical Profiles:** Centralizes registered patient demographics, contact details, and appointment history.
- **QR Check-In Scanner:** Supports both live camera QR scanning and manual check-in token verification at the reception desk using each patient's personalized QR code.

---

## System Architecture

The platform separates probabilistic conversational AI reasoning from deterministic database transactions and scheduling rules, connecting a **Next.js / TypeScript** patient and staff portal with a **Python** backend, **SQLAlchemy / Alembic** ORM migrations, and **PostgreSQL** persistence.

```text
┌─────────────────────────┐      ┌──────────────────────────┐      ┌─────────────────────────┐
│     Patient Portal      │─────▶│   AI Receptionist Core   │─────▶│  Deterministic Engine   │
│  (Text Chat, Voice, QR) │      │ (Intent, Voice, Summary) │      │ (Slot Lock & Email Ops) │
└─────────────────────────┘      └──────────────────────────┘      └────────────┬────────────┘
                                              │                                 │
                                              ▼                                 ▼
                                 ┌──────────────────────────┐      ┌─────────────────────────┐
                                 │  Clinic Staff & Doctor   │◀────▶│   PostgreSQL Database   │
                                 │  Portal (Inbox, Calendar)│      │  (SQLAlchemy / Alembic) │
                                 └──────────────────────────┘      └─────────────────────────┘
```

---

## Tech Stack

| Category | Technologies |
|---|---|
| **Frontend** | Next.js, TypeScript |
| **Backend** | Python, REST APIs, Async Request Handling |
| **Database & ORM** | PostgreSQL, SQLAlchemy, Alembic |
| **AI & Voice** | Conversational AI Receptionist, AI Voice Replies, AI Clinical Summarization |
| **Clinic Workflows** | Automated Email Confirmations, Availability Blocking, QR Check-In Scanner |
| **Testing & Diagnostics** | Automated Booking & Diagnostic Test Suites (`test_booking.py`, `test_diagnostic.py`, `check.ps1`) |

---

## Key Engineering Highlights

- **24/7 Text & Voice AI Receptionist:** Handles treatment inquiries, specialty matching, and multi-turn appointment booking with spoken audio responses.
- **Deterministic Calendar & Availability Engine:** Enforces real-time doctor schedules, out-of-office availability blocks, and conflict detection before committing bookings.
- **Human-in-the-Loop Doctor Escalation:** Transfers full chat context from the AI receptionist to a live doctor thread with auto-generated AI clinical summaries.
- **Automated Email Lifecycle:** Sends instant HTML appointment confirmations and rescheduling alerts triggered directly by calendar state changes.
- **End-to-End Front-Desk Tooling:** Unifies patient onboarding, multi-view scheduling, patient directory profiles, and camera/token QR check-in in a single platform.

---

## What I Learned

Building Smile Dental strengthened my understanding of several core full-stack AI engineering principles:

- **Guarding State Mutations with Deterministic Logic:** LLMs should parse natural language and guide patients conversationally, while PostgreSQL transactions and calendar engines must strictly enforce slot availability and conflict rules.
- **Designing Human-in-the-Loop Clinical Workflows:** Production healthcare assistants require clear boundaries—making it effortless for patients to escalate to a real doctor while giving doctors AI-summarized context.
- **Building Stateful Multi-Session Experiences:** Persisting conversation states, audio responses, and patient profiles across sessions turns a simple chatbot into a reliable operational platform.
- **End-to-End Verification:** Writing dedicated booking and diagnostic test suites ensures reliability across calendar updates, availability blocks, and automated email triggers.

One of my biggest takeaways was that building a practical AI receptionist is not just about making an AI sound helpful—it is about ensuring every booked appointment, availability block, email notification, and doctor handoff is reliable, traceable, and operationally safe.

---

## 🔗 Links

- 🎥 **Video Demo:** [Smile Dental Showcase — Full Product Walkthrough](https://youtu.be/QULMX-63Avw?si=aYJfW-EGAcVV7yyJ)
- 💻 **GitHub Repository:** [AI Dental Clinic Receptionist](https://github.com/saud123/AI-Dental-Clinic-Receptionist)
