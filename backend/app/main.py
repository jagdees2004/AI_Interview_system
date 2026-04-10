from __future__ import annotations

from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import settings
from app.core.logging import logger

from app.api.interviews import router as interviews_router


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup / shutdown lifecycle."""
    logger.info(f"Starting {settings.APP_NAME} ({settings.APP_ENV})")
    settings.ensure_dirs()
    
    import firebase_admin
    from firebase_admin import credentials
    import os

    try:
        firebase_admin.get_app()
    except ValueError:
        initialized = False
        
        # 1. Try environment variable content first
        if settings.FIREBASE_CREDENTIALS_JSON:
            try:
                import json as py_json
                cred_dict = py_json.loads(settings.FIREBASE_CREDENTIALS_JSON)
                cred = credentials.Certificate(cred_dict)
                firebase_admin.initialize_app(cred)
                logger.info("Firebase Admin SDK initialized using FIREBASE_CREDENTIALS_JSON env var")
                initialized = True
            except Exception as e:
                logger.error(f"Failed to initialize Firebase from env var: {e}")

        # 2. Try file paths if not initialized
        if not initialized:
            cred_paths = [
                "firebase-credentials.json",
                "/etc/secrets/firebase-credentials.json",  # Render secret file path
            ]
            for path in cred_paths:
                if os.path.exists(path):
                    try:
                        cred = credentials.Certificate(path)
                        firebase_admin.initialize_app(cred)
                        logger.info(f"Firebase Admin SDK initialized using {path}")
                        initialized = True
                        break
                    except Exception as e:
                        logger.error(f"Failed to initialize Firebase from {path}: {e}")

        # 3. Last resort fallback
        if not initialized:
            logger.warning(
                "No Firebase credentials found! Please check your Render secrets or env vars. "
                "Using default credentials instead (which may fail token verification)."
            )
            firebase_admin.initialize_app(options={'projectId': settings.FIREBASE_PROJECT_ID})

    yield
    logger.info("Application shutdown complete")


app = FastAPI(
    title=settings.APP_NAME,
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
    lifespan=lifespan,
)

# ── CORS ─────────────────────────────────────────────
# Note: allow_origins=["*"] does not work with allow_credentials=True
# We use a trick: if origins is ["*"], we allow all by returning the requesting origin
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True if settings.cors_origins_list != ["*"] else False,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Routes ───────────────────────────────────────────
app.include_router(interviews_router, prefix="/api/v1")


@app.get("/", tags=["Health"])
async def root():
    return {
        "app": settings.APP_NAME,
        "status": "running",
        "version": "1.0.0",
    }


@app.get("/health", tags=["Health"])
async def health_check():
    return {"status": "healthy"}

