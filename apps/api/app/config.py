from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    # Supabase
    supabase_url: str
    supabase_key: str
    supabase_service_key: str

    # API
    api_host: str = "0.0.0.0"
    api_port: int = 8000
    cors_origins: list[str] = ["http://localhost:8081", "http://localhost:19006", "http://localhost:8000", "*"]

    # Market Data
    polygon_api_key: str = ""
    finnhub_api_key: str = ""

    # Indian Stock API
    indian_api_key: str = ""

    # AI
    anthropic_api_key: str = ""

    model_config = {"env_file": ".env", "env_file_encoding": "utf-8"}


settings = Settings()
