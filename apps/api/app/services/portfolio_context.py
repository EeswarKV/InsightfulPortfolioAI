from app.services.supabase_client import get_supabase_admin


def build_client_context(client_id: str) -> dict:
    """Fetch portfolio data for a client to inject into AI chat context."""
    supabase = get_supabase_admin()

    # Get client info
    client = (
        supabase.table("users")
        .select("*")
        .eq("id", client_id)
        .single()
        .execute()
    )
    client_data = client.data if client.data else {}

    # Get manager info
    manager_data = None
    if client_data.get("manager_id"):
        manager = (
            supabase.table("users")
            .select("full_name, email")
            .eq("id", client_data["manager_id"])
            .single()
            .execute()
        )
        manager_data = manager.data

    # Get portfolios
    portfolios = (
        supabase.table("portfolios")
        .select("*")
        .eq("client_id", client_id)
        .execute()
    )

    holdings_by_portfolio = {}
    transactions_by_portfolio = {}
    for p in portfolios.data or []:
        pid = p["id"]
        h = (
            supabase.table("holdings")
            .select("*")
            .eq("portfolio_id", pid)
            .execute()
        )
        holdings_by_portfolio[pid] = h.data or []

        t = (
            supabase.table("transactions")
            .select("*")
            .eq("portfolio_id", pid)
            .order("date", desc=True)
            .limit(20)
            .execute()
        )
        transactions_by_portfolio[pid] = t.data or []

    return {
        "client": client_data,
        "manager": manager_data,
        "portfolios": portfolios.data or [],
        "holdings": holdings_by_portfolio,
        "transactions": transactions_by_portfolio,
    }


def build_manager_context(manager_id: str) -> dict:
    """Fetch all client portfolio data for a fund manager to inject into AI chat context."""
    supabase = get_supabase_admin()

    # Get manager info
    manager = (
        supabase.table("users")
        .select("*")
        .eq("id", manager_id)
        .single()
        .execute()
    )
    manager_data = manager.data if manager.data else {}

    # Get all clients under this manager
    clients = (
        supabase.table("users")
        .select("*")
        .eq("manager_id", manager_id)
        .eq("role", "client")
        .execute()
    )
    client_list = clients.data or []

    # Get all portfolios for these clients
    client_ids = [c["id"] for c in client_list]
    all_portfolios = []
    holdings_by_portfolio = {}
    transactions_by_portfolio = {}

    for cid in client_ids:
        portfolios = (
            supabase.table("portfolios")
            .select("*")
            .eq("client_id", cid)
            .execute()
        )
        for p in portfolios.data or []:
            all_portfolios.append(p)
            pid = p["id"]
            h = (
                supabase.table("holdings")
                .select("*")
                .eq("portfolio_id", pid)
                .execute()
            )
            holdings_by_portfolio[pid] = h.data or []

            t = (
                supabase.table("transactions")
                .select("*")
                .eq("portfolio_id", pid)
                .order("date", desc=True)
                .limit(10)
                .execute()
            )
            transactions_by_portfolio[pid] = t.data or []

    return {
        "manager": manager_data,
        "clients": client_list,
        "portfolios": all_portfolios,
        "holdings": holdings_by_portfolio,
        "transactions": transactions_by_portfolio,
    }


def format_manager_system_prompt(ctx: dict) -> str:
    """Format the manager's portfolio context into a system prompt string."""
    manager = ctx["manager"]
    manager_name = manager.get("full_name") or manager.get("email", "Fund Manager")
    clients = ctx["clients"]

    parts = [
        f"You are PortfolioAI, the personal AI assistant for fund manager {manager_name}.",
        f"You manage {len(clients)} client portfolio(s).",
        "",
    ]

    total_aum = 0.0

    for client in clients:
        client_name = client.get("full_name") or client.get("email", "Client")
        client_portfolios = [p for p in ctx["portfolios"] if p.get("client_id") == client["id"]]

        parts.append(f"## Client: {client_name} ({client.get('email', '')})")

        for portfolio in client_portfolios:
            pid = portfolio["id"]
            pname = portfolio.get("name", "Portfolio")
            holdings = ctx["holdings"].get(pid, [])
            transactions = ctx["transactions"].get(pid, [])

            portfolio_value = sum(
                float(h.get("quantity", 0)) * float(h.get("avg_cost", 0))
                for h in holdings
            )
            total_aum += portfolio_value

            parts.append(f"### Portfolio: {pname} ({len(holdings)} holdings, Value: Rs.{portfolio_value:,.2f})")

            if holdings:
                for h in holdings:
                    qty = h.get("quantity", 0)
                    cost = h.get("avg_cost", 0)
                    val = float(qty) * float(cost)
                    parts.append(
                        f"  - {h['symbol']}: {qty} units @ Rs.{float(cost):,.2f} = Rs.{val:,.2f} ({h.get('asset_type', 'stock')})"
                    )

            if transactions:
                parts.append(f"  Recent transactions:")
                for t in transactions[:5]:
                    parts.append(
                        f"  - {t['type'].upper()} {t.get('quantity', 0)} x {t['symbol']} @ Rs.{float(t.get('price', 0)):,.2f} on {t.get('date', 'N/A')}"
                    )

        parts.append("")

    parts.insert(2, f"Total Assets Under Management (AUM): Rs.{total_aum:,.2f}")
    parts.insert(3, "")

    parts.extend([
        "Your role as the fund manager's AI assistant:",
        "- Provide portfolio analysis across all clients: total AUM, allocation breakdown, concentration risk",
        "- Help generate reports: summary of holdings, performance overview, client-by-client breakdown",
        "- Analyze sector allocation, diversification, and risk exposure across the entire book",
        "- Suggest rebalancing opportunities and flag over-concentrated positions",
        "- Provide Indian stock market analysis (NSE/BSE), sector trends, and financial metrics",
        "- Help with investment research and strategy planning",
        "- Be conversational but professional. Use INR (Rs.) for currency.",
        "- Never give definitive 'buy' or 'sell' advice — frame as analysis and considerations",
        "- Reference Indian market indices (NIFTY 50, SENSEX) when relevant",
        "- Keep responses concise (2-4 paragraphs max) unless detailed analysis is requested",
        "- When asked to generate a report, format it clearly with headers, bullet points, and tables",
    ])

    return "\n".join(parts)


def format_client_system_prompt(ctx: dict) -> str:
    """Format the portfolio context into a system prompt string."""
    client = ctx["client"]
    manager = ctx["manager"]
    client_name = client.get("full_name") or client.get("email", "Client")
    manager_name = manager.get("full_name", "your fund manager") if manager else "your fund manager"

    parts = [
        f"You are PortfolioAI, the personal portfolio assistant for {client_name}.",
        f"You work on behalf of their fund manager, {manager_name}.",
        "",
    ]

    for portfolio in ctx["portfolios"]:
        pid = portfolio["id"]
        pname = portfolio.get("name", "Portfolio")
        holdings = ctx["holdings"].get(pid, [])
        transactions = ctx["transactions"].get(pid, [])

        parts.append(f"## Portfolio: {pname}")

        if holdings:
            total_value = sum(
                float(h.get("quantity", 0)) * float(h.get("avg_cost", 0))
                for h in holdings
            )
            parts.append(f"### Holdings ({len(holdings)} total, Invested: Rs.{total_value:,.2f}):")
            for h in holdings:
                qty = h.get("quantity", 0)
                cost = h.get("avg_cost", 0)
                val = float(qty) * float(cost)
                parts.append(
                    f"- {h['symbol']}: {qty} units @ Rs.{float(cost):,.2f} = Rs.{val:,.2f} ({h.get('asset_type', 'stock')})"
                )
        else:
            parts.append("### Holdings: None yet")

        if transactions:
            parts.append(f"\n### Recent Transactions:")
            for t in transactions[:10]:
                parts.append(
                    f"- {t['type'].upper()} {t.get('quantity', 0)} x {t['symbol']} @ Rs.{float(t.get('price', 0)):,.2f} on {t.get('date', 'N/A')}"
                )

        parts.append("")

    parts.extend([
        "Your role:",
        "- Answer questions about this client's specific holdings, portfolio composition, and transaction history",
        "- Explain why particular stocks/funds may have been chosen (based on sector diversification, value investing, growth potential, etc.)",
        "- Provide portfolio analysis: concentration risk, sector allocation, performance estimates",
        "- Be conversational but professional. Use INR (Rs.) for currency.",
        "- Never give definitive 'buy' or 'sell' advice — frame as analysis and considerations",
        "- You cannot make changes to the portfolio — only the fund manager can do that",
        "- Always use INR for currency unless asked otherwise",
        "- Reference Indian market indices (NIFTY 50, SENSEX) when relevant",
        "- Keep responses concise (2-4 paragraphs max) unless detailed analysis is requested",
        "",
        "If the client wants to speak with their fund manager personally, guide them through scheduling:",
        "1. Ask for their preferred date and time",
        "2. Ask if they prefer phone call or email",
        "3. Ask for their phone number or confirm their email",
        "4. Once you have ALL three pieces of information, include this exact tag at the end of your response:",
        "",
        '[SCHEDULE_CALL]{"preferred_datetime": "...", "contact_method": "phone", "contact_value": "..."}[/SCHEDULE_CALL]',
        "",
        "Replace phone with email if they prefer email. The app will automatically create the request.",
    ])

    return "\n".join(parts)
