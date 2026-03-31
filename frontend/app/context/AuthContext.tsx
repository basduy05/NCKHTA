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
};

type AuthContextType = {
  user: User | null;
  token: string | null;
  register: (name: string, email: string, password: string, role: string, phone?: string) => Promise<boolean>;
  verifyOTP: (email: string, otp: string) => Promise<boolean>;
  login: (email: string, password: string) => Promise<boolean>;
  loginSendOTP: (email: string) => Promise<boolean>;
  loginVerifyOTP: (email: string, otp: string) => Promise<boolean>;
  logout: (showConfirm?: boolean) => Promise<boolean>;
  forgotPassword: (email: string) => Promise<boolean>;
  resetPassword: (email: string, token: string, newPassword: string) => Promise<boolean>;
  updateUser: (userData: Partial<User>) => void;
  refreshUser: () => Promise<void>;
  authFetch: (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;
  isLoading: boolean;
  isInitialized: boolean;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const API_URL = process.env.NEXT_PUBLIC_API_URL || "https://iedu-ksk7.onrender.com";

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  const router = useRouter();
  const { showConfirm } = useNotification();

  useEffect(() => {
    const storedToken = localStorage.getItem('eam_token');
    const storedUser = localStorage.getItem('eam_user');
    if (storedToken && storedUser) {
      setToken(storedToken);
      setUser(JSON.parse(storedUser));
    }
    setIsInitialized(true);

    // Sync logout across tabs
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'eam_logout_trigger') {
        window.location.href = '/login';
      }
    };
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

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
        // If the request was aborted, don't retry - it was intentional
        if (err.name === 'AbortError') throw err;
        if (i < maxRetries) await new Promise(r => setTimeout(r, 1500));
      }
    }
    throw lastErr;
  }

  const authFetch = async (input: RequestInfo | URL, init: RequestInit = {}) => {
    const headers = new Headers(init.headers);
    if (token) {
      headers.set("Authorization", `Bearer ${token}`);
    }
    
    // Automatically set Content-Type for JSON if not provided and body exists
    if (!headers.has("Content-Type") && init.body && !(init.body instanceof FormData)) {
      headers.set("Content-Type", "application/json");
    }

    try {
      const resp = await fetch(input, { ...init, headers });
      
      if (resp.status === 401) {
        console.warn("[AUTH] Received 401 Unauthorized. Clearing session...");
        // Auto logout if unauthorized (session expired or invalid token)
        logout(false);
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

      const { access_token, user: userData } = data;
      setToken(access_token);
      setUser(userData);
      localStorage.setItem('eam_token', access_token);
      localStorage.setItem('eam_user', JSON.stringify(userData));

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
    
    setIsLoading(true);
    try {
      // 1. Notify backend if we have a token
      if (token) {
        await fetch(`${API_URL}/auth/logout`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` }
        }).catch(err => console.warn("[AUTH] Backend logout failed:", err));
      }
    } finally {
      // 2. Clear local state
      setUser(null);
      setToken(null);
      
      // 3. Clear all storage
      localStorage.removeItem('eam_token');
      localStorage.removeItem('eam_user');
      localStorage.removeItem('dictionaryHistory'); // Clear app-specific data
      sessionStorage.clear(); // Clear all session data (like tips dismissed state)
      
      // 4. Trigger logout in other tabs
      localStorage.setItem('eam_logout_trigger', Date.now().toString());
      
      setIsLoading(false);
      
      // 5. Force full reload for clean state
      window.location.href = '/login';
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

      const { access_token, user: userData } = data;
      setToken(access_token);
      setUser(userData);
      localStorage.setItem('eam_token', access_token);
      localStorage.setItem('eam_user', JSON.stringify(userData));

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
    <AuthContext.Provider value={{ user, token, register, verifyOTP, login, loginSendOTP, loginVerifyOTP, logout, forgotPassword, resetPassword, updateUser, refreshUser, authFetch, isLoading, isInitialized }}>
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
