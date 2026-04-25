"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import type { SavedRoute } from "@/lib/types";

declare global {
  interface Window {
    google: any;
  }
}

export default function MapPage() {
  const params = useParams();
  const routeId = params.routeId as string;
  const [route, setRoute] = useState<SavedRoute | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [googleMapsUrl, setGoogleMapsUrl] = useState<string>("");

  useEffect(() => {
    // Fetch route data
    fetch(`/api/routes/${routeId}`)
      .then((res) => {
        if (!res.ok) throw new Error("Route not found");
        return res.json();
      })
      .then((data) => {
        setRoute(data);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message);
        setLoading(false);
      });
  }, [routeId]);

  useEffect(() => {
    if (!route) return;

    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
    if (!apiKey) {
      setError("Google Maps API key not configured");
      return;
    }

    // Load Google Maps script
    const loadGoogleMaps = () => {
      if (window.google && window.google.maps) {
        initMap();
        return;
      }

      const script = document.createElement("script");
      script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&v=weekly`;
      script.async = true;
      script.defer = true;
      script.onload = () => initMap();
      script.onerror = () => setError("Failed to load Google Maps");
      document.head.appendChild(script);
    };

    const initMap = () => {
      const map = new google.maps.Map(
        document.getElementById("map") as HTMLElement,
        {
          center: route.center,
          zoom: 13,
        }
      );

      const directionsService = new google.maps.DirectionsService();
      const directionsRenderer = new google.maps.DirectionsRenderer({
        map,
        suppressMarkers: true, // We'll add custom markers
        polylineOptions: {
          strokeColor: "#3b82f6",
          strokeOpacity: 0.8,
          strokeWeight: 4,
        },
      });

      // Build waypoints from orders
      const origin = "Sinergia Faro Punta Carretas, Montevideo, Uruguay";
      const waypoints = route.orders.map((order) => ({
        location: `${order.address}, ${order.neighborhood}, Montevideo, Uruguay`,
        stopover: true,
      }));

      // Request directions WITHOUT optimization - keep original order
      directionsService.route(
        {
          origin,
          destination: origin, // Return to depot
          waypoints,
          travelMode: google.maps.TravelMode.DRIVING,
          optimizeWaypoints: false, // Keep original order
        },
        (result, status) => {
          if (status === google.maps.DirectionsStatus.OK && result) {
            directionsRenderer.setDirections(result);

            const legs = result.routes[0].legs;

            // Use original order (no optimization)
            const ordersInOrder = route.orders;

            // Generate Google Maps URL with same order
            const addresses = ordersInOrder.map((o) =>
              encodeURIComponent(`${o.address}, ${o.neighborhood}, Montevideo, Uruguay`)
            );

            let mapsUrl: string;
            if (addresses.length === 1) {
              mapsUrl = `https://www.google.com/maps/dir/?api=1&origin=${encodeURIComponent("Sinergia Faro Punta Carretas, Montevideo, Uruguay")}&destination=${addresses[0]}`;
            } else {
              const waypoints = addresses.join("|");
              mapsUrl = `https://www.google.com/maps/dir/?api=1&origin=${encodeURIComponent("Sinergia Faro Punta Carretas, Montevideo, Uruguay")}&destination=${encodeURIComponent("Sinergia Faro Punta Carretas, Montevideo, Uruguay")}&waypoints=${waypoints}`;
            }
            setGoogleMapsUrl(mapsUrl);

            // Start marker
            new google.maps.Marker({
              position: legs[0].start_location,
              map,
              label: {
                text: "START",
                color: "white",
                fontSize: "11px",
                fontWeight: "bold",
              },
              icon: {
                path: google.maps.SymbolPath.CIRCLE,
                scale: 12,
                fillColor: "#10b981",
                fillOpacity: 1,
                strokeColor: "white",
                strokeWeight: 2,
              },
            });

            // Stop markers in original order
            ordersInOrder.forEach((order, index) => {
              const position = legs[index].end_location;

              const marker = new google.maps.Marker({
                position,
                map,
                label: {
                  text: `${index + 1}`,
                  color: "white",
                  fontSize: "14px",
                  fontWeight: "bold",
                },
                icon: {
                  path: google.maps.SymbolPath.CIRCLE,
                  scale: 14,
                  fillColor: "#3b82f6",
                  fillOpacity: 1,
                  strokeColor: "white",
                  strokeWeight: 2,
                },
              });

              const infoWindow = new google.maps.InfoWindow({
                content: `
                  <div style="padding: 8px; min-width: 200px;">
                    <h3 style="margin: 0 0 8px 0; font-weight: 600; color: #1f2937;">
                      Stop ${index + 1}
                    </h3>
                    <div style="margin-bottom: 6px;">
                      <strong style="color: #4b5563;">Items:</strong>
                      <p style="margin: 2px 0; color: #6b7280;">${order.items}</p>
                    </div>
                    ${order.client_name ? `
                      <div style="margin-bottom: 6px;">
                        <strong style="color: #4b5563;">Client:</strong>
                        <p style="margin: 2px 0; color: #6b7280;">${order.client_name}</p>
                      </div>
                    ` : ''}
                    ${order.client_phone ? `
                      <div style="margin-bottom: 6px;">
                        <strong style="color: #4b5563;">Phone:</strong>
                        <p style="margin: 2px 0; color: #6b7280;">${order.client_phone}</p>
                      </div>
                    ` : ''}
                    <div style="margin-bottom: 6px;">
                      <strong style="color: #4b5563;">Address:</strong>
                      <p style="margin: 2px 0; color: #6b7280;">${order.address}</p>
                      <p style="margin: 2px 0; color: #9ca3af; font-size: 12px;">${order.neighborhood}</p>
                    </div>
                  </div>
                `,
              });

              marker.addListener("click", () => {
                infoWindow.open(map, marker);
              });
            });
          } else {
            setError(`Directions request failed: ${status}`);
          }
        }
      );
    };

    loadGoogleMaps();
  }, [route]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-600">Loading map...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-white border border-gray-200 rounded-lg p-8 max-w-md">
          <h1 className="text-xl font-semibold text-red-600 mb-2">Error</h1>
          <p className="text-gray-600">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen w-screen flex flex-col">
      <div className="bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold text-gray-900">
            Route: {route?.driver_label}
          </h1>
          <p className="text-sm text-gray-500">
            {route?.orders.length} stops · Created {route?.created_at ? new Date(route.created_at).toLocaleString() : ''}
          </p>
        </div>
        {googleMapsUrl && (
          <a
            href={googleMapsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg transition-colors"
          >
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
            </svg>
            Open in Google Maps
          </a>
        )}
      </div>
      <div id="map" className="flex-1" />
    </div>
  );
}
