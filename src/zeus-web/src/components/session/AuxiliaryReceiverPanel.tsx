// PantheonSDR — controls for one auxiliary receiver device.

import React, { useState } from 'react';
import { type AttachedDevice } from '../../state/session-store';
import { useRx2DisplayStore } from '../../state/rx2-display-store';

interface Props {
  device: AttachedDevice;
  devIndex: number; // 0-based in session.auxiliaries[]
}

const API = (path: string) => `/api${path}`;

async function apiPost(path: string, body: unknown) {
  return fetch(API(path), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

function formatFreq(hz: number) {
  return (hz / 1e6).toFixed(6) + ' MHz';
}

function sMeter(signalDbm: number) {
  // S-unit scale: S9 = -73 dBm; each S-unit = 6 dB
  const s = Math.max(0, Math.min(9, Math.round((signalDbm + 127) / 6)));
  const extra = signalDbm > -73 ? `+${Math.round(signalDbm + 73)} dB` : '';
  return `S${s}${extra}`;
}

const SYNC_OPTIONS: AttachedDevice['freqSync'][] = [
  'Independent', 'FollowPrimary', 'FollowPrimaryWithOffset',
];
const AUDIO_OPTIONS: AttachedDevice['audioRoute'][] = [
  'Left', 'Right', 'MonoMix', 'Mute',
];

export function AuxiliaryReceiverPanel({ device, devIndex }: Props) {
  const meters = useRx2DisplayStore((s) => s.meters.get(devIndex));
  const [freqInput, setFreqInput] = useState('');
  const [busy, setBusy] = useState(false);

  const id = encodeURIComponent(device.deviceId);

  async function setFrequency(e: React.FormEvent) {
    e.preventDefault();
    const hz = Math.round(parseFloat(freqInput) * 1e6);
    if (isNaN(hz)) return;
    setBusy(true);
    await apiPost(`/session/devices/${id}/frequency`, { frequencyHz: hz });
    setBusy(false);
    setFreqInput('');
  }

  async function setSync(policy: string) {
    await apiPost(`/session/devices/${id}/freqsync`, { policy });
  }

  async function setAudio(route: string) {
    await apiPost(`/session/devices/${id}/audio`, { route });
  }

  return (
    <div className="flex flex-col gap-2 p-2 bg-slate-900 rounded text-slate-100 text-xs h-full">
      {/* Header */}
      <div className="flex items-center justify-between">
        <span className="font-semibold truncate text-sm">{device.friendlyName}</span>
        <span className="text-slate-400 ml-2">ch {device.wdspChannelId}</span>
      </div>

      {/* Frequency */}
      <div className="font-mono text-sky-300 text-base text-center py-1">
        {formatFreq(device.frequencyHz)}
      </div>

      {/* S-Meter */}
      {meters && (
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
          <span className="text-green-300 font-mono">{sMeter(meters.signalDbm)}</span>
          <span className="text-slate-400 ml-auto">{meters.signalDbm.toFixed(1)} dBm</span>
        </div>
      )}

      {/* Set frequency */}
      <form onSubmit={setFrequency} className="flex gap-1">
        <input
          type="number"
          step="0.001"
          placeholder="MHz"
          value={freqInput}
          onChange={(e) => setFreqInput(e.target.value)}
          className="flex-1 min-w-0 bg-slate-800 rounded px-2 py-0.5 text-xs
                     border border-slate-600 focus:border-sky-500 outline-none"
        />
        <button type="submit" disabled={busy}
          className="px-2 py-0.5 rounded bg-sky-700 hover:bg-sky-600 disabled:opacity-50">
          Go
        </button>
      </form>

      {/* Freq sync */}
      <div className="flex flex-col gap-0.5">
        <span className="text-slate-400">Freq sync</span>
        <div className="flex gap-1 flex-wrap">
          {SYNC_OPTIONS.map((opt) => (
            <button key={opt}
              onClick={() => setSync(opt)}
              className={`px-1.5 py-0.5 rounded text-xs transition-colors
                ${device.freqSync === opt
                  ? 'bg-sky-600 text-white'
                  : 'bg-slate-700 hover:bg-slate-600 text-slate-300'}`}
            >
              {opt === 'FollowPrimaryWithOffset' ? '+Offset' : opt}
            </button>
          ))}
        </div>
      </div>

      {/* Audio routing */}
      <div className="flex flex-col gap-0.5">
        <span className="text-slate-400">Audio</span>
        <div className="flex gap-1 flex-wrap">
          {AUDIO_OPTIONS.map((opt) => (
            <button key={opt}
              onClick={() => setAudio(opt)}
              className={`px-1.5 py-0.5 rounded text-xs transition-colors
                ${device.audioRoute === opt
                  ? 'bg-emerald-600 text-white'
                  : 'bg-slate-700 hover:bg-slate-600 text-slate-300'}`}
            >
              {opt}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
