// PantheonSDR — device discovery and session management panel.

import { useState } from 'react';
import { useSessionStore, type DiscoveredDevice } from '../../state/session-store';

const API = (path: string) => `/api${path}`;

async function apiPost(path: string, body?: unknown) {
  return fetch(API(path), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  });
}

async function apiDelete(path: string) {
  return fetch(API(path), { method: 'DELETE' });
}

function protocolBadge(protocol: string) {
  const colours: Record<string, string> = {
    OpenHpsdrP2: 'bg-blue-600',
    OpenHpsdrP1: 'bg-blue-400',
    SdrPlay:     'bg-green-600',
    PlutoSdr:    'bg-purple-600',
    RtlSdr:      'bg-orange-500',
  };
  return (
    <span className={`text-xs px-1.5 py-0.5 rounded font-mono text-white ${colours[protocol] ?? 'bg-slate-500'}`}>
      {protocol}
    </span>
  );
}

function freqRange(d: DiscoveredDevice) {
  const f = (hz: number) => hz >= 1e9 ? `${(hz / 1e9).toFixed(1)} GHz`
    : hz >= 1e6 ? `${(hz / 1e6).toFixed(0)} MHz`
    : `${(hz / 1e3).toFixed(0)} kHz`;
  return `${f(d.minFrequencyHz)} – ${f(d.maxFrequencyHz)}`;
}

export function DeviceManagerPanel() {
  const { discovered, primary, auxiliaries, isDiscovering,
    setDiscovered, setDiscovering } = useSessionStore();
  const [attaching, setAttaching] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const attachedIds = new Set([
    primary?.deviceId,
    ...auxiliaries.map((a) => a.deviceId),
  ].filter(Boolean) as string[]);

  async function discover() {
    setDiscovering(true);
    setError(null);
    try {
      const r = await apiPost('/session/discover');
      if (!r.ok) throw new Error(await r.text());
      const devices: DiscoveredDevice[] = await r.json();
      setDiscovered(devices);
    } catch (e) {
      setError(String(e));
    } finally {
      setDiscovering(false);
    }
  }

  async function attach(d: DiscoveredDevice, role: 'Primary' | 'Auxiliary') {
    setAttaching(d.deviceId);
    setError(null);
    try {
      const r = await apiPost('/session/attach', {
        deviceId: d.deviceId,
        role,
        audioRoute: role === 'Primary' ? 'Left' : 'Right',
      });
      if (!r.ok) throw new Error(await r.text());
    } catch (e) {
      setError(String(e));
    } finally {
      setAttaching(null);
    }
  }

  async function detach(deviceId: string) {
    setError(null);
    try {
      const r = await apiDelete(`/session/devices/${encodeURIComponent(deviceId)}`);
      if (!r.ok) throw new Error(await r.text());
    } catch (e) {
      setError(String(e));
    }
  }

  return (
    <div className="flex flex-col gap-3 p-3 text-sm text-slate-100 h-full overflow-y-auto">
      <div className="flex items-center justify-between">
        <h2 className="font-semibold text-base text-white">Devices</h2>
        <button
          onClick={discover}
          disabled={isDiscovering}
          className="px-3 py-1 rounded bg-sky-600 hover:bg-sky-500 disabled:opacity-50 text-xs font-medium"
        >
          {isDiscovering ? 'Scanning…' : '⟳ Discover'}
        </button>
      </div>

      {error && (
        <div className="text-xs text-red-400 bg-red-900/30 p-2 rounded">{error}</div>
      )}

      {/* Active session */}
      {(primary || auxiliaries.length > 0) && (
        <section>
          <div className="text-xs text-slate-400 uppercase tracking-wide mb-1">Active session</div>
          {[...(primary ? [primary] : []), ...auxiliaries].map((d) => (
            <div key={d.deviceId}
              className="flex items-center justify-between bg-slate-800 rounded p-2 mb-1">
              <div className="flex flex-col gap-0.5 min-w-0">
                <span className="font-medium truncate">{d.friendlyName}</span>
                <span className={`text-xs ${d.role === 'Primary' ? 'text-sky-400' : 'text-slate-400'}`}>
                  {d.role} · WDSP ch {d.wdspChannelId} · {d.audioRoute}
                </span>
              </div>
              <button
                onClick={() => detach(d.deviceId)}
                className="ml-2 text-xs px-2 py-0.5 rounded bg-red-700 hover:bg-red-600"
              >
                Detach
              </button>
            </div>
          ))}
        </section>
      )}

      {/* Discovered devices */}
      <section>
        <div className="text-xs text-slate-400 uppercase tracking-wide mb-1">
          {discovered.length === 0 ? 'No devices found — press Discover' : `Found (${discovered.length})`}
        </div>
        {discovered.map((d) => {
          const isAttached = attachedIds.has(d.deviceId);
          const busy = attaching === d.deviceId;
          const hasPrimary = primary !== null;
          return (
            <div key={d.deviceId}
              className="flex items-start justify-between bg-slate-800/60 rounded p-2 mb-1 gap-2">
              <div className="flex flex-col gap-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-medium truncate">{d.friendlyName}</span>
                  {protocolBadge(d.protocol)}
                </div>
                <span className="text-xs text-slate-400">{freqRange(d)}</span>
              </div>
              {!isAttached ? (
                <div className="flex flex-col gap-1 shrink-0">
                  {!hasPrimary && d.canTransmit && (
                    <button
                      disabled={busy}
                      onClick={() => attach(d, 'Primary')}
                      className="text-xs px-2 py-0.5 rounded bg-sky-700 hover:bg-sky-600 disabled:opacity-50"
                    >
                      Primary
                    </button>
                  )}
                  <button
                    disabled={busy}
                    onClick={() => attach(d, 'Auxiliary')}
                    className="text-xs px-2 py-0.5 rounded bg-slate-600 hover:bg-slate-500 disabled:opacity-50"
                  >
                    {busy ? '…' : 'Add RX'}
                  </button>
                </div>
              ) : (
                <span className="text-xs text-green-400 shrink-0">attached</span>
              )}
            </div>
          );
        })}
      </section>
    </div>
  );
}
