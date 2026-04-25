import { generateText } from "ai";
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

  console.log("📝 History length:", history.length);

  const { text: response, toolCalls, toolResults } = await generateText({
    model: anthropic("claude-haiku-4-5-20251001"),
    system: SYSTEM_PROMPT,
    messages: history,
    maxSteps: 5, // Permitir múltiples rondas: llamar tool + generar respuesta
    tools: {
      save_order: {
        description: "Guardar un pedido cuando el cliente confirmó todos los datos necesarios (qué, dónde, cuándo)",
        inputSchema: z.object({
          items: z.string().describe("Qué hay que levantar (ej: lavarropas, heladera, fierros)"),
          address: z.string().describe("Dirección completa con número"),
          neighborhood: z.string().describe("Barrio de Montevideo"),
          preferred_date: z.string().describe("Fecha preferida, formato YYYY-MM-DD o 'lo antes posible'"),
          client_name: z.string().optional().describe("Nombre del cliente si lo proporcionó"),
          client_phone: z.string().optional().describe("Teléfono del cliente si lo proporcionó"),
        }),
        run: async (params: {
          items: string;
          address: string;
          neighborhood: string;
          preferred_date: string;
          client_name?: string;
          client_phone?: string;
        }) => {
          console.log("🔧 TOOL EJECUTADO - Guardando pedido:", params);
          const order = await saveOrder(params, threadId);
          console.log("✅ Pedido guardado con ID:", order.id);
          return { success: true, order_id: order.id };
        },
      },
    },
    toolChoice: "auto",
  });

  console.log("🤖 Response:", response);
  console.log("🔧 Tool calls:", toolCalls?.length || 0);
  if (toolResults && toolResults.length > 0) {
    console.log("📊 Tool results:", toolResults);
  }

  // Si el response está vacío (solo llamó al tool sin generar texto), generar confirmación
  const finalResponse = response || "Listo, pedido anotado. Te confirmamos la hora por acá. ¡Gracias!";

  // Guardar respuesta del agente en historial
  await saveMessage(threadId, "assistant", finalResponse);
  return finalResponse;
}
