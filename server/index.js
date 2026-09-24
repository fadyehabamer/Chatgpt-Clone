import path from 'node:path';
import { fileURLToPath } from 'node:url';
import express from 'express';
import OpenAI from 'openai';
import { validateChatRequest } from './validate.js';

// Load variables from a local .env file when present (Node 22+).
try {
  process.loadEnvFile();
} catch (err) {
  if (err.code !== 'ENOENT') throw err;
}

const PORT = Number(process.env.PORT) || 3001;
const MODEL = process.env.OPENAI_MODEL || 'gpt-5.5';
const INSTRUCTIONS =
  "Explain things like you're talking to a software professional with 2 years of experience.";

if (!process.env.OPENAI_API_KEY) {
  console.error(
    'OPENAI_API_KEY is not set. Copy .env.example to .env and add your key.'
  );
  process.exit(1);
}

// The key stays on the server; the browser only ever talks to /api/chat.
const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const app = express();
app.disable('x-powered-by');
app.use(express.json({ limit: '100kb' }));

app.post('/api/chat', async (req, res) => {
  const { messages, error } = validateChatRequest(req.body);
  if (error) {
    return res.status(400).json({ error });
  }

  try {
    const response = await client.responses.create({
      model: MODEL,
      instructions: INSTRUCTIONS,
      input: messages,
    });
    res.json({ reply: response.output_text });
  } catch (err) {
    const status = err instanceof OpenAI.APIError ? err.status : undefined;
    console.error('OpenAI request failed:', status ?? '', err.message);
    const message =
      status === 429
        ? 'The AI service is rate limiting requests. Please try again shortly.'
        : 'The AI service could not answer right now. Please try again.';
    res.status(502).json({ error: message });
  }
});

// In production, serve the Vite build from the same origin.
const distDir = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '../dist'
);
app.use(express.static(distDir));

// Malformed or oversized JSON bodies: answer with a short JSON error instead of
// Express's default HTML page with a stack trace.
app.use((err, req, res, next) => {
  if (err.type === 'entity.parse.failed' || err.type === 'entity.too.large') {
    return res.status(err.status).json({ error: 'Invalid request body.' });
  }
  next(err);
});

app.listen(PORT, () => {
  console.log(`Server listening on http://localhost:${PORT}`);
});
