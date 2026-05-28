import { kv } from "@vercel/kv";
import { sql } from "./db";

/**
 * Save a new order to the database (Raw SQL)
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
  const address = orderData.neighborhood
    ? `${orderData.address}, ${orderData.neighborhood}`
    : orderData.address;

  const [order] = await sql`
    INSERT INTO orders (
      company_id,
      customer_phone,
      customer_name,
      items,
      address,
      preferred_date,
      status,
      confirmed_at
    )
    VALUES (
      ${companyId},
      ${customerPhone},
      ${orderData.client_name || null},
      ${orderData.items},
      ${address},
      ${orderData.preferred_date || "lo antes posible"},
      'pending',
      NOW()
    )
    RETURNING *
  `;

  return order;
}

/**
 * Get all pending orders for a company
 */
export async function getPendingOrders(companyId: string) {
  return await sql`
    SELECT * FROM orders
    WHERE company_id = ${companyId}
    AND status IN ('pending', 'assigned')
    ORDER BY created_at DESC
  `;
}

/**
 * Mark orders as assigned to a route
 */
export async function markOrdersAsRouted(
  orderIds: string[],
  routeId: string
): Promise<void> {
  await sql`
    UPDATE orders
    SET status = 'assigned', route_id = ${routeId}
    WHERE id = ANY(${orderIds})
  `;
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
