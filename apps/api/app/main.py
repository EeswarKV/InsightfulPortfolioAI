import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.routers import auth, users, portfolios, market, alerts, research, chat, call_requests, snapshots, ai_research, invites, news, price_alerts, reports, watchlists
from app.routers import websocket as ws_router_module
from app.services.kite_service import kite_service

logging.basicConfig(level=logging.INFO)


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: initialise KiteTicker (or fallback polling)
    await kite_service.start(
        api_key=settings.kite_api_key,
        access_token=settings.kite_access_token,
    )
    yield
    # Shutdown: close connections cleanly
    await kite_service.stop()


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
    app.include_router(invites.router)
    app.include_router(snapshots.router)
    app.include_router(ai_research.router)
    app.include_router(news.router, prefix="/news", tags=["news"])
    app.include_router(price_alerts.router, prefix="/price-alerts", tags=["price-alerts"])
    app.include_router(reports.router, prefix="/reports", tags=["reports"])
    app.include_router(watchlists.router, prefix="/watchlists", tags=["watchlists"])
    app.include_router(ws_router_module.router)  # WebSocket + Kite token endpoints

    @app.get("/")
    async def root():
        return {"message": "PortfolioAI API", "version": "0.1.0", "status": "running"}

    @app.get("/health")
    async def health():
        return {"status": "healthy"}

    return app


app = create_app()
