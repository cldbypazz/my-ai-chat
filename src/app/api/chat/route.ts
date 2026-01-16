import { openai } from '@ai-sdk/openai';
import { streamText } from 'ai';

// Allow streaming responses up to 30 seconds
export const maxDuration = 30;

export async function POST(req: Request) {
  const { messages } = await req.json();

  const result = streamText({
    model: openai('gpt-3.5-turbo'), // Change to 'gpt-3.5-turbo' if you want cheaper/faster thing, gpt-4o was before but i might not have access!
    messages,
  });

  return result.toDataStreamResponse();
}
