async function request(path, options) {
  const res = await fetch(path, options);
  if (!res.ok) throw new Error(`Request failed (${res.status})`);
  return res.json();
}

export const fetchDocs = () => request('/api/docs');

export const askQuestion = (question, doc) =>
  request('/api/ask', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ question, doc }),
  });
