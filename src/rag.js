import { GoogleGenAI } from '@google/genai';
import { readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';

const project = process.env.GOOGLE_CLOUD_PROJECT;
const location = process.env.GOOGLE_CLOUD_LOCATION || 'us-central1';
export const EMBED_MODEL = process.env.EMBED_MODEL || 'text-embedding-005';
export const GEN_MODEL = process.env.GEN_MODEL || 'gemini-2.5-flash';
// Index shards are written by the Python ingest worker. See contract/CONTRACT.md.
export const DATA_DIR = process.env.DATA_DIR || 'data';
const SCHEMA_VERSION = 1;

// MOCK_AI=1 swaps Vertex AI for local fakes so the app runs without GCP or credits.
export const MOCK = process.env.MOCK_AI === '1';
// Passages scoring below this are treated as "not in the documents".
export const MIN_SCORE = Number(process.env.MIN_SCORE ?? (MOCK ? 0.25 : 0.5));

// Vertex AI mode: authenticates with Application Default Credentials.
const ai = MOCK ? null : new GoogleGenAI({ vertexai: true, project, location });

const MOCK_DIMS = 256;
export function mockVector(text) {
  const v = new Array(MOCK_DIMS).fill(0);
  for (const w of text.toLowerCase().match(/[a-z0-9]+/g) ?? []) {
    let h = 0;
    for (const c of w) h = (h * 31 + c.charCodeAt(0)) % MOCK_DIMS;
    v[h]++;
  }
  return v;
}

export async function embed(texts, taskType) {
  if (MOCK) return texts.map(mockVector);
  const res = await ai.models.embedContent({
    model: EMBED_MODEL,
    contents: texts,
    config: { taskType },
  });
  return res.embeddings.map((e) => e.values);
}

const cosine = (a, b) => {
  let dot = 0, na = 0, nb = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    na += a[i] ** 2;
    nb += b[i] ** 2;
  }
  return na && nb ? dot / (Math.sqrt(na) * Math.sqrt(nb)) : 0;
};

// Searching shards embedded with a different model or size would silently return wrong results,
// so those shards are skipped with a warning instead of being loaded.
function shardProblem(shard) {
  const expectedModel = MOCK ? 'mock' : EMBED_MODEL;
  if (shard.schema_version !== SCHEMA_VERSION) return `schema_version ${shard.schema_version}`;
  if (shard.embedding_model !== expectedModel) return `embedded with ${shard.embedding_model}, expected ${expectedModel}`;
  if (MOCK && shard.dims !== MOCK_DIMS) return `dims ${shard.dims}, expected ${MOCK_DIMS}`;
  return null;
}

export async function loadIndex(dir = join(DATA_DIR, 'index')) {
  let files;
  try {
    files = (await readdir(dir)).filter((f) => f.endsWith('.json')).sort();
  } catch (err) {
    if (err.code === 'ENOENT') return [];
    throw err;
  }
  const index = [];
  for (const file of files) {
    const shard = JSON.parse(await readFile(join(dir, file), 'utf8'));
    const problem = shardProblem(shard);
    if (problem) {
      console.warn(`skipping ${file}: ${problem}`);
      continue;
    }
    for (const c of shard.chunks) index.push({ source: shard.source, page: c.page, text: c.text, vector: c.vector });
  }
  return index;
}

export function listDocs(index) {
  const docs = new Map();
  for (const e of index) {
    const d = docs.get(e.source) ?? { name: e.source, chunks: 0, pages: new Set() };
    d.chunks++;
    if (e.page != null) d.pages.add(e.page);
    docs.set(e.source, d);
  }
  return [...docs.values()].map((d) => ({ name: d.name, chunks: d.chunks, pages: d.pages.size || null }));
}

export async function retrieve(index, question, { k = 4, doc } = {}) {
  const pool = doc ? index.filter((e) => e.source === doc) : index;
  const [qv] = await embed([question], 'RETRIEVAL_QUERY');
  return pool
    .map((e) => ({ ...e, score: cosine(qv, e.vector) }))
    .sort((a, b) => b.score - a.score)
    .slice(0, k);
}

async function generate(question, hits) {
  if (MOCK) {
    const body = hits[0].text.replace(/^#.*$/gm, '').trim();
    return `${body.split(/(?<=\.)\s/)[0]} [1]`;
  }
  const context = hits
    .map((h, i) => `[${i + 1}] (${h.source}${h.page != null ? `, page ${h.page}` : ''})\n${h.text}`)
    .join('\n\n');
  const res = await ai.models.generateContent({
    model: GEN_MODEL,
    contents: `Answer using only the context below. Cite sources like [1]. If the answer is not in the context, say you don't know.\n\nContext:\n${context}\n\nQuestion: ${question}`,
  });
  return res.text;
}

export async function answer(index, question, opts = {}) {
  const hits = await retrieve(index, question, opts);
  const sources = hits.map((h, i) => ({
    n: i + 1,
    source: h.source,
    page: h.page,
    score: +h.score.toFixed(3),
    text: h.text,
  }));
  // Below the threshold, skip the model: it has nothing relevant to cite.
  if (!hits.length || hits[0].score < MIN_SCORE) {
    return {
      known: false,
      answer: "I don't know. Your documents don't cover that.",
      sources,
    };
  }
  return { known: true, answer: await generate(question, hits), sources };
}
