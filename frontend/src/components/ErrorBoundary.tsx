/* ============================================================
   全局错误边界（F5）：捕获子树渲染异常，提供「重试 / 刷新」恢复路径
   - 重试：仅重置边界状态重新渲染子树（适合偶发/瞬时错误）
   - 上报：将错误堆栈与页面路由记录到控制台与 sessionStorage，
     便于反馈问题时随演示环境一并收集（无外部上报通道时的本地兜底）
   ============================================================ */
import { Component, type ErrorInfo, type ReactNode } from 'react';

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  error: Error | null;
  info: ErrorInfo | null;
}

export default class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { error: null, info: null };

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    this.setState({ info });
    // 本地留存最近一次错误记录（最多 5 条），供排障与反馈时读取
    try {
      const key = 'sx:error-log';
      const log = JSON.parse(sessionStorage.getItem(key) || '[]');
      log.push({
        at: new Date().toISOString(),
        route: window.location.hash || '/',
        message: error.message,
        stack: (error.stack || '').slice(0, 2000),
        componentStack: (info.componentStack || '').slice(0, 2000),
      });
      sessionStorage.setItem(key, JSON.stringify(log.slice(-5)));
    } catch {
      /* sessionStorage 不可用时静默降级 */
    }
    console.error('[ScienceX] 页面渲染异常：', error, info.componentStack);
  }

  private handleRetry = (): void => {
    this.setState({ error: null, info: null });
  };

  render(): ReactNode {
    const { error } = this.state;
    if (!error) return this.props.children;

    return (
      <div className="page" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '50vh' }}>
        <div className="card card-pad" style={{ maxWidth: 520, width: '100%', textAlign: 'center' }}>
          <div style={{ fontSize: 40, lineHeight: 1, marginBottom: 12 }}>⚠️</div>
          <h3 style={{ margin: '0 0 8px', fontSize: 17 }}>页面遇到了一点问题</h3>
          <p style={{ color: 'var(--muted)', fontSize: 13, margin: '0 0 6px' }}>
            渲染过程发生异常，您可以尝试在当前页面重试；若问题持续，请刷新页面或返回工作台首页。
          </p>
          <pre
            style={{
              textAlign: 'left',
              fontSize: 11.5,
              color: '#b91c1c',
              background: '#fef2f2',
              border: '1px solid #fecaca',
              borderRadius: 8,
              padding: '8px 10px',
              margin: '10px 0 16px',
              maxHeight: 120,
              overflow: 'auto',
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-all',
            }}
          >
            {error.message || '未知错误'}
          </pre>
          <div className="row g-2" style={{ justifyContent: 'center' }}>
            <button className="btn btn-primary" onClick={this.handleRetry}>
              重试本页面
            </button>
            <button className="btn btn-ghost" onClick={() => window.location.reload()}>
              刷新页面
            </button>
            <button
              className="btn btn-ghost"
              onClick={() => {
                window.location.hash = '/';
                this.handleRetry();
              }}
            >
              返回工作台
            </button>
          </div>
        </div>
      </div>
    );
  }
}
