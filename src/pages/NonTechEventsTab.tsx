import React, { useState, useEffect } from 'react';
import { QRScanner } from '../components/scanner/QRScanner';
import { lookupParticipantByToken, checkDuplicateAttendance, recordAttendance, fetchLiveStats } from '../lib/supabase';
import { ScannedParticipant, AttendanceRecord, EventItem } from '../types/database';
import { useAuth } from '../lib/auth';
import { feedback } from '../lib/feedback';
import confetti from 'canvas-confetti';
import { 
  Compass, 
  CheckCircle2, 
  AlertTriangle, 
  RefreshCw, 
  ArrowRight,
  MapPin,
  Clock,
  Award,
  ShieldAlert,
  X
} from 'lucide-react';

export const NonTechEventsTab: React.FC = () => {
  const { profile, permissions } = useAuth();

  const [events, setEvents] = useState<EventItem[]>([]);
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [selectedEventId, setSelectedEventId] = useState<string>('');

  // Scanner state
  const [scannedParticipant, setScannedParticipant] = useState<ScannedParticipant | null>(null);
  const [duplicateRecord, setDuplicateRecord] = useState<AttendanceRecord | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [recordedSuccess, setRecordedSuccess] = useState<AttendanceRecord | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [eventRegCounts, setEventRegCounts] = useState<Record<string, number>>({});
  const [eventPresCounts, setEventPresCounts] = useState<Record<string, number>>({});

  const loadData = async () => {
    try {
      const data = await fetchLiveStats();
      const normalize = (val?: string) => (val || '').toUpperCase().replace(/[-_\s]/g, '');
      const isNonTech = (e: EventItem) => {
        const t = normalize(e.event_type);
        const c = normalize(e.category);
        return t === 'NONTECH' || t.includes('NONTECH') || c.includes('NONTECH');
      };

      // Filter NON_TECH events visible to coordinator
      const nonTechEvs = data.events.filter(e => {
        if (!isNonTech(e)) return false;
        // Super Admin and Overall Non-Tech see all non-tech events
        if (permissions.isSuperAdmin || permissions.isOverallNonTech) return true;
        // Individual event coordinator can ONLY see their assigned non-tech event
        if (permissions.assignedNonTechEventIds.includes(e.id)) return true;
        return false;
      });

      setEvents(nonTechEvs);
      setRecords(data.records);
      setEventRegCounts(data.eventRegistrationCounts || {});
      setEventPresCounts(data.eventPresentCounts || {});

      if (!selectedEventId && nonTechEvs.length > 0) {
        setSelectedEventId(nonTechEvs[0].id);
      }
    } catch (err) {
      console.error('Error loading non-tech events data:', err);
    }
  };

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 15000);
    return () => clearInterval(interval);
  }, [permissions]);

  const currentEvent = events.find(e => e.id === selectedEventId) || events[0];

  // Attendances for current event
  const currentEventRecords = records.filter(
    r => r.checkin_type === 'EVENT' && (r.event_id === currentEvent?.id || r.event_code === currentEvent?.code)
  );

  const handleScanSuccess = async (token: string) => {
    if (isProcessing || scannedParticipant || recordedSuccess || !currentEvent) return;

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

      // Check if participant is already marked present for THIS event
      const prior = await checkDuplicateAttendance(participant.member.id, 'EVENT', currentEvent.id);
      if (prior) {
        feedback.warning();
        setDuplicateRecord(prior);
      } else {
        const isRegisteredForThis = (participant.registered_events || participant.events || []).some(
          (ev: EventItem) => (ev.code && ev.code.toUpperCase() === currentEvent.code?.toUpperCase()) || 
                            (ev.id && ev.id.toUpperCase() === currentEvent.id.toUpperCase())
        );

        if (!isRegisteredForThis) {
          feedback.error();
        }
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

  const handleMarkAttendance = async () => {
    if (!scannedParticipant || isSubmitting || duplicateRecord || !currentEvent) return;

    try {
      setIsSubmitting(true);
      setErrorMessage(null);

      const { member, team } = scannedParticipant;
      const res = await recordAttendance({
        team_id: member.team_id,
        member_id: member.id,
        participant_name: member.name,
        college: team.college,
        checkin_type: 'EVENT',
        event_id: currentEvent.id,
        event_name: currentEvent.title,
        scanned_by: profile?.full_name || 'Non-Tech Event Coordinator',
        scanned_by_id: profile?.id || 'coord-nontech',
        location: currentEvent.venue || 'Campus Arena',
        passport_token_used: member.passport_token,
      });

      if (res.success && res.data) {
        setRecordedSuccess(res.data);
        feedback.success();
        confetti({ particleCount: 45, spread: 60, origin: { y: 0.7 } });
        loadData();
      } else if (res.duplicate) {
        setDuplicateRecord(res.priorRecord || null);
        feedback.warning();
      } else {
        setErrorMessage(res.error || 'Failed to record event attendance.');
        feedback.error();
      }
    } catch (err) {
      console.error('Error recording non-tech attendance:', err);
      feedback.error();
      setErrorMessage('Failed to submit event checkin.');
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

  if (events.length === 0) {
    return (
      <div className="max-w-2xl mx-auto bg-slate-900 border border-slate-800 rounded-3xl p-8 text-center text-slate-400">
        <Compass className="w-12 h-12 text-slate-600 mx-auto mb-3" />
        <h3 className="text-base font-bold text-white mb-1">
          {permissions.isSuperAdmin ? 'No Non-Tech Events Found in Database' : 'No Non-Tech Events Assigned'}
        </h3>
        <p className="text-xs">
          {permissions.isSuperAdmin 
            ? 'Super Admin full access is active. No non-technical events were returned from the events table.'
            : 'You do not have coordinator access to any non-technical events.'}
        </p>
      </div>
    );
  }

  const currentCode = currentEvent?.code || currentEvent?.id || '';
  const registeredCount = eventRegCounts[currentCode] ?? eventRegCounts[currentEvent?.id || ''] ?? 0;
  const presentCount = eventPresCounts[currentCode] ?? currentEventRecords.length;
  const absentCount = Math.max(0, registeredCount - presentCount);

  return (
    <div className="max-w-3xl mx-auto space-y-6 pb-24">
      
      {/* Event Selector Pill Bar */}
      {(permissions.isSuperAdmin || permissions.isOverallNonTech) && events.length > 1 && (
        <div className="flex items-center gap-2 overflow-x-auto pb-1">
          {events.map(ev => (
            <button
              key={ev.id}
              onClick={() => {
                setSelectedEventId(ev.id);
                handleScanNext();
              }}
              className={`px-3.5 py-1.5 font-comic tracking-wider uppercase text-xs border-2 transition-all flex items-center gap-1.5 cursor-pointer whitespace-nowrap ${
                currentEvent?.id === ev.id
                  ? 'bg-[#A855F7] text-white border-black shadow-comic font-bold -translate-y-0.5'
                  : 'bg-[#12141d] text-slate-300 border-black hover:bg-slate-800'
              }`}
            >
              <Compass className="w-3.5 h-3.5 stroke-[2.5]" />
              {ev.title}
            </button>
          ))}
        </div>
      )}

      {/* Top Event Banner */}
      <div className="bg-[#1b1f2d] border-[3.5px] border-black p-5 sm:p-6 shadow-comic-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b-2 border-black">
          <div>
            <div className="inline-block bg-[#A855F7] text-white font-comic font-bold tracking-wider text-[10px] px-2.5 py-0.5 border border-black uppercase mb-1">
              NON-TECHNICAL EVENT
            </div>
            <h2 className="text-2xl font-comic tracking-wider text-white uppercase">
              {currentEvent.title}
            </h2>
            <div className="flex flex-wrap items-center gap-3 text-xs text-slate-300 font-mono mt-1">
              <span className="flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5 text-[#A855F7] stroke-[2.5]" />
                {currentEvent.venue || 'Venue TBA'}
              </span>
              <span className="flex items-center gap-1">
                <Clock className="w-3.5 h-3.5 text-[#00F0FF] stroke-[2.5]" />
                {currentEvent.schedule_time || 'Schedule announced'}
              </span>
            </div>
          </div>

          <button
            onClick={loadData}
            className="self-start sm:self-auto px-3.5 py-2 bg-[#12141d] hover:bg-slate-800 text-[#00F0FF] border-2 border-black shadow-comic-sm font-comic tracking-wider text-xs uppercase comic-btn flex items-center gap-1.5 cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5 stroke-[2.5]" />
            REFRESH STATS
          </button>
        </div>

        {/* Counters */}
        <div className="grid grid-cols-3 gap-2.5 mt-4 text-center">
          <div className="bg-[#12141d] p-3 border-2 border-black shadow-comic-sm">
            <div className="text-[10px] font-comic uppercase tracking-wider text-slate-400">REGISTERED</div>
            <div className="text-2xl font-comic tracking-wider text-white mt-0.5">{registeredCount}</div>
          </div>
          <div className="bg-[#12141d] p-3 border-2 border-black shadow-comic-sm">
            <div className="text-[10px] font-comic uppercase tracking-wider text-[#00E676]">PRESENT</div>
            <div className="text-2xl font-comic tracking-wider text-[#00E676] mt-0.5">{presentCount}</div>
          </div>
          <div className="bg-[#12141d] p-3 border-2 border-black shadow-comic-sm">
            <div className="text-[10px] font-comic uppercase tracking-wider text-slate-400">ABSENT</div>
            <div className="text-2xl font-comic tracking-wider text-slate-300 mt-0.5">{absentCount}</div>
          </div>
        </div>
      </div>

      {/* Error Alert */}
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
            ATTENDANCE RECORDED SUCCESSFULLY!
          </span>
          <h3 className="text-2xl font-comic tracking-wider text-black uppercase mt-1 mb-1">
            {recordedSuccess.participant_name}
          </h3>
          <p className="text-xs text-black font-mono font-bold mb-4">
            EVENT: {currentEvent.title}
          </p>

          <div className="bg-[#FFFDF0] text-black border-[2.5px] border-black p-3.5 text-left space-y-1 mb-5 shadow-comic-sm font-mono text-xs max-w-sm mx-auto">
            <div className="flex justify-between">
              <span className="font-bold text-slate-700">STATUS:</span>
              <span className="text-black font-bold bg-[#00E676] px-1 border border-black">CONFIRMED PRESENT</span>
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
              <div className="text-[10px] font-comic tracking-wider uppercase text-[#A855F7] mb-1">
                🎨 NON-TECH EVENT CANDIDATE
              </div>
              <h3 className="text-2xl font-comic tracking-wider text-white uppercase flex items-center gap-2">
                {scannedParticipant.member.name}
                {scannedParticipant.member.is_leader && (
                  <span className="text-[10px] font-comic tracking-wider px-2 py-0.5 bg-[#FF3366] text-white border border-black shadow-comic-sm rotate-2">
                    ★ LEADER ★
                  </span>
                )}
              </h3>
            </div>
            <span className="px-2.5 py-1 bg-black text-[#A855F7] border-2 border-black font-mono font-bold text-xs shadow-comic-sm">
              {scannedParticipant.team.team_id}
            </span>
          </div>

          {/* Comic Academic Info */}
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
              <div className="font-bold text-[#A855F7] truncate">{scannedParticipant.team.team_name}</div>
            </div>
          </div>

          {/* EVENT REGISTRATION STATUS */}
          {(() => {
            const isRegisteredForThis = (scannedParticipant.registered_events || scannedParticipant.events || []).some(
              (ev: EventItem) => (ev.code && ev.code.toUpperCase() === currentEvent?.code?.toUpperCase()) || 
                                (ev.id && ev.id.toUpperCase() === currentEvent?.id?.toUpperCase())
            );

            const appliedEvents = scannedParticipant.registered_events || scannedParticipant.events || [];

            return (
              <>
                <div className="p-3.5 bg-[#12141d] border-2 border-black shadow-comic-sm space-y-2">
                  <div className="flex items-center justify-between text-xs font-comic uppercase">
                    <span className="text-slate-300 font-bold">ROSTER STATUS:</span>
                    {isRegisteredForThis ? (
                      <span className="text-black font-bold flex items-center gap-1 bg-[#00E676] px-2.5 py-0.5 border border-black shadow-comic-sm">
                        <CheckCircle2 className="w-3.5 h-3.5 stroke-[2.5]" />
                        PRE-REGISTERED FOR {currentEvent.title}
                      </span>
                    ) : (
                      <span className="text-white font-bold flex items-center gap-1 bg-[#FF3366] px-2.5 py-0.5 border border-black shadow-comic-sm">
                        <X className="w-3.5 h-3.5 stroke-[3]" />
                        NOT REGISTERED
                      </span>
                    )}
                  </div>

                  <div className="flex flex-wrap items-center gap-1.5 pt-1">
                    <span className="text-[10px] text-slate-400 font-comic uppercase">REGISTERED EVENTS:</span>
                    {appliedEvents.length > 0 ? (
                      appliedEvents.map((ev: EventItem) => {
                        const isThisOne = (ev.code && ev.code.toUpperCase() === currentEvent?.code?.toUpperCase()) || 
                                          (ev.id && ev.id.toUpperCase() === currentEvent?.id?.toUpperCase());
                        return (
                          <span
                            key={ev.id || ev.code}
                            className={`text-[10px] font-comic tracking-wider px-2 py-0.5 border border-black uppercase ${
                              isThisOne
                                ? 'bg-[#00E676] text-black font-bold shadow-comic-sm'
                                : 'bg-black text-slate-300'
                            }`}
                          >
                            {ev.title}
                          </span>
                        );
                      })
                    ) : (
                      <span className="text-[10px] text-slate-400 font-mono">None (Unregistered)</span>
                    )}
                  </div>
                </div>

                {/* DUPLICATE WARNING */}
                {duplicateRecord ? (
                  <div className="p-4 bg-[#FF3366] text-white border-[3px] border-black shadow-comic animate-in fade-in duration-200">
                    <div className="flex items-center gap-2 font-comic font-bold tracking-wider text-base mb-2">
                      <AlertTriangle className="w-5 h-5 stroke-[2.5]" />
                      ALREADY MARKED PRESENT IN THIS EVENT
                    </div>
                    <div className="text-xs space-y-1 bg-black text-white p-3 border-2 border-black font-mono">
                      <div className="flex justify-between">
                        <span className="text-slate-400">EVENT:</span>
                        <span className="font-bold text-[#00F0FF] truncate max-w-[200px]">{currentEvent.title}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">RECORDED AT:</span>
                        <span className="text-white">
                          {duplicateRecord.scanned_at ? new Date(duplicateRecord.scanned_at).toLocaleTimeString() : 'Earlier'}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">COORDINATOR:</span>
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
                ) : !isRegisteredForThis ? (
                  /* UNREGISTERED CANDIDATE - ENTRY STRICTLY DENIED */
                  <div className="p-4 bg-[#FF3366] text-white border-[3.5px] border-black shadow-comic animate-in fade-in duration-200">
                    <div className="flex items-center gap-2 font-comic tracking-wider text-base sm:text-lg mb-2">
                      <ShieldAlert className="w-6 h-6 stroke-[2.5] shrink-0" />
                      <span>ENTRY DENIED — NOT PRE-REGISTERED</span>
                    </div>

                    <p className="text-xs font-comic-body text-white mb-3">
                      This participant is <b>NOT</b> pre-registered for <b>{currentEvent.title}</b>. Spot registration is disabled. Only pre-registered participants may attend.
                    </p>

                    <div className="text-xs space-y-2 bg-black text-white p-3 border-2 border-black font-mono mb-4">
                      <div className="flex justify-between items-center text-slate-300 text-[11px]">
                        <span>CURRENT EVENT:</span>
                        <span className="font-bold text-[#FF3366] uppercase">{currentEvent.title}</span>
                      </div>
                      <div className="border-t border-slate-800 pt-2">
                        <div className="text-[10px] text-slate-400 uppercase mb-1">THEIR REGISTERED EVENTS:</div>
                        <div className="flex flex-wrap gap-1">
                          {appliedEvents.length > 0 ? (
                            appliedEvents.map((ev: EventItem) => (
                              <span key={ev.id || ev.code} className="text-[10px] font-comic px-2 py-0.5 bg-[#12141d] text-[#00E676] border border-slate-700">
                                {ev.title}
                              </span>
                            ))
                          ) : (
                            <span className="text-[10px] text-slate-400 italic">No event registrations on record</span>
                          )}
                        </div>
                      </div>
                    </div>

                    <button
                      onClick={handleScanNext}
                      className="w-full py-3.5 px-4 bg-[#00F0FF] hover:bg-[#00d4e0] text-black font-comic font-bold tracking-wider text-base uppercase border-[3px] border-black shadow-comic comic-btn flex items-center justify-center gap-2 cursor-pointer"
                    >
                      DISMISS & SCAN NEXT PARTICIPANT
                    </button>
                  </div>
                ) : (
                  /* MARK EVENT ATTENDANCE BUTTON - PRE-REGISTERED ONLY */
                  <div className="pt-2">
                    <button
                      onClick={handleMarkAttendance}
                      disabled={isSubmitting}
                      className="w-full py-4 px-6 font-comic font-bold tracking-wider text-base sm:text-lg uppercase border-[3.5px] border-black shadow-comic comic-btn flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer bg-[#A855F7] hover:bg-purple-500 text-white"
                    >
                      {isSubmitting ? (
                        <>
                          <RefreshCw className="w-5 h-5 stroke-[2.5] animate-spin" />
                          RECORDING ATTENDANCE...
                        </>
                      ) : (
                        <>
                          <Award className="w-5 h-5 stroke-[2.5]" />
                          CONFIRM EVENT ATTENDANCE
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
              </>
            );
          })()}

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
