export type ChatMessage = { id: string; role: 'user' | 'assistant'; content: string };
export type ChatSummary = { id: string; title: string; updatedAt: string };

export function isChatMessages(value: unknown): value is ChatMessage[] {
  return Array.isArray(value) && value.length > 0 && value.length <= 100 && value.every(message =>
    message && typeof message.id === 'string' && message.id.length <= 100 &&
    (message.role === 'user' || message.role === 'assistant') &&
    typeof message.content === 'string' && message.content.length > 0 && message.content.length <= 16000
  ) && value.reduce((size, message) => size + message.content.length, 0) <= 200000;
}

export function chatTitle(messages: ChatMessage[]): string {
  return (messages.find(message => message.role === 'user')?.content || 'New chat').replace(/\s+/g, ' ').trim().slice(0, 70);
}
