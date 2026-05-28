import { prisma } from "./db";
import type { Order } from "./types";

/**
 * Save a route to Postgres for map visualization
 */
export async function saveRouteForMap(params: {
  orders: Order[];
  driverLabel: string;
  companyId: string;
  driverCount: string;
  googleMapsUrl?: string;
}) {
  const orderIds = params.orders.map((o) => o.id);

  // Build optimized sequence (for now, just use the order as-is)
  // TODO: Implement actual route optimization in Phase 5
  const optimizedSequence = params.orders.map((o, idx) => ({
    sequence: idx + 1,
    orderId: o.id,
    address: o.address,
    items: o.items,
  }));

  const route = await prisma.route.create({
    data: {
      companyId: params.companyId,
      driverCount: params.driverCount,
      orderIds,
      optimizedSequence,
      googleMapsUrl: params.googleMapsUrl || null,
    },
  });

  return route;
}

/**
 * Get a saved route by ID
 */
export async function getRoute(routeId: string) {
  return await prisma.route.findUnique({
    where: { id: routeId },
    include: {
      company: true,
    },
  });
}
