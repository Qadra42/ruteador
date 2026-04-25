import type { Order } from "./types";

// Coordenadas aproximadas de barrios de Montevideo para ordenar rutas
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
  "aguada": { lat: -34.8967, lng: -56.1917 },
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

// Nearest-neighbor heuristic para ordenar paradas
function optimizeRoute(orders: Order[]): Order[] {
  if (orders.length <= 1) return orders;

  const remaining = [...orders];
  const route: Order[] = [];

  // Empezar desde el depósito (asumimos Centro/Aguada)
  let current = { lat: -34.8967, lng: -56.1917 };

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

// Generar link de Google Maps con las paradas ordenadas
export function generateRoute(orders: Order[]): {
  optimizedOrders: Order[];
  googleMapsUrl: string;
  summary: string;
} {
  const optimized = optimizeRoute(orders);

  // Construir URL de Google Maps con waypoints
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
