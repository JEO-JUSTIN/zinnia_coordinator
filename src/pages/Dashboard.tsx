import React, { useEffect, useState } from 'react';
import { useAuth } from '../lib/auth';
import { fetchLiveStats } from '../lib/supabase';
import { EventItem, AttendanceRecord } from '../types/database';
import { 
  Users, 
  Utensils, 
  DoorOpen, 
  QrCode, 
  Calendar, 
  Clock, 
  RefreshCw
} from 'lucide-react';

interface DashboardProps {
  setCurrentTab: (tab: string) => void;
}

export const Dashboard: React.FC<DashboardProps> = ({ setCurrentTab }) => {
  const { profile, permissions } = useAuth();
  
  const [stats, setStats] = useState<{
    totalParticipants: number;
    entryCount: number;
    foodCount: number;
    events: EventItem[];
    records: AttendanceRecord[];
  }>({
    totalParticipants: 0,
    entryCount: 0,
    foodCount: 0,
    events: [],
    records: [],
  });

  const [isLoading, setIsLoading] = useState<boolean>(true);

  const loadStats = async () => {
    try {
      setIsLoading(true);
      const data = await fetchLiveStats();
      setStats(data);
    } catch (err) {
      console.error('Failed to load stats:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadStats();
    // Auto-refresh stats every 15 seconds
    const interval = setInterval(loadStats, 15000);
    return () => clearInterval(interval);
  }, []);

  // Filter events visible to this coordinator
  const visibleEvents = stats.events.filter(ev => {
    if (permissions.isSuperAdmin) return true;
    if (permissions.isOverallTech && ev.event_type === 'TECH') return true;
    if (permissions.isOverallNonTech && ev.event_type === 'NON_TECH') return true;
    if (permissions.assignedEventIds.includes(ev.id)) return true;
    return false;
  });

  // Calculate percentage helper
  const calcPct = (count: number, total: number) => {
    if (!total || total === 0) return 0;
    return Math.round((count / total) * 100);
  };

  return (
    <div className="space-y-6 pb-20">
      
      {/* Welcome Banner */}
      <div className="bg-[#1b1f2d] border-[3.5px] border-black p-5 sm:p-7 shadow-comic-xl relative overflow-hidden">
        {/* Halftone accent */}
        <div className="absolute top-0 right-0 w-64 h-full comic-halftone-white opacity-20 pointer-events-none"></div>

        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5 relative z-10">
          <div>
            <div className="inline-block bg-[#00F0FF] text-black font-comic font-bold tracking-wider text-xs px-2.5 py-0.5 border-2 border-black shadow-comic-sm mb-2 uppercase">
              COORDINATOR PORTAL • LIVE SYSTEM
            </div>
            <h2 className="text-2xl sm:text-3xl font-comic tracking-wider text-white uppercase">
              WELCOME BACK, {profile?.full_name}!
            </h2>
            {/* Live status badge */}
            <div className="mt-2.5 inline-flex items-center gap-2 bg-[#12141d] text-slate-200 border-2 border-black px-3 py-1.5 shadow-comic-sm text-xs font-semibold">
              <span className="w-2 h-2 rounded-full bg-[#00E676] animate-pulse"></span>
              Live attendance tracking, QR verification & symposium operations active.
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={loadStats}
              title="Refresh Stats"
              className="py-2.5 px-4 bg-[#12141d] hover:bg-slate-800 text-white font-comic tracking-wider uppercase text-xs border-[2.5px] border-black shadow-comic-sm comic-btn flex items-center gap-2 cursor-pointer"
            >
              <RefreshCw className={`w-4 h-4 stroke-[2.5] ${isLoading ? 'animate-spin text-[#00F0FF]' : ''}`} />
              <span>REFRESH DATA</span>
            </button>
            <button
              onClick={() => setCurrentTab('scanner')}
              className="py-3 px-5 bg-[#00F0FF] hover:bg-[#00d4e0] text-black font-comic font-bold tracking-wider text-base uppercase border-[3px] border-black shadow-comic comic-btn flex items-center gap-2 cursor-pointer"
            >
              <QrCode className="w-5 h-5 stroke-[2.5]" />
              OPEN QR SCANNER
            </button>
          </div>
        </div>
      </div>

      {/* Global Metric Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5 sm:gap-4">
        
        {/* Total Registered Participants */}
        <div className="bg-[#00F0FF] text-black border-[3.5px] border-black p-4 shadow-comic-lg relative">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-comic tracking-wider uppercase text-black font-bold">TOTAL PARTICIPANTS</span>
            <div className="w-8 h-8 bg-black text-[#00F0FF] border-2 border-black flex items-center justify-center">
              <Users className="w-4 h-4 stroke-[2.5]" />
            </div>
          </div>
          <div className="text-3xl sm:text-4xl font-comic tracking-wider text-black">
            {stats.totalParticipants}
          </div>
          <div className="text-[10px] font-mono font-bold text-black/90 mt-1 bg-white/40 px-1.5 py-0.5 border border-black inline-block uppercase">
            REGISTERED ROSTER
          </div>
        </div>

        {/* Total Events */}
        <div className="bg-[#3B82F6] text-white border-[3.5px] border-black p-4 shadow-comic-lg relative">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-comic tracking-wider uppercase text-white font-bold">EVENTS</span>
            <div className="w-8 h-8 bg-black text-[#3B82F6] border-2 border-black flex items-center justify-center">
              <Calendar className="w-4 h-4 stroke-[2.5]" />
            </div>
          </div>
          <div className="text-3xl sm:text-4xl font-comic tracking-wider text-white">
            {stats.events.length}
          </div>
          <div className="text-[10px] font-mono font-bold text-white/90 mt-1 bg-black/40 px-1.5 py-0.5 border border-black inline-block uppercase">
            TECH & NON-TECH
          </div>
        </div>

        {/* Food Distributed */}
        <div className="bg-[#FF4081] text-white border-[3.5px] border-black p-4 shadow-comic-lg relative">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-comic tracking-wider uppercase text-white font-bold">MEALS SERVED</span>
            <div className="w-8 h-8 bg-black text-[#FF4081] border-2 border-black flex items-center justify-center">
              <Utensils className="w-4 h-4 stroke-[2.5]" />
            </div>
          </div>
          <div className="text-3xl sm:text-4xl font-comic tracking-wider text-white">
            {stats.foodCount}
          </div>
          <div className="text-[10px] font-mono font-bold text-white mt-1 bg-black/40 px-1.5 py-0.5 border border-black inline-block uppercase">
            {calcPct(stats.foodCount, stats.totalParticipants)}% DISTRIBUTED
          </div>
        </div>

        {/* Campus Gate Check-in */}
        <div className="bg-[#00E676] text-black border-[3.5px] border-black p-4 shadow-comic-lg relative">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-comic tracking-wider uppercase text-black font-bold">GATE CHECK-INS</span>
            <div className="w-8 h-8 bg-black text-[#00E676] border-2 border-black flex items-center justify-center">
              <DoorOpen className="w-4 h-4 stroke-[2.5]" />
            </div>
          </div>
          <div className="text-3xl sm:text-4xl font-comic tracking-wider text-black">
            {stats.entryCount}
          </div>
          <div className="text-[10px] font-mono font-bold text-black mt-1 bg-white/40 px-1.5 py-0.5 border border-black inline-block uppercase">
            {calcPct(stats.entryCount, stats.totalParticipants)}% ON CAMPUS
          </div>
        </div>

      </div>

      {/* Role-Specific Progress Panels */}
      
      {/* 1. FOOD COMMITTEE DEDICATED VIEW */}
      {(permissions.canScanFood || permissions.isSuperAdmin) && (
        <div className="bg-[#1b1f2d] border-[3.5px] border-black p-5 sm:p-6 shadow-comic-xl">
          <div className="flex items-center justify-between mb-4 border-b-2 border-black pb-3">
            <div className="flex items-center gap-2.5">
              <div className="p-2 bg-[#00E676] text-black border-2 border-black shadow-comic-sm">
                <Utensils className="w-5 h-5 stroke-[2.5]" />
              </div>
              <div>
                <h3 className="text-lg font-comic tracking-wider text-white uppercase">
                  FOOD COMMITTEE MEAL TRACKER
                </h3>
                <p className="text-xs text-slate-300 font-comic-body">Meal distribution tracker against registered participants roster</p>
              </div>
            </div>
            <span className="text-lg font-comic tracking-wider bg-[#00E676] text-black px-3 py-1 border-2 border-black shadow-comic-sm">
              {calcPct(stats.foodCount, stats.totalParticipants)}% CLAIMED
            </span>
          </div>

          <div className="w-full h-4 bg-black border-2 border-black overflow-hidden mb-4 p-0.5">
            <div 
              className="h-full bg-[#00E676] comic-stripes transition-all duration-500"
              style={{ width: `${calcPct(stats.foodCount, stats.totalParticipants)}%` }}
            />
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs font-mono">
            <div className="bg-[#12141d] p-3 border-2 border-black shadow-comic-sm">
              <div className="text-slate-400 text-[10px] font-comic uppercase tracking-wider">TOTAL PARTICIPANTS</div>
              <div className="text-lg font-comic tracking-wider text-white mt-0.5">{stats.totalParticipants}</div>
            </div>
            <div className="bg-[#12141d] p-3 border-2 border-black shadow-comic-sm">
              <div className="text-slate-400 text-[10px] font-comic uppercase tracking-wider">MEALS SERVED</div>
              <div className="text-lg font-comic tracking-wider text-[#00E676] mt-0.5">{stats.foodCount}</div>
            </div>
            <div className="bg-[#12141d] p-3 border-2 border-black shadow-comic-sm">
              <div className="text-slate-400 text-[10px] font-comic uppercase tracking-wider">PENDING MEALS</div>
              <div className="text-lg font-comic tracking-wider text-slate-200 mt-0.5">
                {Math.max(0, stats.totalParticipants - stats.foodCount)}
              </div>
            </div>
            <div className="bg-[#12141d] p-3 border-2 border-black shadow-comic-sm">
              <div className="text-slate-400 text-[10px] font-comic uppercase tracking-wider">CLAIM RATE</div>
              <div className="text-lg font-comic tracking-wider text-[#00F0FF] mt-0.5">
                {calcPct(stats.foodCount, stats.totalParticipants)}%
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 2. GATE ENTRY COMMITTEE DEDICATED VIEW */}
      {(permissions.canScanEntry || permissions.isSuperAdmin) && (
        <div className="bg-[#1b1f2d] border-[3.5px] border-black p-5 sm:p-6 shadow-comic-xl">
          <div className="flex items-center justify-between mb-4 border-b-2 border-black pb-3">
            <div className="flex items-center gap-2.5">
              <div className="p-2 bg-[#3B82F6] text-white border-2 border-black shadow-comic-sm">
                <DoorOpen className="w-5 h-5 stroke-[2.5]" />
              </div>
              <div>
                <h3 className="text-lg font-comic tracking-wider text-white uppercase">
                  CAMPUS GATE CHECK-IN
                </h3>
                <p className="text-xs text-slate-300 font-comic-body">Main gate arrival access & physical entry log</p>
              </div>
            </div>
            <span className="text-lg font-comic tracking-wider bg-[#3B82F6] text-white px-3 py-1 border-2 border-black shadow-comic-sm">
              {calcPct(stats.entryCount, stats.totalParticipants)}% CHECKED IN
            </span>
          </div>

          <div className="w-full h-4 bg-black border-2 border-black overflow-hidden mb-4 p-0.5">
            <div 
              className="h-full bg-[#3B82F6] comic-stripes transition-all duration-500"
              style={{ width: `${calcPct(stats.entryCount, stats.totalParticipants)}%` }}
            />
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs font-mono">
            <div className="bg-[#12141d] p-3 border-2 border-black shadow-comic-sm">
              <div className="text-slate-400 text-[10px] font-comic uppercase tracking-wider">TOTAL PARTICIPANTS</div>
              <div className="text-lg font-comic tracking-wider text-white mt-0.5">{stats.totalParticipants}</div>
            </div>
            <div className="bg-[#12141d] p-3 border-2 border-black shadow-comic-sm">
              <div className="text-slate-400 text-[10px] font-comic uppercase tracking-wider">CHECKED IN</div>
              <div className="text-lg font-comic tracking-wider text-[#00E676] mt-0.5">{stats.entryCount}</div>
            </div>
            <div className="bg-[#12141d] p-3 border-2 border-black shadow-comic-sm">
              <div className="text-slate-400 text-[10px] font-comic uppercase tracking-wider">AWAITING ENTRY</div>
              <div className="text-lg font-comic tracking-wider text-slate-200 mt-0.5">
                {Math.max(0, stats.totalParticipants - stats.entryCount)}
              </div>
            </div>
            <div className="bg-[#12141d] p-3 border-2 border-black shadow-comic-sm">
              <div className="text-slate-400 text-[10px] font-comic uppercase tracking-wider">ARRIVAL RATE</div>
              <div className="text-lg font-comic tracking-wider text-[#00F0FF] mt-0.5">
                {calcPct(stats.entryCount, stats.totalParticipants)}%
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 3. EVENT COORDINATORS & OVERALL LEADS VIEW */}
      {(visibleEvents.length > 0) && (
        <div className="bg-[#1b1f2d] border-[3.5px] border-black p-5 sm:p-6 shadow-comic-xl">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5 border-b-2 border-black pb-3">
            <div>
              <h3 className="text-xl font-comic tracking-wider text-white flex items-center gap-2 uppercase">
                <span className="p-1 bg-[#00F0FF] text-black border-2 border-black shadow-comic-sm">
                  <Calendar className="w-5 h-5 stroke-[2.5]" />
                </span>
                {permissions.isSuperAdmin 
                  ? 'ALL SYMPOSIUM EVENTS' 
                  : permissions.isOverallTech 
                  ? 'TECHNICAL EVENTS' 
                  : permissions.isOverallNonTech 
                  ? 'NON-TECHNICAL EVENTS' 
                  : 'YOUR ASSIGNED EVENTS'}
              </h3>
              <p className="text-xs text-slate-300 font-comic-body mt-1">
                Live attendance rosters, venue details, and scanning status for assigned events.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {visibleEvents.map((ev) => {
              const code = ev.code || ev.id;
              const registeredCount = (stats as any).eventRegistrationCounts?.[code] ?? (stats as any).eventRegistrationCounts?.[ev.id] ?? 0;
              const presentCount = (stats as any).eventPresentCounts?.[code] ?? stats.records.filter(
                r => r.checkin_type === 'EVENT' && (r.event_id === ev.id || r.event_code === code)
              ).length;
              const absentCount = Math.max(0, registeredCount - presentCount);
              const attendancePct = calcPct(presentCount, registeredCount);

              return (
                <div 
                  key={ev.id}
                  className="bg-[#12141d] border-[2.5px] border-black p-4 flex flex-col justify-between shadow-comic-sm hover:shadow-comic transition-all group"
                >
                  <div>
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <span className={`text-[10px] font-comic tracking-wider px-2 py-0.5 border-2 border-black uppercase shadow-comic-sm ${
                        ev.event_type === 'TECH'
                          ? 'bg-[#00F0FF] text-black'
                          : 'bg-[#A855F7] text-white'
                      }`}>
                        {ev.event_type}
                      </span>
                      <span className="text-[10px] text-white font-mono bg-black px-1.5 py-0.5 border border-slate-700">
                        {ev.venue || 'TBA'}
                      </span>
                    </div>

                    <h4 className="text-base font-comic tracking-wider text-white group-hover:text-[#00F0FF] transition-colors uppercase">
                      {ev.title}
                    </h4>
                    <p className="text-[11px] text-slate-400 mt-1 font-mono">
                      ⏱ {ev.schedule_time || 'Schedule announced at venue'}
                    </p>

                    {/* Mini stats */}
                    <div className="grid grid-cols-4 gap-1.5 my-3 p-2 bg-black border-2 border-black text-center font-mono text-xs">
                      <div>
                        <div className="text-[9px] text-slate-400 font-comic uppercase">ROSTER</div>
                        <div className="font-comic text-base text-white">{registeredCount}</div>
                      </div>
                      <div>
                        <div className="text-[9px] text-[#00E676] font-comic uppercase">PRESENT</div>
                        <div className="font-comic text-base text-[#00E676]">{presentCount}</div>
                      </div>
                      <div>
                        <div className="text-[9px] text-slate-400 font-comic uppercase">ABSENT</div>
                        <div className="font-comic text-base text-slate-200">{absentCount}</div>
                      </div>
                      <div>
                        <div className="text-[9px] text-[#00F0FF] font-comic uppercase">RATE</div>
                        <div className="font-comic text-base text-[#00F0FF]">{attendancePct}%</div>
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 pt-2 border-t-2 border-black border-dashed">
                    <button
                      onClick={() => {
                        const targetTab = ev.event_type === 'NON_TECH' ? 'nontech' : 'tech';
                        setCurrentTab(targetTab);
                      }}
                      className="flex-1 py-2 px-2 bg-[#00F0FF] hover:bg-[#00d4e0] text-black font-comic tracking-wider uppercase text-xs border-2 border-black shadow-comic-sm comic-btn flex items-center justify-center gap-1 cursor-pointer font-bold"
                    >
                      <QrCode className="w-3.5 h-3.5 stroke-[2.5]" />
                      SCAN QR
                    </button>
                    <button
                      onClick={() => {
                        const targetTab = ev.event_type === 'NON_TECH' ? 'nontech' : 'tech';
                        setCurrentTab(targetTab);
                      }}
                      className="py-2 px-2.5 bg-slate-800 hover:bg-slate-700 text-white font-comic tracking-wider uppercase text-xs border-2 border-black shadow-comic-sm cursor-pointer"
                    >
                      VIEW ROSTER
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Recent Scans Activity Log */}
      <div className="bg-[#1b1f2d] border-[3.5px] border-black p-5 sm:p-6 shadow-comic-xl">
        <h3 className="text-lg font-comic tracking-wider text-white mb-1 flex items-center gap-2 uppercase">
          <span className="p-1 bg-[#00F0FF] text-black border-2 border-black shadow-comic-sm">
            <Clock className="w-4 h-4 stroke-[2.5]" />
          </span>
          LIVE ACTIVITY LOG
        </h3>
        <p className="text-xs text-slate-300 font-comic-body mb-4">
          Real-time participant check-ins and event verifications across the symposium.
        </p>

        {stats.records.length === 0 ? (
          <p className="text-xs text-slate-400 italic bg-black/40 p-3 border border-black font-mono">
            No activity logged yet today. Ready for scans.
          </p>
        ) : (
          <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
            {stats.records.slice(0, 8).map((rec, idx) => (
              <div 
                key={rec.id || idx}
                className="flex items-center justify-between p-3 bg-[#12141d] border-2 border-black shadow-comic-sm text-xs"
              >
                <div className="flex items-center gap-3">
                  <div className={`w-8 h-8 border-2 border-black flex items-center justify-center font-comic text-sm font-bold shadow-comic-sm ${
                    rec.checkin_type === 'FOOD' ? 'bg-[#FF8A00] text-black' :
                    rec.checkin_type === 'ENTRY' ? 'bg-[#3B82F6] text-white' :
                    'bg-[#00F0FF] text-black'
                  }`}>
                    {rec.checkin_type[0]}
                  </div>
                  <div>
                    <div className="font-comic tracking-wide text-sm text-white uppercase">{rec.participant_name}</div>
                    <div className="text-[10px] text-slate-400 font-mono">
                      {rec.college} • By: {rec.scanned_by}
                    </div>
                  </div>
                </div>

                <div className="text-right font-mono">
                  <span className="px-2 py-0.5 text-[10px] font-comic tracking-wider uppercase bg-black text-[#00F0FF] border border-black shadow-comic-sm">
                    {rec.checkin_type}
                  </span>
                  <div className="text-[9px] text-slate-400 mt-1">
                    {rec.scanned_at ? new Date(rec.scanned_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Just now'}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

    </div>
  );
};
