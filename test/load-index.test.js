import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

process.env.MOCK_AI = '1';
const { loadIndex, listDocs } = await import('../src/rag.js');

const shard = (overrides = {}) => ({
  schema_version: 1,
  source: 'a.pdf',
  embedding_model: 'mock',
  dims: 256,
  created_at: '2026-01-01T00:00:00Z',
  chunks: [
    { page: 1, text: 'first', vector: [1] },
    { page: 2, text: 'second', vector: [1] },
  ],
  ...overrides,
});

async function dirWith(files) {
  const dir = await mkdtemp(join(tmpdir(), 'shards-'));
  for (const [name, data] of Object.entries(files)) await writeFile(join(dir, name), JSON.stringify(data));
  return dir;
}

test('loads chunks with their page numbers', async () => {
  const index = await loadIndex(await dirWith({ 'a.pdf.json': shard() }));
  assert.deepEqual(index.map((e) => [e.source, e.page, e.text]), [['a.pdf', 1, 'first'], ['a.pdf', 2, 'second']]);
});

test('skips shards built with a different model, dims or schema version', async (t) => {
  t.mock.method(console, 'warn', () => {});
  const dir = await dirWith({
    'ok.json': shard({ source: 'ok.md' }),
    'model.json': shard({ source: 'model.md', embedding_model: 'text-embedding-005' }),
    'dims.json': shard({ source: 'dims.md', dims: 768 }),
    'schema.json': shard({ source: 'schema.md', schema_version: 2 }),
  });
  const index = await loadIndex(dir);
  assert.deepEqual([...new Set(index.map((e) => e.source))], ['ok.md']);
});

test('a missing index folder is an empty index', async () => {
  assert.deepEqual(await loadIndex(join(tmpdir(), 'does-not-exist-docask')), []);
});

test('listDocs counts chunks and distinct pages; text files have no pages', () => {
  const docs = listDocs([
    { source: 'a.pdf', page: 1 },
    { source: 'a.pdf', page: 1 },
    { source: 'a.pdf', page: 2 },
    { source: 'n.md', page: null },
  ]);
  assert.deepEqual(docs, [
    { name: 'a.pdf', chunks: 3, pages: 2 },
    { name: 'n.md', chunks: 1, pages: null },
  ]);
});
