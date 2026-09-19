import React, { useState, useEffect } from 'react';
import { ScannedParticipant, CheckinType, AttendanceRecord } from '../../types/database';
import { useAuth } from '../../lib/auth';
import { checkDuplicateAttendance, recordAttendance } from '../../lib/supabase';
import { feedback } from '../../lib/feedback';
import confetti from 'canvas-confetti';
import { 
  CheckCircle2, 
  AlertTriangle, 
  Calendar, 
  ArrowRight, 
  Utensils, 
  DoorOpen, 
  Award,
  RefreshCw
} from 'lucide-react';

interface ScanResultCardProps {
  scannedData: ScannedParticipant;
  onScanNext: () => void;
  onAttendanceRecorded?: () => void;
}

export const ScanResultCard: React.FC<ScanResultCardProps> = ({ 
  scannedData, 
  onScanNext, 
  onAttendanceRecorded 
}) => {
  const { profile, permissions } = useAuth();
  const { member, team, events } = scannedData;

  // Determine available checkin types based on coordinator permissions
  const availableTypes: CheckinType[] = [];
  if (permissions.canScanEntry) availableTypes.push('ENTRY');
  if (permissions.canScanFood) availableTypes.push('FOOD');
  if (permissions.isSuperAdmin || permissions.isOverallTech || permissions.isOverallNonTech || permissions.assignedEventIds.length > 0) {
    availableTypes.push('EVENT');
  }

  // Selected action mode
  const [selectedType, setSelectedType] = useState<CheckinType>(availableTypes[0] || 'ENTRY');

  // For Event mode: select target event
  // Filter events the coordinator is authorized for
  const eligibleEvents = events.filter(e => {
    if (permissions.isSuperAdmin) return true;
    if (permissions.isOverallTech && e.event_type === 'TECH') return true;
    if (permissions.isOverallNonTech && e.event_type === 'NON_TECH') return true;
    if (permissions.assignedEventIds.includes(e.id)) return true;
    return false;
  });

  const [selectedEventId, setSelectedEventId] = useState<string>(
    eligibleEvents[0]?.id || events[0]?.id || ''
  );

  const selectedEvent = events.find(e => e.id === selectedEventId);

  // Duplicate check status
  const [isCheckingDuplicate, setIsCheckingDuplicate] = useState<boolean>(true);
  const [duplicateRecord, setDuplicateRecord] = useState<AttendanceRecord | null>(null);
  
  // Submission status
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [recordedSuccess, setRecordedSuccess] = useState<AttendanceRecord | null>(null);
  const [submissionError, setSubmissionError] = useState<string | null>(null);

  // Check duplicate whenever selectedType or selectedEventId changes
  useEffect(() => {
    let isMounted = true;
    const verifyDuplicate = async () => {
      setIsCheckingDuplicate(true);
      setSubmissionError(null);
      
      const targetEventId = selectedType === 'EVENT' ? selectedEventId : null;
      const prior = await checkDuplicateAttendance(member.id, selectedType, targetEventId);
      
      if (isMounted) {
        setDuplicateRecord(prior);
        setIsCheckingDuplicate(false);
        if (prior) {
          feedback.warning();
        }
      }
    };

    verifyDuplicate();

    return () => {
      isMounted = false;
    };
  }, [member.id, selectedType, selectedEventId]);

  const handleRecordAttendance = async () => {
    if (isSubmitting || duplicateRecord) return;

    try {
      setIsSubmitting(true);
      setSubmissionError(null);

      const targetEvent = selectedType === 'EVENT' ? selectedEvent : null;
      const scanLocation = targetEvent?.venue || (selectedType === 'ENTRY' ? 'Gate 1' : 'Dining Hall Counter');
      const userId = member.user_id || member.id;

      const res = await recordAttendance({
        team_id: member.team_id,
        member_id: member.id,
        user_id: userId,
        participant_name: member.name,
        college: team.college,
        checkin_type: selectedType,
        event_id: targetEvent ? targetEvent.id : null,
        event_code: targetEvent ? (targetEvent.code || targetEvent.id) : null,
        event_name: targetEvent ? targetEvent.title : null,
        scanned_by: profile?.full_name || 'Coordinator Staff',
        scanned_by_id: profile?.id || 'admin-system',
        location: scanLocation,
        passport_token_used: member.passport_token,
      });

      if (res.success && res.data) {
        setRecordedSuccess(res.data);
        feedback.success();
        confetti({
          particleCount: 50,
          spread: 60,
          origin: { y: 0.7 }
        });
        if (onAttendanceRecorded) {
          onAttendanceRecorded();
        }
      } else if (res.duplicate) {
        setDuplicateRecord(res.priorRecord || null);
        feedback.warning();
      } else {
        setSubmissionError(res.error || 'Failed to record attendance. Please try again.');
        feedback.error();
      }
    } catch (err) {
      console.error('Error submitting attendance:', err);
      setSubmissionError('Network error recording attendance.');
      feedback.error();
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatTimestamp = (ts?: string) => {
    if (!ts) return 'Just now';
    const d = new Date(ts);
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }) + ' (' + d.toLocaleDateString() + ')';
  };

  // SUCCESS VIEW (COMIC POP STAMP)
  if (recordedSuccess) {
    return (
      <div className="w-full max-w-md mx-auto bg-[#00E676] text-black border-[4px] border-black p-6 shadow-comic-xl text-center animate-in zoom-in-95 duration-200 relative overflow-hidden">
        {/* Comic Halftone */}
        <div className="absolute inset-0 comic-halftone-white opacity-20 pointer-events-none"></div>

        <div className="relative z-10">
          <div className="w-16 h-16 bg-black text-[#00E676] border-[3px] border-black mx-auto flex items-center justify-center mb-3 shadow-comic">
            <CheckCircle2 className="w-10 h-10 stroke-[3]" />
          </div>

          <div className="inline-block px-3 py-1 font-comic tracking-wider text-sm uppercase bg-black text-[#00E676] border-2 border-black shadow-comic-sm mb-2">
            ATTENDANCE RECORDED SUCCESSFULLY!
          </div>

          <h3 className="text-2xl font-comic tracking-wider text-black uppercase mb-1">
            {recordedSuccess.participant_name}
          </h3>
          <p className="text-xs text-black font-mono font-bold mb-4">
            TEAM: <span className="bg-black text-[#00F0FF] px-1.5 py-0.5 border border-black">{team.team_name}</span> ({team.team_id})
          </p>

          <div className="bg-[#FFFDF0] text-black border-[2.5px] border-black p-3.5 text-left space-y-1.5 mb-5 shadow-comic-sm font-mono text-xs">
            <div className="flex justify-between items-center">
              <span className="font-bold text-slate-700">ACTION:</span>
              <span className="font-comic font-bold tracking-wider text-sm text-black px-2 py-0.5 bg-[#00F0FF] border border-black uppercase">
                {recordedSuccess.checkin_type}
              </span>
            </div>
            {recordedSuccess.event_name && (
              <div className="flex justify-between items-center">
                <span className="font-bold text-slate-700">EVENT:</span>
                <span className="font-bold text-black truncate max-w-[200px]">
                  {recordedSuccess.event_name}
                </span>
              </div>
            )}
            <div className="flex justify-between items-center">
              <span className="font-bold text-slate-700">TIMESTAMP:</span>
              <span className="font-bold text-black">{formatTimestamp(recordedSuccess.scanned_at)}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="font-bold text-slate-700">RECORDED BY:</span>
              <span className="font-bold text-black">{recordedSuccess.scanned_by}</span>
            </div>
          </div>

          <button
            onClick={onScanNext}
            className="w-full py-3.5 px-6 bg-black hover:bg-slate-900 text-white font-comic font-bold tracking-wider text-base uppercase border-[3px] border-black shadow-comic comic-btn flex items-center justify-center gap-2 cursor-pointer"
          >
            SCAN NEXT PARTICIPANT
            <ArrowRight className="w-5 h-5 stroke-[2.5]" />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-md mx-auto bg-[#1b1f2d] border-[4px] border-black p-5 sm:p-6 shadow-comic-xl relative transition-all">
      
      {/* Top Card Banner */}
      <div className="flex items-center justify-between pb-3 mb-3 border-b-2 border-black">
        <div className="inline-block bg-[#00F0FF] text-black font-comic font-bold tracking-wider text-xs px-2.5 py-0.5 border-2 border-black shadow-comic-sm uppercase">
          PARTICIPANT DETAILS
        </div>
        <span className="px-2 py-0.5 bg-black text-[#00F0FF] border-2 border-black font-mono font-bold text-xs shadow-comic-sm">
          {team.team_id}
        </span>
      </div>

      {/* Participant Header */}
      <div className="pb-3 mb-3 border-b-2 border-black border-dashed">
        <div className="flex items-start justify-between gap-2">
          <div>
            <h2 className="text-2xl font-comic tracking-wider text-white uppercase flex items-center gap-2">
              {member.name}
            </h2>
            <p className="text-xs text-[#00F0FF] font-mono font-bold mt-0.5">
              TEAM: {team.team_name}
            </p>
          </div>
          {member.is_leader && (
            <span className="text-xs font-comic font-bold tracking-wider px-2 py-0.5 bg-[#FF3366] text-white border-2 border-black shadow-comic-sm uppercase">
              TEAM LEADER
            </span>
          )}
        </div>

        {/* Academic Details Grid */}
        <div className="grid grid-cols-2 gap-2 mt-3 text-xs font-comic-body">
          <div className="bg-[#12141d] p-2 border-2 border-black shadow-comic-sm text-slate-200">
            <div className="text-[10px] text-slate-400 font-comic uppercase">COLLEGE</div>
            <div className="font-bold truncate" title={team.college}>{team.college}</div>
          </div>
          <div className="bg-[#12141d] p-2 border-2 border-black shadow-comic-sm text-slate-200">
            <div className="text-[10px] text-slate-400 font-comic uppercase">BRANCH</div>
            <div className="font-bold truncate">{team.department}</div>
          </div>
          <div className="bg-[#12141d] p-2 border-2 border-black shadow-comic-sm text-slate-200">
            <div className="text-[10px] text-slate-400 font-comic uppercase">ACADEMIC YEAR</div>
            <div className="font-bold">YEAR {team.year}</div>
          </div>
          <div className="bg-[#12141d] p-2 border-2 border-black shadow-comic-sm text-slate-200">
            <div className="text-[10px] text-slate-400 font-comic uppercase">STATUS</div>
            <div className="font-bold text-[#00E676]">VERIFIED PARTICIPANT</div>
          </div>
        </div>

        {/* Passport Token Chip */}
        <div className="mt-2.5 pt-2 border-t border-black/40 flex items-center justify-between text-[11px] font-mono text-slate-300">
          <span>PASS TOKEN:</span>
          <span className="text-[#00F0FF] font-bold bg-black px-1.5 py-0.5 border border-black">{member.passport_token}</span>
        </div>
      </div>

      {/* Registered Events section */}
      <div className="mb-4">
        <h4 className="text-xs font-comic tracking-wider uppercase text-white mb-2 flex items-center gap-1.5">
          <Calendar className="w-3.5 h-3.5 text-[#00F0FF] stroke-[2.5]" />
          REGISTERED EVENTS ({events.length})
        </h4>
        {events.length === 0 ? (
          <p className="text-xs text-slate-400 italic bg-[#12141d] p-2 border border-black font-mono">
            No specific event registrations found for this participant.
          </p>
        ) : (
          <div className="space-y-1.5">
            {events.map((ev) => (
              <div 
                key={ev.id}
                className="flex items-center justify-between px-2.5 py-1.5 bg-[#12141d] border-2 border-black shadow-comic-sm text-xs"
              >
                <div>
                  <div className="font-comic tracking-wide text-sm text-white uppercase">{ev.title}</div>
                  <div className="text-[10px] text-slate-400 font-mono">
                    Venue: {ev.venue || 'TBA'} • Time: {ev.schedule_time || 'Check schedule'}
                  </div>
                </div>
                <span className={`text-[9px] font-comic tracking-wider px-1.5 py-0.5 border border-black uppercase ${
                  ev.event_type === 'TECH' 
                    ? 'bg-[#00F0FF] text-black' 
                    : 'bg-[#A855F7] text-white'
                }`}>
                  {ev.event_type}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Coordinator Action Selection */}
      <div className="border-t-2 border-black pt-3">
        
        {/* Action Type Selector */}
        {availableTypes.length > 1 && (
          <div className="mb-3">
            <label className="block text-xs font-comic tracking-wider uppercase text-white mb-1.5">
              SELECT CHECK-IN TYPE:
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
              {availableTypes.map((type) => (
                <button
                  key={type}
                  onClick={() => setSelectedType(type)}
                  className={`py-1.5 px-2 text-xs font-comic tracking-wider uppercase border-2 transition-all cursor-pointer ${
                    selectedType === type
                      ? 'bg-[#00F0FF] text-black border-black shadow-comic-sm font-bold'
                      : 'bg-[#12141d] text-slate-300 border-black hover:bg-slate-800'
                  }`}
                >
                  {type}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* If Action is EVENT: Select from registered events */}
        {selectedType === 'EVENT' && (
          <div className="mb-4">
            <label className="block text-xs font-comic tracking-wider uppercase text-white mb-1.5">
              SELECT EVENT:
            </label>
            {eligibleEvents.length === 0 ? (
              <div className="p-2.5 bg-[#FF3366] text-white border-2 border-black text-xs font-bold font-comic-body">
                ⚠️ You do not have coordinator permissions for this participant's registered events.
              </div>
            ) : (
              <select
                value={selectedEventId}
                onChange={(e) => setSelectedEventId(e.target.value)}
                className="w-full px-3 py-2 bg-[#FFFDF0] text-black border-2 border-black text-xs font-mono font-bold focus:outline-none"
              >
                {eligibleEvents.map(ev => (
                  <option key={ev.id} value={ev.id}>
                    {ev.title} ({ev.event_type} - {ev.venue || 'TBA'})
                  </option>
                ))}
              </select>
            )}
          </div>
        )}

        {/* DUPLICATE WARNING STATE */}
        {duplicateRecord && (
          <div className="mb-4 p-3.5 bg-[#FF3366] text-white border-[3px] border-black shadow-comic animate-in fade-in duration-200">
            <div className="flex items-center gap-2 font-comic font-bold tracking-wider text-base mb-1.5">
              <AlertTriangle className="w-5 h-5 stroke-[2.5]" />
              ALREADY RECORDED
            </div>
            <div className="text-xs space-y-1 bg-black text-white p-2.5 border-2 border-black font-mono">
              <div className="flex justify-between">
                <span className="text-slate-400">PARTICIPANT:</span>
                <span className="font-bold text-[#00F0FF]">{duplicateRecord.participant_name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">STATUS:</span>
                <span className="text-[#00E676] font-bold">ALREADY MARKED</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">ACTION:</span>
                <span className="text-white">{duplicateRecord.checkin_type}</span>
              </div>
              {duplicateRecord.event_name && (
                <div className="flex justify-between">
                  <span className="text-slate-400">EVENT:</span>
                  <span className="text-white truncate max-w-[170px]">{duplicateRecord.event_name}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-slate-400">LOGGED AT:</span>
                <span className="text-white">{formatTimestamp(duplicateRecord.scanned_at)}</span>
              </div>
            </div>
          </div>
        )}

        {/* Error message */}
        {submissionError && (
          <div className="mb-3 p-2.5 bg-[#FF3366] text-white border-2 border-black text-xs font-bold">
            {submissionError}
          </div>
        )}

        {/* Action Button */}
        <div className="space-y-2">
          {duplicateRecord ? (
            <button
              onClick={onScanNext}
              className="w-full py-3 px-4 bg-[#00F0FF] hover:bg-[#00d4e0] text-black font-comic font-bold tracking-wider text-base uppercase border-[3px] border-black shadow-comic comic-btn flex items-center justify-center gap-2 cursor-pointer"
            >
              SCAN NEXT PARTICIPANT
            </button>
          ) : (
            <button
              onClick={handleRecordAttendance}
              disabled={isSubmitting || isCheckingDuplicate || (selectedType === 'EVENT' && eligibleEvents.length === 0)}
              className={`w-full py-3.5 px-6 font-comic font-bold tracking-wider text-base uppercase border-[3px] border-black shadow-comic comic-btn flex items-center justify-center gap-2 cursor-pointer ${
                selectedType === 'FOOD'
                  ? 'bg-[#FF8A00] hover:bg-amber-600 text-black'
                  : selectedType === 'ENTRY'
                  ? 'bg-[#3B82F6] hover:bg-blue-600 text-white'
                  : 'bg-[#00F0FF] hover:bg-[#00d4e0] text-black'
              } disabled:opacity-50 disabled:pointer-events-none`}
            >
              {isSubmitting ? (
                <>
                  <RefreshCw className="w-5 h-5 stroke-[2.5] animate-spin" />
                  RECORDING ATTENDANCE...
                </>
              ) : selectedType === 'FOOD' ? (
                <>
                  <Utensils className="w-5 h-5 stroke-[2.5]" />
                  CONFIRM MEAL ISSUED
                </>
              ) : selectedType === 'ENTRY' ? (
                <>
                  <DoorOpen className="w-5 h-5 stroke-[2.5]" />
                  CONFIRM CAMPUS CHECK-IN
                </>
              ) : (
                <>
                  <Award className="w-5 h-5 stroke-[2.5]" />
                  CONFIRM EVENT ATTENDANCE
                </>
              )}
            </button>
          )}

          <button
            onClick={onScanNext}
            className="w-full py-2 font-comic tracking-wider uppercase text-xs text-slate-400 hover:text-white cursor-pointer"
          >
            DISMISS / SCAN ANOTHER
          </button>
        </div>

      </div>

    </div>
  );
};
