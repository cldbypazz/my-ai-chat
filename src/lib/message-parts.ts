export type MessagePart =
  | { type: 'text'; content: string }
  | { type: 'artifact'; language: string; content: string; complete: boolean };

// Parse line fences rather than inline backticks. An unfinished fence stays open
// while a response streams, so its content never flashes back into normal chat.
export function splitMessage(content: string): MessagePart[] {
  const parts: MessagePart[] = [];
  const opening = /^ {0,3}(`{3,}|~{3,})([^\r\n]*)\r?\n/gm;
  let cursor = 0;
  let match: RegExpExecArray | null;
  while ((match = opening.exec(content))) {
    if (match.index > cursor) parts.push({ type: 'text', content: content.slice(cursor, match.index) });
    const start = opening.lastIndex;
    const fence = match[1];
    const closing = new RegExp(`^ {0,3}${fence[0]}{${fence.length},}[ \\t]*(?:\\r?\\n|$)`, 'gm');
    closing.lastIndex = start;
    const end = closing.exec(content);
    const raw = content.slice(start, end ? end.index : content.length);
    parts.push({
      type: 'artifact',
      language: match[2].trim().split(/\s+/)[0].toLowerCase() || 'text',
      content: end ? raw.replace(/\r?\n$/, '') : raw,
      complete: Boolean(end),
    });
    cursor = end ? closing.lastIndex : content.length;
    opening.lastIndex = cursor;
    if (!end) break;
  }
  if (cursor < content.length) parts.push({ type: 'text', content: content.slice(cursor) });
  return parts;
}
