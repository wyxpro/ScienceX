/* 路由：懒加载 + 登录守卫（页面结构与 PRD §2.0 信息架构一一对应） */
import { lazy, Suspense } from 'react';
import { HashRouter, Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { useAuth } from '../stores/auth';
import { PageLoading } from '../components/ui';
import ErrorBoundary from '../components/ErrorBoundary';
import AppLayout from '../layouts/AppLayout';

const Landing = lazy(() => import('../pages/Landing'));
const Login = lazy(() => import('../pages/Login'));
const Chat = lazy(() => import('../pages/Chat'));
const Topic = lazy(() => import('../pages/Topic'));
const Reader = lazy(() => import('../pages/Reader'));
const Experiment = lazy(() => import('../pages/Experiment'));
const Analysis = lazy(() => import('../pages/Analysis'));
const Writing = lazy(() => import('../pages/Writing'));
const Submission = lazy(() => import('../pages/Submission'));
const Meeting = lazy(() => import('../pages/Meeting'));
const Review = lazy(() => import('../pages/Review'));
const Reproduce = lazy(() => import('../pages/Reproduce'));
const Projects = lazy(() => import('../pages/Projects'));
const Account = lazy(() => import('../pages/Account'));

function Guard({ children }: { children: JSX.Element }) {
  const { user, loading } = useAuth();
  const location = useLocation();
  if (loading) return <PageLoading />;
  if (!user) {
    const redirect = encodeURIComponent(location.pathname + location.search);
    return <Navigate to={`/login?redirect=${redirect}`} replace />;
  }
  return children;
}

export default function Router() {
  return (
    <HashRouter>
      {/* 顶层错误边界：兜底外壳之外（Landing / Login）的渲染异常（F5） */}
      <ErrorBoundary>
        <Suspense fallback={<PageLoading />}>
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/landing" element={<Landing />} />
          <Route path="/login" element={<Login />} />
          <Route element={<Guard><AppLayout /></Guard>}>
            <Route path="/chat" element={<Chat />} />
            <Route path="/tools/topic" element={<Topic />} />
            <Route path="/tools/reader" element={<Reader />} />
            <Route path="/tools/experiment" element={<Experiment />} />
            <Route path="/tools/analysis" element={<Analysis />} />
            <Route path="/tools/writing" element={<Writing />} />
            <Route path="/tools/submission" element={<Submission />} />
            <Route path="/features/meeting" element={<Meeting />} />
            <Route path="/features/review" element={<Review />} />
            <Route path="/features/reproduce" element={<Reproduce />} />
            <Route path="/projects" element={<Projects />} />
            <Route path="/account" element={<Account />} />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
        </Suspense>
      </ErrorBoundary>
    </HashRouter>
  );
}
