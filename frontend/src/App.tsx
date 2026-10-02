import { AuthProvider } from './stores/auth';
import { ToastProvider, ErrorBoundary } from './components/ui';
import Router from './router';

export default function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <ToastProvider>
          <Router />
        </ToastProvider>
      </AuthProvider>
    </ErrorBoundary>
  );
}

