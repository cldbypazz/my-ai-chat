import OpenAI from 'openai';

export const runtime = 'nodejs';
export const maxDuration = 60;

type Message = { role: 'user' | 'assistant'; content: string };

function isMessage(value: unknown): value is Message {
  if (!value || typeof value !== 'object') return false;
  const message = value as Record<string, unknown>;
  return (message.role === 'user' || message.role === 'assistant') &&
    typeof message.content === 'string' && message.content.trim().length > 0 &&
    message.content.length <= 16000;
}

export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: 'Please send a valid JSON message.' }, { status: 400 });
  }
  const messages = (body as { messages?: unknown } | null)?.messages;
  if (!Array.isArray(messages) || messages.length === 0 || messages.length > 100 ||
      !messages.every(isMessage) || messages[messages.length - 1].role !== 'user') {
    return Response.json({ error: 'Send between 1 and 100 messages, ending with your question (16,000 characters per message maximum).' }, { status: 400 });
  }

  try {
    // Netlify AI Gateway supplies the OpenAI credentials and base URL at runtime.
    const client = new OpenAI();
    const completion = await client.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: messages.map(({ role, content }) => ({ role, content })),
      max_completion_tokens: 2048,
      stream: true,
    }, { signal: req.signal });
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        try {
          for await (const chunk of completion) {
            const text = chunk.choices[0]?.delta?.content;
            if (text) controller.enqueue(encoder.encode(text));
          }
          controller.close();
        } catch {
          controller.error(new Error('The reply was interrupted. Please try again.'));
        }
      },
      cancel() { completion.controller.abort(); },
    });
    return new Response(stream, {
      headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-store' },
    });
  } catch {
    return Response.json({ error: 'The assistant is temporarily unavailable. Please try again shortly.' }, { status: 502 });
  }
}
