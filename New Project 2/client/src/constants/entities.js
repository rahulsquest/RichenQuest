/**
 * Standard Business Entities, Status Codes, and Milestone Definitions
 * Aligned with Zoho CRM, Zoho Bookings, Zoho WorkDrive, and Zoho Books
 */

export const JOURNEY_STEPS = [
  { index: 0, key: 'INQUIRY', label: 'Inquiry Submitted', route: '/inquiry' },
  { index: 1, key: 'REGISTRATION', label: 'Student Profile', route: '/profile' },
  { index: 2, key: 'COUNSELOR_ASSIGNED', label: 'Counselor Assigned', route: '/dashboard' },
  { index: 3, key: 'CONSULTATION', label: '1-on-1 Consultation', route: '/bookings' },
  { index: 4, key: 'SHORTLISTING', label: 'University Shortlisting', route: '/applications' },
  { index: 5, key: 'DOCUMENTS', label: 'Document Dossier', route: '/documents' },
  { index: 6, key: 'APPLICATIONS', label: 'Portal Submissions', route: '/applications' },
  { index: 7, key: 'OFFERS', label: 'Offer Letter & Decision', route: '/applications' },
  { index: 8, key: 'FINANCES_VISA', label: 'Financials & Visa Filing', route: '/payments' },
  { index: 9, key: 'PRE_DEPARTURE', label: 'Pre-Departure Briefing', route: '/support' }
];

export const DOCUMENT_CATEGORIES = [
  { type: 'PASSPORT', label: 'International Passport', required: true, icon: 'FileText' },
  { type: 'TRANSCRIPT', label: 'Academic Transcripts', required: true, icon: 'GraduationCap' },
  { type: 'SOP', label: 'Statement of Purpose (SOP)', required: true, icon: 'BookOpen' },
  { type: 'LOR', label: 'Letters of Recommendation (LOR)', required: true, icon: 'Users' },
  { type: 'ENGLISH_TEST', label: 'IELTS / TOEFL / PTE Scorecard', required: true, icon: 'Award' },
  { type: 'OFFER_LETTER', label: 'University Offer Letter', required: false, icon: 'CheckCircle' },
  { type: 'FINANCIAL_DOC', label: 'Financial Solvency / Bank Statement', required: false, icon: 'CreditCard' },
  { type: 'VISA', label: 'CAS / Visa Application Copy', required: false, icon: 'ShieldCheck' }
];

export const TARGET_COUNTRIES = [
  'Australia',
  'Austria',
  'Belgium',
  'Canada',
  'China',
  'Croatia',
  'Czech Republic',
  'Denmark',
  'Dubai (UAE)',
  'Estonia',
  'Finland',
  'France',
  'Germany',
  'Greece',
  'Hungary',
  'India',
  'Ireland',
  'Italy',
  'Japan',
  'Latvia',
  'Lithuania',
  'Luxembourg',
  'Malta',
  'Nepal',
  'Netherlands',
  'New Zealand',
  'Norway',
  'Portugal',
  'Singapore',
  'Slovakia',
  'South Korea',
  'Spain',
  'Sweden',
  'Switzerland',
  'United Kingdom'
];

export const DEGREE_LEVELS = [
  'Undergraduate (Bachelor\'s / BA / BSc / BEng)',
  'Postgraduate (Master\'s / MSc / MA / MEng / MBA)',
  'Doctorate (PhD / Post-Doctoral)',
  'Diploma / Foundation Certificate'
];
