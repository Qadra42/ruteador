"use client";

import { useState } from "react";

interface RouteResult {
  driverLabel: string;
  googleMapsUrl: string;
  customMapUrl: string;
  summary: string;
  ordersCount: number;
}

export function GenerateRouteButton({
  disabled,
  selectedOrderIds,
}: {
  disabled: boolean;
  selectedOrderIds: string[];
}) {
  const [loading, setLoading] = useState(false);
  const [numDrivers, setNumDrivers] = useState<1 | 2>(1);
  const [showModal, setShowModal] = useState(false);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const [result, setResult] = useState<{
    routes: RouteResult[];
  } | null>(null);

  const handleGenerateRoute = async () => {
    if (selectedOrderIds.length === 0) {
      alert("Select at least one order");
      return;
    }

    console.log("Generating route with:", { orderIds: selectedOrderIds, numDrivers });

    setLoading(true);
    setResult(null);

    try {
      const response = await fetch("/api/generate-route", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orderIds: selectedOrderIds,
          numDrivers,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        alert(error.error || "Error generating route");
        return;
      }

      const data = await response.json();
      setResult(data);
      setShowModal(true);
    } catch (error) {
      console.error("Error:", error);
      alert("Error generating route");
    } finally {
      setLoading(false);
    }
  };

  const closeModal = () => {
    setShowModal(false);
    window.location.reload();
  };

  // Calcular tiempo estimado (aproximado)
  const estimateTime = (ordersCount: number): string => {
    // Aproximado: 5 min por parada + 3 min de traslado entre paradas
    const minutes = ordersCount * 5 + (ordersCount - 1) * 3;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;

    if (hours > 0) {
      return `${hours}h ${mins}min`;
    }
    return `${mins} min`;
  };

  // Calcular distancia estimada
  const estimateDistance = (ordersCount: number): string => {
    // Aproximado: 2km por parada en promedio en Montevideo
    const km = ordersCount * 2;
    return `${km} km`;
  };

  // Copy link to clipboard
  const copyToClipboard = (text: string, index: number) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(index);
    setTimeout(() => {
      setCopiedIndex(null);
    }, 2000);
  };

  return (
    <div>
      <div className="flex items-center gap-4">
        <div className="flex gap-3">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="radio"
              value="1"
              checked={numDrivers === 1}
              onChange={() => setNumDrivers(1)}
              className="w-4 h-4 text-blue-600"
            />
            <span className="text-sm text-gray-700">1 Driver</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="radio"
              value="2"
              checked={numDrivers === 2}
              onChange={() => setNumDrivers(2)}
              className="w-4 h-4 text-blue-600"
            />
            <span className="text-sm text-gray-700">2 Drivers</span>
          </label>
        </div>

        <button
          onClick={handleGenerateRoute}
          disabled={disabled || loading || selectedOrderIds.length === 0}
          className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 text-white text-sm font-medium py-2 px-4 rounded transition-colors disabled:cursor-not-allowed"
        >
          {loading ? "Generating..." : "Generate Route"}
        </button>
      </div>

      {/* Modal */}
      {showModal && result && result.routes && (
        <div className="fixed inset-0 backdrop-blur-sm bg-black/20 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl">
            {/* Header */}
            <div className="border-b border-gray-200 p-4 flex items-center justify-between sticky top-0 bg-white z-10">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">
                  ✓ Route Generated
                </h2>
                <p className="text-xs text-gray-500 mt-1">
                  {result.routes.length === 1 ? "1 driver" : "2 drivers"} · {result.routes.reduce((acc, r) => acc + r.ordersCount, 0)} total stops
                </p>
              </div>
              <button
                onClick={closeModal}
                className="text-gray-400 hover:text-gray-600 text-2xl leading-none"
              >
                ×
              </button>
            </div>

            {/* Content */}
            <div className="p-3 space-y-3">
              {result.routes.map((route, index) => (
                <div key={index} className="border border-gray-200 rounded-lg overflow-hidden">
                  {/* Route info header */}
                  <div className="bg-gray-50 px-4 py-3 border-b border-gray-200">
                    <h3 className="font-medium text-gray-900 mb-1">{route.driverLabel}</h3>
                    <p className="text-sm text-gray-600">
                      {route.ordersCount} {route.ordersCount === 1 ? "stop" : "stops"} · {estimateTime(route.ordersCount)} · {estimateDistance(route.ordersCount)}
                    </p>
                  </div>

                  {/* Stop list */}
                  <div className="p-4 bg-white max-h-60 overflow-y-auto">
                    <div className="space-y-3">
                      {route.summary.split('\n').filter(line => line.trim()).map((line, stopIndex) => {
                        // Parse: "1. Address (Neighborhood) — Items"
                        const match = line.match(/(\d+)\.\s+(.+?)\s+\((.+?)\)\s+—\s+(.+)/);
                        if (!match) return null;
                        const [, num, address, neighborhood, items] = match;

                        return (
                          <div key={stopIndex} className="flex gap-3 pb-3 border-b border-gray-100 last:border-0">
                            <div className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-600 text-white flex items-center justify-center text-xs font-bold">
                              {num}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-gray-900">{address}</p>
                              <p className="text-xs text-gray-500">{neighborhood}</p>
                              <p className="text-xs text-gray-600 mt-1">{items}</p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="p-3 bg-white border-t border-gray-200 space-y-2">
                    {/* Interactive Map link */}
                    <a
                      href={route.customMapUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center justify-center gap-2 w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-3 px-4 rounded-lg transition-colors shadow-md hover:shadow-lg"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
                      </svg>
                      View Interactive Map
                    </a>

                    {/* Google Maps link */}
                    <a
                      href={route.googleMapsUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center justify-center gap-2 w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2.5 px-4 rounded-lg transition-colors"
                    >
                      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
                      </svg>
                      Google Maps Directions
                    </a>

                    {/* Copy link button */}
                    <button
                      onClick={() => copyToClipboard(route.customMapUrl, index)}
                      className={`w-full border-2 font-medium py-2 px-4 rounded-lg transition-all flex items-center justify-center gap-2 ${
                        copiedIndex === index
                          ? "border-green-500 bg-green-50 text-green-700"
                          : "border-gray-300 hover:border-indigo-500 hover:bg-indigo-50 text-gray-700"
                      }`}
                    >
                      {copiedIndex === index ? (
                        <>
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                          </svg>
                          Copied!
                        </>
                      ) : (
                        <>
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                          </svg>
                          Copy interactive map link
                        </>
                      )}
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Footer */}
            <div className="border-t border-gray-200 p-3 bg-gray-50">
              <button
                onClick={closeModal}
                className="w-full bg-gray-200 hover:bg-gray-300 text-gray-700 text-sm font-medium py-2 px-4 rounded transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
