import { useDocs } from '../queries';

export default function DocumentsPage() {
  const { data: docs, isPending, isError } = useDocs();

  return (
    <div className="page">
      <h2>Documents</h2>
      {isPending && <p className="hint">Loading…</p>}
      {isError && <p className="hint">Could not load documents. Is the server running?</p>}
      {docs && (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>Pages</th>
                <th>Chunks</th>
              </tr>
            </thead>
            <tbody>
              {docs.map((d) => (
                <tr key={d.name}>
                  <td>{d.name}</td>
                  <td>{d.pages ?? '–'}</td>
                  <td>{d.chunks}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <p className="hint">
        Add documents with <code>npm run ingest -- path/to/file.pdf</code> and restart the server. Upload from this page
        comes later.
      </p>
    </div>
  );
}
