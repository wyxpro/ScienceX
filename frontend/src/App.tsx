import { AuthProvider } from './stores/auth';
import { ProjectProvider } from './stores/project';
import { ToastProvider, ErrorBoundary } from './components/ui';
import Router from './router';

export default function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <ProjectProvider>
          <ToastProvider>
            <Router />
          </ToastProvider>
        </ProjectProvider>
      </AuthProvider>
    </ErrorBoundary>
  );
}

