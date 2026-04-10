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
        cred_path = "firebase-credentials.json"
        if os.path.exists(cred_path):
            cred = credentials.Certificate(cred_path)
            firebase_admin.initialize_app(cred)
            logger.info(f"Firebase Admin SDK initialized using {cred_path}")
        else:
            logger.warning(
                f"No '{cred_path}' found! Please download your service account key "
                "from Firebase Console and place it in the backend folder. "
                "Using default credentials instead (which may fail token verification)."
            )
            # Default initialization if credentials are missing
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
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
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

