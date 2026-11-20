"""Voice-Only AI Receptionist — ElevenLabs TTS (preferred) + gTTS fallback.

Dependencies:
    pip install SpeechRecognition gTTS requests

.env vars (optional, if missing falls back to gTTS):
    ELEVENLABS_API_KEY=sk_...
    ELEVENLABS_VOICE_ID=21m00Tcm4TlvDq8ikWAM

Register in app/main.py:
    from app.routers import voice_chat
    app.include_router(voice_chat.router, prefix="/api/v1")
"""

import io
import os
import tempfile
import subprocess
from pathlib import Path

import requests
from fastapi import APIRouter, Depends, File, HTTPException, UploadFile
from fastapi.responses import Response
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.deps import require_role
from app.models.user import User, UserRole
from app.services import chat_service

router = APIRouter(prefix="/voice-chat", tags=["voice-chat"])


# ==================== LANGUAGE DETECTION ====================
def _detect_lang(text: str) -> str:
    """Return 'ur' if text contains Arabic/Urdu script, else 'en'."""
    for ch in text:
        code = ord(ch)
        if (
            0x0600 <= code <= 0x06FF        # Arabic block
            or 0x0750 <= code <= 0x077F     # Arabic Supplement
            or 0xFB50 <= code <= 0xFDFF     # Arabic Presentation A
            or 0xFE70 <= code <= 0xFEFF     # Arabic Presentation B
        ):
            return "ur"
    return "en"


# ==================== STT: Google free (en + ur fallback) ====================
def _transcribe(audio_bytes: bytes, suffix: str = ".wav") -> str:
    try:
        import speech_recognition as sr
    except ImportError:
        raise HTTPException(
            status_code=500,
            detail="speech_recognition missing — pip install SpeechRecognition",
        )

    recognizer = sr.Recognizer()
    recognizer.energy_threshold = 300
    recognizer.dynamic_energy_threshold = True

    tmp_input = None
    tmp_wav = None
    
    try:
        # 1. Save the original webm/ogg file
        with tempfile.NamedTemporaryFile(suffix=suffix, delete=False) as tmp:
            tmp.write(audio_bytes)
            tmp_input = tmp.name

        # 2. Convert to WAV using FFmpeg
        tmp_wav = tmp_input + ".wav"
        try:
            subprocess.run(
                ["ffmpeg", "-y", "-i", tmp_input, tmp_wav],
                check=True, capture_output=True
            )
        except subprocess.CalledProcessError as e:
            print(f"[FFMPEG ERROR] {e.stderr.decode()}")
            raise HTTPException(status_code=500, detail="Audio conversion failed. Is FFmpeg installed?")
        except FileNotFoundError:
            raise HTTPException(status_code=500, detail="FFmpeg is not installed on the server.")

        # 3. Pass the WAV file to SpeechRecognition
        with sr.AudioFile(tmp_wav) as source:
            audio = recognizer.record(source)

        # Try English first; if empty → try Urdu
        for lang in ("en-IN", "ur-PK"):
            try:
                result = recognizer.recognize_google(audio, language=lang)
                if result and result.strip():
                    return result.strip()
            except sr.UnknownValueError:
                continue
            except sr.RequestError as e:
                raise HTTPException(status_code=502, detail=f"STT service error: {e}")
        return ""
    finally:
        if tmp_input:
            Path(tmp_input).unlink(missing_ok=True)
        if tmp_wav:
            Path(tmp_wav).unlink(missing_ok=True)


# ==================== TTS 1: ElevenLabs (preferred) ====================
def _elevenlabs_tts(text: str) -> bytes | None:
    """Try ElevenLabs. Returns mp3 bytes or None on any failure."""
    api_key = os.getenv("ELEVENLABS_API_KEY", "").strip().strip('"').strip("'")
    voice_id = (
        os.getenv("ELEVENLABS_VOICE_ID", "21m00Tcm4TlvDq8ikWAM")
        .strip()
        .strip('"')
        .strip("'")
    )

    if not api_key:
        return None

    url = f"https://api.elevenlabs.io/v1/text-to-speech/{voice_id}"
    headers = {
        "xi-api-key": api_key,
        "Content-Type": "application/json",
        "Accept": "audio/mpeg",
    }
    payload = {
        "text": text,
        "model_id": "eleven_multilingual_v2",
        "voice_settings": {"stability": 0.5, "similarity_boost": 0.75},
    }

    try:
        resp = requests.post(url, json=payload, headers=headers, timeout=30)
        if resp.status_code == 200 and resp.content:
            return resp.content
        # Log reason but do NOT hard-fail — fallback will kick in
        print(
            f"[ELEVENLABS] skipped — status={resp.status_code} "
            f"body={resp.text[:200]}"
        )
        return None
    except Exception as e:
        print(f"[ELEVENLABS] request error: {type(e).__name__}: {e}")
        return None


# ==================== TTS 2: gTTS (fallback, no key required) ====================
def _gtts_tts(text: str, lang: str) -> bytes:
    try:
        from gtts import gTTS
    except ImportError:
        raise HTTPException(
            status_code=500,
            detail="gTTS missing — pip install gTTS",
        )

    buf = io.BytesIO()
    gTTS(text=text, lang=lang, slow=False).write_to_fp(buf)
    buf.seek(0)
    return buf.read()


def _synthesize(text: str, lang: str | None = None) -> tuple[bytes, str]:
    """
    Returns (audio_bytes, provider_used).
    Try ElevenLabs first; fallback to gTTS.
    """
    if lang is None:
        lang = _detect_lang(text)

    # Only try ElevenLabs for en / ur
    if lang in ("en", "ur"):
        eleven = _elevenlabs_tts(text)
        if eleven:
            return eleven, "elevenlabs"

    return _gtts_tts(text, lang), "gtts"


# ==================== ENDPOINT ====================
@router.post("/{session_id}")
async def voice_chat_turn(
    session_id: int,
    audio: UploadFile = File(...),
    current_user: User = Depends(require_role(UserRole.PATIENT)),
    db: Session = Depends(get_db),
):
    """Voice round-trip: audio in → STT → chat pipeline → TTS → audio out."""
    name = (audio.filename or "audio.wav").lower()
    suffix = ".wav"
    for ext in (".webm", ".mp3", ".m4a", ".ogg"):
        if name.endswith(ext):
            suffix = ext
            break

    audio_bytes = await audio.read()
    if not audio_bytes:
        raise HTTPException(status_code=400, detail="Empty audio upload")

    # 1) STT
    try:
        user_text = _transcribe(audio_bytes, suffix=suffix)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"STT failed: {e}")

    if not user_text.strip():
        try:
            reply_audio, provider = _synthesize(
                "Sorry, I could not hear you clearly. Please try again.", lang="en"
            )
        except Exception:
            raise HTTPException(status_code=400, detail="Could not transcribe audio")
        return Response(
            content=reply_audio,
            media_type="audio/mpeg",
            headers={"X-Provider": provider, "X-User-Text": "", "X-Bot-Text": ""},
        )

    # 2) Existing chat pipeline (booking/cancel/reschedule/email/etc)
    try:
        bot_msg = chat_service.send_message(
            db, current_user, session_id, user_text, is_voice=True
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Chat pipeline error: {e}")

    reply_text = (bot_msg.content or "").strip()
    if not reply_text:
        reply_text = "Sorry, I did not catch that. Could you say it again?"

    # 3) TTS
    try:
        reply_audio, provider = _synthesize(reply_text)
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"TTS failed: {e}")

    return Response(
        content=reply_audio,
        media_type="audio/mpeg",
        headers={
            "X-User-Text": user_text[:200].replace("\n", " "),
            "X-Bot-Text": reply_text[:200].replace("\n", " "),
            "X-Provider": provider,  # "elevenlabs" or "gtts"
        },
    )