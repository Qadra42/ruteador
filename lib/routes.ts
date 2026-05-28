import { sql } from "./db";

/**
 * Save a route to Postgres for map visualization
 */
export async function saveRouteForMap(params: {
  orders: any[];
  driverLabel: string;
  companyId: string;
  driverCount: string;
  googleMapsUrl?: string;
}) {
  const orderIds = params.orders.map((o: any) => o.id);

  // Build optimized sequence (for now, just use the order as-is)
  // TODO: Implement actual route optimization in Phase 5
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

/**
 * Get a saved route by ID
 */
export async function getRoute(routeId: string) {
  const [route] = await sql`
    SELECT r.*, c.*
    FROM routes r
    JOIN companies c ON r.company_id = c.id
    WHERE r.id = ${routeId}
  `;

  return route;
}
