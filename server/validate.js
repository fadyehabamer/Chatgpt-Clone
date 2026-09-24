export const MAX_MESSAGES = 50;
export const MAX_MESSAGE_LENGTH = 8000;

const ALLOWED_ROLES = new Set(['user', 'assistant']);

/**
 * Validates the chat history sent by the browser.
 * Returns { messages } on success or { error } with a user-facing reason.
 */
export function validateChatRequest(body) {
  const messages = body?.messages;

  if (!Array.isArray(messages) || messages.length === 0) {
    return { error: '`messages` must be a non-empty array.' };
  }
  if (messages.length > MAX_MESSAGES) {
    return { error: `At most ${MAX_MESSAGES} messages can be sent per request.` };
  }

  const cleaned = [];
  for (const message of messages) {
    if (!message || typeof message !== 'object') {
      return { error: 'Each message must be an object.' };
    }
    const { role, content } = message;
    if (!ALLOWED_ROLES.has(role)) {
      return { error: 'Message role must be "user" or "assistant".' };
    }
    if (typeof content !== 'string' || content.trim() === '') {
      return { error: 'Message content must be a non-empty string.' };
    }
    if (content.length > MAX_MESSAGE_LENGTH) {
      return {
        error: `Messages must be at most ${MAX_MESSAGE_LENGTH} characters.`,
      };
    }
    cleaned.push({ role, content });
  }

  if (cleaned[cleaned.length - 1].role !== 'user') {
    return { error: 'The last message must come from the user.' };
  }

  return { messages: cleaned };
}
