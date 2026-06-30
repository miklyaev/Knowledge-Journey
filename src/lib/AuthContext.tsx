"use client";

import React, { createContext, useContext, useState, useEffect } from 'react';

interface AuthContextType {
  user: string | null;
  allUsers: string[];
  login: (nickname: string, password: string, description?: string) => Promise<{ success: boolean; error?: string; requiresDescription?: boolean }>;
  logout: () => void;
  refreshUsers: () => Promise<void>;
}
const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<string | null>(null);
  const [allUsers, setAllUsers] = useState<string[]>([]);

  const refreshUsers = async () => {
    try {
      const res = await fetch('/api/auth');
      const data = await res.json();
      setAllUsers(data.users || []);
    } catch (e) {
      console.error("Failed to fetch users", e);
    }
  };

  useEffect(() => {
    const savedUser = localStorage.getItem('kj_user');
    if (savedUser) setUser(savedUser);
    refreshUsers();
  }, []);

  const login = async (nickname: string, password: string, description?: string) => {
    try {
      const res = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nickname, password, description }),
      });
      const data = await res.json();
      if (res.ok) {
        if (data.requiresDescription) {
          return { success: false, requiresDescription: true };
        }
        setUser(data.nickname);
        localStorage.setItem('kj_user', data.nickname);
        await refreshUsers();
        return { success: true };
      }
      return { success: false, error: data.error };
    } catch (e) {
      return { success: false, error: 'Ошибка соединения' };
    }
  };
  const logout = () => {
    setUser(null);
    localStorage.removeItem('kj_user');
  };

  return (
    <AuthContext.Provider value={{ user, allUsers, login, logout, refreshUsers }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
};
