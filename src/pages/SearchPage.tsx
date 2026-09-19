import React, { useState } from 'react';
import { searchParticipants, lookupParticipantByToken } from '../lib/supabase';
import { TeamMember, ScannedParticipant } from '../types/database';
import { ScanResultCard } from '../components/scanner/ScanResultCard';
import { Search, QrCode, RefreshCw, ArrowRight } from 'lucide-react';

export const SearchPage: React.FC = () => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<TeamMember[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedParticipant, setSelectedParticipant] = useState<ScannedParticipant | null>(null);
  const [loadingParticipant, setLoadingParticipant] = useState(false);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;

    try {
      setIsSearching(true);
      const data = await searchParticipants(query);
      setResults(data);
    } catch (err) {
      console.error('Search error:', err);
    } finally {
      setIsSearching(false);
    }
  };

  const handleSelectMember = async (token: string) => {
    try {
      setLoadingParticipant(true);
      const participant = await lookupParticipantByToken(token);
      if (participant) {
        setSelectedParticipant(participant);
      }
    } catch (err) {
      console.error('Lookup member error:', err);
    } finally {
      setLoadingParticipant(false);
    }
  };

  if (selectedParticipant) {
    return (
      <div className="max-w-2xl mx-auto space-y-5 pb-20">
        <button
          onClick={() => setSelectedParticipant(null)}
          className="px-4 py-2 rounded-xl bg-[#00F0FF] text-black border-[2.5px] border-black shadow-comic-sm hover:shadow-comic font-comic tracking-wider text-sm flex items-center gap-1.5 transition-all cursor-pointer font-bold"
        >
          ← BACK TO INTEL ARCHIVES
        </button>
        <ScanResultCard
          scannedData={selectedParticipant}
          onScanNext={() => setSelectedParticipant(null)}
        />
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6 pb-20">
      
      {/* Search Header Banner */}
      <div className="relative bg-[#1a1c2b] border-[3.5px] border-black rounded-3xl p-6 sm:p-7 shadow-comic-lg overflow-hidden">
        {/* banner badge */}
        <div className="inline-block px-3 py-1 mb-2.5 rounded-lg bg-[#00F0FF] text-black border-2 border-black font-comic tracking-wider text-xs shadow-comic-sm uppercase font-bold">
          PARTICIPANT DIRECTORY
        </div>

        <h2 className="text-2xl sm:text-3xl font-comic text-white flex items-center gap-2 mb-1 tracking-wide uppercase">
          <Search className="w-6 h-6 text-[#00F0FF]" />
          PARTICIPANT DIRECTORY & SEARCH
        </h2>
        <p className="text-xs sm:text-sm font-comic-body font-bold text-slate-300 mb-5">
          Search registered participants by name, Team ID, college, or pass token.
        </p>

        <form onSubmit={handleSearch} className="flex flex-col sm:flex-row gap-2.5">
          <div className="relative flex-1">
            <Search className="w-5 h-5 text-slate-600 absolute left-3.5 top-3.5" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Enter name, Team ID (e.g. TEAM-001), college, or token..."
              className="w-full pl-11 pr-4 py-3 bg-[#fffdf0] border-[2.5px] border-black rounded-2xl text-xs sm:text-sm text-black placeholder-slate-500 font-comic-body font-bold focus:outline-none focus:ring-2 focus:ring-[#00F0FF] shadow-comic-sm"
            />
          </div>
          <button
            type="submit"
            disabled={isSearching || !query.trim()}
            className="py-3 px-7 rounded-2xl bg-[#00F0FF] hover:bg-[#00d4e0] text-black font-comic tracking-wider text-base sm:text-lg border-[2.5px] border-black transition-all shadow-comic hover:shadow-comic-lg disabled:opacity-50 flex items-center justify-center gap-2 uppercase cursor-pointer font-bold"
          >
            {isSearching ? <RefreshCw className="w-5 h-5 animate-spin" /> : 'SEARCH'}
          </button>
        </form>

        {/* Quick queries */}
        <div className="flex flex-wrap items-center gap-2 mt-4 text-xs font-comic-body font-bold text-slate-300">
          <span className="font-comic tracking-wider text-[#00F0FF] text-sm font-bold uppercase">QUICK SEARCH:</span>
          {['Arun', 'Sneha', 'TEAM-001', 'PSG', 'CIT'].map((hint, i) => {
            const colors = ['bg-[#00F0FF]', 'bg-[#A855F7] text-white', 'bg-[#00E676]', 'bg-[#FF3366] text-white', 'bg-[#3B82F6] text-white'];
            const colorClass = colors[i % colors.length];
            return (
              <button
                key={hint}
                type="button"
                onClick={() => {
                  setQuery(hint);
                  searchParticipants(hint).then(setResults);
                }}
                className={`px-2.5 py-0.5 rounded-lg ${colorClass} text-black border-2 border-black font-comic tracking-wider text-xs shadow-comic-sm hover:scale-105 active:scale-95 transition-transform`}
              >
                {hint}
              </button>
            );
          })}
        </div>
      </div>

      {/* Results List */}
      <div className="space-y-3">
        <div className="flex items-center justify-between text-xs sm:text-sm font-comic tracking-wider text-slate-300 px-1">
          <span className="px-2.5 py-1 bg-[#232738] border-2 border-black rounded-lg shadow-comic-sm text-[#00F0FF] font-bold">
            PARTICIPANTS FOUND: {results.length}
          </span>
          {loadingParticipant && (
            <span className="text-[#00F0FF] flex items-center gap-1.5 font-comic text-xs">
              <RefreshCw className="w-4 h-4 animate-spin" />
              LOADING DETAILS...
            </span>
          )}
        </div>

        {results.length === 0 ? (
          <div className="bg-[#1a1c2b] border-[3px] border-black rounded-3xl p-8 text-center shadow-comic">
            <p className="font-comic text-xl text-slate-400 tracking-wide mb-1 uppercase">
              NO PARTICIPANTS FOUND
            </p>
            <p className="font-comic-body font-bold text-slate-500 text-xs">
              Type a name, pass token, or team ID in the search bar above.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {results.map((m) => (
              <div
                key={m.id}
                className="bg-[#1a1c2b] border-[3px] border-black rounded-3xl p-4 sm:p-5 transition-all shadow-comic hover:shadow-comic-lg hover:-translate-y-0.5 flex flex-col justify-between group relative overflow-hidden"
              >
                {/* Accent */}
                <div className="absolute top-0 right-0 w-16 h-16 bg-gradient-to-bl from-white/5 to-transparent pointer-events-none" />

                <div>
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <span className="text-xs font-comic tracking-wider px-2.5 py-0.5 rounded-md bg-[#00F0FF] text-black border-2 border-black shadow-comic-sm font-bold">
                      {m.team_id}
                    </span>
                    {m.is_leader && (
                      <span className="text-xs font-comic font-bold tracking-wider px-2 py-0.5 rounded-md bg-[#FF3366] text-white border-2 border-black shadow-comic-sm uppercase">
                        TEAM LEADER
                      </span>
                    )}
                  </div>

                  <h4 className="text-lg sm:text-xl font-comic text-white tracking-wide group-hover:text-[#00F0FF] transition-colors line-clamp-1">
                    {m.name}
                  </h4>
                  <div className="text-xs text-slate-400 font-mono mt-1 flex items-center gap-1.5 bg-black/40 px-2 py-1 rounded-lg border border-slate-800">
                    <QrCode className="w-3.5 h-3.5 text-[#00F0FF] flex-shrink-0" />
                    <span className="truncate">{m.passport_token}</span>
                  </div>
                </div>

                <div className="pt-3 mt-3 border-t-2 border-black flex items-center justify-between">
                  <span className="text-[11px] font-comic-body font-bold text-slate-400 truncate max-w-[150px]">
                    {m.email}
                  </span>
                  <button
                    onClick={() => handleSelectMember(m.passport_token)}
                    className="py-1.5 px-3.5 rounded-xl bg-[#00F0FF] hover:bg-[#00d4e0] text-black font-comic tracking-wider text-sm border-2 border-black transition-all shadow-comic-sm hover:shadow-comic flex items-center gap-1 uppercase cursor-pointer font-bold"
                  >
                    VIEW DETAILS
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

    </div>
  );
};
