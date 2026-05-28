# Architecture V2 - Queue-based processing

## Current (V1) - Direct processing
```
WhatsApp → Vercel webhook → Process with AI → Respond
                            ⚠️ Blocks, timeouts, cold starts
```

## Proposed (V2) - Queue-based
```
WhatsApp → Vercel webhook → Enqueue → Return 200 OK
                              ↓
                          Redis Queue
                              ↓
                        Railway Worker
                        - Process AI
                        - No timeouts
                        - Scales horizontally
                              ↓
                          Kapso API
```

## Implementation plan

### Step 1: Add queue (1-2 hours)
```typescript
// app/api/webhooks/whatsapp/route.ts
import { Queue } from 'bullmq';

const queue = new Queue('whatsapp-messages', {
  connection: {
    host: process.env.REDIS_HOST,
    port: 6379,
  }
});

export async function POST(request: NextRequest) {
  const body = await request.json();

  // Enqueue instead of processing
  await queue.add('process-message', {
    from: body.message.from,
    text: body.message.text.body,
    messageId: body.message.id,
  });

  // Return immediately
  return NextResponse.json({ status: 'queued' });
}
```

### Step 2: Create worker (2-3 hours)
```typescript
// worker/index.ts
import { Worker } from 'bullmq';
import { handleMessage } from '../lib/agent/agent.service';

const worker = new Worker('whatsapp-messages', async (job) => {
  const { from, text, messageId } = job.data;

  // Process with AI (no timeout limits)
  const response = await handleMessage(text, threadId, companyId, from);

  // Send response
  await kapso.sendMessage({ to: from, message: response });
});

// Deploy to Railway
```

### Step 3: Deploy worker to Railway
```bash
# railway.json
{
  "build": {
    "builder": "NIXPACKS",
    "buildCommand": "bun install"
  },
  "deploy": {
    "startCommand": "bun worker/index.ts",
    "restartPolicyType": "ON_FAILURE"
  }
}
```

## Benefits
- ✅ No timeouts (worker can take 5 minutes if needed)
- ✅ No cold starts (worker is always warm)
- ✅ Parallel processing (10+ workers)
- ✅ Retry logic (if AI call fails)
- ✅ Monitoring (see queue depth)

## Cost
- Upstash Redis: $0 (free tier: 10k requests/day)
- Railway worker: $5-10/month (always on)

## When to implement
**Now** - Before you have customers. It's easier to build right from the start.
