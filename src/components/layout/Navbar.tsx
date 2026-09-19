import React, { useState } from 'react';
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
import { MOCK_ADMIN_PROFILES } from '../../lib/mockData';

interface NavbarProps {
  currentTab: string;
  setCurrentTab: (tab: string) => void;
}

export const Navbar: React.FC<NavbarProps> = ({ currentTab, setCurrentTab }) => {
  const { profile, assignments, permissions, signOut, switchDemoUser } = useAuth();
  const [showRoleSwitcher, setShowRoleSwitcher] = useState(false);

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

            {/* Role Tester / Switcher */}
            <button
              onClick={() => setShowRoleSwitcher(true)}
              className="flex items-center gap-1.5 font-comic tracking-wider text-xs px-1 py-0.5 transition-transform hover:scale-105 active:scale-95 cursor-pointer"
            >
              <span className={`flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-comic tracking-wider uppercase ${badge.color}`}>
                <BadgeIcon className="w-3.5 h-3.5 stroke-[2.5]" />
                {badge.label}
              </span>
            </button>

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

      {/* Role Switcher Modal (Comic Styled Dossier) */}
      {showRoleSwitcher && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#1b1f2d] border-[3.5px] border-black p-5 sm:p-6 max-w-md w-full shadow-comic-xl animate-in fade-in zoom-in duration-150 relative">
            
            {/* Comic Header Bar */}
            <div className="flex items-center justify-between pb-3 border-b-2 border-black">
              <div className="flex items-center gap-2">
                <span className="p-1 bg-[#00F0FF] text-black border-2 border-black shadow-comic-sm">
                  <UserCheck className="w-5 h-5 stroke-[2.5]" />
                </span>
                <h3 className="text-lg font-comic tracking-wider text-white uppercase">
                  SIMULATE COORDINATOR ROLE
                </h3>
              </div>
              <button 
                onClick={() => setShowRoleSwitcher(false)} 
                className="w-7 h-7 bg-[#FF3366] text-white font-bold border-2 border-black shadow-comic-sm flex items-center justify-center text-xs hover:bg-rose-600 cursor-pointer"
              >
                ✕
              </button>
            </div>
            
            <div className="my-3 p-2 bg-[#00F0FF] text-black border-2 border-black text-xs font-bold font-comic-body">
              Switch roles to verify that permissions and restricted areas update instantly:
            </div>

            <div className="space-y-2.5 max-h-72 overflow-y-auto pr-1">
              {MOCK_ADMIN_PROFILES.map(user => (
                <button
                  key={user.id}
                  onClick={() => {
                    switchDemoUser(user.id);
                    setShowRoleSwitcher(false);
                  }}
                  className={`w-full text-left p-2.5 border-2 transition-all flex items-center justify-between cursor-pointer ${
                    profile?.id === user.id 
                      ? 'bg-[#00F0FF] text-black border-black shadow-comic-sm font-bold' 
                      : 'bg-[#12141d] border-black text-slate-200 hover:bg-slate-800'
                  }`}
                >
                  <div>
                    <div className="text-xs font-bold uppercase flex items-center gap-1.5 font-comic tracking-wider">
                      {user.full_name}
                      {!user.is_active && (
                        <span className="text-[9px] px-1 bg-[#FF3366] text-white border border-black font-mono">
                          INACTIVE
                        </span>
                      )}
                    </div>
                    <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                      ASSIGNMENT: <span className="text-[#00F0FF] font-bold">{user.role}</span>
                    </div>
                  </div>
                  <span className="text-xs font-comic tracking-wider px-2 py-0.5 bg-black text-[#00F0FF] border border-black uppercase font-bold">
                    SELECT →
                  </span>
                </button>
              ))}
            </div>

            <button
              onClick={() => setShowRoleSwitcher(false)}
              className="mt-4 w-full py-2 font-comic tracking-wider uppercase text-sm bg-slate-700 hover:bg-slate-600 text-white border-2 border-black shadow-comic-sm cursor-pointer"
            >
              CLOSE DOSSIER
            </button>
          </div>
        </div>
      )}
    </>
  );
};
