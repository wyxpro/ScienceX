/* 通用 UI 组件库 */
import { createContext, useCallback, useContext, useEffect, useRef, useState, Component, type ErrorInfo, type ReactNode } from 'react';
import Icon, { type IconName } from './Icon';

/* ---------- Toast ---------- */
interface ToastItem { id: number; msg: string; type: 'ok' | 'err' | 'info' }
const ToastCtx = createContext<(msg: string, type?: ToastItem['type']) => void>(() => {});
let toastId = 0;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);
  const toast = useCallback((msg: string, type: ToastItem['type'] = 'ok') => {
    const id = ++toastId;
    setItems((x) => [...x, { id, msg, type }]);
    setTimeout(() => setItems((x) => x.filter((t) => t.id !== id)), 3200);
  }, []);
  return (
    <ToastCtx.Provider value={toast}>
      {children}
      <div className="toast-wrap">
        {items.map((t) => (
          <div key={t.id} className="toast">
            <span className="t-ic" style={{ color: t.type === 'err' ? '#ff9d94' : t.type === 'info' ? '#9cc7ff' : '#7fd0ae' }}>
              <Icon name={t.type === 'err' ? 'alert' : t.type === 'info' ? 'info' : 'check'} size={16} />
            </span>
            {t.msg}
          </div>
        ))}
      </div>
    </ToastCtx.Provider>
  );
}
export const useToast = () => useContext(ToastCtx);

/* ---------- Modal ---------- */
export function Modal({ open, onClose, title, children, footer, width }: { open: boolean; onClose: () => void; title: ReactNode; children: ReactNode; footer?: ReactNode; width?: string }) {
  useEffect(() => {
    const h = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    if (open) window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [open, onClose]);
  if (!open) return null;
  return (
    <div className="modal-scrim" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className={width === 'lg' ? 'modal modal-lg' : 'modal'}>
        <div className="modal-head">
          <div className="modal-title">{title}</div>
          <button className="btn btn-ghost btn-icon modal-x" onClick={onClose}><Icon name="x" size={16} /></button>
        </div>
        <div className="modal-body">{children}</div>
        {footer && <div className="modal-foot">{footer}</div>}
      </div>
    </div>
  );
}

/* ---------- Tabs ---------- */
export function Tabs({ tabs, active, onChange }: { tabs: { key: string; label: ReactNode }[]; active: string; onChange: (k: string) => void }) {
  return (
    <div className="tabs">
      {tabs.map((t) => (
        <button key={t.key} className={`tab ${active === t.key ? 'active' : ''}`} onClick={() => onChange(t.key)}>{t.label}</button>
      ))}
    </div>
  );
}

/* ---------- Switch ---------- */
export function Switch({ on, onChange }: { on: boolean; onChange?: (v: boolean) => void }) {
  return <button className={`switch ${on ? 'on' : ''}`} onClick={() => onChange?.(!on)} aria-label="switch" />;
}

/* ---------- Progress ---------- */
export function Progress({ value, amber }: { value: number; amber?: boolean }) {
  return (
    <div className="progress">
      <div className={`progress-bar ${amber ? 'amber' : ''}`} style={{ width: `${Math.min(100, Math.max(0, value))}%` }} />
    </div>
  );
}

/* ---------- 倒计时徽章 ---------- */
export function Countdown({ days }: { days: number | null }) {
  if (days === null) return <span className="tag tag-gray">滚动投稿</span>;
  const cls = days <= 30 ? 'tag-red' : days <= 90 ? 'tag-amber' : 'tag-green';
  return <span className={`tag ${cls}`}><Icon name="clock" size={12} />{days} 天</span>;
}

/* ---------- 标签 ---------- */
export function Tag({ children, color = 'green', style }: { children: ReactNode; color?: 'green' | 'amber' | 'red' | 'gray' | 'gold' | 'blue'; style?: React.CSSProperties }) {
  return <span className={`tag tag-${color}`} style={style}>{children}</span>;
}

/* ---------- 分数环 ---------- */
export function ScoreRing({ value, size = 72, label }: { value: number; size?: number; label?: string }) {
  const r = (size - 8) / 2;
  const c = 2 * Math.PI * r;
  const color = value >= 85 ? '#1b7a5e' : value >= 70 ? '#c2762b' : value >= 55 ? '#b9891e' : '#c24a42';
  return (
    <div style={{ position: 'relative', width: size, height: size, flex: 'none' }}>
      <svg width={size} height={size}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--bg-deep)" strokeWidth="6" />
        <circle
          cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth="6" strokeLinecap="round"
          strokeDasharray={c} strokeDashoffset={c * (1 - value / 100)}
          style={{ transition: 'stroke-dashoffset 1s var(--ease)', transform: 'rotate(-90deg)', transformOrigin: 'center' }}
        />
      </svg>
      <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
        <span style={{ fontSize: size > 60 ? 18 : 14, fontWeight: 700, color }}>{value}</span>
        {label && <span style={{ fontSize: 9.5, color: 'var(--muted)' }}>{label}</span>}
      </div>
    </div>
  );
}

/* ---------- 空状态 ---------- */
export function Empty({ icon = 'info', text, action }: { icon?: IconName; text: string; action?: ReactNode }) {
  return (
    <div className="empty anim-in">
      <div className="empty-ic"><Icon name={icon} size={36} /></div>
      <div style={{ fontSize: 13.5 }}>{text}</div>
      {action && <div style={{ marginTop: 14 }}>{action}</div>}
    </div>
  );
}

/* ---------- 骨架 ---------- */
export function Skeleton({ h = 14, w, lines = 1 }: { h?: number; w?: number | string; lines?: number }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {Array.from({ length: lines }).map((_, i) => (
        <div key={i} className="skel" style={{ height: h, width: i === lines - 1 && lines > 1 ? '70%' : w || '100%' }} />
      ))}
    </div>
  );
}

/* ---------- 加载更多/页面加载 ---------- */
export function PageLoading() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 240, gap: 10, color: 'var(--muted)' }}>
      <span className="spinner spinner-dark" style={{ width: 20, height: 20 }} /> 加载中…
    </div>
  );
}

/* ---------- 下拉菜单 ---------- */
export function Dropdown({ trigger, children, align = 'right' }: { trigger: ReactNode; children: ReactNode; align?: 'left' | 'right' }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);
  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <div onClick={() => setOpen((o) => !o)} style={{ cursor: 'pointer' }}>{trigger}</div>
      {open && (
        <div
          className="anim-pop"
          style={{
            position: 'absolute', top: 'calc(100% + 6px)', [align]: 0, zIndex: 100, minWidth: 180,
            background: 'var(--surface)', border: '1px solid var(--line)', borderRadius: 12,
            boxShadow: 'var(--shadow-lg)', padding: 6, overflow: 'hidden',
          } as any}
          onClick={() => setOpen(false)}
        >
          {children}
        </div>
      )}
    </div>
  );
}

export function DropdownItem({ icon, children, onClick, danger }: { icon?: IconName; children: ReactNode; onClick?: () => void; danger?: boolean }) {
  return (
    <div
      onClick={onClick}
      style={{
        display: 'flex', alignItems: 'center', gap: 9, padding: '8px 10px', borderRadius: 8,
        fontSize: 13, cursor: 'pointer', color: danger ? 'var(--red)' : 'var(--ink)',
        transition: 'background .15s',
      }}
      onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--bg-deep)')}
      onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
    >
      {icon && <Icon name={icon} size={15} />}{children}
    </div>
  );
}

/* ---------- 确认对话框 ---------- */
export function Confirm({ open, onClose, onConfirm, title, text, danger }: { open: boolean; onClose: () => void; onConfirm: () => void; title: string; text: string; danger?: boolean }) {
  return (
    <Modal
      open={open} onClose={onClose} title={title}
      footer={<>
        <button className="btn btn-ghost" onClick={onClose}>取消</button>
        <button className={`btn ${danger ? 'btn-danger' : 'btn-primary'}`} onClick={() => { onConfirm(); onClose(); }}>确认</button>
      </>}
    >
      <p style={{ fontSize: 13.5, color: 'var(--ink-2)' }}>{text}</p>
    </Modal>
  );
}

/* ---------- 错误边界 ErrorBoundary ---------- */
interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
}
interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }
  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }
  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('[ErrorBoundary caught error]', error, info);
  }
  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback;
      return (
        <div style={{ padding: 32, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: 400 }}>
          <div className="card card-pad" style={{ maxWidth: 520, width: '100%', textAlign: 'center' }}>
            <div style={{ color: 'var(--red)', marginBottom: 12 }}><Icon name="alert" size={32} /></div>
            <h3 style={{ fontSize: 18, marginBottom: 8 }}>页面渲染异常</h3>
            <p className="text-small text-muted" style={{ marginBottom: 16 }}>
              {this.state.error?.message || '组件遇到未处理的错误'}
            </p>
            <button className="btn btn-primary btn-sm" onClick={() => { this.setState({ hasError: false }); window.location.reload(); }}>
              刷新重试
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

