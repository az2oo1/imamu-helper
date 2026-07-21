'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';

export interface NativeUser {
  uid: string;
  email: string;
  getIdToken: () => Promise<string>;
  accessToken?: string;
  displayName?: string;
}

interface AuthContextType {
  user: NativeUser | null;
  dbUser: any | null; // Database user
  loading: boolean;
  signInWithEmail: (email: string, pass: string) => Promise<void>;
  signUpWithEmail: (email: string, pass: string, phone: string, userName: string, code: string) => Promise<void>;
  signOut: () => Promise<void>;
  refreshToken: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  dbUser: null,
  loading: true,
  signInWithEmail: async () => {},
  signUpWithEmail: async () => {},
  signOut: async () => {},
  refreshToken: async () => {},
});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider: React.FC<{children: React.ReactNode}> = ({ children }) => {
  const [user, setUser] = useState<NativeUser | null>(null);
  const [dbUser, setDbUser] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchDbUser = async (u: NativeUser) => {
    try {
      const token = await u.getIdToken();
      // Fetch User Profile
      const res = await fetch('/api/users/me', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setDbUser(data);
      }
    } catch(e) { console.error('Failed to fetch db user', e); }
  };

  useEffect(() => {
    const init = async () => {
      const savedToken = localStorage.getItem('token');
      const savedEmail = localStorage.getItem('user_email');
      const savedUid = localStorage.getItem('user_uid');
      if (savedToken && savedEmail && savedUid) {
        const u: NativeUser = {
          uid: savedUid,
          email: savedEmail,
          getIdToken: async () => savedToken,
          accessToken: savedToken,
          displayName: savedEmail.split('@')[0],
        };
        setUser(u);
        await fetchDbUser(u);
      }
      setLoading(false);
    };
    init();
  }, []);

  const signInWithEmail = async (email: string, pass: string) => {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password: pass })
    });
    
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Failed to login');
    }
    
    const data = await res.json();
    localStorage.setItem('token', data.token);
    localStorage.setItem('user_email', data.user.email);
    localStorage.setItem('user_uid', data.user.uid);
    const u: NativeUser = {
      uid: data.user.uid,
      email: data.user.email,
      getIdToken: async () => data.token,
      accessToken: data.token,
      displayName: data.user.email.split('@')[0],
    };
    setUser(u);
    setDbUser(data.user);
  };

  const signUpWithEmail = async (email: string, pass: string, phone: string, userName: string, code: string) => {
    const res = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password: pass, phone, userName, code })
    });
    
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Failed to register');
    }
    
    const data = await res.json();
    localStorage.setItem('token', data.token);
    localStorage.setItem('user_email', data.user.email);
    localStorage.setItem('user_uid', data.user.uid);
    const u: NativeUser = {
      uid: data.user.uid,
      email: data.user.email,
      getIdToken: async () => data.token,
      accessToken: data.token,
      displayName: data.user.email.split('@')[0],
    };
    setUser(u);
    setDbUser(data.user);
  };

  const signOut = async () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user_email');
    localStorage.removeItem('user_uid');
    setUser(null);
    setDbUser(null);
  };

  const refreshToken = async () => {
    if (user) await fetchDbUser(user);
  };

  return (
    <AuthContext.Provider value={{ user, dbUser, loading, signInWithEmail, signUpWithEmail, signOut, refreshToken }}>
      {children}
    </AuthContext.Provider>
  );
}
