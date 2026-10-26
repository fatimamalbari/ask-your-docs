import { useChat } from '../chat-context';
import { useDocs } from '../queries';

export default function DocList() {
  const { data: docs, isPending, isError } = useDocs();
  const { selectedDoc, toggleDoc } = useChat();
  const total = docs?.reduce((sum, d) => sum + d.chunks, 0) ?? 0;

  return (
    <aside className="col" aria-label="Documents">
      <div className="col-title">Documents</div>
      {isPending && <p className="hint">Loading…</p>}
      {isError && <p className="hint">Could not load documents. Is the server running?</p>}
      {docs?.length === 0 && (
        <p className="hint">
          No documents indexed yet. Run <code>npm run ingest -- path/to/file.pdf</code>, then restart the server.
        </p>
      )}
      <div className="stack">
        {docs?.map((d) => (
          <button
            key={d.name}
            type="button"
            className={`doc${selectedDoc === d.name ? ' on' : ''}`}
            aria-pressed={selectedDoc === d.name}
            onClick={() => toggleDoc(d.name)}
          >
            {d.name}
            <small>
              {d.pages != null && `${d.pages} pages · `}
              {d.chunks} chunks
            </small>
          </button>
        ))}
      </div>
      {docs && docs.length > 0 && (
        <p className="hint">
          {docs.length} documents · {total} chunks. Click one to limit questions to it.
        </p>
      )}
    </aside>
  );
}
