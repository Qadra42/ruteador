"use client";

import { useEffect } from "react";
import L from "leaflet";

interface MapPreviewProps {
  addresses: Array<{ address: string; neighborhood: string }>;
  mapId: string;
}

// Coordenadas de barrios de Montevideo
const NEIGHBORHOOD_COORDS: Record<string, { lat: number; lng: number }> = {
  centro: { lat: -34.9058, lng: -56.1913 },
  "ciudad vieja": { lat: -34.9055, lng: -56.2038 },
  pocitos: { lat: -34.9175, lng: -56.1553 },
  buceo: { lat: -34.91, lng: -56.14 },
  malvín: { lat: -34.9083, lng: -56.12 },
  malvin: { lat: -34.9083, lng: -56.12 },
  cordón: { lat: -34.905, lng: -56.18 },
  cordon: { lat: -34.905, lng: -56.18 },
  "parque rodó": { lat: -34.915, lng: -56.17 },
  "parque rodo": { lat: -34.915, lng: -56.17 },
  "tres cruces": { lat: -34.8933, lng: -56.175 },
  "la blanqueada": { lat: -34.8917, lng: -56.1617 },
  unión: { lat: -34.8833, lng: -56.15 },
  union: { lat: -34.8833, lng: -56.15 },
  "la comercial": { lat: -34.8983, lng: -56.1833 },
  aguada: { lat: -34.8967, lng: -56.1917 },
  prado: { lat: -34.87, lng: -56.1917 },
  capurro: { lat: -34.8833, lng: -56.2 },
  cerro: { lat: -34.88, lng: -56.24 },
  carrasco: { lat: -34.8867, lng: -56.0617 },
  "punta gorda": { lat: -34.9033, lng: -56.0983 },
  maroñas: { lat: -34.8617, lng: -56.1367 },
  marañas: { lat: -34.8617, lng: -56.1367 },
  sayago: { lat: -34.855, lng: -56.1983 },
  colón: { lat: -34.8433, lng: -56.2167 },
  colon: { lat: -34.8433, lng: -56.2167 },
};

export function MapPreview({ addresses, mapId }: MapPreviewProps) {
  useEffect(() => {
    const mapContainer = document.getElementById(mapId);
    if (!mapContainer) return;

    // Limpiar mapa anterior si existe
    mapContainer.innerHTML = "";

    const map = L.map(mapId).setView([-34.9011, -56.1645], 12);

    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      maxZoom: 19,
    }).addTo(map);

    // Fix para los iconos de Leaflet
    delete (L.Icon.Default.prototype as any)._getIconUrl;
    L.Icon.Default.mergeOptions({
      iconRetinaUrl:
        "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png",
      iconUrl:
        "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png",
      shadowUrl:
        "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
    });

    const markers: L.LatLng[] = [];

    // Icono numerado personalizado
    addresses.forEach((item, index) => {
      const coords =
        NEIGHBORHOOD_COORDS[item.neighborhood.toLowerCase()] || {
          lat: -34.9011,
          lng: -56.1645,
        };

      // Crear icono con número
      const numberIcon = L.divIcon({
        className: 'custom-marker',
        html: `<div style="background-color: #3b82f6; color: white; border-radius: 50%; width: 28px; height: 28px; display: flex; align-items: center; justify-content: center; font-weight: bold; font-size: 14px; border: 2px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.3);">${index + 1}</div>`,
        iconSize: [28, 28],
        iconAnchor: [14, 14],
      });

      const marker = L.marker([coords.lat, coords.lng], { icon: numberIcon }).addTo(map);
      marker.bindPopup(
        `<b>Stop ${index + 1}</b><br>${item.address}<br><small>${item.neighborhood}</small>`
      );
      markers.push(L.latLng(coords.lat, coords.lng));
    });

    // Ajustar zoom para mostrar todos los marcadores
    if (markers.length > 0) {
      const bounds = L.latLngBounds(markers);
      map.fitBounds(bounds, { padding: [50, 50] });
    }

    return () => {
      map.remove();
    };
  }, [addresses]);

  return (
    <div
      id={mapId}
      className="w-full h-full rounded"
      style={{ minHeight: "250px" }}
    />
  );
}
