import { generateText, tool } from "ai";
import { anthropic } from "@ai-sdk/anthropic";
import { z } from "zod";
import { saveOrder, getConversationHistory, saveMessage } from "./orders";

const SYSTEM_PROMPT = `Sos un asistente de una empresa de recolección de chatarra y residuos voluminosos en Montevideo, Uruguay. Tu trabajo es tomar pedidos de clientes que quieren que les levanten cosas.

Cuando un cliente te escribe, tenés que obtener:
1. Qué necesitan que les levanten (tipo de objeto/material)
2. La dirección exacta donde hay que pasar (calle, número, barrio de Montevideo)
3. Qué día prefieren (si no dicen, asumir "lo antes posible")
4. Un nombre o teléfono de contacto (opcional, pedirlo amablemente)

IMPORTANTE - MUY IMPORTANTE:
- Cuando tengas TODA la información (qué, dónde, cuándo), DEBES llamar a la función save_order ANTES de confirmar el pedido al cliente.
- NO digas "Anotado", "Agendado", "Confirmo tu pedido" o similar HASTA QUE HAYAS LLAMADO a save_order.
- Primero llamá a save_order con todos los datos, DESPUÉS confirmá al cliente.

Reglas:
- Hablás en español rioplatense, informal pero profesional. Usá "vos" en vez de "tú".
- Sé breve. Mensajes cortos como en WhatsApp, no ensayos.
- Si el cliente te da toda la info de una, llamá a save_order y confirmá el pedido directo.
- Si falta info, preguntá UNA cosa a la vez.
- Solo atendés pedidos dentro de Montevideo y zona metropolitana.
- Si alguien pregunta precios, decí que depende del volumen y que lo coordinan cuando pasen.
- Si alguien pregunta algo no relacionado al servicio, redirigí amablemente.

Ejemplo de conversación:
Cliente: "Hola tengo un lavarropas viejo para sacar"
Vos: "¡Hola! Dale, te lo sacamos. ¿En qué dirección estás?"
Cliente: "Benito Blanco 1340, Pocitos"
Vos: "Perfecto. ¿Qué día te queda bien?"
Cliente: "Mañana si puede ser"
Vos: "Listo. ¿Un nombre para el pedido?"
Cliente: "Juan"
Vos: [LLAMA A save_order con items="lavarropas", address="Benito Blanco 1340", neighborhood="Pocitos", preferred_date="mañana", client_name="Juan"]
Vos: "Anotado Juan. Quedás agendado para mañana - te pasamos a levantar el lavarropas en Benito Blanco 1340. Te confirmamos la hora. ¡Gracias!"`;

export async function handleMessage(text: string, threadId: string): Promise<string> {
  // Guardar mensaje del usuario en historial
  await saveMessage(threadId, "user", text);
  const history = await getConversationHistory(threadId);

  // Filtrar mensajes con contenido vacío (Anthropic no los acepta)
  const validHistory = history.filter(msg => msg.content && msg.content.trim() !== '');

  console.log("📝 History length:", history.length, "Valid:", validHistory.length);

  const { text: response } = await generateText({
    model: anthropic("claude-sonnet-4-5-20250929"),
    system: SYSTEM_PROMPT + `\n\nCuando tengas toda la información, devolvé SOLO el texto de confirmación al cliente. NO llames a ninguna función.`,
    messages: validHistory,
  });

  console.log("🤖 Response:", response);

  // Si la respuesta contiene "Confirmo tu pedido" o "Agendado", extraer datos y guardar
  if (response.includes("Confirmo") || response.includes("Agendado") || response.includes("pedido")) {
    // Extraer información del historial (últimos mensajes del usuario)
    const userMessages = validHistory.filter((m: any) => m.role === "user");
    const lastMessages = userMessages.slice(-4).map((m: any) => m.content).join(" ");

    console.log("🔍 Detecté confirmación de pedido, buscando datos en:", lastMessages);

    // Intentar parsear los datos de la conversación
    try {
      const extractionResponse = await generateText({
        model: anthropic("claude-sonnet-4-5-20250929"),
        system: `Extrae los datos del pedido de esta conversación y devuelve un JSON con: items, address, neighborhood, preferred_date, client_name (opcional), client_phone (opcional). Si no encontrás algo, omitilo.`,
        prompt: lastMessages,
      });

      const orderData = JSON.parse(extractionResponse.text);
      console.log("📦 Datos extraídos:", orderData);

      if (orderData.items && orderData.address && orderData.neighborhood) {
        const order = await saveOrder(orderData, threadId);
        console.log("✅ Pedido guardado con ID:", order.id);
      }
    } catch (error) {
      console.error("❌ Error extrayendo datos del pedido:", error);
    }
  }

  // Guardar respuesta del agente en historial
  await saveMessage(threadId, "assistant", response);
  return response;
}
