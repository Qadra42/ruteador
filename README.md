# 🚛 Route Agent

**AI-powered route optimization for scrap collection companies in Montevideo, Uruguay**

Built for Vercel's **"Zero to Agent"** hackathon (Track 3: ChatSDK Agents).

## 🎯 The Problem

Small scrap collection businesses in Montevideo receive orders via WhatsApp/Telegram throughout the day. They manually:
- Track orders in notebooks or spreadsheets
- Plan routes by memory or guesswork
- Waste time and fuel with inefficient routes
- Miss potential pickups due to poor organization

**Route Agent solves this** by automating order intake via a conversational AI agent and generating optimized collection routes with one click.

## ✨ Features

### 🤖 Conversational AI Agent
- Clients message a Telegram bot to request pickups
- Claude-powered agent extracts order details through natural conversation
- Automatically captures: items, address, preferred date, contact info
- Speaks natural English, handles incomplete information gracefully

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
- Routes shared via Telegram with interactive map links

## 🏗️ Tech Stack

**Frontend & Backend**
- Next.js 15 (App Router)
- TypeScript
- Tailwind CSS

**AI & Messaging**
- ChatSDK (Telegram adapter)
- Vercel AI SDK
- Claude Sonnet 4.5
- Google Maps JavaScript API

**Data & Infrastructure**
- Vercel KV (Redis)
- Vercel hosting
- Bun runtime

## 🚀 Quick Start

### Prerequisites

- [Bun](https://bun.sh) installed
- Telegram account
- [Anthropic API key](https://console.anthropic.com/settings/keys)
- [Google Maps API key](https://console.cloud.google.com/)
- Vercel account (for KV and deployment)

### 1. Clone and Install

```bash
git clone <your-repo>
cd ruteador
bun install
```

### 2. Set Up Telegram Bot

Create a bot with [@BotFather](https://t.me/botfather):
```
/newbot
```
Save the token you receive.

Get your chat ID from [@userinfobot](https://t.me/userinfobot) (or check Vercel logs after first message).

### 3. Configure Environment

Create `.env.local`:

```bash
TELEGRAM_BOT_TOKEN=your_bot_token
DRIVER_TELEGRAM_CHAT_ID=your_chat_id
ANTHROPIC_API_KEY=sk-ant-api03-...
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=your_google_maps_key

# For Vercel KV (run: vercel env pull .env.local)
KV_REST_API_URL=your_kv_url
KV_REST_API_TOKEN=your_kv_token
```

### 4. Set Up Vercel KV

```bash
# Link to Vercel project
vercel link

# Add KV storage in Vercel dashboard, then:
vercel env pull .env.local
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

Set the Telegram webhook:
```bash
curl -X POST "https://api.telegram.org/bot$TELEGRAM_BOT_TOKEN/setWebhook" \
  -H "Content-Type: application/json" \
  -d '{"url": "https://YOUR-DOMAIN.vercel.app/api/webhooks/telegram"}'
```

## 📱 How It Works

### 1. Client Places Order (Telegram Bot)

Client messages the bot:
```
Hi, I have an old washing machine and fridge to get rid of.
Address: Bv. Artigas 1234, Cordón.
Tomorrow works. Name is Ana, phone 094 123 456.
```

The AI agent responds:
```
CONFIRMED. All set Ana, we'll swing by tomorrow. Thanks!
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

### 4. Driver Receives Route

Driver gets Telegram message with:
- List of all stops in order
- Link to interactive map
- Link to Google Maps for navigation

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
│   │   ├── webhooks/telegram/     # Telegram webhook handler
│   │   ├── generate-route/        # Route generation & saving
│   │   ├── routes/[routeId]/      # Fetch saved routes
│   │   └── orders/                # Orders API
│   ├── dashboard/                 # Order management UI
│   ├── map/[routeId]/            # Interactive map page
│   └── page.tsx                   # Landing page
├── lib/
│   ├── agent.ts                   # Claude-powered conversation agent
│   ├── bot.ts                     # ChatSDK Telegram configuration
│   ├── orders.ts                  # Order storage (Vercel KV)
│   ├── routes.ts                  # Route storage (Vercel KV)
│   └── types.ts                   # TypeScript types & Zod schemas
└── scripts/
    ├── clear-db.ts                # Clear database utility
    └── seed-demo-data.ts          # Seed demo orders
```

## 💡 Key Technical Decisions

### Why ChatSDK?
Simple, declarative bot framework that handles webhook complexity. Perfect for rapid prototyping.

### Why Claude Sonnet 4.5?
- Excellent at extracting structured data from natural conversation
- Fast enough for Telegram's 60s webhook timeout
- Understands context and handles incomplete information gracefully
- Superior at following system instructions

### Why Google Maps Directions API?
- Professional-grade route optimization
- Considers real-world factors (one-way streets, traffic patterns)
- Familiar interface for drivers
- More accurate than custom algorithms for small datasets

### Why Vercel KV?
- Zero-config Redis for serverless
- Perfect for storing orders and conversation history
- Fast reads/writes for real-time dashboard
- No connection pooling issues

## 🚀 Future Enhancements

- **Real-time GPS tracking** for drivers
- **SMS notifications** for clients
- **Photo uploads** of items via Telegram
- **Route history & analytics** (avg time per stop, fuel estimates)
- **Multi-language support** (Spanish for clients, English for dashboard)
- **WhatsApp integration** (many clients prefer WhatsApp)
- **Automatic geocoding** to validate addresses
- **Route replay** to improve optimization over time

## 🎓 What I Learned

Building Route Agent taught me:

1. **AI agents excel at unstructured input** - clients don't follow scripts, and that's okay
2. **Conversation history is critical** - storing messages in KV made the agent context-aware
3. **Simple UIs win** - dashboard has 3 clicks: filter → select → generate
4. **Real APIs beat custom algorithms** - Google's routing is better than anything I could build
5. **Hackathons reward demos, not perfection** - working prototype > theoretical optimization

## 📄 License

MIT

---

**Built for Vercel's "Zero to Agent" Hackathon** | Track 3: ChatSDK Agents
