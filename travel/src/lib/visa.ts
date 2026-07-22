/*
 * Curated entry-requirement intelligence for WanderWise's six destination
 * countries, keyed by the traveler's passport country (ISO alpha-2).
 * Researched July 2026 against official portals + current policy reporting.
 * NOT legal advice: rules change, so every card links the official government
 * source and tells the traveler to verify there before booking.
 */
import { codeOf, nameOf } from './countries';

const EU = ['AT','BE','BG','HR','CY','CZ','DK','EE','FI','FR','DE','GR','HU','IE','IT','LV','LT','LU','MT','NL','PL','PT','RO','SK','SI','ES','SE'];
const spread = (codes: string[], days: number) => Object.fromEntries(codes.map((c) => [c, days]));

export type EntryInfo = {
  country: string;
  /** passport code -> visa-free days */
  free: Record<string, number>;
  /** what everyone NOT on the free list should do */
  fallback: string;
  official: { label: string; url: string }[];
  notes: string[];
  checked: string;
};

export const ENTRY: Record<string, EntryInfo> = {
  Vietnam: {
    country: 'Vietnam',
    free: {
      ...spread(['PH','SG','MY','TH','ID','KH','LA'], 30), ...spread(['BN','MM'], 14),
      ...spread(['JP','KR','GB','FR','DE','IT','ES','DK','SE','NO','FI','RU','BY'], 45),
      ...spread(['CL','PA'], 90),
    },
    fallback: 'Apply for the 90-day e-Visa (single or multiple entry, ~USD 25) — most nationalities including US, Canada, Australia, India and China are eligible.',
    official: [
      { label: 'Official Vietnam e-Visa portal', url: 'https://evisa.gov.vn' },
      { label: 'Vietnam Immigration Department', url: 'https://immigration.gov.vn' },
    ],
    notes: ['Passport must be valid 6+ months beyond arrival.', 'Use only evisa.gov.vn — lookalike sites overcharge.'],
    checked: 'July 2026',
  },
  Taiwan: {
    country: 'Taiwan',
    free: {
      ...spread(['US','CA','GB','JP','KR','SG','MY','AU','NZ','IL','CH','NO','IS','LI','MC'], 90), ...spread(EU, 90),
      ...spread(['PH','TH','BN'], 14),
    },
    fallback: 'Apply for a visitor visa or check eVisa eligibility with Taiwan\'s Bureau of Consular Affairs before travel.',
    official: [
      { label: 'Bureau of Consular Affairs (visas)', url: 'https://www.boca.gov.tw/mp-2.html' },
      { label: 'Taiwan Arrival Card (required for ALL visitors)', url: 'https://twac.immigration.gov.tw' },
    ],
    notes: [
      'Philippines/Thailand/Brunei 14-day visa-free entry is a trial program, currently extended to 31 Jul 2027 — reconfirm before booking.',
      'Everyone must submit the online Taiwan Arrival Card (TWAC) before landing.',
    ],
    checked: 'July 2026',
  },
  'Hong Kong': {
    country: 'Hong Kong',
    free: {
      GB: 180, ...spread(['US','CA','JP','KR','SG','MY','AU','NZ','ZA','BR','MX','IL','CH','NO','IS'], 90), ...spread(EU, 90),
      PH: 14, TH: 30, ID: 30,
    },
    fallback: 'Check the Immigration Department\'s visit-visa table — some nationalities need a visa or Pre-arrival Registration (e.g. Indian nationals) before boarding.',
    official: [
      { label: 'HK Immigration Department — visit visas', url: 'https://www.immd.gov.hk/eng/services/visas/visit-transit/visit-visa-entry-permit.html' },
    ],
    notes: ['Around 170 nationalities enter visa-free for 7–180 days depending on passport.'],
    checked: 'July 2026',
  },
  Kazakhstan: {
    country: 'Kazakhstan',
    free: {
      ...spread(['US','CA','GB','AU','NZ','JP','KR','SG','MY','PH','TH','VN','ID','IL','TR','AE','SA','QA','HK','CH','NO','IS','MN','AR','BR','CL','CO','EC','MX','UY'], 30), ...spread(EU, 30),
    },
    fallback: 'Apply via Kazakhstan\'s official e-Visa on the Visa & Migration Portal, or at a consulate.',
    official: [
      { label: 'Visa & Migration Portal (e-Visa)', url: 'https://www.vmp.gov.kz' },
      { label: 'Kazakhstan MFA — visa info', url: 'https://www.gov.kz/memleket/entities/mfa' },
    ],
    notes: ['Visa-free stays: 30 days per visit, max 90 days in any 180-day period.'],
    checked: 'July 2026',
  },
  Uzbekistan: {
    country: 'Uzbekistan',
    free: {
      ...spread(['GB','CA','AU','NZ','JP','KR','SG','MY','ID','PH','IL','TR','AE','SA','QA','KW','BH','OM','CH','NO','IS','AR','BR','CL','MX','MN','RU','KZ','KG','TJ','AM','AZ','GE','BY','UA','MD'], 30), ...spread(EU, 30),
    },
    fallback: 'Apply for the 30-day e-Visa on the official portal (US citizens included; valid 90 days from issue).',
    official: [
      { label: 'Official Uzbekistan e-Visa portal', url: 'https://e-visa.gov.uz' },
      { label: 'Uzbekistan MFA', url: 'https://mfa.uz' },
    ],
    notes: ['Register your stay (hotels do it automatically) if staying over 3 days.'],
    checked: 'July 2026',
  },
  Kyrgyzstan: {
    country: 'Kyrgyzstan',
    free: {
      ...spread(['US','CA','GB','AU','NZ','JP','KR','SG','MY','IL','TR','AE','SA','QA','KW','BH','CH','NO','IS','RU','KZ','UZ','TJ','AM','AZ','GE','BY','UA','MD','MN','BR','VN'], 60),
      ...spread(EU, 60),
    },
    fallback: 'Apply for the official e-Visa before travel, or the unified “Sapar” visa for longer stays.',
    official: [
      { label: 'Official Kyrgyzstan e-Visa portal', url: 'https://www.evisa.e-gov.kg' },
      { label: 'Kyrgyzstan MFA', url: 'https://mfa.gov.kg' },
    ],
    notes: ['Recent rules cap many visa-free stays at 30 days within any 60-day window — recheck close to travel.'],
    checked: 'July 2026',
  },
};

ENTRY['Japan'] = {
  country: 'Japan',
  free: {
    ...spread(['US','CA','GB','AU','NZ','KR','SG','MY','HK','TW','IL','TR','MX','AR','BR','CL','CH','NO','IS','LI','MC'], 90), ...spread(EU, 90),
    TH: 15, BN: 14,
  },
  fallback: 'Apply for a visa — Philippine and several other passports can use the official JAPAN eVISA for tourism (single entry, up to 90 days).',
  official: [
    { label: 'JAPAN eVISA (official)', url: 'https://www.evisa.mofa.go.jp' },
    { label: 'MOFA Japan — visa info', url: 'https://www.mofa.go.jp/j_info/visit/visa/index.html' },
    { label: 'Visit Japan Web (arrival QR)', url: 'https://www.vjw.digital.go.jp' },
  ],
  notes: ['Fill Visit Japan Web before landing to speed up immigration & customs.'],
  checked: 'July 2026',
};
ENTRY['Thailand'] = {
  country: 'Thailand',
  free: {
    ...spread(['US','CA','GB','AU','NZ','JP','KR','SG','MY','PH','ID','VN','KH','LA','BN','IN','CN','HK','TW','TR','AE','SA','QA','KW','BH','OM','IL','ZA','BR','AR','CL','MX','PE','KZ','UZ','CH','NO','IS'], 60), ...spread(EU, 60),
  },
  fallback: 'Apply for the official Thai e-Visa before travel.',
  official: [
    { label: 'Thai e-Visa (official)', url: 'https://www.thaievisa.go.th' },
    { label: 'Thailand Digital Arrival Card (required for ALL visitors)', url: 'https://tdac.immigration.go.th' },
  ],
  notes: ['Everyone must submit the online Thailand Digital Arrival Card (TDAC) within 3 days before arrival.', '60-day visa-exempt stays are extendable once by 30 days at immigration.'],
  checked: 'July 2026',
};
ENTRY['South Korea'] = {
  country: 'South Korea',
  free: {
    US: 90, CA: 180, GB: 180, ...spread(['AU','NZ','SG','MY','HK','TW','JP','TH','AE','IL','TR','MX','BR','CL','CH','NO','IS'], 90), ...spread(EU, 90), RU: 60,
  },
  fallback: 'Apply for a visa via the official Korea Visa Portal. Note: Jeju Island alone admits many additional nationalities visa-free on direct flights.',
  official: [
    { label: 'K-ETA (required for most visa-exempt travelers)', url: 'https://www.k-eta.go.kr' },
    { label: 'Korea Visa Portal (official)', url: 'https://www.visa.go.kr' },
  ],
  notes: ['Visa-exempt travelers generally need a K-ETA approved before boarding — some nationalities have had temporary exemptions, so check the K-ETA site for the current list.'],
  checked: 'July 2026',
};

ENTRY['China'] = {
  country: 'China',
  free: {
    // 30-day unilateral visa-free (ordinary passports), as of Feb 2026.
    ...spread(EU, 30), ...spread(['NO','CH','IS','MC','AD'], 30),
    ...spread(['GB','CA','AU','NZ','JP','KR','SG','MY','BN','TH','AE','QA'], 30),
    ...spread(['BR','AR','CL','UY','PE'], 30),
  },
  fallback: 'Apply for a Chinese tourist (L) visa at a Visa Application Service Center. US and many others transiting to a THIRD country can instead use 240-hour (10-day) visa-free transit at 60+ ports.',
  official: [
    { label: 'China Visa Application Service Center', url: 'https://www.visaforchina.cn' },
    { label: 'National Immigration Administration', url: 'https://en.nia.gov.cn' },
  ],
  notes: [
    '30-day visa-free covers ~50 countries and runs through Dec 31, 2026 — reconfirm before booking.',
    '240-hour visa-free transit needs an onward ticket to a different third country and applies only at eligible ports.',
    'Foreigners must register their address with local police within 24h of arrival (hotels do this automatically).',
  ],
  checked: 'July 2026',
};

export type VisaVerdict = {
  status: 'visa-free' | 'action-needed' | 'unknown';
  headline: string;
  detail: string;
  official: { label: string; url: string }[];
  notes: string[];
  checked: string;
};

export function entryFor(passport: string | null | undefined, destCountry: string): VisaVerdict | null {
  const info = ENTRY[destCountry];
  if (!info) return null;
  const code = codeOf(passport ?? '');
  if (!code) {
    return {
      status: 'unknown',
      headline: `Entry rules for ${destCountry}`,
      detail: 'Set your passport country in Account to see whether you can enter visa-free.',
      official: info.official, notes: info.notes, checked: info.checked,
    };
  }
  const days = info.free[code];
  if (days) {
    return {
      status: 'visa-free',
      headline: `${nameOf(code)} passport: visa-free up to ${days} days`,
      detail: `No visa needed for short visits to ${destCountry}. Carry a passport valid 6+ months with onward ticket & accommodation proof.`,
      official: info.official, notes: info.notes, checked: info.checked,
    };
  }
  return {
    status: 'action-needed',
    headline: `${nameOf(code)} passport: visa or e-Visa likely required`,
    detail: info.fallback,
    official: info.official, notes: info.notes, checked: info.checked,
  };
}
