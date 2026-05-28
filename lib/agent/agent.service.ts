/**
 * Agent service - Main message handling
 */

import { generateText } from "ai";
import { createAzure } from "@ai-sdk/azure";
import { sql } from "../db";
import type { AgentConfig } from "../types";
import { saveOrder, getConversationHistory, saveMessage } from "../orders/orders.service";
import { buildSystemPrompt } from "./prompt.builder";
import { extractOrderData } from "./order.extractor";
// import { createValidateAddressTool } from "./tools/validate-address";

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
    businessDescription: agentConfig.business_description,
    serviceArea: agentConfig.service_area,
    requiredFields: agentConfig.required_fields as string[],
    customInstructions: agentConfig.custom_instructions,
    customPrompt: agentConfig.custom_prompt,
    greetingMessage: agentConfig.greeting_message,
  });

  // Save user message to history
  await saveMessage(threadId, "user", text);
  const history = await getConversationHistory(threadId);

  // Filter messages with empty content
  const validHistory = history.filter(msg => msg.content && msg.content.trim() !== '');

  console.log("📝 History length:", history.length, "Valid:", validHistory.length);

  // Initialize Azure OpenAI client
  const azure = createAzure({
    apiKey: process.env.AZURE_OPENAI_API_KEY!,
    resourceName: 'ruteador',
  });

  const { text: response } = await generateText({
    model: azure(process.env.AZURE_OPENAI_DEPLOYMENT_NAME || 'gpt-4.1'),
    system: systemPrompt,
    messages: validHistory,
    // TODO: Fix tool types in AI SDK 6.x
    // tools: {
    //   validate_address: createValidateAddressTool(
    //     agentConfig.service_area,
    //     resolvedCustomerPhone
    //   ),
    // },
  });

  console.log("🤖 Response:", response);

  // If the response contains order confirmation, extract data and save
  if (response.includes("CONFIRMADO") || response.includes("CONFIRMED")) {
    console.log("🔍 Detected order confirmation, extracting data...");

    const orderData = await extractOrderData(validHistory);

    if (orderData && orderData.items && orderData.address) {
      console.log("✅ Saving order to database...");
      const order = await saveOrder(orderData, threadId, resolvedCompanyId);
      console.log("✅✅ Order saved successfully with ID:", order.id);
    } else {
      console.log("⚠️ Missing required fields:", {
        items: !!orderData?.items,
        address: !!orderData?.address,
      });
    }
  }

  // Save agent response to history
  await saveMessage(threadId, "assistant", response);
  return response;
}
