// PantheonSDR — multi-device spectrum display.
// Shows primary panadapter (existing) + one canvas per aux device side by side.

import { useRef, useEffect } from 'react';
import { useSessionStore } from '../../state/session-store';
import { useRx2DisplayStore } from '../../state/rx2-display-store';
import { AuxiliaryReceiverPanel } from './AuxiliaryReceiverPanel';

// Colour palette for waterfall (cold = weak, hot = strong signal)
const PALETTE = (() => {
  const p = new Uint32Array(256);
  for (let i = 0; i < 256; i++) {
    const r = i < 128 ? 0 : (i - 128) * 2;
    const g = i < 64  ? 0 : i < 192 ? (i - 64) * 2 : 255;
    const b = i < 128 ? i * 2 : 255 - (i - 128) * 2;
    p[i] = 0xff000000 | (b << 16) | (g << 8) | r;
  }
  return p;
})();

function dbToColour(db: number): number {
  const normalised = Math.max(0, Math.min(1, (db + 140) / 90)); // -140…-50 dBm
  return PALETTE[Math.round(normalised * 255)] ?? 0xff000000;
}

interface SpectrumCanvasProps {
  pixels: Float32Array | undefined;
  label: string;
  freqHz: number;
}

function SpectrumCanvas({ pixels, label, freqHz }: SpectrumCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !pixels) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const w = canvas.width;
    const h = canvas.height;
    const panH = Math.floor(h * 0.4);
    const wfH  = h - panH;

    // Panadapter (top): line plot
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, 0, w, panH);
    ctx.strokeStyle = '#38bdf8';
    ctx.lineWidth = 1;
    ctx.beginPath();
    const step = pixels.length / w;
    for (let x = 0; x < w; x++) {
      const db = pixels[Math.round(x * step)] ?? -140;
      const y = panH - Math.max(0, ((db + 140) / 90) * panH);
      x === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
    }
    ctx.stroke();

    // Waterfall (bottom): scroll up + paint new row
    const imageData = ctx.getImageData(0, panH, w, wfH);
    const buf = new Uint32Array(imageData.data.buffer);
    // Scroll existing rows up by 1
    buf.copyWithin(0, w);
    // Paint new row at bottom
    for (let x = 0; x < w; x++) {
      const db = pixels[Math.round(x * step)] ?? -140;
      buf[w * (wfH - 1) + x] = dbToColour(db);
    }
    ctx.putImageData(imageData, 0, panH);
  }, [pixels]);

  return (
    <div className="flex flex-col gap-1 flex-1 min-w-0">
      <div className="flex items-center justify-between px-1 text-xs">
        <span className="text-slate-300 font-medium truncate">{label}</span>
        <span className="text-sky-300 font-mono">{(freqHz / 1e6).toFixed(3)} MHz</span>
      </div>
      <canvas
        ref={canvasRef}
        width={512}
        height={200}
        className="w-full rounded bg-slate-900 border border-slate-700"
        style={{ imageRendering: 'pixelated' }}
      />
    </div>
  );
}

export function MultiDevicePanel() {
  const { auxiliaries } = useSessionStore();
  const { pixels } = useRx2DisplayStore();

  if (auxiliaries.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-slate-500 text-sm p-4 text-center">
        No auxiliary devices attached.
        <br />Use the <strong className="text-slate-400">Devices</strong> panel to add an SDRplay or PlutoSDR.
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3 p-2 h-full overflow-y-auto">
      {/* Spectra row */}
      <div className="flex gap-2 flex-wrap">
        {auxiliaries.map((aux, idx) => (
          <SpectrumCanvas
            key={aux.deviceId}
            pixels={pixels.get(idx)}
            label={aux.friendlyName}
            freqHz={aux.frequencyHz}
          />
        ))}
      </div>

      {/* Controls row */}
      <div className="flex gap-2 flex-wrap">
        {auxiliaries.map((aux, idx) => (
          <div key={aux.deviceId} className="flex-1 min-w-[180px]">
            <AuxiliaryReceiverPanel device={aux} devIndex={idx} />
          </div>
        ))}
      </div>
    </div>
  );
}
