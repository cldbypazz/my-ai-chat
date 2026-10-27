import { createHash, randomBytes } from 'node:crypto';
import { cookies } from 'next/headers';
import { and, desc, eq } from 'drizzle-orm';
import { db } from '../../../../db';
import { chats } from '../../../../db/schema';
import { chatTitle, isChatMessages } from '../../../lib/chat-history';

export const runtime = 'nodejs';
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const headers = { 'Cache-Control': 'private, no-store' };

function publicOrigin(request: Request) {
  const protocol = request.headers.get('x-forwarded-proto')?.split(',')[0].trim() || new URL(request.url).protocol.replace(':', '');
  const host = request.headers.get('x-forwarded-host')?.split(',')[0].trim() || request.headers.get('host') || new URL(request.url).host;
  return `${protocol}://${host}`;
}

async function browserId(request: Request) {
  const jar = await cookies();
  let value = jar.get('artiint_browser')?.value;
  if (!value || !/^[a-f0-9]{64}$/.test(value)) value = randomBytes(32).toString('hex');
  jar.set('artiint_browser', value, { httpOnly: true, sameSite: 'strict', secure: publicOrigin(request).startsWith('https:'), path: '/', maxAge: 60 * 60 * 24 * 365 });
  return createHash('sha256').update(value).digest('hex');
}

export async function GET(request: Request) {
  try {
    const browser = await browserId(request);
    const id = new URL(request.url).searchParams.get('id');
    if (id) {
      if (!uuid.test(id)) return Response.json({ error: 'Invalid chat.' }, { status: 400, headers });
      const [chat] = await db.select({ id: chats.id, messages: chats.messages }).from(chats).where(and(eq(chats.browser, browser), eq(chats.id, id)));
      return chat ? Response.json(chat, { headers }) : Response.json({ error: 'Chat not found.' }, { status: 404, headers });
    }
    const history = await db.select({ id: chats.id, title: chats.title, updatedAt: chats.updatedAt }).from(chats).where(eq(chats.browser, browser)).orderBy(desc(chats.updatedAt)).limit(100);
    return Response.json(history, { headers });
  } catch {
    return Response.json({ error: 'Chat history is unavailable. Please try again.' }, { status: 503, headers });
  }
}

export async function POST(request: Request) {
  if (request.headers.get('origin') !== publicOrigin(request)) return Response.json({ error: 'Invalid request origin.' }, { status: 403, headers });
  let body;
  try { body = await request.json(); } catch { return Response.json({ error: 'Invalid chat.' }, { status: 400, headers }); }
  if (!body || typeof body.id !== 'string' || !uuid.test(body.id) || !isChatMessages(body.messages)) return Response.json({ error: 'This chat cannot be saved. Maximum 100 messages and 16,000 characters per message.' }, { status: 400, headers });
  try {
    const browser = await browserId(request);
    const title = chatTitle(body.messages);
    const updatedAt = new Date();
    await db.insert(chats).values({ browser, id: body.id, title, messages: body.messages, updatedAt }).onConflictDoUpdate({ target: [chats.browser, chats.id], set: { title, messages: body.messages, updatedAt } });
    return Response.json({ id: body.id, title, updatedAt }, { headers });
  } catch {
    return Response.json({ error: 'This chat has not been saved. Please retry before leaving.' }, { status: 503, headers });
  }
}
