import { create } from 'zustand';
import { ClaimObject, ClaimStatus } from '@/types/claim';

interface ClaimStore {
  // Active claim being filed
  activeClaim: ClaimObject | null;
  setActiveClaim: (claim: ClaimObject | null) => void;
  updateActiveClaim: (partial: Partial<ClaimObject>) => void;

  // Dashboard claims list
  claims: ClaimObject[];
  setClaims: (claims: ClaimObject[]) => void;
  upsertClaim: (claim: ClaimObject) => void;

  // Selected claim in dashboard
  selectedClaimId: string | null;
  setSelectedClaimId: (id: string | null) => void;

  // Model stats (Pioneer)
  modelVersion: string;
  claimsTrainedOn: number;
  setModelStats: (version: string, count: number) => void;

  // Processing transcript stream
  liveTranscript: string;
  setLiveTranscript: (text: string) => void;
  appendTranscript: (chunk: string) => void;

  // User identity (persisted after first claim)
  savedUser: { name: string; email: string; policy_number: string; insurer: string } | null;
  setSavedUser: (user: ClaimStore['savedUser']) => void;
}

export const useClaimStore = create<ClaimStore>((set, get) => ({
  activeClaim: null,
  setActiveClaim: (claim) => set({ activeClaim: claim }),
  updateActiveClaim: (partial) =>
    set((state) =>
      state.activeClaim
        ? { activeClaim: { ...state.activeClaim, ...partial } }
        : state
    ),

  claims: [],
  setClaims: (claims) => set({ claims }),
  upsertClaim: (claim) =>
    set((state) => {
      const idx = state.claims.findIndex((c) => c.id === claim.id);
      if (idx >= 0) {
        const next = [...state.claims];
        next[idx] = claim;
        return { claims: next };
      }
      return { claims: [claim, ...state.claims] };
    }),

  selectedClaimId: null,
  setSelectedClaimId: (id) => set({ selectedClaimId: id }),

  modelVersion: '1.0.0',
  claimsTrainedOn: 0,
  setModelStats: (version, count) => set({ modelVersion: version, claimsTrainedOn: count }),

  liveTranscript: '',
  setLiveTranscript: (text) => set({ liveTranscript: text }),
  appendTranscript: (chunk) =>
    set((state) => ({ liveTranscript: state.liveTranscript + chunk })),

  savedUser: null,
  setSavedUser: (user) => set({ savedUser: user }),
}));
