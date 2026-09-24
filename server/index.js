import path from 'node:path';
import { fileURLToPath } from 'node:url';
import express from 'express';
import { handleChatRequest, MAX_BODY_BYTES } from './chat.js';

// Load variables from a local .env file when present (Node 22+).
try {
  process.loadEnvFile();
} catch (err) {
  if (err.code !== 'ENOENT') throw err;
}

const PORT = Number(process.env.PORT) || 3001;

if (!process.env.OPENAI_API_KEY) {
  console.error(
    'OPENAI_API_KEY is not set. Copy .env.example to .env and add your key.'
  );
  process.exit(1);
}

// The key stays on the server; the browser only ever talks to /api/chat.
// Request handling is shared with the Vercel Function in api/chat.js.
const app = express();
app.disable('x-powered-by');
app.use(express.json({ limit: MAX_BODY_BYTES }));

app.post('/api/chat', async (req, res) => {
  const { status, body } = await handleChatRequest(req.body);
  res.status(status).json(body);
});

app.all('/api/chat', (req, res) => {
  res.set('Allow', 'POST').status(405).json({ error: 'Method not allowed.' });
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
