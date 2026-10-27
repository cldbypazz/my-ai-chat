import { test } from 'node:test';
import assert from 'node:assert/strict';
import { splitMessage } from '../src/lib/message-parts.ts';

test('preserves code indentation, blank lines, and separate explanation', () => {
  assert.deepEqual(splitMessage('Here is your script:\n```python\ndef hello():\n    print("hi")\n\nhello()\n```\nRun it with Python.'), [
    { type: 'text', content: 'Here is your script:\n' },
    { type: 'artifact', language: 'python', content: 'def hello():\n    print("hi")\n\nhello()', complete: true },
    { type: 'text', content: 'Run it with Python.' },
  ]);
});

test('handles essays and multiple independent copy panels', () => {
  const parts = splitMessage('```text\nTitle\n\nFirst paragraph.\n\nSecond paragraph.\n```\n```js\nconsole.log(1);\n```');
  assert.equal(parts.length, 2);
  assert.equal(parts[0].content, 'Title\n\nFirst paragraph.\n\nSecond paragraph.');
  assert.equal(parts[1].language, 'js');
});

test('keeps incomplete streamed code in its panel', () => {
  assert.deepEqual(splitMessage('```python\nif True:\n    print('), [
    { type: 'artifact', language: 'python', content: 'if True:\n    print(', complete: false },
  ]);
});

test('supports nested fences, CRLF, and tilde fences', () => {
  const nested = splitMessage('````text\n```js\nhi\n```\n````');
  assert.equal(nested[0].content, '```js\nhi\n```');
  assert.equal(nested[0].complete, true);
  assert.deepEqual(splitMessage('~~~python\r\n    x = 1\r\n~~~'), [
    { type: 'artifact', language: 'python', content: '    x = 1', complete: true },
  ]);
});

test('leaves conversation, inline code, and HTML as ordinary text', () => {
  const content = 'Use `hello()` here.\n<script>alert(1)</script>';
  assert.deepEqual(splitMessage(content), [{ type: 'text', content }]);
});
