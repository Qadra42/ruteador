import { kv } from "@vercel/kv";
import { nanoid } from "nanoid";
import type { Order } from "./types";

export async function saveOrder(
  params: Omit<Order, "id" | "status" | "created_at" | "telegram_thread_id">,
  threadId?: string
): Promise<Order> {
  const order: Order = {
    ...params,
    id: nanoid(8),
    status: "pending",
    created_at: new Date().toISOString(),
    telegram_thread_id: threadId || "",
  };
  await kv.hset(`order:${order.id}`, order);
  await kv.sadd("orders:pending", order.id);
  return order;
}

export async function getPendingOrders(): Promise<Order[]> {
  const ids = (await kv.smembers("orders:pending")) as string[];
  const orders = await Promise.all(
    ids.map((id) => kv.hgetall(`order:${id}`))
  );
  return orders.filter(Boolean) as Order[];
}

export async function markOrdersAsRouted(orderIds: string[]): Promise<void> {
  for (const id of orderIds) {
    const order = await kv.hgetall(`order:${id}`);
    if (order) {
      await kv.hset(`order:${id}`, { ...order, status: "routed" });
      await kv.srem("orders:pending", id);
      await kv.sadd("orders:routed", id);
    }
  }
}

export async function saveMessage(
  threadId: string,
  role: string,
  content: string
): Promise<void> {
  await kv.rpush(`conversation:${threadId}`, JSON.stringify({ role, content }));
  // Mantener solo los últimos 20 mensajes por conversación
  await kv.ltrim(`conversation:${threadId}`, -20, -1);
}

export async function getConversationHistory(threadId: string): Promise<any[]> {
  const messages = (await kv.lrange(`conversation:${threadId}`, 0, -1)) as string[];
  return messages.map((m) => JSON.parse(m));
}
