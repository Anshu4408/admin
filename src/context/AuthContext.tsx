import React, { createContext, useContext, useState, useEffect } from 'react';
import type { AdminSessionUser } from '../types';
import { api } from '../lib/api';

interface AuthContextType {
  admin: AdminSessionUser | null;
  token: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  isSuperAdmin: boolean;
  canManageUsers: boolean;
  canManageTeams: boolean;
  canManagePayments: boolean;
  canManageAdmins: boolean;
  loginWithGoogle: (credential: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshAdmin: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [admin, setAdmin] = useState<AdminSessionUser | null>(() => {
    const saved = localStorage.getItem('tf_admin_user');
    try { return saved ? JSON.parse(saved) : null; } catch { return null; }
  });
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('tf_admin_token'));
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    const checkAuth = async () => {
      const savedToken = localStorage.getItem('tf_admin_token');
      if (savedToken) {
        try {
          const res = await api.auth.getMe();
          if (res.success && res.data) {
            setAdmin(res.data);
            localStorage.setItem('tf_admin_user', JSON.stringify(res.data));
          } else {
            setAdmin(null);
            setToken(null);
            localStorage.removeItem('tf_admin_token');
            localStorage.removeItem('tf_admin_user');
          }
        } catch {
          setAdmin(null);
          setToken(null);
          localStorage.removeItem('tf_admin_token');
          localStorage.removeItem('tf_admin_user');
        }
      }
      setIsLoading(false);
    };

    checkAuth();
  }, []);

  const loginWithGoogle = async (credential: string) => {
    setIsLoading(true);
    try {
      const res = await api.auth.googleLogin(credential);
      if (res.success && res.data) {
        setToken(res.data.token);
        setAdmin(res.data.admin);
        localStorage.setItem('tf_admin_token', res.data.token);
        localStorage.setItem('tf_admin_user', JSON.stringify(res.data.admin));
      } else {
        throw new Error(res.message || 'Login failed');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    try {
      await api.auth.logout();
    } catch {
      // Ignore logout api errors
    } finally {
      setAdmin(null);
      setToken(null);
      localStorage.removeItem('tf_admin_token');
      localStorage.removeItem('tf_admin_user');
    }
  };

  const refreshAdmin = async () => {
    try {
      const res = await api.auth.getMe();
      if (res.success && res.data) {
        setAdmin(res.data);
        localStorage.setItem('tf_admin_user', JSON.stringify(res.data));
      }
    } catch {
      // Ignore
    }
  };

  const isSuperAdmin = admin?.role === 'superadmin';
  const canManageUsers = isSuperAdmin || !!admin?.can_manage_users;
  const canManageTeams = isSuperAdmin || !!admin?.can_manage_teams;
  const canManagePayments = isSuperAdmin || !!admin?.can_manage_payments;
  const canManageAdmins = isSuperAdmin || !!admin?.can_manage_admins;

  return (
    <AuthContext.Provider
      value={{
        admin,
        token,
        isLoading,
        isAuthenticated: !!admin && !!token,
        isSuperAdmin,
        canManageUsers,
        canManageTeams,
        canManagePayments,
        canManageAdmins,
        loginWithGoogle,
        logout,
        refreshAdmin,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
