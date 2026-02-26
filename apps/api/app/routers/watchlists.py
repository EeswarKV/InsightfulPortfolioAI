from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from app.dependencies import get_current_user
from app.services.supabase_client import get_supabase_admin

router = APIRouter()


class WatchlistCreate(BaseModel):
    name: str


class WatchlistRename(BaseModel):
    name: str


class WatchlistItemAdd(BaseModel):
    symbol: str
    name: str = ""


def _map(w: dict) -> dict:
    """Normalize Supabase row → frontend-compatible shape."""
    return {
        "id": w["id"],
        "name": w["name"],
        "createdAt": w["created_at"],
        "watchlist_items": w.get("watchlist_items") or [],
    }


def _assert_owner(watchlist_id: str, user_id: str):
    supabase = get_supabase_admin()
    result = (
        supabase.table("watchlists")
        .select("id")
        .eq("id", watchlist_id)
        .eq("user_id", user_id)
        .single()
        .execute()
    )
    if not result.data:
        raise HTTPException(status_code=404, detail="Watchlist not found")


@router.get("")
async def list_watchlists(user=Depends(get_current_user)):
    supabase = get_supabase_admin()
    result = (
        supabase.table("watchlists")
        .select("*, watchlist_items(*)")
        .eq("user_id", str(user.id))
        .order("created_at")
        .execute()
    )
    return [_map(w) for w in (result.data or [])]


@router.post("", status_code=201)
async def create_watchlist(body: WatchlistCreate, user=Depends(get_current_user)):
    supabase = get_supabase_admin()
    result = (
        supabase.table("watchlists")
        .insert({"user_id": str(user.id), "name": body.name})
        .select("*, watchlist_items(*)")
        .single()
        .execute()
    )
    if not result.data:
        raise HTTPException(status_code=500, detail="Failed to create watchlist")
    return _map(result.data)


@router.patch("/{watchlist_id}")
async def rename_watchlist(
    watchlist_id: str,
    body: WatchlistRename,
    user=Depends(get_current_user),
):
    _assert_owner(watchlist_id, str(user.id))
    supabase = get_supabase_admin()
    result = (
        supabase.table("watchlists")
        .update({"name": body.name})
        .eq("id", watchlist_id)
        .select("*, watchlist_items(*)")
        .single()
        .execute()
    )
    return _map(result.data)


@router.delete("/{watchlist_id}", status_code=204)
async def delete_watchlist(watchlist_id: str, user=Depends(get_current_user)):
    _assert_owner(watchlist_id, str(user.id))
    get_supabase_admin().table("watchlists").delete().eq("id", watchlist_id).execute()


@router.post("/{watchlist_id}/items", status_code=201)
async def add_item(
    watchlist_id: str,
    body: WatchlistItemAdd,
    user=Depends(get_current_user),
):
    _assert_owner(watchlist_id, str(user.id))
    supabase = get_supabase_admin()
    result = (
        supabase.table("watchlist_items")
        .upsert(
            {"watchlist_id": watchlist_id, "symbol": body.symbol, "name": body.name},
            on_conflict="watchlist_id,symbol",
        )
        .execute()
    )
    return result.data


@router.delete("/{watchlist_id}/items/{symbol}", status_code=204)
async def remove_item(
    watchlist_id: str,
    symbol: str,
    user=Depends(get_current_user),
):
    _assert_owner(watchlist_id, str(user.id))
    (
        get_supabase_admin()
        .table("watchlist_items")
        .delete()
        .eq("watchlist_id", watchlist_id)
        .eq("symbol", symbol)
        .execute()
    )
