/**
 * Orders service - Business logic
 */

import { kv } from "@vercel/kv";
import type { OrderData } from '../types';
import * as ordersRepo from './orders.repository';

/**
 * Save a new order to the database
 */
export async function saveOrder(
  orderData: OrderData,
  customerPhone: string,
  companyId: string
) {
  return ordersRepo.insertOrder(orderData, customerPhone, companyId);
}

/**
 * Get all pending orders for a company
 */
export async function getPendingOrders(companyId: string) {
  return ordersRepo.findPendingOrdersByCompany(companyId);
}

/**
 * Mark orders as assigned to a route
 */
export async function markOrdersAsRouted(
  orderIds: string[],
  routeId: string
): Promise<void> {
  return ordersRepo.updateOrdersStatus(orderIds, routeId);
}

/**
 * Save a message to conversation history (in KV for speed)
 */
export async function saveMessage(
  threadId: string,
  role: string,
  content: string
): Promise<void> {
  await kv.rpush(`conversation:${threadId}`, JSON.stringify({ role, content }));
  await kv.ltrim(`conversation:${threadId}`, -20, -1);
}

/**
 * Get conversation history from KV
 */
export async function getConversationHistory(threadId: string): Promise<any[]> {
  const messages = (await kv.lrange(`conversation:${threadId}`, 0, -1)) as any[];
  return messages.map((m) => {
    if (typeof m === "object") return m;
    return JSON.parse(m as string);
  });
}
