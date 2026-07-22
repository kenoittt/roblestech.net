/* Currency dropdown data + display symbols (FR-BDG: totals per currency). */
export const CURRENCIES: { code: string; sym: string; name: string }[] = [
  { code: 'USD', sym: '$',  name: 'US Dollar' },
  { code: 'PHP', sym: '₱',  name: 'Philippine Peso' },
  { code: 'EUR', sym: '€',  name: 'Euro' },
  { code: 'GBP', sym: '£',  name: 'British Pound' },
  { code: 'JPY', sym: '¥',  name: 'Japanese Yen' },
  { code: 'KRW', sym: '₩',  name: 'South Korean Won' },
  { code: 'THB', sym: '฿',  name: 'Thai Baht' },
  { code: 'VND', sym: '₫',  name: 'Vietnamese Dong' },
  { code: 'TWD', sym: 'NT$', name: 'New Taiwan Dollar' },
  { code: 'HKD', sym: 'HK$', name: 'Hong Kong Dollar' },
  { code: 'SGD', sym: 'S$', name: 'Singapore Dollar' },
  { code: 'KZT', sym: '₸',  name: 'Kazakhstani Tenge' },
  { code: 'UZS', sym: 'soʻm', name: 'Uzbekistani Som' },
  { code: 'KGS', sym: 'с',  name: 'Kyrgyzstani Som' },
  { code: 'AUD', sym: 'A$', name: 'Australian Dollar' },
  { code: 'CAD', sym: 'C$', name: 'Canadian Dollar' },
  { code: 'CNY', sym: '¥',  name: 'Chinese Yuan' },
  { code: 'MYR', sym: 'RM', name: 'Malaysian Ringgit' },
  { code: 'IDR', sym: 'Rp', name: 'Indonesian Rupiah' },
  { code: 'INR', sym: '₹',  name: 'Indian Rupee' },
];
export const symbolOf = (code: string): string =>
  CURRENCIES.find((c) => c.code === (code || '').toUpperCase())?.sym ?? (code || '').toUpperCase();
