from pydantic import BaseModel, Field


class TtsRequest(BaseModel):
    text: str = Field(min_length=1, max_length=1000)


class TtsResponse(BaseModel):
    audio_base64: str
    format: str = "mp3"
    dev_stub: bool = False
