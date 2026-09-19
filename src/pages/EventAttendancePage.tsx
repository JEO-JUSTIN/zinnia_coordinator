import React, { useState, useEffect } from 'react';
import { useAuth } from '../lib/auth';
import { fetchLiveStats } from '../lib/supabase';
import { EventItem, AttendanceRecord } from '../types/database';
import { 
  Calendar, 
  MapPin, 
  Clock, 
  Users, 
  CheckCircle2, 
  XCircle, 
  QrCode, 
  Search
} from 'lucide-react';

interface EventAttendancePageProps {
  initialEventId?: string;
  onOpenScannerForEvent: (eventId: string) => void;
}

export const EventAttendancePage: React.FC<EventAttendancePageProps> = ({ 
  initialEventId, 
  onOpenScannerForEvent 
}) => {
  const { permissions } = useAuth();
  const [events, setEvents] = useState<EventItem[]>([]);
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [selectedEventId, setSelectedEventId] = useState<string>(initialEventId || '');
  const [filterMode, setFilterMode] = useState<'ALL' | 'PRESENT' | 'ABSENT'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    fetchLiveStats().then(data => {
      setEvents(data.events);
      setRecords(data.records);
      if (!selectedEventId && data.events.length > 0) {
        // Set default to first authorized event
        const authorized = data.events.filter(ev => {
          if (permissions.isSuperAdmin) return true;
          if (permissions.isOverallTech && ev.event_type === 'TECH') return true;
          if (permissions.isOverallNonTech && ev.event_type === 'NON_TECH') return true;
          if (permissions.assignedEventIds.includes(ev.id)) return true;
          return false;
        });
        if (authorized.length > 0) {
          setSelectedEventId(authorized[0].id);
        }
      }
    });
  }, [permissions]);

  // Authorized events only
  const visibleEvents = events.filter(ev => {
    if (permissions.isSuperAdmin) return true;
    if (permissions.isOverallTech && ev.event_type === 'TECH') return true;
    if (permissions.isOverallNonTech && ev.event_type === 'NON_TECH') return true;
    if (permissions.assignedEventIds.includes(ev.id)) return true;
    return false;
  });

  const currentEvent = visibleEvents.find(e => e.id === selectedEventId) || visibleEvents[0];

  // Attendances for this event
  const eventAttendances = records.filter(
    r => r.checkin_type === 'EVENT' && r.event_id === currentEvent?.id
  );

  // Registered roster simulation
  const registeredParticipants = [
    { id: 'MEM-001', name: 'Arun Kumar', team: 'CyberKnights', college: 'PSG Tech' },
    { id: 'MEM-002', name: 'Sneha R', team: 'CyberKnights', college: 'PSG Tech' },
    { id: 'MEM-003', name: 'Vikram S', team: 'ByteBusters', college: 'CIT' },
    { id: 'MEM-004', name: 'Pooja Mohan', team: 'ApexStrikerz', college: 'GCT' },
  ];

  const totalRegistered = registeredParticipants.length;
  const presentCount = eventAttendances.length;
  const absentCount = Math.max(0, totalRegistered - presentCount);
  const attendancePct = totalRegistered > 0 ? Math.round((presentCount / totalRegistered) * 100) : 0;

  // Filter roster
  const filteredRoster = registeredParticipants.filter(p => {
    const isPresent = eventAttendances.some(a => a.member_id === p.id);
    if (filterMode === 'PRESENT' && !isPresent) return false;
    if (filterMode === 'ABSENT' && isPresent) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return p.name.toLowerCase().includes(q) || p.team.toLowerCase().includes(q) || p.college.toLowerCase().includes(q);
    }
    return true;
  });

  if (!currentEvent) {
    return (
      <div className="max-w-2xl mx-auto bg-slate-900 border border-slate-800 rounded-3xl p-8 text-center text-slate-400">
        <Calendar className="w-12 h-12 text-slate-600 mx-auto mb-3" />
        <h3 className="text-base font-bold text-white mb-1">No Assigned Events</h3>
        <p className="text-xs">You are not currently assigned to any technical or non-technical events.</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-20">
      
      {/* Event Selector (if multiple events assigned) */}
      {visibleEvents.length > 1 && (
        <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-thin">
          {visibleEvents.map(ev => (
            <button
              key={ev.id}
              onClick={() => setSelectedEventId(ev.id)}
              className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all flex items-center gap-2 ${
                currentEvent.id === ev.id
                  ? 'bg-cyan-500 text-slate-950 shadow-lg shadow-cyan-500/20'
                  : 'bg-[#0f172a] text-slate-400 hover:text-white border border-slate-800'
              }`}
            >
              <span className={`w-2 h-2 rounded-full ${ev.event_type === 'TECH' ? 'bg-cyan-400' : 'bg-violet-400'}`} />
              {ev.title}
            </button>
          ))}
        </div>
      )}

      {/* Main Event Card Banner */}
      <div className="bg-[#0f172a] border border-slate-800 rounded-3xl p-6 sm:p-7 shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-slate-800/80">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border uppercase ${
                currentEvent.event_type === 'TECH'
                  ? 'bg-cyan-950 text-cyan-300 border-cyan-800'
                  : 'bg-violet-950 text-violet-300 border-violet-800'
              }`}>
                {currentEvent.event_type} EVENT
              </span>
              <span className="text-xs font-mono text-slate-400">ID: {currentEvent.id}</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black text-white">
              {currentEvent.title}
            </h2>
            <div className="flex flex-wrap items-center gap-4 text-xs text-slate-300 font-mono mt-2">
              <div className="flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-cyan-400" />
                <span>{currentEvent.venue || 'Venue TBA'}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-cyan-400" />
                <span>{currentEvent.schedule_time || 'Scheduled'}</span>
              </div>
            </div>
          </div>

          <button
            onClick={() => onOpenScannerForEvent(currentEvent.id)}
            className="py-3 px-5 rounded-2xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-extrabold text-xs shadow-xl shadow-cyan-500/25 active:scale-95 transition-all flex items-center justify-center gap-2"
          >
            <QrCode className="w-4 h-4" />
            [Scan QR for this Event]
          </button>
        </div>

        {/* Live Attendance Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-5 font-mono">
          <div className="bg-slate-900/80 p-3 rounded-2xl border border-slate-800">
            <div className="text-[10px] text-slate-400">Total Registered</div>
            <div className="text-xl font-bold text-white mt-0.5">{totalRegistered}</div>
          </div>
          <div className="bg-slate-900/80 p-3 rounded-2xl border border-slate-800">
            <div className="text-[10px] text-slate-400">Present</div>
            <div className="text-xl font-bold text-emerald-400 mt-0.5">{presentCount}</div>
          </div>
          <div className="bg-slate-900/80 p-3 rounded-2xl border border-slate-800">
            <div className="text-[10px] text-slate-400">Absent</div>
            <div className="text-xl font-bold text-amber-400 mt-0.5">{absentCount}</div>
          </div>
          <div className="bg-slate-900/80 p-3 rounded-2xl border border-slate-800">
            <div className="text-[10px] text-slate-400">Attendance Rate</div>
            <div className="text-xl font-bold text-cyan-400 mt-0.5">{attendancePct}%</div>
          </div>
        </div>
      </div>

      {/* Participants Roster & Attendance List */}
      <div className="bg-[#0f172a] border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <Users className="w-4 h-4 text-cyan-400" />
            Event Participant Attendance List
          </h3>

          {/* Filter Pills */}
          <div className="flex items-center gap-1.5 bg-slate-900 p-1 rounded-xl border border-slate-800">
            <button
              onClick={() => setFilterMode('ALL')}
              className={`px-3 py-1 rounded-lg text-xs font-semibold ${
                filterMode === 'ALL' ? 'bg-cyan-500 text-slate-950 font-bold' : 'text-slate-400 hover:text-white'
              }`}
            >
              All ({totalRegistered})
            </button>
            <button
              onClick={() => setFilterMode('PRESENT')}
              className={`px-3 py-1 rounded-lg text-xs font-semibold ${
                filterMode === 'PRESENT' ? 'bg-emerald-500 text-slate-950 font-bold' : 'text-slate-400 hover:text-white'
              }`}
            >
              Present ({presentCount})
            </button>
            <button
              onClick={() => setFilterMode('ABSENT')}
              className={`px-3 py-1 rounded-lg text-xs font-semibold ${
                filterMode === 'ABSENT' ? 'bg-amber-500 text-slate-950 font-bold' : 'text-slate-400 hover:text-white'
              }`}
            >
              Absent ({absentCount})
            </button>
          </div>
        </div>

        {/* Filter Input */}
        <div className="relative">
          <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-3" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Filter list by participant or team name..."
            className="w-full pl-10 pr-4 py-2 bg-slate-900 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
          />
        </div>

        {/* Participant Table / Cards */}
        <div className="space-y-2">
          {filteredRoster.map((p) => {
            const scan = eventAttendances.find(a => a.member_id === p.id);
            const isPresent = Boolean(scan);

            return (
              <div 
                key={p.id}
                className="flex items-center justify-between p-3.5 rounded-2xl bg-slate-900/60 border border-slate-800/80 text-xs"
              >
                <div>
                  <div className="font-bold text-white flex items-center gap-2">
                    {p.name}
                    <span className="text-[10px] text-slate-400 font-mono">({p.id})</span>
                  </div>
                  <div className="text-[11px] text-slate-400 mt-0.5">
                    Team: <span className="text-cyan-300 font-medium">{p.team}</span> • {p.college}
                  </div>
                  {scan && (
                    <div className="text-[10px] text-slate-500 font-mono mt-1">
                      Scanned at {new Date(scan.scanned_at || '').toLocaleTimeString()} by {scan.scanned_by}
                    </div>
                  )}
                </div>

                <div>
                  {isPresent ? (
                    <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3" />
                      PRESENT
                    </span>
                  ) : (
                    <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-slate-800 text-slate-400 border border-slate-700 flex items-center gap-1">
                      <XCircle className="w-3 h-3" />
                      ABSENT
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>

      </div>

    </div>
  );
};
