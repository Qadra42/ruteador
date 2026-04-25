import type { Order } from "./types";

// Approximate coordinates of Montevideo neighborhoods to order routes
const NEIGHBORHOOD_COORDS: Record<string, { lat: number; lng: number }> = {
  "centro": { lat: -34.9058, lng: -56.1913 },
  "ciudad vieja": { lat: -34.9055, lng: -56.2038 },
  "pocitos": { lat: -34.9175, lng: -56.1553 },
  "buceo": { lat: -34.9100, lng: -56.1400 },
  "malvín": { lat: -34.9083, lng: -56.1200 },
  "malvin": { lat: -34.9083, lng: -56.1200 },
  "cordón": { lat: -34.9050, lng: -56.1800 },
  "cordon": { lat: -34.9050, lng: -56.1800 },
  "parque rodó": { lat: -34.9150, lng: -56.1700 },
  "parque rodo": { lat: -34.9150, lng: -56.1700 },
  "tres cruces": { lat: -34.8933, lng: -56.1750 },
  "la blanqueada": { lat: -34.8917, lng: -56.1617 },
  "unión": { lat: -34.8833, lng: -56.1500 },
  "union": { lat: -34.8833, lng: -56.1500 },
  "la comercial": { lat: -34.8983, lng: -56.1833 },
  "aguada": { lat: -34.8894, lng: -56.2094 },
  "prado": { lat: -34.8700, lng: -56.1917 },
  "capurro": { lat: -34.8833, lng: -56.2000 },
  "cerro": { lat: -34.8800, lng: -56.2400 },
  "carrasco": { lat: -34.8867, lng: -56.0617 },
  "punta gorda": { lat: -34.9033, lng: -56.0983 },
  "maroñas": { lat: -34.8617, lng: -56.1367 },
  "marañas": { lat: -34.8617, lng: -56.1367 },
  "sayago": { lat: -34.8550, lng: -56.1983 },
  "colón": { lat: -34.8433, lng: -56.2167 },
  "colon": { lat: -34.8433, lng: -56.2167 },
};

// Nearest-neighbor heuristic to order stops
function optimizeRoute(orders: Order[]): Order[] {
  if (orders.length <= 1) return orders;

  const remaining = [...orders];
  const route: Order[] = [];

  // Start from the depot: Sinergia Faro Punta Carretas
  let current = { lat: -34.9200, lng: -56.1550 };

  while (remaining.length > 0) {
    let nearestIdx = 0;
    let nearestDist = Infinity;

    remaining.forEach((order, idx) => {
      const coords =
        NEIGHBORHOOD_COORDS[order.neighborhood.toLowerCase()] || current;
      const dist = Math.sqrt(
        Math.pow(coords.lat - current.lat, 2) +
          Math.pow(coords.lng - current.lng, 2)
      );
      if (dist < nearestDist) {
        nearestDist = dist;
        nearestIdx = idx;
      }
    });

    const nearest = remaining.splice(nearestIdx, 1)[0];
    route.push(nearest);
    current =
      NEIGHBORHOOD_COORDS[nearest.neighborhood.toLowerCase()] || current;
  }

  return route;
}

// Generate Google Maps link with ordered stops
export function generateRoute(orders: Order[]): {
  optimizedOrders: Order[];
  googleMapsUrl: string;
  summary: string;
} {
  const optimized = optimizeRoute(orders);

  // Build Google Maps URL with waypoints
  const addresses = optimized.map((o) =>
    encodeURIComponent(`${o.address}, Montevideo, Uruguay`)
  );

  let googleMapsUrl: string;
  if (addresses.length === 1) {
    googleMapsUrl = `https://www.google.com/maps/dir/?api=1&destination=${addresses[0]}`;
  } else {
    const destination = addresses[addresses.length - 1];
    const waypoints = addresses.slice(0, -1).join("|");
    googleMapsUrl = `https://www.google.com/maps/dir/?api=1&destination=${destination}&waypoints=${waypoints}`;
  }

  const summary = optimized
    .map((o, i) => `${i + 1}. ${o.address} (${o.neighborhood}) — ${o.items}`)
    .join("\n");

  return { optimizedOrders: optimized, googleMapsUrl, summary };
}

// Divide orders geographically and generate routes for 2 drivers
export function generateRoutesForTwoDrivers(orders: Order[]): {
  route1: {
    optimizedOrders: Order[];
    googleMapsUrl: string;
    summary: string;
    label: string;
  };
  route2: {
    optimizedOrders: Order[];
    googleMapsUrl: string;
    summary: string;
    label: string;
  };
} {
  if (orders.length < 2) {
    // If there are fewer than 2 orders, put all in route 1
    const route = generateRoute(orders);
    return {
      route1: { ...route, label: "Driver 1" },
      route2: {
        optimizedOrders: [],
        googleMapsUrl: "",
        summary: "",
        label: "Driver 2",
      },
    };
  }

  // Get coordinates of all orders
  const ordersWithCoords = orders.map((order) => ({
    order,
    coords:
      NEIGHBORHOOD_COORDS[order.neighborhood.toLowerCase()] || {
        lat: -34.9058,
        lng: -56.1913,
      },
  }));

  // Calculate midpoint of longitude
  const avgLng =
    ordersWithCoords.reduce((sum, o) => sum + o.coords.lng, 0) /
    ordersWithCoords.length;

  // Divide by longitude (West vs East)
  let zone1 = ordersWithCoords.filter((o) => o.coords.lng > avgLng);
  let zone2 = ordersWithCoords.filter((o) => o.coords.lng <= avgLng);
  let label1 = "West Zone";
  let label2 = "East Zone";

  // If any zone is empty, divide by latitude
  if (zone1.length === 0 || zone2.length === 0) {
    const avgLat =
      ordersWithCoords.reduce((sum, o) => sum + o.coords.lat, 0) /
      ordersWithCoords.length;
    zone1 = ordersWithCoords.filter((o) => o.coords.lat > avgLat);
    zone2 = ordersWithCoords.filter((o) => o.coords.lat <= avgLat);
    label1 = "North Zone";
    label2 = "South Zone";
  }

  // Rebalance if very uneven (e.g. 9 vs 1)
  const ratio = Math.max(zone1.length, zone2.length) / Math.min(zone1.length, zone2.length);
  if (ratio > 3) {
    // If very unbalanced, redistribute
    const sorted = ordersWithCoords.sort((a, b) => a.coords.lng - b.coords.lng);
    const mid = Math.floor(sorted.length / 2);
    zone1 = sorted.slice(0, mid);
    zone2 = sorted.slice(mid);
    label1 = "West Zone";
    label2 = "East Zone";
  }

  // Generate optimized routes for each zone
  const orders1 = zone1.map((o) => o.order);
  const orders2 = zone2.map((o) => o.order);

  const route1Data = generateRoute(orders1);
  const route2Data = generateRoute(orders2);

  return {
    route1: {
      ...route1Data,
      label: `Driver 1 - ${label1}`,
    },
    route2: {
      ...route2Data,
      label: `Driver 2 - ${label2}`,
    },
  };
}
