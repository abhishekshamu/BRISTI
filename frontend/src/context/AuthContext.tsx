import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { authService, type AuthUser } from '@/services/auth.service';
import { AUTH_EXPIRED_EVENT } from '@/lib/api';
import { getErrorMessage } from '@/lib/utils';
import type { User } from '@shared/types';

interface AuthContextValue {
  user: AuthUser | null;
  profile: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  googleLogin: (credential: string) => Promise<void>;
  requestOtp: (phone: string) => Promise<{ sent: boolean; resendInSeconds: number }>;
  verifyOtp: (phone: string, otp: string) => Promise<void>;
  register: (data: { email: string; password: string; firstName: string; lastName: string }) => Promise<void>;
  logout: () => Promise<void>;
  updateUser: (user: AuthUser) => void;
  setProfile: (profile: User | null) => void;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [profile, setProfileState] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const queryClient = useQueryClient();

  const syncProfile = useCallback(async () => {
    try {
      const [authUser, fullProfile] = await Promise.all([authService.getMe(), authService.getProfile()]);
      setProfileState(fullProfile);
      setUser({
        id: String(fullProfile._id ?? authUser._id),
        email: fullProfile.email ?? authUser.email ?? '',
        firstName: fullProfile.firstName ?? authUser.firstName,
        lastName: fullProfile.lastName ?? authUser.lastName,
        role: fullProfile.role ?? authUser.role,
      });
    } catch (error) {
      const status = (error as { response?: { status?: number } })?.response?.status;
      if (status === 401) {
        setUser(null);
        setProfileState(null);
      }
    }
  }, []);

  useEffect(() => {
    syncProfile().finally(() => setIsLoading(false));
  }, [syncProfile]);

  useEffect(() => {
    const onAuthExpired = () => {
      setUser(null);
      setProfileState(null);
      queryClient.clear();
    };
    window.addEventListener(AUTH_EXPIRED_EVENT, onAuthExpired);
    return () => window.removeEventListener(AUTH_EXPIRED_EVENT, onAuthExpired);
  }, [queryClient]);

  const login = useCallback(async (email: string, password: string) => {
    const response = await authService.login({ email, password });
    setUser(response.user);
    await authService.getProfile().then(setProfileState).catch(() => undefined);
  }, []);

  const googleLogin = useCallback(async (credential: string) => {
    const response = await authService.googleLogin(credential);
    setUser(response.user);
    await authService.getProfile().then(setProfileState).catch(() => undefined);
  }, []);

  const requestOtp = useCallback((phone: string) => authService.requestOtp(phone), []);

  const verifyOtp = useCallback(async (phone: string, otp: string) => {
    const response = await authService.verifyOtp(phone, otp);
    setUser(response.user);
    await authService.getProfile().then(setProfileState).catch(() => undefined);
  }, []);

  const register = useCallback(async (data: { email: string; password: string; firstName: string; lastName: string }) => {
    const response = await authService.register(data);
    setUser(response.user);
    await authService.getProfile().then(setProfileState).catch(() => undefined);
  }, []);

  const logout = useCallback(async () => {
    await authService.logout();
    setUser(null);
    setProfileState(null);
    queryClient.clear();
  }, [queryClient]);

  const updateUser = useCallback((next: AuthUser) => setUser(next), []);
  const setProfile = useCallback((next: User | null) => setProfileState(next), []);

  const refreshProfile = useCallback(async () => {
    try {
      const fullProfile = await authService.getProfile();
      setProfileState(fullProfile);
      if (fullProfile) {
        setUser((prev) =>
          prev
            ? {
                ...prev,
                firstName: fullProfile.firstName ?? prev.firstName,
                lastName: fullProfile.lastName ?? prev.lastName,
                email: fullProfile.email ?? prev.email,
              }
            : prev,
        );
      }
    } catch (error) {
      throw new Error(getErrorMessage(error));
    }
  }, []);

  const value = useMemo(
    () => ({
      user,
      profile,
      isLoading,
      isAuthenticated: Boolean(user),
      login,
      googleLogin,
      requestOtp,
      verifyOtp,
      register,
      logout,
      updateUser,
      setProfile,
      refreshProfile,
    }),
    [user, profile, isLoading, login, googleLogin, requestOtp, verifyOtp, register, logout, updateUser, setProfile, refreshProfile],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within an AuthProvider');
  return context;
}
