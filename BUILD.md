# PantheonSDR — Build & Test Instructions

> **Status:** Early development (Sprint 4). The backend compiles and runs.  
> The React frontend builds and renders. Hardware integration requires  
> an OpenHPSDR-compatible device (Brick2, HL2, ANAN) for full RX/TX testing.

---

## Prerequisites

### All platforms

| Tool | Version | Install |
|---|---|---|
| **.NET SDK** | **10.0** (required) | https://dotnet.microsoft.com/download/dotnet/10.0 |
| **Node.js** | 20 LTS or 22 | https://nodejs.org/ |
| **Git** | any recent | https://git-scm.com/ |

Verify:
```bash
dotnet --version   # must show 10.x.x
node --version     # must show v20.x or v22.x
npm --version
```

### Optional hardware dependencies

| Library | Device | Install |
|---|---|---|
| **SDRplay API 3.15** | SDRplay RSP1A/RSP2/RSPdx | https://www.sdrplay.com/api/ |
| **libiio** | PlutoSDR / PlutoSDR Plus | See per-OS below |
| **librtlsdr** | RTL-SDR V3/V4 | See per-OS below |

> **Without hardware:** PantheonSDR runs in **synthetic mode** (simulated radio).  
> All UI, DSP settings, and multi-device session management work without physical hardware.

---

## Clone

```bash
git clone https://github.com/ronald1711/PantheonSDR.git
cd PantheonSDR
```

---

## Linux (Ubuntu 24.04 / Debian 12)

### Install system dependencies

```bash
# .NET 10
wget https://packages.microsoft.com/config/ubuntu/24.04/packages-microsoft-prod.deb -O packages-microsoft-prod.deb
sudo dpkg -i packages-microsoft-prod.deb
sudo apt-get update && sudo apt-get install -y dotnet-sdk-10.0

# Node.js 20 LTS
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# Optional: libiio for PlutoSDR
sudo apt-get install -y libiio-dev libiio-utils

# Optional: librtlsdr for RTL-SDR
sudo apt-get install -y librtlsdr-dev rtl-sdr

# Optional: SDRplay API 3.15 (download installer from sdrplay.com/api)
# chmod +x SDRplay_RSP_API-Linux-3.15.1.run && sudo ./SDRplay_RSP_API-Linux-3.15.1.run
```

### Build and run

```bash
cd src

# 1. Install frontend dependencies (first time only)
cd zeus-web && npm install && cd ..

# 2. Build backend (skips frontend SPA build on first run, downloads NuGet packages)
dotnet build PantheonSDR.slnx

# 3. Run in development mode (frontend served by Vite, backend on :6060)
# Terminal 1 — backend
dotnet run --project PantheonSDR/PantheonSDR.csproj

# Terminal 2 — frontend (hot-reload)
cd zeus-web && npm run dev
```

Open http://localhost:5173 (Vite dev server proxies API to :6060).

### Run tests

```bash
cd src
dotnet test PantheonSDR.Devices/PantheonSDR.Devices.csproj  # HAL unit tests
dotnet test tests/PantheonSDR.Devices.Tests/PantheonSDR.Devices.Tests.csproj
dotnet test tests/Zeus.Protocol1.Tests/Zeus.Protocol1.Tests.csproj
dotnet test tests/Zeus.Protocol2.Tests/Zeus.Protocol2.Tests.csproj
dotnet test tests/Zeus.Dsp.Tests/Zeus.Dsp.Tests.csproj

# Or run all tests at once:
dotnet test PantheonSDR.slnx
```

---

## macOS (13 Ventura or later, Apple Silicon or Intel)

### Install system dependencies

```bash
# Homebrew (if not installed)
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"

# .NET 10
brew install --cask dotnet-sdk   # or download from dotnet.microsoft.com

# Node.js
brew install node@20

# Optional: libiio for PlutoSDR
brew install libiio

# Optional: librtlsdr for RTL-SDR
brew install librtlsdr

# Optional: SDRplay API — download .pkg from sdrplay.com/api
```

### Build and run

```bash
cd src

# Install frontend dependencies
cd zeus-web && npm install && cd ..

# Build backend
dotnet build PantheonSDR.slnx

# Terminal 1 — backend
dotnet run --project PantheonSDR/PantheonSDR.csproj

# Terminal 2 — frontend
cd zeus-web && npm run dev
```

Open http://localhost:5173

> **macOS Gatekeeper:** On first run you may need to allow the binary:
> ```bash
> xattr -cr src/PantheonSDR/bin/Debug/net10.0/PantheonSDR
> ```

### Run tests

```bash
cd src && dotnet test PantheonSDR.slnx
```

---

## Windows 11

### Install system dependencies

1. **.NET 10 SDK** — download from https://dotnet.microsoft.com/download/dotnet/10.0  
2. **Node.js 20 LTS** — download from https://nodejs.org/  
3. **Git** — https://git-scm.com/  
4. **Optional: SDRplay API 3.15** — download from https://www.sdrplay.com/api/  
   Run the installer; PantheonSDR auto-detects `sdrplay_api.dll`.
5. **Optional: libiio for PlutoSDR** — https://github.com/analogdevicesinc/libiio/releases  
   Download the Windows installer; `iio.dll` will be in `C:\Program Files\Analog Devices\libiio`.

### Build and run (PowerShell)

```powershell
cd src

# Install frontend dependencies
cd zeus-web; npm install; cd ..

# Build backend
dotnet build PantheonSDR.slnx

# Terminal 1 — backend
dotnet run --project PantheonSDR\PantheonSDR.csproj

# Terminal 2 — frontend
cd zeus-web; npm run dev
```

Open http://localhost:5173

> **Windows Firewall:** On first run Windows may ask to allow network access.  
> Allow access on private networks for both dotnet and node.

### Run tests (PowerShell)

```powershell
cd src
dotnet test PantheonSDR.slnx
```

---

## Production Build (all platforms)

```bash
cd src

# Build frontend into wwwroot
cd zeus-web && npm run build && cd ..

# Publish self-contained binary
# Linux x64:
dotnet publish PantheonSDR/PantheonSDR.csproj \
  -r linux-x64 --self-contained -c Release \
  -o ../dist/linux-x64

# macOS ARM64:
dotnet publish PantheonSDR/PantheonSDR.csproj \
  -r osx-arm64 --self-contained -c Release \
  -o ../dist/osx-arm64

# Windows x64:
dotnet publish PantheonSDR/PantheonSDR.csproj \
  -r win-x64 --self-contained -c Release \
  -o ../dist/win-x64
```

Run the published binary:
```bash
# Linux / macOS
./dist/linux-x64/PantheonSDR

# Windows
.\dist\win-x64\PantheonSDR.exe
```

Open http://localhost:6060

---

## Desktop Mode (Photino — no browser needed)

```bash
dotnet run --project PantheonSDR/PantheonSDR.csproj -- --desktop
```

This opens a native window with the full UI — no browser required.  
Audio output goes directly to your system's default audio device (miniaudio).

---

## Hardware Testing

### Step 1: Connect hardware

**Brick2 / Hermes-Lite 2 / ANAN:**
- Connect via Ethernet (same subnet as your PC)
- No driver installation needed — OpenHPSDR uses standard UDP

**SDRplay RSP1A:**
- Connect via USB
- Install SDRplay API 3.15 from https://www.sdrplay.com/api/
- Verify: `ls /dev/bus/usb` (Linux) or Device Manager (Windows)

**PlutoSDR Plus F5OEO:**
- Connect via USB or Ethernet (default IP: 192.168.2.1)
- Install libiio (see above)
- Verify: `iio_info -n 192.168.2.1` should show AD9361 device

### Step 2: Discover and attach

1. Open PantheonSDR in browser (http://localhost:5173 or :6060)
2. Open the **Devices** panel from the panel catalog (+ Add Panel)
3. Click **Discover** — found devices appear in the list
4. Click **Primary** to attach your Brick2/HL2 as the main transceiver
5. Click **Add RX** to attach SDRplay or PlutoSDR as auxiliary receiver
6. Open the **RX2 Spectrum** panel to see the auxiliary device's spectrum

### Step 3: Verify multi-device

REST API test (optional):
```bash
# Check session state
curl http://localhost:6060/api/session | python3 -m json.tool

# Trigger discovery
curl -X POST http://localhost:6060/api/session/discover | python3 -m json.tool

# Attach a device (replace deviceId with actual ID from discover response)
curl -X POST http://localhost:6060/api/session/attach \
  -H "Content-Type: application/json" \
  -d '{"deviceId":"hpsdr-p2:192.168.1.100","role":"Primary"}'
```

---

## Troubleshooting

### dotnet: command not found
Ensure .NET 10 is on your PATH:
```bash
export PATH=$PATH:$HOME/.dotnet  # Linux/macOS
```

### SDRplay not detected
```bash
# Linux: check service is running
systemctl status sdrplay

# Restart if needed
sudo systemctl restart sdrplay
```

### PlutoSDR not reachable
```bash
# Check network connectivity
ping 192.168.2.1

# Verify libiio sees the device
iio_info -n 192.168.2.1
```

### WDSP wisdom takes a long time on first start
Normal — FFTW3 computes FFT plans (can take 1-3 minutes first time).  
Subsequent starts are fast (plans cached). Watch the UI status bar for "WDSP ready".

### Port 6060 already in use
```bash
# Change the port
dotnet run --project PantheonSDR/PantheonSDR.csproj -- --urls http://localhost:7070
```

### Frontend fails to connect to backend
Ensure the backend is running on port 6060, then restart the frontend:
```bash
cd zeus-web && npm run dev
```

---

## What Works Right Now

| Feature | Status |
|---|---|
| OpenHPSDR P1 (HL2) — RX | ✓ Works (Zeus base) |
| OpenHPSDR P2 (Brick2, G2) — RX | ✓ Works (Zeus base) |
| OpenHPSDR P1/P2 — TX | ✓ Works (Zeus base) |
| PureSignal 2.0 | ✓ Works (Zeus base) |
| WebGL panadapter + waterfall | ✓ Works |
| Multi-device session model | ✓ Code complete, needs hardware test |
| SDRplay RSP1A adapter | ✓ Code complete, needs hardware test |
| PlutoSDR Plus F5OEO adapter | ✓ Code complete, needs hardware test |
| RX2 spectrum panel | ✓ Code complete |
| Device Manager panel | ✓ Code complete |
| PTT lockout (multi-device) | ✓ Logic complete, needs hardware test |
| CAT plugin | ○ Planned (Phase 2) |
| N1MM plugin | ○ Planned (Phase 2) |
| Mobile (Capacitor) | ○ Planned (Phase 3) |

---

## ⚠️ First Hardware Test Checklist

When you're ready to test with your SDRplay RSP1A and PlutoSDR Plus:

- [ ] Install SDRplay API 3.15 on the test machine
- [ ] Install libiio on the test machine
- [ ] Connect PlutoSDR Plus (F5OEO firmware) via USB or Ethernet
- [ ] Connect SDRplay RSP1A via USB
- [ ] Start PantheonSDR backend
- [ ] Open browser → Devices panel → Discover
- [ ] Verify both devices appear in the list
- [ ] Attach Brick2 as Primary (if available) or PlutoSDR as Primary
- [ ] Attach SDRplay as Auxiliary
- [ ] Open RX2 Spectrum panel
- [ ] Verify spectrum appears for SDRplay
- [ ] Change RX2 frequency → verify the SDRplay tunes
- [ ] Test PTT lockout: key Primary TX, verify SDRplay cannot TX

Report any issues at: https://github.com/ronald1711/PantheonSDR/issues
