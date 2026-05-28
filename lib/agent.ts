import { generateText, tool } from "ai";
import { anthropic } from "@ai-sdk/anthropic";
import { z } from "zod";
import { saveOrder, getConversationHistory, saveMessage } from "./orders";

const SYSTEM_PROMPT = `Sos un asistente para una empresa de retiro de residuos voluminosos y chatarra en Montevideo, Uruguay. Tu trabajo es tomar pedidos de clientes que necesitan que retiren objetos grandes.

Cuando un cliente te escribe, necesitás obtener:
1. Qué necesitan retirar (tipo de objetos/materiales)
2. La dirección exacta para el retiro (calle, número, barrio en Montevideo)
3. Qué día prefieren (si no dicen, asumí "lo antes posible")
4. Nombre de contacto o teléfono (opcional, preguntá cortésmente)

MUY IMPORTANTE - CRÍTICO:
- Cuando tengas TODA la información necesaria (qué, dónde, cuándo), TENÉS QUE incluir la palabra "CONFIRMADO" en tu respuesta.
- Si el cliente te da toda la info en el primer mensaje, respondé con "CONFIRMADO" directamente.
- Si falta información, preguntá UNA cosa a la vez.

Reglas:
- SIEMPRE respondé en español rioplatense (Uruguay/Argentina). Nunca en inglés.
- Sé MUY breve y casual. Conversación natural, como escribirle a un amigo.
- NO uses emojis.
- NO repitas toda la información de vuelta en formato estructurado.
- NO uses símbolos como 📍 📦 📅 📞 etc.
- Solo confirmá de forma natural.
- Solo atendés pedidos dentro de Montevideo y área metropolitana.
- Si preguntan por precios, decí que depende del volumen y se coordina cuando pasen.

Ejemplo de conversación:
Cliente: "Hola, tengo una heladera vieja para tirar"
Vos: "Hola! Dale, la retiramos. ¿Cuál es la dirección?"
Cliente: "Benito Blanco 1340, Pocitos"
Vos: "Perfecto. ¿Qué día te viene bien?"
Cliente: "Mañana si se puede"
Vos: "Bárbaro. ¿Un nombre para el pedido?"
Cliente: "Juan"
Vos: "CONFIRMADO. Listo Juan, pasamos mañana. Gracias!"`;

export async function handleMessage(text: string, threadId: string): Promise<string> {
  // Save user message to history
  await saveMessage(threadId, "user", text);
  const history = await getConversationHistory(threadId);

  // Filter messages with empty content (Anthropic doesn't accept them)
  const validHistory = history.filter(msg => msg.content && msg.content.trim() !== '');

  console.log("📝 History length:", history.length, "Valid:", validHistory.length);

  const { text: response } = await generateText({
    model: anthropic("claude-sonnet-4-5-20250929"),
    system: SYSTEM_PROMPT + `\n\nIMPORTANTE: TENÉS QUE responder en ESPAÑOL RIOPLATENSE únicamente. Cuando tengas toda la información (items, dirección, barrio, fecha), incluí la palabra "CONFIRMADO" en tu respuesta.`,
    messages: validHistory,
  });

  console.log("🤖 Response:", response);

  // If the response contains order confirmation keywords, extract data and save
  if (response.includes("CONFIRMED")) {
    // Extract information from history (last user messages)
    const userMessages = validHistory.filter((m: any) => m.role === "user");
    const lastMessages = userMessages.slice(-4).map((m: any) => m.content).join(" ");

    console.log("🔍 Detected order confirmation, searching for data in:", lastMessages);

    // Try to parse the data from the conversation
    try {
      const extractionResponse = await generateText({
        model: anthropic("claude-sonnet-4-5-20250929"),
        system: `Sos un extractor de datos. Analizá la conversación y devolvé SOLO un objeto JSON válido (sin markdown, sin explicaciones) con estos campos: items, address, neighborhood, preferred_date, client_name, client_phone. Ejemplo: {"items":"heladera","address":"Rivera 1500","neighborhood":"La Comercial","preferred_date":"mañana","client_name":"Roberto","client_phone":"099123456"}`,
        prompt: lastMessages,
      });

      // Clean possible markdown markers
      let jsonText = extractionResponse.text.trim();
      if (jsonText.startsWith("```")) {
        jsonText = jsonText.replace(/```json\n?/g, "").replace(/```\n?/g, "");
      }

      const orderData = JSON.parse(jsonText);
      console.log("📦 Extracted data:", orderData);

      if (orderData.items && orderData.address && orderData.neighborhood) {
        console.log("✅ Saving order to KV...");
        const order = await saveOrder(orderData, threadId);
        console.log("✅✅ Order saved successfully with ID:", order.id);
      } else {
        console.log("⚠️ Missing required fields:", {
          items: !!orderData.items,
          address: !!orderData.address,
          neighborhood: !!orderData.neighborhood
        });
      }
    } catch (error) {
      console.error("❌ Error extracting order data:", error);
    }
  }

  // Save agent response to history
  await saveMessage(threadId, "assistant", response);
  return response;
}
