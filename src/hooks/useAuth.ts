import { create } from 'zustand';
import type { User } from '@/types/database';

interface AuthState {
  isAuthenticated: boolean;
  user: User | null;
  isLoading: boolean;
  login: (username: string, password: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
  checkSession: () => Promise<void>;
}

export const useAuth = create<AuthState>((set) => ({
  isAuthenticated: false,
  user: null,
  isLoading: true,

  login: async (username: string, password: string) => {
    try {
      const result = await window.api.auth.login(username, password);
      if (result.success && result.data) {
        set({
          isAuthenticated: true,
          user: result.data.user,
        });
        sessionStorage.setItem('agc_session', result.data.token);
        return { success: true };
      }
      return { success: false, error: result.error || 'Login failed' };
    } catch (error: any) {
      return { success: false, error: error.message };
    }
  },

  logout: () => {
    set({ isAuthenticated: false, user: null });
    sessionStorage.removeItem('agc_session');
  },

  checkSession: async () => {
    try {
      const result = await window.api.auth.checkSession();
      if (result.success && result.data) {
        set({
          isAuthenticated: true,
          user: result.data.user,
          isLoading: false,
        });
      } else {
        set({ isAuthenticated: false, user: null, isLoading: false });
      }
    } catch {
      set({ isAuthenticated: false, user: null, isLoading: false });
    }
  },
}));
