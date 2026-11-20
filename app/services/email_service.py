"""EmailService — SMTP-based email sending (Gmail compatible).

Handles both implicit-SSL (port 465) and STARTTLS (port 587) automatically
based on SMTP_PORT env variable. Returns True/False — never raises.
"""

import os
import smtplib
import ssl
import traceback
from datetime import datetime
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText


class EmailService:
    @staticmethod
    def send_email(
        to_email: str,
        subject: str,
        body: str,
        to_name: str = "",
    ) -> bool:
        """
        Sends an HTML email via SMTP.

        Auto-detects:
          - Port 465 → SMTP_SSL (implicit TLS, correct for Gmail SSL)
          - Port 587 → SMTP + STARTTLS (correct for Gmail TLS)
          - Other   → SMTP plain (port 25, rarely works with Gmail)

        Returns:
            True  — email sent successfully
            False — email failed (full traceback printed to stdout)
        """
        smtp_server = os.getenv("SMTP_SERVER", "smtp.gmail.com").strip()
        smtp_port = int(os.getenv("SMTP_PORT", "465"))
        smtp_user = os.getenv("SMTP_USER", "").strip()
        smtp_password = os.getenv("SMTP_PASSWORD", "")

        if not smtp_user or not smtp_password:
            print("❌ SMTP_USER or SMTP_PASSWORD missing in .env")
            return False

        # Build message
        msg = MIMEMultipart()
        msg["From"] = smtp_user
        msg["To"] = f"{to_name} <{to_email}>" if to_name else to_email
        msg["Subject"] = subject
        msg.attach(MIMEText(body, "html", "utf-8"))

        context = ssl.create_default_context()

        try:
            if smtp_port == 465:
                # Implicit SSL — correct for port 465
                with smtplib.SMTP_SSL(
                    smtp_server, smtp_port, timeout=30, context=context
                ) as server:
                    server.ehlo()
                    server.login(smtp_user, smtp_password)
                    server.send_message(msg)
                print(f"✅ Email sent to {to_email} (SSL:{smtp_port})")
                return True

            elif smtp_port == 587:
                # STARTTLS — correct for port 587
                with smtplib.SMTP(smtp_server, smtp_port, timeout=30) as server:
                    server.ehlo()
                    server.starttls(context=context)
                    server.ehlo()
                    server.login(smtp_user, smtp_password)
                    server.send_message(msg)
                print(f"✅ Email sent to {to_email} (STARTTLS:{smtp_port})")
                return True

            else:
                # Plain (usually blocked by Gmail)
                with smtplib.SMTP(smtp_server, smtp_port, timeout=30) as server:
                    server.ehlo()
                    try:
                        server.starttls(context=context)
                        server.ehlo()
                    except smtplib.SMTPException:
                        pass  # Server may not support TLS
                    server.login(smtp_user, smtp_password)
                    server.send_message(msg)
                print(f"✅ Email sent to {to_email} (plain:{smtp_port})")
                return True

        except smtplib.SMTPAuthenticationError as e:
            print(f"❌ AUTH FAILED for {to_email}: {e.smtp_code} "
                  f"{e.smtp_error.decode(errors='ignore')[:200]}")
            print("   → App Password invalid. Generate new one at "
                  "myaccount.google.com/apppasswords")
            return False

        except smtplib.SMTPServerDisconnected as e:
            print(f"❌ SERVER DISCONNECTED for {to_email}: {e}")
            print(f"   → Likely wrong port/protocol combo. "
                  f"Port 465 needs SMTP_SSL, port 587 needs STARTTLS.")
            return False

        except Exception as e:
            print(f"❌ Failed to send email to {to_email}: "
                  f"{type(e).__name__}: {e}")
            traceback.print_exc()
            return False

    @staticmethod
    def send_appointment_confirmation(
        to_email: str,
        patient_name: str,
        doctor_name: str,
        scheduled_at: datetime,
        duration_minutes: int,
    ) -> bool:
        """Sends appointment confirmation email. Returns True if delivered."""
        try:
            when = scheduled_at.strftime("%d %B %Y, %I:%M %p")
        except Exception:
            when = str(scheduled_at)

        subject = f"Appointment Confirmed — Dr. {doctor_name}"
        body = f"""
        <html>
        <body style="font-family: Arial, Helvetica, sans-serif; color: #333; line-height: 1.6;">
            <div style="max-width: 560px; margin: 0 auto; padding: 24px; border: 1px solid #e5e7eb; border-radius: 8px;">
                <h2 style="color: #0ea5e9; margin-top: 0;">Your Appointment is Confirmed ✅</h2>
                <p>Hi <strong>{patient_name}</strong>,</p>
                <p>Your dental appointment has been booked successfully.</p>
                <table style="border-collapse: collapse; margin: 16px 0; width: 100%;">
                    <tr>
                        <td style="padding: 8px 12px; background: #f3f4f6; font-weight: 600; width: 40%;">Doctor</td>
                        <td style="padding: 8px 12px;">Dr. {doctor_name}</td>
                    </tr>
                    <tr>
                        <td style="padding: 8px 12px; background: #f3f4f6; font-weight: 600;">Date &amp; Time</td>
                        <td style="padding: 8px 12px;">{when}</td>
                    </tr>
                    <tr>
                        <td style="padding: 8px 12px; background: #f3f4f6; font-weight: 600;">Duration</td>
                        <td style="padding: 8px 12px;">{duration_minutes} minutes</td>
                    </tr>
                </table>
                <p>If you need to reschedule or cancel, please reply to this email or call the clinic.</p>
                <p style="margin-top: 24px; color: #6b7280; font-size: 14px;">— AI Dental Clinic</p>
            </div>
        </body>
        </html>
        """
        return EmailService.send_email(
            to_email=to_email,
            subject=subject,
            body=body,
            to_name=patient_name,
        )

    @staticmethod
    def send_appointment_cancellation(
        to_email: str,
        patient_name: str,
        doctor_name: str,
        scheduled_at: datetime,
    ) -> bool:
        """Optional: cancellation notice."""
        try:
            when = scheduled_at.strftime("%d %B %Y, %I:%M %p")
        except Exception:
            when = str(scheduled_at)

        subject = f"Appointment Cancelled — Dr. {doctor_name}"
        body = f"""
        <html><body style="font-family: Arial, sans-serif;">
            <h2 style="color:#ef4444;">Appointment Cancelled</h2>
            <p>Hi <strong>{patient_name}</strong>,</p>
            <p>Your appointment with <b>Dr. {doctor_name}</b>
               on <b>{when}</b> has been cancelled.</p>
            <p style="color:#6b7280;">— AI Dental Clinic</p>
        </body></html>
        """
        return EmailService.send_email(
            to_email=to_email,
            subject=subject,
            body=body,
            to_name=patient_name,
        )