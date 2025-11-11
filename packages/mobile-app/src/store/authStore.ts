import { create } from 'zustand';

export type UserRole = 'MENOR' | 'RESPONSAVEL' | 'ADULTO' | 'VENDEDOR' | 'ADMIN';

export interface AuthenticatedUser {
  id: string;
  email: string;
  nome: string;
  role: UserRole;
  isKycVerified: boolean;
  responsavelId: string | null;
  parentLinkCode: string | null;
  parentLinkCodeExpiresAt: string | null;
  requiresParentalLink: boolean;
}

export interface AuthPayload {
  accessToken: string;
  user: AuthenticatedUser;
}

interface AuthState {
  token: string | null;
  user: AuthenticatedUser | null;
  setAuth: (payload: AuthPayload) => void;
  clearAuth: () => void;
  updateUser: (userPatch: Partial<AuthenticatedUser>) => void;
}

const useAuthStore = create<AuthState>((set) => ({
  token: null,
  user: null,
  setAuth: (payload) => set({ token: payload.accessToken, user: payload.user }),
  clearAuth: () => set({ token: null, user: null }),
  updateUser: (userPatch) =>
    set((state) => ({
      user: state.user ? { ...state.user, ...userPatch } : state.user,
    })),
}));

export default useAuthStore;
