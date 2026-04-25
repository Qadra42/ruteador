"use client";

import { useState, useEffect } from "react";
import { GenerateRouteButton } from "./GenerateRouteButton";
import type { Order } from "@/lib/types";

type TabType = "hoy" | "mañana" | "todos";

export default function DashboardPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [selectedTab, setSelectedTab] = useState<TabType>("hoy");
  const [selectedOrders, setSelectedOrders] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);

  // Cargar pedidos al montar
  useEffect(() => {
    fetch("/api/orders")
      .then((res) => res.json())
      .then((data) => {
        setOrders(data);
        setLoading(false);
      })
      .catch((err) => {
        console.error("Error loading orders:", err);
        setLoading(false);
      });
  }, []);

  // Filtrar pedidos según tab activo
  const filteredOrders = orders.filter((order) => {
    const preferredLower = order.preferred_date.toLowerCase();
    if (selectedTab === "hoy") {
      return preferredLower.includes("hoy") || preferredLower.includes("tarde");
    } else if (selectedTab === "mañana") {
      return (
        preferredLower.includes("mañana") || preferredLower.includes("temprano")
      );
    }
    return true; // "todos"
  });

  // Contar pedidos por tab
  const countByTab = {
    hoy: orders.filter(
      (o) =>
        o.preferred_date.toLowerCase().includes("hoy") ||
        o.preferred_date.toLowerCase().includes("tarde")
    ).length,
    mañana: orders.filter(
      (o) =>
        o.preferred_date.toLowerCase().includes("mañana") ||
        o.preferred_date.toLowerCase().includes("temprano")
    ).length,
    todos: orders.length,
  };

  // Toggle selección de un pedido
  const toggleOrderSelection = (orderId: string) => {
    const newSelected = new Set(selectedOrders);
    if (newSelected.has(orderId)) {
      newSelected.delete(orderId);
    } else {
      newSelected.add(orderId);
    }
    setSelectedOrders(newSelected);
  };

  // Seleccionar/deseleccionar todos los filtrados
  const toggleSelectAll = () => {
    const filteredIds = filteredOrders.map((o) => o.id);
    const allSelected = filteredIds.every((id) => selectedOrders.has(id));

    if (allSelected) {
      // Deseleccionar todos los filtrados
      const newSelected = new Set(selectedOrders);
      filteredIds.forEach((id) => newSelected.delete(id));
      setSelectedOrders(newSelected);
    } else {
      // Seleccionar todos los filtrados
      const newSelected = new Set(selectedOrders);
      filteredIds.forEach((id) => newSelected.add(id));
      setSelectedOrders(newSelected);
    }
  };

  const allFilteredSelected =
    filteredOrders.length > 0 &&
    filteredOrders.every((o) => selectedOrders.has(o.id));

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-8 flex items-center justify-center">
        <p className="text-gray-600">Cargando pedidos...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">
            Dashboard - Pedidos Pendientes
          </h1>

          {/* Tabs de filtro */}
          <div className="flex gap-2 mb-4">
            <button
              onClick={() => setSelectedTab("hoy")}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                selectedTab === "hoy"
                  ? "bg-blue-600 text-white"
                  : "bg-gray-200 text-gray-700 hover:bg-gray-300"
              }`}
            >
              Hoy ({countByTab.hoy})
            </button>
            <button
              onClick={() => setSelectedTab("mañana")}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                selectedTab === "mañana"
                  ? "bg-blue-600 text-white"
                  : "bg-gray-200 text-gray-700 hover:bg-gray-300"
              }`}
            >
              Mañana ({countByTab.mañana})
            </button>
            <button
              onClick={() => setSelectedTab("todos")}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                selectedTab === "todos"
                  ? "bg-blue-600 text-white"
                  : "bg-gray-200 text-gray-700 hover:bg-gray-300"
              }`}
            >
              Todos ({countByTab.todos})
            </button>
          </div>

          {/* Mensaje de selección */}
          <p className="text-gray-600 mb-4">
            {selectedOrders.size > 0 ? (
              <span className="font-semibold text-blue-600">
                {selectedOrders.size}{" "}
                {selectedOrders.size === 1
                  ? "pedido seleccionado"
                  : "pedidos seleccionados"}
              </span>
            ) : (
              <span>Seleccioná pedidos para generar la ruta</span>
            )}
          </p>

          {/* Botón de generación */}
          <GenerateRouteButton
            disabled={selectedOrders.size === 0}
            selectedOrderIds={Array.from(selectedOrders)}
          />
        </div>

        {filteredOrders.length === 0 ? (
          <div className="bg-white rounded-lg shadow p-12 text-center">
            <p className="text-gray-500 text-lg">
              No hay pedidos en esta categoría.
            </p>
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left">
                    <input
                      type="checkbox"
                      checked={allFilteredSelected}
                      onChange={toggleSelectAll}
                      className="w-4 h-4 cursor-pointer"
                    />
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Estado
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Hora
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Cliente
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Dirección
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Barrio
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Qué levantar
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Fecha preferida
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredOrders.map((order) => (
                  <tr
                    key={order.id}
                    className={
                      selectedOrders.has(order.id) ? "bg-blue-50" : ""
                    }
                  >
                    <td className="px-6 py-4 whitespace-nowrap">
                      <input
                        type="checkbox"
                        checked={selectedOrders.has(order.id)}
                        onChange={() => toggleOrderSelection(order.id)}
                        disabled={order.status === "routed" || order.status === "completed"}
                        className="w-4 h-4 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                      />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      {order.status === "pending" && (
                        <span className="px-2 py-1 text-xs font-semibold rounded-full bg-yellow-100 text-yellow-800">
                          Pendiente
                        </span>
                      )}
                      {order.status === "routed" && (
                        <span className="px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">
                          Rutado
                        </span>
                      )}
                      {order.status === "completed" && (
                        <span className="px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">
                          Completado
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {new Date(order.created_at).toLocaleTimeString("es-UY", {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {order.client_name || "Sin nombre"}
                      {order.client_phone && (
                        <div className="text-xs text-gray-500">
                          {order.client_phone}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">
                      {order.address}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {order.neighborhood}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">
                      {order.items}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {order.preferred_date}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
