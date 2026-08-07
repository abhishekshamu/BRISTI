import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import api from './api';

interface AdminUser {
  _id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  permissions: string[];
}

interface AuthContextType {
  admin: AdminUser | null;
  isAuthenticated: boolean;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  register: (data: any) => Promise<void>;
  updateAdmin: (next: Partial<AdminUser>) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [admin, setAdmin] = useState<AdminUser | null>(null);
  const [loading, setLoading] = useState(true);

  // Restore the session from the httpOnly cookie on boot. The server is the
  // source of truth — localStorage only mirrors display data.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const response = await api.get('/admin/me');
        const data = response.data?.data;
        if (data && !cancelled) {
          setAdmin(data);
          localStorage.setItem('admin_user', JSON.stringify(data));
        }
      } catch {
        // No valid session cookie
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const response = await api.post('/admin/login', { email, password });
    const { admin: adminData } = response.data.data;

    localStorage.setItem('admin_user', JSON.stringify(adminData));
    setAdmin(adminData);
  }, []);

  const logout = useCallback(async () => {
    try {
      await api.post('/admin/logout', {});
    } catch {
      // Cookie may already be gone - clear client state regardless
    }
    localStorage.removeItem('admin_user');
    setAdmin(null);
  }, []);

  const register = useCallback(async (data: any) => {
    const response = await api.post('/admin/register', data);
    const { admin: adminData } = response.data.data;

    localStorage.setItem('admin_user', JSON.stringify(adminData));
    setAdmin(adminData);
  }, []);

  const updateAdmin = useCallback((partial: Partial<AdminUser>) => {
    setAdmin((prev) => {
      if (!prev) return prev;
      const next = { ...prev, ...partial };
      localStorage.setItem('admin_user', JSON.stringify(next));
      return next;
    });
  }, []);

  return (
    <AuthContext.Provider
      value={{
        admin,
        isAuthenticated: !!admin,
        loading,
        login,
        logout,
        register,
        updateAdmin,
      }}
    >
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