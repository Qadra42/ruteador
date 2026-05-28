import { kv } from "@vercel/kv";
import { prisma } from "./db";

/**
 * Save a new order to the database (Postgres via Prisma)
 */
export async function saveOrder(
  orderData: {
    items: string;
    address: string;
    neighborhood?: string;
    preferred_date?: string;
    client_name?: string;
    client_phone?: string;
  },
  customerPhone: string,
  companyId: string
) {
  const order = await prisma.order.create({
    data: {
      companyId,
      customerPhone,
      customerName: orderData.client_name || null,
      items: orderData.items,
      address: orderData.neighborhood
        ? `${orderData.address}, ${orderData.neighborhood}`
        : orderData.address,
      preferredDate: orderData.preferred_date || "lo antes posible",
      status: "pending",
      confirmedAt: new Date(),
    },
  });

  return order;
}

/**
 * Get all pending orders for a company
 */
export async function getPendingOrders(companyId: string) {
  return await prisma.order.findMany({
    where: {
      companyId,
      status: {
        in: ["pending", "assigned"],
      },
    },
    orderBy: {
      createdAt: "desc",
    },
  });
}

/**
 * Mark orders as assigned to a route
 */
export async function markOrdersAsRouted(
  orderIds: string[],
  routeId: string
): Promise<void> {
  await prisma.order.updateMany({
    where: {
      id: {
        in: orderIds,
      },
    },
    data: {
      status: "assigned",
      routeId,
    },
  });
}

/**
 * Conversation history management (kept in KV for speed)
 * Key format: conversation:{companyId}:{customerPhone}
 */
export async function saveMessage(
  threadId: string,
  role: string,
  content: string
): Promise<void> {
  await kv.rpush(`conversation:${threadId}`, JSON.stringify({ role, content }));
  // Keep only the last 20 messages per conversation
  await kv.ltrim(`conversation:${threadId}`, -20, -1);
}

export async function getConversationHistory(threadId: string): Promise<any[]> {
  const messages = (await kv.lrange(`conversation:${threadId}`, 0, -1)) as any[];
  return messages.map((m) => {
    // If it's already an object, return it directly
    if (typeof m === "object") return m;
    // If it's a string, parse it
    return JSON.parse(m as string);
  });
}
