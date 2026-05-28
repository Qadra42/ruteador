/**
 * Routes repository - Pure SQL queries
 */

import { sql } from '../db';
import type { RouteParams } from '../types';

export async function insertRoute(params: RouteParams) {
  const orderIds = params.orders.map((o: any) => o.id);

  const optimizedSequence = params.orders.map((o: any, idx: number) => ({
    sequence: idx + 1,
    orderId: o.id,
    address: o.address,
    items: o.items,
  }));

  const [route] = await sql`
    INSERT INTO routes (
      company_id,
      driver_count,
      order_ids,
      optimized_sequence,
      google_maps_url
    )
    VALUES (
      ${params.companyId},
      ${params.driverCount},
      ${JSON.stringify(orderIds)},
      ${JSON.stringify(optimizedSequence)},
      ${params.googleMapsUrl || null}
    )
    RETURNING *
  `;

  return route;
}

export async function findRouteById(routeId: string) {
  const [route] = await sql`
    SELECT r.*, c.*
    FROM routes r
    JOIN companies c ON r.company_id = c.id
    WHERE r.id = ${routeId}
  `;

  return route;
}
