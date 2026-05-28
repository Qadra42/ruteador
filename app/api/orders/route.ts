import { NextResponse } from "next/server";
import { getPendingOrders } from "@/lib/orders";
import { sql } from "@/lib/db";

export async function GET() {
  try {
    // TODO: In Phase 3, get companyId from authenticated user session
    // For now, get the first company in the database
    const [company] = await sql`SELECT * FROM companies LIMIT 1`;

    if (!company) {
      return NextResponse.json(
        { error: "No company found. Run seed script first." },
        { status: 404 }
      );
    }

    const orders = await getPendingOrders(company.id);

    // Map database orders to legacy format for dashboard compatibility
    const mappedOrders = orders.map((order: any) => ({
      id: order.id,
      client_name: order.customer_name || 'No name',
      client_phone: order.customer_phone,
      items: order.items,
      address: order.address,
      neighborhood: '', // Extracted from address in old format
      preferred_date: order.preferred_date || 'lo antes posible',
      status: order.status,
      created_at: order.created_at,
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
