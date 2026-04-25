import { kv } from "@vercel/kv";
import { nanoid } from "nanoid";
import type { SavedRoute, Order } from "./types";

/**
 * Save a route to KV for map visualization
 */
export async function saveRouteForMap(params: {
  orders: Order[];
  driverLabel: string;
}): Promise<SavedRoute> {
  const routeId = nanoid(12);

  // Calculate center point (average of all coordinates)
  const coords = params.orders.map((o) => ({
    lat: -34.9058, // Default, will use actual coords from NEIGHBORHOOD_COORDS
    lng: -56.1913,
  }));

  const center = {
    lat: coords.reduce((sum, c) => sum + c.lat, 0) / coords.length || -34.9058,
    lng: coords.reduce((sum, c) => sum + c.lng, 0) / coords.length || -56.1913,
  };

  const route: SavedRoute = {
    id: routeId,
    created_at: new Date().toISOString(),
    driver_label: params.driverLabel,
    orders: params.orders,
    center,
  };

  // Save to KV with 7 day expiration (routes are temporary)
  await kv.set(`route:${routeId}`, route, { ex: 60 * 60 * 24 * 7 });

  return route;
}

/**
 * Get a saved route by ID
 */
export async function getRoute(routeId: string): Promise<SavedRoute | null> {
  const route = await kv.get(`route:${routeId}`);
  return route as SavedRoute | null;
}
