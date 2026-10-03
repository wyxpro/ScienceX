/* ============================================================
   ScienceX 认证 Store（Context + 内存/Session 协同 + 事件总线）
   遵循 F2/F3/F4：强类型定义、静默续期与友好回跳
   ============================================================ */
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { api, getToken, setToken, clearToken } from '../api/client';
import type { User, AuthResponse } from '../types';

interface AuthCtx {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  logout: () => void;
  refresh: () => Promise<void>;
}

const defaultAuthContext: AuthCtx = {
  user: null,
  loading: true,
  login: async () => {},
  register: async () => {},
  logout: () => {},
  refresh: async () => {},
};

const Ctx = createContext<AuthCtx>(defaultAuthContext);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = async () => {
    if (!getToken()) {
      setUser(null);
      setLoading(false);
      return;
    }
    try {
      const profile = await api<User>('/user/profile');
      setUser(profile);
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refresh();

    // 监听 401 凭据失效全局事件（F4）
    const handleAuthExpired = (e: Event) => {
      const customEvent = e as CustomEvent<{ redirect?: string }>;
      setUser(null);
      const redirectPath = customEvent.detail?.redirect;
      // 公开宣传页和登录页无需认证，后台请求失效时仍允许访问。
      if (!['/', '/login', '/landing'].includes(window.location.pathname.replace(/\/$/, '') || '/')) {
        const target = redirectPath
          ? `/login?redirect=${encodeURIComponent(redirectPath)}`
          : '/login';
        window.history.pushState({}, '', target);
        window.dispatchEvent(new PopStateEvent('popstate'));
      }
    };

    window.addEventListener('sx:auth-expired', handleAuthExpired);
    return () => {
      window.removeEventListener('sx:auth-expired', handleAuthExpired);
    };
  }, []);

  const login = async (email: string, password: string) => {
    const data = await api<AuthResponse>('/auth/login', {
      method: 'POST',
      body: { email, password },
    });
    setToken(data.token, data.refresh_token);
    setUser(data.user);
  };

  const register = async (name: string, email: string, password: string) => {
    const data = await api<AuthResponse>('/auth/register', {
      method: 'POST',
      body: { name, email, password },
    });
    setToken(data.token, data.refresh_token);
    setUser(data.user);
  };

  const logout = async () => {
    try {
      await api('/auth/logout', { method: 'POST' });
    } catch {
      /* ignore */
    }
    clearToken();
    setUser(null);
    window.history.pushState({}, '', '/login');
    window.dispatchEvent(new PopStateEvent('popstate'));
  };

  return (
    <Ctx.Provider value={{ user, loading, login, register, logout, refresh }}>
      {children}
    </Ctx.Provider>
  );
}

export const useAuth = () => useContext(Ctx);
