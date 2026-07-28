import { Transaction, StatementSettings, AccountInfo, CustomerDetails, BranchDetails } from '../types';

// Helper to generate a random number in a range [min, max]
function randRange(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function genRef(): string {
  return Array.from({ length: 12 }, () => Math.floor(Math.random() * 10)).join('');
}

function weightedPick<T extends { weight: number }>(items: T[]): T {
  const total = items.reduce((s, i) => s + i.weight, 0);
  let r = Math.random() * total;
  for (const item of items) {
    r -= item.weight;
    if (r <= 0) return item;
  }
  return items[items.length - 1];
}

// Generate ultra-natural odd paise (avoiding static repeated decimals)
function getRandomPaise(): number {
  return pick([0.15, 0.28, 0.35, 0.42, 0.50, 0.64, 0.78, 0.85, 0.92, 0.25, 0.75, 0.40, 0.80, 0.18, 0.67]);
}

// Generate realistic non-round default opening balances
export function getRandomOpeningBalance(): number {
  const baseThousand = pick([47, 53, 68, 72, 87, 91, 104, 118, 132, 145]);
  const oddHundreds = randRange(1, 9) * 100 + randRange(1, 9) * 10 + randRange(1, 9);
  const paise = getRandomPaise();
  return baseThousand * 1000 + oddHundreds + paise;
}

// Generate realistic Indian-sounding reference numbers with correct lengths
export function generateRefNo(bankStyle?: string): string {
  const digits = Array.from({ length: 12 }, () => Math.floor(Math.random() * 10)).join('');
  if (bankStyle === 'IndusInd') {
    return `S${digits.substring(0, 8)}`;
  }
  return digits;
}

// Map duration to approximate date range
export function getDurationDays(duration: StatementSettings['duration']): number {
  switch (duration) {
    case '1 Month': return 30;
    case '2 Months': return 60;
    case '3 Months': return 90;
    case '6 Months': return 180;
    case '12 Months': return 365;
    default: return 180;
  }
}

// Convert "PageCount" option to optimized number of transactions
export function getPageToTxCount(pageCount: StatementSettings['pageCount'], customVal = 20): number {
  switch (pageCount) {
    case '1 Page': return 12;
    case '2 Pages': return 40;
    case '3 Pages': return 68;
    case '5 Pages': return 124;
    case '10 Pages': return 264;
    case '15 Pages': return 380;
    case '20 Pages': return 544;
    case 'Custom': return Math.max(5, Math.min(1000, customVal));
    default: return 380;
  }
}

// Format date into DD-MM-YYYY
export function formatDate(date: Date): string {
  const d = date.getDate().toString().padStart(2, '0');
  const m = (date.getMonth() + 1).toString().padStart(2, '0');
  const y = date.getFullYear();
  return `${d}-${m}-${y}`;
}

const MONTH_NAMES = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];

// Convert YYYY-MM-DD back to DD-MM-YYYY for templates
export function isoToIndianFormat(isoStr: string): string {
  if (!isoStr) return '';
  const parts = isoStr.split('-');
  if (parts.length !== 3) return isoStr;
  return `${parts[2]}-${parts[1]}-${parts[0]}`;
}

function getDateRange(settings: StatementSettings, localTime?: string): { startDay: Date; endDay: Date } {
  if (settings.generationMode === 'custom' && settings.fromDate && settings.toDate) {
    const start = new Date(settings.fromDate);
    start.setHours(0, 0, 0, 0);
    const end = new Date(settings.toDate);
    end.setHours(23, 59, 59, 999);
    return { startDay: start, endDay: end };
  }

  const currentDate = localTime ? new Date(localTime) : new Date();
  const endDay = new Date(currentDate.getTime());
  endDay.setHours(23, 59, 59, 999);

  const durationDays = getDurationDays(settings.duration);
  const startDay = new Date(endDay.getTime());
  startDay.setDate(startDay.getDate() - durationDays);
  startDay.setHours(0, 0, 0, 0);

  return { startDay, endDay };
}

// ─── GEOGRAPHIC CONSISTENCY ENGINE ───────────────────────────────────────────
interface GeoInfo {
  city: string;
  state: string;
  atmLocations: string[];
  posLocations: string[];
}

function detectPrimaryCity(customer?: CustomerDetails, branch?: BranchDetails): GeoInfo {
  const text = `${customer?.address || ''} ${branch?.branchName || ''} ${branch?.branchAddress || ''}`.toUpperCase();

  if (text.includes('BANGALORE') || text.includes('BENGALURU') || text.includes('WHITEFIELD') || text.includes('5600')) {
    return {
      city: 'BANGALORE',
      state: 'KARNATAKA',
      atmLocations: ['SBI ATM WHITEFIELD BLR', 'SBI ATM INDIRANAGAR BLR', 'HDFC ATM KORAMANGALA BLR', 'SBI ATM MARATHAHALLI BLR', 'ICICI ATM HSR LAYOUT BLR'],
      posLocations: ['SWIGGY BANGALORE', 'SHELL PETROL PUMP BLR', 'DMART WHITEFIELD', 'APOLLO PHARMA KORAMANGALA', 'BIGBASKET INDIRANAGAR']
    };
  }

  if (text.includes('BHOPAL') || text.includes('GOVINDPURA') || text.includes('4620')) {
    return {
      city: 'BHOPAL',
      state: 'MADHYA PRADESH',
      atmLocations: ['SBI ATM GOVINDPURA BPL', 'SBI ATM NEW MARKET BPL', 'HDFC ATM ARERA COLONY BPL', 'SBI ATM MP NAGAR BPL'],
      posLocations: ['SWIGGY BHOPAL', 'HPCL PETROL BPL', 'DMART MP NAGAR', 'APOLLO PHARMA ARERA COLONY', 'BIGBASKET BHOPAL']
    };
  }

  if (text.includes('DELHI') || text.includes('NOIDA') || text.includes('GURUGRAM') || text.includes('1100')) {
    return {
      city: 'DELHI NCR',
      state: 'DELHI',
      atmLocations: ['SBI ATM CONNAUGHT PLACE DEL', 'SBI ATM DWARKA DEL', 'HDFC ATM NOIDA SEC 18', 'SBI ATM GURUGRAM'],
      posLocations: ['SWIGGY DELHI', 'SHELL PETROL NOIDA', 'DMART DWARKA', 'APOLLO PHARMA CYBER CITY']
    };
  }

  if (text.includes('MUMBAI') || text.includes('ANDHERI') || text.includes('BANDRA') || text.includes('4000')) {
    return {
      city: 'MUMBAI',
      state: 'MAHARASHTRA',
      atmLocations: ['SBI ATM ANDHERI W MUMBAI', 'SBI ATM BKC MUMBAI', 'HDFC ATM POWAI MUMBAI', 'SBI ATM THANE'],
      posLocations: ['SWIGGY MUMBAI', 'SHELL PETROL BANDRA', 'DMART ANDHERI', 'APOLLO PHARMA BKC']
    };
  }

  if (text.includes('PUNE') || text.includes('HINJEWADI') || text.includes('4110')) {
    return {
      city: 'PUNE',
      state: 'MAHARASHTRA',
      atmLocations: ['SBI ATM HINJEWADI PUNE', 'SBI ATM VIMAN NAGAR PUNE', 'HDFC ATM BANER PUNE'],
      posLocations: ['SWIGGY PUNE', 'SHELL PETROL HINJEWADI', 'DMART KOTHRUD']
    };
  }

  if (text.includes('HYDERABAD') || text.includes('GACHIBOWLI') || text.includes('5000')) {
    return {
      city: 'HYDERABAD',
      state: 'TELANGANA',
      atmLocations: ['SBI ATM HITEC CITY HYD', 'SBI ATM GACHIBOWLI HYD', 'HDFC ATM JUBILEE HILLS'],
      posLocations: ['SWIGGY HYDERABAD', 'SHELL PETROL GACHIBOWLI', 'DMART KUKATPALLY']
    };
  }

  const extractedCity = (branch?.branchName || 'CITY').split(/[\s,]+/)[0].toUpperCase();
  return {
    city: extractedCity,
    state: 'INDIA',
    atmLocations: [`SBI ATM ${extractedCity}`, `HDFC ATM ${extractedCity}`, `ICICI ATM ${extractedCity}`],
    posLocations: [`SWIGGY ${extractedCity}`, `PETROL PUMP ${extractedCity}`, `DMART ${extractedCity}`]
  };
}

// ─── 100+ Rich Indian Person Names ───────────────────────────────────────────
const INDIAN_FULL_NAMES = [
  'Kavita Sharma', 'Aditya Verma', 'Pradeep Kumar', 'Siddharth N', 'Venkatesh R',
  'Tanvi Shah', 'Harish Patel', 'Nikhil Gupta', 'Deepa Menon', 'Rohan Deshmukh',
  'Meenakshi Rao', 'Anand K', 'Swati Joshi', 'Gaurav Mishra', 'Pooja Agarwal',
  'Sandeep Kulkarni', 'Archana Nair', 'Varun Kapoor', 'Shruti Saxena', 'Manish Reddy',
  'Ritu Bhatia', 'Alok Choudhury', 'Kriti Sen', 'Abhishek Tiwari', 'Divya Iyer',
  'Kiran More', 'Vishal Singhal', 'Neha Bansal', 'Rajeev Pillai', 'Bhavna Hegde',
  'Aakash Pandey', 'Preeti Sundaram', 'Suhas Mahajan', 'Shweta Jha', 'Naveen Shetty',
  'Anjali Saxena', 'Rahul Mehta', 'Sanjay Dutt', 'Priya Dhar', 'Deepak Chauhan',
  'Meera Krishnan', 'Vijay Merchant', 'Vikram Rathore', 'Rohit Aggarwal', 'Arjun Nambiar'
];

interface MerchantInfo {
  name: string;
  handle: string;
  category: 'food' | 'grocery' | 'shopping' | 'travel' | 'fuel' | 'health' | 'entertainment' | 'digital' | 'general';
}

// ─── 30+ Authentic Indian Merchants ──────────────────────────────────────────
const INDIAN_MERCHANTS: MerchantInfo[] = [
  { name: 'SWIGGY', handle: 'swiggy@icici', category: 'food' },
  { name: 'ZOMATO', handle: 'zomato@hdfcbank', category: 'food' },
  { name: 'BLINKIT', handle: 'blinkit@axisbank', category: 'grocery' },
  { name: 'ZEPTO', handle: 'zepto@icici', category: 'grocery' },
  { name: 'AMAZON PAY', handle: 'amazon@apl', category: 'shopping' },
  { name: 'FLIPKART', handle: 'flipkart@ybl', category: 'shopping' },
  { name: 'MYNTRA', handle: 'myntra@icici', category: 'shopping' },
  { name: 'BIGBASKET', handle: 'bigbasket@bbnow', category: 'grocery' },
  { name: 'UBER INDIA', handle: 'uber@icici', category: 'travel' },
  { name: 'OLA CABS', handle: 'olacabs@ybl', category: 'travel' },
  { name: 'IRCTC', handle: 'irctc@iserve', category: 'travel' },
  { name: 'MAKEMYTRIP', handle: 'mmt@icici', category: 'travel' },
  { name: 'BOOKMYSHOW', handle: 'bms@ybl', category: 'entertainment' },
  { name: 'APOLLO PHARMACY', handle: 'apollopharma@icici', category: 'health' },
  { name: 'NETMEDS', handle: 'netmeds@axisbank', category: 'health' },
  { name: 'SHELL PETROL PUMP', handle: 'shellfuel@sbi', category: 'fuel' },
  { name: 'HPCL PETROL STATION', handle: 'hpcl@sbi', category: 'fuel' },
  { name: 'BPCL FUEL POINT', handle: 'bpcl@icici', category: 'fuel' },
  { name: 'DMART RETAIL', handle: 'dmart@hdfcbank', category: 'shopping' },
  { name: 'DECATHLON SPORTS', handle: 'decathlon@ybl', category: 'shopping' },
  { name: 'RELIANCE SMART', handle: 'reliancesmart@icici', category: 'shopping' },
  { name: 'PAYTM MERCHANT', handle: 'paytm-merchant@paytm', category: 'general' },
  { name: 'PHONEPE MERCHANT', handle: 'mrd@ybl', category: 'general' },
  { name: 'GOOGLE PLAY STORE', handle: 'googleplay@okaxis', category: 'digital' }
];

const REAL_UPI_BANK_CODES = [
  { code: 'SBIN', weight: 20 },
  { code: 'HDFC', weight: 18 },
  { code: 'ICIC', weight: 16 },
  { code: 'UTIB', weight: 14 },
  { code: 'YESB', weight: 10 },
  { code: 'BKID', weight: 10 },
  { code: 'AIRP', weight: 7 },
  { code: 'PYTM', weight: 5 }
];

const VPA_SUFFIXES = ['@okaxis', '@okhdfcbank', '@okicici', '@ybl', '@ibl', '@paytm', '@apl', '@postbank'];

function getRandomUpiBank(): string {
  return weightedPick(REAL_UPI_BANK_CODES).code;
}

// ─── Diverse UPI Narrative Generators ────────────────────────────────────────
function buildUpiNarrativeForMerchant(merch: MerchantInfo, isCredit: boolean, bankStyle: string): string {
  const ref = genRef();
  const bank = getRandomUpiBank();
  const accountSuffix = Array.from({ length: randRange(6, 8) }, () => Math.floor(Math.random() * 10)).join('');
  const hh = String(randRange(8, 22)).padStart(2, '0');
  const mm = String(randRange(0, 59)).padStart(2, '0');
  const ss = String(randRange(0, 59)).padStart(2, '0');
  const direction = isCredit ? 'CR' : 'DR';

  if (bankStyle === 'BOI') {
    return `UPI/${ref}/${hh}:${mm}:${ss}/UPI/${merch.handle}/${direction}`;
  } else if (bankStyle === 'Kotak') {
    return `UPI/${direction}/${ref}/${merch.name}/${merch.handle}`;
  }
  const tag = isCredit ? 'UPIAB' : 'UPIAR';
  return `${tag}/${ref}/${direction}/${merch.name}/${bank}/${accountSuffix}/Paymen`;
}

function buildUpiNarrative(isCredit: boolean, bankStyle: string, customName?: string): string {
  const ref = genRef();
  const bank = getRandomUpiBank();
  const accountSuffix = Array.from({ length: randRange(6, 8) }, () => Math.floor(Math.random() * 10)).join('');
  const hh = String(randRange(8, 22)).padStart(2, '0');
  const mm = String(randRange(0, 59)).padStart(2, '0');
  const ss = String(randRange(0, 59)).padStart(2, '0');
  const direction = isCredit ? 'CR' : 'DR';

  const name = customName || pick(INDIAN_FULL_NAMES);
  const firstName = name.split(' ')[0];
  const vpa = `${firstName.toLowerCase()}${randRange(10, 99)}${pick(VPA_SUFFIXES)}`;

  const styleSelector = randRange(1, 4);
  if (bankStyle === 'BOI') {
    return `UPI/${ref}/${hh}:${mm}:${ss}/UPI/${vpa}/${direction}`;
  } else if (bankStyle === 'Kotak') {
    return `UPI/${direction}/${ref}/${firstName.toUpperCase()}/${vpa}`;
  }

  if (styleSelector === 1) {
    const tag = isCredit ? 'UPIAB' : 'UPIAR';
    return `${tag}/${ref}/${direction}/${firstName.toUpperCase()}/${bank}/${accountSuffix}/Paymen`;
  } else if (styleSelector === 2) {
    return `UPI/${ref}/${direction}/${name.toUpperCase()}/${vpa}`;
  } else if (styleSelector === 3) {
    return `UPI-TRANSFER-${ref}-${vpa.toUpperCase()}`;
  } else {
    return `UPI/${direction}/${ref}/${name.toUpperCase()}/${bank}`;
  }
}

// ─── 100% Authentic Bank Salary NEFT / CMS Bulk Payroll Narratives ────────────
function buildSalaryNeftNarrative(bankStyle: string, companyName: string, date: Date): string {
  const neftRef = `N${randRange(20, 25)}${randRange(100, 999)}${Array.from({ length: 9 }, () => Math.floor(Math.random() * 10)).join('')}`;
  const monthStr = MONTH_NAMES[date.getMonth()];
  const yearStr = date.getFullYear();

  const variant = randRange(1, 3);
  switch (bankStyle) {
    case 'BOI':
      return variant === 1
        ? `NEFT/ICIC${neftRef}/CR/${companyName}`
        : `NEFT/UTIB${neftRef}/CR/${companyName} SALARY`;
    case 'PNB':
      return `NEFT/PUNB${neftRef}/CR/${companyName} SALARY FOR ${monthStr} ${yearStr}`;
    case 'Kotak':
      return variant === 1
        ? `NEFT CR-KKBK${neftRef}-${companyName}-SALARY`
        : `CMS CR-${companyName}-SALARY PAYROLL-${neftRef.substring(0, 10)}`;
    case 'SBI':
    default:
      if (variant === 1) {
        return `BY TRANSFER-NEFT*${neftRef}*${companyName}*SALARY CREDIT`;
      } else if (variant === 2) {
        return `BY TRANSFER-CMS/${neftRef}/${companyName}/SALARY FOR ${monthStr}`;
      } else {
        return `BY TRANSFER-NEFT*IN${neftRef.substring(1)}*${companyName}*SALARY CREDIT`;
      }
  }
}

function buildSOLNarrative(): string {
  const SOL_IP_RANGES = [
    () => `106.202.${randRange(1, 254)}.${randRange(1, 254)}`,
    () => `110.227.${randRange(1, 254)}.${randRange(1, 254)}`,
    () => `223.181.${randRange(1, 254)}.${randRange(1, 254)}`,
    () => `27.59.${randRange(1, 254)}.${randRange(1, 254)}`,
  ];
  const txnId = Array.from({ length: 12 }, () => Math.floor(Math.random() * 10)).join('');
  const ip = pick(SOL_IP_RANGES)();
  return `${txnId}//SOL/${ip}`;
}

const SALARY_COMPANIES = [
  'TATA STEEL LIMITED', 'TATA CONSULTANCY SERVICES LTD', 'INFOSYS LIMITED',
  'WIPRO LIMITED', 'HCL TECHNOLOGIES LTD', 'TECH MAHINDRA LTD',
  'COGNIZANT TECHNOLOGY SOLUTIONS', 'ACCENTURE SOLUTIONS PVT LTD',
  'AMAZON DEVELOPMENT CENTRE', 'RELIANCE INDUSTRIES LTD', 'ITC LIMITED'
];

function getRandomCompany(): string {
  return pick(SALARY_COMPANIES);
}

function getRandomSalaryAmount(): number {
  const raw = randRange(38000, 145000);
  return Math.round(raw / 100) * 100 + pick([0, 250, 450, 650, 800]);
}

function getSalaryInfo(settings: StatementSettings): { company: string; amount: number } {
  if (settings.salaryMode === 'manual' && settings.companyName && settings.monthlySalary && settings.monthlySalary > 0) {
    return {
      company: settings.companyName.trim().toUpperCase(),
      amount: Math.round(settings.monthlySalary),
    };
  }
  return {
    company: getRandomCompany(),
    amount: getRandomSalaryAmount(),
  };
}

function getSalaryDayOfMonth(settings: StatementSettings): number {
  if (!settings.salaryDay) return 1;
  if (settings.salaryDay === 'last_day') return 0;
  const num = parseInt(settings.salaryDay, 10);
  if (!isNaN(num) && num >= 1 && num <= 31) {
    return num;
  }
  return 1;
}

function adjustSalaryDate(date: Date): Date {
  const adjusted = new Date(date.getTime());
  if (adjusted.getDay() === 0) {
    adjusted.setDate(adjusted.getDate() - 1);
  }
  return adjusted;
}

function getLastWorkingDay(year: number, month: number): Date {
  const lastDay = new Date(year, month + 1, 0);
  return adjustSalaryDate(lastDay);
}

function getSalaryDateForMonth(year: number, month: number, settings: StatementSettings): Date {
  const targetDay = getSalaryDayOfMonth(settings);
  if (targetDay === 0) {
    return getLastWorkingDay(year, month);
  }
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const actualDay = Math.min(targetDay, daysInMonth);
  const raw = new Date(year, month, actualDay, 10, 0, 0);
  return adjustSalaryDate(raw);
}

function buildSBIntNarrative(accountNumber: string, fromDate: string, toDate: string, bankStyle: string): string {
  if (bankStyle === 'Kotak' || bankStyle === 'IndusInd') {
    return 'INT PAID ON SB ACCOUNT';
  }
  return `${accountNumber}:SBInt.Pd:${fromDate} to ${toDate}`;
}

// ─── Dynamic Merchant & Category-Based Continuously Scaled Amounts ─────────────
function getMerchantDebit(bankStyle: string): { detail: string; amount: number } {
  const merch = pick(INDIAN_MERCHANTS);
  let rawAmount = 0;
  const paise = getRandomPaise();

  switch (merch.category) {
    case 'food': // Swiggy / Zomato: ₹110 to ₹680
      rawAmount = randRange(110, 680) + paise;
      break;
    case 'grocery': // Blinkit / Zepto / BigBasket / DMart: ₹220 to ₹2450
      rawAmount = randRange(220, 2450) + paise;
      break;
    case 'shopping': // Amazon / Flipkart / Myntra / Decathlon: ₹350 to ₹4850
      rawAmount = randRange(350, 4850) + pick([0.00, 0.50, 0.99]);
      break;
    case 'travel': // Uber / Ola / IRCTC / MakeMyTrip: ₹95 to ₹2900
      rawAmount = randRange(95, 2900) + pick([0.00, 0.50]);
      break;
    case 'fuel': // Shell / HPCL / BPCL (Fuel step ₹50 round)
      rawAmount = Math.round(randRange(300, 2400) / 50) * 50;
      break;
    case 'health': // Apollo / Netmeds: ₹85 to ₹1850
      rawAmount = randRange(85, 1850) + paise;
      break;
    case 'entertainment': case 'digital': // BookMyShow / Google Play: ₹49 to ₹1250
      rawAmount = randRange(49, 1250) + pick([0.00, 0.50]);
      break;
    default:
      rawAmount = randRange(150, 1800) + paise;
  }

  return {
    detail: buildUpiNarrativeForMerchant(merch, false, bankStyle),
    amount: Math.round(rawAmount * 100) / 100,
  };
}

function getP2pDebitAmount(isMicro: boolean): number {
  const paise = getRandomPaise();
  if (isMicro) {
    return Math.round((randRange(12, 495) + paise) * 100) / 100;
  } else {
    return Math.round((randRange(510, 4800) + paise) * 100) / 100;
  }
}

function getContinuousCreditAmount(): number {
  const r = Math.random();
  const paise = getRandomPaise();
  if (r < 0.45) {
    return Math.round((randRange(120, 1850) + paise) * 100) / 100;
  } else if (r < 0.80) {
    return Math.round((randRange(1900, 6800) + paise) * 100) / 100;
  } else {
    return Math.round((randRange(7200, 18500) + paise) * 100) / 100;
  }
}

function getRefundAmount(): number {
  return Math.round((randRange(85, 950) + getRandomPaise()) * 100) / 100;
}

// ─── 100% Bank-Grade Salaried Transaction Engine ──────────────────────────────
function generateRawSalariedTransactions(
  settings: StatementSettings,
  info: AccountInfo,
  localTime: string,
  customer?: CustomerDetails,
  branch?: BranchDetails
): Transaction[] {
  const { startDay, endDay } = getDateRange(settings, localTime);
  const bankStyle = settings.bankStyle;
  const { company: companyName, amount: baseSalaryAmount } = getSalaryInfo(settings);
  const geoInfo = detectPrimaryCity(customer, branch);

  const targetTxCount = Math.max(10, settings.pageCount === 'Custom'
    ? settings.customTransactionsCount
    : getPageToTxCount(settings.pageCount));

  let initialOpening = info.openingBalance;
  if (settings.profile === 'Business' || (info.openingBalance === 90000.00 && !info.openingBalance)) {
    initialOpening = 90000.00;
  }

  const isBusinessOpening = initialOpening === 90000.00;
  const paiseCarry = isBusinessOpening ? 0 : getRandomPaise();
  let runningBal = isBusinessOpening ? 90000.00 : (Math.floor(initialOpening) + paiseCarry);

  const monthsList: { start: Date; end: Date }[] = [];
  let mCurr = new Date(startDay.getFullYear(), startDay.getMonth(), startDay.getDate());
  while (mCurr <= endDay) {
    const mStart = new Date(mCurr.getFullYear(), mCurr.getMonth(), 1);
    const mEnd = new Date(mCurr.getFullYear(), mCurr.getMonth() + 1, 0, 23, 59, 59, 999);
    
    const actualStart = mStart < startDay ? startDay : mStart;
    const actualEnd = mEnd > endDay ? endDay : mEnd;

    if (actualStart <= actualEnd) {
      monthsList.push({ start: actualStart, end: actualEnd });
    }
    mCurr = new Date(mCurr.getFullYear(), mCurr.getMonth() + 1, 1);
  }

  const numMonths = Math.max(1, monthsList.length);
  const basePerMonth = Math.max(2, Math.floor(targetTxCount / numMonths));
  let remainingTxs = targetTxCount - (basePerMonth * numMonths);

  const totalTxs: Transaction[] = [];

  // Geographically-Aware Salaried Debit Templates
  const SALARIED_DEBIT_TEMPLATES = [
    {
      detailAndAmount: (style: string) => getMerchantDebit(style),
      weight: 40
    },
    {
      detailAndAmount: (style: string) => {
        const isMicro = Math.random() < 0.7;
        return {
          detail: buildUpiNarrative(false, style),
          amount: getP2pDebitAmount(isMicro)
        };
      },
      weight: 25
    },
    {
      detailAndAmount: () => {
        const cardLast4 = randRange(1000, 9999);
        const loc = pick(geoInfo.posLocations);
        const amt = Math.round((randRange(140, 3200) + getRandomPaise()) * 100) / 100;
        return {
          detail: `POS 451239******${cardLast4} ${loc}`,
          amount: amt
        };
      },
      weight: 10
    },
    {
      detailAndAmount: (style: string) => {
        const atmLoc = pick(geoInfo.atmLocations);
        const atmId = randRange(1000, 9999);
        const detail = style === 'Kotak'
          ? `ATM WDL-CARD ${atmId}-${atmLoc}`
          : `TO ATM WD-ATM CARD-${atmId} ${atmLoc}`;
        return {
          detail,
          amount: pick([500, 1000, 1500, 2000, 3000, 5000, 10000])
        };
      },
      weight: 10
    },
    {
      detailAndAmount: () => {
        const option = randRange(1, 4);
        if (option === 1) {
          return { detail: `NETC FASTAG RECHARGE - ICICI BANK`, amount: pick([300, 500, 1000, 1500]) };
        } else if (option === 2) {
          return { detail: `BBPS/ELECTRICITY BILL PAY/TATA POWER`, amount: Math.round((randRange(850, 3400) + getRandomPaise()) * 100) / 100 };
        } else if (option === 3) {
          return { detail: `UPI/DR/AIRTEL BROADBAND/AIRP/airtel.bill@airtel/Paymen`, amount: pick([799.00, 943.00, 1179.00, 1499.00]) };
        } else {
          return { detail: `UPI/DR/JIO RECHARGE/PAYTM/jio.recharge@paytm/Paymen`, amount: pick([299.00, 349.00, 666.00, 719.00]) };
        }
      },
      weight: 10
    },
    {
      detailAndAmount: () => {
        const option = randRange(1, 5);
        if (option === 1) {
          return { detail: `ACH DR-NETFLIX ENTERTAINMENT/${randRange(100000, 999999)}`, amount: pick([199.00, 499.00, 649.00]) };
        } else if (option === 2) {
          return { detail: `ACH DR-NIPPON INDIA MF SIP/${randRange(100000, 999999)}`, amount: pick([1000.00, 2500.00, 5000.00]) };
        } else if (option === 3) {
          return { detail: `ACH DR-HDFC ERGO HEALTH INS/${randRange(100000, 999999)}`, amount: pick([840.00, 1248.00, 1950.00]) };
        } else if (option === 4) {
          return { detail: `ACH DR-BAJAJ FINANCE EMI/${randRange(10000000, 99999999)}`, amount: pick([2480.00, 3450.00, 4890.00]) };
        } else {
          return { detail: `ACH DR-HDB FINANCIAL SERVICES/${randRange(100000, 999999)}`, amount: pick([3200.00, 5400.00, 6250.00]) };
        }
      },
      weight: 5
    }
  ];

  const SALARIED_CREDIT_TEMPLATES = [
    {
      detailAndAmount: (style: string) => ({
        detail: buildUpiNarrative(true, style),
        amount: getContinuousCreditAmount()
      }),
      weight: 50
    },
    {
      detailAndAmount: () => ({
        detail: pick([
          `BY TRANSFER-NEFT*N21025${randRange(100000, 999999)}*${companyName}*REIMBURSEMENT`,
          `UPI/CR/${companyName.split(' ')[0].toLowerCase()}.claim@icici/Paymen`,
          `BY TRANSFER-NEFT*REFUND*GST*${genRef()}`
        ]),
        amount: Math.round((randRange(1250, 4800) + getRandomPaise()) * 100) / 100
      }),
      weight: 25
    },
    {
      detailAndAmount: () => ({
        detail: pick([
          `UPI/REFUND/SWIGGY/REF${randRange(100000, 999999)}/CREDIT`,
          `UPI/FAILED TXN REVERSAL/${genRef()}`
        ]),
        amount: getRefundAmount()
      }),
      weight: 15
    },
    {
      detailAndAmount: () => ({
        detail: buildSOLNarrative(),
        amount: Math.round((randRange(2000, 12000) / 100) * 100)
      }),
      weight: 10
    }
  ];

  // Generate evenly distributed transactions per month (Capping max 3-4 per day)
  monthsList.forEach((mRange, idx) => {
    let countForThisMonth = basePerMonth;
    if (remainingTxs > 0) {
      countForThisMonth += 1;
      remainingTxs -= 1;
    }

    const totalDays = Math.max(1, Math.round((mRange.end.getTime() - mRange.start.getTime()) / (1000 * 60 * 60 * 24)));
    
    const activeDaysCount = Math.max(2, Math.min(totalDays, Math.floor(totalDays * 0.65)));
    const activeOffsets: number[] = [];
    while (activeOffsets.length < activeDaysCount) {
      const dayOffset = randRange(0, totalDays - 1);
      if (!activeOffsets.includes(dayOffset)) activeOffsets.push(dayOffset);
    }
    activeOffsets.sort((a, b) => a - b);

    // Strict Daily Allocation: Limit to MAX 3 transactions per normal day (or 4 on rare heavy days)
    const dailyAllocation = new Array(totalDays).fill(0);
    let unassigned = countForThisMonth;
    let attempts = 0;
    while (unassigned > 0 && attempts < 500) {
      attempts++;
      for (const dayOffset of activeOffsets) {
        if (unassigned <= 0) break;
        const current = dailyAllocation[dayOffset];
        const cap = (dayOffset % 7 === 0) ? 4 : 3;
        if (current < cap) {
          dailyAllocation[dayOffset]++;
          unassigned--;
        }
      }
    }

    for (let dayOffset = 0; dayOffset < totalDays; dayOffset++) {
      const dayTxCount = dailyAllocation[dayOffset];
      if (dayTxCount === 0) continue;

      const txDate = new Date(mRange.start.getTime());
      txDate.setDate(txDate.getDate() + dayOffset);
      if (txDate > mRange.end) txDate.setTime(mRange.end.getTime());

      const availableHours = [9, 11, 13, 15, 18, 20, 21];
      const dayHours = [...availableHours].sort(() => Math.random() - 0.5).slice(0, dayTxCount);
      dayHours.sort((a, b) => a - b);

      for (let k = 0; k < dayTxCount; k++) {
        const hour = dayHours[k] || randRange(9, 21);
        const txTime = new Date(txDate.getTime());
        txTime.setHours(hour, randRange(0, 59), randRange(0, 59));

        const isCredit = Math.random() < 0.18;
        const tmpl = isCredit ? weightedPick(SALARIED_CREDIT_TEMPLATES) : weightedPick(SALARIED_DEBIT_TEMPLATES);
        const { detail, amount: rawAmt } = tmpl.detailAndAmount(bankStyle);
        const amount = Math.round(rawAmt * 100) / 100;

        if (isCredit) {
          runningBal += amount;
        } else {
          if (runningBal - amount < 200) {
            runningBal = Math.max(500, runningBal);
          }
          runningBal -= amount;
        }
        runningBal = Math.round(runningBal * 100) / 100;
        const dateStr = formatDate(txTime);

        totalTxs.push({
          id: `tx_${idx}_${dayOffset}_${k}_${txTime.getTime()}`,
          valueDate: dateStr,
          postDate: dateStr,
          details: detail,
          refNo: generateRefNo(bankStyle),
          debit: isCredit ? null : amount,
          credit: isCredit ? amount : null,
          balance: runningBal
        });
      }
    }
  });

  // ── Inject monthly salary ──────────────────────────────────────────────────
  let salaryMonthDate = new Date(startDay.getFullYear(), startDay.getMonth(), 1);
  let monthIndex = 0;
  while (salaryMonthDate <= endDay) {
    const year = salaryMonthDate.getFullYear();
    const month = salaryMonthDate.getMonth();
    const salaryDate = getSalaryDateForMonth(year, month, settings);

    if (salaryDate >= startDay && salaryDate <= endDay) {
      const dateStr = formatDate(salaryDate);
      const narrative = buildSalaryNeftNarrative(bankStyle, companyName, salaryDate);
      
      let monthlySalaryPayout = baseSalaryAmount;
      if (settings.salaryMode !== 'manual') {
        if (monthIndex % 3 === 1) {
          monthlySalaryPayout += pick([450, 890, 1250]);
        } else if (monthIndex % 3 === 2) {
          monthlySalaryPayout -= pick([210, 480, 750]);
        } else if (monthIndex === 5) {
          monthlySalaryPayout += pick([3500, 5200, 8000]);
        }
      }

      totalTxs.push({
        id: `tx_sal_${salaryDate.getTime()}`,
        valueDate: dateStr,
        postDate: dateStr,
        details: narrative,
        refNo: generateRefNo(bankStyle),
        debit: null,
        credit: monthlySalaryPayout,
        balance: 0,
      });
    }
    salaryMonthDate.setMonth(salaryMonthDate.getMonth() + 1);
    monthIndex++;
  }

  // ── Inject Monthly SMS Alert Charges ───────────────────────────────────────
  let chargeMonth = new Date(startDay.getFullYear(), startDay.getMonth(), 25);
  while (chargeMonth <= endDay) {
    if (chargeMonth >= startDay) {
      const dateStr = formatDate(chargeMonth);
      totalTxs.push({
        id: `tx_sms_${chargeMonth.getTime()}`,
        valueDate: dateStr,
        postDate: dateStr,
        details: 'SMS ALERT CHARGES',
        refNo: generateRefNo(bankStyle),
        debit: 17.70,
        credit: null,
        balance: 0,
      });
    }
    chargeMonth.setMonth(chargeMonth.getMonth() + 1);
  }

  // ── Inject Annual Debit Card Maintenance Charges ───────────────────────────
  if (startDay <= endDay) {
    const cardChgDate = new Date(startDay.getFullYear(), startDay.getMonth() + 1, 12);
    if (cardChgDate >= startDay && cardChgDate <= endDay) {
      totalTxs.push({
        id: `tx_card_amc_${cardChgDate.getTime()}`,
        valueDate: formatDate(cardChgDate),
        postDate: formatDate(cardChgDate),
        details: 'DEBIT CARD ANNUAL CHARGES INCL GST',
        refNo: generateRefNo(bankStyle),
        debit: 147.50,
        credit: null,
        balance: 0,
      });
    }
  }

  // ── Inject Savings Bank Quarterly Interest ─────────────────────────────────
  const interestMonths = [1, 4, 7, 10];
  for (const im of interestMonths) {
    const iYear = im <= startDay.getMonth() ? startDay.getFullYear() + 1 : startDay.getFullYear();
    const iDate = new Date(iYear, im, 1, 9, 0, 0);
    if (iDate >= startDay && iDate <= endDay) {
      const interestAmount = parseFloat((randRange(115, 680) + Math.random()).toFixed(2));
      const dateStr = formatDate(iDate);
      const periodFrom = formatDate(new Date(iYear, im - 3, 1));
      const periodTo = formatDate(new Date(iYear, im, 0));

      totalTxs.push({
        id: `tx_interest_${iDate.getTime()}`,
        valueDate: dateStr,
        postDate: dateStr,
        details: buildSBIntNarrative('996018210007421', periodFrom, periodTo, bankStyle),
        refNo: generateRefNo(bankStyle),
        debit: null,
        credit: interestAmount,
        balance: 0,
      });
    }
  }

  // Sort chronologically and recalculate running balance from opening balance
  function parseDateStr(str: string): number {
    const [d, m, y] = str.split('-').map(Number);
    return new Date(y, m - 1, d).getTime();
  }

  totalTxs.sort((a, b) => parseDateStr(a.valueDate) - parseDateStr(b.valueDate));

  let bal = Math.floor(initialOpening) + paiseCarry;
  return totalTxs.map((tx) => {
    if (tx.credit) bal += tx.credit;
    if (tx.debit) bal -= tx.debit;
    bal = Math.round(bal * 100) / 100;
    return { ...tx, balance: bal };
  });
}

export function generateStatementTransactions(
  settings: StatementSettings,
  info: AccountInfo,
  localTime: string = new Date().toISOString(),
  customer?: CustomerDetails,
  branch?: BranchDetails
): Transaction[] {
  const businessSettings: StatementSettings = { ...settings, profile: 'Business' };
  const businessInfo: AccountInfo = {
    ...info,
    openingBalance: (info.openingBalance && info.openingBalance !== 90000.00 && info.openingBalance > 0)
      ? info.openingBalance
      : 90000.00
  };
  return generateRawSalariedTransactions(businessSettings, businessInfo, localTime, customer, branch);
}

export function generateSalariedStatementTransactions(
  settings: StatementSettings,
  info: AccountInfo,
  localTime: string = new Date().toISOString(),
  customer?: CustomerDetails,
  branch?: BranchDetails
): Transaction[] {
  const salariedSettings: StatementSettings = { ...settings, profile: 'Personal' };
  const salariedInfo: AccountInfo = {
    ...info,
    openingBalance: (!info.openingBalance || info.openingBalance === 90000.00)
      ? getRandomOpeningBalance()
      : info.openingBalance
  };
  return generateRawSalariedTransactions(salariedSettings, salariedInfo, localTime, customer, branch);
}