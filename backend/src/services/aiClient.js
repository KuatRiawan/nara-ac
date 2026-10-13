const config = require('../config');
const { E } = require('../errors');

async function call(path, { method = 'POST', body, timeoutMs = config.aiTimeoutMs } = {}) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  let res;
  try {
    const headers = { 'content-type': 'application/json' };
    if (config.aiApiKey) {
      headers['X-AI-API-Key'] = config.aiApiKey;
    }
    res = await fetch(`${config.aiServiceUrl}${path}`, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
      signal: ctrl.signal,
    });
  } catch (e) {
    const timedOut = e && e.name === 'AbortError';
    const err = E.unavailable(
      timedOut ? 'Layanan AI terlalu lama merespons.' : 'Layanan AI sedang tidak dapat dihubungi.',
      { reason: timedOut ? 'timeout' : 'unreachable' },
    );
    throw err;
  } finally {
    clearTimeout(timer);
  }
  let data = null;
  try { data = await res.json(); } catch { /* body bukan JSON */ }
  if (!res.ok) {
    const err = new Error(`AI service HTTP ${res.status}`);
    err.aiStatus = res.status;
    err.aiBody = data;
    if (res.status >= 500) throw E.unavailable('Layanan AI mengalami gangguan.', { reason: `http_${res.status}` });
    throw err;
  }
  return data;
}

const predictIntent = (text) => call('/predict-intent', { body: { text } });
const ragIndex = (documents, corpusHash) => call('/rag/index', { body: { documents, corpus_hash: corpusHash }, timeoutMs: 60000 });
const ragAnswer = (question, corpusHash) => call('/rag/answer', { body: { question, corpus_hash: corpusHash }, timeoutMs: Math.max(config.aiTimeoutMs, 20000) });
const health = () => call('/health', { method: 'GET', timeoutMs: 2500 });

module.exports = { predictIntent, ragIndex, ragAnswer, health };
