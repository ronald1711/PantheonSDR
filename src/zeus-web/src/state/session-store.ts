// PantheonSDR multi-device session state store.

import { create } from 'zustand';

export interface AttachedDevice {
  deviceId: string;
  friendlyName: string;
  role: 'Primary' | 'Auxiliary';
  capabilityFlags: number;
  canTransmit: boolean;
  wdspChannelId: number;
  frequencyHz: number;
  freqSync: 'Independent' | 'FollowPrimary' | 'FollowPrimaryWithOffset';
  freqSyncOffsetHz: number;
  audioRoute: 'Left' | 'Right' | 'MonoMix' | 'Mute';
  isEnabled: boolean;
}

export interface DiscoveredDevice {
  deviceId: string;
  friendlyName: string;
  protocol: string;
  capabilityFlags: number;
  canTransmit: boolean;
  minFrequencyHz: number;
  maxFrequencyHz: number;
}

interface SessionState {
  primary: AttachedDevice | null;
  auxiliaries: AttachedDevice[];
  isMoxActive: boolean;
  discovered: DiscoveredDevice[];
  isDiscovering: boolean;

  // Actions
  setSessionFromServer: (primary: AttachedDevice | null, aux: AttachedDevice[], mox: boolean) => void;
  setDiscovered: (devices: DiscoveredDevice[]) => void;
  setDiscovering: (v: boolean) => void;
  updateAuxDisplay: (devIndex: number, frequencyHz: number) => void;
}

export const useSessionStore = create<SessionState>((set) => ({
  primary: null,
  auxiliaries: [],
  isMoxActive: false,
  discovered: [],
  isDiscovering: false,

  setSessionFromServer: (primary, auxiliaries, isMoxActive) =>
    set({ primary, auxiliaries, isMoxActive }),

  setDiscovered: (discovered) => set({ discovered }),

  setDiscovering: (isDiscovering) => set({ isDiscovering }),

  updateAuxDisplay: (devIndex, frequencyHz) =>
    set((s) => {
      const next = [...s.auxiliaries];
      if (next[devIndex]) next[devIndex] = { ...next[devIndex], frequencyHz };
      return { auxiliaries: next };
    }),
}));
