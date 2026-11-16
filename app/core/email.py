import logging
import resend
from app.core.config import settings

logger = logging.getLogger(__name__)


def send_email(to: str, subject: str, body: str) -> bool:
    """Send an email using Resend or log to console in dev mode."""
    if not settings.RESEND_API_KEY or not settings.RESEND_API_KEY.strip():
        print(f"[DEV EMAIL] To: {to} | Subject: {subject}\nBody: {body}")
        return True

    resend.api_key = settings.RESEND_API_KEY
    try:
        params: resend.Emails.SendParams = {
            "from": settings.EMAIL_FROM,
            "to": [to],
            "subject": subject,
            "text": body,
        }
        resend.Emails.send(params)
        return True
    except Exception as e:
        logger.error(f"Failed to send email via Resend to {to}: {e}")
        return False
