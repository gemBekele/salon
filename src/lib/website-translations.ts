export type WebsiteLanguage = 'en' | 'am';

const websiteTranslations = {
  en: {
    // Nav
    home: 'Home',
    services: 'Services',
    gallery: 'Gallery',
    booking: 'Booking',
    contact: 'Contact',
    signIn: 'Sign In',
    bookOnline: 'Book Online Appointment',
    customerSignIn: 'Customer Account Sign In',
    launchErp: 'Launch Staff & POS ERP',

    // Hero
    estSince: 'Est. 2011 • Hawassa',
    precisionCuts: 'Precision cuts.',
    classicService: 'Classic service.',
    heroDesc: 'Skin fades, hot towel shaves, and beard sculpting from Hawassa&apos;s most trusted barbers. Walk in a client — leave a legend.',
    bookAppointment: 'Book Appointment',
    ourServices: 'Our Services',

    // Services
    servicesKicker: '01 — Services',
    servicesTitle: 'The craft.',
    servicesDesc: 'Every service is performed by a master barber with a hot towel finish, straight-razor line-up and premium grooming products.',
    book: 'Book',

    // Gallery
    galleryKicker: '02 — Gallery',
    galleryTitle: 'The work.',
    galleryDesc: 'Sharp lines, clean finishes and the tools behind them — a look inside the chair.',
    gShave: 'The Shave',
    gSkinFade: 'Skin Fade',
    gCut: 'The Cut',
    gTools: 'Tools of the Trade',
    gRitual: 'The Ritual',
    gShop: 'The Shop',

    // Contact
    contactKicker: '03 — Visit us',
    contactTitle1: 'Come see',
    contactTitle2: 'the shop.',
    address: 'Piassa Area, near Hawassa University Gate',
    city: 'Hawassa, Ethiopia',
    hours: 'Mon–Sat 08:30 – 21:00 · Sun 10:00 – 18:00',
    directions: 'Get directions',

    // Footer
    footerEst: 'Est. 2011',
    rights: '© 2026 {name}. All rights reserved.',
    footerErp: 'Staff & POS ERP',
  },
  am: {
    // Nav
    home: 'መነሻ',
    services: 'አገልግሎቶች',
    gallery: 'ጋለሪ',
    booking: 'ቀጠሮ ማስያዝ',
    contact: 'አግኙን',
    signIn: 'ይግቡ',
    bookOnline: 'ኦንላይን ቀጠሮ ያስይዙ',
    customerSignIn: 'የደንበኞች መግቢያ',
    launchErp: 'የሰራተኞችና POS ሲስተም',

    // Hero
    estSince: 'ከ2011 ጀምሮ • ሐዋሳ',
    precisionCuts: 'ጥራቱን የጠበቀ አቆራረጥ።',
    classicService: 'ደረጃውን የጠበቀ አገልግሎት።',
    heroDesc: 'በሐዋሳ ታማኝ ከሆኑ የፀጉር አስተካካዮቻችን የሚሰጥ የስኪን ፌድ፣ በሙቅ ፎጣ የተደገፈ መላጨት እና የጢም እንክብካቤ። እንደ ደንበኛ ገብተው — በግሩም ገጽታ ይውጡ።',
    bookAppointment: 'ቀጠሮ ያስይዙ',
    ourServices: 'አገልግሎቶቻችን',

    // Services
    servicesKicker: '01 — አገልግሎቶች',
    servicesTitle: 'የሙያ ጥበባችን።',
    servicesDesc: 'እያንዳንዱ አገልግሎት በሙያተኞች የሚከናወን ሲሆን በሙቅ ፎጣ፣ በጥንቃቄ በተሰራ የምላጭ መስመር እና በምርጥ መዋቢያዎች ይጠናቀቃል።',
    book: 'ቀጠሮ ያስይዙ',

    // Gallery
    galleryKicker: '02 — ጋለሪ',
    galleryTitle: 'ሥራዎቻችን።',
    galleryDesc: 'የተስተካከሉ መስመሮች፣ ጽዱ አጨራረስ እና የተሟሉ የሙያ መሣሪያዎች — ከሳሎናችን ድባብ።',
    gShave: 'የጢም መላጨት',
    gSkinFade: 'ስኪን ፌድ',
    gCut: 'የፀጉር አቆራረጥ',
    gTools: 'የሙያ መሣሪያዎች',
    gRitual: 'የእንክብካቤ ሥርዓት',
    gShop: 'ሳሎናችን',

    // Contact
    contactKicker: '03 — ይጎብኙን',
    contactTitle1: 'ወደ ሳሎናችን',
    contactTitle2: 'ይምጡ።',
    address: 'ፒያሳ አካባቢ፣ ከሐዋሳ ዩኒቨርሲቲ በር አጠገብ',
    city: 'ሐዋሳ፣ ኢትዮጵያ',
    hours: 'ሰኞ–ቅዳሜ 08:30 – 21:00 · እሑድ 10:00 – 18:00',
    directions: 'አቅጣጫ ያግኙ',

    // Footer
    footerEst: 'ከ2011 ጀምሮ',
    rights: '© 2026 {name}። መብቱ በሕግ የተጠበቀ ነው።',
    footerErp: 'የሰራተኞችና POS ሲስተም',
  },
} as const;

export type WebsiteTranslationKey = keyof typeof websiteTranslations.en;

export function wt(key: WebsiteTranslationKey, lang: WebsiteLanguage, vars?: Record<string, string | number>): string {
  let text: string = websiteTranslations[lang][key] || websiteTranslations.en[key];
  if (vars) {
    Object.entries(vars).forEach(([k, v]) => {
      text = text.replace(`{${k}}`, String(v));
    });
  }
  return text;
}

export default websiteTranslations;
