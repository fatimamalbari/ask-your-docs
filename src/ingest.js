import { readdir, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { chunk, embed, saveIndex } from './rag.js';

const dir = process.argv[2] || 'docs';
const files = (await readdir(dir)).filter((f) => /\.(md|txt)$/.test(f));
const entries = [];

for (const f of files) {
  const pieces = chunk(await readFile(join(dir, f), 'utf8'));
  // embedContent accepts batches; keep them small to stay under request limits
  for (let i = 0; i < pieces.length; i += 20) {
    const batch = pieces.slice(i, i + 20);
    const vectors = await embed(batch, 'RETRIEVAL_DOCUMENT');
    batch.forEach((text, j) => entries.push({ source: f, text, vector: vectors[j] }));
  }
  console.log(`${f}: ${pieces.length} chunks`);
}

await saveIndex(entries);
console.log(`Indexed ${entries.length} chunks`);
