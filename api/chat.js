// Vercel Function for POST /api/chat (Node.js runtime, Web-standard handler).
// The logic lives in server/chat.js and is shared with the Express server used
// for local development and `npm start`. OPENAI_API_KEY is read server-side only.
import { createChatFetchHandler } from '../server/chat.js';

export default { fetch: createChatFetchHandler() };
