# 🚛 Route Agent

Agente inteligente de Telegram para gestión de pedidos y optimización de rutas de recolección de chatarra en Montevideo, Uruguay.

Construido para la hackathon **"Zero to Agent"** de Vercel (Track 3: ChatSDK Agents).

## 🎯 Características

- **Bot de Telegram conversacional**: Atiende clientes y toma pedidos automáticamente usando Vercel AI SDK
- **Almacenamiento en Vercel KV**: Guarda pedidos y conversaciones
- **Optimización de rutas**: Genera rutas óptimas usando nearest-neighbor heuristic
- **Integración con Google Maps**: Links directos para el chofer
- **Dashboard web**: Visualiza pedidos y genera rutas con un clic
- **Notificaciones al chofer**: Envía la ruta del día por Telegram automáticamente

## 🏗️ Stack Tecnológico

- **Next.js 15** (App Router) — Framework
- **ChatSDK** (`chat` + `@chat-adapter/telegram`) — Bot de Telegram
- **Vercel AI SDK** (`ai` + `@ai-sdk/anthropic`) — Agente conversacional
- **Claude 3.5 Haiku** — Modelo de IA de Anthropic
- **Vercel KV** — Almacenamiento de pedidos
- **TypeScript** — Lenguaje
- **Tailwind CSS** — Estilos
- **Bun** — Runtime y package manager

## 🚀 Setup

### 1. Crear bot de Telegram

Habla con [@BotFather](https://t.me/botfather) en Telegram:

```
/newbot
```

Guarda el token que te da.

### 2. Obtener Chat ID del chofer

Opción 1: Usa este bot temporal: [@userinfobot](https://t.me/userinfobot)

Opción 2: Deployá el proyecto, hace que el chofer envíe `/start` al bot, y revisá los logs de Vercel para ver el `chat_id`.

### 3. Configurar variables de entorno

Copia `.env.example` a `.env.local`:

```bash
cp .env.example .env.local
```

Completa con tus credenciales:

```env
TELEGRAM_BOT_TOKEN=123456:ABC-DEF1234ghIkl-zyx57W2v1u123ew11
DRIVER_TELEGRAM_CHAT_ID=123456789
ANTHROPIC_API_KEY=sk-ant-...
```

Obtené tu API key de Anthropic en: https://console.anthropic.com/settings/keys

### 4. Instalar dependencias

```bash
bun install
```

### 5. Setup Vercel KV

Para desarrollo local:
- Crea un proyecto en Vercel
- Agrega Vercel KV Storage desde la pestaña Storage
- Corre `vercel env pull .env.local` para bajar las credenciales de KV

Para producción:
- Las variables de KV se configuran automáticamente al deployar

### 6. Correr en desarrollo

```bash
bun run dev
```

El servidor corre en `http://localhost:3000`

### 7. Deploy a Vercel

```bash
bunx vercel
```

Después del deploy, configura el webhook de Telegram:

```bash
curl -X POST "https://api.telegram.org/bot$TELEGRAM_BOT_TOKEN/setWebhook" \
  -H "Content-Type: application/json" \
  -d '{"url": "https://TU-DOMINIO.vercel.app/api/webhooks/telegram"}'
```

## 📱 Uso

### Para clientes

Busca tu bot en Telegram y envía un mensaje:

```
Hola tengo un lavarropas viejo para sacar
```

El agente te va a guiar para tomar el pedido.

### Para el dueño del negocio

1. Abre `https://tu-dominio.vercel.app/dashboard`
2. Ve los pedidos pendientes
3. Hace clic en "Generar Ruta del Día"
4. El chofer recibe la ruta optimizada por Telegram con link de Google Maps

## 🗺️ Cómo funciona la optimización de rutas

El sistema usa **nearest-neighbor heuristic**:

1. Empieza desde el depósito (Centro/Aguada)
2. Va a la parada más cercana
3. Desde ahí, va a la siguiente más cercana
4. Repite hasta completar todas las paradas
5. Genera un link de Google Maps con todas las paradas en orden

Los barrios tienen coordenadas hardcodeadas para calcular distancias aproximadas.

## 📂 Estructura del proyecto

```
route-agent/
├── app/
│   ├── api/
│   │   ├── webhooks/telegram/route.ts   # Webhook de Telegram
│   │   └── generate-route/route.ts      # Genera y envía rutas
│   ├── dashboard/
│   │   ├── page.tsx                     # Dashboard del dueño
│   │   └── GenerateRouteButton.tsx      # Client component
│   └── page.tsx                         # Landing page
├── lib/
│   ├── types.ts                         # Tipos y schemas Zod
│   ├── orders.ts                        # CRUD de pedidos en KV
│   ├── route-optimizer.ts               # Lógica de optimización
│   ├── agent.ts                         # Agente con AI SDK
│   └── bot.ts                           # Configuración ChatSDK
└── .env.local                           # Variables de entorno
```

## 🎓 Aprendizajes de la hackathon

- ChatSDK hace súper fácil crear bots multicanal
- Vercel AI SDK con tools es perfecto para extraer info estructurada de conversaciones
- Vercel KV es ideal para prototipado rápido
- El webhook de Telegram tiene timeout de 60s, usar `claude-3-5-haiku` es ideal: rápido, barato y muy capaz
- Claude es excelente para conversaciones en español rioplatense, entiende perfectamente el contexto uruguayo

## 📝 TODOs para producción

- [ ] Autenticación en el dashboard
- [ ] Mejores algoritmos de optimización (TSP solvers)
- [ ] Geocoding real en vez de coordenadas hardcodeadas
- [ ] Confirmación de pedidos por parte del chofer
- [ ] Tracking en tiempo real
- [ ] Analytics de rendimiento

## 📄 Licencia

MIT

## 🙏 Créditos

Construido por Francisco para la hackathon "Zero to Agent" de Vercel.
