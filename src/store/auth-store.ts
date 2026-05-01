import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { UserProfile } from '@/types/profile';

interface AuthStore {
  profile: UserProfile | null;
  setProfile: (p: UserProfile | null) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthStore>()(
  persist(
    (set) => ({
      profile: null,
      setProfile: (p) => set({ profile: p }),
      logout: ()   => set({ profile: null }),
    }),
    { name: 'oracle-auth' },
  ),
);
