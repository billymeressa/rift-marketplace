import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const en = {
  common: {
    appName: 'Rift',
    buy: 'Buy',
    sell: 'Sell',
    search: 'Search',
    filter: 'Filter',
    post: 'Post Listing',
    call: 'Call',
    telegram: 'Telegram',
    cancel: 'Cancel',
    save: 'Save',
    close: 'Close',
    delete: 'Delete',
    edit: 'Edit',
    loading: 'Loading...',
    noResults: 'No results found',
    loadMore: 'Load More',
    required: 'Required',
    optional: 'Optional',
    success: 'Success',
    error: 'Something went wrong',
    retry: 'Retry',
    all: 'All',
  },
  auth: {
    welcome: 'Welcome to Rift',
    subtitle: "Ethiopia's coffee & agriculture marketplace",
    enterPhone: 'Enter your phone number',
    phoneHint: 'e.g. 0911234567',
    sendOtp: 'Send Code',
    enterOtp: 'Enter verification code',
    otpSent: 'Code sent to',
    verify: 'Verify',
    resend: 'Resend Code',
    resendIn: 'Resend in',
    invalidPhone: 'Please enter a valid Ethiopian phone number',
    invalidOtp: 'Invalid code. Please try again.',
  },
  tabs: {
    home: 'Home',
    search: 'Search',
    create: 'Post',
    profile: 'Profile',
  },
  listing: {
    type: 'I want to',
    product: 'Product',
    region: 'Region',
    grade: 'Grade',
    process: 'Process',
    transactionType: 'Transaction Type',
    quantity: 'Quantity',
    unit: 'Unit',
    price: 'Price',
    currency: 'Currency',
    title: 'Title',
    titleHint: 'e.g. Yirgacheffe G1 Washed Coffee',
    description: 'Description',
    descriptionHint: 'Additional details about your listing',
    postSuccess: 'Listing posted successfully!',
    contactSeller: 'Contact Seller',
    contactBuyer: 'Contact Buyer',
    postedBy: 'Posted by',
    ago: 'ago',
    noListings: 'No listings yet',
    myListings: 'My Listings',
    editListing: 'Edit Listing',
    condition: 'Condition',
    closeListing: 'Close Listing',
    closeConfirm: 'Are you sure you want to close this listing?',
    closed: 'Closed',
    active: 'Active',
  },
  search: {
    placeholder: 'Search listings...',
    filters: 'Filters',
    clearAll: 'Clear All',
    applyFilters: 'Apply Filters',
    results: 'results',
  },
  profile: {
    title: 'Profile',
    name: 'Name',
    nameHint: 'Your display name',
    phone: 'Phone',
    telegramUsername: 'Telegram Username',
    telegramHint: '@username',
    language: 'Language',
    logout: 'Logout',
    logoutConfirm: 'Are you sure you want to logout?',
    editProfile: 'Edit Profile',
    memberSince: 'Member since',
  },
};

const am = {
  common: {
    appName: 'ሪፍት',
    buy: 'ግዢ',
    sell: 'ሽያጭ',
    search: 'ፈልግ',
    filter: 'አጣራ',
    post: 'ዝርዝር አስገባ',
    call: 'ደውል',
    telegram: 'ቴሌግራም',
    cancel: 'ሰርዝ',
    save: 'አስቀምጥ',
    close: 'ዝጋ',
    delete: 'አጥፋ',
    edit: 'አስተካክል',
    loading: 'በመጫን ላይ...',
    noResults: 'ምንም ውጤት አልተገኘም',
    loadMore: 'ተጨማሪ ጫን',
    required: 'አስፈላጊ',
    optional: 'አማራጭ',
    success: 'ተሳክቷል',
    error: 'ስህተት ተፈጥሯል',
    retry: 'እንደገና ሞክር',
    all: 'ሁሉም',
  },
  auth: {
    welcome: 'እንኳን ወደ ሪፍት በደህና መጡ',
    subtitle: 'የኢትዮጵያ የቡና እና የግብርና ገበያ',
    enterPhone: 'ስልክ ቁጥርዎን ያስገቡ',
    phoneHint: 'ለምሳሌ 0911234567',
    sendOtp: 'ኮድ ላክ',
    enterOtp: 'የማረጋገጫ ኮድ ያስገቡ',
    otpSent: 'ኮድ ተልኳል ወደ',
    verify: 'አረጋግጥ',
    resend: 'ኮድ እንደገና ላክ',
    resendIn: 'እንደገና ላክ በ',
    invalidPhone: 'እባክዎ ትክክለኛ የኢትዮጵያ ስልክ ቁጥር ያስገቡ',
    invalidOtp: 'ልክ ያልሆነ ኮድ። እባክዎ እንደገና ይሞክሩ።',
  },
  tabs: {
    home: 'መነሻ',
    search: 'ፈልግ',
    create: 'አስገባ',
    profile: 'መገለጫ',
  },
  listing: {
    type: 'እፈልጋለሁ',
    product: 'ምርት',
    region: 'ክልል',
    grade: 'ደረጃ',
    process: 'ሂደት',
    transactionType: 'የግብይት ዓይነት',
    quantity: 'መጠን',
    unit: 'መለኪያ',
    price: 'ዋጋ',
    currency: 'ምንዛሬ',
    title: 'ርዕስ',
    titleHint: 'ለምሳሌ ይርጋጨፌ ደ1 የታጠበ ቡና',
    description: 'ዝርዝር መግለጫ',
    descriptionHint: 'ስለ ዝርዝርዎ ተጨማሪ መረጃ',
    postSuccess: 'ዝርዝር በተሳካ ሁኔታ ተለጥፏል!',
    contactSeller: 'ሻጩን ያነጋግሩ',
    contactBuyer: 'ገዢውን ያነጋግሩ',
    postedBy: 'የተለጠፈው በ',
    ago: 'በፊት',
    noListings: 'ምንም ዝርዝሮች የሉም',
    myListings: 'የእኔ ዝርዝሮች',
    editListing: 'ዝርዝር አስተካክል',
    condition: 'ሁኔታ',
    closeListing: 'ዝርዝር ዝጋ',
    closeConfirm: 'ይህን ዝርዝር መዝጋት እንደሚፈልጉ እርግጠኛ ነዎት?',
    closed: 'ተዘግቷል',
    active: 'ንቁ',
  },
  search: {
    placeholder: 'ዝርዝሮችን ፈልግ...',
    filters: 'ማጣሪያዎች',
    clearAll: 'ሁሉንም አጽዳ',
    applyFilters: 'ማጣሪያዎች ተግብር',
    results: 'ውጤቶች',
  },
  profile: {
    title: 'መገለጫ',
    name: 'ስም',
    nameHint: 'የሚታየው ስምዎ',
    phone: 'ስልክ',
    telegramUsername: 'የቴሌግራም ስም',
    telegramHint: '@username',
    language: 'ቋንቋ',
    logout: 'ውጣ',
    logoutConfirm: 'መውጣት እንደሚፈልጉ እርግጠኛ ነዎት?',
    editProfile: 'መገለጫ አስተካክል',
    memberSince: 'አባል ከ',
  },
};

i18n.use(initReactI18next).init({
  resources: {
    en: { translation: en },
    am: { translation: am },
  },
  lng: 'en',
  fallbackLng: 'en',
  interpolation: {
    escapeValue: false,
  },
});

// Load saved language preference (skip on web SSR where window is not defined)
if (Platform.OS !== 'web' || typeof window !== 'undefined') {
  AsyncStorage.getItem('language')
    .then((lang) => { if (lang) i18n.changeLanguage(lang); })
    .catch(() => { /* AsyncStorage unavailable (e.g. Expo Go) — use default */ });
}

export async function setLanguage(lang: string) {
  try {
    await AsyncStorage.setItem('language', lang);
  } catch {
    // AsyncStorage unavailable — language change still applies for this session
  }
  await i18n.changeLanguage(lang);
}

export default i18n;
