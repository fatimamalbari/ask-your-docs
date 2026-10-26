import type { AskInput, AskResult, DocInfo } from './types';

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(path, options);
  if (!res.ok) throw new Error(`Request failed (${res.status})`);
  return res.json() as Promise<T>;
}

export const fetchDocs = () => request<DocInfo[]>('/api/docs');

export const askQuestion = ({ question, doc }: AskInput) =>
  request<AskResult>('/api/ask', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ question, doc }),
  });
