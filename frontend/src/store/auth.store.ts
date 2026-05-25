import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { IUser, ITenant } from '../shared/types';

interface AuthState {
  user: IUser | null;
  tenant: ITenant | null;
  accessToken: string | null;
  isAuthenticated: boolean;

  setAuth: (user: IUser, tenant: ITenant, accessToken: string) => void;
  setAccessToken: (token: string) => void;
  updateUser: (user: Partial<IUser>) => void;
  updateTenant: (tenant: Partial<ITenant>) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      tenant: null,
      accessToken: null,
      isAuthenticated: false,

      setAuth: (user, tenant, accessToken) =>
        set({ user, tenant, accessToken, isAuthenticated: true }),

      setAccessToken: (accessToken) => set({ accessToken }),

      updateUser: (updates) =>
        set((state) => ({
          user: state.user ? { ...state.user, ...updates } : null,
        })),

      updateTenant: (updates) =>
        set((state) => ({
          tenant: state.tenant ? { ...state.tenant, ...updates } : null,
        })),

      logout: () =>
        set({ user: null, tenant: null, accessToken: null, isAuthenticated: false }),
    }),
    {
      name: 'bizzw-auth',
      partialize: (state) => ({
        user: state.user,
        tenant: state.tenant,
        accessToken: state.accessToken,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);
