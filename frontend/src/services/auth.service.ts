import { api } from '@/lib/api';
import type { User } from '@shared/types';

export interface AuthUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  phone?: string;
  avatar?: string;
  authProvider?: 'email' | 'google' | 'phone';
}

export interface AuthResponse {
  user: AuthUser;
  accessToken: string;
  refreshToken: string;
}

export const authService = {
  async register(data: { email: string; password: string; firstName: string; lastName: string }): Promise<AuthResponse> {
    const response = await api.post('/auth/register', data);
    return response.data.data as AuthResponse;
  },

  async login(data: { email: string; password: string }): Promise<AuthResponse> {
    const response = await api.post('/auth/login', data);
    return response.data.data as AuthResponse;
  },

  async googleLogin(credential: string): Promise<AuthResponse> {
    const response = await api.post('/auth/google', { credential });
    return response.data.data as AuthResponse;
  },

  async requestOtp(phone: string): Promise<{ sent: boolean; resendInSeconds: number }> {
    const response = await api.post('/auth/otp/request', { phone });
    return response.data.data as { sent: boolean; resendInSeconds: number };
  },

  async verifyOtp(phone: string, otp: string): Promise<AuthResponse> {
    const response = await api.post('/auth/otp/verify', { phone, otp });
    return response.data.data as AuthResponse;
  },

  async logout(): Promise<void> {
    try {
      await api.post('/auth/logout', {});
    } catch {
      // Ignore logout network errors - session is cleared client-side regardless
    }
  },

  async forgotPassword(email: string): Promise<void> {
    await api.post('/auth/forgot-password', { email });
  },

  async resetPassword(token: string, password: string): Promise<void> {
    await api.post(`/auth/reset-password/${encodeURIComponent(token)}`, { password });
  },

  async getMe(): Promise<User> {
    const response = await api.get('/auth/me');
    return response.data.data as User;
  },

  async updateProfile(data: Partial<User>): Promise<User> {
    const response = await api.put('/auth/update-profile', data);
    return response.data.data as User;
  },

  async changePassword(currentPassword: string, newPassword: string): Promise<void> {
    await api.put('/auth/change-password', { currentPassword, newPassword });
  },

  async getProfile(): Promise<User> {
    const response = await api.get('/users/profile');
    return response.data.data as User;
  },

  async updateUserProfile(data: { firstName?: string; lastName?: string; phone?: string; dateOfBirth?: Date; gender?: string }): Promise<User> {
    const response = await api.put('/users/profile', data);
    return response.data.data as User;
  },

  async changeUserPassword(currentPassword: string, newPassword: string): Promise<void> {
    await api.put('/users/change-password', { currentPassword, newPassword });
  },

  async deleteAccount(): Promise<void> {
    await api.delete('/users/account');
  },

  async addAddress(address: Omit<User['addresses'][number], 'id'>): Promise<User['addresses']> {
    const response = await api.post('/users/addresses', address);
    return response.data.data as User['addresses'];
  },

  async updateAddress(addressId: string, address: Partial<User['addresses'][number]>): Promise<User['addresses']> {
    const response = await api.put(`/users/addresses/${addressId}`, address);
    return response.data.data as User['addresses'];
  },

  async deleteAddress(addressId: string): Promise<void> {
    await api.delete(`/users/addresses/${addressId}`);
  },

  async setDefaultAddress(addressId: string): Promise<User['addresses']> {
    const response = await api.put(`/users/addresses/${addressId}/default`);
    return response.data.data as User['addresses'];
  },

  async updatePreferences(preferences: Partial<User['preferences']>): Promise<User['preferences']> {
    const response = await api.put('/users/preferences', preferences);
    return response.data.data as User['preferences'];
  },
};
