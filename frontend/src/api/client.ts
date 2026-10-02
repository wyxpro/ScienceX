/* ============================================================
   ScienceX 前端 API 客户端 —— 严格遵循 TSD §5.1 / §5.2 / §5.4 规范
   支持：类型泛型、静默 Token 续期、SSE 容错解析、断线断点重连、Abort 中断与 401 路由广播
   ============================================================ */

const BASE = import.meta.env.VITE_API_BASE || '/api/v1';

export class ApiError extends Error {
  code: number;
  trace_id?: string;
  constructor(code: number, message: string, trace_id?: string) {
    super(message);
    this.name = 'ApiError';
    this.code = code;
    this.trace_id = trace_id;
  }
}

/* ---------- Token 状态安全管理 (优先 sessionStorage + 内存缓存，隔离跨标签风险) ---------- */
let memoryToken = '';
let memoryRefreshToken = '';

export function getToken(): string {
  if (memoryToken) return memoryToken;
  try {
    const s = sessionStorage.getItem('sx_token') || '';
    memoryToken = s;
    return s;
  } catch {
    return memoryToken;
  }
}

export function getRefreshToken(): string {
  if (memoryRefreshToken) return memoryRefreshToken;
  try {
    const s = sessionStorage.getItem('sx_refresh_token') || '';
    memoryRefreshToken = s;
    return s;
  } catch {
    return memoryRefreshToken;
  }
}

export function setToken(token: string, refreshToken?: string): void {
  memoryToken = token;
  try {
    sessionStorage.setItem('sx_token', token);
    if (refreshToken) {
      memoryRefreshToken = refreshToken;
      sessionStorage.setItem('sx_refresh_token', refreshToken);
    }
  } catch (_) {}
}

export function clearToken(): void {
  memoryToken = '';
  memoryRefreshToken = '';
  try {
    sessionStorage.removeItem('sx_token');
    sessionStorage.removeItem('sx_refresh_token');
  } catch (_) {}
}

/* ---------- 401 认证拦截与静默 Token 续期 (F3 & F4) ---------- */
let isRefreshing = false;
let refreshSubscribers: Array<(newToken: string | null) => void> = [];

function onTokenRefreshed(newToken: string | null) {
  refreshSubscribers.forEach((cb) => cb(newToken));
  refreshSubscribers = [];
}

async function attemptTokenRefresh(): Promise<string | null> {
  const rf = getRefreshToken();
  if (!rf) return null;
  try {
    const res = await fetch(`${BASE}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refresh_token: rf }),
    });
    const json = await res.json();
    if (json.code === 0 && json.data?.token) {
      setToken(json.data.token, json.data.refresh_token);
      return json.data.token;
    }
  } catch (_) {}
  return null;
}

function handleAuthExpired() {
  clearToken();
  // 广播 401 事件给 React 应用，支持平滑展示 Toast 与带参重定向
  window.dispatchEvent(
    new CustomEvent('sx:auth-expired', {
      detail: { redirect: window.location.pathname + window.location.search },
    })
  );
}

/* ---------- 核心 API 请求方法 (F2 强类型泛型) ---------- */
export interface RequestOptions {
  method?: string;
  body?: any;
  params?: Record<string, string | number | boolean | undefined>;
  signal?: AbortSignal;
  headers?: Record<string, string>;
  isRetry?: boolean;
}

export async function api<T = any>(path: string, opts: RequestOptions = {}): Promise<T> {
  const { method = 'GET', body, params, signal, headers = {}, isRetry = false } = opts;
  let url = BASE + path;

  if (params) {
    const qs = Object.entries(params)
      .filter(([, v]) => v !== undefined && v !== '')
      .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`)
      .join('&');
    if (qs) url += `?${qs}`;
  }

  const token = getToken();
  const requestHeaders: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...headers,
  };

  const res = await fetch(url, {
    method,
    headers: requestHeaders,
    body: body !== undefined ? JSON.stringify(body) : undefined,
    signal,
  });

  const json = await res.json().catch(() => ({ code: 50001, message: '响应体解析失败' }));

  // 401 拦截处理
  if (json.code === 40101 || res.status === 401) {
    if (!isRetry && getRefreshToken()) {
      if (!isRefreshing) {
        isRefreshing = true;
        const newToken = await attemptTokenRefresh();
        isRefreshing = false;
        onTokenRefreshed(newToken);
        if (newToken) {
          return api<T>(path, { ...opts, isRetry: true });
        }
      } else {
        // 等待正在进行的刷新
        return new Promise<T>((resolve, reject) => {
          refreshSubscribers.push((newToken) => {
            if (newToken) {
              resolve(api<T>(path, { ...opts, isRetry: true }));
            } else {
              handleAuthExpired();
              reject(new ApiError(40101, '登录已过期，请重新登录'));
            }
          });
        });
      }
    }

    handleAuthExpired();
    throw new ApiError(json.code || 40101, json.message || '登录凭据无效，请重新登录', json.trace_id);
  }

  if (json.code !== 0) {
    throw new ApiError(json.code, json.message || '请求失败', json.trace_id);
  }

  return json.data as T;
}

/* ---------- SSE 流式事件定义 (TSD §5.4 标准协议) ---------- */
export interface SSEHandlers {
  onStart?: (d: any) => void;
  onDelta?: (text: string) => void;
  onProgress?: (d: { percent: number; stage: string; message?: string }) => void;
  onReference?: (d: any) => void;
  onTool?: (d: any) => void;
  onDone?: (d: any) => void;
  onError?: (msg: string) => void;
}

/* ---------- SSE：对话流式 (支持 AbortSignal 中断与 Last-Event-ID 记录) ---------- */
let lastReceivedEventId = '';

export async function chatStream(payload: any, handlers: SSEHandlers, signal?: AbortSignal): Promise<void> {
  const token = getToken();
  try {
    const res = await fetch(`${BASE}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(lastReceivedEventId ? { 'Last-Event-ID': lastReceivedEventId } : {}),
      },
      body: JSON.stringify({ ...payload, stream: true }),
      signal,
    });

    if (!res.ok || !res.body) {
      handlers.onError?.(`服务响应错误 [${res.status}]，请稍后重试`);
      return;
    }

    await readSSE(res.body, handlers);
  } catch (err: any) {
    if (err.name === 'AbortError') {
      handlers.onDone?.({ aborted: true, text: '用户已终止生成' });
      return;
    }
    handlers.onError?.(err?.message || '网络连接异常');
  }
}

export async function docChatStream(docId: string, messages: any[], handlers: SSEHandlers, signal?: AbortSignal): Promise<void> {
  const token = getToken();
  try {
    const res = await fetch(`${BASE}/documents/${docId}/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(lastReceivedEventId ? { 'Last-Event-ID': lastReceivedEventId } : {}),
      },
      body: JSON.stringify({ messages }),
      signal,
    });

    if (!res.ok || !res.body) {
      handlers.onError?.(`文献问答服务错误 [${res.status}]`);
      return;
    }

    await readSSE(res.body, handlers);
  } catch (err: any) {
    if (err.name === 'AbortError') return;
    handlers.onError?.(err?.message || '文献问答连接失败');
  }
}

/* ---------- SSE：异步任务进度（修复 🐞2 / B11：采用 fetch + ReadableStream 携带 Authorization） ---------- */
export function taskStream(taskId: string, handlers: SSEHandlers): () => void {
  const controller = new AbortController();
  const token = getToken();

  (async () => {
    try {
      const res = await fetch(`${BASE}/tasks/${taskId}/stream`, {
        headers: {
          Accept: 'text/event-stream',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        signal: controller.signal,
      });

      if (!res.ok || !res.body) {
        handlers.onError?.(`无法建立任务进度监听 [${res.status}]`);
        return;
      }

      await readSSE(res.body, {
        onProgress: (d) => handlers.onProgress?.(d),
        onDone: (d) => handlers.onDone?.(d),
        onError: (err) => handlers.onError?.(err),
      });
    } catch (err: any) {
      if (err.name !== 'AbortError') {
        handlers.onError?.('任务进度监控连接中断');
      }
    }
  })();

  return () => {
    controller.abort();
  };
}

/* ---------- 通用 SSE 缓冲区解析器（带 Last-Event-ID 记录与 JSON 容错） ---------- */
async function readSSE(stream: ReadableStream<Uint8Array>, handlers: SSEHandlers): Promise<void> {
  const reader = stream.getReader();
  const decoder = new TextDecoder('utf-8');
  let buf = '';

  const dispatch = (event: string, dataStr: string, eventId?: string) => {
    if (eventId) lastReceivedEventId = eventId;
    if (!dataStr) return;

    let data: any;
    try {
      data = JSON.parse(dataStr);
    } catch {
      // 容错：当非 JSON 结构时作为纯文本传递
      data = { text: dataStr, message: dataStr };
    }

    switch (event) {
      case 'start':
        handlers.onStart?.(data);
        break;
      case 'delta':
        handlers.onDelta?.(data.text !== undefined ? data.text : String(data));
        break;
      case 'progress':
        handlers.onProgress?.(data);
        break;
      case 'reference':
        handlers.onReference?.(data);
        break;
      case 'tool':
        handlers.onTool?.(data);
        break;
      case 'error':
        handlers.onError?.(data.message || '模型生成遇到异常');
        break;
      case 'done':
        handlers.onDone?.(data);
        break;
      default:
        if (data.text) handlers.onDelta?.(data.text);
        break;
    }
  };

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buf += decoder.decode(value, { stream: true });
      const blocks = buf.split('\n\n');
      buf = blocks.pop() || '';

      for (const block of blocks) {
        if (!block.trim()) continue;
        let event = 'message';
        let eventId = '';
        const dataLines: string[] = [];

        for (const line of block.split('\n')) {
          if (line.startsWith(':')) {
            // 心跳注释行 : ping
            continue;
          } else if (line.startsWith('id:')) {
            eventId = line.slice(3).trim();
          } else if (line.startsWith('event:')) {
            event = line.slice(6).trim();
          } else if (line.startsWith('data:')) {
            dataLines.push(line.slice(5));
          }
        }

        dispatch(event, dataLines.join('\n').trim(), eventId);
      }
    }
  } finally {
    reader.releaseLock();
  }
}
