"use client";

import {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  useRef,
  type ReactNode,
} from "react";
import type { User, AuthState } from "@/app/lib/types";
import * as api from "@/app/lib/api";

interface AuthContextType extends AuthState {
  login: (tenantId: string, userId: string, password: string) => Promise<void>;
  createWorkspace: (
    tenantId: string,
    name: string,
    userId: string,
    password: string,
    displayName?: string
  ) => Promise<void>;
  logout: () => Promise<void>;
  getToken: () => string | null;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function useAuth(): AuthContextType {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({
    accessToken: null,
    user: null,
    isAuthenticated: false,
    isLoading: true,
  });

  const tokenRef = useRef<string | null>(null);
  const refreshTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const getToken = useCallback(() => tokenRef.current, []);

  const setAuth = useCallback((token: string, user: User) => {
    tokenRef.current = token;
    setState({
      accessToken: token,
      user,
      isAuthenticated: true,
      isLoading: false,
    });
  }, []);

  const clearAuth = useCallback(() => {
    tokenRef.current = null;
    if (refreshTimerRef.current) {
      clearTimeout(refreshTimerRef.current);
      refreshTimerRef.current = null;
    }
    setState({
      accessToken: null,
      user: null,
      isAuthenticated: false,
      isLoading: false,
    });
  }, []);

  // Schedule token refresh 1 minute before expiry (tokens expire in 5 min)
  const scheduleRefresh = useCallback(
    (expiresIn: number) => {
      if (refreshTimerRef.current) {
        clearTimeout(refreshTimerRef.current);
      }
      const refreshMs = (expiresIn - 60) * 1000; // refresh 60s before expiry
      if (refreshMs > 0) {
        refreshTimerRef.current = setTimeout(async () => {
          try {
            const res = await api.refreshToken();
            tokenRef.current = res.access_token;
            setState((prev) => ({ ...prev, accessToken: res.access_token }));
            scheduleRefresh(res.expires_in);
          } catch {
            clearAuth();
          }
        }, refreshMs);
      }
    },
    [clearAuth]
  );

  const login = useCallback(
    async (tenantId: string, userId: string, password: string) => {
      const res = await api.login({
        tenant_id: tenantId,
        user_id: userId,
        password,
      });
      setAuth(res.access_token, res.user);
      scheduleRefresh(res.expires_in);
    },
    [setAuth, scheduleRefresh]
  );

  const createWorkspace = useCallback(
    async (
      tenantId: string,
      name: string,
      userId: string,
      password: string,
      displayName?: string
    ) => {
      const res = await api.createTenant({
        tenant_id: tenantId,
        name,
        user_id: userId,
        password,
        display_name: displayName,
      });
      setAuth(res.access_token, res.user);
      scheduleRefresh(res.expires_in);
    },
    [setAuth, scheduleRefresh]
  );

  const logout = useCallback(async () => {
    try {
      await api.logout();
    } catch {
      // ignore errors on logout
    }

    if (typeof window !== "undefined") {
      window.localStorage.clear();
      window.sessionStorage.clear();

      const cookies = document.cookie.split(";");
      for (let i = 0; i < cookies.length; i++) {
        const cookie = cookies[i];
        const eqPos = cookie.indexOf("=");
        const name = eqPos > -1 ? cookie.substring(0, eqPos).trim() : cookie.trim();
        document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/`;
      }
    }

    clearAuth();
    
    if (typeof window !== "undefined") {
      window.location.href = "/";
    }
  }, [clearAuth]);

  // Try silent refresh on mount (restore session from HTTP-only cookie)
  useEffect(() => {
    let mounted = true;
    async function tryRestore() {
      try {
        const res = await api.refreshToken();
        if (!mounted) return;
        const user = await api.getMe(res.access_token);
        if (!mounted) return;
        setAuth(res.access_token, user);
        scheduleRefresh(res.expires_in);
      } catch {
        if (mounted) {
          setState((prev) => ({ ...prev, isLoading: false }));
        }
      }
    }
    tryRestore();
    return () => {
      mounted = false;
    };
  }, [setAuth, scheduleRefresh]);

  return (
    <AuthContext.Provider
      value={{
        ...state,
        login,
        createWorkspace,
        logout,
        getToken,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
