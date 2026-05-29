// Stores panadapter pixel arrays for each auxiliary device.
// Updated by the 0x40 Rx2DisplayFrame WebSocket handler.

import { create } from 'zustand';

interface Rx2Meters {
  signalDbm: number;
  adcPeakDb: number;
  agcGainDb: number;
}

interface Rx2DisplayState {
  // pixels[devIndex] = Float32Array of dBm values (one per FFT bin)
  pixels: Map<number, Float32Array>;
  meters: Map<number, Rx2Meters>;

  setPixels: (devIndex: number, pixels: Float32Array) => void;
  setMeters: (devIndex: number, m: Rx2Meters) => void;
}

export const useRx2DisplayStore = create<Rx2DisplayState>((set) => ({
  pixels: new Map(),
  meters: new Map(),

  setPixels: (devIndex, pixels) =>
    set((s) => {
      const next = new Map(s.pixels);
      next.set(devIndex, pixels);
      return { pixels: next };
    }),

  setMeters: (devIndex, m) =>
    set((s) => {
      const next = new Map(s.meters);
      next.set(devIndex, m);
      return { meters: next };
    }),
}));
