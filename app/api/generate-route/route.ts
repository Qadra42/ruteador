import { NextRequest, NextResponse } from "next/server";
import { getPendingOrders, markOrdersAsRouted } from "@/lib/orders";
import { saveRouteForMap } from "@/lib/routes";
import { prisma } from "@/lib/db";

// Build Google Maps URL with waypoints (Google will optimize)
function buildGoogleMapsUrl(orders: any[]): string {
  if (orders.length === 0) return "";

  const addresses = orders.map((o: any) =>
    encodeURIComponent(`${o.address}, Montevideo, Uruguay`)
  );

  if (addresses.length === 1) {
    return `https://www.google.com/maps/dir/?api=1&destination=${addresses[0]}`;
  }

  const destination = addresses[addresses.length - 1];
  const waypoints = addresses.slice(0, -1).join("|");
  return `https://www.google.com/maps/dir/?api=1&destination=${destination}&waypoints=${waypoints}`;
}

export async function POST(request: NextRequest) {
  try {
    // 1. Read body with selected orders and number of drivers
    const body = await request.json();
    const { orderIds, numDrivers = 1 } = body;

    console.log("API received:", { orderIds, numDrivers, selectedCount: orderIds?.length });

    if (!orderIds || orderIds.length === 0) {
      return NextResponse.json(
        { error: "Must select at least one order" },
        { status: 400 }
      );
    }

    // TODO: In Phase 3, get companyId from authenticated user session
    // For now, get the first company in the database
    const company = await prisma.company.findFirst();

    if (!company) {
      return NextResponse.json(
        { error: "No company found. Run seed script first." },
        { status: 404 }
      );
    }

    // 2. Read pending orders and filter only the selected ones
    const allOrders = await getPendingOrders(company.id);
    const selectedOrders = allOrders.filter((order: any) =>
      orderIds.includes(order.id)
    );

    console.log("Selected orders count:", selectedOrders.length);

    if (selectedOrders.length === 0) {
      return NextResponse.json(
        { error: "Selected orders not found" },
        { status: 400 }
      );
    }

    // 3. Generate routes based on number of drivers
    let routes: Array<{
      driverLabel: string;
      googleMapsUrl: string;
      customMapUrl: string;
      summary: string;
      ordersCount: number;
    }>;

    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ||
      (request.headers.get('host') ? `${request.headers.get('x-forwarded-proto') || 'http'}://${request.headers.get('host')}` : 'http://localhost:3000');

    console.log("Checking split condition:", { numDrivers, ordersCount: selectedOrders.length, willSplit: numDrivers === 2 && selectedOrders.length >= 2 });

    if (numDrivers === 2 && selectedOrders.length >= 2) {
      console.log("Splitting into 2 routes...");

      // Simple split: divide orders in half
      const midpoint = Math.floor(selectedOrders.length / 2);
      const orders1 = selectedOrders.slice(0, midpoint);
      const orders2 = selectedOrders.slice(midpoint);

      // Build Google Maps URLs (Google will optimize the waypoints)
      const googleMapsUrl1 = buildGoogleMapsUrl(orders1);
      const googleMapsUrl2 = buildGoogleMapsUrl(orders2);

      // Save routes for custom map visualization
      const savedRoute1 = await saveRouteForMap({
        orders: orders1,
        driverLabel: "Driver 1",
        companyId: company.id,
        driverCount: "2",
        googleMapsUrl: googleMapsUrl1,
      });

      const savedRoute2 = await saveRouteForMap({
        orders: orders2,
        driverLabel: "Driver 2",
        companyId: company.id,
        driverCount: "2",
        googleMapsUrl: googleMapsUrl2,
      });

      // Build summaries
      const summary1 = orders1.map((o: any, i: number) =>
        `${i + 1}. ${o.address} — ${o.items}`
      ).join("\n");

      const summary2 = orders2.map((o: any, i: number) =>
        `${i + 1}. ${o.address} — ${o.items}`
      ).join("\n");

      routes = [
        {
          driverLabel: "Driver 1",
          googleMapsUrl: googleMapsUrl1,
          customMapUrl: `${baseUrl}/map/${savedRoute1.id}`,
          summary: summary1,
          ordersCount: orders1.length,
        },
        {
          driverLabel: "Driver 2",
          googleMapsUrl: googleMapsUrl2,
          customMapUrl: `${baseUrl}/map/${savedRoute2.id}`,
          summary: summary2,
          ordersCount: orders2.length,
        },
      ];
    } else {
      // Generate 1 single route
      const googleMapsUrl = buildGoogleMapsUrl(selectedOrders);

      // Save route for custom map visualization
      const savedRoute = await saveRouteForMap({
        orders: selectedOrders,
        driverLabel: "Single route",
        companyId: company.id,
        driverCount: "1",
        googleMapsUrl,
      });

      // Build summary
      const summary = selectedOrders.map((o: any, i: number) =>
        `${i + 1}. ${o.address} — ${o.items}`
      ).join("\n");

      routes = [
        {
          driverLabel: "Single route",
          googleMapsUrl,
          customMapUrl: `${baseUrl}/map/${savedRoute.id}`,
          summary,
          ordersCount: selectedOrders.length,
        },
      ];
    }

    // 4. COMMENTED: Send message to driver via Telegram
    // const driverChatId = process.env.DRIVER_TELEGRAM_CHAT_ID;
    // const botToken = process.env.TELEGRAM_BOT_TOKEN;
    //
    // if (driverChatId && botToken) {
    //   // Send message for each route
    //   for (const route of routes) {
    //     const message = `🚛 *${route.driverLabel}* (${new Date().toLocaleDateString("es-UY")})\n\n${route.summary}\n\n🗺️ [Interactive Map](${route.customMapUrl})\n📍 [Google Maps Directions](${route.googleMapsUrl})`;
    //
    //     await fetch(
    //       `https://api.telegram.org/bot${botToken}/sendMessage`,
    //       {
    //         method: "POST",
    //         headers: { "Content-Type": "application/json" },
    //         body: JSON.stringify({
    //           chat_id: driverChatId,
    //           text: message,
    //           parse_mode: "Markdown",
    //         }),
    //       }
    //     );
    //   }
    // }

    // 5. Mark orders as "assigned" to routes
    // Update each route's orders
    if (numDrivers === 2 && selectedOrders.length >= 2) {
      const midpoint = Math.floor(selectedOrders.length / 2);
      const orders1 = selectedOrders.slice(0, midpoint);
      const orders2 = selectedOrders.slice(midpoint);

      await markOrdersAsRouted(orders1.map((o: any) => o.id), routes[0].customMapUrl.split('/').pop()!);
      await markOrdersAsRouted(orders2.map((o: any) => o.id), routes[1].customMapUrl.split('/').pop()!);
    } else {
      await markOrdersAsRouted(selectedOrders.map((o: any) => o.id), routes[0].customMapUrl.split('/').pop()!);
    }

    return NextResponse.json({
      success: true,
      routes,
    });
  } catch (error) {
    console.error("Error generating route:", error);
    return NextResponse.json(
      { error: "Error generating route" },
      { status: 500 }
    );
  }
}
