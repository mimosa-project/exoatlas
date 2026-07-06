from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from backend.exoatlas_api import __version__
from backend.exoatlas_api.config import get_settings
from backend.exoatlas_api.routers import health, planets


def create_app() -> FastAPI:
    settings = get_settings()
    app = FastAPI(title=settings.app_name, version=__version__)

    app.add_middleware(
        CORSMiddleware,
        allow_origins=list(settings.cors_origins),
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    app.include_router(health.router)
    app.include_router(planets.router)

    return app


app = create_app()
