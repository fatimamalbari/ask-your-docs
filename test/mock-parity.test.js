import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

// rag.js reads MOCK_AI at import time, so set it before importing.
process.env.MOCK_AI = '1';
const { mockVector } = await import('../src/rag.js');

test('mock vectors match the fixture shared with the Python worker', async () => {
  const cases = JSON.parse(await readFile(new URL('../contract/mock-vectors.json', import.meta.url), 'utf8'));
  assert.ok(cases.length > 0);
  for (const { text, vector } of cases) assert.deepEqual(mockVector(text), vector, text);
});
