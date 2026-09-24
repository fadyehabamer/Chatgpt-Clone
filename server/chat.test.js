import { test, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import vercelFunction from '../api/chat.js';
import {
  createChatFetchHandler,
  DEFAULT_MODEL,
  INSTRUCTIONS,
  MAX_BODY_BYTES,
} from './chat.js';

const URL = 'https://example.test/api/chat';
const validBody = { messages: [{ role: 'user', content: 'Hello' }] };

function post(body, headers = { 'content-type': 'application/json' }) {
  return new Request(URL, {
    method: 'POST',
    headers,
    body: typeof body === 'string' ? body : JSON.stringify(body),
  });
}

// Fake OpenAI client: records calls and returns a canned reply (no network).
function mockClient(result = { output_text: 'Hi there!' }) {
  const calls = [];
  const client = {
    responses: {
      async create(params) {
        calls.push(params);
        if (result instanceof Error) throw result;
        return result;
      },
    },
  };
  return { calls, createClient: () => client };
}

let savedEnv;
beforeEach(() => {
  savedEnv = { key: process.env.OPENAI_API_KEY, model: process.env.OPENAI_MODEL };
  process.env.OPENAI_API_KEY = 'test-key';
  delete process.env.OPENAI_MODEL;
});
afterEach(() => {
  for (const [name, value] of [
    ['OPENAI_API_KEY', savedEnv.key],
    ['OPENAI_MODEL', savedEnv.model],
  ]) {
    if (value === undefined) delete process.env[name];
    else process.env[name] = value;
  }
});

test('api/chat.js exports a Web-standard fetch handler', () => {
  assert.equal(typeof vercelFunction.fetch, 'function');
});

test('valid request returns the model reply', async () => {
  const { calls, createClient } = mockClient();
  const handler = createChatFetchHandler({ createClient });

  const res = await handler(post(validBody));

  assert.equal(res.status, 200);
  assert.match(res.headers.get('content-type'), /application\/json/);
  assert.deepEqual(await res.json(), { reply: 'Hi there!' });
  assert.deepEqual(calls, [
    { model: DEFAULT_MODEL, instructions: INSTRUCTIONS, input: validBody.messages },
  ]);
});

test('OPENAI_MODEL overrides the default model', async () => {
  process.env.OPENAI_MODEL = 'custom-model';
  const { calls, createClient } = mockClient();
  await createChatFetchHandler({ createClient })(post(validBody));
  assert.equal(calls[0].model, 'custom-model');
});

test('invalid payload returns 400 JSON without calling OpenAI', async () => {
  const { calls, createClient } = mockClient();
  const handler = createChatFetchHandler({ createClient });

  const res = await handler(post({ messages: [{ role: 'system', content: 'x' }] }));

  assert.equal(res.status, 400);
  assert.ok((await res.json()).error);
  assert.equal(calls.length, 0);
});

test('malformed JSON returns 400 JSON', async () => {
  const res = await vercelFunction.fetch(post('{not json'));
  assert.equal(res.status, 400);
  assert.deepEqual(await res.json(), { error: 'Invalid request body.' });
});

test('oversized body returns 413 JSON', async () => {
  const big = JSON.stringify({ messages: [{ role: 'user', content: 'x'.repeat(MAX_BODY_BYTES) }] });
  const res = await vercelFunction.fetch(post(big));
  assert.equal(res.status, 413);
  assert.ok((await res.json()).error);
});

test('missing OPENAI_API_KEY returns 500 JSON error', async () => {
  delete process.env.OPENAI_API_KEY;
  const res = await vercelFunction.fetch(post(validBody));
  assert.equal(res.status, 500);
  const body = await res.json();
  assert.ok(body.error);
  assert.doesNotMatch(body.error, /OPENAI_API_KEY/);
});

test('non-POST methods return 405 with an Allow header', async () => {
  for (const method of ['GET', 'PUT', 'DELETE']) {
    const res = await vercelFunction.fetch(new Request(URL, { method }));
    assert.equal(res.status, 405);
    assert.equal(res.headers.get('allow'), 'POST');
    assert.ok((await res.json()).error);
  }
});

test('upstream failures map to a friendly 502', async () => {
  const { createClient } = mockClient(new Error('boom'));
  const res = await createChatFetchHandler({ createClient })(post(validBody));
  assert.equal(res.status, 502);
  assert.deepEqual(await res.json(), {
    error: 'The AI service could not answer right now. Please try again.',
  });
});
