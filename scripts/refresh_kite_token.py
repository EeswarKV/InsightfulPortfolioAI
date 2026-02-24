"""
Daily Zerodha Kite Connect access token refresh script.

Flow:
  1. Log into Railway API as manager → get a fresh JWT automatically
  2. Generate TOTP from secret (replaces manual Google Authenticator step)
  3. POST to Zerodha login endpoint with user_id + password
  4. POST TOTP to Zerodha 2FA endpoint → get request_token
  5. Exchange request_token for access_token via KiteConnect SDK
  6. Persist token to Railway env vars (survives restarts)
  7. POST new access_token to Railway API → hot-swaps ticker without restart

Run manually:
  python scripts/refresh_kite_token.py

Required environment variables:
  KITE_USER_ID          Zerodha client ID (e.g. AB1234)
  KITE_PASSWORD         Zerodha login password
  KITE_TOTP_SECRET      32-char base32 TOTP secret (from Zerodha → Security → TOTP)
  KITE_API_KEY          Kite Connect app API key
  KITE_API_SECRET       Kite Connect app API secret
  RAILWAY_API_URL       https://insightfulportfolioai-production.up.railway.app
  RAILWAY_TOKEN         Railway API token (Account Settings → Tokens)
  RAILWAY_SERVICE_ID    Railway service ID (from service URL)
  MANAGER_EMAIL         Email of a manager-role account in the app
  MANAGER_PASSWORD      Password of that manager account
"""

import os
import logging

import pyotp
import httpx
from kiteconnect import KiteConnect

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s  %(levelname)s  %(message)s",
)
log = logging.getLogger(__name__)

# ── Config from environment ────────────────────────────────────────────────────

KITE_USER_ID = os.environ["KITE_USER_ID"]
KITE_PASSWORD = os.environ["KITE_PASSWORD"]
KITE_TOTP_SECRET = os.environ["KITE_TOTP_SECRET"]
KITE_API_KEY = os.environ["KITE_API_KEY"]
KITE_API_SECRET = os.environ["KITE_API_SECRET"]
RAILWAY_API_URL = os.environ["RAILWAY_API_URL"].rstrip("/")
RAILWAY_TOKEN = os.environ["RAILWAY_TOKEN"]
RAILWAY_SERVICE_ID = os.environ["RAILWAY_SERVICE_ID"]
MANAGER_EMAIL = os.environ["MANAGER_EMAIL"]
MANAGER_PASSWORD = os.environ["MANAGER_PASSWORD"]

RAILWAY_GQL = "https://backboard.railway.app/graphql/v2"

ZERODHA_LOGIN_URL = "https://kite.zerodha.com/api/login"
ZERODHA_TWOFA_URL = "https://kite.zerodha.com/api/twofa"

HEADERS = {
    "Content-Type": "application/x-www-form-urlencoded",
    "User-Agent": "Mozilla/5.0",
    "X-Kite-Version": "3",
}


# ── Step 0: Get a fresh manager JWT from the Railway API ──────────────────────

def get_manager_token() -> str:
    """Log into the app API as manager to obtain a fresh JWT."""
    log.info("Fetching fresh manager JWT from %s …", RAILWAY_API_URL)
    resp = httpx.post(
        f"{RAILWAY_API_URL}/auth/login",
        json={"email": MANAGER_EMAIL, "password": MANAGER_PASSWORD},
        timeout=30,
    )
    resp.raise_for_status()
    body = resp.json()
    if body.get("role") != "manager":
        raise RuntimeError(
            f"Account {MANAGER_EMAIL} does not have manager role (got: {body.get('role')})"
        )
    token: str = body["access_token"]
    log.info("Manager JWT obtained successfully.")
    return token


# ── Step 1: Login ──────────────────────────────────────────────────────────────

def login(client: httpx.Client) -> str:
    """POST credentials to Zerodha → returns request_id needed for 2FA."""
    log.info("Logging into Zerodha as %s …", KITE_USER_ID)
    resp = client.post(
        ZERODHA_LOGIN_URL,
        data={"user_id": KITE_USER_ID, "password": KITE_PASSWORD},
        headers=HEADERS,
    )
    resp.raise_for_status()
    body = resp.json()
    if body.get("status") != "success":
        raise RuntimeError(f"Login failed: {body}")
    request_id: str = body["data"]["request_id"]
    log.info("Login OK — request_id: %s", request_id)
    return request_id


# ── Step 2: 2FA with TOTP ──────────────────────────────────────────────────────

def twofa(client: httpx.Client, request_id: str) -> None:
    """Submit TOTP to complete 2FA. Session cookie is set on the client."""
    totp_value = pyotp.TOTP(KITE_TOTP_SECRET).now()
    log.info("Generated TOTP: %s", totp_value)

    resp = client.post(
        ZERODHA_TWOFA_URL,
        data={
            "user_id": KITE_USER_ID,
            "request_id": request_id,
            "twofa_value": totp_value,
            "twofa_type": "totp",
        },
        headers=HEADERS,
    )
    resp.raise_for_status()
    body = resp.json()
    if body.get("status") != "success":
        raise RuntimeError(f"2FA failed: {body}")
    log.info("2FA OK")


# ── Step 3: Grab request_token from redirect ───────────────────────────────────

def get_request_token(client: httpx.Client) -> str:
    """
    Fetch the Kite Connect login URL. Zerodha will redirect to our callback URL
    with ?request_token=XXXXX. httpx follows redirects; we capture the final URL.
    """
    login_url = (
        f"https://kite.zerodha.com/connect/login?api_key={KITE_API_KEY}&v=3"
    )
    log.info("Fetching Kite Connect OAuth URL to get request_token …")
    resp = client.get(login_url, follow_redirects=True)

    # The final redirect lands on our callback: .../auth/kite/callback?request_token=...
    final_url = str(resp.url)
    log.info("Final redirect URL: %s", final_url)

    if "request_token=" not in final_url:
        raise RuntimeError(
            f"request_token not found in redirect URL: {final_url}\n"
            "Ensure the Kite Connect redirect URL is set to "
            f"{RAILWAY_API_URL}/auth/kite/callback"
        )

    token = final_url.split("request_token=")[1].split("&")[0]
    log.info("Got request_token: %s", token)
    return token


# ── Step 4: Exchange for access_token ─────────────────────────────────────────

def exchange_token(request_token: str) -> str:
    """Use KiteConnect SDK to exchange request_token for access_token."""
    log.info("Exchanging request_token for access_token …")
    kite = KiteConnect(api_key=KITE_API_KEY)
    data = kite.generate_session(request_token, api_secret=KITE_API_SECRET)
    access_token: str = data["access_token"]
    log.info("Got access_token: %s…", access_token[:8])
    return access_token


# ── Step 5: Persist token to Railway env vars (survives restarts) ─────────────

def persist_to_railway(kite_access_token: str) -> None:
    """
    Update KITE_ACCESS_TOKEN in Railway's environment variables via GraphQL API.
    This ensures the token is used on next container restart too.
    """
    log.info("Persisting token to Railway env vars …")
    headers = {
        "Authorization": f"Bearer {RAILWAY_TOKEN}",
        "Content-Type": "application/json",
    }

    # Step A: resolve projectId + environmentId from the serviceId
    query = """
    query getService($serviceId: String!) {
      service(id: $serviceId) {
        projectId
        serviceInstances { edges { node { environmentId } } }
      }
    }
    """
    resp = httpx.post(
        RAILWAY_GQL,
        json={"query": query, "variables": {"serviceId": RAILWAY_SERVICE_ID}},
        headers=headers,
        timeout=30,
    )
    resp.raise_for_status()
    data = resp.json()
    service = data["data"]["service"]
    project_id = service["projectId"]
    env_id = service["serviceInstances"]["edges"][0]["node"]["environmentId"]

    # Step B: upsert KITE_ACCESS_TOKEN
    mutation = """
    mutation variableUpsert($input: VariableUpsertInput!) {
      variableUpsert(input: $input)
    }
    """
    upsert_input = {
        "projectId": project_id,
        "serviceId": RAILWAY_SERVICE_ID,
        "environmentId": env_id,
        "name": "KITE_ACCESS_TOKEN",
        "value": kite_access_token,
    }
    resp = httpx.post(
        RAILWAY_GQL,
        json={"query": mutation, "variables": {"input": upsert_input}},
        headers=headers,
        timeout=30,
    )
    resp.raise_for_status()
    log.info("Railway env var KITE_ACCESS_TOKEN updated successfully.")


# ── Step 6: Hot-swap via live API ──────────────────────────────────────────────

def push_token(kite_access_token: str, manager_jwt: str) -> None:
    """POST new access_token to the Railway API hot-swap endpoint."""
    url = f"{RAILWAY_API_URL}/kite/token"
    log.info("Pushing token to %s …", url)
    resp = httpx.post(
        url,
        json={"access_token": kite_access_token},
        headers={"Authorization": f"Bearer {manager_jwt}"},
        timeout=30,
    )
    resp.raise_for_status()
    log.info("Token pushed successfully: %s", resp.json())


# ── Main ───────────────────────────────────────────────────────────────────────

def main() -> None:
    # Get a fresh manager JWT first (no manual token needed)
    manager_jwt = get_manager_token()

    with httpx.Client(follow_redirects=True, timeout=30) as client:
        request_id = login(client)
        twofa(client, request_id)
        request_token = get_request_token(client)

    kite_access_token = exchange_token(request_token)
    persist_to_railway(kite_access_token)   # update env var (restart-safe)
    push_token(kite_access_token, manager_jwt)  # hot-swap running ticker
    log.info("Done — Kite token refreshed for today.")


if __name__ == "__main__":
    main()
