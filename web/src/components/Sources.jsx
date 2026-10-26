import { useEffect, useRef } from 'react';

export default function Sources({ message, highlight }) {
  const refs = useRef({});

  useEffect(() => {
    if (highlight != null) refs.current[highlight]?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }, [highlight, message?.id]);

  const sources = message?.status === 'done' ? message.result.sources : [];

  return (
    <aside className="col" aria-label="Sources">
      <div className="col-title">Sources for this answer</div>
      {sources.length === 0 ? (
        <p className="hint">Passages used to answer will appear here, with their similarity score.</p>
      ) : (
        <div className="stack">
          {sources.map((s) => (
            <div key={s.n} ref={(el) => (refs.current[s.n] = el)} className={`src${highlight === s.n ? ' hl' : ''}`}>
              <header>
                <span>
                  [{s.n}] {s.source}
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
