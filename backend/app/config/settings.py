from functools import lru_cache

from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    """Application settings loaded from environment variables."""

    whisper_api_key: str = ""
    claude_api_key: str = ""
    whisper_model: str = "whisper-1"
    whisper_language: str = "en"
    temp_audio_dir: str = "temp_audio"
    users_dir: str = "users"

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"


@lru_cache()
def get_settings() -> Settings:
    """Get cached settings instance."""
    return Settings()
