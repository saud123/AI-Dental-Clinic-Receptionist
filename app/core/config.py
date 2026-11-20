from pydantic_settings import BaseSettings, SettingsConfigDict
class Settings(BaseSettings):
    APP_NAME: str = "Dental AI Receptionist"
    APP_ENV: str = "development"
    DEBUG: bool = True
    SECRET_KEY: str
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60
    DATABASE_URL: str
    GEMINI_API_KEY: str = ""
    GEMINI_CHAT_MODEL: str = "gemini-2.5-flash"
    GEMINI_CLASSIFIER_MODEL: str = "gemini-2.5-flash"
    GEMINI_EMBEDDING_MODEL: str = "text-embedding-004"

    RESEND_API_KEY: str = ""
    EMAIL_FROM: str = "onboarding@resend.dev"

    ELEVENLABS_API_KEY: str = "sk_aa8114f667e9a3abe43d0a7d14efa48314e47676b16decc7"
    ELEVENLABS_VOICE_ID: str = "21m00Tcm4TlvDq8ikWAM"
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )
settings = Settings()
