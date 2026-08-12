import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import {
  Tv,
  Volume2,
  VolumeX,
  Maximize2,
  Minimize2,
  RefreshCw,
  Scissors,
  Clock,
  Sparkles,
  Building2,
  Users,
  ChevronLeft,
  ChevronRight,
  Layers,
  Megaphone,
  Sun,
  Moon,
  Globe,
  Loader2,
  Wifi,
  WifiOff,
  Phone,
  MapPin,
  Star,
  TrendingUp,
  User,
} from 'lucide-react';
import { Company, Branch, VisitSession, BusinessUnit } from '../types';
import { t, Language } from '../lib/queue-translations';
import { useTheme } from '../lib/theme';

interface QueueDisplayViewProps {
  company: Company;
  branch: Branch;
  visitSessions: VisitSession[];
  businessUnits?: BusinessUnit[];
  onExitTvMode?: () => void;
  onRefresh?: () => Promise<void>;
}

type DepartmentFilter = 'all' | 'hair' | 'spa' | 'nails' | 'mens' | 'womens';

const STATIONS_PER_PAGE = 8;
const POLL_INTERVAL = 10;
const ROTATION_INTERVAL = 8;

const DEPARTMENT_KEYWORDS: Record<string, string[]> = {
  hair: ['hair', 'cut', 'blowdry', 'styling', 'shave', 'beard', 'trim', 'keratin', 'color'],
  spa: ['massage', 'spa', 'hammam', 'steam', 'facial', 'sauna', 'aromatherapy'],
  nails: ['manicure', 'pedicure', 'nail', 'gel', 'acrylic', 'nail art'],
};

const DEMO_STAFF = [
  'Abel Tesfaye', 'Bethlehem Girma', 'Dawit Solomon', 'Marta Haile',
  'Tigist Assefa', 'Sami Kassa', 'Helen Berhe', 'Yonas Tadesse',
  'Kidist Bekele', 'Biniyam Worku', 'Genet Mengistu', 'Ermias Desta',
  'Selamawit Gebre', 'Robel Girma', 'Feven Alemu', 'Kaleb Yohannes',
  'Meseret Kassaye', 'Nathan Hailu', 'Rahel Kebede', 'Surafel Molla',
  'Tsion Wolde', 'Amanuel Fikru', 'Betty Birhanu', 'Daniel Teshome',
  'Eden Mulugeta', 'Fasil Workineh', 'Girimachew Zewde', 'Hanna Million',
  'Iyasu Belay', 'Jemberu Tilahun',
];

const DEMO_SERVICES = [
  { name: 'Executive Haircut & Beard Trim', unit: 'hair', duration: 45, price: 650 },
  { name: 'Royal Moroccan Hammam', unit: 'spa', duration: 60, price: 1200 },
  { name: 'Gel Manicure & Spa Pedicure', unit: 'nails', duration: 50, price: 800 },
  { name: 'Deep Tissue Massage', unit: 'spa', duration: 60, price: 950 },
  { name: 'Signature Blowdry & Styling', unit: 'hair', duration: 35, price: 550 },
  { name: 'Keratin Smoothing Treatment', unit: 'hair', duration: 90, price: 1800 },
  { name: 'Facial Deep Cleanse & Glow', unit: 'spa', duration: 45, price: 700 },
  { name: 'Bridal Hair & Makeup Combo', unit: 'hair', duration: 120, price: 3500 },
  { name: 'Classic Men\'s Haircut', unit: 'hair', duration: 30, price: 400 },
  { name: 'Relaxing Aromatherapy Massage', unit: 'spa', duration: 55, price: 900 },
];

export const QueueDisplayView: React.FC<QueueDisplayViewProps> = ({
  company,
  branch,
  visitSessions,
  businessUnits = [],
  onExitTvMode,
  onRefresh,
}) => {
  const [lang, setLang] = useState<Language>('am');
  const { resolvedTheme, setTheme } = useTheme();
  const [countdown, setCountdown] = useState(POLL_INTERVAL);
  const [lastRefreshedAt, setLastRefreshedAt] = useState(new Date());
  const [audioEnabled, setAudioEnabled] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [departmentFilter, setDepartmentFilter] = useState<DepartmentFilter>('all');
  const [currentPage, setCurrentPage] = useState(0);
  const [autoRotate, setAutoRotate] = useState(true);
  const [announcedIds, setAnnouncedIds] = useState<Set<string>>(new Set());
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [connectionStatus, setConnectionStatus] = useState<'connected' | 'reconnecting' | 'offline'>('connected');
  const containerRef = useRef<HTMLDivElement>(null);

  // Clock update every second
  useEffect(() => {
    const clockTimer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(clockTimer);
  }, []);

  // Filter sessions for this branch
  const branchSessions = useMemo(() => {
    return visitSessions.filter((s) => s.branchId === branch.id);
  }, [visitSessions, branch.id]);

  // Categorize sessions
  const { inProgressSessions, queuedSessions, completedSessions } = useMemo(() => {
    const inProgress = branchSessions.filter((s) => s.status === 'in_progress');
    const queued = branchSessions.filter((s) => s.status === 'queued');
    const completed = branchSessions.filter((s) => s.status === 'completed');
    return { inProgressSessions: inProgress, queuedSessions: queued, completedSessions: completed };
  }, [branchSessions]);

  // Synthesize demo data for display when less than 4 real in-progress sessions
  const activeSessions = useMemo(() => {
    if (inProgressSessions.length >= 4) return inProgressSessions;

    const synthCount = Math.max(12, 28) - inProgressSessions.length;
    const synthSessions: VisitSession[] = Array.from({ length: synthCount }).map((_, idx) => {
      const svc = DEMO_SERVICES[idx % DEMO_SERVICES.length];
      const staffName = DEMO_STAFF[idx % DEMO_STAFF.length];
      return {
        id: `synth_${idx}`,
        companyId: company.id,
        branchId: branch.id,
        businessUnitId: idx % 3 === 0 ? 'bu_mens' : idx % 3 === 1 ? 'bu_womens' : 'bu_spa',
        queueNumber: `Q-${101 + idx}`,
        customerId: `cust_demo_${idx}`,
        customerName: `Guest ${idx + 1}`,
        customerPhone: '+251 91 000 0000',
        services: [{
          id: `synth_svc_${idx}`,
          serviceId: `srv_${svc.unit}`,
          serviceName: svc.name,
          staffId: `stf_${idx}`,
          staffName,
          priceEtb: svc.price,
          durationMinutes: svc.duration,
          commissionEarnedEtb: svc.price * 0.3,
          status: 'in_progress' as const,
        }],
        status: 'in_progress' as const,
        subtotalEtb: svc.price,
        discountEtb: 0,
        taxEtb: 0,
        netTotalEtb: svc.price,
        isPaid: false,
        startedAt: new Date(Date.now() - (idx * 5 + 10) * 60000).toISOString(),
      };
    });
    return [...inProgressSessions, ...synthSessions];
  }, [inProgressSessions, company.id, branch.id]);

  // Synthesize demo queued sessions
  const activeQueuedSessions = useMemo(() => {
    if (queuedSessions.length >= 2) return queuedSessions;

    const synthCount = 8 - queuedSessions.length;
    const synthQueued: VisitSession[] = Array.from({ length: synthCount }).map((_, idx) => {
      const svc = DEMO_SERVICES[(idx + 3) % DEMO_SERVICES.length];
      return {
        id: `synth_q_${idx}`,
        companyId: company.id,
        branchId: branch.id,
        businessUnitId: idx % 2 === 0 ? 'bu_mens' : 'bu_womens',
        queueNumber: `Q-${130 + idx}`,
        customerId: `cust_q_demo_${idx}`,
        customerName: `Waiting Guest ${idx + 1}`,
        customerPhone: '+251 92 000 0000',
        services: [{
          id: `synth_q_svc_${idx}`,
          serviceId: `srv_${svc.unit}`,
          serviceName: svc.name,
          staffId: '',
          staffName: '',
          priceEtb: svc.price,
          durationMinutes: svc.duration,
          commissionEarnedEtb: 0,
          status: 'pending' as const,
        }],
        status: 'queued' as const,
        subtotalEtb: svc.price,
        discountEtb: 0,
        taxEtb: 0,
        netTotalEtb: svc.price,
        isPaid: false,
        startedAt: new Date().toISOString(),
      };
    });
    return [...queuedSessions, ...synthQueued];
  }, [queuedSessions, company.id, branch.id]);

  // Department filtering
  const filteredSessions = useMemo(() => {
    if (departmentFilter === 'all') return activeSessions;
    if (departmentFilter === 'mens') return activeSessions.filter((s) => s.businessUnitId?.includes('mens'));
    if (departmentFilter === 'womens') return activeSessions.filter((s) => s.businessUnitId?.includes('womens'));
    return activeSessions.filter((s) => {
      const svcName = s.services[0]?.serviceName?.toLowerCase() || '';
      return DEPARTMENT_KEYWORDS[departmentFilter]?.some((kw) => svcName.includes(kw));
    });
  }, [activeSessions, departmentFilter]);

  // Pagination
  const totalPages = Math.ceil(filteredSessions.length / STATIONS_PER_PAGE) || 1;
  const paginatedSessions = useMemo(() => {
    const start = currentPage * STATIONS_PER_PAGE;
    return filteredSessions.slice(start, start + STATIONS_PER_PAGE);
  }, [filteredSessions, currentPage]);

  // Upcoming (next 4 after current page)
  const upcomingSessions = useMemo(() => {
    const start = (currentPage + 1) * STATIONS_PER_PAGE;
    return filteredSessions.slice(start, start + 4);
  }, [filteredSessions, currentPage]);

  // Voice synthesis — robust implementation
  const voicesLoadedRef = useRef(false);
  const [voicesReady, setVoicesReady] = useState(false);

  // Wait for browser voices to load
  useEffect(() => {
    if (!('speechSynthesis' in window)) return;
    const loadVoices = () => {
      const voices = window.speechSynthesis.getVoices();
      if (voices.length > 0) {
        voicesLoadedRef.current = true;
        setVoicesReady(true);
      }
    };
    loadVoices();
    window.speechSynthesis.onvoiceschanged = loadVoices;
    return () => { window.speechSynthesis.onvoiceschanged = null; };
  }, []);

  const findBestVoice = useCallback((targetLang: string) => {
    if (!('speechSynthesis' in window)) return null;
    const voices = window.speechSynthesis.getVoices();
    if (voices.length === 0) return null;

    // Try exact match first (e.g. am-ET, en-US)
    const exact = voices.find((v) => v.lang.toLowerCase() === targetLang.toLowerCase());
    if (exact) return exact;

    // Try partial match (e.g. 'am' for Amharic, 'en' for English)
    const partial = voices.find((v) => v.lang.toLowerCase().startsWith(targetLang.split('-')[0].toLowerCase()));
    if (partial) return partial;

    // For Amharic: try any voice with 'ethiop' or 'amharic' in name
    if (targetLang.startsWith('am')) {
      const ethVoice = voices.find((v) =>
        v.name.toLowerCase().includes('ethiop') ||
        v.name.toLowerCase().includes('amharic') ||
        v.lang.toLowerCase().includes('am-')
      );
      if (ethVoice) return ethVoice;
    }

    return null;
  }, []);

  const speakText = useCallback((textEn: string, textAm: string) => {
    if (!audioEnabled || !('speechSynthesis' in window)) return;

    try {
      // Cancel any pending speech
      window.speechSynthesis.cancel();

      const text = lang === 'am' ? textAm : textEn;
      const utterance = new SpeechSynthesisUtterance(text);

      if (lang === 'am') {
        // Try to find Amharic voice
        const amVoice = findBestVoice('am-ET');
        if (amVoice) {
          utterance.voice = amVoice;
          utterance.lang = amVoice.lang;
        } else {
          // Fallback: use English voice but speak the Amharic text
          // This works for phonetic Amharic in most browsers
          utterance.lang = 'am-ET';
        }
        utterance.rate = 0.8;
        utterance.pitch = 1.0;
      } else {
        const enVoice = findBestVoice('en-US');
        if (enVoice) {
          utterance.voice = enVoice;
          utterance.lang = enVoice.lang;
        } else {
          utterance.lang = 'en-US';
        }
        utterance.rate = 0.9;
        utterance.pitch = 1.0;
      }

      // Chrome bug workaround: speech stops after ~15 seconds
      // Split long text into chunks
      const maxChunkLen = 200;
      if (text.length > maxChunkLen) {
        const sentences = text.split(/(?<=[.!?؟])\s+/);
        let idx = 0;
        const speakNext = () => {
          if (idx < sentences.length) {
            const chunk = new SpeechSynthesisUtterance(sentences[idx]);
            chunk.voice = utterance.voice;
            chunk.lang = utterance.lang;
            chunk.rate = utterance.rate;
            chunk.pitch = utterance.pitch;
            chunk.onend = speakNext;
            window.speechSynthesis.speak(chunk);
            idx++;
          }
        };
        speakNext();
      } else {
        window.speechSynthesis.speak(utterance);
      }
    } catch (e) {
      console.warn('Speech synthesis error:', e);
    }
  }, [audioEnabled, lang, findBestVoice]);

  // Announce new sessions
  useEffect(() => {
    if (!voicesReady || paginatedSessions.length === 0) return;
    const top = paginatedSessions[0];
    if (top && !announcedIds.has(top.id)) {
      setAnnouncedIds((prev) => new Set(prev).add(top.id));
      speakText(
        `Attention please. Ticket number ${top.queueNumber}. ${top.customerName}, please proceed to your station.`,
        `ትኩረት ይስጡ። የተራ ቁጥር ${top.queueNumber}። ${top.customerName}፣ እባክዎን ወደ ተመደበሎት የአገልግሎት ቦታ ይቅረቡ።`
      );
    }
  }, [paginatedSessions, announcedIds, speakText, voicesReady]);

  // Announce completed sessions
  const announcedCompletedRef = useRef<Set<string>>(new Set());
  useEffect(() => {
    if (!voicesReady || completedSessions.length === 0) return;
    const latest = completedSessions[completedSessions.length - 1];
    if (latest && !announcedCompletedRef.current.has(latest.id)) {
      announcedCompletedRef.current.add(latest.id);
      speakText(
        `Attention please. Ticket number ${latest.queueNumber}. ${latest.customerName}, your service is complete. Please proceed to the cashier desk.`,
        `ትኩረት ይስጡ። የተራ ቁጥር ${latest.queueNumber}። ${latest.customerName}፣ አገልግሎትዎ ተጠናቋል፤ እባክዎን ወደ ክፍያ ቦታ ይቅረቡ።`
      );
    }
  }, [completedSessions, speakText, voicesReady]);

  // Auto-rotate pages
  useEffect(() => {
    if (!autoRotate || totalPages <= 1) return;
    const timer = setInterval(() => {
      setCurrentPage((prev) => (prev + 1) % totalPages);
    }, ROTATION_INTERVAL * 1000);
    return () => clearInterval(timer);
  }, [autoRotate, totalPages]);

  // Polling countdown
  useEffect(() => {
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          setIsRefreshing(true);
          setLastRefreshedAt(new Date());
          onRefresh?.().finally(() => setIsRefreshing(false));
          setConnectionStatus('connected');
          return POLL_INTERVAL;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [onRefresh]);

  // Fullscreen
  const toggleFullscreen = useCallback(() => {
    if (!document.fullscreenElement) {
      containerRef.current?.requestFullscreen();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  }, []);

  useEffect(() => {
    const handler = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', handler);
    return () => document.removeEventListener('fullscreenchange', handler);
  }, []);

  // Format time helpers
  const formatTime = (date: Date) => date.toLocaleTimeString(lang === 'am' ? 'am-ET' : 'en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  const formatDate = (date: Date) => {
    const days = lang === 'am'
      ? ['እሑድ', 'ሰኞ', 'ማክሰኞ', 'ረቡዕ', 'ሐሙስ', 'አርብ', 'ቅዳሜ']
      : ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const months = lang === 'am'
      ? ['ጃንዋሪ', 'ፌብሩዋሪ', 'ማርች', 'ኤፕሪል', 'ሜይ', 'ጁን', 'ጁላይ', 'ኦገስት', 'ሴፕቴምበር', 'ኦክቶበር', 'ኖቬምበር', 'ዲሴምበር']
      : ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return `${days[date.getDay()]}, ${months[date.getMonth()]} ${date.getDate()}, ${date.getFullYear()}`;
  };

  // Theme colors (semantic shadcn tokens — flip automatically with the global theme)
  const isDark = resolvedTheme === 'dark';
  const colors = {
    bg: 'bg-background',
    surface: 'bg-card',
    surfaceAlt: 'bg-muted',
    border: 'border-border',
    borderAccent: 'border-border',
    text: 'text-foreground',
    textMuted: 'text-muted-foreground',
    textAccent: 'text-primary',
    badgeBg: 'bg-primary/10',
    badgeBorder: 'border-primary/30',
    cardActive: 'bg-card border-primary/40 hover:border-primary',
    cardWaiting: 'bg-card border-border',
    glow: 'shadow-primary/10',
  };

  return (
    <div
      ref={containerRef}
      className={`fixed inset-0 z-50 w-screen h-screen ${colors.bg} ${colors.text} flex flex-col overflow-hidden font-sans`}
    >
      {/* ═══════════ TOP HEADER BAR ═══════════ */}
      <header className={`flex items-center justify-between px-4 md:px-6 lg:px-8 py-3 ${colors.surface} border-b ${colors.border} shrink-0 z-10`}>
        {/* Left: Logo + Branch */}
        <div className="flex items-center gap-3 md:gap-4 min-w-0">
          <div className="w-10 h-10 md:w-12 md:h-12 lg:w-14 lg:h-14 rounded-2xl bg-gradient-to-br from-[#18181b] to-[#111114] flex items-center justify-center text-ink-300 font-serif font-extrabold text-xl md:text-2xl shadow-lg border border-[#2a2a30] shrink-0">
            S
          </div>
          <div className="min-w-0">
            <h1 className="text-base md:text-lg lg:text-xl font-serif font-bold tracking-wide truncate">{company.name}</h1>
            <div className="flex items-center gap-1.5 text-xs md:text-sm">
              <Building2 className="w-3 h-3 md:w-3.5 md:h-3.5 text-ink-400 shrink-0" />
              <span className={colors.textMuted}>{branch.name}</span>
              <span className={colors.textMuted}>·</span>
              <MapPin className="w-3 h-3 text-ink-400 shrink-0" />
              <span className={colors.textMuted}>{branch.city}</span>
            </div>
          </div>
        </div>

        {/* Center: Live Status */}
        <div className="hidden md:flex items-center gap-3">
          <div className={`flex items-center gap-2 px-3 py-1.5 rounded-xl ${colors.surfaceAlt} border ${colors.border} text-xs`}>
            <Users className="w-3.5 h-3.5 text-ink-400" />
            <span className={colors.textMuted}>{t('inProgress', lang)}:</span>
            <strong className="font-mono text-ink-400">{activeSessions.length}</strong>
          </div>
          <div className={`flex items-center gap-2 px-3 py-1.5 rounded-xl ${colors.surfaceAlt} border ${colors.border} text-xs`}>
            <Clock className="w-3.5 h-3.5 text-ink-400" />
            <span className={colors.textMuted}>{t('waiting', lang)}:</span>
            <strong className="font-mono text-ink-400">{activeQueuedSessions.length}</strong>
          </div>
          <div className={`flex items-center gap-2 px-3 py-1.5 rounded-xl ${colors.surfaceAlt} border ${colors.border} text-xs`}>
            {connectionStatus === 'connected' ? (
              <Wifi className="w-3.5 h-3.5 text-ink-400" />
            ) : (
              <WifiOff className="w-3.5 h-3.5 text-red-400" />
            )}
            <span className={colors.textMuted}>{t('liveSync', lang)}</span>
            <strong className="font-mono text-ink-400">{countdown}s</strong>
          </div>
        </div>

        {/* Right: Time + Controls */}
        <div className="flex items-center gap-2 md:gap-3">
          {/* Date & Time */}
          <div className="hidden lg:flex flex-col items-end mr-2">
            <span className="text-xl md:text-2xl font-mono font-bold tracking-wider">{formatTime(currentTime)}</span>
            <span className={`text-[10px] md:text-xs ${colors.textMuted}`}>{formatDate(currentTime)}</span>
          </div>

          {/* Language Toggle */}
          <button
            onClick={() => setLang((p) => (p === 'am' ? 'en' : 'am'))}
            className={`p-2 md:p-2.5 rounded-xl border transition-all cursor-pointer ${colors.surfaceAlt} ${colors.border} hover:border-ink-400`}
            title={t('switchLanguage', lang)}
          >
            <Globe className="w-4 h-4 text-ink-400" />
          </button>

          {/* Theme Toggle */}
          <button
            onClick={() => setTheme(isDark ? 'light' : 'dark')}
            className={`p-2 md:p-2.5 rounded-xl border transition-all cursor-pointer ${colors.surfaceAlt} ${colors.border} hover:border-ink-400`}
            title={isDark ? t('lightMode', lang) : t('darkMode', lang)}
          >
            {isDark ? <Sun className="w-4 h-4 text-ink-400" /> : <Moon className="w-4 h-4 text-ink-400" />}
          </button>

          {/* Audio Toggle */}
          <button
            onClick={() => setAudioEnabled((p) => !p)}
            className={`p-2 md:p-2.5 rounded-xl border transition-all cursor-pointer ${audioEnabled ? 'bg-ink-500/15 border-ink-500/30' : `${colors.surfaceAlt} ${colors.border}`}`}
            title={audioEnabled ? t('voiceOff', lang) : t('voiceOn', lang)}
          >
            {audioEnabled ? <Volume2 className="w-4 h-4 text-ink-400" /> : <VolumeX className="w-4 h-4" />}
          </button>

          {/* Test Voice Button */}
          <button
            onClick={() => {
              speakText(
                'Attention please. Ticket number Q 101. John Doe, please proceed to station 1.',
                'ትኩረት ይስጡ። የተራ ቁጥር Q 101። ዮሐንስ ዓለሙ፣ እባክዎን ወደ ተመደበሎት ቦታ 1 ይቅረቡ።'
              );
            }}
            className="px-2.5 md:px-3 py-2 rounded-xl bg-ink-500/10 hover:bg-ink-500/20 border border-ink-500/30 transition-all cursor-pointer text-ink-400"
            title={t('testVoice', lang)}
          >
            <Volume2 className="w-4 h-4" />
          </button>

          {/* Fullscreen */}
          <button
            onClick={toggleFullscreen}
            className={`p-2 md:p-2.5 rounded-xl border transition-all cursor-pointer ${colors.surfaceAlt} ${colors.border} hover:border-ink-400`}
            title={isFullscreen ? t('exitFullscreen', lang) : t('fullscreen', lang)}
          >
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>

          {/* Exit TV */}
          {onExitTvMode && (
            <button
              onClick={onExitTvMode}
              className={`hidden md:flex px-3 py-2 rounded-xl border text-xs font-bold transition-all cursor-pointer ${colors.surfaceAlt} ${colors.border} hover:border-red-400 hover:text-red-400`}
            >
              {t('exitTvMode', lang)}
            </button>
          )}
        </div>
      </header>

      {/* ═══════════ DEPARTMENT FILTER BAR ═══════════ */}
      <div className={`flex items-center gap-2 px-4 md:px-6 lg:px-8 py-2 ${colors.surface} border-b ${colors.border} shrink-0 overflow-x-auto`}>
        <Layers className="w-3.5 h-3.5 text-ink-400 shrink-0" />
        {[
          { id: 'all' as DepartmentFilter, label: t('allDepartments', lang), count: activeSessions.length },
          { id: 'hair' as DepartmentFilter, label: t('hairStyling', lang) },
          { id: 'spa' as DepartmentFilter, label: t('spaMassage', lang) },
          { id: 'nails' as DepartmentFilter, label: t('nailsBeauty', lang) },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => { setDepartmentFilter(tab.id); setCurrentPage(0); }}
            className={`px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
              departmentFilter === tab.id
                ? 'bg-[#18181b] text-white border border-[#2a2a30]'
                : `${colors.surfaceAlt} ${colors.textMuted} hover:text-ink-400 border border-transparent`
            }`}
          >
            {tab.label}{tab.count !== undefined ? ` (${tab.count})` : ''}
          </button>
        ))}

        {/* Pagination Controls */}
        {totalPages > 1 && (
          <div className="ml-auto flex items-center gap-2">
            <button
              onClick={() => setAutoRotate((p) => !p)}
              className={`px-2 py-1 rounded-lg text-[10px] font-bold cursor-pointer transition-colors border ${
                autoRotate ? 'bg-ink-500/15 text-ink-400 border-ink-500/30' : `${colors.surfaceAlt} ${colors.textMuted} ${colors.border}`
              }`}
            >
              {autoRotate ? `AUTO ${ROTATION_INTERVAL}s` : 'PAUSED'}
            </button>
            <div className={`flex items-center gap-1 ${colors.surfaceAlt} px-2 py-1 rounded-lg border ${colors.border}`}>
              <button onClick={() => setCurrentPage((p) => (p > 0 ? p - 1 : totalPages - 1))} className="p-0.5 cursor-pointer hover:text-ink-400">
                <ChevronLeft className="w-3.5 h-3.5" />
              </button>
              <span className="text-[10px] font-mono text-ink-400 px-1">{currentPage + 1}/{totalPages}</span>
              <button onClick={() => setCurrentPage((p) => (p + 1) % totalPages)} className="p-0.5 cursor-pointer hover:text-ink-400">
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ═══════════ MAIN CONTENT ═══════════ */}
      <main className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-3 md:gap-4 px-4 md:px-6 lg:px-8 py-3 md:py-4 overflow-hidden">

        {/* ─── NOW SERVING GRID (8 cols) ─── */}
        <section className={`lg:col-span-8 ${colors.surface} border-2 ${colors.borderAccent} rounded-2xl md:rounded-3xl p-3 md:p-5 flex flex-col overflow-hidden`}>
          {/* Section Header */}
          <div className={`flex items-center justify-between mb-3 md:mb-4 pb-3 border-b ${colors.border}`}>
            <div className="flex items-center gap-2">
              <div className="relative">
                <Sparkles className="w-5 h-5 text-ink-400" />
                <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-ink-400 rounded-full animate-ping" />
              </div>
              <h2 className="text-base md:text-lg lg:text-xl font-serif font-bold tracking-wide">{t('nowServing', lang)}</h2>
            </div>
            <span className={`px-2.5 py-1 rounded-lg text-[10px] md:text-xs font-mono font-bold ${colors.badgeBg} ${colors.textAccent} border ${colors.badgeBorder}`}>
              {paginatedSessions.length} / {filteredSessions.length} {t('station', lang)}
            </span>
          </div>

          {/* Station Grid */}
          {paginatedSessions.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center py-16">
              <div className={`w-16 h-16 rounded-full ${colors.surfaceAlt} flex items-center justify-center mb-4`}>
                <Clock className="w-8 h-8 text-ink-400 animate-pulse" />
              </div>
              <p className="text-lg font-serif font-bold">{t('noWaitingClients', lang)}</p>
              <p className={`text-sm ${colors.textMuted}`}>{t('readyForWalkIns', lang)}</p>
            </div>
          ) : (
            <div className="flex-1 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 md:gap-3 auto-rows-min overflow-y-auto">
              {paginatedSessions.map((session, idx) => {
                const stationNum = currentPage * STATIONS_PER_PAGE + idx + 1;
                const primaryService = session.services[0]?.serviceName || 'Service';
                const staffName = session.services[0]?.staffName || 'Staff';
                const elapsed = session.startedAt ? Math.floor((Date.now() - new Date(session.startedAt).getTime()) / 60000) : 0;

                return (
                  <div
                    key={session.id}
                    className={`relative rounded-xl md:rounded-2xl p-2.5 md:p-4 border transition-all group overflow-hidden ${
                      idx === 0
                        ? `${colors.cardActive} shadow-lg ${colors.glow} ring-1 ring-ink-500/20`
                        : `${colors.cardWaiting} hover:border-ink-500/30`
                    }`}
                  >
                    {/* Active Indicator */}
                    {idx === 0 && (
                      <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-ink-400 to-transparent animate-pulse" />
                    )}

                    {/* Station Badge */}
                    <div className="flex items-center justify-between mb-1.5 md:mb-2">
                      <span className={`text-[9px] md:text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-md ${
                        idx === 0 ? 'bg-ink-500/20 text-ink-300 border border-ink-500/30' : `${colors.surfaceAlt} ${colors.textMuted} border ${colors.border}`
                      }`}>
                        {t('station', lang)} #{stationNum}
                      </span>
                      <span className={`w-1.5 h-1.5 md:w-2 md:h-2 rounded-full ${
                        idx === 0 ? 'bg-ink-400 animate-ping' : 'bg-ink-400/60'
                      }`} />
                    </div>

                    {/* Queue Number - Large */}
                    <div className={`text-2xl sm:text-3xl md:text-4xl font-mono font-extrabold text-center py-1 md:py-2 tracking-wider ${
                      idx === 0 ? 'text-ink-200' : colors.text
                    }`}>
                      {session.queueNumber}
                    </div>

                    {/* Service */}
                    <div className={`text-[10px] md:text-xs text-center font-medium truncate ${colors.textMuted}`}>
                      {primaryService}
                    </div>

                    {/* Staff */}
                    <div className="flex items-center justify-center gap-1 mt-1">
                      <User className="w-2.5 h-2.5 md:w-3 md:h-3 text-ink-400 shrink-0" />
                      <span className="text-[9px] md:text-[10px] text-ink-400 font-bold truncate">{staffName}</span>
                    </div>

                    {/* Elapsed Time */}
                    <div className={`text-[8px] md:text-[9px] text-center mt-1 ${colors.textMuted}`}>
                      {elapsed > 0 ? `${elapsed}m` : '•'}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Bottom Ticker */}
          <div className={`mt-3 pt-3 border-t ${colors.border} flex items-center justify-between text-[10px] md:text-xs ${colors.textMuted}`}>
            <div className="flex items-center gap-2">
              <Megaphone className="w-3 h-3 md:w-3.5 md:h-3.5 text-ink-400 shrink-0" />
              <span>{t('approachingStation', lang)}</span>
            </div>
            <span className="font-mono text-ink-400 font-bold">
              {filteredSessions.length} {t('station', lang)}
            </span>
          </div>
        </section>

        {/* ─── RIGHT SIDEBAR: WAITING + UPCOMING ─── */}
        <aside className="lg:col-span-4 flex flex-col gap-3 md:gap-4 overflow-hidden">

          {/* WAITING QUEUE */}
          <div className={`flex-1 ${colors.surface} border ${colors.border} rounded-2xl md:rounded-3xl p-3 md:p-5 flex flex-col overflow-hidden`}>
            <div className={`flex items-center justify-between mb-3 pb-2 border-b ${colors.border}`}>
              <div>
                <h3 className="text-sm md:text-base font-serif font-bold tracking-wide">{t('nextInQueue', lang)}</h3>
                <p className={`text-[10px] md:text-xs ${colors.textMuted}`}>{t('waitingLounge', lang)}</p>
              </div>
              <span className="text-base md:text-lg font-mono font-bold text-ink-400 bg-ink-400/10 px-2.5 py-1 rounded-xl border border-ink-400/20">
                {activeQueuedSessions.length}
              </span>
            </div>

            {activeQueuedSessions.length === 0 ? (
              <div className="flex-1 flex items-center justify-center">
                <div className="text-center">
                  <div className={`w-12 h-12 rounded-full ${colors.surfaceAlt} flex items-center justify-center mx-auto mb-2`}>
                    <Sparkles className="w-5 h-5 text-ink-400" />
                  </div>
                  <p className={`text-xs ${colors.textMuted}`}>{t('noWaitingClients', lang)}</p>
                </div>
              </div>
            ) : (
              <div className="flex-1 space-y-1.5 overflow-y-auto">
                {activeQueuedSessions.slice(0, 10).map((session, idx) => {
                  const svc = session.services[0];
                  const estWait = (idx + 1) * (svc?.durationMinutes || 30);
                  return (
                    <div
                      key={session.id}
                      className={`rounded-xl p-2.5 md:p-3 flex items-center justify-between border transition-colors ${
                        idx === 0 ? `${colors.cardActive} ring-1 ring-ink-500/10` : colors.cardWaiting
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className={`w-7 h-7 md:w-8 md:h-8 rounded-lg flex items-center justify-center text-[10px] md:text-xs font-mono font-bold shrink-0 ${
                          idx === 0 ? 'bg-ink-500/20 text-ink-300 border border-ink-500/30' : `${colors.surfaceAlt} ${colors.textMuted} border ${colors.border}`
                        }`}>
                          #{idx + 1}
                        </div>
                        <div className="min-w-0">
                          <div className={`text-sm md:text-base font-mono font-bold ${idx === 0 ? 'text-ink-300' : ''}`}>
                            {session.queueNumber}
                          </div>
                          <div className={`text-[10px] md:text-xs truncate ${colors.textMuted}`}>{session.customerName}</div>
                        </div>
                      </div>
                      <div className="text-right shrink-0 ml-2">
                        <div className={`text-[9px] md:text-[10px] truncate max-w-[80px] ${colors.textMuted}`}>
                          {svc?.serviceName || 'General'}
                        </div>
                        <div className="text-[9px] md:text-[10px] text-ink-400 font-mono font-bold">
                          ~{estWait}m
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* UPCOMING / RECENTLY COMPLETED */}
          <div className={`${colors.surface} border ${colors.border} rounded-2xl md:rounded-3xl p-3 md:p-5 shrink-0`}>
            <div className={`flex items-center justify-between mb-2 pb-2 border-b ${colors.border}`}>
              <h3 className="text-xs md:text-sm font-serif font-bold tracking-wide">{t('upcomingCustomers', lang)}</h3>
              <TrendingUp className="w-3.5 h-3.5 text-ink-400" />
            </div>
            {upcomingSessions.length === 0 ? (
              <p className={`text-[10px] md:text-xs ${colors.textMuted} text-center py-3`}>—</p>
            ) : (
              <div className="flex gap-1.5 md:gap-2">
                {upcomingSessions.map((s) => (
                  <div key={s.id} className={`flex-1 rounded-lg p-1.5 md:p-2 text-center border ${colors.cardWaiting}`}>
                    <div className="text-xs md:text-sm font-mono font-bold text-ink-400">{s.queueNumber}</div>
                    <div className={`text-[8px] md:text-[9px] truncate ${colors.textMuted}`}>{s.customerName}</div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* RECENTLY COMPLETED */}
          {completedSessions.length > 0 && (
            <div className={`${colors.surface} border ${colors.border} rounded-2xl md:rounded-3xl p-3 md:p-5 shrink-0`}>
              <div className={`flex items-center justify-between mb-2 pb-2 border-b ${colors.border}`}>
                <h3 className="text-xs md:text-sm font-serif font-bold tracking-wide">{t('recentCompleted', lang)}</h3>
                <Star className="w-3.5 h-3.5 text-ink-400" />
              </div>
              <div className="flex gap-1.5 md:gap-2 flex-wrap">
                {completedSessions.slice(-4).map((s) => (
                  <div key={s.id} className="rounded-lg px-2 py-1 text-center border border-ink-500/20 bg-ink-500/5">
                    <div className="text-xs font-mono font-bold text-ink-400">{s.queueNumber}</div>
                    <div className={`text-[8px] ${colors.textMuted}`}>{s.customerName}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </aside>
      </main>

      {/* ═══════════ BOTTOM FOOTER BAR ═══════════ */}
      <footer className={`px-4 md:px-6 lg:px-8 py-2 ${colors.surface} border-t ${colors.border} flex items-center justify-between shrink-0 z-10`}>
        <div className="flex items-center gap-2 text-[10px] md:text-xs">
          <span className={`w-1.5 h-1.5 md:w-2 md:h-2 rounded-full ${connectionStatus === 'connected' ? 'bg-ink-500 animate-ping' : 'bg-red-500'}`} />
          <span className={colors.textMuted}>{t('poweredBy', lang)} Gech Beauty Salon ERP</span>
        </div>
        <div className={`text-[9px] md:text-[10px] ${colors.textMuted} hidden sm:block`}>
          {t('refreshments', lang)}
        </div>
        <div className="flex items-center gap-2 text-[10px] md:text-xs">
          <RefreshCw className={`w-3 h-3 ${isRefreshing ? 'animate-spin text-ink-400' : colors.textMuted}`} />
          <span className={`font-mono ${colors.textMuted}`}>{countdown}s</span>
        </div>
      </footer>
    </div>
  );
};

export default QueueDisplayView;
