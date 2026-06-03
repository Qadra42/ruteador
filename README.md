# 🚛 Route Agent

**AI-powered route optimization for scrap collection companies in Montevideo, Uruguay**

Built for Vercel's **"Zero to Agent"** hackathon (Track 3: ChatSDK Agents).

## 🎯 The Problem

Small scrap collection businesses in Montevideo receive orders via WhatsApp throughout the day. They manually:
- Track orders in notebooks or spreadsheets
- Plan routes by memory or guesswork
- Waste time and fuel with inefficient routes
- Miss potential pickups due to poor organization

**Route Agent solves this** by automating order intake via a conversational AI agent and generating optimized collection routes with one click.

## ✨ Features

### 🤖 Conversational AI Agent
- Clients message via WhatsApp to request pickups
- AI-powered agent extracts order details through natural conversation
- Automatically captures: items, address, preferred date, contact info
- Speaks natural Spanish, handles incomplete information gracefully

### 📊 Smart Dashboard
- Real-time view of all pending orders
- Filter by date (Today/Tomorrow/All)
- Select orders and generate routes for 1 or 2 drivers
- Clean, minimal interface built for speed

### 🗺️ Interactive Route Maps
- Custom Google Maps visualization with numbered markers
- Click markers to see pickup details (items, client, address)
- Route lines showing optimized path
- One-click export to Google Maps for navigation

### 🚚 Multi-Driver Support
- Automatically split orders between 2 drivers
- Each driver gets their own optimized route
- View routes on interactive map

## 🏗️ Tech Stack

**Frontend & Backend**
- Next.js 16 (App Router)
- TypeScript
- Tailwind CSS

**AI & Messaging**
- Kapso WhatsApp Cloud API
- Vercel AI SDK
- Azure OpenAI (GPT-4)
- Google Maps JavaScript API

**Data & Infrastructure**
- PostgreSQL (Supabase)
- Vercel KV (Redis) for conversation history
- Vercel hosting
- Bun runtime

## 🚀 Quick Start

### Prerequisites

- [Bun](https://bun.sh) installed
- [Kapso account](https://kapso.ai) for WhatsApp Business API
- [Azure OpenAI](https://azure.microsoft.com/en-us/products/ai-services/openai-service) deployment
- [Google Maps API key](https://console.cloud.google.com/)
- [Supabase](https://supabase.com) account
- Vercel account (for KV and deployment)

### 1. Clone and Install

```bash
git clone <your-repo>
cd ruteador
bun install
```

### 2. Set Up WhatsApp via Kapso

1. Sign up at [Kapso](https://kapso.ai)
2. Get your WhatsApp Business API credentials
3. Configure webhook URL (after deployment)

### 3. Configure Environment

Create `.env.local`:

```bash
# WhatsApp (Kapso)
KAPSO_API_KEY=your_api_key
KAPSO_PHONE_NUMBER_ID=your_phone_number_id
KAPSO_WEBHOOK_SECRET=your_webhook_secret
KAPSO_VERIFY_TOKEN=your_verify_token

# Azure OpenAI
AZURE_OPENAI_API_KEY=your_azure_key
AZURE_OPENAI_RESOURCE_NAME=your_resource_name
AZURE_OPENAI_DEPLOYMENT_NAME=your_deployment_name

# Google Maps
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=your_google_maps_key

# Postgres (Supabase)
POSTGRES_URL=your_postgres_connection_string

# Vercel KV (run: vercel env pull .env.local)
KV_REST_API_URL=your_kv_url
KV_REST_API_TOKEN=your_kv_token
KV_REST_API_READ_ONLY_TOKEN=your_kv_readonly_token
```

### 4. Set Up Database

```bash
# Run database migrations
bun db:push

# Seed initial data (company + agent config)
bun db:seed
```

### 5. Run Development Server

```bash
bun run dev
```

Visit `http://localhost:3000/dashboard`

### 6. Deploy to Production

```bash
vercel --prod
```

Configure the Kapso webhook in your Kapso dashboard:
- Webhook URL: `https://YOUR-DOMAIN.vercel.app/api/webhooks/whatsapp`
- Verify token: (same as `KAPSO_VERIFY_TOKEN` in env vars)

## 📱 How It Works

### 1. Client Places Order (WhatsApp)

Client messages via WhatsApp:
```
Hola, tengo una heladera vieja para retirar.
Dirección: Rivera 1500, La Comercial.
Mañana está bien. Soy Roberto, 099 123 456.
```

The AI agent responds:
```
CONFIRMADO. Perfecto Roberto, pasamos mañana. ¡Gracias!
```

Order is automatically saved to the database.

### 2. Business Owner Reviews Orders (Dashboard)

- Visit `/dashboard` to see all pending orders
- Filter by Today/Tomorrow/All
- Select orders with checkboxes
- Choose 1 or 2 drivers

### 3. Generate Optimized Routes

Click "Generate Route" and get:
- **Interactive map** with numbered markers showing pickup sequence
- Click any marker to see items, client info, and address
- **Google Maps link** for turn-by-turn navigation
- Routes optimized by Google Maps Directions API

### 4. Driver Views Route

- Access route via generated URL
- View interactive map
- Click "Open in Google Maps" for turn-by-turn navigation

## 🗺️ Route Optimization

Routes are optimized using **Google Maps Directions API**:
- Considers real street distances (not straight-line)
- Accounts for one-way streets and traffic patterns
- Optimizes for driving time, not just distance
- Starts and ends at depot (Sinergia Faro, Punta Carretas)

For 2-driver mode: Orders are split evenly, then each subset is optimized independently.

## 📂 Project Structure

```
ruteador/
├── app/
│   ├── api/
│   │   ├── webhooks/whatsapp/     # WhatsApp webhook handler
│   │   ├── generate-route/        # Route generation & saving
│   │   ├── routes/[routeId]/      # Fetch saved routes
│   │   └── orders/                # Orders API
│   ├── dashboard/                 # Order management UI
│   ├── map/[routeId]/            # Interactive map page
│   └── page.tsx                   # Landing page
├── lib/
│   ├── agent/                     # AI agent logic
│   │   ├── agent.service.ts       # Main message handler
│   │   ├── order.extractor.ts     # Extract order data
│   │   └── prompt.builder.ts      # Build system prompts
│   ├── orders/                    # Orders domain
│   │   ├── orders.repository.ts   # Database queries
│   │   └── orders.service.ts      # Business logic
│   ├── routes/                    # Routes domain
│   │   ├── routes.repository.ts   # Database queries
│   │   └── routes.service.ts      # Business logic
│   ├── whatsapp.ts                # Kapso WhatsApp client
│   ├── db.ts                      # Database connection
│   └── types/                     # TypeScript types
└── scripts/
    └── clear-db.ts                # Clear database utility
```

## 💡 Key Technical Decisions

### Why Azure OpenAI?
- Reliable, enterprise-grade API
- Compatible with existing Azure infrastructure
- GPT-4 provides excellent structured data extraction
- Fast enough for WhatsApp webhook timeouts

### Why Google Maps Directions API?
- Professional-grade route optimization
- Considers real-world factors (one-way streets, traffic patterns)
- Familiar interface for drivers
- More accurate than custom algorithms for small datasets

### Why PostgreSQL (Supabase)?
- Multi-tenant architecture with proper data isolation
- Relational data model fits business domain
- Free tier generous for MVP testing
- Connection pooling works well with Vercel

### Why Vercel KV?
- Fast Redis for conversation history
- Zero-config for serverless
- Perfect for ephemeral chat data
- No connection pooling issues

## 🚀 Future Enhancements

- **Real-time GPS tracking** for drivers
- **SMS notifications** for clients
- **Photo uploads** of items via WhatsApp
- **Route history & analytics** (avg time per stop, fuel estimates)
- **Multi-language support** (Spanish for clients, English for dashboard)
- **Automatic geocoding** to validate addresses
- **Route replay** to improve optimization over time
- **Multi-company dashboard** with authentication

## 🎓 What I Learned

Building Route Agent taught me:

1. **AI agents excel at unstructured input** - clients don't follow scripts, and that's okay
2. **Conversation history is critical** - storing messages in KV made the agent context-aware
3. **Simple UIs win** - dashboard has 3 clicks: filter → select → generate
4. **Real APIs beat custom algorithms** - Google's routing is better than anything I could build
5. **Multi-tenant architecture from day 1** - easier to build in than retrofit later

## 📄 License

MIT

---

**Built for Vercel's "Zero to Agent" Hackathon** | Track 3: ChatSDK Agents
