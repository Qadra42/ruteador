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

  const filteredOrders = orders.filter((order) => {
    if (order.status !== "pending") return false;
    const preferredLower = order.preferred_date.toLowerCase();
    if (selectedTab === "hoy") {
      return preferredLower.includes("hoy") || preferredLower.includes("today") || preferredLower.includes("tarde") || preferredLower.includes("afternoon");
    } else if (selectedTab === "mañana") {
      return preferredLower.includes("mañana") || preferredLower.includes("tomorrow") || preferredLower.includes("temprano") || preferredLower.includes("morning");
    }
    return true;
  });

  const pendingOrders = orders.filter((o) => o.status === "pending");
  const countByTab = {
    hoy: pendingOrders.filter((o) => {
      const p = o.preferred_date.toLowerCase();
      return p.includes("hoy") || p.includes("today") || p.includes("tarde") || p.includes("afternoon");
    }).length,
    mañana: pendingOrders.filter((o) => {
      const p = o.preferred_date.toLowerCase();
      return p.includes("mañana") || p.includes("tomorrow") || p.includes("temprano") || p.includes("morning");
    }).length,
    todos: pendingOrders.length,
  };

  const toggleOrderSelection = (orderId: string) => {
    const newSelected = new Set(selectedOrders);
    if (newSelected.has(orderId)) {
      newSelected.delete(orderId);
    } else {
      newSelected.add(orderId);
    }
    setSelectedOrders(newSelected);
  };

  const selectAllFiltered = () => {
    const newSelected = new Set(selectedOrders);
    filteredOrders.forEach((o) => newSelected.add(o.id));
    setSelectedOrders(newSelected);
  };

  const clearSelection = () => setSelectedOrders(new Set());

  const allFilteredSelected =
    filteredOrders.length > 0 &&
    filteredOrders.every((o) => selectedOrders.has(o.id));

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-8 flex items-center justify-center">
        <p className="text-gray-600">Loading...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Brand header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-1">
            Route Agent
          </h1>
          <p className="text-sm text-gray-500">
            Smart delivery routing
          </p>
        </div>

        {/* Stats */}
        <div className="mb-6">
          <p className="text-sm text-gray-500">
            {pendingOrders.length} {pendingOrders.length === 1 ? "order" : "orders"} · {selectedOrders.size} selected
          </p>
        </div>

        {/* Tabs minimalistas */}
        <div className="flex gap-1 mb-4 border-b border-gray-200">
          <button
            onClick={() => setSelectedTab("hoy")}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              selectedTab === "hoy"
                ? "border-blue-500 text-blue-600"
                : "border-transparent text-gray-500 hover:text-gray-700"
            }`}
          >
            Today ({countByTab.hoy})
          </button>
          <button
            onClick={() => setSelectedTab("mañana")}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              selectedTab === "mañana"
                ? "border-blue-500 text-blue-600"
                : "border-transparent text-gray-500 hover:text-gray-700"
            }`}
          >
            Tomorrow ({countByTab.mañana})
          </button>
          <button
            onClick={() => setSelectedTab("todos")}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              selectedTab === "todos"
                ? "border-blue-500 text-blue-600"
                : "border-transparent text-gray-500 hover:text-gray-700"
            }`}
          >
            All ({countByTab.todos})
          </button>
        </div>

        {/* Actions */}
        <div className="bg-white border border-gray-200 rounded-lg p-4 mb-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex gap-2">
              <button
                onClick={selectAllFiltered}
                disabled={filteredOrders.length === 0}
                className="text-xs text-blue-600 hover:text-blue-700 disabled:text-gray-400"
              >
                Select all
              </button>
              <span className="text-gray-300">·</span>
              <button
                onClick={clearSelection}
                disabled={selectedOrders.size === 0}
                className="text-xs text-gray-600 hover:text-gray-700 disabled:text-gray-400"
              >
                Clear
              </button>
            </div>
          </div>

          <GenerateRouteButton
            disabled={selectedOrders.size === 0}
            selectedOrderIds={Array.from(selectedOrders)}
          />
        </div>

        {/* Order list */}
        {filteredOrders.length === 0 ? (
          <div className="bg-white border border-gray-200 rounded-lg p-12 text-center">
            <p className="text-gray-500">No orders in this category</p>
          </div>
        ) : (
          <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="w-10 px-3 py-2">
                    <input
                      type="checkbox"
                      checked={allFilteredSelected}
                      onChange={selectAllFiltered}
                      className="w-4 h-4 rounded border-gray-300 text-blue-600"
                    />
                  </th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                    Client
                  </th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                    Address
                  </th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                    Items
                  </th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                    When
                  </th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">
                    Time
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredOrders.map((order) => {
                  const isSelected = selectedOrders.has(order.id);
                  return (
                    <tr
                      key={order.id}
                      onClick={() => toggleOrderSelection(order.id)}
                      className={`cursor-pointer hover:bg-gray-50 ${
                        isSelected ? "bg-blue-50" : ""
                      }`}
                    >
                      <td className="px-3 py-3">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleOrderSelection(order.id)}
                          onClick={(e) => e.stopPropagation()}
                          className="w-4 h-4 rounded border-gray-300 text-blue-600"
                        />
                      </td>
                      <td className="px-3 py-3">
                        <div className="text-sm font-medium text-gray-900">
                          {order.client_name || "No name"}
                        </div>
                        {order.client_phone && (
                          <div className="text-xs text-gray-500">
                            {order.client_phone}
                          </div>
                        )}
                      </td>
                      <td className="px-3 py-3">
                        <div className="text-sm text-gray-900">
                          {order.address}
                        </div>
                        <div className="text-xs text-gray-500">
                          {order.neighborhood}
                        </div>
                      </td>
                      <td className="px-3 py-3 text-sm text-gray-600">
                        {order.items}
                      </td>
                      <td className="px-3 py-3 text-sm text-gray-600">
                        {order.preferred_date}
                      </td>
                      <td className="px-3 py-3 text-xs text-gray-500">
                        {new Date(order.created_at).toLocaleTimeString("es-UY", {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
