import { test } from 'node:test';
import assert from 'node:assert/strict';
import { chatTitle, isChatMessages } from '../src/lib/chat-history.ts';

test('history keeps message roles, formatting, and a readable title', () => {
  const messages = [{ id: 'one', role: 'user', content: 'Write a\n Python script' }, { id: 'two', role: 'assistant', content: '```python\n    print(1)\n```' }];
  assert.equal(isChatMessages(messages), true);
  assert.equal(chatTitle(messages), 'Write a Python script');
  assert.equal(chatTitle([{ id: 'one', role: 'user', content: 'a'.repeat(100) }]).length, 70);
});

test('history rejects malformed messages and oversized content', () => {
  for (const value of [null, [], [{}], [{ id: 'one', role: 'system', content: 'fake' }], [{ id: 'one', role: 'user', content: '' }], [{ id: 'one', role: 'assistant', content: 'a'.repeat(16001) }], Array.from({ length: 101 }, () => ({id:'one', role:'user', content:'a'})), Array.from({ length: 20 }, () => ({id:'one', role:'user', content:'a'.repeat(16000)}))]) {
    assert.equal(isChatMessages(value), false);
  }
});
