"use client";
import React, { createContext, useContext, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useNotification } from './NotificationContext';

type User = {
  id: number;
  email: string;
  role: 'student' | 'teacher' | 'admin';
  name: string;
  phone?: string;
  points?: number;
  credits_ai?: number;
  cefr_level?: string;
  subscription_tier?: string;
};

type AuthContextType = {
  user: User | null;
  token: string | null;
  register: (name: string, email: string, password: string, role: string, phone?: string) => Promise<boolean>;
  verifyOTP: (email: string, otp: string) => Promise<boolean>;
  login: (email: string, password: string) => Promise<boolean | { requires_2fa: boolean; message?: string }>;
  loginSendOTP: (email: string) => Promise<boolean>;
  loginVerifyOTP: (email: string, otp: string) => Promise<boolean>;
  logout: (showConfirm?: boolean) => Promise<boolean>;
  forgotPassword: (email: string) => Promise<boolean>;
  resetPassword: (email: string, token: string, newPassword: string) => Promise<boolean>;
  updateUser: (userData: Partial<User>) => void;
  refreshUser: () => Promise<void>;
  tryRefreshToken: () => Promise<string | null>;
  authFetch: (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;
  isLoading: boolean;
  isInitialized: boolean;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const API_URL = process.env.NEXT_PUBLIC_API_URL || "https://iedu-ksk7.onrender.com";

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [refreshToken, setRefreshToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  const router = useRouter();
  const { showConfirm } = useNotification();
  const refreshPromiseRef = React.useRef<Promise<string | null> | null>(null);
  const lastActiveRef = React.useRef<number>(Date.now());

  useEffect(() => {
    const storedToken = localStorage.getItem('eam_token');
    const storedRefreshToken = localStorage.getItem('eam_refresh_token');
    const storedUser = localStorage.getItem('eam_user');
    if (storedToken && storedUser) {
      setToken(storedToken);
      setUser(JSON.parse(storedUser));
    }
    if (storedRefreshToken) {
      setRefreshToken(storedRefreshToken);
    }
    setIsInitialized(true);

    // Sync logout across tabs
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'eam_logout_trigger') {
        window.location.href = '/login';
      }
    };
    window.addEventListener('storage', handleStorageChange);

    // Track user activity to prevent idle logout
    const updateActivity = () => {
      lastActiveRef.current = Date.now();
    };
    const activityEvents = ['mousedown', 'keydown', 'scroll', 'touchstart'];
    activityEvents.forEach(evt => window.addEventListener(evt, updateActivity, { passive: true }));

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      activityEvents.forEach(evt => window.removeEventListener(evt, updateActivity));
    };
  }, []);

  // Decode JWT expiration timestamp
  const parseJwtExp = (t: string): number | null => {
    try {
      const parts = t.split('.');
      if (parts.length < 2) return null;
      const base64Url = parts[1];
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
      const jsonPayload = decodeURIComponent(
        atob(base64)
          .split('')
          .map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
          .join('')
      );
      const parsed = JSON.parse(jsonPayload);
      return parsed.exp ? parsed.exp * 1000 : null;
    } catch {
      return null;
    }
  };

  // Mutex-protected refresh token function
  const tryRefreshToken = async (): Promise<string | null> => {
    if (refreshPromiseRef.current) {
      return refreshPromiseRef.current;
    }

    const currentRefreshToken = refreshToken || (typeof window !== 'undefined' ? localStorage.getItem('eam_refresh_token') : null);
    if (!currentRefreshToken) {
      console.warn("[AUTH] No refresh token available.");
      return null;
    }

    const executeRefresh = async (): Promise<string | null> => {
      try {
        console.log("[AUTH] Refreshing access token...");
        const res = await fetch(`${API_URL}/auth/refresh`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ refresh_token: currentRefreshToken })
        });

        if (!res.ok) {
          console.warn("[AUTH] Refresh token failed with status:", res.status);
          return null;
        }

        const data = await res.json();
        const newAccess = data.access_token;
        const newRefresh = data.refresh_token;

        if (newAccess) {
          setToken(newAccess);
          localStorage.setItem('eam_token', newAccess);
        }
        if (newRefresh) {
          setRefreshToken(newRefresh);
          localStorage.setItem('eam_refresh_token', newRefresh);
        }

        console.log("[AUTH] Token refreshed successfully.");
        return newAccess;
      } catch (err) {
        console.error("[AUTH] Error refreshing token:", err);
        return null;
      } finally {
        refreshPromiseRef.current = null;
      }
    };

    refreshPromiseRef.current = executeRefresh();
    return refreshPromiseRef.current;
  };

  // Proactive token refresh timer (refreshes 5 mins before expiration if user is active)
  useEffect(() => {
    if (!token) return;

    const expTime = parseJwtExp(token);
    if (!expTime) return;

    const now = Date.now();
    const msUntilExp = expTime - now;
    // Refresh 5 minutes (300,000 ms) before expiration, or at 30 seconds if already close
    const refreshDelay = Math.max(10000, msUntilExp - 5 * 60 * 1000);

    const timer = setTimeout(async () => {
      // Check user activity: only refresh proactively if active within past 2 hours
      const inactiveMs = Date.now() - lastActiveRef.current;
      if (inactiveMs < 2 * 60 * 60 * 1000) {
        await tryRefreshToken();
      } else {
        console.log("[AUTH] User inactive for > 2 hours, skipping proactive refresh.");
      }
    }, refreshDelay);

    return () => clearTimeout(timer);
  }, [token, refreshToken]);

  // Helper: retry fetch logic
  async function retryFetch(url: string, options: any, maxRetries = 2): Promise<Response> {
    let lastErr: any;
    for (let i = 0; i <= maxRetries; i++) {
      try {
        const res = await fetch(url, options);
        if (res.status === 502 || res.status === 503) throw new Error('Backend unavailable');
        return res;
      } catch (err: any) {
        lastErr = err;
        if (err.name === 'AbortError') throw err;
        if (i < maxRetries) await new Promise(r => setTimeout(r, 1500));
      }
    }
    throw lastErr;
  }

  const authFetch = async (input: RequestInfo | URL, init: RequestInit = {}) => {
    let currentToken = token || (typeof window !== 'undefined' ? localStorage.getItem('eam_token') : null);
    const headers = new Headers(init.headers);
    if (currentToken) {
      headers.set("Authorization", `Bearer ${currentToken}`);
    }
    
    // Automatically set Content-Type for JSON if not provided and body exists
    if (!headers.has("Content-Type") && init.body && !(init.body instanceof FormData)) {
      headers.set("Content-Type", "application/json");
    }

    try {
      let resp = await fetch(input, { ...init, headers });
      
      // If 401 Unauthorized, attempt a silent token refresh before giving up
      if (resp.status === 401) {
        console.warn("[AUTH] Received 401 Unauthorized. Attempting silent refresh...");
        const newToken = await tryRefreshToken();
        if (newToken) {
          headers.set("Authorization", `Bearer ${newToken}`);
          resp = await fetch(input, { ...init, headers });
        } else {
          console.warn("[AUTH] Refresh failed or token invalid. Logging out...");
          logout(false);
        }
      }
      
      return resp;
    } catch (err: any) {
      if (err.name !== 'AbortError') {
        console.error("[AUTH] authFetch connection error:", err);
      }
      throw err;
    }
  };

  const register = async (name: string, email: string, password: string, role: string, phone?: string) => {
    setIsLoading(true);
    try {
      const res = await retryFetch(`${API_URL}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password, role, phone })
      });
      const data = await res.json();
      if (!res.ok) {
        return false;
      }
      return true;
    } catch (error: any) {
      console.error('Register error:', error);
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const verifyOTP = async (email: string, otp: string) => {
    setIsLoading(true);
    try {
      const res = await retryFetch(`${API_URL}/auth/verify-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, otp })
      });
      const data = await res.json();
      if (!res.ok) {
        return false;
      }
      return true;
    } catch (error: any) {
      console.error('OTP verify error:', error);
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const login = async (email: string, password: string) => {
    setIsLoading(true);
    try {
      const res = await retryFetch(`${API_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });
      const data = await res.json();
      if (!res.ok) {
        return false;
      }

      if (data.requires_2fa) {
        return { requires_2fa: true, message: data.message };
      }

      const { access_token, refresh_token, user: userData } = data;
      setToken(access_token);
      setUser(userData);
      localStorage.setItem('eam_token', access_token);
      localStorage.setItem('eam_user', JSON.stringify(userData));
      if (refresh_token) {
        setRefreshToken(refresh_token);
        localStorage.setItem('eam_refresh_token', refresh_token);
      }

      router.push(`/dashboard/${userData.role.toLowerCase()}`);
      return true;
    } catch (error: any) {
      console.error('Login error:', error);
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async (confirmLogout: boolean = true) => {
    if (confirmLogout) {
      const confirmed = await showConfirm("Bạn có chắc chắn muốn đăng xuất?");
      if (!confirmed) return false;
    }

    // 1. Capture token before clearing state
    const currentToken = token;

    // 2. Clear all storage immediately
    localStorage.removeItem('eam_token');
    localStorage.removeItem('eam_refresh_token');
    localStorage.removeItem('eam_user');
    localStorage.removeItem('dictionaryHistory');
    sessionStorage.clear();

    // 3. Trigger logout in other tabs
    localStorage.setItem('eam_logout_trigger', Date.now().toString());

    // 4. Clear React state
    setUser(null);
    setToken(null);
    setRefreshToken(null);

    // 5. Navigate immediately — do not wait for backend call
    window.location.href = '/login';

    // 6. Notify backend in the background (fire and forget)
    if (currentToken) {
      fetch(`${API_URL}/auth/logout`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${currentToken}` }
      }).catch(() => {});
    }

    return true;
  };

  // Login with OTP (2FA)
  const loginSendOTP = async (email: string) => {
    setIsLoading(true);
    try {
      const res = await retryFetch(`${API_URL}/auth/login/send-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      });
      const data = await res.json();
      if (!res.ok) {
        return false;
      }
      return true;
    } catch (error: any) {
      console.error('Login send OTP error:', error);
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const loginVerifyOTP = async (email: string, otp: string) => {
    setIsLoading(true);
    try {
      const res = await retryFetch(`${API_URL}/auth/login/verify-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, otp })
      });
      const data = await res.json();
      if (!res.ok) {
        return false;
      }

      const { access_token, refresh_token, user: userData } = data;
      setToken(access_token);
      setUser(userData);
      localStorage.setItem('eam_token', access_token);
      localStorage.setItem('eam_user', JSON.stringify(userData));
      if (refresh_token) {
        setRefreshToken(refresh_token);
        localStorage.setItem('eam_refresh_token', refresh_token);
      }

      router.push(`/dashboard/${userData.role.toLowerCase()}`);
      return true;
    } catch (error: any) {
      console.error('Login verify OTP error:', error);
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const forgotPassword = async (email: string) => {
    setIsLoading(true);
    try {
      const res = await retryFetch(`${API_URL}/auth/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      });
      const data = await res.json();
      if (!res.ok) {
        return false;
      }
      return true;
    } catch (error: any) {
      console.error('Forgot password error:', error);
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const resetPassword = async (email: string, reset_token: string, new_password: string) => {
    setIsLoading(true);
    try {
      const res = await retryFetch(`${API_URL}/auth/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, reset_token, new_password })
      });
      const data = await res.json();
      if (!res.ok) {
        return false;
      }
      return true;
    } catch (error: any) {
      console.error('Reset password error:', error);
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const refreshUser = async () => {
    if (!token) return;
    try {
      const res = await fetch(`${API_URL}/auth/me`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const userData = await res.json();
        setUser(userData);
        localStorage.setItem('eam_user', JSON.stringify(userData));
      }
    } catch (error) {
      console.error('Refresh user error:', error);
    }
  };

  const updateUser = (userData: Partial<User>) => {
    if (!user) return;
    const updatedUser = { ...user, ...userData };
    setUser(updatedUser);
    localStorage.setItem('eam_user', JSON.stringify(updatedUser));
  };

  return (
    <AuthContext.Provider value={{ user, token, register, verifyOTP, login, loginSendOTP, loginVerifyOTP, logout, forgotPassword, resetPassword, updateUser, refreshUser, tryRefreshToken, authFetch, isLoading, isInitialized }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
