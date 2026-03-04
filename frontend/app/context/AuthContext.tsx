"use client";
import React, { createContext, useContext, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

type User = {
  email: string;
  role: 'student' | 'teacher' | 'admin';
  name: string;
};

type AuthContextType = {
  user: User | null;
  login: (email: string, pass: string, role: string) => Promise<boolean>;
  logout: () => void;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const router = useRouter();

  useEffect(() => {
    // Kiem tra session trong localStorage khi load trang
    const storedUser = localStorage.getItem('eam_user');
    if (storedUser) {
      setUser(JSON.parse(storedUser));
    }
  }, []);

  const login = async (email: string, pass: string, role: string) => {
    // Giả lập API Login: Ở đây sau này sẽ gọi fetch('http://localhost:8080/api/auth/login')
    // Hiện tại cho phép đăng nhập thành công với mọi email và password nhập vào
    if (email && pass) {
      const newUser: User = {
        email,
        role: role as any,
        name: email.split('@')[0],
      };
      
      setUser(newUser);
      localStorage.setItem('eam_user', JSON.stringify(newUser));
      
      // Chuyển hướng tới trang dashboard tương ứng với role
      router.push(`/dashboard/${role}`);
      return true;
    }
    return false;
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('eam_user');
    router.push('/login');
  };

  return (
    <AuthContext.Provider value={{ user, login, logout }}>
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
