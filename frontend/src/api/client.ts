/* 前端 API 客户端 —— 遵循 TSD §5.1/§5.2 统一规范 */
const BASE = '/api/v1';

export class ApiError extends Error {
  code: number;
  constructor(code: number, message: string) {
    super(message);
    this.code = code;
  }
}

export function getToken() {
  return localStorage.getItem('sx_token') || '';
}
export function setToken(t: string) {
  localStorage.setItem('sx_token', t);
}
export function clearToken() {
  localStorage.removeItem('sx_token');
}

interface Options {
  method?: string;
  body?: any;
  params?: Record<string, string | number | undefined>;
}

export async function api<T = any>(path: string, opts: Options = {}): Promise<T> {
  const { method = 'GET', body, params } = opts;
  let url = BASE + path;
  if (params) {
    const qs = Object.entries(params)
      .filter(([, v]) => v !== undefined && v !== '')
      .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(String(v))}`)
      .join('&');
    if (qs) url += `?${qs}`;
  }
  const res = await fetch(url, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(getToken() ? { Authorization: `Bearer ${getToken()}` } : {}),
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  const json = await res.json().catch(() => ({ code: 50001, message: '响应解析失败' }));
  if (json.code !== 0) {
    if (json.code === 40101) {
      clearToken();
      if (!location.pathname.includes('/login')) location.href = '/login';
    }
    throw new ApiError(json.code, json.message || '请求失败');
  }
  return json.data as T;
}

/* ---------- SSE：对话流式（POST + ReadableStream 解析，遵循 TSD §5.4） ---------- */
export interface SSEHandlers {
  onStart?: (d: any) => void;
  onDelta?: (text: string) => void;
  onProgress?: (d: { percent: number; stage: string }) => void;
  onReference?: (d: any) => void;
  onTool?: (d: any) => void;
  onDone?: (d: any) => void;
  onError?: (msg: string) => void;
}

export async function chatStream(payload: any, handlers: SSEHandlers, signal?: AbortSignal) {
  const res = await fetch(`${BASE}/chat/completions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
    body: JSON.stringify({ ...payload, stream: true }),
    signal,
  });
  if (!res.ok || !res.body) {
    handlers.onError?.('网络错误，请重试');
    return;
  }
  await readSSE(res.body, handlers);
}

export async function docChatStream(docId: string, messages: any[], handlers: SSEHandlers) {
  const res = await fetch(`${BASE}/documents/${docId}/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
    body: JSON.stringify({ messages }),
  });
  if (!res.ok || !res.body) {
    handlers.onError?.('网络错误，请重试');
    return;
  }
  await readSSE(res.body, handlers);
}

/* ---------- SSE：异步任务进度（EventSource） ---------- */
export function taskStream(taskId: string, handlers: SSEHandlers): () => void {
  const es = new EventSource(`${BASE}/tasks/${taskId}/stream?token=${getToken()}`);
  es.addEventListener('progress', (e: any) => handlers.onProgress?.(JSON.parse(e.data)));
  es.addEventListener('done', (e: any) => {
    handlers.onDone?.(JSON.parse(e.data));
    es.close();
  });
  es.onerror = () => {
    es.close();
    handlers.onError?.('任务流连接中断');
  };
  return () => es.close();
}

async function readSSE(stream: ReadableStream<Uint8Array>, handlers: SSEHandlers) {
  const reader = stream.getReader();
  const decoder = new TextDecoder();
  let buf = '';
  const dispatch = (event: string, dataStr: string) => {
    if (!dataStr) return;
    let data: any;
    try { data = JSON.parse(dataStr); } catch { return; }
    switch (event) {
      case 'start': handlers.onStart?.(data); break;
      case 'delta': handlers.onDelta?.(data.text || ''); break;
      case 'progress': handlers.onProgress?.(data); break;
      case 'reference': handlers.onReference?.(data); break;
      case 'tool': handlers.onTool?.(data); break;
      case 'error': handlers.onError?.(data.message || '服务错误'); break;
      case 'done': handlers.onDone?.(data); break;
    }
  };
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buf += decoder.decode(value, { stream: true });
    const blocks = buf.split('\n\n');
    buf = blocks.pop() || '';
    for (const block of blocks) {
      let event = 'message';
      const dataLines: string[] = [];
      for (const line of block.split('\n')) {
        if (line.startsWith('event: ')) event = line.slice(7).trim();
        else if (line.startsWith('data: ')) dataLines.push(line.slice(6));
      }
      dispatch(event, dataLines.join('\n'));
    }
  }
}
