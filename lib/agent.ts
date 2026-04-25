import { generateText, tool } from "ai";
import { anthropic } from "@ai-sdk/anthropic";
import { z } from "zod";
import { saveOrder, getConversationHistory, saveMessage } from "./orders";

const SYSTEM_PROMPT = `You are an assistant for a scrap metal and bulky waste collection company in Montevideo, Uruguay. Your job is to take orders from clients who need items picked up.

When a client writes to you, you need to obtain:
1. What they need picked up (type of object/material)
2. The exact address for pickup (street, number, neighborhood in Montevideo)
3. What day they prefer (if they don't say, assume "as soon as possible")
4. A contact name or phone number (optional, ask politely)

VERY IMPORTANT - CRITICAL:
- When you have ALL the information (what, where, when), you MUST include the word "CONFIRMED" in your response.
- If the client gives you all info in the first message, respond with "CONFIRMED" directly.
- If info is missing, ask ONE thing at a time.

Rules:
- ALWAYS respond in English. Never respond in Spanish.
- Be VERY brief and casual. Natural conversation, like texting a friend.
- DO NOT use emojis.
- DO NOT repeat back all the information in a formatted way.
- DO NOT use symbols like 📍 📦 📅 📞 etc.
- Just acknowledge naturally and confirm.
- You only handle orders within Montevideo and metropolitan area.
- If someone asks about prices, say it depends on volume and they'll coordinate when they come by.

Example conversation:
Client: "Hi, I have an old washing machine to get rid of"
You: "Hi! Sure, we can pick it up. What's your address?"
Client: "Benito Blanco 1340, Pocitos"
You: "Perfect. What day works for you?"
Client: "Tomorrow if possible"
You: "Great. A name for the order?"
Client: "Juan"
You: "CONFIRMED. All set Juan, we'll swing by tomorrow. Thanks!"`;

export async function handleMessage(text: string, threadId: string): Promise<string> {
  // Save user message to history
  await saveMessage(threadId, "user", text);
  const history = await getConversationHistory(threadId);

  // Filter messages with empty content (Anthropic doesn't accept them)
  const validHistory = history.filter(msg => msg.content && msg.content.trim() !== '');

  console.log("📝 History length:", history.length, "Valid:", validHistory.length);

  const { text: response } = await generateText({
    model: anthropic("claude-sonnet-4-5-20250929"),
    system: SYSTEM_PROMPT + `\n\nIMPORTANT: You MUST respond in ENGLISH only. When you have all the information (items, address, neighborhood, date), include the word "CONFIRMED" in your response.`,
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
        system: `You are a data extractor. Analyze the conversation and return ONLY a valid JSON object (no markdown, no explanations) with these fields: items, address, neighborhood, preferred_date, client_name, client_phone. Example: {"items":"refrigerator","address":"Rivera 1500","neighborhood":"La Comercial","preferred_date":"Tuesday","client_name":"Roberto","client_phone":"099123456"}`,
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
