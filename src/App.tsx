import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './lib/auth';
import { Navbar } from './components/layout/Navbar';
import { MobileBottomNav } from './components/layout/MobileBottomNav';
import { Login } from './pages/Login';
import { Dashboard } from './pages/Dashboard';
import { CheckinTab } from './pages/CheckinTab';
import { FoodTab } from './pages/FoodTab';
import { TechEventsTab } from './pages/TechEventsTab';
import { NonTechEventsTab } from './pages/NonTechEventsTab';
import { SearchPage } from './pages/SearchPage';
import { ScannerPage } from './pages/ScannerPage';
import { QrCode } from 'lucide-react';

const PortalMain: React.FC = () => {
  const { profile, permissions, isLoading } = useAuth();
  const [currentTab, setCurrentTab] = useState<string>('dashboard');

  // Auto-select most appropriate default tab when coordinator logs in
  useEffect(() => {
    if (!profile) return;

    if (permissions.isSuperAdmin) {
      setCurrentTab('dashboard');
    } else if (permissions.canScanEntry && !permissions.canScanFood && !permissions.canViewTechTab && !permissions.canViewNonTechTab) {
      setCurrentTab('checkin');
    } else if (permissions.canScanFood && !permissions.canScanEntry) {
      setCurrentTab('food');
    } else if (permissions.canViewTechTab && !permissions.canViewNonTechTab) {
      setCurrentTab('tech');
    } else if (permissions.canViewNonTechTab && !permissions.canViewTechTab) {
      setCurrentTab('nontech');
    } else {
      setCurrentTab('dashboard');
    }
  }, [profile, permissions]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#12141d] flex flex-col items-center justify-center p-4">
        <div className="w-20 h-20 bg-[#00F0FF] border-[3.5px] border-black shadow-comic-lg flex items-center justify-center mb-4">
          <QrCode className="w-10 h-10 text-black stroke-[2.5]" />
        </div>
        <div className="bg-[#00F0FF] text-black font-comic font-bold tracking-wider text-lg px-4 py-1.5 border-[3px] border-black shadow-comic uppercase">
          LOADING COORDINATOR SESSION...
        </div>
        <p className="text-xs font-mono text-slate-400 mt-2">VERIFYING COORDINATOR CREDENTIALS</p>
      </div>
    );
  }

  if (!profile) {
    return <Login />;
  }

  return (
    <div className="min-h-screen bg-[#12141d] flex flex-col selection:bg-[#00F0FF] selection:text-black">
      <Navbar currentTab={currentTab} setCurrentTab={setCurrentTab} />

      <main className="flex-1 max-w-7xl w-full mx-auto p-3 sm:p-5 md:p-6 pb-28 md:pb-12">
        {currentTab === 'dashboard' && (
          <Dashboard setCurrentTab={setCurrentTab} />
        )}
        {currentTab === 'checkin' && (
          <CheckinTab />
        )}
        {currentTab === 'food' && (
          <FoodTab />
        )}
        {currentTab === 'tech' && (
          <TechEventsTab />
        )}
        {currentTab === 'nontech' && (
          <NonTechEventsTab />
        )}
        {currentTab === 'search' && (
          <SearchPage />
        )}
        {currentTab === 'scanner' && (
          <ScannerPage onBackToDashboard={() => setCurrentTab('dashboard')} />
        )}
        {currentTab === 'events' && (
          permissions.canViewTechTab ? <TechEventsTab /> : <NonTechEventsTab />
        )}
      </main>

      <MobileBottomNav currentTab={currentTab} setCurrentTab={setCurrentTab} />
    </div>
  );
};

export const App: React.FC = () => {
  return (
    <AuthProvider>
      <PortalMain />
    </AuthProvider>
  );
};

export default App;
