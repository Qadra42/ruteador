# Ruteador V2 - Guía de Implementación Completa

## 🎯 Objetivo

Reescribir Ruteador desde cero con arquitectura production-ready para soportar múltiples clientes (multi-tenant), mantener portabilidad entre frameworks, y estar listo para escalar de 1 a 100+ negocios.

## 📋 Contexto

### Proyecto actual (MVP de hackathon)
- ✅ Funciona en Telegram
- ✅ Agente conversacional toma pedidos
- ✅ Genera rutas con Google Maps
- ✅ Dashboard básico
- ❌ Single-tenant (solo 1 negocio)
- ❌ Sin autenticación
- ❌ Arquitectura mezclada con Next.js
- ❌ No soporta WhatsApp
- ❌ Prompt en inglés

### Proyecto objetivo (V2 Production-Ready)
- ✅ WhatsApp como canal principal
- ✅ Multi-tenant desde día 1
- ✅ Arquitectura portable (Port & Adapters)
- ✅ Autenticación robusta
- ✅ Configuración por negocio
- ✅ Todo en español
- ✅ Geocoding real
- ✅ Procesamiento de audios
- ✅ Monitoring y error handling

## 🏗️ Arquitectura

### Principios arquitecturales

1. **Port & Adapters (Hexagonal Architecture)**
   - Core logic sin dependencias de frameworks
   - Interfaces abstractas para servicios externos
   - Fácil testeo y migración

2. **Multi-tenant by design**
   - Todos los datos tienen `business_id`
   - Aislamiento completo entre negocios
   - Configuración por negocio

3. **Framework-agnostic core**
   - `lib/core` no importa Next.js
   - Route handlers son thin wrappers
   - Portable a Bun/Express/Hono si es necesario

### Stack tecnológico

```yaml
Runtime: Bun (desarrollo y producción)
Framework: Next.js 15 (App Router)
Language: TypeScript (strict mode)
Database:
  - Vercel Postgres (PostgreSQL serverless para datos estructurados)
  - Vercel KV (Redis para conversaciones y cache)
Auth: NextAuth.js v5 (Auth.js)
AI: Anthropic Claude Sonnet 4.5
Messaging: Kapso.ai (WhatsApp Business API)
Maps: Google Maps (Geocoding + Routes API)
Audio: OpenAI Whisper API
Deployment: Vercel (todo en una plataforma)
Monitoring: Sentry
Styling: Tailwind CSS v4
```

### Estructura de directorios

```
ruteador-v2/
├── app/                          # Next.js App Router
│   ├── (auth)/                   # Rutas públicas
│   │   ├── login/
│   │   └── register/
│   ├── (dashboard)/              # Rutas protegidas
│   │   ├── layout.tsx            # Auth check
│   │   ├── dashboard/
│   │   ├── settings/
│   │   └── routes/
│   ├── api/
│   │   ├── auth/[...nextauth]/   # NextAuth endpoints
│   │   ├── webhooks/
│   │   │   └── whatsapp/         # Kapso webhook
│   │   ├── orders/               # CRUD pedidos
│   │   ├── routes/               # Generación de rutas
│   │   └── config/               # Configuración negocio
│   ├── layout.tsx
│   └── page.tsx                  # Landing page
│
├── lib/
│   ├── core/                     # Lógica de negocio (framework-agnostic)
│   │   ├── services/
│   │   │   ├── order-service.ts
│   │   │   ├── agent-service.ts
│   │   │   ├── route-service.ts
│   │   │   └── notification-service.ts
│   │   ├── entities/
│   │   │   ├── order.ts
│   │   │   ├── business.ts
│   │   │   ├── route.ts
│   │   │   └── conversation.ts
│   │   └── types.ts
│   │
│   ├── adapters/                 # Implementaciones concretas
│   │   ├── database/
│   │   │   ├── interface.ts      # Contratos abstractos
│   │   │   ├── kv-repository.ts
│   │   │   └── postgres-repository.ts
│   │   ├── ai/
│   │   │   ├── interface.ts
│   │   │   └── anthropic-client.ts
│   │   ├── messaging/
│   │   │   ├── interface.ts
│   │   │   └── kapso-client.ts
│   │   ├── geocoding/
│   │   │   ├── interface.ts
│   │   │   └── google-maps-client.ts
│   │   └── audio/
│   │       ├── interface.ts
│   │       └── whisper-client.ts
│   │
│   ├── config/
│   │   ├── dependencies.ts       # Dependency injection
│   │   └── env.ts                # Variables de entorno
│   │
│   └── utils/
│       ├── errors.ts
│       ├── validators.ts
│       └── logger.ts
│
├── components/                   # React components
│   ├── ui/                       # shadcn/ui components
│   ├── dashboard/
│   ├── orders/
│   └── routes/
│
├── prisma/                       # Schema de Postgres
│   ├── schema.prisma
│   └── migrations/
│
├── public/
├── scripts/
│   ├── setup-business.ts         # CLI para crear negocios
│   └── seed.ts
│
├── .env.local
├── .env.example
├── next.config.ts
├── tsconfig.json
├── tailwind.config.ts
└── package.json
```

## 🗄️ Modelo de datos

### Database Schema (Postgres)

```prisma
// prisma/schema.prisma

generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("POSTGRES_URL")
}

model Business {
  id                String   @id @default(cuid())
  name              String
  phone             String   @unique // Número de WhatsApp
  email             String   @unique
  createdAt         DateTime @default(now())
  updatedAt         DateTime @updatedAt

  // Configuración
  coverageZones     String[] // ["Pocitos", "Cordón", "Centro"]
  workingHours      Json     // { "monday": { "start": "08:00", "end": "18:00" }, ... }
  serviceType       String   // "junk_removal", "delivery", "distribution"
  agentPrompt       String?  // Prompt personalizado

  // Relaciones
  users             User[]
  orders            Order[]
  routes            Route[]

  @@index([phone])
}

model User {
  id            String    @id @default(cuid())
  email         String    @unique
  name          String?
  passwordHash  String
  role          Role      @default(ADMIN)
  businessId    String
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt

  business      Business  @relation(fields: [businessId], references: [id])

  @@index([businessId])
  @@index([email])
}

enum Role {
  ADMIN    // Dueño del negocio
  DRIVER   // Chofer
  OPERATOR // Operador
}

model Order {
  id                String      @id @default(cuid())
  businessId        String
  status            OrderStatus @default(PENDING)

  // Datos del pedido
  items             String      // "Heladera vieja + lavarropas"
  addressRaw        String      // Dirección como la escribió el cliente
  addressFormatted  String?     // Dirección geocodificada
  neighborhood      String
  lat               Float?
  lng               Float?
  preferredDate     String      // "mañana", "hoy por la tarde"

  // Cliente
  clientName        String?
  clientPhone       String

  // Conversación
  threadId          String      // Para trackear conversación de WhatsApp

  // Metadata
  createdAt         DateTime    @default(now())
  updatedAt         DateTime    @updatedAt

  business          Business    @relation(fields: [businessId], references: [id])
  route             Route?      @relation(fields: [routeId], references: [id])
  routeId           String?

  @@index([businessId, status])
  @@index([businessId, createdAt])
  @@index([threadId])
}

enum OrderStatus {
  PENDING
  ROUTED
  IN_PROGRESS
  COMPLETED
  CANCELLED
}

model Route {
  id            String   @id @default(cuid())
  businessId    String
  driverLabel   String   // "Chofer 1 - Zona Este"
  status        RouteStatus @default(PENDING)

  // Ruta optimizada
  ordersOrder   String[] // IDs en orden optimizado
  totalDistance Float?   // Km totales
  totalDuration Int?     // Minutos estimados

  // Links
  googleMapsUrl String

  // Metadata
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt

  business      Business @relation(fields: [businessId], references: [id])
  orders        Order[]

  @@index([businessId, status])
  @@index([businessId, createdAt])
}

enum RouteStatus {
  PENDING
  IN_PROGRESS
  COMPLETED
}
```

### KV Schema (Redis para datos temporales)

```typescript
// Conversaciones (historial de mensajes)
`conversation:${business_id}:${thread_id}` → List<Message>

// Cache de geocoding
`geocode:${address}` → { lat, lng, formatted_address } (TTL: 30 días)

// Rate limiting
`ratelimit:${phone_number}:${minute}` → count (TTL: 60 segundos)
```

## 🔧 Implementación detallada

### Fase 1: Setup inicial (1-2 horas)

#### 1.1 Crear proyecto

```bash
bunx create-next-app@latest ruteador-v2 \
  --typescript \
  --tailwind \
  --app \
  --no-src-dir \
  --import-alias "@/*"

cd ruteador-v2
```

#### 1.2 Instalar dependencias

```bash
# Core
bun add next@latest react@latest react-dom@latest

# Database
bun add @vercel/kv @vercel/postgres @prisma/client
bun add -d prisma

# Auth
bun add next-auth@beta bcryptjs
bun add -d @types/bcryptjs

# AI & APIs
bun add ai @ai-sdk/anthropic openai
bun add zod nanoid

# Utils
bun add date-fns
bun add @sentry/nextjs

# Dev
bun add -d @types/node typescript
```

#### 1.3 Configurar variables de entorno

```bash
# .env.local
# Database
POSTGRES_URL="postgres://..."
POSTGRES_URL_NON_POOLING="postgres://..."
KV_REST_API_URL="https://..."
KV_REST_API_TOKEN="..."

# Auth
NEXTAUTH_URL="http://localhost:3000"
NEXTAUTH_SECRET="generate-with-openssl-rand-base64-32"

# AI
ANTHROPIC_API_KEY="sk-ant-..."
OPENAI_API_KEY="sk-..."

# WhatsApp (Kapso)
KAPSO_API_KEY="..."
KAPSO_PHONE_NUMBER_ID="..."

# Google Maps
GOOGLE_MAPS_API_KEY="..."
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY="..."

# Monitoring
SENTRY_DSN="..."
```

#### 1.4 Configurar Vercel Postgres

**Opción A: Configurar desde Vercel Dashboard (recomendado)**

1. Ve a tu proyecto en Vercel Dashboard
2. Ve a Storage → Create Database → Postgres
3. Nombre: `ruteador-db`
4. Region: Elige la más cercana (ej: `iad1` para US East)
5. Click "Create"
6. Click "Connect" y copia las variables de entorno

Vercel automáticamente agrega estas variables a tu proyecto:
```
POSTGRES_URL="postgres://..."
POSTGRES_PRISMA_URL="postgres://..."
POSTGRES_URL_NON_POOLING="postgres://..."
```

Luego, en tu terminal local:

```bash
# Descargar las variables de entorno desde Vercel
vercel env pull .env.local
```

**Opción B: Configurar localmente primero**

```bash
# Instalar Vercel CLI
bun add -g vercel

# Link a proyecto existente o crear nuevo
vercel link

# Crear Postgres database desde CLI
vercel storage create postgres ruteador-db

# Pull environment variables
vercel env pull .env.local
```

#### 1.5 Configurar Prisma

```bash
bunx prisma init
```

Tu `.env.local` ya tiene `POSTGRES_URL` de Vercel. Ahora editá `prisma/schema.prisma`:

```prisma
datasource db {
  provider = "postgresql"
  url = env("POSTGRES_PRISMA_URL") // uses connection pooling
  directUrl = env("POSTGRES_URL_NON_POOLING") // uses direct connection
}

// ... rest of schema (copiar del schema de arriba)
```

Luego:

```bash
# Crear tablas en Vercel Postgres
bunx prisma migrate dev --name init

# Generar cliente de Prisma
bunx prisma generate
```

**Nota**: Vercel Postgres usa Neon bajo el capó, por lo que tenés:
- ✅ Serverless (escalamiento automático)
- ✅ Connection pooling
- ✅ 256MB gratis (suficiente para empezar)
- ✅ Backup automático

#### 1.6 Configurar Vercel KV (Redis)

Similar al setup de Postgres:

**Desde Vercel Dashboard:**
1. Storage → Create Database → KV
2. Nombre: `ruteador-kv`
3. Region: Misma que Postgres
4. Click "Create"

O desde CLI:

```bash
vercel storage create kv ruteador-kv
vercel env pull .env.local
```

Esto agrega automáticamente:
```
KV_REST_API_URL="https://..."
KV_REST_API_TOKEN="..."
KV_REST_API_READ_ONLY_TOKEN="..."
```

**Plan gratuito de Vercel KV:**
- ✅ 256MB storage
- ✅ 3,000 comandos/día (suficiente para empezar)
- ✅ Upgrade a Pro si necesitás más

#### 1.7 Configurar TypeScript (strict mode)

```json
// tsconfig.json
{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["ES2022", "dom", "dom.iterable"],
    "jsx": "preserve",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "allowJs": true,
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "noImplicitOverride": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "isolatedModules": true,
    "incremental": true,
    "paths": {
      "@/*": ["./*"]
    },
    "plugins": [
      {
        "name": "next"
      }
    ]
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
  "exclude": ["node_modules"]
}
```

---

### Fase 2: Core domain (2-3 horas)

#### 2.1 Definir tipos y entidades

```typescript
// lib/core/types.ts

export type BusinessId = string;
export type OrderId = string;
export type UserId = string;
export type ThreadId = string;

export interface Business {
  id: BusinessId;
  name: string;
  phone: string;
  email: string;
  coverageZones: string[];
  workingHours: WorkingHours;
  serviceType: 'junk_removal' | 'delivery' | 'distribution' | 'other';
  agentPrompt?: string;
  createdAt: Date;
}

export interface WorkingHours {
  monday?: DaySchedule;
  tuesday?: DaySchedule;
  wednesday?: DaySchedule;
  thursday?: DaySchedule;
  friday?: DaySchedule;
  saturday?: DaySchedule;
  sunday?: DaySchedule;
}

export interface DaySchedule {
  start: string; // "08:00"
  end: string;   // "18:00"
}

export interface Order {
  id: OrderId;
  businessId: BusinessId;
  status: 'pending' | 'routed' | 'in_progress' | 'completed' | 'cancelled';
  items: string;
  addressRaw: string;
  addressFormatted?: string;
  neighborhood: string;
  lat?: number;
  lng?: number;
  preferredDate: string;
  clientName?: string;
  clientPhone: string;
  threadId: ThreadId;
  createdAt: Date;
  updatedAt: Date;
}

export interface Route {
  id: string;
  businessId: BusinessId;
  driverLabel: string;
  status: 'pending' | 'in_progress' | 'completed';
  orders: Order[];
  ordersOrder: OrderId[];
  totalDistance?: number;
  totalDuration?: number;
  googleMapsUrl: string;
  createdAt: Date;
}

export interface Message {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

export interface GeocodingResult {
  lat: number;
  lng: number;
  formattedAddress: string;
}

export interface RouteOptimization {
  orderedStops: Array<{
    order: Order;
    position: number;
    estimatedArrival?: string;
  }>;
  totalDistance: number;
  totalDuration: number;
  googleMapsUrl: string;
}
```

#### 2.2 Definir interfaces de adapters

```typescript
// lib/adapters/database/interface.ts

import type { Business, Order, Route, Message } from '@/lib/core/types';

export interface DatabaseRepository {
  // Business
  getBusinessById(id: string): Promise<Business | null>;
  getBusinessByPhone(phone: string): Promise<Business | null>;
  createBusiness(data: Omit<Business, 'id' | 'createdAt'>): Promise<Business>;
  updateBusiness(id: string, data: Partial<Business>): Promise<Business>;

  // Orders
  getOrder(id: string): Promise<Order | null>;
  getOrdersByBusiness(businessId: string, status?: Order['status']): Promise<Order[]>;
  createOrder(data: Omit<Order, 'id' | 'createdAt' | 'updatedAt'>): Promise<Order>;
  updateOrder(id: string, data: Partial<Order>): Promise<Order>;
  markOrdersAsRouted(orderIds: string[], routeId: string): Promise<void>;

  // Routes
  getRoute(id: string): Promise<Route | null>;
  getRoutesByBusiness(businessId: string): Promise<Route[]>;
  createRoute(data: Omit<Route, 'id' | 'createdAt' | 'updatedAt'>): Promise<Route>;
  updateRoute(id: string, data: Partial<Route>): Promise<Route>;

  // Conversations (KV)
  saveMessage(businessId: string, threadId: string, message: Message): Promise<void>;
  getConversation(businessId: string, threadId: string): Promise<Message[]>;
}
```

```typescript
// lib/adapters/ai/interface.ts

import type { Message } from '@/lib/core/types';

export interface AIClient {
  generateResponse(params: {
    messages: Message[];
    systemPrompt: string;
  }): Promise<string>;

  extractOrderData(conversationText: string): Promise<{
    items?: string;
    address?: string;
    neighborhood?: string;
    preferredDate?: string;
    clientName?: string;
    clientPhone?: string;
  }>;
}
```

```typescript
// lib/adapters/messaging/interface.ts

export interface MessagingClient {
  sendMessage(params: {
    to: string; // Phone number
    message: string;
  }): Promise<void>;

  sendTemplate(params: {
    to: string;
    templateName: string;
    variables: Record<string, string>;
  }): Promise<void>;
}
```

```typescript
// lib/adapters/geocoding/interface.ts

import type { GeocodingResult } from '@/lib/core/types';

export interface GeocodingClient {
  geocode(address: string): Promise<GeocodingResult | null>;
  reverseGeocode(lat: number, lng: number): Promise<string>;
}
```

```typescript
// lib/adapters/audio/interface.ts

export interface AudioTranscriptionClient {
  transcribe(audioUrl: string): Promise<string>;
}
```

#### 2.3 Implementar servicios core

```typescript
// lib/core/services/agent-service.ts

import type { AIClient } from '@/lib/adapters/ai/interface';
import type { DatabaseRepository } from '@/lib/adapters/database/interface';
import type { GeocodingClient } from '@/lib/adapters/geocoding/interface';
import type { Business, Message } from '@/lib/core/types';

export class AgentService {
  constructor(
    private ai: AIClient,
    private db: DatabaseRepository,
    private geocoding: GeocodingClient
  ) {}

  async processMessage(params: {
    businessId: string;
    threadId: string;
    message: string;
    senderPhone: string;
  }): Promise<string> {
    const { businessId, threadId, message, senderPhone } = params;

    // 1. Obtener configuración del negocio
    const business = await this.db.getBusinessById(businessId);
    if (!business) throw new Error('Business not found');

    // 2. Guardar mensaje del usuario
    await this.db.saveMessage(businessId, threadId, {
      role: 'user',
      content: message,
      timestamp: new Date(),
    });

    // 3. Obtener historial de conversación
    const history = await this.db.getConversation(businessId, threadId);

    // 4. Generar prompt del sistema
    const systemPrompt = this.buildSystemPrompt(business);

    // 5. Generar respuesta con IA
    const response = await this.ai.generateResponse({
      messages: history,
      systemPrompt,
    });

    // 6. Guardar respuesta del asistente
    await this.db.saveMessage(businessId, threadId, {
      role: 'assistant',
      content: response,
      timestamp: new Date(),
    });

    // 7. Si la respuesta contiene confirmación, extraer y guardar pedido
    if (this.isOrderConfirmed(response)) {
      await this.extractAndSaveOrder({
        businessId,
        threadId,
        senderPhone,
        history,
      });
    }

    return response;
  }

  private buildSystemPrompt(business: Business): string {
    const basePrompt = business.agentPrompt || this.getDefaultPrompt(business.serviceType);

    return `${basePrompt}

INFORMACIÓN DEL NEGOCIO:
- Nombre: ${business.name}
- Zonas de cobertura: ${business.coverageZones.join(', ')}
- Horarios: ${this.formatWorkingHours(business.workingHours)}

REGLAS IMPORTANTES:
- Cuando tengas TODA la información necesaria (qué, dónde, cuándo), incluye la palabra "CONFIRMADO" en tu respuesta.
- Si la dirección está fuera de las zonas de cobertura, informa cortésmente que no llegas ahí.
- Sé breve, casual y amigable.
- NO uses emojis.
- Habla siempre en español rioplatense (Uruguay/Argentina).`;
  }

  private getDefaultPrompt(serviceType: string): string {
    const prompts = {
      junk_removal: `Sos un asistente para una empresa de retiro de residuos voluminosos en Montevideo, Uruguay. Tu trabajo es tomar pedidos de clientes que necesitan que retiren objetos grandes (muebles viejos, electrodomésticos, chatarra, etc.).

Necesitás obtener:
1. Qué necesitan retirar (tipo de objetos/materiales)
2. La dirección exacta (calle, número, barrio)
3. Qué día prefieren (si no dicen, asumí "lo antes posible")
4. Nombre de contacto o teléfono (opcional, preguntá cortésmente)`,

      delivery: `Sos un asistente para una empresa de delivery en Montevideo, Uruguay. Tu trabajo es tomar pedidos de entrega.

Necesitás obtener:
1. Qué necesitan que entreguen
2. La dirección de entrega (calle, número, barrio)
3. Cuándo prefieren la entrega
4. Datos de contacto`,

      distribution: `Sos un asistente para una distribuidora en Montevideo, Uruguay. Tu trabajo es tomar pedidos de almacenes y kioscos.

Necesitás obtener:
1. Qué productos necesitan
2. La dirección del local (calle, número, barrio)
3. Cuándo necesitan la entrega
4. Nombre del local y contacto`,
    };

    return prompts[serviceType as keyof typeof prompts] || prompts.junk_removal;
  }

  private isOrderConfirmed(response: string): boolean {
    return response.includes('CONFIRMADO') || response.includes('confirmado');
  }

  private async extractAndSaveOrder(params: {
    businessId: string;
    threadId: string;
    senderPhone: string;
    history: Message[];
  }) {
    const { businessId, threadId, senderPhone, history } = params;

    // Extraer últimos mensajes del usuario
    const recentMessages = history
      .filter(m => m.role === 'user')
      .slice(-4)
      .map(m => m.content)
      .join(' ');

    // Extraer datos estructurados con IA
    const orderData = await this.ai.extractOrderData(recentMessages);

    if (!orderData.items || !orderData.address || !orderData.neighborhood) {
      console.warn('Missing required order fields:', orderData);
      return;
    }

    // Geocodificar dirección
    let lat: number | undefined;
    let lng: number | undefined;
    let addressFormatted: string | undefined;

    const fullAddress = `${orderData.address}, ${orderData.neighborhood}, Montevideo, Uruguay`;
    const geocodeResult = await this.geocoding.geocode(fullAddress);

    if (geocodeResult) {
      lat = geocodeResult.lat;
      lng = geocodeResult.lng;
      addressFormatted = geocodeResult.formattedAddress;
    }

    // Guardar pedido
    await this.db.createOrder({
      businessId,
      status: 'pending',
      items: orderData.items,
      addressRaw: orderData.address,
      addressFormatted,
      neighborhood: orderData.neighborhood,
      lat,
      lng,
      preferredDate: orderData.preferredDate || 'lo antes posible',
      clientName: orderData.clientName,
      clientPhone: senderPhone,
      threadId,
    });
  }

  private formatWorkingHours(hours: Business['workingHours']): string {
    const days = Object.entries(hours)
      .filter(([_, schedule]) => schedule !== undefined)
      .map(([day, schedule]) => `${day}: ${schedule!.start}-${schedule!.end}`);
    return days.join(', ');
  }
}
```

```typescript
// lib/core/services/route-service.ts

import type { DatabaseRepository } from '@/lib/adapters/database/interface';
import type { GeocodingClient } from '@/lib/adapters/geocoding/interface';
import type { MessagingClient } from '@/lib/adapters/messaging/interface';
import type { Order, RouteOptimization } from '@/lib/core/types';

export class RouteService {
  constructor(
    private db: DatabaseRepository,
    private geocoding: GeocodingClient,
    private messaging: MessagingClient
  ) {}

  async generateRoute(params: {
    businessId: string;
    orderIds: string[];
    driverLabel: string;
  }): Promise<{ routeId: string; optimization: RouteOptimization }> {
    const { businessId, orderIds, driverLabel } = params;

    // 1. Obtener pedidos
    const orders = await Promise.all(
      orderIds.map(id => this.db.getOrder(id))
    );
    const validOrders = orders.filter((o): o is Order => o !== null && o.businessId === businessId);

    if (validOrders.length === 0) {
      throw new Error('No valid orders found');
    }

    // 2. Optimizar ruta (usando Google Maps Directions API)
    const optimization = await this.optimizeRoute(validOrders);

    // 3. Guardar ruta
    const route = await this.db.createRoute({
      businessId,
      driverLabel,
      status: 'pending',
      orders: optimization.orderedStops.map(s => s.order),
      ordersOrder: optimization.orderedStops.map(s => s.order.id),
      totalDistance: optimization.totalDistance,
      totalDuration: optimization.totalDuration,
      googleMapsUrl: optimization.googleMapsUrl,
    });

    // 4. Marcar pedidos como ruteados
    await this.db.markOrdersAsRouted(orderIds, route.id);

    return { routeId: route.id, optimization };
  }

  async sendRouteToDriver(params: {
    routeId: string;
    driverPhone: string;
  }): Promise<void> {
    const route = await this.db.getRoute(params.routeId);
    if (!route) throw new Error('Route not found');

    const message = this.formatRouteMessage(route);

    await this.messaging.sendMessage({
      to: params.driverPhone,
      message,
    });
  }

  private async optimizeRoute(orders: Order[]): Promise<RouteOptimization> {
    // Implementación simple: usar Google Maps Directions API
    // Para optimización real, usar Google Routes API con waypoint optimization

    if (orders.length === 1) {
      const order = orders[0]!;
      return {
        orderedStops: [{ order, position: 0 }],
        totalDistance: 0,
        totalDuration: 0,
        googleMapsUrl: this.buildGoogleMapsUrl([order]),
      };
    }

    // Aquí iría la llamada a Google Routes API
    // Por ahora, nearest-neighbor básico
    const optimizedOrder = this.nearestNeighbor(orders);

    return {
      orderedStops: optimizedOrder.map((order, idx) => ({
        order,
        position: idx,
      })),
      totalDistance: 0, // Calcular con Google Distance Matrix
      totalDuration: 0,
      googleMapsUrl: this.buildGoogleMapsUrl(optimizedOrder),
    };
  }

  private nearestNeighbor(orders: Order[]): Order[] {
    // Implementación simple, copiar del proyecto actual
    // TODO: Reemplazar con Google Routes API
    return orders;
  }

  private buildGoogleMapsUrl(orders: Order[]): string {
    const addresses = orders.map(o =>
      encodeURIComponent(`${o.addressRaw}, ${o.neighborhood}, Montevideo, Uruguay`)
    );

    if (addresses.length === 1) {
      return `https://www.google.com/maps/dir/?api=1&destination=${addresses[0]}`;
    }

    const destination = addresses[addresses.length - 1];
    const waypoints = addresses.slice(0, -1).join('|');
    return `https://www.google.com/maps/dir/?api=1&destination=${destination}&waypoints=${waypoints}`;
  }

  private formatRouteMessage(route: Route): string {
    const stops = route.orders
      .map((order, idx) => {
        return `${idx + 1}. ${order.addressRaw} (${order.neighborhood})
   Cliente: ${order.clientName || 'Sin nombre'} - ${order.clientPhone}
   Items: ${order.items}`;
      })
      .join('\n\n');

    return `🚛 *${route.driverLabel}*

PEDIDOS (${route.orders.length}):

${stops}

🗺️ Ver ruta en Google Maps:
${route.googleMapsUrl}`;
  }
}
```

---

### Fase 3: Adapters (2-3 horas)

#### 3.1 Database adapter (Postgres + KV)

```typescript
// lib/adapters/database/postgres-repository.ts

import { PrismaClient } from '@prisma/client';
import { kv } from '@vercel/kv';
import type { DatabaseRepository } from './interface';
import type { Business, Order, Route, Message } from '@/lib/core/types';

export class PostgresRepository implements DatabaseRepository {
  private prisma: PrismaClient;

  constructor() {
    this.prisma = new PrismaClient();
  }

  // Business methods
  async getBusinessById(id: string): Promise<Business | null> {
    const business = await this.prisma.business.findUnique({
      where: { id },
    });
    return business ? this.mapBusiness(business) : null;
  }

  async getBusinessByPhone(phone: string): Promise<Business | null> {
    const business = await this.prisma.business.findUnique({
      where: { phone },
    });
    return business ? this.mapBusiness(business) : null;
  }

  async createBusiness(data: Omit<Business, 'id' | 'createdAt'>): Promise<Business> {
    const business = await this.prisma.business.create({
      data: {
        name: data.name,
        phone: data.phone,
        email: data.email,
        coverageZones: data.coverageZones,
        workingHours: data.workingHours as any,
        serviceType: data.serviceType,
        agentPrompt: data.agentPrompt,
      },
    });
    return this.mapBusiness(business);
  }

  async updateBusiness(id: string, data: Partial<Business>): Promise<Business> {
    const business = await this.prisma.business.update({
      where: { id },
      data: {
        name: data.name,
        phone: data.phone,
        email: data.email,
        coverageZones: data.coverageZones,
        workingHours: data.workingHours as any,
        serviceType: data.serviceType,
        agentPrompt: data.agentPrompt,
      },
    });
    return this.mapBusiness(business);
  }

  // Order methods
  async getOrder(id: string): Promise<Order | null> {
    const order = await this.prisma.order.findUnique({
      where: { id },
    });
    return order ? this.mapOrder(order) : null;
  }

  async getOrdersByBusiness(
    businessId: string,
    status?: Order['status']
  ): Promise<Order[]> {
    const orders = await this.prisma.order.findMany({
      where: {
        businessId,
        ...(status && { status: status.toUpperCase() as any }),
      },
      orderBy: { createdAt: 'desc' },
    });
    return orders.map(this.mapOrder);
  }

  async createOrder(data: Omit<Order, 'id' | 'createdAt' | 'updatedAt'>): Promise<Order> {
    const order = await this.prisma.order.create({
      data: {
        businessId: data.businessId,
        status: data.status.toUpperCase() as any,
        items: data.items,
        addressRaw: data.addressRaw,
        addressFormatted: data.addressFormatted,
        neighborhood: data.neighborhood,
        lat: data.lat,
        lng: data.lng,
        preferredDate: data.preferredDate,
        clientName: data.clientName,
        clientPhone: data.clientPhone,
        threadId: data.threadId,
      },
    });
    return this.mapOrder(order);
  }

  async updateOrder(id: string, data: Partial<Order>): Promise<Order> {
    const order = await this.prisma.order.update({
      where: { id },
      data: {
        status: data.status?.toUpperCase() as any,
        items: data.items,
        addressRaw: data.addressRaw,
        addressFormatted: data.addressFormatted,
        neighborhood: data.neighborhood,
        lat: data.lat,
        lng: data.lng,
        preferredDate: data.preferredDate,
        clientName: data.clientName,
        clientPhone: data.clientPhone,
      },
    });
    return this.mapOrder(order);
  }

  async markOrdersAsRouted(orderIds: string[], routeId: string): Promise<void> {
    await this.prisma.order.updateMany({
      where: { id: { in: orderIds } },
      data: { status: 'ROUTED', routeId },
    });
  }

  // Route methods
  async getRoute(id: string): Promise<Route | null> {
    const route = await this.prisma.route.findUnique({
      where: { id },
      include: { orders: true },
    });
    return route ? this.mapRoute(route) : null;
  }

  async getRoutesByBusiness(businessId: string): Promise<Route[]> {
    const routes = await this.prisma.route.findMany({
      where: { businessId },
      include: { orders: true },
      orderBy: { createdAt: 'desc' },
    });
    return routes.map(this.mapRoute);
  }

  async createRoute(data: Omit<Route, 'id' | 'createdAt' | 'updatedAt'>): Promise<Route> {
    const route = await this.prisma.route.create({
      data: {
        businessId: data.businessId,
        driverLabel: data.driverLabel,
        status: data.status.toUpperCase() as any,
        ordersOrder: data.ordersOrder,
        totalDistance: data.totalDistance,
        totalDuration: data.totalDuration,
        googleMapsUrl: data.googleMapsUrl,
      },
      include: { orders: true },
    });
    return this.mapRoute(route);
  }

  async updateRoute(id: string, data: Partial<Route>): Promise<Route> {
    const route = await this.prisma.route.update({
      where: { id },
      data: {
        status: data.status?.toUpperCase() as any,
        ordersOrder: data.ordersOrder,
        totalDistance: data.totalDistance,
        totalDuration: data.totalDuration,
      },
      include: { orders: true },
    });
    return this.mapRoute(route);
  }

  // Conversation methods (KV)
  async saveMessage(businessId: string, threadId: string, message: Message): Promise<void> {
    const key = `conversation:${businessId}:${threadId}`;
    await kv.rpush(key, JSON.stringify(message));
    await kv.ltrim(key, -50, -1); // Keep last 50 messages
  }

  async getConversation(businessId: string, threadId: string): Promise<Message[]> {
    const key = `conversation:${businessId}:${threadId}`;
    const messages = (await kv.lrange(key, 0, -1)) as string[];
    return messages.map(m => JSON.parse(m));
  }

  // Mappers
  private mapBusiness(business: any): Business {
    return {
      id: business.id,
      name: business.name,
      phone: business.phone,
      email: business.email,
      coverageZones: business.coverageZones,
      workingHours: business.workingHours,
      serviceType: business.serviceType,
      agentPrompt: business.agentPrompt,
      createdAt: business.createdAt,
    };
  }

  private mapOrder(order: any): Order {
    return {
      id: order.id,
      businessId: order.businessId,
      status: order.status.toLowerCase(),
      items: order.items,
      addressRaw: order.addressRaw,
      addressFormatted: order.addressFormatted,
      neighborhood: order.neighborhood,
      lat: order.lat,
      lng: order.lng,
      preferredDate: order.preferredDate,
      clientName: order.clientName,
      clientPhone: order.clientPhone,
      threadId: order.threadId,
      createdAt: order.createdAt,
      updatedAt: order.updatedAt,
    };
  }

  private mapRoute(route: any): Route {
    return {
      id: route.id,
      businessId: route.businessId,
      driverLabel: route.driverLabel,
      status: route.status.toLowerCase(),
      orders: route.orders.map(this.mapOrder),
      ordersOrder: route.ordersOrder,
      totalDistance: route.totalDistance,
      totalDuration: route.totalDuration,
      googleMapsUrl: route.googleMapsUrl,
      createdAt: route.createdAt,
    };
  }
}
```

#### 3.2 AI adapter (Anthropic)

```typescript
// lib/adapters/ai/anthropic-client.ts

import { generateText } from 'ai';
import { anthropic } from '@ai-sdk/anthropic';
import type { AIClient } from './interface';
import type { Message } from '@/lib/core/types';

export class AnthropicClient implements AIClient {
  private model = anthropic('claude-sonnet-4-5-20250929');

  async generateResponse(params: {
    messages: Message[];
    systemPrompt: string;
  }): Promise<string> {
    const { messages, systemPrompt } = params;

    const formattedMessages = messages.map(m => ({
      role: m.role as 'user' | 'assistant',
      content: m.content,
    }));

    const { text } = await generateText({
      model: this.model,
      system: systemPrompt,
      messages: formattedMessages,
    });

    return text;
  }

  async extractOrderData(conversationText: string): Promise<{
    items?: string;
    address?: string;
    neighborhood?: string;
    preferredDate?: string;
    clientName?: string;
    clientPhone?: string;
  }> {
    const { text } = await generateText({
      model: this.model,
      system: `Sos un extractor de datos. Analizá la conversación y devolvé SOLO un objeto JSON válido (sin markdown, sin explicaciones) con estos campos: items, address, neighborhood, preferred_date, client_name, client_phone. Si falta algo, no lo incluyas. Ejemplo: {"items":"heladera","address":"Rivera 1500","neighborhood":"La Comercial","preferred_date":"martes","client_name":"Roberto","client_phone":"099123456"}`,
      prompt: conversationText,
    });

    // Clean markdown if present
    let jsonText = text.trim();
    if (jsonText.startsWith('```')) {
      jsonText = jsonText.replace(/```json\n?/g, '').replace(/```\n?/g, '');
    }

    try {
      return JSON.parse(jsonText);
    } catch (error) {
      console.error('Failed to parse order data:', text);
      return {};
    }
  }
}
```

#### 3.3 Messaging adapter (Kapso)

```typescript
// lib/adapters/messaging/kapso-client.ts

import type { MessagingClient } from './interface';

export class KapsoClient implements MessagingClient {
  private apiKey: string;
  private phoneNumberId: string;

  constructor(apiKey: string, phoneNumberId: string) {
    this.apiKey = apiKey;
    this.phoneNumberId = phoneNumberId;
  }

  async sendMessage(params: { to: string; message: string }): Promise<void> {
    const response = await fetch('https://api.kapso.ai/v1/messages', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        phone_number_id: this.phoneNumberId,
        to: params.to,
        type: 'text',
        text: {
          body: params.message,
        },
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Kapso API error: ${error}`);
    }
  }

  async sendTemplate(params: {
    to: string;
    templateName: string;
    variables: Record<string, string>;
  }): Promise<void> {
    // Implementar cuando necesites templates
    throw new Error('Not implemented');
  }
}
```

#### 3.4 Geocoding adapter (Google Maps)

```typescript
// lib/adapters/geocoding/google-maps-client.ts

import { kv } from '@vercel/kv';
import type { GeocodingClient } from './interface';
import type { GeocodingResult } from '@/lib/core/types';

export class GoogleMapsClient implements GeocodingClient {
  private apiKey: string;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  async geocode(address: string): Promise<GeocodingResult | null> {
    // Check cache first
    const cacheKey = `geocode:${address.toLowerCase()}`;
    const cached = await kv.get<GeocodingResult>(cacheKey);
    if (cached) return cached;

    // Call Google Maps Geocoding API
    const url = new URL('https://maps.googleapis.com/maps/api/geocode/json');
    url.searchParams.set('address', address);
    url.searchParams.set('key', this.apiKey);
    url.searchParams.set('region', 'uy'); // Bias to Uruguay

    const response = await fetch(url.toString());
    const data = await response.json();

    if (data.status !== 'OK' || !data.results || data.results.length === 0) {
      return null;
    }

    const result = data.results[0];
    const location = result.geometry.location;

    const geocodingResult: GeocodingResult = {
      lat: location.lat,
      lng: location.lng,
      formattedAddress: result.formatted_address,
    };

    // Cache for 30 days
    await kv.set(cacheKey, geocodingResult, { ex: 60 * 60 * 24 * 30 });

    return geocodingResult;
  }

  async reverseGeocode(lat: number, lng: number): Promise<string> {
    const url = new URL('https://maps.googleapis.com/maps/api/geocode/json');
    url.searchParams.set('latlng', `${lat},${lng}`);
    url.searchParams.set('key', this.apiKey);

    const response = await fetch(url.toString());
    const data = await response.json();

    if (data.status !== 'OK' || !data.results || data.results.length === 0) {
      return `${lat}, ${lng}`;
    }

    return data.results[0].formatted_address;
  }
}
```

#### 3.5 Audio adapter (Whisper)

```typescript
// lib/adapters/audio/whisper-client.ts

import OpenAI from 'openai';
import type { AudioTranscriptionClient } from './interface';

export class WhisperClient implements AudioTranscriptionClient {
  private openai: OpenAI;

  constructor(apiKey: string) {
    this.openai = new OpenAI({ apiKey });
  }

  async transcribe(audioUrl: string): Promise<string> {
    // Download audio file
    const response = await fetch(audioUrl);
    const audioBuffer = await response.arrayBuffer();
    const audioFile = new File([audioBuffer], 'audio.ogg', { type: 'audio/ogg' });

    // Transcribe with Whisper
    const transcription = await this.openai.audio.transcriptions.create({
      file: audioFile,
      model: 'whisper-1',
      language: 'es',
    });

    return transcription.text;
  }
}
```

---

### Fase 4: Dependency Injection (30 min)

```typescript
// lib/config/dependencies.ts

import { PostgresRepository } from '@/lib/adapters/database/postgres-repository';
import { AnthropicClient } from '@/lib/adapters/ai/anthropic-client';
import { KapsoClient } from '@/lib/adapters/messaging/kapso-client';
import { GoogleMapsClient } from '@/lib/adapters/geocoding/google-maps-client';
import { WhisperClient } from '@/lib/adapters/audio/whisper-client';
import { AgentService } from '@/lib/core/services/agent-service';
import { RouteService } from '@/lib/core/services/route-service';

// Singleton instances
let dbInstance: PostgresRepository | null = null;
let aiInstance: AnthropicClient | null = null;
let messagingInstance: KapsoClient | null = null;
let geocodingInstance: GoogleMapsClient | null = null;
let audioInstance: WhisperClient | null = null;
let agentServiceInstance: AgentService | null = null;
let routeServiceInstance: RouteService | null = null;

// Adapters
export function getDatabase(): PostgresRepository {
  if (!dbInstance) {
    dbInstance = new PostgresRepository();
  }
  return dbInstance;
}

export function getAI(): AnthropicClient {
  if (!aiInstance) {
    aiInstance = new AnthropicClient();
  }
  return aiInstance;
}

export function getMessaging(): KapsoClient {
  if (!messagingInstance) {
    const apiKey = process.env.KAPSO_API_KEY;
    const phoneNumberId = process.env.KAPSO_PHONE_NUMBER_ID;
    if (!apiKey || !phoneNumberId) {
      throw new Error('Kapso credentials not configured');
    }
    messagingInstance = new KapsoClient(apiKey, phoneNumberId);
  }
  return messagingInstance;
}

export function getGeocoding(): GoogleMapsClient {
  if (!geocodingInstance) {
    const apiKey = process.env.GOOGLE_MAPS_API_KEY;
    if (!apiKey) {
      throw new Error('Google Maps API key not configured');
    }
    geocodingInstance = new GoogleMapsClient(apiKey);
  }
  return geocodingInstance;
}

export function getAudio(): WhisperClient {
  if (!audioInstance) {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new Error('OpenAI API key not configured');
    }
    audioInstance = new WhisperClient(apiKey);
  }
  return audioInstance;
}

// Services
export function getAgentService(): AgentService {
  if (!agentServiceInstance) {
    agentServiceInstance = new AgentService(
      getAI(),
      getDatabase(),
      getGeocoding()
    );
  }
  return agentServiceInstance;
}

export function getRouteService(): RouteService {
  if (!routeServiceInstance) {
    routeServiceInstance = new RouteService(
      getDatabase(),
      getGeocoding(),
      getMessaging()
    );
  }
  return routeServiceInstance;
}
```

---

### Fase 5: API Routes (1-2 horas)

#### 5.1 WhatsApp webhook

```typescript
// app/api/webhooks/whatsapp/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { getAgentService, getDatabase, getAudio } from '@/lib/config/dependencies';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Kapso webhook format
    const { phone_number_id, messages } = body;

    if (!messages || messages.length === 0) {
      return NextResponse.json({ status: 'no messages' });
    }

    const message = messages[0];
    const senderPhone = message.from;
    const threadId = message.id; // Use message ID as thread ID

    // Find business by phone number
    const db = getDatabase();
    const business = await db.getBusinessByPhone(phone_number_id);

    if (!business) {
      console.error('Business not found for phone:', phone_number_id);
      return NextResponse.json({ error: 'Business not configured' }, { status: 400 });
    }

    // Handle different message types
    let messageText: string;

    if (message.type === 'text') {
      messageText = message.text.body;
    } else if (message.type === 'audio') {
      // Transcribe audio
      const audio = getAudio();
      messageText = await audio.transcribe(message.audio.url);
    } else {
      // Unsupported message type
      return NextResponse.json({ status: 'unsupported type' });
    }

    // Process message with agent
    const agentService = getAgentService();
    const response = await agentService.processMessage({
      businessId: business.id,
      threadId,
      message: messageText,
      senderPhone,
    });

    // Send response via Kapso
    const messaging = require('@/lib/config/dependencies').getMessaging();
    await messaging.sendMessage({
      to: senderPhone,
      message: response,
    });

    return NextResponse.json({ status: 'ok' });
  } catch (error) {
    console.error('WhatsApp webhook error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Webhook verification (for Kapso setup)
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const mode = searchParams.get('hub.mode');
  const token = searchParams.get('hub.verify_token');
  const challenge = searchParams.get('hub.challenge');

  const verifyToken = process.env.KAPSO_VERIFY_TOKEN || 'ruteador_verify';

  if (mode === 'subscribe' && token === verifyToken) {
    return new NextResponse(challenge, { status: 200 });
  }

  return NextResponse.json({ error: 'Verification failed' }, { status: 403 });
}
```

#### 5.2 Orders API

```typescript
// app/api/orders/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { getDatabase } from '@/lib/config/dependencies';

export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.businessId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const searchParams = request.nextUrl.searchParams;
  const status = searchParams.get('status') as any;

  const db = getDatabase();
  const orders = await db.getOrdersByBusiness(session.user.businessId, status);

  return NextResponse.json(orders);
}
```

#### 5.3 Generate route API

```typescript
// app/api/routes/generate/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { getRouteService } from '@/lib/config/dependencies';

export async function POST(request: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.businessId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json();
  const { orderIds, driverLabel, driverPhone } = body;

  if (!orderIds || orderIds.length === 0) {
    return NextResponse.json(
      { error: 'No orders selected' },
      { status: 400 }
    );
  }

  const routeService = getRouteService();

  const { routeId, optimization } = await routeService.generateRoute({
    businessId: session.user.businessId,
    orderIds,
    driverLabel: driverLabel || 'Chofer',
  });

  // Send to driver if phone provided
  if (driverPhone) {
    await routeService.sendRouteToDriver({
      routeId,
      driverPhone,
    });
  }

  return NextResponse.json({
    routeId,
    optimization,
  });
}
```

---

### Fase 6: Authentication (1 hora)

```typescript
// app/api/auth/[...nextauth]/route.ts

import NextAuth, { type NextAuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import { compare } from 'bcryptjs';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: 'Credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null;
        }

        const user = await prisma.user.findUnique({
          where: { email: credentials.email },
          include: { business: true },
        });

        if (!user) {
          return null;
        }

        const isValid = await compare(credentials.password, user.passwordHash);

        if (!isValid) {
          return null;
        }

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          businessId: user.businessId,
          role: user.role,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.businessId = user.businessId;
        token.role = user.role;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.businessId = token.businessId as string;
        session.user.role = token.role as string;
      }
      return session;
    },
  },
  pages: {
    signIn: '/login',
  },
  session: {
    strategy: 'jwt',
  },
};

const handler = NextAuth(authOptions);
export { handler as GET, handler as POST };
```

```typescript
// app/(auth)/login/page.tsx

'use client';

import { signIn } from 'next-auth/react';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const result = await signIn('credentials', {
      email,
      password,
      redirect: false,
    });

    if (result?.error) {
      setError('Email o contraseña incorrectos');
    } else {
      router.push('/dashboard');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">
          Ruteador - Iniciar sesión
        </h1>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Contraseña
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              required
            />
          </div>

          {error && (
            <p className="text-sm text-red-600">{error}</p>
          )}

          <button
            type="submit"
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg transition-colors"
          >
            Iniciar sesión
          </button>
        </form>
      </div>
    </div>
  );
}
```

---

### Fase 7: Dashboard (copiar del proyecto actual y adaptar)

Copiar componentes de `app/dashboard/` del proyecto actual y adaptar para:
1. Usar `getServerSession()` para obtener `businessId`
2. Filtrar pedidos por `businessId`
3. Actualizar llamadas a APIs

---

## 🧪 Testing

### Crear tests básicos

```typescript
// lib/core/services/__tests__/agent-service.test.ts

import { test, expect, mock } from 'bun:test';
import { AgentService } from '../agent-service';

test('processMessage creates order when confirmed', async () => {
  const mockAI = {
    generateResponse: mock(() => Promise.resolve('CONFIRMADO. Perfecto, anotado!')),
    extractOrderData: mock(() => Promise.resolve({
      items: 'heladera',
      address: 'Rivera 1500',
      neighborhood: 'La Comercial',
    })),
  };

  const mockDB = {
    getBusinessById: mock(() => Promise.resolve({
      id: 'biz1',
      name: 'Test Business',
      phone: '+59891234567',
      coverageZones: ['Centro'],
      serviceType: 'junk_removal',
      workingHours: {},
    })),
    saveMessage: mock(() => Promise.resolve()),
    getConversation: mock(() => Promise.resolve([])),
    createOrder: mock(() => Promise.resolve({ id: 'ord1' })),
  };

  const mockGeocoding = {
    geocode: mock(() => Promise.resolve({
      lat: -34.9,
      lng: -56.1,
      formattedAddress: 'Rivera 1500, Montevideo',
    })),
  };

  const service = new AgentService(mockAI as any, mockDB as any, mockGeocoding as any);

  await service.processMessage({
    businessId: 'biz1',
    threadId: 'thread1',
    message: 'Tengo una heladera en Rivera 1500',
    senderPhone: '+59899999999',
  });

  expect(mockDB.createOrder).toHaveBeenCalled();
});
```

---

## 🚀 Deploy

### 1. Setup en Vercel

```bash
vercel link
vercel env pull .env.local
```

### 2. Agregar secrets en Vercel dashboard

Todas las variables de `.env.local` deben estar en Vercel como Environment Variables.

### 3. Deploy

```bash
vercel --prod
```

### 4. Configurar webhook de Kapso

En el dashboard de Kapso, configurar webhook URL:
```
https://tu-dominio.vercel.app/api/webhooks/whatsapp
```

---

## ✅ Checklist de lanzamiento

Antes de mostrarle a un cliente:

- [ ] Todas las variables de entorno configuradas
- [ ] Base de datos Postgres funcionando
- [ ] Vercel KV configurado
- [ ] Kapso webhook configurado y testeado
- [ ] Google Maps API key con permisos (Geocoding + Directions)
- [ ] OpenAI API key para Whisper
- [ ] Anthropic API key
- [ ] NextAuth configurado con secret seguro
- [ ] Al menos 1 negocio creado en la DB
- [ ] Al menos 1 usuario creado (con password hasheado)
- [ ] Test end-to-end: mandar mensaje por WhatsApp → ver en dashboard → generar ruta
- [ ] Test de audios: mandar nota de voz → transcribe y procesa
- [ ] Dashboard protegido con auth
- [ ] Sentry configurado (opcional pero recomendado)

---

## 📝 Script de setup para primer negocio

```typescript
// scripts/setup-business.ts

import { PrismaClient } from '@prisma/client';
import { hash } from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  // Create business
  const business = await prisma.business.create({
    data: {
      name: 'Mi Negocio',
      phone: '+59891234567', // Tu número de WhatsApp de Kapso
      email: 'contacto@minegocio.com',
      coverageZones: ['Pocitos', 'Cordón', 'Centro', 'Ciudad Vieja'],
      workingHours: {
        monday: { start: '08:00', end: '18:00' },
        tuesday: { start: '08:00', end: '18:00' },
        wednesday: { start: '08:00', end: '18:00' },
        thursday: { start: '08:00', end: '18:00' },
        friday: { start: '08:00', end: '18:00' },
        saturday: { start: '09:00', end: '13:00' },
      },
      serviceType: 'junk_removal',
    },
  });

  console.log('✅ Business created:', business.id);

  // Create admin user
  const passwordHash = await hash('changeme123', 12);
  const user = await prisma.user.create({
    data: {
      email: 'admin@minegocio.com',
      name: 'Admin',
      passwordHash,
      role: 'ADMIN',
      businessId: business.id,
    },
  });

  console.log('✅ User created:', user.email);
  console.log('\nCredenciales:');
  console.log('Email:', user.email);
  console.log('Password: changeme123');
  console.log('\n⚠️  CAMBIAR LA CONTRASEÑA DESPUÉS DEL PRIMER LOGIN');
}

main()
  .then(() => prisma.$disconnect())
  .catch((e) => {
    console.error(e);
    prisma.$disconnect();
    process.exit(1);
  });
```

```bash
bun run scripts/setup-business.ts
```

---

## 🎯 Resultado final

Después de seguir esta guía tendrás:

✅ Arquitectura multi-tenant production-ready
✅ WhatsApp como canal principal (via Kapso)
✅ Procesamiento de mensajes de texto Y voz
✅ Geocoding real con Google Maps
✅ Agente conversacional en español
✅ Dashboard protegido con auth
✅ Generación de rutas optimizadas
✅ Código portable (fácil de migrar a otra plataforma)
✅ Separación clara entre core logic y framework
✅ Listo para escalar de 1 a 100+ negocios

**Tiempo estimado total**: 8-12 horas de desarrollo concentrado

---

## 💰 Costos de Vercel (todo incluido)

### Plan Hobby (Gratis) - Para desarrollo y testing
- ✅ Vercel Postgres: 256MB, 60 horas compute/mes
- ✅ Vercel KV: 256MB, 3,000 comandos/día
- ✅ Hosting: 100GB bandwidth
- ✅ Serverless functions: 100GB-Hours
- ❌ Solo 1 miembro del equipo
- ❌ Sin dominios comerciales

**Suficiente para**: Testing, desarrollo, 1-2 clientes piloto

### Plan Pro ($20/mes) - Para producción
- ✅ Postgres: 256MB incluido, después $0.12/GB extra
- ✅ KV: $40/millón de comandos (muy barato)
- ✅ Hosting: 1TB bandwidth
- ✅ Serverless: ilimitado
- ✅ Analytics incluido
- ✅ Múltiples miembros
- ✅ Dominios custom

**Suficiente para**: 1-50 clientes, ~10,000 pedidos/mes

### Estimación de costos para Ruteador (10 clientes activos)

```
Plan Pro:                    $20/mes
Postgres (uso típico):       $5/mes   (512MB = 256MB extra × $0.12/GB)
KV (50k comandos/día):       $1-2/mes
Serverless functions:        Incluido
Total:                       ~$25-30/mes
```

**Costos adicionales (fuera de Vercel):**
```
Kapso WhatsApp:             $0-25/mes (plan gratuito hasta Pro)
Anthropic API:              $15-30/mes (según uso)
Google Maps API:            $10-20/mes (geocoding + directions)
OpenAI Whisper:             $5-10/mes (transcripción de audios)
Total APIs externas:        $30-85/mes

TOTAL OPERACIONAL:          $55-115/mes para 10 clientes
```

**Revenue objetivo**: $800-1,000/mes (10 clientes × $80-100/mes)
**Margen**: 85-90% 🎯

---

## 📚 Recursos adicionales

- [Kapso.ai Docs](https://docs.kapso.ai)
- [Google Maps Platform](https://developers.google.com/maps)
- [Next.js 15 Docs](https://nextjs.org/docs)
- [NextAuth.js](https://next-auth.js.org/)
- [Anthropic API](https://docs.anthropic.com/)
- [Vercel Postgres](https://vercel.com/docs/storage/vercel-postgres)
- [Vercel KV](https://vercel.com/docs/storage/vercel-kv)

---

¡Éxito con el proyecto! 🚀
