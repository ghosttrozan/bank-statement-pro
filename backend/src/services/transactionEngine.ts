import { Transaction, StatementSettings, AccountInfo } from '../types/statement';

// Helper to generate a random number in a range
function randRange(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

// Generate realistic Indian-sounding reference numbers with correct lengths
export function generateRefNo(bankStyle?: string): string {
  const digits = Array.from({ length: 12 }, () => Math.floor(Math.random() * 10)).join('');
  if (bankStyle === 'IndusInd') {
    // IndusInd Bank uses 'S' prefix + 8 digits in RefNo column
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

// ─── Bank-Specific NEFT Salary Narrative Generator ────────────────────────────
function buildSalaryNeftNarrative(bankStyle: string, companyName: string): string {
  const neftRef = Array.from({ length: 12 }, () => Math.floor(Math.random() * 10)).join('');
  switch (bankStyle) {
    case 'BOI':
      return `NEFT/ICIC${neftRef}/CR/${companyName}`;
    case 'PNB':
      return `NEFT/PUNB${neftRef}/CR/${companyName} SALARY`;
    case 'Kotak':
      return `NEFT CR-KKBK${neftRef}-${companyName}-SALARY`;
    case 'SBI':
    default:
      return `BY TRANSFER-NEFT*IN${neftRef}*${companyName}*SALARY CREDIT`;
  }
}

// ─── Bank-Specific NEFT Credit Narrative ──────────────────────────────────────
function buildNeftCreditNarrative(bankStyle: string, senderName: string): string {
  const neftRef = Array.from({ length: 12 }, () => Math.floor(Math.random() * 10)).join('');
  switch (bankStyle) {
    case 'BOI': return `NEFT/SBINH${neftRef}/${senderName}`;
    case 'PNB': return `NEFT/PUNBH${neftRef}/${senderName}`;
    case 'Kotak': return `NEFT CR-KKBK${neftRef}-${senderName}`;
    case 'SBI': default: return `BY TRANSFER-NEFT*SBIN*${neftRef}*${senderName}`;
  }
}

const SOL_IP_RANGES = [
  () => `106.202.${randRange(1, 254)}.${randRange(1, 254)}`,
  () => `110.227.${randRange(1, 254)}.${randRange(1, 254)}`,
  () => `223.181.${randRange(1, 254)}.${randRange(1, 254)}`,
  () => `27.59.${randRange(1, 254)}.${randRange(1, 254)}`,
];

function buildSOLNarrative(): string {
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
  return SALARY_COMPANIES[Math.floor(Math.random() * SALARY_COMPANIES.length)];
}

function getRandomSalaryAmount(): number {
  const raw = randRange(35000, 180000);
  return Math.round(raw / 100) * 100;
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

const REAL_UPI_BANK_CODES = [
  { code: 'SBIN', weight: 15 },
  { code: 'BKID', weight: 12 },
  { code: 'UTIB', weight: 10 },
  { code: 'HDFC', weight: 10 },
  { code: 'ICIC', weight: 8 },
  { code: 'YESB', weight: 10 },
  { code: 'AIRP', weight: 8 },
];

const INDIAN_NAMES = [
  'Amit', 'Rahul', 'Sanjay', 'Priya', 'Deepak', 'Sandeep', 'Anjali',
  'Rajesh', 'Sunita', 'Vijay', 'Vikram', 'Meera', 'Arjun', 'Neha', 'Rohit'
];

function getRandomUpiName(): string {
  const full = INDIAN_NAMES[Math.floor(Math.random() * INDIAN_NAMES.length)];
  return full.substring(0, randRange(5, 6));
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

function getRandomUpiBank(): string {
  return weightedPick(REAL_UPI_BANK_CODES).code;
}

// ─── Bank-Specific Authentic UPI Narrative Generator ────────────────────────
function buildUpiNarrative(isCredit: boolean, bankStyle: string): string {
  const ref = genRef();
  const name = getRandomUpiName();
  const bank = getRandomUpiBank();
  const accountSuffix = Array.from({ length: randRange(6, 8) }, () => Math.floor(Math.random() * 10)).join('');
  const hh = String(randRange(8, 22)).padStart(2, '0');
  const mm = String(randRange(0, 59)).padStart(2, '0');
  const ss = String(randRange(0, 59)).padStart(2, '0');

  if (bankStyle === 'BOI') {
    // BOB World timestamp format: UPI/RefNo/HH:MM:SS/UPI/handle@bank/Payment
    const direction = isCredit ? 'CR' : 'DR';
    return `UPI/${ref}/${hh}:${mm}:${ss}/UPI/${name.toLowerCase()}${randRange(10, 99)}@${bank.toLowerCase()}/${direction}`;
  }

  // Union Bank (UBI) style uses UPIAR for debits, UPIAB for credits
  const tag = isCredit ? 'UPIAB' : 'UPIAR';
  const direction = isCredit ? 'CR' : 'DR';

  return `${tag}/${ref}/${direction}/${name}/${bank}/${accountSuffix}/Paymen`;
}

// ─── 75% Micro-Transaction Sizing Rules (< ₹1,000) ───────────────────────────
const SALARIED_DEBIT_TEMPLATES = [
  // 1. Micro-Payments (< ₹500) — Weight 65% (Real Statement Micro Density)
  { detail: (style: string) => buildUpiNarrative(false, style), amount: () => pick([10, 20, 30, 45, 50, 65, 80, 100, 120, 150, 180, 240, 299, 350, 499]), weight: 65 },
  
  // 2. Small Payments (₹500 - ₹1,500) — Weight 20%
  { detail: (style: string) => buildUpiNarrative(false, style), amount: () => randRange(500, 1500), weight: 20 },
  
  // 3. Round ATM Cash Withdrawals — Weight 10%
  { detail: () => {
      const locs = ['GOVINDPURA BHOPAL', 'NEW MARKET', 'ARERA COL', 'MP NAGAR', 'KHILCHIPUR', 'ASHTA'];
      return `TO ATM WD-ATM CARD-${randRange(1000, 9999)} ${pick(locs)}`;
    },
    amount: () => pick([500, 1000, 1500, 2000, 3000, 5000, 10000]), // Strictly round cash figures
    weight: 10
  },

  // 4. Loan EMI / Financial Deductions — Weight 5%
  { detail: () => pick([
      `ACHDR/HDB FINANCIAL SERVIC/${randRange(100000, 999999)}`,
      `CMS/BAJFINSERV/${randRange(10000000, 99999999)}`,
      `UPI/${genRef()}/DR/CREDTV/BARB/CREDEMI/RECURR`
    ]),
    amount: () => pick([499, 699, 1299, 2483, 3267, 4179]),
    weight: 5
  }
];

const SALARIED_CREDIT_TEMPLATES = [
  { detail: (style: string) => buildUpiNarrative(true, style), amount: () => pick([50, 100, 200, 300, 500, 1000, 1500, 2000]), weight: 70 },
  { detail: () => buildSOLNarrative(), amount: () => pick([2000, 3000, 5000, 8000, 9500]), weight: 30 },
];

function generateRawSalariedTransactions(
  settings: StatementSettings,
  info: AccountInfo,
  localTime: string
): Transaction[] {
  const { startDay, endDay } = getDateRange(settings, localTime);
  const bankStyle = settings.bankStyle;
  const { company: companyName, amount: salaryAmount } = getSalaryInfo(settings);

  const targetTxCount = Math.max(10, settings.pageCount === 'Custom'
    ? settings.customTransactionsCount
    : getPageToTxCount(settings.pageCount));

  // Initialize with exact paise carry (e.g. .04, .27, .74)
  const paiseCarry = parseFloat((Math.random()).toFixed(2));
  let runningBal = Math.floor(info.openingBalance) + paiseCarry;

  const totalTxs: Transaction[] = [];
  const totalDays = Math.max(1, Math.round((endDay.getTime() - startDay.getTime()) / (1000 * 60 * 60 * 24)));

  // Distribute transactions across duration range
  for (let i = 0; i < targetTxCount; i++) {
    const randomOffset = randRange(0, totalDays);
    const txDate = new Date(startDay.getTime());
    txDate.setDate(txDate.getDate() + randomOffset);
    txDate.setHours(randRange(8, 20), randRange(0, 59), randRange(0, 59));

    const isCredit = Math.random() < 0.20; // 80% Debits, 20% Credits
    const tmpl = isCredit ? weightedPick(SALARIED_CREDIT_TEMPLATES) : weightedPick(SALARIED_DEBIT_TEMPLATES);
    const amount = Math.round(tmpl.amount() * 100) / 100;

    if (isCredit) {
      runningBal += amount;
    } else {
      if (runningBal - amount < 100) {
        runningBal = Math.max(200, runningBal);
      }
      runningBal -= amount;
    }
    runningBal = Math.round(runningBal * 100) / 100;
    const dateStr = formatDate(txDate);

    totalTxs.push({
      id: `tx_${i}_${txDate.getTime()}`,
      valueDate: dateStr,
      postDate: dateStr,
      details: tmpl.detail(bankStyle),
      refNo: generateRefNo(bankStyle),
      debit: isCredit ? null : amount,
      credit: isCredit ? amount : null,
      balance: runningBal
    });
  }

  // ── Inject monthly salary on exact salary credit day ────────────────────────
  let salaryMonthDate = new Date(startDay.getFullYear(), startDay.getMonth(), 1);
  while (salaryMonthDate <= endDay) {
    const year = salaryMonthDate.getFullYear();
    const month = salaryMonthDate.getMonth();
    const salaryDate = getSalaryDateForMonth(year, month, settings);

    if (salaryDate >= startDay && salaryDate <= endDay) {
      const dateStr = formatDate(salaryDate);
      const narrative = buildSalaryNeftNarrative(bankStyle, companyName);
      totalTxs.push({
        id: `tx_sal_${salaryDate.getTime()}`,
        valueDate: dateStr,
        postDate: dateStr,
        details: narrative,
        refNo: generateRefNo(bankStyle),
        debit: null,
        credit: salaryAmount,
        balance: 0,
      });
    }
    salaryMonthDate.setMonth(salaryMonthDate.getMonth() + 1);
  }

  // ── Inject Monthly SMS Alert Charges (Automated Fee) ────────────────────────
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
        debit: 17.20,
        credit: null,
        balance: 0,
      });
    }
    chargeMonth.setMonth(chargeMonth.getMonth() + 1);
  }

  // ── Inject Savings Bank Quarterly Interest ─────────────────────────────────
  const interestMonths = [1, 4, 7, 10]; // Feb=1, May=4, Aug=7, Nov=10
  for (const im of interestMonths) {
    const iYear = im <= startDay.getMonth() ? startDay.getFullYear() + 1 : startDay.getFullYear();
    const iDate = new Date(iYear, im, 1, 9, 0, 0);
    if (iDate >= startDay && iDate <= endDay) {
      const interestAmount = parseFloat((randRange(15, 120) + Math.random()).toFixed(2));
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

  let bal = Math.floor(info.openingBalance) + paiseCarry;
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
  localTime: string = new Date().toISOString()
): Transaction[] {
  return generateRawSalariedTransactions(settings, info, localTime);
}

export function generateSalariedStatementTransactions(
  settings: StatementSettings,
  info: AccountInfo,
  localTime: string = new Date().toISOString()
): Transaction[] {
  return generateRawSalariedTransactions(settings, info, localTime);
}
