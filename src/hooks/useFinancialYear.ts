import { create } from 'zustand';
import type { FinancialYear } from '@/types/database';

interface FinancialYearState {
  activeYear: FinancialYear | null;
  years: FinancialYear[];
  isLoading: boolean;
  fetchYears: () => Promise<void>;
  setActiveYear: (id: number) => Promise<{ success: boolean; error?: string }>;
  createYear: (data: { name: string; startDate: string; endDate: string; setActive?: boolean }) => Promise<{ success: boolean; error?: string }>;
}

export const useFinancialYear = create<FinancialYearState>((set, get) => ({
  activeYear: null,
  years: [],
  isLoading: true,

  fetchYears: async () => {
    try {
      set({ isLoading: true });
      const [allRes, activeRes] = await Promise.all([
        window.api.db.financialYears.getAll(),
        window.api.db.financialYears.getActive(),
      ]);

      const years = allRes.success && allRes.data ? allRes.data : [];
      const activeYear = activeRes.success && activeRes.data ? activeRes.data : null;

      set({ years, activeYear, isLoading: false });
    } catch {
      set({ isLoading: false });
    }
  },

  setActiveYear: async (id: number) => {
    try {
      const res = await window.api.db.financialYears.setActive(id);
      if (res.success && res.data) {
        set((state) => ({
          activeYear: res.data!,
          years: state.years.map((y) => ({
            ...y,
            is_active: y.id === id,
          })),
        }));
        return { success: true };
      }
      return { success: false, error: res.error || 'Failed to switch financial year' };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  },

  createYear: async (data) => {
    try {
      const res = await window.api.db.financialYears.create(data);
      if (res.success && res.data) {
        await get().fetchYears();
        return { success: true };
      }
      return { success: false, error: res.error || 'Failed to create financial year' };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  },
}));
