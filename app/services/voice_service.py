import base64
import logging
import httpx

from app.core.config import settings

logger = logging.getLogger(__name__)


def text_to_speech_base64(text: str) -> tuple[str, bool]:
    """Convert text to speech using ElevenLabs, or return dev stub if key not set."""
    if not settings.ELEVENLABS_API_KEY or not settings.ELEVENLABS_API_KEY.strip():
        print(f"[DEV TTS] Text: {text}")
        return "", True

    url = f"https://api.elevenlabs.io/v1/text-to-speech/{settings.ELEVENLABS_VOICE_ID}"
    headers = {
        "xi-api-key": settings.ELEVENLABS_API_KEY,
        "Content-Type": "application/json",
    }
    payload = {
        "text": text,
        "model_id": "eleven_multilingual_v2",
        "voice_settings": {
            "stability": 0.5,
            "similarity_boost": 0.75,
        },
    }

    try:
        with httpx.Client(timeout=15.0) as client:
            resp = client.post(url, json=payload, headers=headers)
            if resp.status_code == 200:
                audio_b64 = base64.b64encode(resp.content).decode("utf-8")
                return audio_b64, False
            else:
                logger.error(f"ElevenLabs error {resp.status_code}: {resp.text}")
                return "", True
    except Exception as e:
        logger.error(f"TTS request failed: {e}")
        return "", True
