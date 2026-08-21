import React, { useState, useEffect } from 'react';
import { Sun, Moon, Menu, X, ArrowRight, Phone, MapPin, Clock, Instagram, Facebook, Twitter } from 'lucide-react';
import { Company, Branch, Service, Staff, VisitSession } from '../types';
import { wt, WebsiteLanguage } from '../lib/website-translations';

interface CustomerWebsiteViewProps {
  company: Company | null;
  branch: Branch | null;
  services: Service[];
  staffList: Staff[];
  onOpenBooking: (serviceId?: string) => void;
  onLaunchStaffErp: () => void;
  theme: 'dark' | 'light';
  setTheme: (t: 'dark' | 'light') => void;
}

export function CustomerWebsiteView({
  company,
  branch,
  services,
  staffList,
  onOpenBooking,
  onLaunchStaffErp,
  theme,
  setTheme,
}: CustomerWebsiteViewProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [lang, setLang] = useState<WebsiteLanguage>(() => {
    try {
      const saved = localStorage.getItem('sserp_site_lang');
      return saved === 'am' || saved === 'en' ? saved : 'en';
    } catch {
      return 'en';
    }
  });

  const isDark = theme === 'dark';
  const tr = (key: Parameters<typeof wt>[0], vars?: Record<string, string | number>) => wt(key, lang, vars);

  const switchLang = () => {
    const next = lang === 'en' ? 'am' : 'en';
    setLang(next);
    try {
      localStorage.setItem('sserp_site_lang', next);
    } catch {
      /* ignore */
    }
  };

  const amFontStyle: React.CSSProperties | undefined =
    lang === 'am'
      ? ({
          '--font-sans': "'Menbere', 'Plus Jakarta Sans', sans-serif",
          '--font-display': "'Menbere', 'Plus Jakarta Sans', sans-serif",
        } as React.CSSProperties)
      : undefined;

  // Barbershop Services fallback list if db services are filtered
  const defaultServices = [
    { id: 'srv_m_haircut', name: 'Classic haircut', category: 'Haircut', priceEtb: 400, usd: 50, desc: 'Precision scissor cut & styled finish' },
    { id: 'srv_m_fade', name: 'Fade', category: 'Haircut', priceEtb: 500, usd: 60, desc: 'Skin fade, drop fade or taper with razor line' },
    { id: 'srv_f_color', name: 'Dyeing + haircut', category: 'Coloring', priceEtb: 1500, usd: 150, desc: 'Beard or hair coloring with organic treatment' },
    { id: 'srv_m_beard', name: 'Beard', category: 'Grooming', priceEtb: 300, usd: 30, subPrice: 'Short 200 ETB / Long 300 ETB', desc: 'Beard shaping & organic oil massage' },
    { id: 'srv_m_beard_style', name: 'Beard Styling', category: 'Grooming', priceEtb: 200, usd: 20, subPrice: '100 - 200 ETB', desc: 'Hot comb blowdry & crisp line contouring' },
    { id: 'srv_m_trim', name: 'Beard Trim', category: 'Grooming', priceEtb: 150, usd: 15, desc: 'Clipper trim & neck shave' },
  ];

  const activeServicesList = services.length > 0 ? services : (defaultServices as any);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // Theme style mappings (ink charcoal + pure white + brass)
  const pageBg = isDark ? 'bg-[#09090b] text-[#f1eee4]' : 'bg-white text-zinc-900';
  const textMuted = isDark ? 'text-[#9a9aa5]' : 'text-zinc-600';
  const divider = isDark ? 'border-[#26262b]' : 'border-zinc-200';
  const accentText = isDark ? 'text-brass-400' : 'text-brass-600';
  const accentHover = isDark ? 'hover:text-brass-400' : 'hover:text-brass-600';
  const kicker = `text-[11px] font-sans font-semibold tracking-[0.28em] uppercase ${accentText}`;

  const shortName = (company?.name || 'Gech Barbershop').split(' ')[0];

  const navLinks = [
    { label: tr('home'), href: '#home' },
    { label: tr('services'), href: '#services' },
    { label: tr('gallery'), href: '#gallery' },
    { label: tr('contact'), href: '#contact' },
  ];

  const featuredServices = activeServicesList.slice(0, 4);

  const serviceImgs = [
    'https://images.unsplash.com/photo-1599351431202-1e0f0137899a?auto=format&fit=crop&w=800&q=80',
    'https://images.unsplash.com/photo-1517832606299-7ae9b720a186?auto=format&fit=crop&w=800&q=80',
    'https://images.unsplash.com/photo-1503951914875-452162b0f3f1?auto=format&fit=crop&w=800&q=80',
    'https://images.unsplash.com/photo-1585747860715-2ba37e788b70?auto=format&fit=crop&w=800&q=80',
  ];

  const gallery = [
    { src: 'https://images.unsplash.com/photo-1621605815971-fbc98d665033?auto=format&fit=crop&w=900&q=80', titleKey: 'gShave' as const, ratio: '3 / 4' },
    { src: 'https://images.unsplash.com/photo-1605497788044-5a32c7078486?auto=format&fit=crop&w=900&q=80', titleKey: 'gSkinFade' as const, ratio: '1 / 1' },
    { src: 'https://images.unsplash.com/photo-1599351431202-1e0f0137899a?auto=format&fit=crop&w=900&q=80', titleKey: 'gCut' as const, ratio: '4 / 5' },
    { src: 'https://images.unsplash.com/photo-1622286342621-4bd786c2447c?auto=format&fit=crop&w=900&q=80', titleKey: 'gTools' as const, ratio: '3 / 4' },
    { src: 'https://images.unsplash.com/photo-1503951914875-452162b0f3f1?auto=format&fit=crop&w=900&q=80', titleKey: 'gRitual' as const, ratio: '1 / 1' },
    { src: 'https://images.unsplash.com/photo-1585747860715-2ba37e788b70?auto=format&fit=crop&w=900&q=80', titleKey: 'gShop' as const, ratio: '4 / 5' },
  ];

  const navLinkClass = `group relative py-1 transition-colors hover:text-brass-400 font-sans font-medium text-[11px] tracking-[0.22em] uppercase`;
  const navLinkBar = `absolute bottom-0 left-0 h-0.5 w-0 transition-all duration-300 group-hover:w-full bg-brass-500 rounded-full`;

  return (
    <div className={`min-h-screen font-sans antialiased selection:bg-ink-800 selection:text-cream-100 transition-colors duration-300 ${pageBg}`} style={amFontStyle}>

      {/* TOP HEADER & NAVBAR — glassmorphism header with translucent blur on hero, adaptive on scroll */}
      <header className={`sticky top-0 z-50 transition-all duration-300 ${
        !scrolled
          ? 'bg-[#09090b]/70 text-white border-b border-white/10'
          : isDark
            ? 'bg-[#09090b]/95 text-cream-100 border-b border-[#18181b]'
            : 'bg-white/95 text-zinc-900 border-b border-zinc-200'
      }`}>
        <div className="max-w-[1400px] mx-auto px-4 sm:px-8 lg:px-10">
          <div className="flex items-center justify-between h-16 lg:h-20">
            
            {/* Left: Brand Emblem & Title */}
            <a href="#home" className="flex items-center gap-3 group shrink-0">
              <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-md bg-brass-500 flex items-center justify-center text-[#09090b] font-display font-bold text-sm sm:text-base">
                G
              </div>
              <div className="flex flex-col text-left">
                <span className={`font-display font-bold text-base sm:text-lg tracking-wider uppercase leading-none transition-colors ${
                  !scrolled || isDark ? 'text-white group-hover:text-brass-300' : 'text-zinc-900 group-hover:text-brass-600'
                }`}>
                  {shortName}
                </span>
                <span className="text-[8px] font-sans font-semibold tracking-[0.25em] text-brass-500 uppercase mt-0.5">
                  Barbershop · Hawassa
                </span>
              </div>
            </a>

            {/* Center: Navigation Links (desktop) */}
            <nav className="hidden lg:flex items-center gap-10">
              {navLinks.map((l) => (
                <a key={l.label} href={l.href} className={navLinkClass}>
                  {l.label}
                  <span className={navLinkBar} />
                </a>
              ))}
            </nav>

            {/* Right: Actions & Controls */}
            <div className="hidden lg:flex items-center gap-5">
              <button
                onClick={switchLang}
                className={`px-3 py-1 rounded-full text-[10px] font-sans font-bold tracking-[0.15em] border transition-all ${
                  !scrolled || isDark
                    ? 'border-white/20 text-white/90 hover:text-brass-300 hover:border-brass-400/60 bg-white/5'
                    : 'border-zinc-300 text-zinc-800 hover:text-brass-600 hover:border-brass-600 bg-zinc-50'
                }`}
                title="English / አማርኛ"
              >
                {lang === 'en' ? 'AM' : 'EN'}
              </button>

              <button
                onClick={() => setTheme(isDark ? 'light' : 'dark')}
                className={`p-2 rounded-full transition-colors ${
                  !scrolled || isDark ? 'text-white/80 hover:text-brass-300 hover:bg-white/10' : 'text-zinc-700 hover:text-brass-600 hover:bg-zinc-100'
                }`}
                title="Toggle Dark/Light Mode"
              >
                {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
              </button>

              <button
                onClick={() => onOpenBooking()}
                className="bg-brass-500 hover:bg-brass-400 text-ink-950 font-sans font-bold text-[11px] tracking-[0.16em] uppercase px-5 py-2 rounded-full transition-colors"
              >
                {tr('bookOnline')}
              </button>
            </div>

            {/* Mobile Controls */}
            <div className="lg:hidden flex items-center gap-2">
              <button
                onClick={switchLang}
                className={`px-2.5 py-1 rounded-full text-[10px] font-sans font-bold tracking-[0.12em] border transition-colors ${
                  !scrolled || isDark ? 'border-white/30 text-white bg-white/10' : 'border-zinc-300 text-zinc-900 bg-zinc-50'
                }`}
              >
                {lang === 'en' ? 'AM' : 'EN'}
              </button>

              <button
                onClick={() => setTheme(isDark ? 'light' : 'dark')}
                className={`p-2 transition-colors ${!scrolled || isDark ? 'text-white' : 'text-zinc-800'}`}
              >
                {isDark ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
              </button>

              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className={`p-2 transition-colors ${!scrolled || isDark ? 'text-white' : 'text-zinc-800'}`}
              >
                {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </button>
            </div>

          </div>
        </div>

        {/* Mobile Navigation Drawer */}
        {mobileMenuOpen && (
          <div className={`lg:hidden border-t px-6 py-6 space-y-4 font-sans text-xs tracking-[0.18em] uppercase ${
            isDark ? 'border-[#18181b] bg-[#09090b]/98 text-cream-100' : 'border-zinc-200 bg-white/98 text-zinc-900'
          }`}>
            {navLinks.map((l, i) => (
              <a
                key={i}
                href={l.href}
                onClick={() => setMobileMenuOpen(false)}
                className="block py-2 font-medium hover:text-brass-500 transition-colors"
              >
                {l.label}
              </a>
            ))}
            <div className={`pt-4 border-t space-y-3.5 ${isDark ? 'border-[#18181b]' : 'border-zinc-200'}`}>
              <button
                onClick={() => { setMobileMenuOpen(false); onOpenBooking(); }}
                className="w-full text-center py-3 bg-brass-500 text-ink-950 font-bold rounded-md tracking-wider"
              >
                {tr('bookOnline')} →
              </button>
              <button
                onClick={() => { setMobileMenuOpen(false); onLaunchStaffErp(); }}
                className="block w-full text-center font-bold text-brass-500 text-[10px] tracking-[0.2em]"
              >
                {tr('launchErp')}
              </button>
            </div>
          </div>
        )}
      </header>

      {/* HERO — single panel: photo + blended Hawassa map */}
      <section id="home" className="relative min-h-screen overflow-hidden">
        <img
          src="/home.png"
          alt={company?.name || 'Gech Barbershop'}
          className="absolute inset-0 w-full h-full object-cover object-center"
        />
        {/* Dark dramatic overlay over hero photo (no white shade fog) */}
        <div className="absolute inset-0 bg-gradient-to-t from-[#09090b] via-[#09090b]/60 to-[#09090b]/30" />
        <div className="absolute inset-x-0 top-0 h-28 bg-gradient-to-b from-[#09090b]/70 to-transparent" />
        <img
          src="/hawassa-map-transparent.png"
          alt="Map of Hawassa showing the shop location"
          className="absolute right-0 bottom-0 lg:bottom-auto lg:top-[-20%] h-2/3 lg:h-[116%] w-auto object-contain opacity-60 lg:opacity-80"
        />

        <div className="relative z-10 px-6 sm:px-10 lg:px-14 pt-40 pb-8 sm:py-20 lg:py-28 w-full min-h-[100svh] sm:min-h-screen flex">
          <div className="max-w-xl w-full flex flex-col sm:justify-end">
            <div className="space-y-5 sm:space-y-7">
              <span className="inline-flex items-center gap-3 text-[11px] font-semibold tracking-[0.3em] uppercase text-brass-300">
                <span className="w-8 h-px bg-current" />
                {tr('estSince')}
              </span>

              <h1 className="font-display text-[clamp(2.5rem,12vw,3.75rem)] sm:text-5xl lg:text-7xl font-semibold tracking-tight leading-[1.02] text-white">
                {tr('precisionCuts')}
                <br />
                {tr('classicService')}
              </h1>

              <p className="hidden lg:block max-w-lg font-sans text-sm sm:text-base leading-relaxed text-white/80">
                {tr('heroDesc')}
              </p>
            </div>

            <div className="mt-10 sm:mt-7 flex flex-col items-start gap-4 sm:flex-row sm:items-center sm:gap-3">
              <button
                onClick={() => onOpenBooking()}
                className="group inline-flex items-center justify-center gap-2 w-full max-w-[280px] px-6 py-3.5 sm:w-auto sm:px-7 sm:py-4 bg-brass-500 text-ink-950 font-sans font-bold text-[11px] sm:text-xs tracking-[0.16em] uppercase transition-all hover:bg-brass-400"
              >
                {tr('bookAppointment')}
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </button>
              <a
                href="#services"
                className="inline-flex items-center justify-center gap-2 w-auto px-6 py-3.5 sm:px-7 sm:py-4 border border-white/40 text-white hover:border-white hover:bg-white/10 font-sans font-semibold text-[11px] sm:text-xs tracking-[0.16em] uppercase transition-all"
              >
                {tr('ourServices')}
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* 01 — SERVICES: editorial cards (Mobile: graceful rounded swipe slider, Desktop: grid) */}
      <section id="services" className={`py-10 lg:py-14 px-4 sm:px-8 lg:px-10 border-t ${divider}`}>
        <div className="max-w-[1400px] mx-auto">
          <div className="flex flex-col md:flex-row items-start md:items-end justify-between gap-6 mb-6 sm:mb-8">
            <div>
              <span className={`${kicker} block mb-3`}>{tr('servicesKicker')}</span>
              <h2 className="font-display text-4xl sm:text-5xl lg:text-6xl font-medium uppercase tracking-tight leading-[1.02]">
                {tr('servicesTitle')}
              </h2>
            </div>
            <div className="flex flex-col items-start sm:items-end gap-2">
              <p className={`max-w-xs font-sans text-xs sm:text-sm ${textMuted}`}>
                {tr('servicesDesc')}
              </p>
              {/* Swipe hint indicator for mobile */}
              <span className="sm:hidden text-[10px] font-sans uppercase tracking-[0.2em] text-brass-600 font-bold flex items-center gap-1.5 mt-1">
                ‹ Swipe services ›
              </span>
            </div>
          </div>

          <div className="flex sm:grid sm:grid-cols-2 lg:grid-cols-4 gap-5 overflow-x-auto sm:overflow-x-visible pb-4 sm:pb-0 snap-x snap-mandatory scrollbar-none -mx-4 px-4 sm:mx-0 sm:px-0">
            {featuredServices.map((srv: any, i: number) => (
              <button
                key={srv.id}
                onClick={() => onOpenBooking(srv.id)}
                className={`group relative text-left overflow-hidden shrink-0 w-[82vw] max-w-[310px] sm:w-auto snap-center rounded-md transition-all duration-300 hover:-translate-y-1 ${
                  isDark ? 'bg-ink-900 border border-[#26262b]' : 'bg-zinc-900 border border-zinc-200/80'
                }`}
              >
                <div className="aspect-[3/4] overflow-hidden rounded-md">
                  <img
                    src={serviceImgs[i % serviceImgs.length]}
                    alt={srv.name}
                    className="w-full h-full object-cover transition-transform duration-700"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#09090b]/95 via-[#09090b]/40 to-transparent" />
                </div>
                <div className="absolute inset-x-0 bottom-0 p-6">
                  <span className="inline-block text-[10px] font-mono text-brass-300 bg-brass-500/20 border border-brass-500/30 px-2 py-0.5 rounded-full">0{i + 1}</span>
                  <h3 className="font-display text-2xl font-medium uppercase tracking-wide text-white mt-2">
                    {srv.name}
                  </h3>
                  <p className="text-xs text-white/70 mt-2 leading-relaxed line-clamp-2">{srv.desc}</p>
                  <div className="mt-5 flex items-center justify-between">
                    <span className="text-sm font-sans font-semibold text-brass-300">{srv.priceEtb} ETB</span>
                    <span className="inline-flex items-center gap-1.5 text-[10px] font-sans uppercase tracking-[0.2em] text-white/90 group-hover:text-brass-300 transition-colors">
                      {tr('book')} <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                    </span>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* 02 — GALLERY */}
      <section id="gallery" className={`py-10 lg:py-14 px-4 sm:px-8 lg:px-10 border-t ${divider}`}>
        <div className="max-w-[1400px] mx-auto">
          <div className="flex flex-col md:flex-row items-start md:items-end justify-between gap-6 mb-6 sm:mb-8">
            <div>
              <span className={`${kicker} block mb-3`}>{tr('galleryKicker')}</span>
              <h2 className="font-display text-4xl sm:text-5xl lg:text-6xl font-medium uppercase tracking-tight leading-[1.02]">
                {tr('galleryTitle')}
              </h2>
            </div>
            <p className={`max-w-xs font-sans text-xs sm:text-sm ${textMuted}`}>
              {tr('galleryDesc')}
            </p>
          </div>

          <div className="columns-2 md:columns-3 gap-4 [&>*]:mb-4">
            {gallery.map((g, i) => (
              <figure key={i} className="group relative overflow-hidden rounded-md break-inside-avoid cursor-pointer">
                <img
                  src={g.src}
                  alt={tr(g.titleKey)}
                  className="w-full object-cover transition-transform duration-700 rounded-md"
                  style={{ aspectRatio: g.ratio }}
                />
                <figcaption className="absolute inset-0 flex items-end p-5 bg-gradient-to-t from-[#09090b]/80 via-[#09090b]/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 rounded-md">
                  <span className="text-[10px] font-sans uppercase tracking-[0.25em] text-cream-100">{tr(g.titleKey)}</span>
                </figcaption>
              </figure>
            ))}
          </div>
        </div>
      </section>

      {/* 03 — LOCATION / CONTACT */}
      <section id="contact" className={`py-10 lg:py-14 px-4 sm:px-8 lg:px-10 border-t ${divider}`}>
        <div className="max-w-[1400px] mx-auto grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-20">
          <div className={`relative min-h-[380px] lg:min-h-[520px] border overflow-hidden ${
            isDark ? 'border-brass-500/25 bg-[#111113]' : 'border-zinc-300 bg-zinc-100'
          }`}>
            <img
              src="/hawassa-map-transparent.png"
              alt="Map of Hawassa showing the shop location"
              className={`absolute inset-0 w-full h-full object-contain p-4 ${isDark ? 'opacity-90' : 'opacity-70 mix-blend-multiply'}`}
            />
            <div className={`absolute inset-4 border pointer-events-none ${isDark ? 'border-brass-500/20' : 'border-zinc-300'}`} />
            <div className={`absolute left-6 bottom-6 px-5 py-3 border ${
              isDark ? 'bg-[#09090b]/90 border-brass-500/30' : 'bg-white/95 border-zinc-300'
            }`}>
              <div className="text-[10px] font-sans uppercase tracking-[0.25em] text-brass-600 font-semibold">Gech Barbershop</div>
              <div className={`text-xs mt-1 ${isDark ? 'text-cream-100/70' : 'text-zinc-700'}`}>Piassa · Hawassa, Ethiopia</div>
            </div>
          </div>

          <div className="lg:pl-6 space-y-10">
            <div className="space-y-4">
              <span className={`${kicker} block`}>{tr('contactKicker')}</span>
              <h2 className="font-display text-5xl sm:text-6xl font-medium uppercase tracking-tight leading-[1.02]">
                {tr('contactTitle1')}
                <br />
                {tr('contactTitle2')}
              </h2>
            </div>

            <div className={`space-y-6 text-sm font-sans ${isDark ? 'text-cream-100/80' : 'text-zinc-800'}`}>
              <p className="flex items-start gap-4">
                <MapPin className={`w-4 h-4 mt-0.5 shrink-0 ${isDark ? 'text-brass-400' : 'text-brass-600'}`} />
                {tr('address')}
                <br />
                {tr('city')}
              </p>
              <p className="flex items-start gap-4">
                <Phone className={`w-4 h-4 mt-0.5 shrink-0 ${isDark ? 'text-brass-400' : 'text-brass-600'}`} />
                +251 91 456 7891
              </p>
              <p className="flex items-start gap-4">
                <Clock className={`w-4 h-4 mt-0.5 shrink-0 ${isDark ? 'text-brass-400' : 'text-brass-600'}`} />
                {tr('hours')}
              </p>
            </div>

            <a
              href="https://maps.google.com/?q=Hawassa"
              target="_blank"
              rel="noreferrer"
              className={`inline-flex items-center gap-2 text-xs font-sans font-bold tracking-[0.2em] uppercase transition-all ${accentText} ${accentHover}`}
            >
              {tr('directions')}
              <ArrowRight className="w-4 h-4" />
            </a>
          </div>
        </div>
      </section>

      {/* FOOTER — adapts cleanly to light and dark theme */}
      <footer className={`pt-16 pb-10 px-4 sm:px-8 lg:px-10 border-t transition-colors ${
        isDark ? 'bg-[#09090b] text-cream-100 border-[#18181b]' : 'bg-white text-zinc-900 border-zinc-200'
      }`}>
        <div className="max-w-[1400px] mx-auto">
          <div className="flex flex-col md:flex-row items-center justify-between gap-10">
            <a href="#home" className="flex items-baseline gap-2">
              <span className={`font-display text-xl font-semibold uppercase tracking-wide ${isDark ? 'text-cream-50' : 'text-zinc-900'}`}>{shortName}</span>
              <span className="text-[10px] font-sans tracking-[0.22em] uppercase text-brass-500">{tr('footerEst')}</span>
            </a>

            <nav className={`flex flex-wrap items-center justify-center gap-x-8 gap-y-3 text-[11px] font-sans font-medium tracking-[0.2em] uppercase ${
              isDark ? 'text-cream-100/70' : 'text-zinc-700'
            }`}>
              <a href="#home" className="hover:text-brass-500 transition-colors">{tr('home')}</a>
              <a href="#services" className="hover:text-brass-500 transition-colors">{tr('services')}</a>
              <a href="#gallery" className="hover:text-brass-500 transition-colors">{tr('gallery')}</a>
              <button onClick={() => onOpenBooking()} className="hover:text-brass-500 transition-colors">{tr('booking')}</button>
              <a href="#contact" className="hover:text-brass-500 transition-colors">{tr('contact')}</a>
            </nav>

            <div className="flex items-center gap-4">
              {[Instagram, Facebook, Twitter].map((Icon, i) => (
                <a
                  key={i}
                  href="#"
                  className={`p-2.5 border transition-colors ${
                    isDark ? 'border-[#26262b] text-cream-100/70 hover:text-brass-400 hover:border-brass-500/50' : 'border-zinc-300 text-zinc-700 hover:text-brass-600 hover:border-brass-600'
                  }`}
                  aria-label="Social media"
                >
                  <Icon className="w-4 h-4" />
                </a>
              ))}
            </div>
          </div>

          <div className={`mt-12 pt-6 border-t flex flex-col sm:flex-row items-center justify-between gap-4 text-[11px] font-sans ${
            isDark ? 'border-[#18181b] text-cream-100/40' : 'border-zinc-200 text-zinc-500'
          }`}>
            <span>{tr('rights', { name: company?.name || 'Gech Barbershop' })}</span>
            <div className="flex items-center gap-6">
              <button onClick={onLaunchStaffErp} className="hover:text-brass-500 transition-colors">{tr('footerErp')}</button>
            </div>
          </div>
        </div>
      </footer>

    </div>
  );
}
