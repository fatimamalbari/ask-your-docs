import { useCallback, useEffect, useState } from 'react';
import { askQuestion, fetchDocs } from './api.js';
import DocList from './components/DocList.jsx';
import Chat from './components/Chat.jsx';
import Sources from './components/Sources.jsx';

let nextId = 1;

export default function App() {
  const [docs, setDocs] = useState(null); // null = still loading
  const [docsError, setDocsError] = useState(false);
  const [selectedDoc, setSelectedDoc] = useState(null);
  const [messages, setMessages] = useState([]);
  // Which message the sources column is showing, and which citation is highlighted.
  const [focus, setFocus] = useState({ id: null, n: null });

  useEffect(() => {
    fetchDocs().then(setDocs).catch(() => {
      setDocs([]);
      setDocsError(true);
    });
  }, []);

  const ask = useCallback(
    async (question) => {
      const id = nextId++;
      setMessages((m) => [...m, { id, question, status: 'pending' }]);
      setFocus({ id, n: null });
      try {
        const result = await askQuestion(question, selectedDoc);
        setMessages((m) => m.map((x) => (x.id === id ? { ...x, status: 'done', result } : x)));
      } catch {
        setMessages((m) => m.map((x) => (x.id === id ? { ...x, status: 'error' } : x)));
      }
    },
    [selectedDoc],
  );

  const focused = messages.find((m) => m.id === focus.id);

  return (
    <div className="app">
      <header className="app-bar">
        <strong>DocAsk</strong>
        {selectedDoc && <span className="scope">Asking only {selectedDoc}</span>}
      </header>
      <div className="app-body">
        <DocList
          docs={docs}
          error={docsError}
          selected={selectedDoc}
          onSelect={(name) => setSelectedDoc((cur) => (cur === name ? null : name))}
        />
        <Chat
          docs={docs ?? []}
          messages={messages}
          onAsk={ask}
          onCite={(id, n) => setFocus({ id, n })}
        />
        <Sources message={focused} highlight={focus.n} />
      </div>
    </div>
  );
}
