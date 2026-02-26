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


def _fetch_items(watchlist_id: str) -> list:
    result = (
        get_supabase_admin()
        .table("watchlist_items")
        .select("*")
        .eq("watchlist_id", watchlist_id)
        .order("added_at")
        .execute()
    )
    return result.data or []


def _format(w: dict, items: list | None = None) -> dict:
    return {
        "id": w["id"],
        "name": w["name"],
        "createdAt": w["created_at"],
        "watchlist_items": items if items is not None else [],
    }


def _assert_owner(watchlist_id: str, user_id: str):
    result = (
        get_supabase_admin()
        .table("watchlists")
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
    lists = (
        supabase.table("watchlists")
        .select("*")
        .eq("user_id", str(user.id))
        .order("created_at")
        .execute()
    ).data or []

    items_all = (
        supabase.table("watchlist_items")
        .select("*")
        .in_("watchlist_id", [w["id"] for w in lists] if lists else ["none"])
        .order("added_at")
        .execute()
    ).data or []

    items_by_list: dict[str, list] = {}
    for item in items_all:
        items_by_list.setdefault(item["watchlist_id"], []).append(item)

    return [_format(w, items_by_list.get(w["id"], [])) for w in lists]


@router.post("", status_code=201)
async def create_watchlist(body: WatchlistCreate, user=Depends(get_current_user)):
    supabase = get_supabase_admin()
    result = (
        supabase.table("watchlists")
        .insert({"user_id": str(user.id), "name": body.name})
        .execute()
    )
    if not result.data:
        raise HTTPException(status_code=500, detail="Failed to create watchlist")
    return _format(result.data[0])


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
        .execute()
    )
    items = _fetch_items(watchlist_id)
    return _format(result.data[0], items)


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
    result = (
        get_supabase_admin()
        .table("watchlist_items")
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
