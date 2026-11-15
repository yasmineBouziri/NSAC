import { api } from './api.js';
// Plug a local model in with: BZG.ai.setBackend(async (messages) => 'reply text')
// messages: [{role:'user'|'assistant', content}]. Default backend calls POST /api/ai/chat if an engine provides it.
window.BZG = window.BZG || {};
window.BZG.ai = {
  backend: async (msgs, options = {}) => {
    const conversationId = options.newConversation ? undefined : options.conversationId;
    const requestBody = id => {
      const body = { messages: msgs, conversation_id: id || undefined };
      if (options.healthContext) body.health_context = options.healthContext;
      return body;
    };
    const isMissingConversation = error => error.status === 404 && error.message === 'Conversation not found';
    if (!options.stream) {
      let result;
      try {
        result = await api('ai/chat', {
          method: 'POST',
          body: requestBody(conversationId),
        });
      } catch (error) {
        if (!conversationId || !isMissingConversation(error)) throw error;
        result = await api('ai/chat', { method: 'POST', body: requestBody(undefined) });
      }
      if (options.onConversation) options.onConversation(result.conversation_id);
      return result.reply;
    }
    const requestStream = async id => {
      const response = await fetch('/api/ai/chat/stream', {
        method: 'POST', credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody(id)),
      });
      if (!response.ok) {
        let detail = response.statusText;
        try { detail = (await response.json()).error || detail; } catch {}
        const error = new Error(detail); error.status = response.status; throw error;
      }
      return response;
    }
    let response;
    try {
      response = await requestStream(conversationId);
    } catch (error) {
      if (!conversationId || !isMissingConversation(error)) throw error;
      response = await requestStream(undefined);
    }
    const reader = response.body.getReader(), decoder = new TextDecoder();
    let buffer = '', reply = '';
    const consume = line => {
      if (!line) return;
      const item = JSON.parse(line);
      if (item.type === 'token') {
        reply += item.text;
        if (options.onToken) options.onToken(reply);
      } else if (item.type === 'done') {
        reply = item.reply;
        if (options.onConversation) options.onConversation(item.conversation_id);
      } else if (item.type === 'error') throw new Error(item.error);
    };
    while (true) {
      const part = await reader.read();
      buffer += decoder.decode(part.value || new Uint8Array(), { stream: !part.done });
      const lines = buffer.split('\n'); buffer = lines.pop();
      lines.forEach(consume);
      if (part.done) break;
    }
    if (buffer.trim()) consume(buffer);
    return reply;
  },
  warmup() { return api('ai/warmup', { method: 'POST' }); },
  setBackend(fn) { this.backend = fn; },
};
