import { createRootRoute, createRoute, createRouter, Link, Outlet } from '@tanstack/react-router';
import { useChat } from './chat-context';
import ChatPage from './pages/ChatPage';
import DocumentsPage from './pages/DocumentsPage';

function Layout() {
  const { selectedDoc } = useChat();
  return (
    <div className="app">
      <header className="app-bar">
        <strong>DocAsk</strong>
        <nav className="nav">
          <Link to="/" activeProps={{ className: 'active' }} activeOptions={{ exact: true }}>
            Chat
          </Link>
          <Link to="/documents" activeProps={{ className: 'active' }}>
            Documents
          </Link>
        </nav>
        {selectedDoc && <span className="scope">Asking only {selectedDoc}</span>}
      </header>
      <Outlet />
    </div>
  );
}

const rootRoute = createRootRoute({ component: Layout });
const chatRoute = createRoute({ getParentRoute: () => rootRoute, path: '/', component: ChatPage });
const documentsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/documents',
  component: DocumentsPage,
});

export const router = createRouter({ routeTree: rootRoute.addChildren([chatRoute, documentsRoute]) });

declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router;
  }
}
