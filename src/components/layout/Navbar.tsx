import React from 'react';
import { useAuth } from '../../lib/auth';
import { 
  LogOut, 
  Shield, 
  QrCode, 
  UserCheck, 
  Utensils, 
  DoorOpen, 
  Cpu, 
  Compass
} from 'lucide-react';

interface NavbarProps {
  currentTab: string;
  setCurrentTab: (tab: string) => void;
}

export const Navbar: React.FC<NavbarProps> = ({ currentTab, setCurrentTab }) => {
  const { profile, assignments, permissions, signOut } = useAuth();

  const getPrimaryRoleBadge = () => {
    if (permissions.isSuperAdmin) {
      return { label: 'SUPER ADMIN', color: 'bg-[#FF3366] text-white border-2 border-black shadow-comic-sm', icon: Shield };
    }
    if (permissions.isOverallTech) {
      return { label: 'OVERALL TECH LEAD', color: 'bg-[#00F0FF] text-black border-2 border-black shadow-comic-sm font-bold', icon: Cpu };
    }
    if (permissions.isOverallNonTech) {
      return { label: 'OVERALL NON-TECH LEAD', color: 'bg-[#A855F7] text-white border-2 border-black shadow-comic-sm', icon: Compass };
    }
    if (permissions.canScanFood) {
      return { label: 'FOOD COORDINATOR', color: 'bg-[#00E676] text-black border-2 border-black shadow-comic-sm font-bold', icon: Utensils };
    }
    if (permissions.canScanEntry) {
      return { label: 'GATE COORDINATOR', color: 'bg-[#3B82F6] text-white border-2 border-black shadow-comic-sm', icon: DoorOpen };
    }
    if (assignments.length > 0) {
      return { label: assignments[0].assignment_type.replace('_', ' '), color: 'bg-[#00E676] text-black border-2 border-black shadow-comic-sm font-bold', icon: UserCheck };
    }
    return { label: profile?.role || 'COORDINATOR', color: 'bg-slate-700 text-white border-2 border-black shadow-comic-sm', icon: UserCheck };
  };

  const badge = getPrimaryRoleBadge();
  const BadgeIcon = badge.icon;

  return (
    <>
      <header className="sticky top-0 z-40 bg-[#161926] border-b-[3.5px] border-black px-4 py-2.5 shadow-comic transition-all">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          
          {/* Logo & Comic Title */}
          <div className="flex items-center gap-3">
            <button 
              onClick={() => setCurrentTab('dashboard')}
              className="flex items-center gap-2.5 text-left group cursor-pointer"
            >
              <div className="w-10 h-10 bg-[#00F0FF] border-[2.5px] border-black shadow-comic-sm flex items-center justify-center text-black -rotate-2 group-hover:rotate-0 transition-transform">
                <QrCode className="w-6 h-6 stroke-[2.5]" />
              </div>
              <div>
                <h1 className="text-lg font-comic tracking-wider text-white flex items-center gap-1.5 leading-none uppercase">
                  ZINNIA <span className="bg-[#FF3366] text-white text-[11px] px-1.5 py-0.5 border border-black shadow-comic-sm font-comic rotate-1">HQ '26</span>
                </h1>
                <p className="text-[10px] text-[#00F0FF] font-mono font-bold tracking-tight">★ COORDINATOR DESK ★</p>
              </div>
            </button>
          </div>

          {/* Center Navigation for Desktop */}
          <nav className="hidden md:flex items-center gap-2 bg-[#10131e] p-1.5 border-2 border-black shadow-comic-sm">
            <button
              onClick={() => setCurrentTab('dashboard')}
              className={`px-3 py-1 text-xs font-comic tracking-wider uppercase border-2 transition-all cursor-pointer ${
                currentTab === 'dashboard'
                  ? 'bg-[#00F0FF] text-black border-black shadow-comic-sm font-black -translate-y-0.5'
                  : 'bg-transparent text-slate-300 border-transparent hover:text-white hover:border-black hover:bg-slate-800'
              }`}
            >
              Dashboard
            </button>

            {/* CHECK-IN TAB (GATE ENTRY) */}
            {(permissions.canScanEntry || permissions.isSuperAdmin) && (
              <button
                onClick={() => setCurrentTab('checkin')}
                className={`px-3 py-1 text-xs font-comic tracking-wider uppercase border-2 flex items-center gap-1.5 transition-all cursor-pointer ${
                  currentTab === 'checkin'
                    ? 'bg-[#3B82F6] text-white border-black shadow-comic-sm font-black -translate-y-0.5'
                    : 'bg-transparent text-slate-300 border-transparent hover:text-white hover:border-black hover:bg-slate-800'
                }`}
              >
                <DoorOpen className="w-3.5 h-3.5 stroke-[2.5]" />
                Check-in
              </button>
            )}

            {/* FOOD TAB */}
            {(permissions.canScanFood || permissions.isSuperAdmin) && (
              <button
                onClick={() => setCurrentTab('food')}
                className={`px-3 py-1 text-xs font-comic tracking-wider uppercase border-2 flex items-center gap-1.5 transition-all cursor-pointer ${
                  currentTab === 'food'
                    ? 'bg-[#00E676] text-black border-black shadow-comic-sm font-black -translate-y-0.5'
                    : 'bg-transparent text-slate-300 border-transparent hover:text-white hover:border-black hover:bg-slate-800'
                }`}
              >
                <Utensils className="w-3.5 h-3.5 stroke-[2.5]" />
                Food
              </button>
            )}

            {/* TECH EVENTS TAB */}
            {permissions.canViewTechTab && (
              <button
                onClick={() => setCurrentTab('tech')}
                className={`px-3 py-1 text-xs font-comic tracking-wider uppercase border-2 flex items-center gap-1.5 transition-all cursor-pointer ${
                  currentTab === 'tech'
                    ? 'bg-[#00F0FF] text-black border-black shadow-comic-sm font-black -translate-y-0.5'
                    : 'bg-transparent text-slate-300 border-transparent hover:text-white hover:border-black hover:bg-slate-800'
                }`}
              >
                <Cpu className="w-3.5 h-3.5 stroke-[2.5]" />
                Tech Events
              </button>
            )}

            {/* NON-TECH EVENTS TAB */}
            {permissions.canViewNonTechTab && (
              <button
                onClick={() => setCurrentTab('nontech')}
                className={`px-3 py-1 text-xs font-comic tracking-wider uppercase border-2 flex items-center gap-1.5 transition-all cursor-pointer ${
                  currentTab === 'nontech'
                    ? 'bg-[#A855F7] text-white border-black shadow-comic-sm font-black -translate-y-0.5'
                    : 'bg-transparent text-slate-300 border-transparent hover:text-white hover:border-black hover:bg-slate-800'
                }`}
              >
                <Compass className="w-3.5 h-3.5 stroke-[2.5]" />
                Non-Tech
              </button>
            )}

            {/* SEARCH TAB */}
            <button
              onClick={() => setCurrentTab('search')}
              className={`px-3 py-1 text-xs font-comic tracking-wider uppercase border-2 transition-all cursor-pointer ${
                currentTab === 'search'
                  ? 'bg-[#00E676] text-black border-black shadow-comic-sm font-black -translate-y-0.5'
                  : 'bg-transparent text-slate-300 border-transparent hover:text-white hover:border-black hover:bg-slate-800'
              }`}
            >
              Search
            </button>
          </nav>

          {/* User Profile & Actions */}
          <div className="flex items-center gap-2.5">

            {/* Role Badge */}
            <div className="flex items-center gap-1.5 font-comic tracking-wider text-xs px-1 py-0.5">
              <span className={`flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-comic tracking-wider uppercase ${badge.color}`}>
                <BadgeIcon className="w-3.5 h-3.5 stroke-[2.5]" />
                {badge.label}
              </span>
            </div>

            {/* Coordinator Name & Sign out */}
            <div className="flex items-center gap-2">
              <div className="hidden lg:block text-right">
                <div className="text-xs font-bold text-white uppercase font-comic tracking-wide leading-tight">
                  {profile?.full_name || 'Agent Coordinator'}
                </div>
                <div className="text-[10px] text-slate-400 font-mono">
                  ID: {profile?.id.substring(0, 8)}...
                </div>
              </div>

              <button
                onClick={signOut}
                title="Logout"
                className="p-2 bg-[#FF3366] hover:bg-[#ff1f4b] text-white border-2 border-black shadow-comic-sm comic-btn cursor-pointer"
              >
                <LogOut className="w-4 h-4 stroke-[2.5]" />
              </button>
            </div>

          </div>

        </div>
      </header>
    </>
  );
};
