export default function DocList({ docs, error, selected, onSelect }) {
  const total = docs?.reduce((sum, d) => sum + d.chunks, 0) ?? 0;

  return (
    <aside className="col" aria-label="Documents">
      <div className="col-title">Documents</div>
      {docs === null && <p className="hint">Loading…</p>}
      {error && <p className="hint">Could not load documents. Is the server running?</p>}
      {docs?.length === 0 && !error && (
        <p className="hint">
          No documents indexed yet. Put .md or .txt files in docs/ and run <code>npm run ingest</code>.
        </p>
      )}
      <div className="stack">
        {docs?.map((d) => (
          <button
            key={d.name}
            type="button"
            className={`doc${selected === d.name ? ' on' : ''}`}
            aria-pressed={selected === d.name}
            onClick={() => onSelect(d.name)}
          >
            {d.name}
            <small>{d.chunks} chunks</small>
          </button>
        ))}
      </div>
      {docs?.length > 0 && (
        <p className="hint">
          {docs.length} documents · {total} chunks. Click one to limit questions to it.
        </p>
      )}
    </aside>
  );
}
