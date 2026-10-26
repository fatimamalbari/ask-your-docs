import express from 'express';
import { answer, listDocs, loadIndex } from './rag.js';

const app = express();
app.use(express.json());
// Production build of the React app (web/). In dev, Vite serves it and proxies API calls here.
app.use(express.static(new URL('../web/dist', import.meta.url).pathname));

const index = await loadIndex();

app.get('/healthz', (_req, res) => res.send('ok'));

app.get('/api/docs', (_req, res) => res.json(listDocs(index)));

app.post('/api/ask', async (req, res) => {
  const { question, doc } = req.body ?? {};
  if (typeof question !== 'string' || !question.trim()) {
    return res.status(400).json({ error: 'question is required' });
  }
  try {
    res.json(await answer(index, question, { doc }));
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'failed to answer' });
  }
});

const port = process.env.PORT || 8080;
app.listen(port, () => console.log(`listening on ${port}`));
