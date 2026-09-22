import React, { useState } from 'react';
import { useAuth } from '../lib/auth';
import { QrCode, Lock, Mail, ShieldAlert, ArrowRight } from 'lucide-react';

export const Login: React.FC = () => {
  const { signIn, isLoading, error } = useAuth();
  const [rollNo, setRollNo] = useState('');
  const [password, setPassword] = useState('');
  const [authError, setAuthError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);
    const res = await signIn(rollNo, password);
    if (!res.success && res.error) {
      setAuthError(res.error);
    }
  };

  return (
    <div className="min-h-screen bg-[#12141d] flex flex-col justify-center items-center px-4 py-10 relative overflow-hidden">
      
      {/* Comic Halftone & Pop Accents */}
      <div className="absolute inset-0 comic-halftone-white pointer-events-none opacity-40"></div>
      <div className="absolute -top-20 -left-20 w-80 h-80 bg-[#FF3366]/20 rounded-full blur-3xl pointer-events-none"></div>
      <div className="absolute -bottom-20 -right-20 w-80 h-80 bg-[#00F0FF]/20 rounded-full blur-3xl pointer-events-none"></div>

      <div className="w-full max-w-md relative z-10">
        
        {/* Header & Title */}
        <div className="text-center mb-6">
          <div className="inline-block bg-[#00F0FF] text-black font-comic tracking-wider text-xs sm:text-sm px-3 py-1 border-[2.5px] border-black shadow-comic-sm mb-3 uppercase font-bold">
            ZINNIA 2026 SYMPOSIUM
          </div>

          <div className="flex items-center justify-center gap-3 mb-2">
            <div className="w-14 h-14 bg-[#00F0FF] border-[3px] border-black shadow-comic flex items-center justify-center text-black">
              <QrCode className="w-8 h-8 stroke-[2.5]" />
            </div>
            <h1 className="text-3xl sm:text-4xl font-comic tracking-wider text-white uppercase">
              COORDINATOR PORTAL
            </h1>
          </div>

          {/* Subtitle Badge */}
          <div className="mt-3 mx-auto max-w-xs bg-[#1a1c2b] text-slate-200 border-[2px] border-black p-2.5 shadow-comic text-xs font-semibold font-comic-body">
            Official portal for participant verification, event check-in & telemetry.
          </div>
        </div>

        {/* Form Panel */}
        <div className="bg-[#1b1f2d] border-[3.5px] border-black rounded-none p-6 sm:p-7 shadow-comic-xl relative mt-4">
          
          {/* Corner Badge */}
          <div className="absolute -top-3.5 right-4 bg-[#00F0FF] text-black font-comic text-xs px-2.5 py-0.5 border-2 border-black shadow-comic-sm uppercase tracking-wide font-bold">
            COORDINATOR AUTH
          </div>

          {(authError || error) && (
            <div className="mb-5 p-3 bg-[#FF3366] text-white border-[2.5px] border-black shadow-comic text-xs flex items-start gap-2.5 animate-in fade-in duration-200">
              <ShieldAlert className="w-5 h-5 text-white flex-shrink-0 mt-0.5 stroke-[2.5]" />
              <div>
                <p className="font-comic tracking-wider text-sm uppercase">ACCESS DENIED</p>
                <p className="font-bold text-[11px] mt-0.5">{authError || error}</p>
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-bold text-white uppercase tracking-wider font-comic">
                  COORDINATOR CODE
                </label>
                <span className="text-[10px] bg-[#00F0FF] text-black font-mono font-bold px-1.5 py-0.2 border border-black">
                  CASE-INSENSITIVE
                </span>
              </div>
              <div className="relative">
                <Mail className="w-4 h-4 text-black absolute left-3.5 top-3 stroke-[2.5]" />
                <input
                  type="text"
                  required
                  autoCapitalize="characters"
                  value={rollNo}
                  onChange={(e) => setRollNo(e.target.value)}
                  placeholder="e.g. TECH01, FOODC01, ADMIN01"
                  className="w-full pl-10 pr-4 py-2.5 bg-[#FFFDF0] text-black border-[2.5px] border-black text-xs sm:text-sm uppercase font-mono font-bold placeholder-slate-500 shadow-comic-sm focus:outline-none focus:bg-white focus:shadow-comic transition-all"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-white uppercase tracking-wider font-comic mb-1">
                SECURITY PASSWORD
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-black absolute left-3.5 top-3 stroke-[2.5]" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full pl-10 pr-4 py-2.5 bg-[#FFFDF0] text-black border-[2.5px] border-black text-xs sm:text-sm font-mono font-bold placeholder-slate-500 shadow-comic-sm focus:outline-none focus:bg-white focus:shadow-comic transition-all"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3.5 px-4 bg-[#00F0FF] hover:bg-[#00d4e0] text-black font-comic font-bold tracking-wider text-base sm:text-lg uppercase border-[3px] border-black shadow-comic comic-btn flex items-center justify-center gap-2 disabled:opacity-50 mt-2 cursor-pointer"
            >
              {isLoading ? (
                'VERIFYING CREDENTIALS...'
              ) : (
                <>
                  SIGN IN TO PORTAL
                  <ArrowRight className="w-5 h-5 stroke-[2.5]" />
                </>
              )}
            </button>
          </form>

          {/* Comic Footer Notice */}
          <div className="mt-5 pt-3 border-t-2 border-black border-dashed text-center">
  
            <p className="text-[10px] text-slate-400 mt-1 font-comic-body">
              Authenticate using your registered coordinator credentials to unlock permissions.
            </p>
          </div>

        </div>

      </div>

    </div>
  );
};
