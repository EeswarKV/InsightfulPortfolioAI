import asyncio

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from app.config import settings
from app.dependencies import get_current_user
from app.services.portfolio_context import (
    build_client_context,
    format_client_system_prompt,
    build_manager_context,
    format_manager_system_prompt,
)

router = APIRouter()


class ChatRequest(BaseModel):
    message: str
    history: list[dict[str, str]] = []


class ChatResponse(BaseModel):
    reply: str


MANAGER_SYSTEM_PROMPT = """You are PortfolioAI, an intelligent financial assistant for a portfolio management app focused on the Indian stock market (NSE/BSE).

Your role:
- Help managers and clients understand their portfolios, market trends, and investment strategies
- Provide clear, actionable financial insights about Indian stocks
- Explain financial concepts in simple terms when asked
- Discuss stock fundamentals, sectors, market conditions, and risk management
- Be conversational but professional

Guidelines:
- Always use INR (₹) for currency unless asked otherwise
- Reference Indian market indices (NIFTY 50, SENSEX) when relevant
- Keep responses concise (2-4 paragraphs max) unless detailed analysis is requested
- If you don't know something specific (like real-time prices), say so honestly
- Never give definitive "buy" or "sell" advice — frame as analysis and considerations
- Use bullet points and formatting for readability when listing multiple items"""


@router.post("", response_model=ChatResponse)
async def chat(body: ChatRequest, user=Depends(get_current_user)):
    if not settings.anthropic_api_key:
        raise HTTPException(
            503,
            "AI chat not configured. Set ANTHROPIC_API_KEY in .env",
        )

    import anthropic

    # Determine role and build appropriate system prompt
    metadata = user.user_metadata or {}
    role = metadata.get("role", "client")

    if role == "client":
        try:
            ctx = await asyncio.to_thread(build_client_context, user.id)
            system_prompt = format_client_system_prompt(ctx)
        except Exception:
            system_prompt = MANAGER_SYSTEM_PROMPT
    else:
        try:
            ctx = await asyncio.to_thread(build_manager_context, user.id)
            system_prompt = format_manager_system_prompt(ctx)
        except Exception:
            system_prompt = MANAGER_SYSTEM_PROMPT

    # Build message history for Claude
    messages: list[dict[str, str]] = []
    for msg in body.history[-10:]:  # Keep last 10 messages for context
        msg_role = "assistant" if msg.get("role") == "bot" else "user"
        messages.append({"role": msg_role, "content": msg.get("text", "")})

    # Add the current message
    messages.append({"role": "user", "content": body.message})

    client = anthropic.Anthropic(api_key=settings.anthropic_api_key)
    response = await asyncio.to_thread(
        lambda: client.messages.create(
            model="claude-haiku-4-5-20251001",
            max_tokens=1024,
            system=system_prompt,
            messages=messages,
        )
    )

    reply = response.content[0].text.strip()
    return ChatResponse(reply=reply)
