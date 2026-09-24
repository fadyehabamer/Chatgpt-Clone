import OpenAI from 'openai';
import { validateChatRequest } from './validate.js';

export const DEFAULT_MODEL = 'gpt-5.5';
export const MAX_BODY_BYTES = 100 * 1024;
export const INSTRUCTIONS =
  "Explain things like you're talking to a software professional with 2 years of experience.";

const INVALID_BODY = 'Invalid request body.';

// Reuse one client per key so warm serverless instances keep their connections.
const clients = new Map();
function defaultCreateClient(apiKey) {
  if (!clients.has(apiKey)) clients.set(apiKey, new OpenAI({ apiKey }));
  return clients.get(apiKey);
}

/**
 * Shared /api/chat logic for the Express server and the Vercel Function.
 * Takes an already-parsed JSON body and returns { status, body } for the caller
 * to send. Configuration is read from the environment on every call unless
 * overridden (tests inject `createClient` to avoid real network calls).
 */
export async function handleChatRequest(payload, options = {}) {
  const {
    apiKey = process.env.OPENAI_API_KEY,
    model = process.env.OPENAI_MODEL || DEFAULT_MODEL,
    createClient = defaultCreateClient,
  } = options;

  if (!apiKey) {
    console.error('OPENAI_API_KEY is not set.');
    return {
      status: 500,
      body: { error: 'The server is not configured to answer right now.' },
    };
  }

  const { messages, error } = validateChatRequest(payload);
  if (error) {
    return { status: 400, body: { error } };
  }

  try {
    const response = await createClient(apiKey).responses.create({
      model,
      instructions: INSTRUCTIONS,
      input: messages,
    });
    return { status: 200, body: { reply: response.output_text } };
  } catch (err) {
    const status = err instanceof OpenAI.APIError ? err.status : undefined;
    console.error('OpenAI request failed:', status ?? '', err.message);
    const message =
      status === 429
        ? 'The AI service is rate limiting requests. Please try again shortly.'
        : 'The AI service could not answer right now. Please try again.';
    return { status: 502, body: { error: message } };
  }
}

/**
 * Builds a Web-standard fetch handler (Request -> Response), the format Vercel
 * Functions use for files in /api.
 */
export function createChatFetchHandler(options = {}) {
  return async function fetch(request) {
    if (request.method !== 'POST') {
      return Response.json(
        { error: 'Method not allowed.' },
        { status: 405, headers: { Allow: 'POST' } }
      );
    }

    let payload;
    try {
      const text = await request.text();
      if (Buffer.byteLength(text) > MAX_BODY_BYTES) {
        return Response.json({ error: INVALID_BODY }, { status: 413 });
      }
      payload = JSON.parse(text);
    } catch {
      return Response.json({ error: INVALID_BODY }, { status: 400 });
    }

    const { status, body } = await handleChatRequest(payload, options);
    return Response.json(body, { status });
  };
}
