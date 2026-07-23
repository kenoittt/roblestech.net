/*
 * Philippine eTravel — mandatory for every traveler arriving in or departing
 * from the Philippines by air/sea, including Filipino citizens and OFWs/
 * balikbayans. Shown to Filipino-passport users regardless of destination,
 * since it applies to their own border crossing, not the trip's country.
 * Researched July 2026 against etravel.gov.ph and current policy reporting.
 */
export const PH_ETRAVEL = {
  headline: 'Flying to or from the Philippines? Register on eTravel — both ways.',
  detail: 'The Philippine eTravel Pass is a free, mandatory online registration for every traveler entering or leaving the Philippines by air or sea — including Filipino citizens, OFWs and balikbayans. Register and save the QR code shown at immigration.',
  notes: [
    'Do it for BOTH legs — once before you leave the Philippines, and again before you fly back.',
    'Register no earlier than 72 hours before that flight; the system rejects registrations outside that window.',
    'There is no legitimate fee. Never pay a third-party site to register on your behalf.',
  ],
  official: [{ label: 'Official Philippine eTravel (etravel.gov.ph)', url: 'https://etravel.gov.ph' }],
  checked: 'July 2026',
};
