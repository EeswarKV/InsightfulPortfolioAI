from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.routers import auth, users, portfolios, market, alerts, research, chat, call_requests, snapshots, ai_research, invites


@asynccontextmanager
async def lifespan(app: FastAPI):
    yield


def create_app() -> FastAPI:
    app = FastAPI(
        title="PortfolioAI API",
        version="0.1.0",
        lifespan=lifespan,
    )

    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origins,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    app.include_router(auth.router, prefix="/auth", tags=["auth"])
    app.include_router(users.router, prefix="/users", tags=["users"])
    app.include_router(portfolios.router, prefix="/portfolios", tags=["portfolios"])
    app.include_router(market.router, prefix="/market", tags=["market"])
    app.include_router(alerts.router, prefix="/alerts", tags=["alerts"])
    app.include_router(research.router, prefix="/research", tags=["research"])
    app.include_router(chat.router, prefix="/chat", tags=["chat"])
    app.include_router(call_requests.router, prefix="/call-requests", tags=["call-requests"])
    app.include_router(invites.router)  # Uses /invites prefix from router definition
    app.include_router(snapshots.router)  # Uses /portfolios prefix from router definition
    app.include_router(ai_research.router)  # Uses /ai prefix from router definition

    return app


app = create_app()
