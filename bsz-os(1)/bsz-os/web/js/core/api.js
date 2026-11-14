export async function api(path, { method = 'GET', body } = {}) {
  const r = await fetch('/api/' + path, {
    method, credentials: 'same-origin',
    headers: body ? { 'Content-Type': 'application/json' } : {},
    body: body ? JSON.stringify(body) : undefined,
  });
  let j = null;
  try { j = await r.json(); } catch { /* empty body */ }
  if (!r.ok) { const e = new Error(j?.error || r.statusText); e.status = r.status; throw e; }
  return j;
}
