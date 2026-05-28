/**
 * Agent domain types
 */

export interface AgentConfig {
  language: string;
  businessDescription: string;
  serviceArea: string;
  requiredFields: string[];
  customInstructions?: string | null;
  customPrompt?: string | null;
  greetingMessage?: string | null;
}

export interface ConversationMessage {
  role: 'user' | 'assistant';
  content: string;
}
