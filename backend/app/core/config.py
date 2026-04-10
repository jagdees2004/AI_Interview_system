from __future__ import annotations

import json
from pathlib import Path
from typing import List

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    # ── App ──────────────────────────────────────────────
    APP_NAME: str = "AI Mock Interview Platform"
    APP_ENV: str = "development"
    DEBUG: bool = True

    # ── Server ───────────────────────────────────────────
    HOST: str = "0.0.0.0"
    PORT: int = 8000

    # ── JWT (Legacy / Dev) ────────────────────────────────
    JWT_SECRET_KEY: str = "change-me-in-production"
    JWT_ALGORITHM: str = "HS256"
    JWT_ACCESS_TOKEN_EXPIRE_MINUTES: int = 1440

    # ── Google OAuth & Firebase ───────────────────────────
    GOOGLE_CLIENT_ID: str = ""
    GOOGLE_CLIENT_SECRET: str = ""
    GOOGLE_REDIRECT_URI: str = "http://localhost:8000/api/v1/auth/google/callback"
    FIREBASE_PROJECT_ID: str = "ai-interview-system-5c7a1"
    FIREBASE_CREDENTIALS_JSON: str = ""  # Can hold the entire JSON content as a string

    # ── Groq ─────────────────────────────────────────────
    GROQ_API_KEY: str = ""
    GROQ_MODEL: str = "llama-3.3-70b-versatile"

    # ── Storage ──────────────────────────────────────────
    UPLOAD_DIR: str = "./uploads"

    # ── CORS ─────────────────────────────────────────────
    CORS_ORIGINS: str = '["*"]'

    @property
    def cors_origins_list(self) -> List[str]:
        return json.loads(self.CORS_ORIGINS)

    def ensure_dirs(self) -> None:
        for d in (self.UPLOAD_DIR,):
            Path(d).mkdir(parents=True, exist_ok=True)


settings = Settings()
