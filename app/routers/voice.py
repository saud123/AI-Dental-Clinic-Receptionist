from fastapi import APIRouter, Depends

from app.deps import get_current_user
from app.models.user import User
from app.schemas.voice import TtsRequest, TtsResponse
from app.services import voice_service

router = APIRouter(prefix="/voice", tags=["voice"])


@router.post("/tts", response_model=TtsResponse)
def text_to_speech(
    payload: TtsRequest,
    current_user: User = Depends(get_current_user),
):
    audio_b64, dev_stub = voice_service.text_to_speech_base64(payload.text)
    return TtsResponse(
        audio_base64=audio_b64,
        format="mp3",
        dev_stub=dev_stub,
    )
