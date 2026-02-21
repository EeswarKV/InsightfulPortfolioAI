from supabase import create_client, Client

from app.config import settings

_client: Client | None = None
_admin_client: Client | None = None


def get_supabase_client() -> Client:
    """Return a Supabase client using the anon key."""
    global _client
    if _client is None:
        _client = create_client(settings.supabase_url, settings.supabase_key)
    return _client


def get_supabase_admin() -> Client:
    """Return a Supabase client using the service role key (admin operations)."""
    global _admin_client
    if _admin_client is None:
        _admin_client = create_client(
            settings.supabase_url, settings.supabase_service_key
        )
    return _admin_client
