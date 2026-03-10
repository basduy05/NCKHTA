"use client";
import React, { createContext, useContext, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

type User = {
  id: number;
  email: string;
  role: 'student' | 'teacher' | 'admin';
  name: string;
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

  useEffect(() => {
    const storedToken = localStorage.getItem('eam_token');
    const storedUser = localStorage.getItem('eam_user');
    if (storedToken && storedUser) {
      setToken(storedToken);
      setUser(JSON.parse(storedUser));
    }
    setIsInitialized(true);
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
        if (i < maxRetries) await new Promise(r => setTimeout(r, 1500));
      }
    }
    throw lastErr;
  }

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

  const logout = async (showConfirm: boolean = true) => {
    if (showConfirm) {
      const confirmed = window.confirm("Bạn có chắc chắn muốn đăng xuất?");
      if (!confirmed) return false;
    }
    setUser(null);
    setToken(null);
    localStorage.removeItem('eam_token');
    localStorage.removeItem('eam_user');
    router.push('/login');
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
      const res = await retryFetch(`${API_URL}/auth/forgot-password?email=${encodeURIComponent(email)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
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

  return (
    <AuthContext.Provider value={{ user, token, register, verifyOTP, login, loginSendOTP, loginVerifyOTP, logout, forgotPassword, isLoading, isInitialized }}>
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
