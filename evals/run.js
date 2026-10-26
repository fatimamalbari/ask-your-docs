import { readFile } from 'node:fs/promises';
import { answer, loadIndex } from '../src/rag.js';

// cases.json: [{ "question": "...", "mustInclude": ["keyword", ...] }]
const cases = JSON.parse(await readFile(new URL('./cases.json', import.meta.url), 'utf8'));
const index = await loadIndex();

let passed = 0;
for (const c of cases) {
  const { answer: a } = await answer(index, c.question);
  const ok = c.mustInclude.every((k) => a.toLowerCase().includes(k.toLowerCase()));
  if (ok) passed++;
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${c.question}`);
}
console.log(`\n${passed}/${cases.length} passed`);
process.exit(passed === cases.length ? 0 : 1);
