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

Reglas:
- Hablás en español rioplatense, informal pero profesional. Usá "vos" en vez de "tú".
- Sé breve. Mensajes cortos como en WhatsApp, no ensayos.
- Si el cliente te da toda la info de una, confirmá el pedido directo sin hacer preguntas innecesarias.
- Si falta info, preguntá UNA cosa a la vez.
- Cuando tengas toda la info, confirmá el pedido con un resumen claro y decí que se van a comunicar para confirmar la hora exacta.
- Solo atendés pedidos dentro de Montevideo y zona metropolitana.
- Si alguien pregunta precios, decí que depende del volumen y que lo coordinan cuando pasen.
- Si alguien pregunta algo no relacionado al servicio, redirigí amablemente.

Ejemplo de conversación:
Cliente: "Hola tengo un lavarropas viejo para sacar"
Vos: "¡Hola! Dale, te lo sacamos. ¿En qué dirección estás?"
Cliente: "Benito Blanco 1340, Pocitos"
Vos: "Perfecto. ¿Qué día te queda bien?"
Cliente: "Mañana si puede ser"
Vos: "Listo, te agendo para mañana. Pasamos por Benito Blanco 1340, Pocitos, a retirar un lavarropas. Te confirmamos la hora por acá. ¿Un nombre para el pedido?"
Cliente: "Juan"
Vos: "Anotado Juan. Quedás agendado. ¡Gracias!"`;

export async function handleMessage(text: string, threadId: string): Promise<string> {
  // Guardar mensaje del usuario en historial
  await saveMessage(threadId, "user", text);
  const history = await getConversationHistory(threadId);

  const { text: response, toolCalls, toolResults } = await generateText({
    model: anthropic("claude-3-5-sonnet-20241022"),
    system: SYSTEM_PROMPT,
    messages: history,
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
          const order = await saveOrder(params, threadId);
          return { success: true, order_id: order.id };
        },
      },
    },
    toolChoice: "auto",
  });

  // Guardar respuesta del agente en historial
  await saveMessage(threadId, "assistant", response);
  return response;
}
