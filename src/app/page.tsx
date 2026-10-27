'use client';

import { FormEvent, useEffect, useRef, useState } from 'react';

type Message = { id: string; role: 'user' | 'assistant'; content: string };

export default function Chat() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const end = useRef<HTMLDivElement>(null);
  const sending = useRef(false);

  useEffect(() => { end.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  async function send(event: FormEvent) {
    event.preventDefault();
    if (!input.trim() || sending.current) return;
    sending.current = true;
    const question = input.trim();
    const user: Message = { id: crypto.randomUUID(), role: 'user', content: question };
    const history = [...messages, user];
    const replyId = crypto.randomUUID();
    setMessages(history);
    setInput('');
    setError('');
    setBusy(true);
    let received = false;
    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: history.map(({ role, content }) => ({ role, content })) }),
      });
      if (!response.ok) {
        const data = await response.json().catch(() => null);
        throw new Error(data?.error || 'The assistant could not reply. Please try again.');
      }
      if (!response.body) throw new Error('No reply arrived. Please try again.');
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let content = '';
      while (true) {
        const { done, value } = await reader.read();
        content += decoder.decode(value, { stream: !done });
        if (content) {
          received = true;
          const reply: Message = { id: replyId, role: 'assistant', content };
          setMessages([...history, reply]);
        }
        if (done) break;
      }
      if (!received) throw new Error('The assistant returned an empty reply. Please try again.');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Connection interrupted. Please try again.');
      // Restore the question for a retry without duplicating it in the conversation.
      if (!received) { setMessages(messages); setInput(question); }
    } finally {
      sending.current = false;
      setBusy(false);
    }
  }

  return (
    <main className="chat">
      <header>
        <div className="brand-mark" aria-hidden="true">a</div>
        <div><h1>artiint</h1><p>a free ai for you</p></div>
      </header>
      <section className="messages" aria-label="Conversation" aria-busy={busy}>
        {messages.length === 0 && <div className="welcome">
          <span className="eyebrow">YOUR NEXT IDEA STARTS HERE</span>
          <h2>What’s on<br />your mind?</h2>
          <p>Ask a question, untangle an idea, or start with something you’re curious about.</p>
        </div>}
        {messages.map(message => <article key={message.id} className={`message ${message.role}`}>
          <span className="speaker">{message.role === 'user' ? 'You' : 'artiint'}</span>
          <div>{message.content}</div>
        </article>)}
        {busy && <p className="thinking" role="status">Working on your reply…</p>}
        <div ref={end} />
      </section>
      <footer>
        {error && <p className="error" role="alert">{error}</p>}
        <form onSubmit={send}>
          <label className="sr-only" htmlFor="message">Your message</label>
          <input id="message" value={input} maxLength={16000} placeholder="Type a message…"
            onChange={event => setInput(event.target.value)} disabled={busy} autoComplete="off" />
          <button type="submit" disabled={busy || !input.trim()}>{busy ? 'Thinking…' : 'Send'}<span aria-hidden="true"> ↗</span></button>
        </form>
        <p className="note">AI can make mistakes. Check important information.</p>
      </footer>
    </main>
  );
}
