/**
 * Kapso WhatsApp Client
 * Using official @kapso/whatsapp-cloud-api SDK
 * https://docs.kapso.ai
 */

import { WhatsAppClient } from '@kapso/whatsapp-cloud-api';

interface KapsoMessage {
  to: string;
  message: string;
}

export class KapsoClient {
  private client: WhatsAppClient;
  private phoneNumberId: string;

  constructor() {
    const apiKey = process.env.KAPSO_API_KEY;
    const phoneNumberId = process.env.KAPSO_PHONE_NUMBER_ID;

    if (!apiKey || !phoneNumberId) {
      throw new Error(
        'Kapso credentials not configured. Add KAPSO_API_KEY and KAPSO_PHONE_NUMBER_ID to .env.local'
      );
    }

    this.client = new WhatsAppClient({
      baseUrl: 'https://api.kapso.ai/meta/whatsapp',
      kapsoApiKey: apiKey,
    });

    this.phoneNumberId = phoneNumberId;
  }

  async sendMessage({ to, message }: KapsoMessage): Promise<void> {
    try {
      await this.client.messages.sendText({
        phoneNumberId: this.phoneNumberId,
        to,
        body: message,
      });

      console.log('✅ WhatsApp message sent to:', to);
    } catch (error) {
      console.error('❌ Kapso API error:', error);
      throw error;
    }
  }
}

// Singleton instance
export const kapso = new KapsoClient();
