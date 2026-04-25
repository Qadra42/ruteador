"use client";

import { useState } from "react";

export function GenerateRouteButton({ disabled }: { disabled: boolean }) {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{
    googleMapsUrl: string;
    summary: string;
    ordersCount: number;
  } | null>(null);

  const handleGenerateRoute = async () => {
    setLoading(true);
    setResult(null);

    try {
      const response = await fetch("/api/generate-route", {
        method: "POST",
      });

      if (!response.ok) {
        const error = await response.json();
        alert(error.error || "Error al generar la ruta");
        return;
      }

      const data = await response.json();
      setResult(data);

      // Recargar la página después de 2 segundos para ver los pedidos actualizados
      setTimeout(() => {
        window.location.reload();
      }, 2000);
    } catch (error) {
      console.error("Error:", error);
      alert("Error al generar la ruta");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <button
        onClick={handleGenerateRoute}
        disabled={disabled || loading}
        className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white font-semibold py-3 px-6 rounded-lg shadow-lg transition-colors"
      >
        {loading ? "Generando ruta..." : "🗺️ Generar Ruta del Día"}
      </button>

      {result && (
        <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-lg">
          <p className="text-green-800 font-semibold mb-2">
            ✅ Ruta generada con {result.ordersCount}{" "}
            {result.ordersCount === 1 ? "parada" : "paradas"}
          </p>
          <a
            href={result.googleMapsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-600 hover:underline text-sm"
          >
            📍 Abrir en Google Maps
          </a>
          <p className="text-xs text-gray-600 mt-2">
            Ruta enviada al chofer por Telegram
          </p>
        </div>
      )}
    </div>
  );
}
