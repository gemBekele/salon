import React, { useState } from 'react';
import { Calendar, Clock, User, Scissors, Move, CheckCircle2, PlayCircle, AlertCircle, Sparkles, AlertTriangle, ShieldAlert } from 'lucide-react';
import { Staff, VisitSession } from '../types';

interface WeeklySchedulerProps {
  staffList: Staff[];
  visitSessions: VisitSession[];
  onUpdateSessionTimeOrStaff?: (sessionId: string, newStaffId: string, newTime: string) => void;
}

const TIME_SLOTS = [
  '08:00 AM',
  '09:00 AM',
  '10:00 AM',
  '11:00 AM',
  '12:00 PM',
  '01:00 PM',
  '02:00 PM',
  '03:00 PM',
  '04:00 PM',
  '05:00 PM',
  '06:00 PM',
];

export const WeeklyScheduler: React.FC<WeeklySchedulerProps> = ({
  staffList,
  visitSessions,
  onUpdateSessionTimeOrStaff,
}) => {
  const [selectedDay, setSelectedDay] = useState<string>('Today');
  const [draggedSessionId, setDraggedSessionId] = useState<string | null>(null);
  const [dragOverCell, setDragOverCell] = useState<{ staffId: string; timeSlot: string } | null>(null);
  const [notification, setNotification] = useState<{ type: 'success' | 'warning'; message: string } | null>(null);
  const [highlightConflictsOnly, setHighlightConflictsOnly] = useState(false);

  // Quick helper to map a session start time or fallback to a slot
  const getSessionSlot = (session: VisitSession): string => {
    if (!session.startedAt) return TIME_SLOTS[2]; // Default 10:00 AM
    try {
      const date = new Date(session.startedAt);
      const hours = date.getHours();
      if (hours <= 8) return '08:00 AM';
      if (hours === 9) return '09:00 AM';
      if (hours === 10) return '10:00 AM';
      if (hours === 11) return '11:00 AM';
      if (hours === 12) return '12:00 PM';
      if (hours === 13) return '01:00 PM';
      if (hours === 14) return '02:00 PM';
      if (hours === 15) return '03:00 PM';
      if (hours === 16) return '04:00 PM';
      if (hours === 17) return '05:00 PM';
      return '06:00 PM';
    } catch {
      return TIME_SLOTS[2];
    }
  };

  // Compute total overlapping collisions across all staff & slots
  let totalCollisionCount = 0;
  TIME_SLOTS.forEach((slot) => {
    staffList.forEach((stf) => {
      const activeSessions = visitSessions.filter((s) => {
        const matchesStaff = s.services.some((srv) => srv.staffId === stf.id);
        const matchesSlot = getSessionSlot(s) === slot;
        return matchesStaff && matchesSlot && s.status !== 'completed';
      });
      if (activeSessions.length >= 2) {
        totalCollisionCount += activeSessions.length - 1;
      }
    });
  });

  const handleDragStart = (e: React.DragEvent, sessionId: string) => {
    e.dataTransfer.setData('text/plain', sessionId);
    setDraggedSessionId(sessionId);
  };

  const handleDragOver = (e: React.DragEvent, staffId: string, timeSlot: string) => {
    e.preventDefault();
    setDragOverCell({ staffId, timeSlot });
  };

  const handleDrop = (e: React.DragEvent, targetStaffId: string, targetTimeSlot: string) => {
    e.preventDefault();
    const sessionId = e.dataTransfer.getData('text/plain') || draggedSessionId;
    if (sessionId && onUpdateSessionTimeOrStaff) {
      const staffMember = staffList.find((s) => s.id === targetStaffId);
      const session = visitSessions.find((s) => s.id === sessionId);

      // Check if target cell ALREADY has an active or queued session
      const existingCellSessions = visitSessions.filter((s) => {
        const matchesStaff = s.services.some((srv) => srv.staffId === targetStaffId);
        const matchesSlot = getSessionSlot(s) === targetTimeSlot;
        return matchesStaff && matchesSlot && s.id !== sessionId && s.status !== 'completed';
      });

      onUpdateSessionTimeOrStaff(sessionId, targetStaffId, targetTimeSlot);

      if (existingCellSessions.length > 0) {
        setNotification({
          type: 'warning',
          message: `⚠️ DOUBLE-BOOKING CONFLICT! ${staffMember?.name || 'Staff'} now has ${existingCellSessions.length + 1} overlapping appointments at ${targetTimeSlot}!`,
        });
      } else {
        setNotification({
          type: 'success',
          message: `Rescheduled Queue #${session?.queueNumber || 'Session'} to ${staffMember?.name || 'Staff'} at ${targetTimeSlot}`,
        });
      }

      setTimeout(() => setNotification(null), 5000);
    }
    setDraggedSessionId(null);
    setDragOverCell(null);
  };

  return (
    <div className="bg-white border border-[#e5e5d1] rounded-3xl p-6 space-y-5 shadow-sm font-sans">
      {/* Top Controls & Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#e5e5d1] pb-4">
        <div>
          <div className="flex items-center space-x-2">
            <Calendar className="w-5 h-5 text-[#5A5A40]" />
            <h3 className="text-lg font-serif font-bold text-[#2d2d2a]">Staff Weekly Schedule & Session Dispatcher</h3>
          </div>
          <p className="text-xs text-[#737366] mt-0.5">
            Interactive Drag & Drop calendar grid with real-time double-booking & staff overlap conflict detection.
          </p>
        </div>

        {/* Day Selector & Conflict Toggle */}
        <div className="flex items-center space-x-2">
          {totalCollisionCount > 0 && (
            <button
              onClick={() => setHighlightConflictsOnly(!highlightConflictsOnly)}
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-2xl text-xs font-bold border transition-all cursor-pointer ${
                highlightConflictsOnly
                  ? 'bg-red-600 text-white border-red-700 shadow-sm'
                  : 'bg-red-50 text-red-900 border-red-300 hover:bg-red-100'
              }`}
            >
              <ShieldAlert className="w-4 h-4 text-red-600 shrink-0" />
              <span>{totalCollisionCount} Overlap Conflict{totalCollisionCount > 1 ? 's' : ''}</span>
            </button>
          )}

          <div className="flex items-center space-x-1 bg-[#f5f5f0] p-1 rounded-2xl border border-[#e5e5d1] text-xs">
            {['Today', 'Tomorrow', 'This Weekend'].map((day) => (
              <button
                key={day}
                onClick={() => setSelectedDay(day)}
                className={`px-3 py-1.5 rounded-xl font-bold transition-all cursor-pointer ${
                  selectedDay === day
                    ? 'bg-[#5A5A40] text-white shadow-sm'
                    : 'text-[#737366] hover:text-[#2d2d2a]'
                }`}
              >
                {day}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Toast Notification */}
      {notification && (
        <div
          className={`px-4 py-2.5 rounded-2xl text-xs font-semibold flex items-center space-x-2 animate-fadeIn border ${
            notification.type === 'warning'
              ? 'bg-red-50 border-red-300 text-red-950 font-bold'
              : 'bg-emerald-50 border-emerald-300 text-emerald-900'
          }`}
        >
          {notification.type === 'warning' ? (
            <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
          ) : (
            <Sparkles className="w-4 h-4 text-emerald-600 shrink-0" />
          )}
          <span>{notification.message}</span>
        </div>
      )}

      {/* Instruction Banner */}
      <div className="bg-[#f5f5f0] border border-[#e5e5d1] rounded-2xl px-4 py-2.5 text-xs text-[#737366] flex flex-col md:flex-row md:items-center justify-between gap-2">
        <div className="flex items-center space-x-2">
          <Move className="w-4 h-4 text-[#5A5A40]" />
          <span><strong>Drag-and-Drop:</strong> Drag visits into a staff member's slot to reschedule. Overlaps are highlighted automatically.</span>
        </div>
        <div className="flex items-center space-x-3 text-[11px]">
          <span className="flex items-center space-x-1">
            <span className="w-2 h-2 rounded-full bg-red-500"></span>
            <span className="font-bold text-red-700">Double-Booked</span>
          </span>
          <span className="flex items-center space-x-1">
            <span className="w-2 h-2 rounded-full bg-amber-500"></span>
            <span>Queued</span>
          </span>
          <span className="flex items-center space-x-1">
            <span className="w-2 h-2 rounded-full bg-blue-500"></span>
            <span>In Progress</span>
          </span>
          <span className="flex items-center space-x-1">
            <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
            <span>Completed</span>
          </span>
        </div>
      </div>

      {/* Grid Schedule Container */}
      <div className="overflow-x-auto rounded-2xl border border-[#e5e5d1]">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="bg-[#f5f5f0] text-[#5A5A40] font-serif border-b border-[#e5e5d1]">
              <th className="p-3 border-r border-[#e5e5d1] w-24 text-center font-bold text-xs uppercase tracking-wider">
                Time Slot
              </th>
              {staffList.map((stf) => (
                <th key={stf.id} className="p-3 border-r border-[#e5e5d1] min-w-[200px]">
                  <div className="flex items-center space-x-2">
                    <div className="w-7 h-7 rounded-full bg-[#5A5A40] text-white font-bold flex items-center justify-center text-xs">
                      {stf.name.charAt(0)}
                    </div>
                    <div>
                      <div className="font-bold text-[#2d2d2a]">{stf.name}</div>
                      <div className="text-[10px] text-[#737366] capitalize">{stf.role}</div>
                    </div>
                  </div>
                </th>
              ))}
            </tr>
          </thead>

          <tbody>
            {TIME_SLOTS.map((timeSlot) => (
              <tr key={timeSlot} className="border-b border-[#e5e5d1]/60 hover:bg-[#f5f5f0]/30 transition-colors">
                {/* Time Slot Label */}
                <td className="p-3 border-r border-[#e5e5d1] font-mono text-[11px] font-bold text-[#737366] text-center bg-[#f5f5f0]/50">
                  <div className="flex items-center justify-center space-x-1">
                    <Clock className="w-3 h-3 text-[#5A5A40]" />
                    <span>{timeSlot}</span>
                  </div>
                </td>

                {/* Staff Columns */}
                {staffList.map((stf) => {
                  // Find sessions assigned to this staff member matching slot
                  const matchingSessions = visitSessions.filter((session) => {
                    const matchesStaff = session.services.some((s) => s.staffId === stf.id);
                    const matchesSlot = getSessionSlot(session) === timeSlot;
                    return matchesStaff && matchesSlot;
                  });

                  const activeUncompletedSessions = matchingSessions.filter((s) => s.status !== 'completed');
                  const hasOverlapConflict = activeUncompletedSessions.length >= 2;

                  if (highlightConflictsOnly && !hasOverlapConflict) {
                    // Skip unconflicted cells if filter is on
                  }

                  const isHovered =
                    dragOverCell?.staffId === stf.id && dragOverCell?.timeSlot === timeSlot;

                  const isHoveringOnOccupiedCell =
                    isHovered && matchingSessions.some((s) => s.status !== 'completed');

                  return (
                    <td
                      key={`${stf.id}-${timeSlot}`}
                      onDragOver={(e) => handleDragOver(e, stf.id, timeSlot)}
                      onDrop={(e) => handleDrop(e, stf.id, timeSlot)}
                      className={`p-2 border-r border-[#e5e5d1] min-h-[70px] vertical-top transition-all ${
                        hasOverlapConflict
                          ? 'bg-red-50/70 border-2 border-red-500'
                          : isHoveringOnOccupiedCell
                          ? 'bg-red-100/80 border-2 border-dashed border-red-500'
                          : isHovered
                          ? 'bg-[#5A5A40]/10 border-2 border-dashed border-[#5A5A40]'
                          : ''
                      }`}
                    >
                      {/* OVERLAP WARNING BADGE */}
                      {hasOverlapConflict && (
                        <div className="mb-2 p-1.5 bg-red-100 border border-red-300 rounded-xl text-red-900 font-bold text-[10px] flex items-center justify-between shadow-xs">
                          <span className="flex items-center space-x-1">
                            <AlertTriangle className="w-3.5 h-3.5 text-red-600 shrink-0 animate-bounce" />
                            <span>Staff Double-Booked! ({matchingSessions.length} sessions)</span>
                          </span>
                        </div>
                      )}

                      {/* HOVER CONFLICT TOOLTIP */}
                      {isHoveringOnOccupiedCell && !hasOverlapConflict && (
                        <div className="mb-1.5 p-1 bg-amber-100 border border-amber-300 rounded-lg text-amber-900 font-bold text-[9px] flex items-center space-x-1">
                          <AlertTriangle className="w-3 h-3 text-amber-700" />
                          <span>Warning: Dropping creates an overlap!</span>
                        </div>
                      )}

                      {matchingSessions.length === 0 ? (
                        <div className="h-full min-h-[50px] flex items-center justify-center text-[10px] text-stone-300 italic border border-dashed border-stone-200 rounded-xl p-1">
                          Available Slot
                        </div>
                      ) : (
                        <div className="space-y-1.5">
                          {matchingSessions.map((session) => {
                            const isCompleted = session.status === 'completed';
                            const isInProgress = session.status === 'in_progress';

                            return (
                              <div
                                key={session.id}
                                draggable
                                onDragStart={(e) => handleDragStart(e, session.id)}
                                className={`p-2.5 rounded-2xl border cursor-grab active:cursor-grabbing shadow-sm transition-transform hover:-translate-y-0.5 ${
                                  hasOverlapConflict && !isCompleted
                                    ? 'bg-red-50 border-red-400 text-red-950 ring-2 ring-red-200'
                                    : isCompleted
                                    ? 'bg-emerald-50 border-emerald-200 text-emerald-950'
                                    : isInProgress
                                    ? 'bg-blue-50 border-blue-200 text-blue-950'
                                    : 'bg-amber-50 border-amber-200 text-amber-950'
                                }`}
                              >
                                <div className="flex items-center justify-between mb-1">
                                  <span className="font-mono font-bold text-[10px] px-1.5 py-0.5 rounded bg-white/80 border border-stone-200">
                                    {session.queueNumber}
                                  </span>
                                  {hasOverlapConflict && !isCompleted ? (
                                    <span className="px-1.5 py-0.2 rounded bg-red-200 text-red-900 text-[9px] font-bold uppercase flex items-center space-x-0.5">
                                      <AlertTriangle className="w-2.5 h-2.5 text-red-700" />
                                      <span>Overlap</span>
                                    </span>
                                  ) : isCompleted ? (
                                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                                  ) : isInProgress ? (
                                    <PlayCircle className="w-3.5 h-3.5 text-blue-600 animate-pulse" />
                                  ) : (
                                    <AlertCircle className="w-3.5 h-3.5 text-amber-600" />
                                  )}
                                </div>

                                <div className="font-bold text-xs truncate">{session.customerName}</div>
                                
                                <div className="text-[10px] text-stone-600 flex items-center space-x-1 mt-0.5">
                                  <Scissors className="w-2.5 h-2.5" />
                                  <span className="truncate">
                                    {session.services.map((s) => s.serviceName).join(', ')}
                                  </span>
                                </div>

                                <div className="mt-1.5 pt-1 border-t border-stone-200/60 flex items-center justify-between text-[10px] font-bold">
                                  <span>{session.netTotalEtb.toLocaleString()} ETB</span>
                                  <span className="text-[9px] uppercase px-1 py-0.2 rounded bg-white/60">
                                    {session.status}
                                  </span>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

