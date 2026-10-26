import { useEffect, useRef } from 'react';
import { useChat } from '../chat-context';

export default function Sources() {
  const { messages, focus } = useChat();
  const refs = useRef<Record<number, HTMLDivElement | null>>({});

  const message = messages.find((m) => m.id === focus.id);
  const sources = message?.status === 'done' ? message.result.sources : [];

  useEffect(() => {
    if (focus.n != null) refs.current[focus.n]?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }, [focus.n, focus.id]);

  return (
    <aside className="col" aria-label="Sources">
      <div className="col-title">Sources for this answer</div>
      {sources.length === 0 ? (
        <p className="hint">Passages used to answer will appear here, with their similarity score.</p>
      ) : (
        <div className="stack">
          {sources.map((s) => (
            <div
              key={s.n}
              ref={(el) => {
                refs.current[s.n] = el;
              }}
              className={`src${focus.n === s.n ? ' hl' : ''}`}
            >
              <header>
                <span>
                  [{s.n}] {s.source}
                  {s.page != null && ` · p. ${s.page}`}
                </span>
                <span>
                  {s.score.toFixed(2)}
                  <span className="score">
                    <i style={{ width: `${Math.max(0, Math.min(1, s.score)) * 100}%` }} />
                  </span>
                </span>
              </header>
              <p>{s.text}</p>
            </div>
          ))}
        </div>
      )}
    </aside>
  );
}
