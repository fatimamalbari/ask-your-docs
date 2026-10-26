import { useEffect, useRef, useState } from 'react';

// Turns "text [1] more [2]" into text plus clickable citation buttons.
function AnswerText({ text, onCite }) {
  return text.split(/(\[\d+\])/g).map((part, i) => {
    const m = part.match(/^\[(\d+)\]$/);
    return m ? (
      <button key={i} type="button" className="cite" onClick={() => onCite(Number(m[1]))}>
        {part}
      </button>
    ) : (
      part
    );
  });
}

function Message({ message, onCite }) {
  return (
    <>
      <div className="msg-q">{message.question}</div>
      <div className="msg-a">
        {message.status === 'pending' && <div className="body muted">Searching your documents…</div>}
        {message.status === 'error' && (
          <div className="body error">Something went wrong answering that. Try asking again.</div>
        )}
        {message.status === 'done' && (
          <div className={`body${message.result.known ? '' : ' idk'}`}>
            <AnswerText text={message.result.answer} onCite={(n) => onCite(message.id, n)} />
            {!message.result.known && message.result.sources.length > 0 && (
              <button type="button" className="link" onClick={() => onCite(message.id, null)}>
                See the closest passages
              </button>
            )}
          </div>
        )}
      </div>
    </>
  );
}

export default function Chat({ docs, messages, onAsk, onCite }) {
  const [text, setText] = useState('');
  const endRef = useRef(null);
  const busy = messages.some((m) => m.status === 'pending');
  const noDocs = docs.length === 0;

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: 'end' });
  }, [messages]);

  function submit(e) {
    e.preventDefault();
    const q = text.trim();
    if (!q || busy || noDocs) return;
    setText('');
    onAsk(q);
  }

  return (
    <section className="col chat-col" aria-label="Conversation">
      <div className="col-title">Conversation</div>
      <div className="chat">
        {messages.length === 0 ? (
          <div className="empty">
            <h2>Ask anything about your documents</h2>
            <p>Answers come only from the files on the left, with citations you can check.</p>
            {!noDocs && (
              <div className="chips">
                {docs.slice(0, 3).map((d) => (
                  <button key={d.name} type="button" className="chip" onClick={() => onAsk(`What does ${d.name} cover?`)}>
                    What does {d.name} cover?
                  </button>
                ))}
              </div>
            )}
          </div>
        ) : (
          messages.map((m) => <Message key={m.id} message={m} onCite={onCite} />)
        )}
        <div ref={endRef} />
      </div>
      <form className="ask" onSubmit={submit}>
        <input
          type="text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={noDocs ? 'Index some documents first' : 'Ask about your documents'}
          aria-label="Question"
          disabled={noDocs}
        />
        <button type="submit" disabled={busy || noDocs || !text.trim()}>
          Ask
        </button>
      </form>
    </section>
  );
}
