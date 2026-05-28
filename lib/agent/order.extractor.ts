/**
 * Order data extraction from conversation
 */

import { generateText } from "ai";
import { anthropic } from "@ai-sdk/anthropic";
import type { OrderData, ConversationMessage } from '../types';

/**
 * Extract order data from conversation history
 */
export async function extractOrderData(
  messages: ConversationMessage[]
): Promise<OrderData | null> {
  const userMessages = messages.filter((m) => m.role === "user");
  const lastMessages = userMessages.slice(-4).map((m) => m.content).join(" ");

  console.log("🔍 Extracting order data from:", lastMessages);

  try {
    const extractionResponse = await generateText({
      model: anthropic("claude-sonnet-4-5-20250929"),
      system: `Sos un extractor de datos. Analizá la conversación y devolvé SOLO un objeto JSON válido (sin markdown, sin explicaciones) con estos campos: items, address, neighborhood, preferred_date, client_name, client_phone. Ejemplo: {"items":"heladera","address":"Rivera 1500","neighborhood":"La Comercial","preferred_date":"mañana","client_name":"Roberto","client_phone":"099123456"}`,
      prompt: lastMessages,
    });

    let jsonText = extractionResponse.text.trim();
    if (jsonText.startsWith("```")) {
      jsonText = jsonText.replace(/```json\n?/g, "").replace(/```\n?/g, "");
    }

    const orderData = JSON.parse(jsonText);
    console.log("📦 Extracted data:", orderData);

    return orderData;
  } catch (error) {
    console.error("❌ Error extracting order data:", error);
    return null;
  }
}
