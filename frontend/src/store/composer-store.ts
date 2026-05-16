import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface ComposerState {
  selectedPlatforms: string[];
  activePlatform: string | null;
  togglePlatform: (platformId: string) => void;
  setActivePlatform: (platformId: string | null) => void;
  reset: () => void;
}

export const useComposerStore = create<ComposerState>()(
  persist(
    (set, get) => ({
      selectedPlatforms: [],
      activePlatform: null,
      togglePlatform: (platformId: string) => {
        const current = get().selectedPlatforms;
        const active = get().activePlatform;
        if (current.includes(platformId)) {
          const next = current.filter((p) => p !== platformId);
          set({ selectedPlatforms: next });
          if (active === platformId) {
            set({ activePlatform: next[0] || null });
          }
        } else {
          set({ selectedPlatforms: [...current, platformId] });
          set({ activePlatform: platformId });
        }
      },
      setActivePlatform: (platformId: string | null) => {
        set({ activePlatform: platformId });
      },
      reset: () => {
        set({ selectedPlatforms: [], activePlatform: null });
      }
    }),
    {
      name: 'composer-storage',
      partialize: (state) => ({ 
        selectedPlatforms: state.selectedPlatforms, 
        activePlatform: state.activePlatform
      }),
    }
  )
);
