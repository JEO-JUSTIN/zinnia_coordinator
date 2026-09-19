import React, { useState, useEffect } from 'react';
import { QRScanner } from '../components/scanner/QRScanner';
import { lookupParticipantByToken, checkDuplicateAttendance, recordAttendance, fetchLiveStats } from '../lib/supabase';
import { ScannedParticipant, AttendanceRecord } from '../types/database';
import { useAuth } from '../lib/auth';
import { feedback } from '../lib/feedback';
import confetti from 'canvas-confetti';
import { 
  DoorOpen, 
  CheckCircle2, 
  AlertTriangle, 
  RefreshCw, 
  ArrowRight,
  ShieldCheck
} from 'lucide-react';

export const CheckinTab: React.FC = () => {
  const { profile } = useAuth();

  // Stats
  const [stats, setStats] = useState({ total: 0, entryCount: 0 });
  const [isLoadingStats, setIsLoadingStats] = useState(false);

  // Scanner & Scanned state
  const [scannedParticipant, setScannedParticipant] = useState<ScannedParticipant | null>(null);
  const [duplicateRecord, setDuplicateRecord] = useState<AttendanceRecord | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [recordedSuccess, setRecordedSuccess] = useState<AttendanceRecord | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const loadCheckinStats = async () => {
    try {
      setIsLoadingStats(true);
      const data = await fetchLiveStats();
      setStats({ total: data.totalParticipants, entryCount: data.entryCount });
    } catch (err) {
      console.error('Failed to load check-in stats:', err);
    } finally {
      setIsLoadingStats(false);
    }
  };

  useEffect(() => {
    loadCheckinStats();
    const interval = setInterval(loadCheckinStats, 15000);
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

      const userId = participant.member.user_id || participant.member.id;

      // Check if gate check-in was already recorded in zin26.participant_checkins
      const prior = await checkDuplicateAttendance(participant.member.id, 'ENTRY', null, userId);
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

  const handleMarkCheckin = async () => {
    if (!scannedParticipant || isSubmitting || duplicateRecord) return;

    try {
      setIsSubmitting(true);
      setErrorMessage(null);

      const { member, team } = scannedParticipant;
      const userId = member.user_id || member.id;

      const res = await recordAttendance({
        team_id: member.team_id,
        member_id: member.id,
        user_id: userId,
        participant_name: member.name,
        college: team.college,
        checkin_type: 'ENTRY',
        event_id: null,
        event_code: null,
        event_name: 'Campus Gate Entry',
        scanned_by: profile?.full_name || 'Gate Staff',
        scanned_by_id: profile?.id || 'coord-gate',
        location: 'Main Gate Arch',
        passport_token_used: member.passport_token,
      });

      if (res.success && res.data) {
        setRecordedSuccess(res.data);
        feedback.success();
        confetti({ particleCount: 45, spread: 60, origin: { y: 0.7 } });
        loadCheckinStats();
      } else if (res.duplicate) {
        setDuplicateRecord(res.priorRecord || null);
        feedback.warning();
      } else {
        setErrorMessage(res.error || 'Failed to record participant check-in.');
        feedback.error();
      }
    } catch (err) {
      console.error('Error marking gate check-in:', err);
      feedback.error();
      setErrorMessage('Failed to submit gate check-in.');
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
      
      {/* Top Banner & Live Gate Check-in Counters */}
      <div className="bg-[#1b1f2d] border-[3.5px] border-black p-5 sm:p-6 shadow-comic-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b-2 border-black">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-[#3B82F6] text-white border-2 border-black shadow-comic-sm flex items-center justify-center">
              <DoorOpen className="w-7 h-7 stroke-[2.5]" />
            </div>
            <div>
              <div className="inline-block bg-[#3B82F6] text-white font-comic tracking-wider text-[10px] px-2.5 py-0.5 border border-black uppercase mb-1">
                CAMPUS ENTRANCE CHECKPOINT
              </div>
              <h2 className="text-xl font-comic tracking-wider text-white uppercase flex items-center gap-2">
                CAMPUS GATE ENTRY SCANNER
              </h2>
              <p className="text-xs text-slate-300 font-comic-body">
                Scan participant QR code to verify credentials and authorize campus check-in.
              </p>
            </div>
          </div>

          <button
            onClick={loadCheckinStats}
            className="self-start sm:self-auto px-3.5 py-2 bg-[#12141d] hover:bg-slate-800 text-cyan-400 border-2 border-black shadow-comic-sm font-comic tracking-wider text-xs uppercase comic-btn flex items-center gap-1.5 cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 stroke-[2.5] ${isLoadingStats ? 'animate-spin text-cyan-400' : ''}`} />
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
            <div className="text-[10px] font-comic uppercase tracking-wider text-[#00E676]">CHECKED IN</div>
            <div className="text-2xl font-comic tracking-wider text-[#00E676] mt-0.5">{stats.entryCount}</div>
          </div>
          <div className="bg-[#12141d] p-3 border-2 border-black shadow-comic-sm">
            <div className="text-[10px] font-comic uppercase tracking-wider text-slate-400">NOT CHECKED IN</div>
            <div className="text-2xl font-comic tracking-wider text-slate-200 mt-0.5">
              {Math.max(0, stats.total - stats.entryCount)}
            </div>
          </div>
          <div className="bg-[#12141d] p-3 border-2 border-black shadow-comic-sm">
            <div className="text-[10px] font-comic uppercase tracking-wider text-[#00F0FF]">CHECK-IN RATE</div>
            <div className="text-2xl font-comic tracking-wider text-[#00F0FF] mt-0.5">
              {calcPct(stats.entryCount, stats.total)}%
            </div>
          </div>
        </div>

        {/* Striped Progress bar */}
        <div className="w-full h-4 bg-black border-2 border-black overflow-hidden mt-4 p-0.5">
          <div 
            className="h-full bg-[#3B82F6] comic-stripes transition-all duration-500"
            style={{ width: `${calcPct(stats.entryCount, stats.total)}%` }}
          />
        </div>
      </div>

      {/* Error Message */}
      {errorMessage && (
        <div className="p-3.5 bg-[#FF3366] text-white border-[3px] border-black shadow-comic text-xs font-bold flex items-center justify-between gap-2">
          <span>SCAN ERROR: {errorMessage}</span>
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
            CHECK-IN RECORDED SUCCESSFULLY!
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
              <span className="text-black font-bold bg-[#00E676] px-1 border border-black">CHECKED IN</span>
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
              <div className="text-[10px] font-comic tracking-wider uppercase text-[#00F0FF] mb-1 flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 stroke-[2.5]" />
                GATE CHECK-IN VERIFICATION
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

          {/* User ID & Passport Info */}
          <div className="pt-2 border-t border-black/40 flex items-center justify-between text-[11px] font-mono text-slate-400">
            <span>ID: <span className="text-white font-bold">{scannedParticipant.member.user_id || scannedParticipant.member.id}</span></span>
            <span>TOKEN: <span className="text-[#00F0FF] font-bold bg-black px-1.5 py-0.5 border border-black">{scannedParticipant.member.passport_token}</span></span>
          </div>

          {/* DUPLICATE WARNING */}
          {duplicateRecord ? (
            <div className="p-4 bg-[#FF3366] text-white border-[3px] border-black shadow-comic animate-in fade-in duration-200">
              <div className="flex items-center gap-2 font-comic font-bold tracking-wider text-base mb-2">
                <AlertTriangle className="w-5 h-5 stroke-[2.5]" />
                ALREADY CHECKED IN AT GATE
              </div>
              <div className="text-xs space-y-1 bg-black text-white p-3 border-2 border-black font-mono">
                <div className="flex justify-between">
                  <span className="text-slate-400">PARTICIPANT:</span>
                  <span className="font-bold text-[#00F0FF]">{duplicateRecord.participant_name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">TIME:</span>
                  <span className="text-white">
                    {duplicateRecord.scanned_at ? new Date(duplicateRecord.scanned_at).toLocaleTimeString() : 'Earlier'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">CHECKED IN BY:</span>
                  <span className="text-white">{duplicateRecord.scanned_by}</span>
                </div>
              </div>

              <button
                onClick={handleScanNext}
                className="mt-4 w-full py-3 px-4 bg-[#00F0FF] hover:bg-[#00d4e0] text-black font-comic font-bold tracking-wider uppercase text-sm border-[2.5px] border-black shadow-comic comic-btn cursor-pointer"
              >
                SCAN NEXT PARTICIPANT
              </button>
            </div>
          ) : (
            /* MARK CHECKIN BUTTON */
            <div className="pt-2">
              <button
                onClick={handleMarkCheckin}
                disabled={isSubmitting}
                className="w-full py-4 px-6 bg-[#00F0FF] hover:bg-[#00d4e0] text-black font-comic font-bold tracking-wider text-base sm:text-lg uppercase border-[3.5px] border-black shadow-comic comic-btn flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
              >
                {isSubmitting ? (
                  <>
                    <RefreshCw className="w-5 h-5 stroke-[2.5] animate-spin" />
                    RECORDING CHECK-IN...
                  </>
                ) : (
                  <>
                    <DoorOpen className="w-5 h-5 stroke-[2.5]" />
                    CONFIRM GATE CHECK-IN
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
