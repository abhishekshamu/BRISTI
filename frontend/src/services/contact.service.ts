import { api } from '@/lib/api';
import type { ContactMessage } from '@shared/types';

export const contactService = {
  async send(data: { name: string; email: string; phone?: string; subject: string; message: string }): Promise<ContactMessage> {
    const response = await api.post('/contact', data);
    return response.data.data as ContactMessage;
  },
};
