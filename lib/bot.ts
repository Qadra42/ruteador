import { Chat } from "chat";
import { createTelegramAdapter } from "@chat-adapter/telegram";
import { createMemoryState } from "@chat-adapter/state-memory";
import { handleMessage } from "./agent";

let botInstance: Chat | null = null;

export function getBot(): Chat {
  if (!botInstance) {
    const telegram = createTelegramAdapter();

    botInstance = new Chat({
      userName: "route-agent-bot",
      adapters: { telegram },
      state: createMemoryState(),
    });

    botInstance.onNewMention(async (thread, message) => {
      try {
        const response = await handleMessage(message.text, thread.id);
        await thread.post(response);
      } catch (error) {
        console.error("Error handling message:", error);
        await thread.post("Sorry, I had a technical issue. Can you try again?");
      }
    });
  }

  return botInstance;
}
