"""PDF portfolio report generation using reportlab."""
import asyncio
import io
from datetime import date, datetime, timezone

import yfinance as yf
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import Response
from reportlab.graphics.charts.piecharts import Pie
from reportlab.graphics.shapes import Drawing, String
from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import cm
from reportlab.platypus import (
    HRFlowable,
    Paragraph,
    SimpleDocTemplate,
    Spacer,
    Table,
    TableStyle,
)

from app.dependencies import require_manager
from app.services.supabase_client import get_supabase_admin

router = APIRouter()

# ── Colour palette (matches app dark theme) ──────────────────────────────────
_ACCENT   = colors.HexColor("#4F8CFF")
_GREEN    = colors.HexColor("#34D399")
_RED      = colors.HexColor("#F87171")
_YELLOW   = colors.HexColor("#FBBF24")
_DARK_BG  = colors.HexColor("#151B2E")
_BORDER   = colors.HexColor("#1D2540")
_TEXT     = colors.HexColor("#E8ECF4")
_MUTED    = colors.HexColor("#8B95B0")
_WHITE    = colors.white

CHART_COLORS = [
    colors.HexColor("#4F8CFF"),
    colors.HexColor("#34D399"),
    colors.HexColor("#FBBF24"),
    colors.HexColor("#F87171"),
    colors.HexColor("#A78BFA"),
    colors.HexColor("#FB923C"),
    colors.HexColor("#38BDF8"),
]


def _fetch_price(symbol: str) -> float | None:
    try:
        info = yf.Ticker(f"{symbol}.NS").fast_info
        price = getattr(info, "last_price", None)
        if price:
            return float(price)
        hist = yf.Ticker(f"{symbol}.NS").history(period="1d")
        if not hist.empty:
            return float(hist["Close"].iloc[-1])
    except Exception:
        pass
    return None


def _build_pie(labels: list[str], values: list[float], width: float = 200, height: float = 150) -> Drawing:
    d = Drawing(width, height)
    pie = Pie()
    pie.x = width // 2 - 55
    pie.y = height // 2 - 55
    pie.width = 110
    pie.height = 110
    pie.data = values
    pie.labels = [f"{v:.1f}%" for v in values]
    pie.sideLabels = 0
    pie.simpleLabels = 1
    for i, _ in enumerate(values):
        pie.slices[i].fillColor = CHART_COLORS[i % len(CHART_COLORS)]
        pie.slices[i].strokeColor = colors.white
        pie.slices[i].strokeWidth = 0.5
    d.add(pie)
    return d


def _generate_pdf(
    manager_name: str,
    client: dict,
    holdings: list[dict],
    transactions: list[dict],
    live_prices: dict[str, float],
) -> bytes:
    buf = io.BytesIO()
    doc = SimpleDocTemplate(
        buf,
        pagesize=A4,
        leftMargin=2 * cm,
        rightMargin=2 * cm,
        topMargin=2 * cm,
        bottomMargin=2 * cm,
    )
    styles = getSampleStyleSheet()
    story = []

    title_style = ParagraphStyle(
        "ReportTitle",
        parent=styles["Title"],
        textColor=_ACCENT,
        fontSize=22,
        spaceAfter=4,
    )
    sub_style = ParagraphStyle(
        "SubTitle",
        parent=styles["Normal"],
        textColor=_MUTED,
        fontSize=10,
        spaceAfter=2,
    )
    section_style = ParagraphStyle(
        "Section",
        parent=styles["Normal"],
        textColor=_ACCENT,
        fontSize=13,
        fontName="Helvetica-Bold",
        spaceAfter=8,
        spaceBefore=14,
    )
    normal = ParagraphStyle(
        "Normal2",
        parent=styles["Normal"],
        textColor=_TEXT,
        fontSize=9,
    )

    report_date = datetime.now(timezone.utc).strftime("%B %d, %Y")

    # ── Header ────────────────────────────────────────────────────────────────
    story.append(Paragraph("InsightfulPortfolio", title_style))
    story.append(Paragraph("Portfolio Report", sub_style))
    story.append(HRFlowable(width="100%", thickness=1, color=_ACCENT, spaceAfter=10))

    # Client / manager info
    info_data = [
        ["Client", client.get("full_name", "—"), "Report Date", report_date],
        ["Email", client.get("email", "—"), "Manager", manager_name],
    ]
    info_tbl = Table(info_data, colWidths=[3 * cm, 6 * cm, 3 * cm, 5.5 * cm])
    info_tbl.setStyle(
        TableStyle([
            ("FONTNAME",  (0, 0), (-1, -1), "Helvetica"),
            ("FONTSIZE",  (0, 0), (-1, -1), 9),
            ("TEXTCOLOR", (0, 0), (0, -1), _MUTED),
            ("TEXTCOLOR", (2, 0), (2, -1), _MUTED),
            ("TEXTCOLOR", (1, 0), (1, -1), _TEXT),
            ("TEXTCOLOR", (3, 0), (3, -1), _TEXT),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
            ("TOPPADDING",    (0, 0), (-1, -1), 4),
        ])
    )
    story.append(info_tbl)
    story.append(Spacer(1, 14))

    # ── KPI Summary ────────────────────────────────────────────────────────────
    invested_value = sum(
        h["quantity"] * h["avg_cost"] for h in holdings
    )
    current_value = 0.0
    for h in holdings:
        sym = h["symbol"]
        lp = live_prices.get(sym) or h.get("manual_price") or h["avg_cost"]
        current_value += h["quantity"] * lp

    returns = current_value - invested_value
    returns_pct = (returns / invested_value * 100) if invested_value else 0.0
    returns_color = _GREEN if returns >= 0 else _RED

    kpi_data = [
        ["Invested Value", "Current Value", "Total Returns", "Return %"],
        [
            f"₹{invested_value:,.0f}",
            f"₹{current_value:,.0f}",
            f"₹{returns:+,.0f}",
            f"{returns_pct:+.2f}%",
        ],
    ]
    kpi_tbl = Table(kpi_data, colWidths=[4.2 * cm] * 4)
    kpi_tbl.setStyle(
        TableStyle([
            ("FONTNAME",     (0, 0), (-1, 0), "Helvetica-Bold"),
            ("FONTSIZE",     (0, 0), (-1, 0), 8),
            ("TEXTCOLOR",    (0, 0), (-1, 0), _MUTED),
            ("FONTNAME",     (0, 1), (-1, 1), "Helvetica-Bold"),
            ("FONTSIZE",     (0, 1), (-1, 1), 13),
            ("TEXTCOLOR",    (0, 1), (1, 1), _TEXT),
            ("TEXTCOLOR",    (2, 1), (3, 1), returns_color),
            ("ALIGN",        (0, 0), (-1, -1), "CENTER"),
            ("BOTTOMPADDING",(0, 0), (-1, -1), 8),
            ("TOPPADDING",   (0, 0), (-1, -1), 8),
            ("LINEABOVE",    (0, 0), (-1, 0), 0.5, _BORDER),
            ("LINEBELOW",    (0, -1), (-1, -1), 0.5, _BORDER),
        ])
    )
    story.append(Paragraph("Summary", section_style))
    story.append(kpi_tbl)

    # ── Asset Allocation Pie ───────────────────────────────────────────────────
    if holdings:
        story.append(Paragraph("Asset Allocation", section_style))
        type_values: dict[str, float] = {}
        for h in holdings:
            lp = live_prices.get(h["symbol"]) or h.get("manual_price") or h["avg_cost"]
            val = h["quantity"] * lp
            t = h.get("asset_type", "other").replace("_", " ").title()
            type_values[t] = type_values.get(t, 0) + val

        total_cv = sum(type_values.values()) or 1
        labels = list(type_values.keys())
        pcts = [v / total_cv * 100 for v in type_values.values()]

        pie_drawing = _build_pie(labels, pcts)
        # Legend table beside the pie
        legend_rows = [
            [Paragraph(f"<font color='#{CHART_COLORS[i % len(CHART_COLORS)].hexval()[2:]}'>■</font> {labels[i]}",
                       normal),
             Paragraph(f"{pcts[i]:.1f}%", normal)]
            for i in range(len(labels))
        ]
        legend_tbl = Table(legend_rows, colWidths=[5 * cm, 2 * cm])
        legend_tbl.setStyle(TableStyle([
            ("FONTSIZE", (0, 0), (-1, -1), 9),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 3),
        ]))
        alloc_tbl = Table([[pie_drawing, legend_tbl]], colWidths=[10 * cm, 7.5 * cm])
        alloc_tbl.setStyle(TableStyle([("VALIGN", (0, 0), (-1, -1), "MIDDLE")]))
        story.append(alloc_tbl)

    # ── Holdings Table ─────────────────────────────────────────────────────────
    if holdings:
        story.append(Paragraph("Holdings", section_style))
        h_headers = ["Symbol", "Type", "Qty", "Avg Cost", "Cur. Price", "Value", "P&L"]
        h_rows = [h_headers]
        for h in holdings:
            sym = h["symbol"]
            lp = live_prices.get(sym) or h.get("manual_price") or h["avg_cost"]
            val = h["quantity"] * lp
            pl = val - h["quantity"] * h["avg_cost"]
            h_rows.append([
                sym,
                h.get("asset_type", "—").replace("_", " "),
                f"{h['quantity']:g}",
                f"₹{h['avg_cost']:,.2f}",
                f"₹{lp:,.2f}",
                f"₹{val:,.0f}",
                f"₹{pl:+,.0f}",
            ])
        h_tbl = Table(h_rows, colWidths=[2.2*cm, 2.2*cm, 1.5*cm, 2.5*cm, 2.5*cm, 2.5*cm, 2.5*cm])
        h_style = [
            ("BACKGROUND",   (0, 0), (-1, 0), _DARK_BG),
            ("TEXTCOLOR",    (0, 0), (-1, 0), _ACCENT),
            ("FONTNAME",     (0, 0), (-1, 0), "Helvetica-Bold"),
            ("FONTSIZE",     (0, 0), (-1, -1), 8),
            ("TEXTCOLOR",    (0, 1), (-1, -1), _TEXT),
            ("ALIGN",        (2, 0), (-1, -1), "RIGHT"),
            ("ROWBACKGROUNDS",(0, 1), (-1, -1), [colors.HexColor("#111628"), colors.HexColor("#151B2E")]),
            ("GRID",         (0, 0), (-1, -1), 0.3, _BORDER),
            ("BOTTOMPADDING",(0, 0), (-1, -1), 4),
            ("TOPPADDING",   (0, 0), (-1, -1), 4),
        ]
        for i, h in enumerate(holdings, start=1):
            sym = h["symbol"]
            lp = live_prices.get(sym) or h.get("manual_price") or h["avg_cost"]
            pl = (lp - h["avg_cost"]) * h["quantity"]
            h_style.append(("TEXTCOLOR", (6, i), (6, i), _GREEN if pl >= 0 else _RED))
        h_tbl.setStyle(TableStyle(h_style))
        story.append(h_tbl)

    # ── Last 10 Transactions ───────────────────────────────────────────────────
    if transactions:
        story.append(Paragraph("Recent Transactions (last 10)", section_style))
        tx_headers = ["Date", "Symbol", "Type", "Qty", "Price", "Total"]
        tx_rows = [tx_headers]
        for tx in transactions[:10]:
            total = tx["quantity"] * tx["price"]
            tx_rows.append([
                tx.get("date", "—")[:10],
                tx["symbol"],
                tx["type"].capitalize(),
                f"{tx['quantity']:g}",
                f"₹{tx['price']:,.2f}",
                f"₹{total:,.0f}",
            ])
        tx_tbl = Table(tx_rows, colWidths=[2.5*cm, 2.5*cm, 2*cm, 1.8*cm, 3.5*cm, 3.5*cm])
        tx_color_map = {"Buy": _GREEN, "Sell": _RED, "Dividend": _YELLOW}
        tx_style = [
            ("BACKGROUND",   (0, 0), (-1, 0), _DARK_BG),
            ("TEXTCOLOR",    (0, 0), (-1, 0), _ACCENT),
            ("FONTNAME",     (0, 0), (-1, 0), "Helvetica-Bold"),
            ("FONTSIZE",     (0, 0), (-1, -1), 8),
            ("TEXTCOLOR",    (0, 1), (-1, -1), _TEXT),
            ("ROWBACKGROUNDS",(0, 1),(-1,-1),[colors.HexColor("#111628"), colors.HexColor("#151B2E")]),
            ("GRID",         (0, 0), (-1, -1), 0.3, _BORDER),
            ("BOTTOMPADDING",(0, 0), (-1, -1), 4),
            ("TOPPADDING",   (0, 0), (-1, -1), 4),
        ]
        for i, tx in enumerate(transactions[:10], start=1):
            col = tx_color_map.get(tx["type"].capitalize(), _TEXT)
            tx_style.append(("TEXTCOLOR", (2, i), (2, i), col))
        tx_tbl.setStyle(TableStyle(tx_style))
        story.append(tx_tbl)

    # ── Footer ─────────────────────────────────────────────────────────────────
    story.append(Spacer(1, 20))
    story.append(HRFlowable(width="100%", thickness=0.5, color=_BORDER))
    story.append(Paragraph(
        f"Generated by InsightfulPortfolio · {report_date} · Prices are indicative",
        ParagraphStyle("Footer", parent=styles["Normal"], textColor=_MUTED, fontSize=7, alignment=1),
    ))

    doc.build(story)
    return buf.getvalue()


@router.get("/portfolio/{client_id}")
async def get_portfolio_report(client_id: str, manager=Depends(require_manager)):
    """Generate and return a PDF portfolio report for a client."""
    supabase = get_supabase_admin()

    # Verify client belongs to this manager
    client_result = (
        supabase.table("users")
        .select("*")
        .eq("id", client_id)
        .eq("manager_id", manager.id)
        .single()
        .execute()
    )
    if not client_result.data:
        raise HTTPException(status_code=404, detail="Client not found or not assigned to you")
    client = client_result.data

    # Fetch manager name
    mgr_result = (
        supabase.table("users").select("full_name").eq("id", manager.id).single().execute()
    )
    manager_name = mgr_result.data.get("full_name", "Manager") if mgr_result.data else "Manager"

    # Fetch portfolios
    portfolios_result = (
        supabase.table("portfolios").select("id").eq("client_id", client_id).execute()
    )
    portfolio_ids = [p["id"] for p in (portfolios_result.data or [])]
    if not portfolio_ids:
        raise HTTPException(status_code=404, detail="No portfolios found for this client")

    # Fetch holdings from first/only portfolio
    holdings_result = (
        supabase.table("holdings")
        .select("*")
        .in_("portfolio_id", portfolio_ids)
        .execute()
    )
    holdings = holdings_result.data or []

    # Fetch transactions (most recent 10)
    transactions_result = (
        supabase.table("transactions")
        .select("*")
        .in_("portfolio_id", portfolio_ids)
        .order("date", desc=True)
        .limit(10)
        .execute()
    )
    transactions = transactions_result.data or []

    # Fetch live prices for stock/ETF holdings in thread pool
    tradeable_symbols = [
        h["symbol"] for h in holdings
        if h.get("asset_type") in ("stock", "etf")
    ]
    loop = asyncio.get_event_loop()
    live_prices: dict[str, float] = {}
    for sym in set(tradeable_symbols):
        price = await loop.run_in_executor(None, _fetch_price, sym)
        if price:
            live_prices[sym] = price

    # Generate PDF in thread pool (reportlab is sync)
    pdf_bytes = await loop.run_in_executor(
        None,
        _generate_pdf,
        manager_name,
        client,
        holdings,
        transactions,
        live_prices,
    )

    client_name_safe = client.get("full_name", "client").replace(" ", "_")
    filename = f"portfolio_{client_name_safe}_{date.today().isoformat()}.pdf"

    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename={filename}"},
    )
