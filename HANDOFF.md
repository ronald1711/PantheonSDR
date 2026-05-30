# Session Handoff — PantheonSDR

> Paste this whole file into a new Claude session to resume work on any machine/OS.
> Last updated: 2026-05-30 (commit `4fdc176`)

---

## Goal

Build **PantheonSDR** — a modern crossplatform SDR RX/TX application, evolved from
OpenHPSDR-Zeus, with a hardware abstraction layer that lets any SDR be primary or
auxiliary (Brick2, SDRplay, PlutoSDR, multiple OpenHPSDR devices simultaneously).

- **Repo:** https://github.com/ronald1711/PantheonSDR (branch `main`)
- **Stack:** C# .NET 10 + ASP.NET Core backend, React 19 + WebGL frontend, WDSP DSP, miniaudio
- **Owner:** Ronald (callsign PC3Y), GitHub @ronald1711

---

## ⛔ CURRENT BLOCKER (most important — start here)

**Brick2 connects but the panadapter/waterfall stays blank.** This is where work stopped.

### What we know (from diagnostic logging in commit `4fdc176`)
- The Brick2 is a **Hermes-class** P2 board (board-id `1`), confirmed by:
  - deskHPSDR detecting it as "Hermes" (Setup screenshot: `Hermes 192.168.10.78 Protocol-2 v3.7 Version 10.5 PLL Locked`)
  - deskHPSDR source `src/new_discovery.c:381` (board byte 1 → NEW_DEVICE_HERMES)
  - Brick2 MAC `00:1c:c0:a2:22:5c`, IP `192.168.10.78`
- Board is now **correctly detected** — log shows `board=Hermes rxDdc=0` (the unicast
  probe fix in commit `b4fed26` works).
- **BUT** the diagnostic log shows `iqFrames=0` permanently, and the `p2.ddc.first`
  log line **never appears**. → **The radio is not sending any DDC IQ packets** on
  ports 1035-1041 at all. Hi-priority status (port 1025) works fine (`pkts` climbing,
  `pll=True`), so the socket and network path are fine.

### Diagnosis
The **RX-enable command** (`SendCmdRx`, sent to port 1025) is not making the Brick2
start its DDC0 stream. Leading hypothesis: **`numAdc` is hardcoded to `2`** in the
connect path, but a Hermes/Brick2 is a **single-ADC** board. deskHPSDR computes
`n_adc` per device. Telling a single-ADC board `numAdc=2` may make it reject or
misconfigure the DDC-enable.

### NEXT STEP (do this first)
1. Compare Zeus's RX-specific packet byte layout against deskHPSDR's authoritative
   builder. deskHPSDR source is at:
   `/mnt/data/projects/sdrapp_project/sources/deskhpsdr-master/src/new_protocol.c`
   — find the function that builds the **receive-specific** packet (search for where
   it writes the DDC-enable byte, sample rate, and `n_adc`/number-of-receivers).
2. In PantheonSDR, the relevant code:
   - `src/Zeus.Server.Hosting/ZeusEndpoints.cs` — `/api/connect/p2` hardcodes
     `numAdc: 2` in the `dsp.ConnectP2Async(...)` call. **Try `numAdc: 1` for
     Hermes-class boards.**
   - `src/Zeus.Protocol2/Protocol2Client.cs`:
     - `ComposeCmdRxBuffer(seq, numAdc, sampleRateKhz, psEnabled, boardKind)` ~line 997
       — builds the RX-specific packet. For Hermes: `rxDdc=0`, `ddcEnable=0x01` (p[7]),
       DDC config at `off = 17 + rxDdc*6 = 17`. **Verify this matches deskHPSDR
       byte-for-byte for a Hermes single-ADC board.**
     - `SendCmdRx()` ~line 1044 sends it to port 1025.
     - `RxBaseDdc(boardKind)` ~line 984 → Hermes/HermesII/HermesC10 = DDC0, else DDC2. ✓ correct.
     - `HandleDdcPacket(buf, ddcIndex)` ~line 1508 — receives & feeds WDSP. Has a
       one-shot `p2.ddc.first` log (never fires → no packets arriving).
     - `SendCmdHighPriority` ~line 1132 — writes DDC freq at `9 + rxDdc*4` (offset 9
       for Hermes). ✓ correct.
3. Connect order in `src/Zeus.Server.Hosting/DspPipelineService.cs` `ConnectP2Async`
   (~line 938): SetNumAdc → SetBoardKind → SetOrionMkIIVariant → StartAsync. ✓ board
   set before start.

### How to reproduce / test
On the Windows box with the Brick2 connected:
```
git pull
cd src
dotnet run --project PantheonSDR/PantheonSDR.csproj
```
Then in browser connect manually: IP `192.168.10.78`, Protocol 2.
Watch console for `p2.hi_pri.rx ... iqFrames=N board=Hermes rxDdc=0` and any
`p2.ddc.first` line. **Goal: get `iqFrames` climbing and a `p2.ddc.first ddc=0` line.**
Once IQ flows, the waterfall should appear and the S-meter should leave the -160 dBm floor.

---

## Secondary issue: SDRplay / PlutoSDR not discovered

User HAS installed SDRplay API 3.15 and libiio on Windows, and owns an **SDRplay RSP1A**
and **PlutoSDR Plus (F5OEO firmware)**. The Devices panel still finds nothing because
the native DLLs aren't on Windows' default DLL search path:
- SDRplay → `C:\Program Files\SDRplay\API\x64\sdrplay_api.dll`
- libiio → e.g. `C:\Program Files\...\libiio\bin\libiio.dll`

`[DllImport("sdrplay_api")]` / `[LibraryImport("iio")]` throw `DllNotFoundException`
→ caught → "0 found". **Fix needed:** add a `NativeLibrary.SetDllImportResolver` that
probes the known install dirs (and/or document adding them to PATH). Relevant files:
- `src/PantheonSDR.Devices/SdrPlay/SdrplayNativeMethods.cs` (uses `[DllImport]`)
- `src/PantheonSDR.Devices/PlutoSdr/IioNativeMethods.cs` (uses `[LibraryImport]`)

This is deferred until the Brick2 RX works.

---

## Current status — what's built and working

### Builds & runs on Windows 11 + .NET 10.0.204 ✓
(Multi-NIC box: Realtek USB GbE at 192.168.10.245 on the radio's 192.168.10.x subnet.)

### Done
- **HAL** (`src/PantheonSDR.Devices/`): `IDeviceSource`, `ITransceiver`,
  `DeviceCapabilities` flags, `IqBlock`, `WdspChannelAllocator` (primary 0-13, aux 16-29),
  `DeviceRegistry`. Decoupled from Zeus protocol assemblies (only needs
  Microsoft.Extensions.Logging/Hosting.Abstractions).
- **Device adapters**: `SdrplaySource` + `SdrplayEnumerator` (SDRplay API 3.x),
  `PlutoSdrTransceiver` + `PlutoEnumerator` (libiio, F5OEO 70 MHz–6 GHz),
  `OpenHpsdrP1/P2Transceiver` (self-contained RadioSession adapters — OpenHPSDR
  control actually flows through Zeus's RadioService, not these).
- **SampleRateBridge**: windowed-sinc FIR decimation to 48 kHz (stateless).
- **RadioSession** (`src/PantheonSDR.Devices/Session/`): symmetric N-device model,
  PTT lockout, FreqSyncPolicy (Independent/FollowPrimary/FollowPrimaryWithOffset),
  AudioRoute. `DeviceCoordinatorService`, `Rx2PipelineService`,
  `DiscoveryAggregatorService`. 22 passing unit tests.
- **Server wiring** (`src/Zeus.Server.Hosting/`): `SessionEndpoints.cs` REST API
  (`/api/session/*`), `DspPipelineService` implements `IDspFeedCallback`,
  `StreamingHub` broadcasts 0x40 (RX2 display) / 0x41 (RX2 meters) / 0x42 (session state),
  DI registrations + `MapSessionEndpoints()` in `ZeusHost.cs`.
- **React UI** (`src/zeus-web/src/`): `session-store.ts`, `rx2-display-store.ts`,
  ws-client handlers for 0x40/0x41/0x42, `DeviceManagerPanel.tsx` (discover/attach/detach
  + discovery diagnostics), `AuxiliaryReceiverPanel.tsx`, `MultiDevicePanel.tsx`
  (canvas panadapter+waterfall). Registered in panel catalog as "RX2 Spectrum" + "Devices".
- **Brick2 board auto-detect** (commit `b4fed26`): `IRadioDiscovery.ProbeAsync(ip)` —
  unicast P2 discovery probe so manual connect learns board=Hermes even when broadcast
  discovery fails on multi-NIC Windows.
- **Docs**: `README.md`, `BUILD.md` (per-OS build/test instructions), `ROADMAP.md`,
  `CONTRIBUTING.md`, `docs/analysis/` (18-doc master analysis, in Dutch).

### Decisions made
- **Evolve Zeus, don't greenfield** — reuse Protocol1/2, Dsp, plugins, React/WebGL.
- **PantheonSDR.Devices stays decoupled from Zeus protocol assemblies** — OpenHPSDR
  control flows through the existing Zeus RadioService; the HAL adapters are thin
  RadioSession representations. (This is why the OpenHpsdrP1/P2Transceiver are stubs.)
- **Symmetric device model** — any device can be primary or auxiliary; role is a
  property, not a type.
- **SDRplay/Pluto = user-installed native libs** (no GPL conflict; SDRplay API is
  proprietary, kept out of the GPL core via runtime DLL load).
- Strict TS (`noUncheckedIndexedAccess`, `noUnusedLocals`) and C# warnings-as-errors
  are ON — keep code clean or the build fails.

---

## Repo layout (key paths)

```
PantheonSDR/
├── HANDOFF.md            ← this file
├── README.md, BUILD.md, ROADMAP.md, CONTRIBUTING.md
├── docs/analysis/        ← 18-doc master analysis (Dutch)
└── src/
    ├── PantheonSDR.slnx               ← solution
    ├── PantheonSDR/                   ← executable (was OpenhpsdrZeus)
    ├── PantheonSDR.Devices/           ← NEW: HAL + device adapters + RadioSession
    │   ├── IDeviceSource.cs, ITransceiver.cs, DeviceCapabilities.cs, ...
    │   ├── SdrPlay/, PlutoSdr/, OpenHpsdr/, Resampling/, Session/
    ├── Zeus.Protocol1/, Zeus.Protocol2/   ← OpenHPSDR P1/P2 (Protocol2Client.cs is key)
    ├── Zeus.Dsp/                       ← IDspEngine + WDSP P/Invoke
    ├── Zeus.Server.Hosting/            ← ASP.NET Core: ZeusHost.cs, ZeusEndpoints.cs,
    │   │                                  SessionEndpoints.cs, DspPipelineService.cs,
    │   │                                  StreamingHub.cs
    ├── tests/PantheonSDR.Devices.Tests/
    └── zeus-web/                       ← React 19 frontend
```

## Build & run

```bash
git clone https://github.com/ronald1711/PantheonSDR.git
cd PantheonSDR/src
npm install --prefix zeus-web          # first time
dotnet run --project PantheonSDR/PantheonSDR.csproj   # backend (also builds SPA)
# OR dev mode with hot reload:
#   terminal 2: cd zeus-web && npm run dev   → http://localhost:5173
```
Full per-OS instructions in `BUILD.md`. Requires .NET 10 SDK + Node 20.

## Reference source (local, NOT in repo)
On the original dev machine, the three analyzed codebases live at:
- `/mnt/data/projects/sdrapp_project/sources/deskhpsdr-master` ← **Brick2 reference**
- `/mnt/data/projects/sdrapp_project/sources/openhpsdr-zeus-main`
- `/mnt/data/projects/sdrapp_project/sources/Thetis-master`

deskHPSDR is the authoritative reference for the Brick2 — its `src/new_protocol.c`
(P2) and `src/new_discovery.c` show exactly how a Hermes/Brick2 is configured.
On a new machine without these, clone deskHPSDR from https://github.com/dl1bz/deskhpsdr

---

## Recent commits
```
4fdc176 diag: log DDC IQ frame count + first-packet-per-DDC for blank panadapter
b4fed26 fix: Brick2 blank panadapter — unicast board probe on manual P2 connect
9c1f4d7 fix: wire real OpenHPSDR discovery into /api/session/discover + diagnostics
5ca05b9 fix: TypeScript build errors in multi-device UI (Windows SPA build)
5307a61 fix: remove unused fields + fix collection-expression ternary (Windows build)
3264aa3 fix: PantheonSDR.Devices build errors (Windows .NET 10)
f86193b feat: Sprint 5 — React multi-device UI + comprehensive BUILD.md
9a282d9 feat: Sprint 4 — wire RadioSession into Zeus.Server.Hosting
```

## Hardware on hand (for testing)
- **Brick2** — Hermes-class P2, IP 192.168.10.78, MAC 00:1c:c0:a2:22:5c, P2 v3.7. PRIMARY blocker.
- **SDRplay RSP1A** — USB, SDRplay API 3.15 installed.
- **PlutoSDR Plus (F5OEO firmware)** — 70 MHz–6 GHz, libiio installed, default IP 192.168.2.1.
