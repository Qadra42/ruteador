import { NextResponse } from "next/server";
import { getPendingOrders } from "@/lib/orders";

export async function GET() {
  try {
    const orders = await getPendingOrders();
    return NextResponse.json(orders);
  } catch (error) {
    console.error("Error fetching orders:", error);
    return NextResponse.json(
      { error: "Error al cargar pedidos" },
      { status: 500 }
    );
  }
}
