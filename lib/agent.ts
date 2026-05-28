import { generateText, tool } from "ai";
import { anthropic } from "@ai-sdk/anthropic";
import { z } from "zod";
import { saveOrder, getConversationHistory, saveMessage } from "./orders";
import { sql } from "./db";
import { geocodeAddress } from "./geocoding";
import { kapso } from "./whatsapp";

/**
 * Agent Configuration Interface
 */
interface AgentConfig {
  language: string;
  businessDescription: string;
  serviceArea: string;
  requiredFields: string[];
  customInstructions?: string | null;
  customPrompt?: string | null;
  greetingMessage?: string | null;
}

/**
 * Build system prompt dynamically based on agent configuration
 */
function buildSystemPrompt(config: AgentConfig): string {
  // If custom prompt is provided, use it directly
  if (config.customPrompt) {
    return config.customPrompt;
  }

  // Language-specific templates
  const languageInstructions = {
    'es-UY': 'SIEMPRE respondé en español rioplatense (Uruguay). Usá voseo.',
    'es-AR': 'SIEMPRE respondé en español rioplatense (Argentina). Usá voseo.',
    'es-MX': 'SIEMPRE respondé en español mexicano. Usá tuteo.',
    'es': 'SIEMPRE respondé en español.',
    'en': 'ALWAYS respond in English.',
  };

  const languageInstruction = languageInstructions[config.language as keyof typeof languageInstructions] || languageInstructions['es'];

  // Build required fields list
  const fieldDescriptions: Record<string, string> = {
    what: 'Qué necesitan (objetos/materiales/servicio)',
    where: `Dirección exacta (calle, número, barrio en ${config.serviceArea})`,
    when: 'Qué día prefieren (si no dicen, asumí "lo antes posible")',
    contact: 'Nombre de contacto o teléfono (opcional, preguntá cortésmente)'
  };

  const fieldsInstructions = config.requiredFields
    .map((field, idx) => `${idx + 1}. ${fieldDescriptions[field] || field}`)
    .join('\n');

  // Build the prompt
  return `Sos un asistente para ${config.businessDescription} en ${config.serviceArea}. Tu trabajo es tomar pedidos de clientes conversando de forma natural.

Cuando un cliente te escribe, necesitás obtener:
${fieldsInstructions}

MUY IMPORTANTE - CRÍTICO:
- Cuando el cliente mencione una dirección (calle y número), TENÉS QUE validarla usando el tool validate_address.
- Después de validar la dirección, preguntá "¿Es ahí?" para que confirme.
- Cuando tengas TODA la información necesaria (${config.requiredFields.join(', ')}), TENÉS QUE incluir la palabra "CONFIRMADO" en tu respuesta.
- Si el cliente te da toda la info en el primer mensaje, respondé con "CONFIRMADO" directamente.
- Si falta información, preguntá UNA cosa a la vez.

Reglas:
- ${languageInstruction}
- Sé MUY breve y casual. Conversación natural, como escribirle a un amigo.
- NO uses emojis.
- NO repitas toda la información de vuelta en formato estructurado.
- NO uses símbolos como 📍 📦 📅 📞 etc.
- Solo confirmá de forma natural.
- Solo atendés pedidos dentro de ${config.serviceArea}.
${config.customInstructions ? `\n${config.customInstructions}` : ''}

Ejemplo de conversación:
Cliente: "Hola, tengo una heladera vieja para tirar"
Vos: "Hola! Dale, la retiramos. ¿Cuál es la dirección?"
Cliente: "Benito Blanco 1340, Pocitos"
Vos: "Perfecto. ¿Qué día te viene bien?"
Cliente: "Mañana si se puede"
Vos: "Bárbaro. ¿Un nombre para el pedido?"
Cliente: "Juan"
Vos: "CONFIRMADO. Listo Juan, pasamos mañana. Gracias!"`;
}

/**
 * Handle incoming message with multi-tenant support
 */
export async function handleMessage(
  text: string,
  threadId: string,
  companyId?: string,
  customerPhone?: string
): Promise<string> {
  // For legacy Telegram bot support (single-tenant)
  let resolvedCompanyId: string;
  let resolvedCustomerPhone: string | undefined = customerPhone;

  if (!companyId) {
    const [firstCompany] = await sql`SELECT * FROM companies LIMIT 1`;
    if (!firstCompany) {
      throw new Error('No company configured. Run seed script first.');
    }
    resolvedCompanyId = firstCompany.id;
    resolvedCustomerPhone = threadId; // Use threadId as customer identifier for legacy
  } else {
    resolvedCompanyId = companyId;
  }

  // Load agent configuration for this company
  const [agentConfig] = await sql`
    SELECT * FROM agent_configs WHERE company_id = ${resolvedCompanyId}
  `;

  if (!agentConfig) {
    throw new Error(`No agent configuration found for company ${resolvedCompanyId}`);
  }

  // Build system prompt
  const systemPrompt = buildSystemPrompt({
    language: agentConfig.language,
    businessDescription: agentConfig.businessDescription,
    serviceArea: agentConfig.serviceArea,
    requiredFields: agentConfig.requiredFields as string[],
    customInstructions: agentConfig.customInstructions,
    customPrompt: agentConfig.customPrompt,
    greetingMessage: agentConfig.greetingMessage,
  });

  // Save user message to history
  await saveMessage(threadId, "user", text);
  const history = await getConversationHistory(threadId);

  // Filter messages with empty content
  const validHistory = history.filter(msg => msg.content && msg.content.trim() !== '');

  console.log("📝 History length:", history.length, "Valid:", validHistory.length);

  const { text: response } = await generateText({
    model: anthropic("claude-sonnet-4-5-20250929"),
    system: systemPrompt,
    messages: validHistory,
    tools: {
      validate_address: tool({
        description: 'Validate and geocode an address. Use this when the customer provides a street address. This will send a location pin to confirm the address with the customer.',
        parameters: z.object({
          address: z.string().describe('The full address provided by the customer (street + number + neighborhood if available)'),
        }),
        // @ts-ignore - Tool execute type compatibility issue with AI SDK 6.x
        execute: async (params) => {
          const address = params.address;
          console.log(`🗺️ Geocoding address: "${address}"`);

          const result = await geocodeAddress(address, agentConfig.serviceArea);

          if (!result) {
            return {
              success: false,
              message: 'No se pudo validar la dirección. Por favor verificá que sea correcta.',
            };
          }

          // Send location pin to customer via WhatsApp (only for WhatsApp, not Telegram)
          if (resolvedCustomerPhone) {
            try {
              await kapso.sendLocation({
                to: resolvedCustomerPhone,
                latitude: result.location.lat,
                longitude: result.location.lng,
                name: result.formattedAddress,
                address: result.formattedAddress,
              });

              console.log(`✅ Location sent: ${result.formattedAddress}`);
            } catch (error) {
              console.error('❌ Error sending location:', error);
            }
          }

          return {
            success: true,
            formattedAddress: result.formattedAddress,
            neighborhood: result.neighborhood,
            city: result.city,
            coordinates: result.location,
          };
        },
      }),
    },
  });

  console.log("🤖 Response:", response);

  // If the response contains order confirmation, extract data and save
  if (response.includes("CONFIRMADO") || response.includes("CONFIRMED")) {
    const userMessages = validHistory.filter((m: any) => m.role === "user");
    const lastMessages = userMessages.slice(-4).map((m: any) => m.content).join(" ");

    console.log("🔍 Detected order confirmation, searching for data in:", lastMessages);

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

      if (orderData.items && orderData.address) {
        console.log("✅ Saving order to database...");
        const order = await saveOrder(orderData, threadId, resolvedCompanyId);
        console.log("✅✅ Order saved successfully with ID:", order.id);
      } else {
        console.log("⚠️ Missing required fields:", {
          items: !!orderData.items,
          address: !!orderData.address,
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
