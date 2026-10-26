import Chat from '../components/Chat';
import DocList from '../components/DocList';
import Sources from '../components/Sources';

export default function ChatPage() {
  return (
    <div className="app-body">
      <DocList />
      <Chat />
      <Sources />
    </div>
  );
}
