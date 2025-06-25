import { create } from 'zustand';
import { User } from 'firebase/auth';

interface Snap {
  id: string;
  url: string;
  caption: string;
  owner: string;
  interests: string[];
  expiresAt: Date;
  createdAt: Date;
}

interface UserData {
  uid: string;
  email: string;
  interests: string[];
}

interface AppState {
  user: User | null;
  userData: UserData | null;
  snaps: Snap[];
  loading: boolean;
  
  // Actions
  setUser: (user: User | null) => void;
  setUserData: (userData: UserData | null) => void;
  setSnaps: (snaps: Snap[]) => void;
  addSnap: (snap: Snap) => void;
  setLoading: (loading: boolean) => void;
  logout: () => void;
}

export const useStore = create<AppState>((set) => ({
  user: null,
  userData: null,
  snaps: [],
  loading: false,

  setUser: (user) => set({ user }),
  setUserData: (userData) => set({ userData }),
  setSnaps: (snaps) => set({ snaps }),
  addSnap: (snap) => set((state) => ({ snaps: [snap, ...state.snaps] })),
  setLoading: (loading) => set({ loading }),
  logout: () => set({ user: null, userData: null, snaps: [] }),
})); 