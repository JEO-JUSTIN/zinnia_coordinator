import React, { useState, useEffect } from 'react';
import { QRScanner } from '../components/scanner/QRScanner';
import { lookupParticipantByToken, checkDuplicateAttendance, recordAttendance, fetchLiveStats } from '../lib/supabase';
import { ScannedParticipant, AttendanceRecord } from '../types/database';
import { useAuth } from '../lib/auth';
import { feedback } from '../lib/feedback';
import confetti from 'canvas-confetti';
import { 
  Utensils, 
  CheckCircle2, 
  AlertTriangle, 
  RefreshCw, 
  ArrowRight
} from 'lucide-react';

export const FoodTab: React.FC = () => {
  const { profile } = useAuth();

  // Stats
  const [stats, setStats] = useState({ total: 0, foodCount: 0 });
  const [isLoadingStats, setIsLoadingStats] = useState(false);

  // Scanner & Scanned state
  const [scannedParticipant, setScannedParticipant] = useState<ScannedParticipant | null>(null);
  const [duplicateRecord, setDuplicateRecord] = useState<AttendanceRecord | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [recordedSuccess, setRecordedSuccess] = useState<AttendanceRecord | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const loadFoodStats = async () => {
    try {
      setIsLoadingStats(true);
      const data = await fetchLiveStats();
      setStats({ total: data.totalParticipants, foodCount: data.foodCount });
    } catch (err) {
      console.error('Failed to load food stats:', err);
    } finally {
      setIsLoadingStats(false);
    }
  };

  useEffect(() => {
    loadFoodStats();
    const interval = setInterval(loadFoodStats, 15000);
    return () => clearInterval(interval);
  }, []);

  const handleScanSuccess = async (token: string) => {
    if (isProcessing || scannedParticipant || recordedSuccess) return;

    try {
      setIsProcessing(true);
      setErrorMessage(null);
      setDuplicateRecord(null);

      const participant = await lookupParticipantByToken(token);
      if (!participant) {
        feedback.error();
        setErrorMessage(`No participant found for passport token: "${token}".`);
        return;
      }

      // Check if food was already received
      const prior = await checkDuplicateAttendance(participant.member.id, 'FOOD');
      if (prior) {
        feedback.warning();
        setDuplicateRecord(prior);
      }

      setScannedParticipant(participant);
    } catch (err) {
      console.error('Scan error:', err);
      feedback.error();
      setErrorMessage('Network error during scan lookup.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleMarkFoodReceived = async () => {
    if (!scannedParticipant || isSubmitting || duplicateRecord) return;

    try {
      setIsSubmitting(true);
      setErrorMessage(null);

      const { member, team } = scannedParticipant;
      const res = await recordAttendance({
        team_id: member.team_id,
        member_id: member.id,
        participant_name: member.name,
        college: team.college,
        checkin_type: 'FOOD',
        event_id: null,
        event_name: null,
        scanned_by: profile?.full_name || 'Food Coordinator',
        scanned_by_id: profile?.id || 'coord-food',
        location: 'Dining Hall Counter',
        passport_token_used: member.passport_token,
      });

      if (res.success && res.data) {
        setRecordedSuccess(res.data);
        feedback.success();
        confetti({ particleCount: 45, spread: 60, origin: { y: 0.7 } });
        loadFoodStats();
      } else if (res.duplicate) {
        setDuplicateRecord(res.priorRecord || null);
        feedback.warning();
      } else {
        setErrorMessage(res.error || 'Failed to record food attendance.');
        feedback.error();
      }
    } catch (err) {
      console.error('Error marking food:', err);
      feedback.error();
      setErrorMessage('Failed to submit food checkin.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleScanNext = () => {
    setScannedParticipant(null);
    setDuplicateRecord(null);
    setRecordedSuccess(null);
    setErrorMessage(null);
  };

  const calcPct = (count: number, total: number) => {
    if (!total || total === 0) return 0;
    return Math.round((count / total) * 100);
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6 pb-24">
      
      {/* Top Banner & Live Food Counters */}
      <div className="bg-[#1b1f2d] border-[3.5px] border-black p-5 sm:p-6 shadow-comic-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b-2 border-black">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-[#F59E0B] text-black border-2 border-black shadow-comic-sm flex items-center justify-center -rotate-2">
              <Utensils className="w-7 h-7 stroke-[2.5]" />
            </div>
            <div>
              <div className="inline-block bg-[#00E676] text-black font-comic font-bold tracking-wider text-[10px] px-2.5 py-0.5 border border-black uppercase mb-1">
                MEAL DISTRIBUTION DESK
              </div>
              <h2 className="text-xl font-comic tracking-wider text-white uppercase flex items-center gap-2">
                FOOD COMMITTEE MEAL TRACKER
              </h2>
              <p className="text-xs text-slate-300 font-comic-body">
                Scan participant QR code to verify meal eligibility and record meal distribution.
              </p>
            </div>
          </div>

          <button
            onClick={loadFoodStats}
            className="self-start sm:self-auto px-3.5 py-2 bg-[#12141d] hover:bg-slate-800 text-[#00F0FF] border-2 border-black shadow-comic-sm font-comic tracking-wider text-xs uppercase comic-btn flex items-center gap-1.5 cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 stroke-[2.5] ${isLoadingStats ? 'animate-spin text-[#00F0FF]' : ''}`} />
            REFRESH STATS
          </button>
        </div>

        {/* Live Counters */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 mt-4">
          <div className="bg-[#12141d] p-3 border-2 border-black shadow-comic-sm">
            <div className="text-[10px] font-comic uppercase tracking-wider text-slate-400">TOTAL PARTICIPANTS</div>
            <div className="text-2xl font-comic tracking-wider text-white mt-0.5">{stats.total}</div>
          </div>
          <div className="bg-[#12141d] p-3 border-2 border-black shadow-comic-sm">
            <div className="text-[10px] font-comic uppercase tracking-wider text-[#00E676]">MEALS DISTRIBUTED</div>
            <div className="text-2xl font-comic tracking-wider text-[#00E676] mt-0.5">{stats.foodCount}</div>
          </div>
          <div className="bg-[#12141d] p-3 border-2 border-black shadow-comic-sm">
            <div className="text-[10px] font-comic uppercase tracking-wider text-slate-400">PENDING MEALS</div>
            <div className="text-2xl font-comic tracking-wider text-slate-200 mt-0.5">
              {Math.max(0, stats.total - stats.foodCount)}
            </div>
          </div>
          <div className="bg-[#12141d] p-3 border-2 border-black shadow-comic-sm">
            <div className="text-[10px] font-comic uppercase tracking-wider text-[#00F0FF]">CLAIM RATE</div>
            <div className="text-2xl font-comic tracking-wider text-[#00F0FF] mt-0.5">
              {calcPct(stats.foodCount, stats.total)}%
            </div>
          </div>
        </div>

        {/* Striped Progress bar */}
        <div className="w-full h-4 bg-black border-2 border-black overflow-hidden mt-4 p-0.5">
          <div 
            className="h-full bg-[#00E676] comic-stripes transition-all duration-500"
            style={{ width: `${calcPct(stats.foodCount, stats.total)}%` }}
          />
        </div>
      </div>

      {/* Error Message */}
      {errorMessage && (
        <div className="p-3.5 bg-[#FF3366] text-white border-[3px] border-black shadow-comic text-xs font-bold flex items-center justify-between gap-2">
          <span>ERROR: {errorMessage}</span>
          <button onClick={() => setErrorMessage(null)} className="w-6 h-6 bg-black text-white border border-white font-bold flex items-center justify-center text-xs cursor-pointer">✕</button>
        </div>
      )}

      {/* Main Scanner or Result */}
      {recordedSuccess ? (
        /* SUCCESS CARD */
        <div className="bg-[#00E676] text-black border-[4px] border-black p-6 shadow-comic-xl text-center animate-in zoom-in-95 duration-200 relative overflow-hidden">
          <div className="w-16 h-16 bg-black text-[#00E676] border-[3px] border-black mx-auto flex items-center justify-center mb-3 shadow-comic">
            <CheckCircle2 className="w-10 h-10 stroke-[3]" />
          </div>
          <span className="inline-block px-3 py-1 font-comic tracking-wider text-sm uppercase bg-black text-[#00E676] border-2 border-black shadow-comic-sm mb-2">
            MEAL ISSUED SUCCESSFULLY!
          </span>
          <h3 className="text-2xl font-comic tracking-wider text-black uppercase mt-1 mb-1">
            {recordedSuccess.participant_name}
          </h3>
          <p className="text-xs text-black font-mono font-bold mb-4">
            COLLEGE: {recordedSuccess.college}
          </p>

          <div className="bg-[#FFFDF0] text-black border-[2.5px] border-black p-3.5 text-left space-y-1 mb-5 shadow-comic-sm font-mono text-xs max-w-sm mx-auto">
            <div className="flex justify-between">
              <span className="font-bold text-slate-700">STATUS:</span>
              <span className="text-black font-bold bg-[#00E676] px-1 border border-black">MEAL CLAIMED</span>
            </div>
            <div className="flex justify-between">
              <span className="font-bold text-slate-700">RECORDED AT:</span>
              <span className="font-bold text-black">{new Date(recordedSuccess.scanned_at || '').toLocaleTimeString()}</span>
            </div>
            <div className="flex justify-between">
              <span className="font-bold text-slate-700">COORDINATOR:</span>
              <span className="font-bold text-black">{recordedSuccess.scanned_by}</span>
            </div>
          </div>

          <button
            onClick={handleScanNext}
            className="w-full max-w-sm py-3.5 px-6 bg-black hover:bg-slate-900 text-white font-comic font-bold tracking-wider text-base uppercase border-[3px] border-black shadow-comic comic-btn flex items-center justify-center gap-2 mx-auto cursor-pointer"
          >
            SCAN NEXT PARTICIPANT
            <ArrowRight className="w-5 h-5 stroke-[2.5]" />
          </button>
        </div>
      ) : scannedParticipant ? (
        /* PARTICIPANT DETAILS & ACTION */
        <div className="bg-[#1b1f2d] border-[4px] border-black p-6 shadow-comic-xl space-y-4">
          <div className="flex items-start justify-between gap-3 border-b-2 border-black pb-3">
            <div>
              <div className="text-[10px] font-comic tracking-wider uppercase text-[#F59E0B] mb-1 flex items-center gap-1">
                <Utensils className="w-3.5 h-3.5 stroke-[2.5]" />
                MEAL PARTICIPANT VERIFICATION
              </div>
              <h3 className="text-2xl font-comic tracking-wider text-white uppercase flex items-center gap-2">
                {scannedParticipant.member.name}
                {scannedParticipant.member.is_leader && (
                  <span className="text-[10px] font-comic font-bold tracking-wider px-2 py-0.5 bg-[#FF3366] text-white border border-black shadow-comic-sm">
                    TEAM LEADER
                  </span>
                )}
              </h3>
            </div>
            <span className="px-2.5 py-1 bg-black text-[#00F0FF] border-2 border-black font-mono font-bold text-xs shadow-comic-sm">
              {scannedParticipant.team.team_id}
            </span>
          </div>

          {/* Academic Info */}
          <div className="grid grid-cols-2 gap-2 text-xs font-comic-body">
            <div className="bg-[#12141d] p-2.5 border-2 border-black shadow-comic-sm text-slate-200">
              <div className="text-[10px] text-slate-400 font-comic uppercase">COLLEGE</div>
              <div className="font-bold truncate">{scannedParticipant.team.college}</div>
            </div>
            <div className="bg-[#12141d] p-2.5 border-2 border-black shadow-comic-sm text-slate-200">
              <div className="text-[10px] text-slate-400 font-comic uppercase">DEPARTMENT</div>
              <div className="font-bold truncate">{scannedParticipant.team.department}</div>
            </div>
            <div className="bg-[#12141d] p-2.5 border-2 border-black shadow-comic-sm text-slate-200">
              <div className="text-[10px] text-slate-400 font-comic uppercase">YEAR</div>
              <div className="font-bold">YEAR {scannedParticipant.team.year}</div>
            </div>
            <div className="bg-[#12141d] p-2.5 border-2 border-black shadow-comic-sm text-slate-200">
              <div className="text-[10px] text-slate-400 font-comic uppercase">TEAM NAME</div>
              <div className="font-bold text-[#00F0FF] truncate">{scannedParticipant.team.team_name}</div>
            </div>
          </div>

          {/* DUPLICATE WARNING */}
          {duplicateRecord ? (
            <div className="p-4 bg-[#FF3366] text-white border-[3px] border-black shadow-comic animate-in fade-in duration-200">
              <div className="flex items-center gap-2 font-comic font-bold tracking-wider text-base mb-2">
                <AlertTriangle className="w-5 h-5 stroke-[2.5]" />
                ALREADY RECEIVED MEAL
              </div>
              <div className="text-xs space-y-1 bg-black text-white p-3 border-2 border-black font-mono">
                <div className="flex justify-between">
                  <span className="text-slate-400">PARTICIPANT:</span>
                  <span className="font-bold text-[#00F0FF]">{duplicateRecord.participant_name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">RECEIVED AT:</span>
                  <span className="text-white">
                    {duplicateRecord.scanned_at ? new Date(duplicateRecord.scanned_at).toLocaleTimeString() : 'Earlier'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">DISTRIBUTED BY:</span>
                  <span className="text-white">{duplicateRecord.scanned_by}</span>
                </div>
              </div>

              <button
                onClick={handleScanNext}
                className="mt-4 w-full py-3 px-4 bg-[#00F0FF] hover:bg-[#00d4e0] text-black font-comic tracking-wider uppercase text-sm border-[2.5px] border-black shadow-comic comic-btn cursor-pointer font-bold"
              >
                SCAN NEXT PARTICIPANT
              </button>
            </div>
          ) : (
            /* MARK FOOD RECEIVED BUTTON */
            <div className="pt-2">
              <button
                onClick={handleMarkFoodReceived}
                disabled={isSubmitting}
                className="w-full py-4 px-6 bg-[#00E676] hover:bg-emerald-400 text-black font-comic tracking-wider text-base sm:text-lg uppercase border-[3.5px] border-black shadow-comic comic-btn flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer font-bold"
              >
                {isSubmitting ? (
                  <>
                    <RefreshCw className="w-5 h-5 stroke-[2.5] animate-spin" />
                    RECORDING MEAL...
                  </>
                ) : (
                  <>
                    <Utensils className="w-5 h-5 stroke-[2.5]" />
                    CONFIRM MEAL DISTRIBUTION
                  </>
                )}
              </button>

              <button
                onClick={handleScanNext}
                className="w-full py-2 font-comic tracking-wider uppercase text-xs text-slate-400 hover:text-white mt-2 cursor-pointer"
              >
                DISMISS / SCAN ANOTHER
              </button>
            </div>
          )}

        </div>
      ) : (
        /* SCANNER VIEWPORT */
        <div className="bg-[#1b1f2d] border-[3.5px] border-black p-5 sm:p-7 shadow-comic-xl flex flex-col items-center">
          <QRScanner
            onScanSuccess={handleScanSuccess}
            isProcessing={isProcessing}
          />
        </div>
      )}

    </div>
  );
};
