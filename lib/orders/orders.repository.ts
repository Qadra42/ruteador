/**
 * Orders repository - Pure SQL queries
 */

import { sql } from '../db';
import type { OrderData } from '../types';

export async function insertOrder(
  orderData: OrderData,
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

export async function findPendingOrdersByCompany(companyId: string) {
  return await sql`
    SELECT * FROM orders
    WHERE company_id = ${companyId}
    AND status IN ('pending', 'assigned')
    ORDER BY created_at DESC
  `;
}

export async function updateOrdersStatus(
  orderIds: string[],
  routeId: string
): Promise<void> {
  await sql`
    UPDATE orders
    SET status = 'assigned', route_id = ${routeId}
    WHERE id = ANY(${orderIds})
  `;
}
