import React from 'react';
import { LayoutDashboard, DoorOpen, Utensils, Cpu, Compass, Search } from 'lucide-react';
import { useAuth } from '../../lib/auth';

interface MobileBottomNavProps {
  currentTab: string;
  setCurrentTab: (tab: string) => void;
}

export const MobileBottomNav: React.FC<MobileBottomNavProps> = ({ currentTab, setCurrentTab }) => {
  const { permissions } = useAuth();

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-[#161926] border-t-[3.5px] border-black px-1.5 py-1 flex items-center justify-around overflow-x-auto shadow-comic">
      
      {/* Dashboard Tab */}
      <button
        onClick={() => setCurrentTab('dashboard')}
        className={`flex flex-col items-center py-1 px-2 rounded-none transition-all flex-shrink-0 cursor-pointer ${
          currentTab === 'dashboard' ? 'bg-[#00F0FF] text-black font-comic tracking-wider border-2 border-black shadow-comic-sm font-bold' : 'text-slate-300 hover:text-white'
        }`}
      >
        <LayoutDashboard className="w-4 h-4 mb-0.5 stroke-[2.5]" />
        <span className="text-[10px] font-comic uppercase tracking-wider">Dash</span>
      </button>

      {/* Check-in Tab */}
      {(permissions.canScanEntry || permissions.isSuperAdmin) && (
        <button
          onClick={() => setCurrentTab('checkin')}
          className={`flex flex-col items-center py-1 px-2 rounded-none transition-all flex-shrink-0 cursor-pointer ${
            currentTab === 'checkin' ? 'bg-[#3B82F6] text-white font-comic tracking-wider border-2 border-black shadow-comic-sm font-bold' : 'text-slate-300 hover:text-white'
          }`}
        >
          <DoorOpen className="w-4 h-4 mb-0.5 stroke-[2.5]" />
          <span className="text-[10px] font-comic uppercase tracking-wider">Gate</span>
        </button>
      )}

      {/* Food Tab */}
      {(permissions.canScanFood || permissions.isSuperAdmin) && (
        <button
          onClick={() => setCurrentTab('food')}
          className={`flex flex-col items-center py-1 px-2 rounded-none transition-all flex-shrink-0 cursor-pointer ${
            currentTab === 'food' ? 'bg-[#00E676] text-black font-comic tracking-wider border-2 border-black shadow-comic-sm font-bold' : 'text-slate-300 hover:text-white'
          }`}
        >
          <Utensils className="w-4 h-4 mb-0.5 stroke-[2.5]" />
          <span className="text-[10px] font-comic uppercase tracking-wider">Food</span>
        </button>
      )}

      {/* Tech Events Tab */}
      {permissions.canViewTechTab && (
        <button
          onClick={() => setCurrentTab('tech')}
          className={`flex flex-col items-center py-1 px-2 rounded-none transition-all flex-shrink-0 cursor-pointer ${
            currentTab === 'tech' ? 'bg-[#00F0FF] text-black font-comic tracking-wider border-2 border-black shadow-comic-sm' : 'text-slate-300 hover:text-white'
          }`}
        >
          <Cpu className="w-4 h-4 mb-0.5 stroke-[2.5]" />
          <span className="text-[10px] font-comic uppercase tracking-wider">Tech</span>
        </button>
      )}

      {/* Non-Tech Events Tab */}
      {permissions.canViewNonTechTab && (
        <button
          onClick={() => setCurrentTab('nontech')}
          className={`flex flex-col items-center py-1 px-2 rounded-none transition-all flex-shrink-0 cursor-pointer ${
            currentTab === 'nontech' ? 'bg-[#A855F7] text-white font-comic tracking-wider border-2 border-black shadow-comic-sm' : 'text-slate-300 hover:text-white'
          }`}
        >
          <Compass className="w-4 h-4 mb-0.5 stroke-[2.5]" />
          <span className="text-[10px] font-comic uppercase tracking-wider">Non-Tech</span>
        </button>
      )}

      {/* Search */}
      <button
        onClick={() => setCurrentTab('search')}
        className={`flex flex-col items-center py-1 px-2 rounded-none transition-all flex-shrink-0 cursor-pointer ${
          currentTab === 'search' ? 'bg-[#00E676] text-black font-comic tracking-wider border-2 border-black shadow-comic-sm' : 'text-slate-300 hover:text-white'
        }`}
      >
        <Search className="w-4 h-4 mb-0.5 stroke-[2.5]" />
        <span className="text-[10px] font-comic uppercase tracking-wider">Search</span>
      </button>

    </nav>
  );
};
