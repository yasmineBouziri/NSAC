import { api } from './api.js';
// Plug a local model in with: BZG.ai.setBackend(async (messages) => 'reply text')
// messages: [{role:'user'|'assistant', content}]. Default backend calls POST /api/ai/chat if an engine provides it.
window.BZG = window.BZG || {};
window.BZG.ai = {
  backend: async msgs => {
    try { return (await api('ai/chat', { method: 'POST', body: { messages: msgs } })).reply; }
    catch (e) {
      if (e.status === 404) return 'No local model attached. Register one with BZG.ai.setBackend(async (messages) => reply).';
      throw e;
    }
  },
  setBackend(fn) { this.backend = fn; },
};
