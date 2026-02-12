import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Supported languages
export type Language = 'en' | 'hi' | 'ta' | 'te';

export const LANGUAGES: { code: Language; name: string; nativeName: string }[] = [
  { code: 'en', name: 'English', nativeName: 'English' },
  { code: 'hi', name: 'Hindi', nativeName: 'हिंदी' },
  { code: 'ta', name: 'Tamil', nativeName: 'தமிழ்' },
  { code: 'te', name: 'Telugu', nativeName: 'తెలుగు' },
];

// Translation keys
type TranslationKeys = {
  // Common
  app_name: string;
  loading: string;
  error: string;
  success: string;
  cancel: string;
  confirm: string;
  save: string;
  delete: string;
  share: string;
  close: string;
  next: string;
  skip: string;
  get_started: string;
  
  // Auth
  login: string;
  register: string;
  email: string;
  password: string;
  name: string;
  logout: string;
  
  // Navigation
  dashboard: string;
  tokens: string;
  consents: string;
  documents: string;
  audit: string;
  profile: string;
  
  // Dashboard
  welcome: string;
  kyc_status: string;
  verified: string;
  pending: string;
  not_verified: string;
  total_tokens: string;
  active_consents: string;
  recent_activity: string;
  
  // Tokens
  issue_token: string;
  my_tokens: string;
  active_token: string;
  revoked_token: string;
  revoke_token: string;
  token_id: string;
  quick_share: string;
  scan_qr: string;
  
  // Consents
  pending_requests: string;
  active_access: string;
  approve: string;
  reject: string;
  revoke_access: string;
  revoke_all: string;
  set_expiry: string;
  expires_in: string;
  no_expiry: string;
  recommended: string;
  
  // Documents
  upload_document: string;
  uploaded_documents: string;
  document_types: string;
  aadhaar_card: string;
  pan_card: string;
  passport: string;
  voter_id: string;
  
  // Onboarding
  onboarding_title_1: string;
  onboarding_desc_1: string;
  onboarding_title_2: string;
  onboarding_desc_2: string;
  onboarding_title_3: string;
  onboarding_desc_3: string;
  onboarding_title_4: string;
  onboarding_desc_4: string;
  
  // eKYC
  verify_aadhaar: string;
  enter_aadhaar: string;
  send_otp: string;
  enter_otp: string;
  verify_otp: string;
  aadhaar_verified: string;
};

// Translations
const translations: Record<Language, TranslationKeys> = {
  en: {
    app_name: 'KYC Wallet',
    loading: 'Loading...',
    error: 'Error',
    success: 'Success',
    cancel: 'Cancel',
    confirm: 'Confirm',
    save: 'Save',
    delete: 'Delete',
    share: 'Share',
    close: 'Close',
    next: 'Next',
    skip: 'Skip',
    get_started: 'Get Started',
    
    login: 'Login',
    register: 'Register',
    email: 'Email',
    password: 'Password',
    name: 'Name',
    logout: 'Logout',
    
    dashboard: 'Dashboard',
    tokens: 'Tokens',
    consents: 'Consents',
    documents: 'Documents',
    audit: 'Audit',
    profile: 'Profile',
    
    welcome: 'Welcome',
    kyc_status: 'KYC Status',
    verified: 'Verified',
    pending: 'Pending',
    not_verified: 'Not Verified',
    total_tokens: 'Total Tokens',
    active_consents: 'Active Consents',
    recent_activity: 'Recent Activity',
    
    issue_token: 'Issue New Token',
    my_tokens: 'My Tokens',
    active_token: 'Active Token',
    revoked_token: 'Revoked Token',
    revoke_token: 'Revoke Token',
    token_id: 'Token ID',
    quick_share: 'Quick Share',
    scan_qr: 'Scan this QR code to verify',
    
    pending_requests: 'Pending Requests',
    active_access: 'Active Access',
    approve: 'Approve',
    reject: 'Reject',
    revoke_access: 'Revoke Access',
    revoke_all: 'Revoke All Access',
    set_expiry: 'Set Access Duration',
    expires_in: 'Expires in',
    no_expiry: 'No Expiry',
    recommended: 'Recommended',
    
    upload_document: 'Upload Document',
    uploaded_documents: 'Uploaded Documents',
    document_types: 'Document Types',
    aadhaar_card: 'Aadhaar Card',
    pan_card: 'PAN Card',
    passport: 'Passport',
    voter_id: 'Voter ID',
    
    onboarding_title_1: 'Welcome to KYC Wallet',
    onboarding_desc_1: 'Your secure digital identity wallet for hassle-free verification',
    onboarding_title_2: 'One-Time KYC',
    onboarding_desc_2: 'Complete your KYC once, use it everywhere. No more repetitive form filling!',
    onboarding_title_3: 'You Control Access',
    onboarding_desc_3: 'Approve or deny access requests. Your data, your rules.',
    onboarding_title_4: 'Complete Audit Trail',
    onboarding_desc_4: 'See exactly who accessed your data and when. Full transparency.',
    
    verify_aadhaar: 'Verify Aadhaar',
    enter_aadhaar: 'Enter 12-digit Aadhaar Number',
    send_otp: 'Send OTP',
    enter_otp: 'Enter 6-digit OTP',
    verify_otp: 'Verify OTP',
    aadhaar_verified: 'Aadhaar Verified Successfully!',
  },
  
  hi: {
    app_name: 'केवाईसी वॉलेट',
    loading: 'लोड हो रहा है...',
    error: 'त्रुटि',
    success: 'सफल',
    cancel: 'रद्द करें',
    confirm: 'पुष्टि करें',
    save: 'सहेजें',
    delete: 'हटाएं',
    share: 'शेयर करें',
    close: 'बंद करें',
    next: 'अगला',
    skip: 'छोड़ें',
    get_started: 'शुरू करें',
    
    login: 'लॉगिन',
    register: 'पंजीकरण',
    email: 'ईमेल',
    password: 'पासवर्ड',
    name: 'नाम',
    logout: 'लॉगआउट',
    
    dashboard: 'डैशबोर्ड',
    tokens: 'टोकन',
    consents: 'सहमति',
    documents: 'दस्तावेज़',
    audit: 'ऑडिट',
    profile: 'प्रोफ़ाइल',
    
    welcome: 'स्वागत है',
    kyc_status: 'केवाईसी स्थिति',
    verified: 'सत्यापित',
    pending: 'लंबित',
    not_verified: 'सत्यापित नहीं',
    total_tokens: 'कुल टोकन',
    active_consents: 'सक्रिय सहमति',
    recent_activity: 'हालिया गतिविधि',
    
    issue_token: 'नया टोकन जारी करें',
    my_tokens: 'मेरे टोकन',
    active_token: 'सक्रिय टोकन',
    revoked_token: 'रद्द किया गया टोकन',
    revoke_token: 'टोकन रद्द करें',
    token_id: 'टोकन आईडी',
    quick_share: 'त्वरित शेयर',
    scan_qr: 'सत्यापित करने के लिए QR स्कैन करें',
    
    pending_requests: 'लंबित अनुरोध',
    active_access: 'सक्रिय एक्सेस',
    approve: 'स्वीकृत',
    reject: 'अस्वीकार',
    revoke_access: 'एक्सेस रद्द करें',
    revoke_all: 'सभी एक्सेस रद्द करें',
    set_expiry: 'एक्सेस अवधि सेट करें',
    expires_in: 'समाप्त होता है',
    no_expiry: 'कोई समाप्ति नहीं',
    recommended: 'अनुशंसित',
    
    upload_document: 'दस्तावेज़ अपलोड करें',
    uploaded_documents: 'अपलोड किए गए दस्तावेज़',
    document_types: 'दस्तावेज़ प्रकार',
    aadhaar_card: 'आधार कार्ड',
    pan_card: 'पैन कार्ड',
    passport: 'पासपोर्ट',
    voter_id: 'वोटर आईडी',
    
    onboarding_title_1: 'केवाईसी वॉलेट में आपका स्वागत है',
    onboarding_desc_1: 'परेशानी मुक्त सत्यापन के लिए आपका सुरक्षित डिजिटल पहचान वॉलेट',
    onboarding_title_2: 'एक बार केवाईसी',
    onboarding_desc_2: 'एक बार केवाईसी करें, हर जगह उपयोग करें। अब बार-बार फॉर्म नहीं भरना!',
    onboarding_title_3: 'आप नियंत्रण में हैं',
    onboarding_desc_3: 'एक्सेस अनुरोधों को स्वीकृत या अस्वीकार करें। आपका डेटा, आपके नियम।',
    onboarding_title_4: 'पूर्ण ऑडिट ट्रेल',
    onboarding_desc_4: 'देखें कि आपका डेटा किसने और कब एक्सेस किया। पूर्ण पारदर्शिता।',
    
    verify_aadhaar: 'आधार सत्यापित करें',
    enter_aadhaar: '12 अंकों का आधार नंबर दर्ज करें',
    send_otp: 'OTP भेजें',
    enter_otp: '6 अंकों का OTP दर्ज करें',
    verify_otp: 'OTP सत्यापित करें',
    aadhaar_verified: 'आधार सफलतापूर्वक सत्यापित!',
  },
  
  ta: {
    app_name: 'KYC வாலட்',
    loading: 'ஏற்றுகிறது...',
    error: 'பிழை',
    success: 'வெற்றி',
    cancel: 'ரத்துசெய்',
    confirm: 'உறுதிப்படுத்து',
    save: 'சேமி',
    delete: 'நீக்கு',
    share: 'பகிர்',
    close: 'மூடு',
    next: 'அடுத்து',
    skip: 'தவிர்',
    get_started: 'தொடங்கு',
    
    login: 'உள்நுழைவு',
    register: 'பதிவு',
    email: 'மின்னஞ்சல்',
    password: 'கடவுச்சொல்',
    name: 'பெயர்',
    logout: 'வெளியேறு',
    
    dashboard: 'டாஷ்போர்டு',
    tokens: 'டோக்கன்கள்',
    consents: 'ஒப்புதல்கள்',
    documents: 'ஆவணங்கள்',
    audit: 'தணிக்கை',
    profile: 'சுயவிவரம்',
    
    welcome: 'வரவேற்பு',
    kyc_status: 'KYC நிலை',
    verified: 'சரிபார்க்கப்பட்டது',
    pending: 'நிலுவையில்',
    not_verified: 'சரிபார்க்கப்படவில்லை',
    total_tokens: 'மொத்த டோக்கன்கள்',
    active_consents: 'செயலில் ஒப்புதல்கள்',
    recent_activity: 'சமீபத்திய செயல்பாடு',
    
    issue_token: 'புதிய டோக்கன் வழங்கு',
    my_tokens: 'என் டோக்கன்கள்',
    active_token: 'செயலில் டோக்கன்',
    revoked_token: 'ரத்து செய்யப்பட்ட டோக்கன்',
    revoke_token: 'டோக்கன் ரத்துசெய்',
    token_id: 'டோக்கன் ஐடி',
    quick_share: 'விரைவு பகிர்வு',
    scan_qr: 'சரிபார்க்க QR ஸ்கேன் செய்யவும்',
    
    pending_requests: 'நிலுவையில் உள்ள கோரிக்கைகள்',
    active_access: 'செயலில் அணுகல்',
    approve: 'ஒப்புக்கொள்',
    reject: 'நிராகரி',
    revoke_access: 'அணுகலை ரத்துசெய்',
    revoke_all: 'அனைத்து அணுகலையும் ரத்துசெய்',
    set_expiry: 'அணுகல் காலம் அமை',
    expires_in: 'காலாவதியாகும்',
    no_expiry: 'காலாவதி இல்லை',
    recommended: 'பரிந்துரைக்கப்படுகிறது',
    
    upload_document: 'ஆவணத்தை பதிவேற்று',
    uploaded_documents: 'பதிவேற்றப்பட்ட ஆவணங்கள்',
    document_types: 'ஆவண வகைகள்',
    aadhaar_card: 'ஆதார் அட்டை',
    pan_card: 'பான் அட்டை',
    passport: 'பாஸ்போர்ட்',
    voter_id: 'வாக்காளர் அடையாளம்',
    
    onboarding_title_1: 'KYC வாலட்டுக்கு வரவேற்கிறோம்',
    onboarding_desc_1: 'தொந்தரவில்லாத சரிபார்ப்புக்கான உங்கள் பாதுகாப்பான டிஜிட்டல் அடையாள வாலட்',
    onboarding_title_2: 'ஒரு முறை KYC',
    onboarding_desc_2: 'ஒரு முறை KYC செய்யுங்கள், எல்லா இடத்திலும் பயன்படுத்துங்கள்!',
    onboarding_title_3: 'நீங்கள் கட்டுப்படுத்துகிறீர்கள்',
    onboarding_desc_3: 'அணுகல் கோரிக்கைகளை ஒப்புக்கொள்ளுங்கள் அல்லது மறுக்குங்கள். உங்கள் தரவு, உங்கள் விதிகள்.',
    onboarding_title_4: 'முழு தணிக்கை பதிவு',
    onboarding_desc_4: 'உங்கள் தரவை யார் எப்போது அணுகினார்கள் என்பதைப் பாருங்கள்.',
    
    verify_aadhaar: 'ஆதாரை சரிபார்க்கவும்',
    enter_aadhaar: '12 இலக்க ஆதார் எண்ணை உள்ளிடவும்',
    send_otp: 'OTP அனுப்பு',
    enter_otp: '6 இலக்க OTP உள்ளிடவும்',
    verify_otp: 'OTP சரிபார்க்கவும்',
    aadhaar_verified: 'ஆதார் வெற்றிகரமாக சரிபார்க்கப்பட்டது!',
  },
  
  te: {
    app_name: 'KYC వాలెట్',
    loading: 'లోడ్ అవుతోంది...',
    error: 'లోపం',
    success: 'విజయం',
    cancel: 'రద్దు',
    confirm: 'నిర్ధారించు',
    save: 'సేవ్',
    delete: 'తొలగించు',
    share: 'షేర్',
    close: 'మూసివేయి',
    next: 'తదుపరి',
    skip: 'దాటవేయి',
    get_started: 'ప్రారంభించండి',
    
    login: 'లాగిన్',
    register: 'నమోదు',
    email: 'ఇమెయిల్',
    password: 'పాస్‌వర్డ్',
    name: 'పేరు',
    logout: 'లాగ్అవుట్',
    
    dashboard: 'డాష్‌బోర్డ్',
    tokens: 'టోకెన్‌లు',
    consents: 'అనుమతులు',
    documents: 'పత్రాలు',
    audit: 'ఆడిట్',
    profile: 'ప్రొఫైల్',
    
    welcome: 'స్వాగతం',
    kyc_status: 'KYC స్థితి',
    verified: 'ధృవీకరించబడింది',
    pending: 'పెండింగ్',
    not_verified: 'ధృవీకరించబడలేదు',
    total_tokens: 'మొత్తం టోకెన్‌లు',
    active_consents: 'యాక్టివ్ అనుమతులు',
    recent_activity: 'ఇటీవలి కార్యాచరణ',
    
    issue_token: 'కొత్త టోకెన్ జారీ చేయండి',
    my_tokens: 'నా టోకెన్‌లు',
    active_token: 'యాక్టివ్ టోకెన్',
    revoked_token: 'రద్దు చేసిన టోకెన్',
    revoke_token: 'టోకెన్ రద్దు చేయండి',
    token_id: 'టోకెన్ ID',
    quick_share: 'క్విక్ షేర్',
    scan_qr: 'ధృవీకరించడానికి QR స్కాన్ చేయండి',
    
    pending_requests: 'పెండింగ్ అభ్యర్థనలు',
    active_access: 'యాక్టివ్ యాక్సెస్',
    approve: 'ఆమోదించు',
    reject: 'తిరస్కరించు',
    revoke_access: 'యాక్సెస్ రద్దు చేయండి',
    revoke_all: 'అన్ని యాక్సెస్ రద్దు చేయండి',
    set_expiry: 'యాక్సెస్ వ్యవధి సెట్ చేయండి',
    expires_in: 'ముగుస్తుంది',
    no_expiry: 'ముగింపు లేదు',
    recommended: 'సిఫార్సు చేయబడింది',
    
    upload_document: 'పత్రం అప్‌లోడ్ చేయండి',
    uploaded_documents: 'అప్‌లోడ్ చేసిన పత్రాలు',
    document_types: 'పత్రం రకాలు',
    aadhaar_card: 'ఆధార్ కార్డ్',
    pan_card: 'పాన్ కార్డ్',
    passport: 'పాస్‌పోర్ట్',
    voter_id: 'వోటర్ ID',
    
    onboarding_title_1: 'KYC వాలెట్‌కు స్వాగతం',
    onboarding_desc_1: 'ఇబ్బంది లేని ధృవీకరణ కోసం మీ సురక్షిత డిజిటల్ గుర్తింపు వాలెట్',
    onboarding_title_2: 'ఒకసారి KYC',
    onboarding_desc_2: 'ఒకసారి KYC చేయండి, ఎక్కడైనా ఉపయోగించండి!',
    onboarding_title_3: 'మీరు నియంత్రిస్తారు',
    onboarding_desc_3: 'యాక్సెస్ అభ్యర్థనలను ఆమోదించండి లేదా తిరస్కరించండి. మీ డేటా, మీ నియమాలు.',
    onboarding_title_4: 'పూర్తి ఆడిట్ ట్రయల్',
    onboarding_desc_4: 'మీ డేటాను ఎవరు ఎప్పుడు యాక్సెస్ చేశారో చూడండి.',
    
    verify_aadhaar: 'ఆధార్ ధృవీకరించండి',
    enter_aadhaar: '12 అంకెల ఆధార్ నంబర్ నమోదు చేయండి',
    send_otp: 'OTP పంపండి',
    enter_otp: '6 అంకెల OTP నమోదు చేయండి',
    verify_otp: 'OTP ధృవీకరించండి',
    aadhaar_verified: 'ఆధార్ విజయవంతంగా ధృవీకరించబడింది!',
  },
};

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => Promise<void>;
  t: (key: keyof TranslationKeys) => string;
  languages: typeof LANGUAGES;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const LanguageProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [language, setLanguageState] = useState<Language>('en');
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadLanguage();
  }, []);

  const loadLanguage = async () => {
    try {
      const savedLang = await AsyncStorage.getItem('app_language');
      if (savedLang && (savedLang === 'en' || savedLang === 'hi' || savedLang === 'ta' || savedLang === 'te')) {
        setLanguageState(savedLang as Language);
      }
    } catch (error) {
      console.log('Error loading language:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const setLanguage = async (lang: Language) => {
    try {
      await AsyncStorage.setItem('app_language', lang);
      setLanguageState(lang);
    } catch (error) {
      console.log('Error saving language:', error);
    }
  };

  const t = (key: keyof TranslationKeys): string => {
    return translations[language][key] || translations.en[key] || key;
  };

  if (isLoading) {
    return null;
  }

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t, languages: LANGUAGES }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = () => {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};
