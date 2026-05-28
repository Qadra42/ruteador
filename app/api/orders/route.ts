import { NextResponse } from "next/server";
import { getPendingOrders } from "@/lib/orders";
import { prisma } from "@/lib/db";

export async function GET() {
  try {
    // TODO: In Phase 3, get companyId from authenticated user session
    // For now, get the first company in the database
    const company = await prisma.company.findFirst();

    if (!company) {
      return NextResponse.json(
        { error: "No company found. Run seed script first." },
        { status: 404 }
      );
    }

    const orders = await getPendingOrders(company.id);

    // Map Prisma orders to legacy format for dashboard compatibility
    const mappedOrders = orders.map((order: any) => ({
      id: order.id,
      client_name: order.customerName || 'No name',
      client_phone: order.customerPhone,
      items: order.items,
      address: order.address,
      neighborhood: '', // Extracted from address in old format
      preferred_date: order.preferredDate || 'lo antes posible',
      status: order.status,
      created_at: order.createdAt.toISOString(),
    }));

    return NextResponse.json(mappedOrders);
  } catch (error) {
    console.error("Error fetching orders:", error);
    return NextResponse.json(
      { error: "Error loading orders" },
      { status: 500 }
    );
  }
}
