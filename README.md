# 🚛 Route Agent

Intelligent Telegram agent for order management and route optimization for scrap collection in Montevideo, Uruguay.

Built for Vercel's **"Zero to Agent"** hackathon (Track 3: ChatSDK Agents).

## 🎯 Features

- **Conversational Telegram bot**: Serves clients and takes orders automatically using Vercel AI SDK
- **Vercel KV storage**: Saves orders and conversations
- **Route optimization**: Generates optimal routes using nearest-neighbor heuristic
- **Google Maps integration**: Direct links for the driver
- **Web dashboard**: Visualize orders and generate routes with one click
- **Driver notifications**: Sends the day's route via Telegram automatically

## 🏗️ Tech Stack

- **Next.js 15** (App Router) — Framework
- **ChatSDK** (`chat` + `@chat-adapter/telegram`) — Telegram bot
- **Vercel AI SDK** (`ai` + `@ai-sdk/anthropic`) — Conversational agent
- **Claude 3.5 Haiku** — Anthropic's AI model
- **Vercel KV** — Order storage
- **TypeScript** — Language
- **Tailwind CSS** — Styling
- **Bun** — Runtime and package manager

## 🚀 Setup

### 1. Create Telegram bot

Talk to [@BotFather](https://t.me/botfather) on Telegram:

```
/newbot
```

Save the token it gives you.

### 2. Get driver's Chat ID

Option 1: Use this temporary bot: [@userinfobot](https://t.me/userinfobot)

Option 2: Deploy the project, have the driver send `/start` to the bot, and check Vercel logs to see the `chat_id`.

### 3. Configure environment variables

Copy `.env.example` to `.env.local`:

```bash
cp .env.example .env.local
```

Fill in with your credentials:

```env
TELEGRAM_BOT_TOKEN=123456:ABC-DEF1234ghIkl-zyx57W2v1u123ew11
DRIVER_TELEGRAM_CHAT_ID=123456789
ANTHROPIC_API_KEY=sk-ant-...
```

Get your Anthropic API key at: https://console.anthropic.com/settings/keys

### 4. Install dependencies

```bash
bun install
```

### 5. Setup Vercel KV

For local development:
- Create a project on Vercel
- Add Vercel KV Storage from the Storage tab
- Run `vercel env pull .env.local` to download KV credentials

For production:
- KV variables are configured automatically on deploy

### 6. Run in development

```bash
bun run dev
```

The server runs on `http://localhost:3000`

### 7. Deploy to Vercel

```bash
bunx vercel
```

After deployment, configure the Telegram webhook:

```bash
curl -X POST "https://api.telegram.org/bot$TELEGRAM_BOT_TOKEN/setWebhook" \
  -H "Content-Type: application/json" \
  -d '{"url": "https://YOUR-DOMAIN.vercel.app/api/webhooks/telegram"}'
```

## 📱 Usage

### For clients

Find your bot on Telegram and send a message:

```
Hi, I have an old washing machine to get rid of
```

The agent will guide you through placing the order.

### For the business owner

1. Open `https://your-domain.vercel.app/dashboard`
2. View pending orders
3. Click "Generate Route"
4. The driver receives the optimized route via Telegram with a Google Maps link

## 🗺️ How route optimization works

The system uses **nearest-neighbor heuristic**:

1. Starts from the depot (Centro/Aguada)
2. Goes to the nearest stop
3. From there, goes to the next nearest
4. Repeats until all stops are complete
5. Generates a Google Maps link with all stops in order

Neighborhoods have hardcoded coordinates to calculate approximate distances.

## 📂 Project structure

```
route-agent/
├── app/
│   ├── api/
│   │   ├── webhooks/telegram/route.ts   # Telegram webhook
│   │   └── generate-route/route.ts      # Generate and send routes
│   ├── dashboard/
│   │   ├── page.tsx                     # Owner's dashboard
│   │   └── GenerateRouteButton.tsx      # Client component
│   └── page.tsx                         # Landing page
├── lib/
│   ├── types.ts                         # Types and Zod schemas
│   ├── orders.ts                        # Order CRUD in KV
│   ├── route-optimizer.ts               # Optimization logic
│   ├── agent.ts                         # Agent with AI SDK
│   └── bot.ts                           # ChatSDK configuration
└── .env.local                           # Environment variables
```

## 🎓 Hackathon learnings

- ChatSDK makes it super easy to create multi-channel bots
- Vercel AI SDK with tools is perfect for extracting structured info from conversations
- Vercel KV is ideal for rapid prototyping
- Telegram webhook has a 60s timeout, using `claude-3-5-haiku` is ideal: fast, cheap, and very capable
- Claude is excellent for conversations in Rioplatense Spanish, perfectly understands Uruguayan context

## 📝 TODOs for production

- [ ] Dashboard authentication
- [ ] Better optimization algorithms (TSP solvers)
- [ ] Real geocoding instead of hardcoded coordinates
- [ ] Order confirmation by driver
- [ ] Real-time tracking
- [ ] Performance analytics

## 📄 License

MIT

## 🙏 Credits

Built by Francisco for Vercel's "Zero to Agent" hackathon.
