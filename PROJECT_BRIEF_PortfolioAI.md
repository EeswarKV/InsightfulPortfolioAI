# Project Brief: AI-Powered Portfolio Management Platform

## Project Name
**PortfolioAI** (working title — rename as needed)

## Vision
A hybrid (web + iOS + Android) portfolio management platform for fund managers who manage multiple clients. Each client can view their own portfolio, receive AI-driven insights, and chat with an AI assistant that is trained on the fund manager's proprietary research and analysis.

---

## Key Personas

### Fund Manager (Admin)
- Manages multiple clients and their portfolios
- Uploads research reports, company analyses, and investment theses
- Has a dashboard overview of all clients
- Can configure AI behavior, review AI conversations, and override responses
- Receives alerts about significant portfolio changes across all clients

### Client (Tenant)
- Views only their own portfolio and performance
- Chats with the AI chatbot (which represents the fund manager's knowledge)
- Gets updates about companies they're invested in
- Cannot see other clients' data

---

## Core Features by Phase

### Phase 1 — Core Platform (MVP)
- **Authentication & Roles**: Fund manager (admin) vs. client (tenant) login with role-based access control
- **Portfolio Dashboard**: Holdings overview, sector allocation, performance charts, gain/loss tracking
- **Multi-Source Tracking**: Stocks, ETFs, mutual funds, bonds, crypto — across multiple brokers/sources
- **Client Management**: Fund manager can add/remove clients, assign portfolios
- **Market Data Integration**: Real-time or near-real-time price feeds, company info
- **Company News Feed**: Relevant news for holdings, filterable by client portfolio
- **Push Notifications**: Price alerts, significant portfolio changes, news alerts

### Phase 2 — AI Chat (Basic)
- **AI Chatbot per Client**: Each client gets a chat interface
- **Portfolio-Aware Context**: Bot automatically knows the client's holdings, performance, allocation
- **Natural Language Queries**: "How is my portfolio doing?", "What's my exposure to tech?", "Show me my top gainers this month"
- **Guardrails & Disclaimers**: Bot never gives buy/sell advice; always informational with compliance disclaimers
- **Conversation History**: Stored and reviewable by fund manager

### Phase 3 — RAG Layer (Manager's Knowledge)
- **Document Upload**: Fund manager uploads research PDFs, Word docs, spreadsheets, notes
- **Vector Embedding Pipeline**: Documents are chunked, embedded, and stored in a vector database
- **Retrieval-Augmented Generation**: Client queries retrieve relevant manager research before generating responses
- **Source Attribution**: Bot cites which research document it's drawing from
- **Knowledge Management UI**: Manager can view, update, and delete uploaded research
- **Example Interactions**:
  - Client: "What does the manager think about Tesla?" → Bot retrieves manager's Tesla analysis
  - Client: "Why are we invested in this biotech company?" → Bot finds the investment thesis

### Phase 4 — Advanced AI & Automation
- **Automated Reports**: AI-generated monthly/quarterly portfolio summaries per client
- **Smart Alerts**: "Client X's AAPL position dropped 15% — here's context from your research"
- **Voice Input**: Clients can ask questions via voice
- **Comparative Analysis**: "How does my portfolio compare to the S&P 500?"
- **Sentiment Analysis**: Aggregate news sentiment for holdings
- **Meeting Prep**: AI generates briefing notes for manager-client meetings

---

## Technical Architecture

### Frontend — Hybrid App
| Component | Technology |
|-----------|-----------|
| Framework | **Expo (React Native)** — single codebase for iOS, Android, Web |
| Navigation | React Navigation |
| State Management | Zustand or Redux Toolkit |
| Charts | Victory Native or react-native-chart-kit |
| UI Library | Tamagui or NativeBase (cross-platform styling) |

### Backend & Data
| Component | Technology |
|-----------|-----------|
| Backend/API | **Node.js (Express or Fastify)** or **Python (FastAPI)** |
| Database | **PostgreSQL** via Supabase (users, portfolios, transactions) |
| Auth | Supabase Auth or Auth0 (role-based: manager vs. client) |
| Real-time | Supabase Realtime or WebSockets for live updates |
| File Storage | Supabase Storage or AWS S3 (research documents) |
| Push Notifications | Firebase Cloud Messaging (FCM) |

### AI / LLM Stack
| Component | Technology |
|-----------|-----------|
| LLM Provider | **Open API GPT - 4** — primary; Claude API as fallback |
| Embeddings | OpenAI text-embedding-3-small or Cohere embed |
| Vector Database | **Pinecone** or **pgvector** (PostgreSQL extension via Supabase) |
| RAG Framework | **LangChain** or **LlamaIndex** for document processing pipeline |
| Document Processing | Unstructured.io or LangChain document loaders (PDF, DOCX, XLSX) |
| Guardrails | Custom system prompts + Anthropic's moderation layer |

### Market Data APIs
| Provider | Use Case |
|----------|----------|
| **Polygon.io** | Real-time & historical stock data, company info |
| **Finnhub** | News, sentiment, company fundamentals |
| **Alpha Vantage** | Free tier option for market data |
| **Plaid / Yodlee** | Brokerage account aggregation (actual holdings sync) |

---

## Data Model (Simplified)

```
Users
├── id, email, role (manager | client), name
├── manager_id (FK → Users, null for managers)

Portfolios
├── id, client_id (FK → Users), name, created_at

Holdings
├── id, portfolio_id (FK), symbol, quantity, avg_cost, asset_type
├── source (broker name or manual)

Transactions
├── id, portfolio_id (FK), symbol, type (buy|sell|dividend), quantity, price, date

Documents (Manager's Research)
├── id, manager_id (FK), filename, storage_url, uploaded_at
├── status (processing | ready | failed)

DocumentChunks (Vector Embeddings)
├── id, document_id (FK), chunk_text, embedding_vector, metadata

Conversations
├── id, client_id (FK), created_at

Messages
├── id, conversation_id (FK), role (user|assistant), content, created_at
├── sources (JSON — references to document chunks used)

Alerts
├── id, user_id (FK), type, message, read, created_at
```

---

## Deployment & Store Submission

### Build & Deploy
- **Expo EAS Build** for iOS (.ipa) and Android (.apk/.aab) store builds
- **Expo Web** or Vercel/Netlify for the web version
- **Backend**: Railway, Render, or AWS (containerized)
- **Database**: Supabase Cloud

### App Store Guidelines
- Finance apps face extra review — include privacy policy, terms of service
- Clearly state the app is informational, not financial advice
- Include proper data handling disclosures (especially for financial data)
- Apple may require an explanation of the AI chatbot functionality

### Regulatory Considerations
- AI disclaimer on every chatbot response
- Audit logs for all AI conversations (manager can review)
- Manager can disable/override AI responses
- No personalized investment advice from the bot — informational only
- Data encryption at rest and in transit
- GDPR/privacy compliance for client data

---

## Project Conventions

### Code Style
- TypeScript throughout (frontend + backend)
- ESLint + Prettier for formatting
- Conventional commits (feat:, fix:, docs:, etc.)

### Folder Structure (Expo)
```
/app                  # Expo Router file-based routing
  /(auth)             # Login, signup screens
  /(manager)          # Manager dashboard, client list, research upload
  /(client)           # Client dashboard, portfolio, chat
/components           # Shared UI components
/lib                  # API clients, utilities, hooks
/services             # Business logic (portfolio calculations, AI chat)
/store                # State management
/types                # TypeScript interfaces
```

### API Structure (Backend)
```
/api
  /auth               # Login, signup, token refresh
  /users              # User management
  /portfolios         # CRUD portfolios + holdings
  /market             # Proxy for market data APIs
  /chat               # AI chat endpoints
  /documents          # Research upload + RAG pipeline
  /alerts             # Notification management
```

---

## Current Status
- **Phase**: Planning / Architecture
- **Next Steps**: Set up Expo project, Supabase backend, and basic auth flow

---

## Instructions for Claude

When working on this project, please:
1. Always use **TypeScript** for all code
2. Follow the **Expo (React Native)** patterns for frontend code
3. Use **Supabase** conventions for database queries and auth
4. When building AI features, default to the **Claude API** (Anthropic)
5. Keep security and compliance top-of-mind — this handles financial data
6. Reference this brief for architecture decisions
7. Ask clarifying questions when requirements are ambiguous
8. Suggest improvements to the architecture when you see opportunities
9. Write code that is production-ready, not just prototypes (proper error handling, types, etc.)
