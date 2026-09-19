import React, { useEffect, useRef, useState } from 'react';
import { Html5Qrcode, Html5QrcodeCameraScanConfig } from 'html5-qrcode';
import { Camera, SwitchCamera, Zap, ZapOff, Keyboard, AlertCircle, RefreshCw } from 'lucide-react';

interface QRScannerProps {
  onScanSuccess: (decodedText: string) => void;
  isProcessing: boolean;
}

export const QRScanner: React.FC<QRScannerProps> = ({ onScanSuccess, isProcessing }) => {
  const [scannerStarted, setScannerStarted] = useState<boolean>(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');
  const [torchOn, setTorchOn] = useState<boolean>(false);
  const [hasTorch, setHasTorch] = useState<boolean>(false);
  const [showManualModal, setShowManualModal] = useState<boolean>(false);
  const [manualTokenInput, setManualTokenInput] = useState<string>('');

  const html5QrCodeRef = useRef<Html5Qrcode | null>(null);
  const lastScannedTimeRef = useRef<number>(0);

  const scannerElementId = 'reader-viewport';

  useEffect(() => {
    let isMounted = true;

    const stopScanner = async () => {
      const scanner = html5QrCodeRef.current;
      if (scanner) {
        try {
          if (scanner.isScanning) {
            await scanner.stop();
          }
        } catch {
          // ignore scanner not running errors
        }
        try {
          scanner.clear();
        } catch {
          // ignore
        }
        html5QrCodeRef.current = null;
      }
    };

    const startScanner = async () => {
      try {
        setCameraError(null);
        await stopScanner();

        if (!isMounted) return;

        // Check if element exists in DOM
        const element = document.getElementById(scannerElementId);
        if (!element) return;

        const html5QrCode = new Html5Qrcode(scannerElementId);
        html5QrCodeRef.current = html5QrCode;

        const config: Html5QrcodeCameraScanConfig = {
          fps: 15,
          qrbox: { width: 260, height: 260 },
          aspectRatio: 1.0,
        };

        await html5QrCode.start(
          { facingMode: facingMode },
          config,
          (decodedText) => {
            const now = Date.now();
            // 1.5 second throttle to avoid accidental repeat triggers
            if (now - lastScannedTimeRef.current > 1500 && !isProcessing) {
              lastScannedTimeRef.current = now;
              onScanSuccess(decodedText);
            }
          },
          () => {
            // Scan frame ignored (no QR found in current frame)
          }
        );

        if (isMounted) {
          setScannerStarted(true);
          // Check for torch capability
          try {
            // @ts-expect-error html5-qrcode internal track
            const track = html5QrCode.getRunningTrack();
            if (track) {
              const capabilities = track.getCapabilities?.();
              if (capabilities && 'torch' in capabilities) {
                setHasTorch(true);
              }
            }
          } catch {
            setHasTorch(false);
          }
        } else {
          // Unmounted while starting
          stopScanner();
        }
      } catch (err) {
        if (!isMounted) return;
        console.warn('Camera start error:', err);
        setScannerStarted(false);
        const msg = err instanceof Error ? err.message : String(err);
        setCameraError(
          msg.includes('NotAllowedError') || msg.includes('Permission')
            ? 'Camera permission was denied. Please allow camera access in browser settings.'
            : 'Camera busy or not available. You can also type or paste the passport token below.'
        );
      }
    };

    startScanner();

    return () => {
      isMounted = false;
      stopScanner();
    };
  }, [facingMode]);

  const toggleCamera = () => {
    setFacingMode(prev => (prev === 'environment' ? 'user' : 'environment'));
  };

  const toggleTorch = async () => {
    if (html5QrCodeRef.current) {
      try {
        // @ts-expect-error html5-qrcode internal track
        const track = html5QrCodeRef.current.getRunningTrack();
        if (track) {
          const nextTorch = !torchOn;
          await track.applyConstraints({
            advanced: [{ torch: nextTorch }]
          });
          setTorchOn(nextTorch);
        }
      } catch (err) {
        console.warn('Torch toggle failed:', err);
      }
    }
  };

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (manualTokenInput.trim()) {
      onScanSuccess(manualTokenInput.trim());
      setShowManualModal(false);
      setManualTokenInput('');
    }
  };

  return (
    <div className="relative w-full max-w-md mx-auto flex flex-col items-center">
      {/* Scanner Viewport Box */}
      <div className="relative w-full aspect-square max-w-[340px] sm:max-w-[380px] bg-[#090b10] border-[3.5px] border-black shadow-[0_12px_40px_rgba(0,0,0,0.8)] rounded-3xl overflow-hidden ring-1 ring-white/10">
        
        {/* HTML5 QR Code Container */}
        <div id={scannerElementId} className="w-full h-full object-cover"></div>

        {/* Modern HUD Reticle Overlay */}
        <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
          
          {/* Top Status Pill */}
          <div className="absolute top-4 left-1/2 -translate-x-1/2 z-10 pointer-events-none">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-black/80 border border-[#00F0FF]/30 backdrop-blur-md shadow-lg">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#00F0FF] opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-[#00F0FF]"></span>
              </span>
              <span className="text-[10px] font-mono font-bold tracking-widest text-[#00F0FF] uppercase">
                RADAR SCANNER ACTIVE
              </span>
            </div>
          </div>

          {/* Precision Target Box */}
          <div className="relative w-[230px] h-[230px] sm:w-[250px] sm:h-[250px] border border-[#00F0FF]/25 rounded-2xl overflow-hidden bg-[#00F0FF]/[0.02]">
            
            {/* 4 Sleek Corner Brackets */}
            <div className="absolute top-0 left-0 w-7 h-7 border-t-[3.5px] border-l-[3.5px] border-[#00F0FF] rounded-tl-xl" />
            <div className="absolute top-0 right-0 w-7 h-7 border-t-[3.5px] border-r-[3.5px] border-[#00F0FF] rounded-tr-xl" />
            <div className="absolute bottom-0 left-0 w-7 h-7 border-b-[3.5px] border-l-[3.5px] border-[#00F0FF] rounded-bl-xl" />
            <div className="absolute bottom-0 right-0 w-7 h-7 border-b-[3.5px] border-r-[3.5px] border-[#00F0FF] rounded-br-xl" />
            
            {/* Center Crosshair */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-40">
              <div className="w-5 h-5 rounded-full border border-[#00F0FF]" />
              <div className="w-8 h-[1px] bg-[#00F0FF] absolute" />
              <div className="h-8 w-[1px] bg-[#00F0FF] absolute" />
            </div>

            {/* Smooth Glowing Laser Beam */}
            {scannerStarted && !isProcessing && (
              <div className="laser-scanner-line pointer-events-none h-14 bg-gradient-to-b from-transparent via-[#00F0FF]/15 to-[#00F0FF]/40 border-b-2 border-[#00F0FF] shadow-[0_0_16px_#00F0FF]" />
            )}
          </div>
        </div>

        {/* Processing State Indicator */}
        {isProcessing && (
          <div className="absolute inset-0 bg-black/90 backdrop-blur-sm flex flex-col items-center justify-center z-30 p-4 text-center animate-in fade-in duration-150">
            <div className="w-12 h-12 rounded-xl bg-[#00F0FF] text-black border-2 border-black shadow-comic flex items-center justify-center mb-3 animate-spin">
              <RefreshCw className="w-6 h-6 stroke-[3]" />
            </div>
            <div className="bg-black text-[#00F0FF] font-mono font-bold tracking-wider text-xs px-3.5 py-1.5 border border-[#00F0FF] rounded-lg shadow-lg uppercase">
              DECRYPTING PASSPORT DATA...
            </div>
          </div>
        )}

        {/* Camera Permission / Error Fallback */}
        {cameraError && (
          <div className="absolute inset-0 bg-black/95 flex flex-col items-center justify-center p-6 text-center z-20">
            <div className="w-14 h-14 rounded-2xl bg-[#FF3366]/10 border border-[#FF3366]/30 flex items-center justify-center mb-3">
              <AlertCircle className="w-8 h-8 text-[#FF3366] stroke-[2.5]" />
            </div>
            <p className="text-xs font-bold text-slate-200 mb-4 max-w-xs">{cameraError}</p>
            <button
              onClick={() => setShowManualModal(true)}
              className="px-4 py-2.5 text-xs font-bold font-mono tracking-wider uppercase bg-[#00F0FF] hover:bg-[#00d4e0] text-black rounded-xl border border-black shadow-comic flex items-center gap-2 cursor-pointer"
            >
              <Keyboard className="w-4 h-4 stroke-[2.5]" />
              ENTER CODE MANUALLY
            </button>
          </div>
        )}

        {/* Modern Floating Scanner Controls */}
        <div className="absolute bottom-3.5 left-1/2 -translate-x-1/2 flex items-center gap-2 bg-black/80 backdrop-blur-md border border-white/15 px-3 py-1.5 rounded-2xl shadow-xl z-20 pointer-events-auto">
          <button
            onClick={toggleCamera}
            title="Switch Camera Lens"
            className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white hover:text-[#00F0FF] transition-all cursor-pointer"
          >
            <SwitchCamera className="w-4 h-4 stroke-[2.5]" />
          </button>

          {hasTorch && (
            <button
              onClick={toggleTorch}
              title="Toggle Flashlight"
              className={`p-2 rounded-xl transition-all cursor-pointer ${
                torchOn
                  ? 'bg-[#00F0FF] text-black shadow-[0_0_12px_#00F0FF]'
                  : 'bg-white/10 text-white hover:bg-white/20'
              }`}
            >
              {torchOn ? <Zap className="w-4 h-4 stroke-[2.5] fill-current" /> : <ZapOff className="w-4 h-4 stroke-[2.5]" />}
            </button>
          )}

          <button
            onClick={() => setShowManualModal(true)}
            title="Manual Code Input"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#00F0FF] hover:bg-[#00d4e0] text-black text-xs font-bold font-mono transition-all shadow-[0_0_12px_rgba(0,240,255,0.4)] cursor-pointer"
          >
            <Keyboard className="w-4 h-4 stroke-[2.5]" />
            <span>TYPE CODE</span>
          </button>
        </div>

      </div>

      <p className="text-xs text-slate-400 mt-3 text-center flex items-center justify-center gap-2 font-mono tracking-wide">
        <Camera className="w-3.5 h-3.5 text-[#00F0FF]" />
        <span>ALIGN QR CODE INSIDE SCANNER RETICLE</span>
      </p>

      {/* Manual Input Modal */}
      {showManualModal && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-[#1b1f2d] border-[3.5px] border-black p-5 sm:p-6 max-w-sm w-full shadow-comic-xl">
            <h3 className="text-base font-comic tracking-wider text-white uppercase flex items-center gap-2 mb-1 font-bold">
              <span className="p-1 bg-[#00F0FF] text-black border-2 border-black shadow-comic-sm">
                <Keyboard className="w-4 h-4 stroke-[2.5]" />
              </span>
              MANUAL PASSPORT OVERRIDE
            </h3>
            <p className="text-xs text-slate-300 mb-4">
              Type or paste the participant's encrypted passport code:
            </p>

            <form onSubmit={handleManualSubmit} className="space-y-3">
              <input
                type="text"
                autoFocus
                value={manualTokenInput}
                onChange={(e) => setManualTokenInput(e.target.value)}
                placeholder="e.g. PASSPORT-ARUN-8899"
                className="w-full px-3 py-2.5 bg-[#FFFDF0] text-black border-2 border-black text-sm font-mono font-bold shadow-comic-sm placeholder-slate-500 focus:outline-none focus:bg-white"
              />

              {/* Sample quick tokens for testing */}
              <div className="text-[11px] text-slate-300 pt-1 font-comic uppercase tracking-wider font-bold">
                QUICK SIMULATION TOKENS:
                <div className="flex flex-wrap gap-1.5 mt-1">
                  {['PASSPORT-ARUN-8899', 'PASSPORT-SNEHA-7744', 'PASSPORT-VIKRAM-3322', 'PASSPORT-POOJA-9911'].map(tok => (
                    <button
                      type="button"
                      key={tok}
                      onClick={() => setManualTokenInput(tok)}
                      className="px-2 py-0.5 bg-[#12141d] hover:bg-slate-800 text-[#00F0FF] font-mono text-[10px] border border-black cursor-pointer"
                    >
                      {tok.replace('PASSPORT-', '')}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex gap-2 pt-3">
                <button
                  type="submit"
                  disabled={!manualTokenInput.trim()}
                  className="flex-1 py-2.5 text-xs font-comic tracking-wider uppercase bg-[#00F0FF] hover:bg-[#00d4e0] text-black border-2 border-black shadow-comic-sm comic-btn disabled:opacity-50 cursor-pointer font-bold"
                >
                  DECRYPT & LOOKUP
                </button>
                <button
                  type="button"
                  onClick={() => setShowManualModal(false)}
                  className="px-4 py-2.5 text-xs font-comic tracking-wider uppercase bg-slate-700 hover:bg-slate-600 text-white border-2 border-black shadow-comic-sm cursor-pointer"
                >
                  CANCEL
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
