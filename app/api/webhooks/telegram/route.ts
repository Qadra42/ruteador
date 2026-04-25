import { getBot } from "@/lib/bot";

export async function POST(request: Request): Promise<Response> {
  try {
    const bot = getBot();
    return await bot.webhooks.telegram(request);
  } catch (error) {
    console.error("Telegram webhook error:", error);
    return new Response("Internal Server Error", { status: 500 });
  }
}
