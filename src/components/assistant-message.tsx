'use client';

import { useEffect, useRef, useState } from 'react';
import { splitMessage } from '../lib/message-parts';

function CopyPanel({ content, language, writing }: { content: string; language: string; writing: boolean }) {
  const [state, setState] = useState<'idle' | 'copied' | 'failed'>('idle');
  const text = useRef<HTMLPreElement>(null);
  const prose = ['text', 'plain', 'plaintext', 'markdown', 'md'].includes(language);

  useEffect(() => {
    if (state === 'idle') return;
    const timer = setTimeout(() => setState('idle'), 2500);
    return () => clearTimeout(timer);
  }, [state]);

  async function copy() {
    try {
      await navigator.clipboard.writeText(content);
      setState('copied');
    } catch {
      // Leave the exact text selected for browsers that block clipboard access.
      if (text.current) {
        const range = document.createRange();
        range.selectNodeContents(text.current);
        const selection = window.getSelection();
        selection?.removeAllRanges();
        selection?.addRange(range);
      }
      setState('failed');
    }
  }

  return <section className={`copy-panel ${prose ? 'prose-panel' : 'code-panel'}`} aria-label={prose ? 'Text to copy' : `${language} code`}>
    <div className="panel-toolbar">
      <span className="panel-label">{prose ? 'Text' : language}{writing && <span className="panel-writing"> · Writing…</span>}</span>
      <button type="button" className="copy-button" onClick={copy} disabled={writing || !content}
        aria-label={prose ? 'Copy text' : `Copy ${language} code`}>
        {state === 'copied' ? 'Copied!' : 'Copy'}
      </button>
      <span className="sr-only" role="status">{state === 'copied' ? 'Copied to clipboard.' : ''}</span>
    </div>
    <pre ref={text} tabIndex={0}>{prose ? content : <code>{content}</code>}</pre>
    {state === 'failed' && <p className="copy-feedback" role="status">Text selected. Press Ctrl+C or ⌘C to copy, or touch and hold on mobile.</p>}
  </section>;
}

export default function AssistantMessage({ content, streaming }: { content: string; streaming: boolean }) {
  return <div className="assistant-content">
    {splitMessage(content).map((part, index) => part.type === 'text'
      ? <div className="reply-text" key={index}>{part.content}</div>
      : <CopyPanel key={index} content={part.content} language={part.language} writing={streaming && !part.complete} />)}
  </div>;
}
