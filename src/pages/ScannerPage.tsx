import React, { useState } from 'react';
import { QRScanner } from '../components/scanner/QRScanner';
import { ScanResultCard } from '../components/scanner/ScanResultCard';
import { lookupParticipantByToken } from '../lib/supabase';
import { ScannedParticipant } from '../types/database';
import { feedback } from '../lib/feedback';
import { AlertCircle, ArrowLeft, Camera } from 'lucide-react';

interface ScannerPageProps {
  onBackToDashboard?: () => void;
}

export const ScannerPage: React.FC<ScannerPageProps> = ({ onBackToDashboard }) => {
  const [scannedParticipant, setScannedParticipant] = useState<ScannedParticipant | null>(null);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleScanSuccess = async (passportToken: string) => {
    if (isProcessing || scannedParticipant) return;

    try {
      setIsProcessing(true);
      setErrorMessage(null);

      const participant = await lookupParticipantByToken(passportToken);
      if (participant) {
        setScannedParticipant(participant);
      } else {
        feedback.error();
        setErrorMessage(`Invalid or unregistered passport token: "${passportToken}". Please verify the participant's QR code.`);
      }
    } catch (err) {
      console.error('Scan lookup error:', err);
      feedback.error();
      setErrorMessage('Network error looking up participant. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleScanNext = () => {
    setScannedParticipant(null);
    setErrorMessage(null);
  };

  return (
    <div className="max-w-2xl mx-auto space-y-5 pb-20">
      
      {/* Scanner Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          {onBackToDashboard && (
            <button
              onClick={onBackToDashboard}
              className="p-2.5 rounded-2xl bg-[#00F0FF] border-[2.5px] border-black text-black shadow-comic-sm hover:shadow-comic hover:scale-105 active:scale-95 transition-all cursor-pointer"
              title="Return to Headquarters"
            >
              <ArrowLeft className="w-5 h-5 stroke-[2.5]" />
            </button>
          )}
          <div>
            <div className="inline-block px-2.5 py-0.5 mb-1 rounded-md bg-[#00F0FF] text-black border-2 border-black font-comic tracking-wider text-[11px] shadow-comic-sm uppercase font-bold">
              QR CODE SCANNER
            </div>
            <h2 className="text-xl sm:text-2xl font-comic text-white flex items-center gap-2 tracking-wide font-bold uppercase">
              <Camera className="w-5 h-5 text-[#00F0FF]" />
              RAPID QR SCANNER
            </h2>
            <p className="text-xs font-comic-body font-bold text-slate-300">
              Camera scanner for fast participant check-in and attendance verification.
            </p>
          </div>
        </div>
      </div>

      {/* Error alert if token not found */}
      {errorMessage && (
        <div className="p-4 rounded-2xl bg-[#FF3366] border-[3px] border-black text-white shadow-comic flex items-start justify-between gap-3 animate-in fade-in duration-150">
          <div className="flex items-start gap-2.5">
            <AlertCircle className="w-5 h-5 text-white flex-shrink-0 mt-0.5 stroke-[2.5]" />
            <div>
              <span className="font-comic tracking-wider text-base text-white block font-bold uppercase">
                SCAN ERROR DETECTED
              </span>
              <p className="text-xs font-comic-body font-bold text-white mt-0.5">
                {errorMessage}
              </p>
            </div>
          </div>
          <button
            onClick={() => setErrorMessage(null)}
            className="text-black bg-white hover:bg-[#00F0FF] px-2 py-0.5 rounded-lg border-2 border-black text-xs font-comic tracking-wider shadow-comic-sm cursor-pointer"
          >
            DISMISS
          </button>
        </div>
      )}

      {/* Main View: Either Camera Scanner OR Scanned Result Card */}
      {scannedParticipant ? (
        <ScanResultCard
          scannedData={scannedParticipant}
          onScanNext={handleScanNext}
        />
      ) : (
        <div className="bg-[#1a1c2b] border-[3.5px] border-black rounded-3xl p-5 sm:p-7 shadow-comic-lg flex flex-col items-center relative overflow-hidden">
          <QRScanner
            onScanSuccess={handleScanSuccess}
            isProcessing={isProcessing}
          />
        </div>
      )}

    </div>
  );
};
