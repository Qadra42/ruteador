import { NextRequest, NextResponse } from "next/server";
import { getPendingOrders, markOrdersAsRouted } from "@/lib/orders";
import { generateRoute } from "@/lib/route-optimizer";

export async function POST(request: NextRequest) {
  try {
    // 1. Leer pedidos pendientes
    const orders = await getPendingOrders();

    if (orders.length === 0) {
      return NextResponse.json(
        { error: "No hay pedidos pendientes" },
        { status: 400 }
      );
    }

    // 2. Optimizar la ruta
    const { optimizedOrders, googleMapsUrl, summary } = generateRoute(orders);

    // 3. Enviar mensaje al chofer vía Telegram
    const driverChatId = process.env.DRIVER_TELEGRAM_CHAT_ID;
    const botToken = process.env.TELEGRAM_BOT_TOKEN;

    if (driverChatId && botToken) {
      const message = `🚛 *Ruta del día* (${new Date().toLocaleDateString("es-UY")})\n\n${summary}\n\n📍 [Abrir en Google Maps](${googleMapsUrl})`;

      await fetch(
        `https://api.telegram.org/bot${botToken}/sendMessage`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            chat_id: driverChatId,
            text: message,
            parse_mode: "Markdown",
          }),
        }
      );
    }

    // 4. Marcar pedidos como "routed"
    await markOrdersAsRouted(optimizedOrders.map((o) => o.id));

    return NextResponse.json({
      success: true,
      ordersCount: optimizedOrders.length,
      googleMapsUrl,
      summary,
    });
  } catch (error) {
    console.error("Error generating route:", error);
    return NextResponse.json(
      { error: "Error al generar la ruta" },
      { status: 500 }
    );
  }
}
