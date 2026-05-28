/**
 * Kapso WhatsApp Client
 * https://docs.kapso.ai
 */

interface KapsoMessage {
  to: string;
  message: string;
}

export class KapsoClient {
  private apiKey: string;
  private phoneNumberId: string;

  constructor() {
    const apiKey = process.env.KAPSO_API_KEY;
    const phoneNumberId = process.env.KAPSO_PHONE_NUMBER_ID;

    if (!apiKey || !phoneNumberId) {
      throw new Error(
        'Kapso credentials not configured. Add KAPSO_API_KEY and KAPSO_PHONE_NUMBER_ID to .env.local'
      );
    }

    this.apiKey = apiKey;
    this.phoneNumberId = phoneNumberId;
  }

  async sendMessage({ to, message }: KapsoMessage): Promise<void> {
    const response = await fetch('https://api.kapso.ai/v1/messages', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        phone_number_id: this.phoneNumberId,
        to,
        type: 'text',
        text: {
          body: message,
        },
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('❌ Kapso API error:', error);
      throw new Error(`Kapso API error: ${error}`);
    }

    console.log('✅ WhatsApp message sent to:', to);
  }
}

// Singleton instance
export const kapso = new KapsoClient();
