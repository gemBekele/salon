export type Language = 'en' | 'am';

const translations = {
  en: {
    // Header
    nowServing: 'NOW SERVING',
    waitingQueue: 'WAITING QUEUE',
    upcomingCustomers: 'UPCOMING',
    allStations: 'ALL STATIONS',

    // Status
    inProgress: 'In Progress',
    waiting: 'Waiting',
    completed: 'Completed',
    cancelled: 'Cancelled',
    queued: 'Queued',

    // Sections
    serviceStations: 'SERVICE STATIONS',
    waitingLounge: 'WAITING LOUNGE',
    nextInQueue: 'NEXT IN QUEUE',
    recentCompleted: 'RECENTLY COMPLETED',

    // Info
    station: 'Station',
    stationNumber: 'Station #{num}',
    queueNumber: 'Queue #{num}',
    estimatedWait: 'Est. ~{min}m',
    pleaseProceed: 'Please proceed to',
    yourServiceIsReady: 'Your service is ready',
    ticketNumber: 'Ticket',
    customer: 'Customer',
    service: 'Service',
    staff: 'Staff',
    department: 'Department',
    waitTime: 'Wait Time',

    // Department
    hairStyling: 'Hair & Styling',
    spaMassage: 'Spa & Massage',
    nailsBeauty: 'Nails & Beauty',
    mensSalon: "Men's Salon",
    womensSalon: "Women's Salon",
    allDepartments: 'All Departments',

    // Footer
    poweredBy: 'Powered by',
    liveSync: 'Live Sync',
    refreshInterval: 'Refresh',
    seconds: 's',

    // Voice
    voiceOn: 'Voice ON',
    voiceOff: 'Muted',
    testVoice: 'Test Voice',
    switchLanguage: 'Language',
    darkMode: 'Dark Mode',
    lightMode: 'Light Mode',
    fullscreen: 'Fullscreen',
    exitFullscreen: 'Exit Fullscreen',
    exitTvMode: 'Exit TV',

    // Messages
    noWaitingClients: 'No waiting clients',
    readyForWalkIns: 'Ready for walk-ins!',
    approachingStation: 'Please approach your assigned station when your number is called.',
    refreshments: 'Refreshments & Wi-Fi available at Reception',
    welcome: 'Welcome',
    attentionPlease: 'Attention Please',
    pleaseGoTo: 'please go to',
    yourServiceComplete: 'Your service is complete. Please proceed to cashier.',

    // Time
    monday: 'Monday',
    tuesday: 'Tuesday',
    wednesday: 'Wednesday',
    thursday: 'Thursday',
    friday: 'Friday',
    saturday: 'Saturday',
    sunday: 'Sunday',
  },
  am: {
    // Header
    nowServing: 'አሁን የሚስተናገዱ',
    waitingQueue: 'በተራ በመጠበቅ ላይ',
    upcomingCustomers: 'ቀጣይ ደንበኞች',
    allStations: 'ሁሉም ቦታዎች',

    // Status
    inProgress: 'በሂደት ላይ',
    waiting: 'በመጠበቅ ላይ',
    completed: 'ተጠናቋል',
    cancelled: 'ተሰርዟል',
    queued: 'በተራ ላይ',

    // Sections
    serviceStations: 'የአገልግሎት ቦታዎች',
    waitingLounge: 'የመጠበቂያ ክፍል',
    nextInQueue: 'ቀጣይ በተራ ላይ',
    recentCompleted: 'በቅርብ የተጠናቀቁ',

    // Info
    station: 'ቦታ',
    stationNumber: 'ቦታ #{num}',
    queueNumber: 'የተራ ቁጥር #{num}',
    estimatedWait: 'የሚወሰደው ጊዜ ~{min} ደቂቃ',
    pleaseProceed: 'እባክዎን ይግቡ',
    yourServiceIsReady: 'አገልግሎትዎ ዝግጁ ነው',
    ticketNumber: 'ቲኬት',
    customer: 'ደንበኛ',
    service: 'አገልግሎት',
    staff: 'ሰራተኛ',
    department: 'ክፍል',
    waitTime: 'የመጠበቂያ ሰዓት',

    // Department
    hairStyling: 'የፀጉር አሰራርና ስታይል',
    spaMassage: 'ስፓና ማሳጅ',
    nailsBeauty: 'የጥፍርና የውበት እንክብካቤ',
    mensSalon: 'የወንዶች ሳሎን',
    womensSalon: 'የሴቶች ሳሎን',
    allDepartments: 'ሁሉም ክፍሎች',

    // Footer
    poweredBy: 'የቀረበው በ',
    liveSync: 'ቀጥታ ማመሳሰል',
    refreshInterval: 'ማደሻ',
    seconds: 'ሰከንድ',

    // Voice
    voiceOn: 'ድምፅ በርቷል',
    voiceOff: 'ድምፅ ተዘግቷል',
    testVoice: 'የድምፅ ፍተሻ',
    switchLanguage: 'ቋንቋ',
    darkMode: 'ጨለማ ሞድ',
    lightMode: 'ብርሃን ሞድ',
    fullscreen: 'ሙሉ ማያ ገጽ',
    exitFullscreen: 'ከሙሉ ማያ ገጽ ውጣ',
    exitTvMode: 'ከ TV ውጣ',

    // Messages
    noWaitingClients: 'ምንም የሚጠብቅ ደንበኛ የለም',
    readyForWalkIns: 'ያለቀጠሮ ለሚመጡ ደንበኞች ዝግጁ ነን!',
    approachingStation: 'የተራ ቁጥርዎ ሲጠራ እባክዎን ወደ ተመደበሎት የአገልግሎት ቦታ ይቅረቡ።',
    refreshments: 'በመቀበያ ቦታችን (ሪሴፕሽን) መስተንግዶ እና ዋይፋይ ይገኛሉ።',
    welcome: 'እንኳን ደህና መጡ',
    attentionPlease: 'ትኩረት ይስጡ',
    pleaseGoTo: 'እባክዎን ይግቡ',
    yourServiceComplete: 'አገልግሎትዎ ተጠናቋል፤ እባክዎን ወደ ክፍያ ቦታ ይቅረቡ።',

    // Time
    monday: 'ሰኞ',
    tuesday: 'ማክሰኞ',
    wednesday: 'ረቡዕ',
    thursday: 'ሐሙስ',
    friday: 'አርብ',
    saturday: 'ቅዳሜ',
    sunday: 'እሑድ',
  },
} as const;

export type TranslationKey = keyof typeof translations.en;

export function t(key: TranslationKey, lang: Language, vars?: Record<string, string | number>): string {
  let text: string = translations[lang][key] || translations.en[key];
  if (vars) {
    Object.entries(vars).forEach(([k, v]) => {
      text = text.replace(`{${k}}`, String(v));
    });
  }
  return text;
}

export default translations;
