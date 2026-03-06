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
  register: (name: string, email: string, password: string, role: string) => Promise<boolean>;
  verifyOTP: (email: string, otp: string) => Promise<boolean>;
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => void;
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

  const register = async (name: string, email: string, password: string, role: string) => {
    setIsLoading(true);
    try {
      const res = await fetch(`${API_URL}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password, role })
      });
      const data = await res.json();
      if (!res.ok) {
        alert(data.detail || 'Registration failed');
        return false;
      }
      alert('Registration successful! Check your email for OTP.');
      return true;
    } catch (error) {
      console.error('Register error:', error);
      alert('Failed to register. Please try again.');
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const verifyOTP = async (email: string, otp: string) => {
    setIsLoading(true);
    try {
      const res = await fetch(`${API_URL}/auth/verify-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, otp })
      });
      const data = await res.json();
      if (!res.ok) {
        alert(data.detail || 'OTP verification failed');
        return false;
      }
      alert('Account verified! You can now login.');
      return true;
    } catch (error) {
      console.error('OTP verify error:', error);
      alert('Failed to verify OTP. Please try again.');
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const login = async (email: string, password: string) => {
    setIsLoading(true);
    try {
      const res = await fetch(`${API_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });
      const data = await res.json();
      if (!res.ok) {
        alert(data.detail || 'Login failed');
        return false;
      }

      const { access_token, user: userData } = data;
      setToken(access_token);
      setUser(userData);
      localStorage.setItem('eam_token', access_token);
      localStorage.setItem('eam_user', JSON.stringify(userData));
      
      router.push(`/dashboard/${userData.role.toLowerCase()}`);
      return true;
    } catch (error) {
      console.error('Login error:', error);
      alert('Failed to login. Please try again.');
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    localStorage.removeItem('eam_token');
    localStorage.removeItem('eam_user');
    router.push('/login');
  };

  const forgotPassword = async (email: string) => {
    setIsLoading(true);
    try {
      const res = await fetch(`${API_URL}/auth/forgot-password?email=${encodeURIComponent(email)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      const data = await res.json();
      if (!res.ok) {
        alert(data.detail || 'Failed to send reset email');
        return false;
      }
      alert(data.message);
      return true;
    } catch (error) {
      console.error('Forgot password error:', error);
      alert('Failed to send reset email. Please try again.');
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthContext.Provider value={{ user, token, register, verifyOTP, login, logout, forgotPassword, isLoading, isInitialized }}>
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
