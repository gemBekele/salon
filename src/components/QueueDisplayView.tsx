import React, { useState, useEffect } from 'react';
import { Tv, Volume2, VolumeX, Maximize2, RefreshCw, Scissors, Clock, Sparkles, AlertCircle, Building2 } from 'lucide-react';
import { Company, Branch, VisitSession } from '../types';

interface QueueDisplayViewProps {
  company: Company;
  branch: Branch;
  visitSessions: VisitSession[];
  onExitTvMode?: () => void;
}

export const QueueDisplayView: React.FC<QueueDisplayViewProps> = ({
  company,
  branch,
  visitSessions,
  onExitTvMode,
}) => {
  const [countdown, setCountdown] = useState(10);
  const [lastRefreshedAt, setLastRefreshedAt] = useState<string>(new Date().toLocaleTimeString());
  const [audioEnabled, setAudioEnabled] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Filter sessions for this branch
  const branchSessions = visitSessions.filter((s) => s.branchId === branch.id);
  const nowServingSessions = branchSessions.filter((s) => s.status === 'in_progress');
  const nextInQueueSessions = branchSessions.filter((s) => s.status === 'queued');

  // Simulated 10-second polling effect
  useEffect(() => {
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          setIsRefreshing(true);
          setLastRefreshedAt(new Date().toLocaleTimeString());
          setTimeout(() => setIsRefreshing(false), 800);
          return 10;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen().catch(() => {});
      }
    }
  };

  // Assign rooms/chairs for display
  const getAssignedRoom = (session: VisitSession, idx: number): string => {
    const serviceName = session.services[0]?.serviceName || '';
    if (serviceName.toLowerCase().includes('massage') || serviceName.toLowerCase().includes('spa')) {
      return `Spa Suite #${idx + 1}`;
    }
    if (serviceName.toLowerCase().includes('barber') || serviceName.toLowerCase().includes('hair')) {
      return `Barber Chair #${idx + 1}`;
    }
    return `Station #${idx + 1}`;
  };

  return (
    <div className="min-h-screen bg-[#1c1c18] text-[#f5f5f0] flex flex-col justify-between p-6 md:p-10 font-sans selection:bg-[#5A5A40] selection:text-white">
      {/* Top TV Header Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#38382e] pb-6">
        <div className="flex items-center space-x-4">
          <div className="w-14 h-14 rounded-2xl bg-[#5A5A40] border border-[#7a7a58] flex items-center justify-center text-white font-serif font-extrabold text-2xl shadow-lg">
            S
          </div>
          <div>
            <div className="flex items-center space-x-3">
              <h1 className="text-2xl md:text-3xl font-serif font-bold text-white tracking-wide">
                {company.name}
              </h1>
              <span className="px-3 py-1 rounded-full text-xs font-bold bg-[#5A5A40] text-[#f5f5f0] border border-[#7a7a58] uppercase tracking-widest flex items-center space-x-1.5">
                <Tv className="w-3.5 h-3.5" />
                <span>Live Waiting Room TV Display</span>
              </span>
            </div>
            <p className="text-xs md:text-sm text-[#b8b8a0] font-medium mt-0.5 flex items-center space-x-2">
              <Building2 className="w-4 h-4 text-[#8a8a68]" />
              <span>{branch.name} ({branch.city}) — Real-Time Waiting Queue Board</span>
            </p>
          </div>
        </div>

        {/* Polling & Screen Controls */}
        <div className="flex items-center space-x-3">
          {/* Polling Indicator */}
          <div className="bg-[#2a2a24] border border-[#38382e] px-4 py-2 rounded-2xl flex items-center space-x-2 text-xs">
            <RefreshCw className={`w-3.5 h-3.5 text-amber-400 ${isRefreshing ? 'animate-spin' : ''}`} />
            <span className="text-[#b8b8a0]">
              Polling in <strong className="text-amber-400 font-mono text-sm">{countdown}s</strong>
            </span>
            <span className="text-[10px] text-[#787868] hidden sm:inline">(Updated {lastRefreshedAt})</span>
          </div>

          <button
            onClick={() => setAudioEnabled(!audioEnabled)}
            className={`p-2.5 rounded-2xl border transition-colors cursor-pointer ${
              audioEnabled
                ? 'bg-[#5A5A40] border-[#7a7a58] text-white'
                : 'bg-[#2a2a24] border-[#38382e] text-[#787868]'
            }`}
            title="Toggle Audio Announcement Chime"
          >
            {audioEnabled ? <Volume2 className="w-5 h-5" /> : <VolumeX className="w-5 h-5" />}
          </button>

          <button
            onClick={toggleFullscreen}
            className="p-2.5 rounded-2xl bg-[#2a2a24] hover:bg-[#38382e] border border-[#38382e] text-[#f5f5f0] cursor-pointer"
            title="Toggle Fullscreen Mode"
          >
            <Maximize2 className="w-5 h-5" />
          </button>

          {onExitTvMode && (
            <button
              onClick={onExitTvMode}
              className="px-4 py-2 rounded-2xl bg-stone-800 hover:bg-stone-700 text-stone-300 text-xs font-bold border border-stone-700 cursor-pointer"
            >
              Exit TV View
            </button>
          )}
        </div>
      </div>

      {/* Main Waiting Board Display Area */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 my-8 flex-1">
        {/* NOW SERVING spotlight (7 Cols) */}
        <div className="lg:col-span-7 bg-[#23231d] border-2 border-[#5A5A40] rounded-3xl p-8 space-y-6 shadow-2xl relative overflow-hidden flex flex-col justify-between">
          <div className="absolute top-0 right-0 bg-[#5A5A40] text-white px-6 py-2 rounded-bl-3xl text-xs font-bold tracking-widest uppercase font-serif flex items-center space-x-2">
            <Sparkles className="w-4 h-4 text-amber-300" />
            <span>NOW SERVING</span>
          </div>

          <div>
            <h2 className="text-lg md:text-xl font-serif font-bold text-[#b8b8a0] uppercase tracking-wider mb-4">
              Current Active Service Stations
            </h2>

            {nowServingSessions.length === 0 ? (
              <div className="py-16 text-center space-y-3 bg-[#1a1a16] rounded-3xl border border-[#38382e]">
                <Clock className="w-12 h-12 text-[#5A5A40] mx-auto animate-pulse" />
                <h3 className="text-xl font-serif font-bold text-[#b8b8a0]">All Service Stations Available</h3>
                <p className="text-xs text-[#787868]">Next customer in queue will be called shortly</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                {nowServingSessions.map((session, idx) => (
                  <div
                    key={session.id}
                    className="bg-[#1a1a16] border border-[#4a4a38] rounded-3xl p-6 space-y-4 shadow-lg animate-fadeIn relative"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-amber-400 uppercase tracking-widest px-3 py-1 bg-amber-500/10 rounded-full border border-amber-500/30">
                        {getAssignedRoom(session, idx)}
                      </span>
                      <span className="text-[10px] text-[#787868] uppercase font-bold">In Progress</span>
                    </div>

                    <div className="text-5xl md:text-6xl font-serif font-extrabold text-white tracking-wider font-mono">
                      {session.queueNumber}
                    </div>

                    <div className="space-y-1">
                      <div className="text-lg font-bold text-[#f5f5f0]">{session.customerName}</div>
                      <div className="text-xs text-[#b8b8a0] flex items-center space-x-1.5">
                        <Scissors className="w-3.5 h-3.5 text-amber-400" />
                        <span>{session.services.map((s) => s.serviceName).join(', ')}</span>
                      </div>
                      <div className="text-xs text-amber-300/90 font-medium pt-1">
                        Provider: {session.services[0]?.staffName || 'Assigned Specialist'}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="bg-[#1a1a16] border border-[#38382e] p-4 rounded-2xl text-xs text-[#b8b8a0] flex items-center justify-between">
            <span>Please present your queue token upon being called</span>
            <span className="text-amber-400 font-bold">Total Active Stations: {nowServingSessions.length}</span>
          </div>
        </div>

        {/* NEXT IN QUEUE list (5 Cols) */}
        <div className="lg:col-span-5 bg-[#23231d] border border-[#38382e] rounded-3xl p-8 space-y-6 shadow-xl flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between border-b border-[#38382e] pb-4 mb-4">
              <div>
                <h2 className="text-xl font-serif font-bold text-white tracking-wide">NEXT IN QUEUE</h2>
                <p className="text-xs text-[#b8b8a0]">Estimated waiting time ~ 10-15 mins</p>
              </div>
              <span className="text-2xl font-serif font-bold text-amber-400 bg-amber-400/10 px-4 py-1.5 rounded-2xl border border-amber-400/20">
                {nextInQueueSessions.length}
              </span>
            </div>

            {nextInQueueSessions.length === 0 ? (
              <div className="py-12 text-center text-xs text-[#787868] italic">
                No waiting customers in queue at this moment.
              </div>
            ) : (
              <div className="space-y-3">
                {nextInQueueSessions.map((session, idx) => (
                  <div
                    key={session.id}
                    className="bg-[#1a1a16] border border-[#38382e] hover:border-[#5A5A40] rounded-2xl p-4 flex items-center justify-between transition-colors"
                  >
                    <div className="flex items-center space-x-4">
                      <div className="w-10 h-10 rounded-2xl bg-[#5A5A40]/30 text-amber-300 font-mono font-bold flex items-center justify-center text-sm border border-[#5A5A40]/50">
                        #{idx + 1}
                      </div>
                      <div>
                        <div className="text-xl font-mono font-bold text-white">{session.queueNumber}</div>
                        <div className="text-xs text-[#b8b8a0]">{session.customerName}</div>
                      </div>
                    </div>

                    <div className="text-right text-xs">
                      <div className="text-[#b8b8a0] font-medium">
                        {session.services[0]?.serviceName || 'General Service'}
                      </div>
                      <div className="text-[10px] text-emerald-400 font-mono font-bold mt-0.5">
                        Est. Wait ~ {(idx + 1) * 10} mins
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="bg-[#1a1a16] border border-[#38382e] p-4 rounded-2xl text-center text-xs text-[#787868]">
            ✦ Complementary Wi-Fi & Natural Herbal Tea available in reception lounge ✦
          </div>
        </div>
      </div>

      {/* Bottom Ticker / Banner */}
      <div className="border-t border-[#38382e] pt-4 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-[#787868]">
        <div className="flex items-center space-x-2">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping"></span>
          <span className="text-[#b8b8a0] font-bold">Serenity ERP Live Waiting Display Protocol v2.4</span>
        </div>
        <div>
          For assistance or priority booking, please approach the reception desk.
        </div>
      </div>
    </div>
  );
};
