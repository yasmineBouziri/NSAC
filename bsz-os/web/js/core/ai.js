import { api } from './api.js';
// Plug a local model in with: BZG.ai.setBackend(async (messages) => 'reply text')
// messages: [{role:'user'|'assistant', content}]. Default backend calls POST /api/ai/chat if an engine provides it.
window.BZG = window.BZG || {};
window.BZG.ai = {
  backend: async (msgs, options = {}) => {
    try {
      if (!options.stream) {
        const result = await api('ai/chat', {
          method: 'POST',
          body: { messages: msgs, conversation_id: options.conversationId || undefined },
        });
        if (options.onConversation) options.onConversation(result.conversation_id);
        return result.reply;
      }
      const r = await fetch('/api/ai/chat/stream', {
        method: 'POST', credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: msgs, conversation_id: options.conversationId || undefined }),
      });
      if (!r.ok) {
        let detail = r.statusText;
        try { detail = (await r.json()).error || detail; } catch {}
        const error = new Error(detail); error.status = r.status; throw error;
      }
      const reader = r.body.getReader(), decoder = new TextDecoder();
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
    }
    catch (e) {
      if (e.status === 404) return 'No local model attached. Register one with BZG.ai.setBackend(async (messages) => reply).';
      throw e;
    }
  },
  warmup() { return api('ai/warmup', { method: 'POST' }); },
  setBackend(fn) { this.backend = fn; },
};
