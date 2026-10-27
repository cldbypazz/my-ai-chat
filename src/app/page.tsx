'use client';

import { FormEvent, useEffect, useRef, useState } from 'react';
import AssistantMessage from '../components/assistant-message';
import type { ChatMessage, ChatSummary } from '../lib/chat-history';

type Message = ChatMessage;

export default function Chat() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const viewport = useRef<HTMLElement>(null);
  const historyToggle = useRef<HTMLButtonElement>(null);
  const historyPanel = useRef<HTMLElement>(null);
  const followBottom = useRef(true);
  const sending = useRef(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarPreferenceLoaded, setSidebarPreferenceLoaded] = useState(false);
  const [history, setHistory] = useState<ChatSummary[]>([]);
  const [activeId, setActiveId] = useState('');
  const [historyLoading, setHistoryLoading] = useState(true);
  const [historyError, setHistoryError] = useState('');
  const [saveError, setSaveError] = useState('');
  const [saving, setSaving] = useState(false);
  const [showLatest, setShowLatest] = useState(false);

  useEffect(() => {
    try {
      setSidebarOpen(document.cookie.split('; ').includes('artiint_history_open=true'));
    } catch {
      // The sidebar still works when browser storage is blocked.
    }
    setSidebarPreferenceLoaded(true);
  }, []);

  useEffect(() => {
    if (!sidebarPreferenceLoaded) return;
    try {
      document.cookie = `artiint_history_open=${sidebarOpen}; Path=/; Max-Age=31536000; SameSite=Lax${location.protocol === 'https:' ? '; Secure' : ''}`;
    } catch {
      // Keep the current toggle usable without persistence.
    }
  }, [sidebarOpen, sidebarPreferenceLoaded]);

  useEffect(() => {
    if (!sidebarOpen) return;
    historyPanel.current?.querySelector('button')?.focus({ preventScroll: true });
    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setSidebarOpen(false);
        historyToggle.current?.focus({ preventScroll: true });
      }
    }
    window.addEventListener('keydown', closeOnEscape);
    return () => window.removeEventListener('keydown', closeOnEscape);
  }, [sidebarOpen]);

  function scrollToLatest() {
    followBottom.current = true;
    const element = viewport.current;
    if (element) element.scrollTop = element.scrollHeight;
    setShowLatest(false);
  }

  useEffect(() => {
    // Scroll only this element; never move the document or an ancestor.
    const element = viewport.current;
    if (element && followBottom.current) element.scrollTop = element.scrollHeight;
  }, [messages]);

  useEffect(() => {
    const controller = new AbortController();
    async function restoreHistory() {
      try {
        const response = await fetch('/api/chats', { signal: controller.signal, cache: 'no-store' });
        if (!response.ok) throw new Error('Could not load saved chats.');
        const entries: ChatSummary[] = await response.json();
        if (controller.signal.aborted) return;
        setHistory(entries);
        setActiveId(crypto.randomUUID());
      } catch {
        if (!controller.signal.aborted) {
          setActiveId(crypto.randomUUID());
          setHistoryError('Saved chats could not be loaded. Reopen history to retry.');
        }
      } finally {
        if (!controller.signal.aborted) setHistoryLoading(false);
      }
    }
    void restoreHistory();
    return () => controller.abort();
  }, []);

  async function toggleHistory() {
    setSidebarOpen(open => !open);
    if (!sidebarOpen && historyError) {
      try {
        const response = await fetch('/api/chats', { cache: 'no-store' });
        if (!response.ok) throw new Error();
        setHistory(await response.json());
        setHistoryError('');
      } catch { setHistoryError('Saved chats are unavailable. Close and reopen history to retry.'); }
    }
  }

  async function saveChat(chatId: string, items: Message[]) {
    setSaving(true);
    try {
      const response = await fetch('/api/chats', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: chatId, messages: items }),
      });
      if (!response.ok) throw new Error();
      const summary: ChatSummary = await response.json();
      setHistory(previous => [summary, ...previous.filter(chat => chat.id !== chatId)].slice(0, 100));
      setSaveError('');
    } catch { setSaveError('Chat not saved. Retry before starting or opening another chat.'); }
    finally { setSaving(false); }
  }

  function newChat() {
    if (sending.current || saving || historyLoading || saveError) return;
    setActiveId(crypto.randomUUID());
    setMessages([]);
    setInput('');
    setError('');
    followBottom.current = true;
    setShowLatest(false);
  }

  async function openChat(id: string) {
    if (sending.current || saving || historyLoading || saveError) return;
    setHistoryLoading(true);
    try {
      const response = await fetch(`/api/chats?id=${encodeURIComponent(id)}`, { cache: 'no-store' });
      if (!response.ok) throw new Error();
      const chat = await response.json();
      followBottom.current = true;
      setMessages(chat.messages);
      setActiveId(id);
      setInput('');
      setError('');
      setHistoryError('');
      setShowLatest(false);
      setSidebarOpen(false);
    } catch { setHistoryError('This chat could not be opened. Please try again.'); }
    finally { setHistoryLoading(false); }
  }

  async function send(event: FormEvent) {
    event.preventDefault();
    if (!input.trim() || sending.current || saving || historyLoading || !activeId || saveError) return;
    sending.current = true;
    const question = input.trim();
    const user: Message = { id: crypto.randomUUID(), role: 'user', content: question };
    const history = [...messages, user];
    const replyId = crypto.randomUUID();
    setMessages(history);
    setInput('');
    setError('');
    setBusy(true);
    followBottom.current = true;
    setShowLatest(false);
    let received = false;
    let finalMessages = messages;
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
          finalMessages = [...history, reply];
          setMessages(finalMessages);
        }
        if (done) break;
      }
      if (!received) throw new Error('The assistant returned an empty reply. Please try again.');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Connection interrupted. Please try again.');
      // Restore the question for a retry without duplicating it in the conversation.
      if (!received) { setMessages(messages); setInput(question); }
    } finally {
      if (finalMessages.length) await saveChat(activeId, finalMessages);
      sending.current = false;
      setBusy(false);
    }
  }

  return (
    <div className={`chat-shell ${sidebarOpen ? 'history-open' : ''}`}>
      {sidebarOpen && <button className="history-scrim" aria-label="Close chat history" onClick={() => setSidebarOpen(false)} />}
      <aside ref={historyPanel} id="chat-history" className="chat-history" aria-label="Chat history" hidden={!sidebarOpen}>
        <div className="history-heading"><h2>Chats</h2><button type="button" className="icon-button" aria-label="Close chat history" onClick={() => setSidebarOpen(false)}>×</button></div>
        <p className="history-note">Chats are saved online for this browser. Clearing cookies clears your chat history.</p>
        {historyLoading && <p className="history-note" role="status">Loading chats…</p>}
        {historyError && <p className="error" role="status">{historyError}</p>}
        {!historyLoading && history.length === 0 && !historyError && <p className="history-note">Your conversations appear here after a reply.</p>}
        <nav aria-label="Previous chats">{history.map(chat => <button type="button" key={chat.id}
          className={`history-chat ${activeId === chat.id ? 'active' : ''}`} aria-current={activeId === chat.id ? 'page' : undefined}
          disabled={busy || saving || historyLoading || Boolean(saveError)} onClick={() => void openChat(chat.id)}>
          <span>{chat.title}</span><small>{new Date(chat.updatedAt).toLocaleDateString()}</small>
        </button>)}</nav>
      </aside>
    <main className="chat">
      <header className="chat-header">
        <button ref={historyToggle} type="button" className="icon-button history-toggle" onClick={() => void toggleHistory()}
          aria-label={sidebarOpen ? 'Hide chat history' : 'Show chat history'} aria-expanded={sidebarOpen} aria-controls="chat-history">
          <svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true"><rect x="3" y="4" width="18" height="16" rx="3" /><path d="M9 4v16M13 9h4M13 13h4" /></svg>
        </button>
        <div className="chat-title"><h1>artiint</h1><p>free artificial intelligence</p></div>
        <button type="button" className="new-chat" onClick={newChat} disabled={busy || saving || historyLoading || Boolean(saveError)}>New chat <span aria-hidden="true">+</span></button>
      </header>
      <section ref={viewport} className="messages" aria-label="Conversation" aria-busy={busy || historyLoading} onScroll={() => {
        const element = viewport.current;
        if (!element) return;
        const atBottom = element.scrollHeight - element.scrollTop - element.clientHeight < 48;
        followBottom.current = atBottom;
        setShowLatest(!atBottom);
      }}>
        {historyLoading && <p className="thinking" role="status">Loading chat…</p>}
        {messages.map(message => <article key={message.id} className={`message ${message.role}`}>
          <span className="speaker">{message.role === 'user' ? 'You' : 'artiint'}</span>
          {message.role === 'assistant'
            ? <AssistantMessage content={message.content} streaming={busy && message.id === messages[messages.length - 1]?.id} />
            : <div>{message.content}</div>}
        </article>)}
        {busy && <p className="thinking" role="status">Working on your reply…</p>}
      </section>
      <footer>
        {showLatest && <button type="button" className="latest-button" onClick={scrollToLatest}>Latest messages ↓</button>}
        {saveError && <div className="save-notice" role="status"><span>{saveError}</span><button type="button" disabled={saving} onClick={() => void saveChat(activeId, messages)}>{saving ? 'Saving…' : 'Retry save'}</button></div>}
        {error && <p className="error" role="alert">{error}</p>}
        <form onSubmit={send}>
          <label className="sr-only" htmlFor="message">Your message</label>
          <input id="message" value={input} maxLength={16000} placeholder="Type a message…"
            onChange={event => setInput(event.target.value)} disabled={busy || saving || historyLoading || Boolean(saveError)} autoComplete="off" />
          <button type="submit" disabled={busy || saving || historyLoading || Boolean(saveError) || !input.trim()}>{busy ? 'Thinking…' : 'Send'}<span aria-hidden="true"> ↗</span></button>
        </form>
        <p className="note">AI can make mistakes. Check important information.</p>
      </footer>
    </main>
    </div>
  );
}
