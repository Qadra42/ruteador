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
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50/30 p-4 md:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Brand header */}
        <div className="mb-8 pb-6 border-b border-gray-200/50 flex items-end justify-between">
          <div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-gray-900 to-blue-900 bg-clip-text text-transparent mb-2">
              ruteador
            </h1>
            <p className="text-sm text-gray-600">
              Smart delivery routing
            </p>
          </div>
          <div className="flex gap-3 items-center">
            <div className="bg-white px-4 py-2 rounded-lg shadow-sm border border-gray-200/50">
              <span className="text-lg font-bold text-gray-900">{pendingOrders.length}</span>
              <span className="text-sm text-gray-500 ml-2">{pendingOrders.length === 1 ? "order" : "orders"}</span>
            </div>
            {selectedOrders.size > 0 && (
              <div className="bg-blue-50 px-4 py-2 rounded-lg shadow-sm border border-blue-200/50">
                <span className="text-lg font-bold text-blue-900">{selectedOrders.size}</span>
                <span className="text-sm text-blue-700 ml-2">selected</span>
              </div>
            )}
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-6">
          <button
            onClick={() => setSelectedTab("hoy")}
            className={`px-4 py-2.5 text-sm font-medium rounded-lg transition-all ${
              selectedTab === "hoy"
                ? "bg-blue-600 text-white shadow-md shadow-blue-200"
                : "bg-white text-gray-700 hover:bg-gray-50 border border-gray-200 shadow-sm"
            }`}
          >
            Today <span className={`${selectedTab === "hoy" ? "text-blue-100" : "text-gray-500"}`}>({countByTab.hoy})</span>
          </button>
          <button
            onClick={() => setSelectedTab("mañana")}
            className={`px-4 py-2.5 text-sm font-medium rounded-lg transition-all ${
              selectedTab === "mañana"
                ? "bg-blue-600 text-white shadow-md shadow-blue-200"
                : "bg-white text-gray-700 hover:bg-gray-50 border border-gray-200 shadow-sm"
            }`}
          >
            Tomorrow <span className={`${selectedTab === "mañana" ? "text-blue-100" : "text-gray-500"}`}>({countByTab.mañana})</span>
          </button>
          <button
            onClick={() => setSelectedTab("todos")}
            className={`px-4 py-2.5 text-sm font-medium rounded-lg transition-all ${
              selectedTab === "todos"
                ? "bg-blue-600 text-white shadow-md shadow-blue-200"
                : "bg-white text-gray-700 hover:bg-gray-50 border border-gray-200 shadow-sm"
            }`}
          >
            All <span className={`${selectedTab === "todos" ? "text-blue-100" : "text-gray-500"}`}>({countByTab.todos})</span>
          </button>
        </div>

        {/* Actions */}
        <div className="bg-white border border-gray-200/50 rounded-xl p-4 mb-6 shadow-sm">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            {/* Selection controls */}
            <div className="flex gap-2">
              <button
                onClick={selectAllFiltered}
                disabled={filteredOrders.length === 0}
                className="px-4 py-2 text-sm font-medium text-blue-700 bg-blue-50 hover:bg-blue-100 disabled:bg-gray-100 disabled:text-gray-400 rounded-lg transition-all border border-blue-200/50 disabled:border-gray-200"
              >
                Select all
              </button>
              <button
                onClick={clearSelection}
                disabled={selectedOrders.size === 0}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 disabled:bg-gray-50 disabled:text-gray-300 rounded-lg transition-all border border-gray-200"
              >
                Clear
              </button>
            </div>

            {/* Route generation */}
            <GenerateRouteButton
              disabled={selectedOrders.size === 0}
              selectedOrderIds={Array.from(selectedOrders)}
            />
          </div>
        </div>

        {/* Order list */}
        {filteredOrders.length === 0 ? (
          <div className="bg-white border border-gray-200/50 rounded-xl p-12 text-center shadow-sm">
            <div className="text-gray-400 mb-2">
              <svg className="w-12 h-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            </div>
            <p className="text-gray-500 font-medium">No orders in this category</p>
          </div>
        ) : (
          <div className="bg-white border border-gray-200/50 rounded-xl overflow-hidden shadow-sm">
            <table className="min-w-full divide-y divide-gray-100">
              <thead className="bg-gradient-to-r from-gray-50 to-blue-50/20">
                <tr>
                  <th className="w-10 px-4 py-3.5">
                    <input
                      type="checkbox"
                      checked={allFilteredSelected}
                      onChange={selectAllFiltered}
                      className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-2 focus:ring-blue-500 focus:ring-offset-0"
                    />
                  </th>
                  <th className="px-4 py-3.5 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Client
                  </th>
                  <th className="px-4 py-3.5 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Address
                  </th>
                  <th className="px-4 py-3.5 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Items
                  </th>
                  <th className="px-4 py-3.5 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    When
                  </th>
                  <th className="px-4 py-3.5 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Time
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-100">
                {filteredOrders.map((order, index) => {
                  const isSelected = selectedOrders.has(order.id);
                  return (
                    <tr
                      key={order.id}
                      onClick={() => toggleOrderSelection(order.id)}
                      className={`cursor-pointer transition-all ${
                        isSelected
                          ? "bg-blue-50/50 hover:bg-blue-50"
                          : index % 2 === 0
                            ? "bg-white hover:bg-gray-50/50"
                            : "bg-gray-50/30 hover:bg-gray-50/50"
                      }`}
                    >
                      <td className="px-4 py-4">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleOrderSelection(order.id)}
                          onClick={(e) => e.stopPropagation()}
                          className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-2 focus:ring-blue-500 focus:ring-offset-0"
                        />
                      </td>
                      <td className="px-4 py-4">
                        <div className="text-sm font-semibold text-gray-900">
                          {order.client_name || "No name"}
                        </div>
                        {order.client_phone && (
                          <div className="text-xs text-gray-500 mt-0.5">
                            {order.client_phone}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-4">
                        <div className="text-sm text-gray-900 font-medium">
                          {order.address}
                        </div>
                        <div className="text-xs text-gray-500 mt-0.5">
                          {order.neighborhood}
                        </div>
                      </td>
                      <td className="px-4 py-4 text-sm text-gray-700">
                        {order.items}
                      </td>
                      <td className="px-4 py-4">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                          {order.preferred_date}
                        </span>
                      </td>
                      <td className="px-4 py-4 text-xs text-gray-500 font-mono">
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
