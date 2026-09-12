import { create } from 'zustand';
import { checkNetworkTargetWithBackend } from '../features/security/airgapSentinel';

export interface AirgapState {
  status: 'verified' | 'violation' | 'checking';
  lastAuditTimestamp: number | null;
  violations: string[];
  auditedEndpoints: string[];

  // Actions
  verifyEndpoint: (url: string) => Promise<boolean>;
  runSelfCheck: () => Promise<boolean>;
  reset: () => void;
}

const DEFAULT_ENDPOINTS = [
  'http://localhost:11434',
  'http://127.0.0.1:11434',
  'http://127.0.0.1:1420',
];

export const useAirgapStore = create<AirgapState>((set, get) => ({
  status: 'verified',
  lastAuditTimestamp: Date.now(),
  violations: [],
  auditedEndpoints: [...DEFAULT_ENDPOINTS],

  verifyEndpoint: async (url: string) => {
    const result = await checkNetworkTargetWithBackend(url);
    if (!result.allowed) {
      set((state) => ({
        status: 'violation',
        violations: Array.from(new Set([...state.violations, `${url}: ${result.reason}`])),
        lastAuditTimestamp: Date.now(),
      }));
      return false;
    }

    set((state) => ({
      auditedEndpoints: Array.from(new Set([...state.auditedEndpoints, url])),
      lastAuditTimestamp: Date.now(),
    }));
    return true;
  },

  runSelfCheck: async () => {
    set({ status: 'checking' });
    const currentEndpoints = get().auditedEndpoints;
    const detectedViolations: string[] = [];

    for (const ep of currentEndpoints) {
      const res = await checkNetworkTargetWithBackend(ep);
      if (!res.allowed) {
        detectedViolations.push(`${ep}: ${res.reason}`);
      }
    }

    if (detectedViolations.length > 0) {
      set({
        status: 'violation',
        violations: detectedViolations,
        lastAuditTimestamp: Date.now(),
      });
      return false;
    }

    set({
      status: 'verified',
      violations: [],
      lastAuditTimestamp: Date.now(),
    });
    return true;
  },

  reset: () => {
    set({
      status: 'verified',
      lastAuditTimestamp: Date.now(),
      violations: [],
      auditedEndpoints: [...DEFAULT_ENDPOINTS],
    });
  },
}));
