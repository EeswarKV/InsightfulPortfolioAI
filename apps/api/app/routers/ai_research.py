from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
import httpx
import os
from dotenv import load_dotenv

from ..dependencies import get_current_user

load_dotenv()

router = APIRouter(prefix="/ai", tags=["ai-research"])

ANTHROPIC_API_KEY = os.getenv("ANTHROPIC_API_KEY")


class AIAnalysisRequest(BaseModel):
    company_name: str
    symbol: str
    sector: str = "N/A"
    market_cap: str = "N/A"
    pe: str = "N/A"
    forward_pe: str = "N/A"
    eps: str = "N/A"
    revenue: str = "N/A"
    revenue_growth: str = "N/A"
    gross_margin: str = "N/A"
    operating_margin: str = "N/A"
    net_margin: str = "N/A"
    roe: str = "N/A"
    debt_to_equity: str = "N/A"
    current_ratio: str = "N/A"
    dividend_yield: str = "N/A"
    beta: str = "N/A"
    fifty_two_high: str = "N/A"
    fifty_two_low: str = "N/A"
    price: str = "N/A"
    change: str = "N/A"
    description: str = ""


@router.post("/analyze-stock")
async def analyze_stock(
    request: AIAnalysisRequest,
    user=Depends(get_current_user),
):
    """
    AI-powered multibagger stock analysis using Claude.
    Proxies the request to Anthropic API to avoid CORS issues.
    """
    if not ANTHROPIC_API_KEY:
        raise HTTPException(
            status_code=500,
            detail="Anthropic API key not configured on server",
        )

    # Calculate PEG ratio
    try:
        peg_ratio = (
            f"{float(request.pe) / (float(request.eps) * 100):.2f}"
            if request.pe and request.eps
            else "N/A"
        )
    except (ValueError, ZeroDivisionError):
        peg_ratio = "N/A"

    system_prompt = """You are an expert Indian stock market analyst specializing in identifying multibagger stocks using the 8 PROVEN PATTERNS framework:

THE 8 MULTIBAGGER PATTERNS:
1. GLOBAL TO LOCAL (10-15 Year Lag): India trails US/China by 10-15 years. What worked there will work here. Find the Indian equivalent before it's obvious.
2. NEW SECTOR EACH BULL MARKET: Like fashion, each cycle has new winners. Avoid last cycle's darlings. Defence is hot now, chemicals were before. Find the new theme.
3. ABOVE AVERAGE GROWTH: Company growing 25-30% when sector grows 10%. That gap = alpha.
4. MASSIVE TAM (₹50,000Cr+): Small company in small market = ceiling. Small company in huge market = runway. Semiconductors/AI have massive TAM.
5. FIRST-GEN ENTREPRENEURS: Hungry founders > inherited businesses. Hunger = better capital allocation.
6. ALL-TIME HIGHS: Counterintuitive but true. New highs = strong business, not just speculation. Strong price = strong fundamentals signal.
7. SMALL MARKET CAP (<₹5,000 Cr): Easier to double revenue. Small base = explosive potential with tailwinds.
8. FAIR VALUATION (not cheap): High PE is fine if growth justifies it. 50 PE with 25% growth = reasonable. Question: Is PE justified by earnings visibility?

SCORING FRAMEWORK (100 points):

LAYER 1 - MACRO FILTER (25 points):
- Bull market phase alignment (5pts)
- Sector is NEW this cycle, NOT last cycle's winner (5pts)
- Government/policy tailwind strength (5pts)
- FII/DII institutional interest (5pts)
- Sector momentum vs market (5pts)

LAYER 2 - SECTOR FILTER (25 points):
- Global trend proven in US/China (10-15yr lag pattern) (5pts)
- TAM size ₹50,000Cr+ for runway (5pts)
- PLI/Policy scheme backing (5pts)
- Early in growth curve, not saturated (5pts)
- Competitive intensity - not overcrowded (5pts)

LAYER 3 - STOCK FILTER (50 points):
1. Revenue CAGR >25% (3Y) vs sector avg 10-15% (7pts)
2. PAT growth faster than revenue (margin expansion) (6pts)
3. Order Book/Revenue visibility 2-3x (6pts)
4. Market Cap <₹5,000 Cr (max upside), up to ₹20,000Cr ok (6pts)
5. First-gen entrepreneur, >50% holding, zero pledge (7pts)
6. Price near/at All-Time High (not broken downtrend) (6pts)
7. PEG <1.5 ideal, <2 acceptable (growth justifies PE) (6pts)
8. Indian proxy of proven global model (6pts)

VERDICT THRESHOLDS:
- 75-100: STRONG BUY 🟢 (High Conviction Multibagger)
- 55-74: WATCHLIST 🟡 (Wait for entry trigger)
- 35-54: PASS 🟠 (Revisit in 6 months)
- Below 35: REJECT 🔴 (Avoid)

CURRENT INDIA CONTEXT (Feb 2026):
Hot themes: Defence & Aerospace, EMS/Electronics Manufacturing, AI Infrastructure, Power/Energy transition, Railways, Data Centers, Quick Commerce
Policy tailwinds: PLI schemes (₹2 lakh Cr), Make in India, Defence indigenization (Atmanirbhar), Semiconductor mission
Avoid: Last cycle winners (IT Services, Pharma generics, Basic chemicals)
Market phase: Mid-to-late bull, selective stock picking

You must respond ONLY in valid JSON format with the exact structure provided."""

    user_prompt = f"""Analyze this stock comprehensively using the 3-layer multibagger framework:

COMPANY: {request.company_name} ({request.symbol})
SECTOR: {request.sector}
MARKET CAP: {request.market_cap}

FINANCIAL METRICS:
- P/E Ratio: {request.pe}
- Forward P/E: {request.forward_pe}
- EPS: {request.eps}
- Revenue: {request.revenue}
- Revenue Growth: {request.revenue_growth}
- Gross Margin: {request.gross_margin}
- Operating Margin: {request.operating_margin}
- Net Margin: {request.net_margin}
- ROE: {request.roe}
- Debt/Equity: {request.debt_to_equity}
- Current Ratio: {request.current_ratio}
- Dividend Yield: {request.dividend_yield}
- Beta: {request.beta}
- 52W High: {request.fifty_two_high}
- 52W Low: {request.fifty_two_low}
- Current Price: {request.price}
- Today's Change: {request.change}
- PEG Ratio (calculated): {peg_ratio}

DESCRIPTION:
{request.description}

Score this company strictly using the 8 PATTERNS framework. Use your knowledge of Indian markets and this specific company to provide accurate scoring. Return JSON with this structure:
{{
  "company": "{request.company_name}",
  "sector": "{request.sector}",
  "verdict": "STRONG BUY/WATCHLIST/PASS/REJECT",
  "verdictEmoji": "🟢/🟡/🟠/🔴",
  "totalScore": 0,
  "macro": {{
    "score": 0,
    "maxScore": 25,
    "summary": "brief summary",
    "breakdown": [
      {{"param": "Bull Market Phase Alignment", "score": 0, "max": 5, "note": "reasoning"}},
      {{"param": "New Sector This Cycle (Not Last)", "score": 0, "max": 5, "note": "reasoning"}},
      {{"param": "Government/Policy Tailwind", "score": 0, "max": 5, "note": "reasoning"}},
      {{"param": "Institutional Interest", "score": 0, "max": 5, "note": "reasoning"}},
      {{"param": "Sector Momentum", "score": 0, "max": 5, "note": "reasoning"}}
    ]
  }},
  "sector": {{
    "score": 0,
    "maxScore": 25,
    "summary": "brief summary",
    "breakdown": [
      {{"param": "Global Trend Proven (US/China 10-15Y)", "score": 0, "max": 5, "note": "reasoning"}},
      {{"param": "TAM Size ₹50,000Cr+ Runway", "score": 0, "max": 5, "note": "reasoning"}},
      {{"param": "PLI/Policy Backing", "score": 0, "max": 5, "note": "reasoning"}},
      {{"param": "Early in Growth Curve", "score": 0, "max": 5, "note": "reasoning"}},
      {{"param": "Competitive Intensity", "score": 0, "max": 5, "note": "reasoning"}}
    ]
  }},
  "stock": {{
    "score": 0,
    "maxScore": 50,
    "summary": "brief summary",
    "breakdown": [
      {{"param": "Revenue CAGR >25% (Above Avg Growth)", "score": 0, "max": 7, "note": "reasoning"}},
      {{"param": "PAT Growth > Revenue (Margin Expansion)", "score": 0, "max": 6, "note": "reasoning"}},
      {{"param": "Order Book 2-3x Revenue Visibility", "score": 0, "max": 6, "note": "reasoning"}},
      {{"param": "Small Market Cap <₹5,000 Cr", "score": 0, "max": 6, "note": "reasoning"}},
      {{"param": "First-Gen Entrepreneur Quality", "score": 0, "max": 7, "note": "reasoning"}},
      {{"param": "Price Near/At All-Time High", "score": 0, "max": 6, "note": "reasoning"}},
      {{"param": "Fair Valuation (PEG <1.5, Growth Justifies PE)", "score": 0, "max": 6, "note": "reasoning"}},
      {{"param": "Indian Proxy of Global Model", "score": 0, "max": 6, "note": "reasoning"}}
    ]
  }},
  "keyStrengths": ["strength1", "strength2", "strength3"],
  "redFlags": ["flag1", "flag2"],
  "missingData": ["missing data point"],
  "actionableInsight": "specific action investor should take",
  "pegRatio": "{peg_ratio}",
  "comparablePeers": ["peer1", "peer2"],
  "patternsCovered": {{
    "pattern1_globalToLocal": {{"covered": true/false, "detail": "explanation"}},
    "pattern2_newSectorThisCycle": {{"covered": true/false, "detail": "explanation"}},
    "pattern3_aboveAvgGrowth": {{"covered": true/false, "detail": "explanation"}},
    "pattern4_massiveTAM": {{"covered": true/false, "detail": "explanation"}},
    "pattern5_firstGenFounder": {{"covered": true/false, "detail": "explanation"}},
    "pattern6_allTimeHigh": {{"covered": true/false, "detail": "explanation"}},
    "pattern7_smallMarketCap": {{"covered": true/false, "detail": "explanation"}},
    "pattern8_fairValuation": {{"covered": true/false, "detail": "explanation"}}
  }}
}}"""

    try:
        async with httpx.AsyncClient() as client:
            response = await client.post(
                "https://api.anthropic.com/v1/messages",
                headers={
                    "Content-Type": "application/json",
                    "x-api-key": ANTHROPIC_API_KEY,
                    "anthropic-version": "2023-06-01",
                },
                json={
                    "model": "claude-sonnet-4-20250514",
                    "max_tokens": 3000,
                    "temperature": 0,
                    "system": system_prompt,
                    "messages": [{"role": "user", "content": user_prompt}],
                },
                timeout=60.0,
            )

            if response.status_code != 200:
                raise HTTPException(
                    status_code=response.status_code,
                    detail=f"Anthropic API error: {response.text}",
                )

            data = response.json()
            return data

    except httpx.HTTPError as e:
        raise HTTPException(status_code=500, detail=f"Failed to call Anthropic API: {str(e)}")
