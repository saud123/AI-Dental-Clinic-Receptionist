"""Test the ACTUAL email_service.py — the same code that fails in production."""
from dotenv import load_dotenv
load_dotenv()

import traceback

print("=" * 70)
print("TEST 1: Actual EmailService.send_email()")
print("=" * 70)

from app.services.email_service import EmailService

try:
    result = EmailService.send_email(
        to_email="saudijaz009@gmail.com",
        subject="Test #1 — diagnostic",
        body="<h1>Test</h1><p>Simple HTML body.</p>",
        to_name="Saud Khan",
    )
    print(f"\n>>> RESULT: {result}\n")
except Exception as e:
    print(f"\n>>> EXCEPTION: {type(e).__name__}: {e}\n")
    traceback.print_exc()

print("=" * 70)
print("TEST 2: Raw smtplib with send_message()")
print("=" * 70)

import os, smtplib, ssl
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText

smtp_server = os.getenv("SMTP_SERVER", "smtp.gmail.com")
smtp_port = int(os.getenv("SMTP_PORT", "465"))
smtp_user = os.getenv("SMTP_USER")
smtp_password = os.getenv("SMTP_PASSWORD")

msg = MIMEMultipart()
msg["From"] = smtp_user
msg["To"] = "saudijaz009@gmail.com"
msg["Subject"] = "Test #2 — raw send_message"
msg.attach(MIMEText("<h1>Test</h1><p>Raw smtplib send_message.</p>", "html"))

try:
    with smtplib.SMTP_SSL(smtp_server, smtp_port, timeout=30,
                          context=ssl.create_default_context()) as server:
        server.ehlo()
        server.login(smtp_user, smtp_password)
        print("   login OK, calling send_message...")
        server.send_message(msg)
        print("   ✅ send_message() returned successfully")
except Exception as e:
    print(f"   ❌ {type(e).__name__}: {e}")
    traceback.print_exc()

print("\n" + "=" * 70)
print("DONE.")
print("=" * 70)