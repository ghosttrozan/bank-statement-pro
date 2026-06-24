import { Transaction, StatementSettings, AccountInfo } from '../types';

// Helper to generate a random number in a range
function randRange(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

// Generate realistic Indian-sounding reference numbers with correct lengths
export function generateRefNo(type: string): string {
  const randNum = () => Math.floor(Math.random() * 10);
  return Array.from({ length: 12 }, randNum).join('');
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
    case '2 Pages': return 32;
    case '3 Pages': return 52;
    case '5 Pages': return 92;
    case '10 Pages': return 192;
    case '20 Pages': return 392;
    case 'Custom': return Math.max(5, Math.min(500, customVal));
    default: return 75; // Default to ~75 transactions
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

// List of Indian companies for salary credits (salaried mode)
const SALARY_COMPANIES = [
  'INFOSYS BPO LTD',
  'TATA CONSULTANCY SERVICES LTD',
  'WIPRO LIMITED',
  'HCL TECHNOLOGIES LTD',
  'TECH MAHINDRA LTD',
  'COGNIZANT TECHNOLOGY SOLUTIONS',
  'ACCENTURE SOLUTIONS PVT LTD',
  'CAPGEMINI INDIA PVT LTD',
  'MPHASIS LIMITED',
  'HEXAWARE TECHNOLOGIES LTD',
  'L&T INFOTECH LTD',
  'MINDTREE LIMITED',
  'PERSISTENT SYSTEMS LTD',
  'ORACLE FINANCIAL SERVICES',
  'SAP INDIA PVT LTD',
  'IBM INDIA PVT LTD',
  'AMAZON DEVELOPMENT CENTRE INDIA',
  'FLIPKART INTERNET PVT LTD',
  'ZOMATO LTD',
  'PAYTM PAYMENTS BANK LTD',
  'HDFC BANK LIMITED PAYROLL',
  'AXIS BANK SALARY CREDIT',
  'ICICI SECURITIES LTD',
  'BAJAJ FINSERV LTD',
  'RELIANCE JIO INFOCOMM LTD',
  'MAHINDRA AND MAHINDRA LTD',
  'MARUTI SUZUKI INDIA LTD',
  'BRITANNIA INDUSTRIES LTD',
  'GODREJ CONSUMER PRODUCTS LTD',
  'ITC LIMITED SALARY'
];

function getRandomCompany(): string {
  return SALARY_COMPANIES[Math.floor(Math.random() * SALARY_COMPANIES.length)];
}

// Salary amount: random between 20k-80k, consistent per month (fixed for each 1st)
function getRandomSalaryAmount(): number {
  // Pick from ranges to feel realistic
  const ranges = [
    [20000, 35000],
    [35000, 55000],
    [55000, 80000],
  ];
  const r = Math.random();
  let range: number[];
  if (r < 0.35) range = ranges[0];
  else if (r < 0.70) range = ranges[1];
  else range = ranges[2];
  const raw = randRange(range[0], range[1]);
  // Round to nearest 100
  return Math.round(raw / 100) * 100;
}

// List of Indian Names for transaction partner details
const INDIAN_NAMES = [
  'Amit Sharma', 'Rahul Verma', 'Sanjay Gupta', 'Priya Patel', 'Deepak Rao',
  'Sandeep Singh', 'Anjali Desai', 'Rajesh Kumar', 'Sunita Sharma', 'Vijay Yadav',
  'Vikram Malhotra', 'Meera Nair', 'Arjun Reddy', 'Neha Kapoor', 'Rohit Joshi',
  'Pooja Mehta', 'Suresh Prabhu', 'Ganesh Hegde', 'Lakshmi Iyer', 'Harish Sen',
  'Ritu Mishra', 'Jitendra Pal', 'Aditya Birla', 'Divya Pillai', 'Manish Pandey',
  'Nisha Shah', 'Kiran Mazumdar', 'Abhishek Bachchan', 'Shruti Hassan', 'Siddharth Roy'
];

// List of Banks and their specified distributions
const BANKS = [
  { code: 'IDFB', weight: 18 },
  { code: 'ICIC', weight: 15 },
  { code: 'UTIB', weight: 13 },
  { code: 'CBIN', weight: 12 },
  { code: 'BARB', weight: 10 },
  { code: 'SBIN', weight: 10 },
  { code: 'INDB', weight: 8 },
  { code: 'PUNB', weight: 6 },
  { code: 'BKID', weight: 5 },
  { code: 'KKBK', weight: 3 }
];

function getRandomBank(): string {
  const r = Math.random() * 100;
  let sum = 0;
  for (const b of BANKS) {
    sum += b.weight;
    if (r <= sum) return b.code;
  }
  return 'SBIN';
}

function getRandomName(): string {
  return INDIAN_NAMES[Math.floor(Math.random() * INDIAN_NAMES.length)].toUpperCase();
}

// Generate Credit Amount based on distribution targeting 29k-32k average
function getRandomCreditAmount(): number {
  const r = Math.random();
  let amount = 0;
  if (r < 0.20) {
    // 20% ₹15,000 - ₹20,000 (average ₹18,500)
    amount = randRange(17000, 20000);
  } else if (r < 0.55) {
    // 35% ₹20,000 - ₹30,000 (average ₹27,000)
    amount = randRange(24000, 30000);
  } else {
    // 45% ₹30,000 - ₹40,000 (average ₹37,000)
    amount = randRange(34000, 40000);
  }

  // 95% rounded values
  if (Math.random() < 0.95) {
    const bases = [100, 500, 1000];
    const base = bases[Math.floor(Math.random() * bases.length)];
    amount = Math.round(amount / base) * base;
  } else {
    amount = Math.round(amount);
  }
  return amount;
}

// Generate Debit Amount based on distribution targeting 21k-25k average
function getRandomDebitAmount(): number {
  const r = Math.random();
  let amount = 0;
  if (r < 0.25) {
    // 25% ₹15,000 - ₹18,000 (average ₹16,500)
    amount = randRange(15000, 18000);
  } else if (r < 0.70) {
    // 45% ₹18,000 - ₹25,000 (average ₹21,500)
    amount = randRange(18000, 25000);
  } else {
    // 30% ₹25,000 - ₹30,000 (average ₹27,500)
    amount = randRange(25000, 30000);
  }

  // 95% rounded values
  if (Math.random() < 0.95) {
    const bases = [100, 500, 1000];
    const base = bases[Math.floor(Math.random() * bases.length)];
    amount = Math.round(amount / base) * base;
  } else {
    amount = Math.round(amount);
  }
  return amount;
}

// Relative frequencies of transactions on active days
function getRandomActiveDayTxCount(): number {
  const r = Math.random() * 80;
  if (r < 15) return 1;   // 15%
  if (r < 35) return 2;   // 20%
  if (r < 55) return 3;   // 20%
  if (r < 65) return 4;   // 10%
  if (r < 73) return 5;   // 8%
  if (r < 77) return 6;   // 4%
  if (r < 79) return 7;   // 2%
  return 8;               // 1%
}

// Generate a raw statement (to be wrapped in a retry loop)
function generateRawStatementTransactions(
  settings: StatementSettings,
  info: AccountInfo,
  localTime: string
): Transaction[] {
  // 1. Establish the dates boundaries: fixed start = 01 Jan 2026, end = today
  const currentDate = localTime ? new Date(localTime) : new Date();
  const startDay = new Date(2026, 0, 1, 0, 0, 0);  // 01-01-2026 hardcoded
  const endDay = new Date(currentDate.getTime());
  endDay.setHours(23, 59, 59, 999);
  
  // Calculate total number of days in range dynamically
  const totalDays = Math.max(1, Math.round((endDay.getTime() - startDay.getTime()) / (1000 * 60 * 60 * 24)));
  
  // 2. Select active days based on target transaction count
  const targetTxCount = Math.max(10, settings.pageCount === 'Custom' 
    ? settings.customTransactionsCount 
    : getPageToTxCount(settings.pageCount));

  const jan1TxCount = randRange(5, 10);
  const todayTxCount = randRange(5, 15);
  const adjustedTargetTxCount = Math.max(targetTxCount, jan1TxCount + todayTxCount + 10);

  const numActiveDaysInBetween = Math.min(totalDays - 1, Math.max(5, Math.round((adjustedTargetTxCount - jan1TxCount - todayTxCount) / 2.5)));
  const activeDayIndices = new Set<number>();
  
  while (activeDayIndices.size < numActiveDaysInBetween) {
    activeDayIndices.add(randRange(1, totalDays - 1));
  }
  
  // Sort indices to map chronologically
  const sortedInBetweenIndices = Array.from(activeDayIndices).sort((a, b) => a - b);
  
  // Build active days config for in-between days
  const inBetweenConfigs: { date: Date; txCount: number }[] = sortedInBetweenIndices.map(idx => {
    const activeDate = new Date(startDay.getTime());
    activeDate.setDate(startDay.getDate() + idx);
    return { date: activeDate, txCount: 1 };
  });

  // Distribute remaining transactions to in-between days
  let remainingTx = adjustedTargetTxCount - jan1TxCount - todayTxCount - numActiveDaysInBetween;
  while (remainingTx > 0) {
    const idx = randRange(0, inBetweenConfigs.length - 1);
    if (inBetweenConfigs[idx].txCount < 8) {
      inBetweenConfigs[idx].txCount++;
      remainingTx--;
    }
  }

  // Combine Jan 1st, in-between days, and today's date
  const activeDaysConfig: { date: Date; txCount: number }[] = [
    { date: new Date(startDay.getTime()), txCount: jan1TxCount },
    ...inBetweenConfigs,
    { date: new Date(endDay.getTime()), txCount: todayTxCount }
  ];

  const totalTxCount = adjustedTargetTxCount;

  // 3. Generate transaction types sequence using steering algorithm to hit balance targets and prevent negative balance
  const targetCrCount = Math.round((860000 + 23000 * totalTxCount) / 53000);
  let crLeft = targetCrCount;
  let drLeft = totalTxCount - targetCrCount;
  
  let tempBalance = info.openingBalance;
  const txTypes: ('CR' | 'DR')[] = [];
  
  for (let i = 0; i < totalTxCount; i++) {
    let chosenType: 'CR' | 'DR';
    if (tempBalance < 150000 && crLeft > 0) {
      chosenType = 'CR';
    } else if (tempBalance > 950000 && drLeft > 0) {
      chosenType = 'DR';
    } else if (crLeft === 0) {
      chosenType = 'DR';
    } else if (drLeft === 0) {
      chosenType = 'CR';
    } else {
      const prob = crLeft / (crLeft + drLeft);
      chosenType = Math.random() < prob ? 'CR' : 'DR';
    }
    
    if (chosenType === 'CR') {
      crLeft--;
      tempBalance += 30000;
    } else {
      drLeft--;
      tempBalance -= 23000;
    }
    txTypes.push(chosenType);
  }

  // 4. Construct raw transaction placeholders with dates and times
  const rawTxList: { date: Date; type: 'CR' | 'DR' }[] = [];
  let txIdx = 0;
  
  for (const config of activeDaysConfig) {
    const dayTransactions: { date: Date; type: 'CR' | 'DR' }[] = [];
    for (let k = 0; k < config.txCount; k++) {
      const txTime = new Date(config.date.getTime());
      const hour = randRange(8, 20);
      const min = randRange(0, 59);
      const sec = randRange(0, 59);
      txTime.setHours(hour, min, sec);
      dayTransactions.push({ date: txTime, type: txTypes[txIdx++] });
    }
    // Sort transactions within the same day chronologically
    dayTransactions.sort((a, b) => a.date.getTime() - b.date.getTime());
    rawTxList.push(...dayTransactions);
  }

  // 5. Calculate daily transactions, amounts, and apply quarterly interest credits
  const finalTransactions: Transaction[] = [];
  let runningBalance = info.openingBalance;
  let interestAccumulator = 0;
  let rawTxPointer = 0;

  // Iterate day by day
  const curDate = new Date(startDay.getTime());
  while (curDate <= endDay) {
    const curYear = curDate.getFullYear();
    const curMonth = curDate.getMonth();
    const curDay = curDate.getDate();

    // Check if there are transactions on this day
    const dayTransactions: Transaction[] = [];
    while (rawTxPointer < rawTxList.length) {
      const tx = rawTxList[rawTxPointer];
      if (
        tx.date.getFullYear() === curYear &&
        tx.date.getMonth() === curMonth &&
        tx.date.getDate() === curDay
      ) {
        const isCredit = tx.type === 'CR';
        const amount = isCredit ? getRandomCreditAmount() : getRandomDebitAmount();
        
        const isUpi = Math.random() < 0.80;
        let details = '';
        const reference = generateRefNo(isUpi ? 'UPI' : 'IMPS');
        const partnerName = getRandomName();
        const partnerBank = getRandomBank();

        if (isUpi) {
          if (isCredit) {
            details = `BY TRANSFER-UPI/CR/${reference}/${partnerName}/${partnerBank}/Payme-`;
          } else {
            details = `TO TRANSFER-UPI/DR/${reference}/${partnerName}/${partnerBank}/Payme-`;
          }
        } else {
          // 20% non-UPI
          if (isCredit) {
            if (Math.random() < 0.50) {
              details = `BY TRANSFER-INB IMPS/CR/${reference}/${partnerName}/${partnerBank}/Payme-`;
            } else {
              const neftRef = Array.from({ length: 11 }, () => Math.floor(Math.random() * 10)).join('');
              details = `BY TRANSFER-NEFT*SBIN*${neftRef}*${partnerName}`;
            }
          } else {
            // Debit
            const rVal = Math.random();
            if (rVal < 0.40) {
              const atmRef = randRange(1000, 9999);
              details = `TO ATM WD-ATM CARD-${atmRef} GOVINDPURA BHOPAL`;
            } else if (rVal < 0.70) {
              details = `TO TRANSFER-INB IMPS/DR/${reference}/${partnerName}/${partnerBank}/Payme-`;
            } else {
              details = `TO TRANSFER-INB MOBILE BANKING/${reference}/${partnerName}`;
            }
          }
        }

        if (isCredit) {
          runningBalance += amount;
        } else {
          runningBalance -= amount;
        }

        const dateStr = formatDate(tx.date);
        dayTransactions.push({
          id: `tx_${rawTxPointer}_${tx.date.getTime()}`,
          valueDate: dateStr,
          postDate: dateStr,
          details,
          refNo: reference,
          debit: isCredit ? null : amount,
          credit: isCredit ? amount : null,
          balance: runningBalance
        });

        rawTxPointer++;
      } else {
        break;
      }
    }

    finalTransactions.push(...dayTransactions);

    // Accumulate daily interest
    const dailyInterest = runningBalance * 0.025 / 365;
    interestAccumulator += dailyInterest;

    // Quarterly interest credit dates (March 25, June 25, September 25, December 25)
    const isMarch25 = curMonth === 2 && curDay === 25;
    const isJune25 = curMonth === 5 && curDay === 25;
    const isSept25 = curMonth === 8 && curDay === 25;
    const isDec25 = curMonth === 11 && curDay === 25;

    if (isMarch25 || isJune25 || isSept25 || isDec25) {
      const interestAmount = Math.round(interestAccumulator);
      if (interestAmount > 0) {
        runningBalance += interestAmount;
        
        const dateStr = formatDate(curDate);
        finalTransactions.push({
          id: `tx_interest_${curDate.getTime()}`,
          valueDate: dateStr,
          postDate: dateStr,
          details: 'BY INTEREST CREDIT',
          refNo: 'INTEREST',
          debit: null,
          credit: interestAmount,
          balance: runningBalance
        });
      }
      interestAccumulator = 0;
    }

    curDate.setDate(curDate.getDate() + 1);
  }

  return finalTransactions;
}

// Main entry point with retry logic to ensure final balance stays within bounds (8L to 11L)
export function generateStatementTransactions(
  settings: StatementSettings,
  info: AccountInfo,
  localTime: string
): Transaction[] {
  let attempts = 0;
  while (attempts < 100) {
    const transactions = generateRawStatementTransactions(settings, info, localTime);
    if (transactions.length > 0) {
      const finalBalance = transactions[transactions.length - 1].balance;
      // Guarantee final balance is between 8 Lakh and 11 Lakh
      if (finalBalance >= 800000 && finalBalance <= 1100000) {
        return transactions;
      }
    }
    attempts++;
  }
  // Fallback if bounds are not hit after 100 attempts
  return generateRawStatementTransactions(settings, info, localTime);
}

// ─────────────────────────────────────────────────────────────────────────────
// SALARIED MODE — Realistic everyday-life transactions
// Debits: small daily expenses (shopping, food, recharge, bills, ATM)
// Credits: salary on 1st of each month + occasional small credits (cashback, family)
// ─────────────────────────────────────────────────────────────────────────────

// ── Salaried Debit Types ──────────────────────────────────────────────────────
// Each entry: { detailsFn: () => string, amountFn: () => number, weight: number }

// Small everyday UPI debit details generators
const SALARIED_DEBIT_TEMPLATES: { detail: () => string; amount: () => number; weight: number }[] = [
  // Grocery / Kirana
  {
    detail: () => {
      const stores = ['DMART RETAIL', 'BIG BAZAAR', 'RELIANCE FRESH', 'MORE SUPERMARKET', 'SPENCERS RETAIL', 'METRO CASH CARRY', 'VISHAL MEGA MART'];
      return `TO TRANSFER-UPI/DR/${genRef()}/${pick(stores)}/UTIB/Payme-`;
    },
    amount: () => randRange(200, 2500),
    weight: 18,
  },
  // Mobile Recharge / DTH
  {
    detail: () => {
      const ops = ['AIRTEL PAYMENTS BANK', 'JIO RECHARGE', 'VODAFONE IDEA LTD', 'BSNL RECHARGE', 'TATASKY DTH', 'DISH TV RECHARGE'];
      return `TO TRANSFER-UPI/DR/${genRef()}/${pick(ops)}/ICIC/Payme-`;
    },
    amount: () => {
      const plans = [149, 179, 199, 239, 249, 299, 349, 399, 449, 499, 599, 719, 749, 839, 999];
      return pick(plans);
    },
    weight: 12,
  },
  // Food Delivery / Restaurants
  {
    detail: () => {
      const apps = ['SWIGGY ORDER', 'ZOMATO FOOD', 'DOMINOS PIZZA', 'MCDONALDS INDIA', 'KFC INDIA', 'SUBWAY INDIA', 'BARBEQUE NATION', 'HALDIRAMS FOODS'];
      return `TO TRANSFER-UPI/DR/${genRef()}/${pick(apps)}/ICIC/Payme-`;
    },
    amount: () => randRange(80, 800),
    weight: 14,
  },
  // Electricity / Utility Bills
  {
    detail: () => {
      const bills = ['MPEZ ELECTRICITY BILL', 'BSES RAJDHANI POWER', 'TATA POWER DELHI', 'ADANI ELECTRICITY', 'CESC KOLKATA'];
      return `TO TRANSFER-UPI/DR/${genRef()}/${pick(bills)}/SBIN/Payme-`;
    },
    amount: () => randRange(600, 3000),
    weight: 5,
  },
  // Online Shopping
  {
    detail: () => {
      const shops = ['AMAZON SELLER SVCS', 'FLIPKART INTERNET', 'MEESHO SUPPLY CHAIN', 'MYNTRA JABONG', 'AJIO FASHION', 'SNAPDEAL ONLINE'];
      return `TO TRANSFER-UPI/DR/${genRef()}/${pick(shops)}/IDFB/Payme-`;
    },
    amount: () => randRange(149, 2999),
    weight: 11,
  },
  // Petrol / Fuel
  {
    detail: () => {
      const stations = ['INDIAN OIL PETROL PUMP', 'HP PETROL PUMP', 'BHARAT PETROLEUM', 'SHELL FUEL STATION'];
      return `TO TRANSFER-UPI/DR/${genRef()}/${pick(stations)}/BARB/Payme-`;
    },
    amount: () => randRange(300, 2000),
    weight: 8,
  },
  // Medical / Pharmacy
  {
    detail: () => {
      const medical = ['APOLLO PHARMACY', 'MEDPLUS PHARMACY', '1MG TECHNOLOGIES', 'NETMEDS MARKETPLACE', 'FORTIS HEALTHCARE'];
      return `TO TRANSFER-UPI/DR/${genRef()}/${pick(medical)}/ICIC/Payme-`;
    },
    amount: () => randRange(50, 1500),
    weight: 7,
  },
  // ATM Withdrawal (small)
  {
    detail: () => {
      const atmLocs = ['GOVINDPURA BHOPAL', 'MP NAGAR BHOPAL', 'ARERA COLONY BHOPAL', 'HOSHANGABAD RD', 'NEW MARKET BHOPAL'];
      const atmRef = randRange(1000, 9999);
      return `TO ATM WD-ATM CARD-${atmRef} ${pick(atmLocs)}`;
    },
    amount: () => {
      const amounts = [500, 1000, 1500, 2000, 2500, 3000];
      return pick(amounts);
    },
    weight: 10,
  },
  // OTT Subscription
  {
    detail: () => {
      const ott = ['NETFLIX INDIA', 'HOTSTAR DISNEY', 'AMAZON PRIME VIDEO', 'SONY LIV SPORTS', 'ZEEE5 DIGITAL', 'JIOCINEMA OTT'];
      return `TO TRANSFER-UPI/DR/${genRef()}/${pick(ott)}/ICIC/Payme-`;
    },
    amount: () => {
      const plans = [99, 149, 179, 199, 249, 299, 499, 649];
      return pick(plans);
    },
    weight: 4,
  },
  // UPI to person (small personal payments)
  {
    detail: () => {
      const name = getRandomName();
      const bank = getRandomBank();
      return `TO TRANSFER-UPI/DR/${genRef()}/${name}/${bank}/Payme-`;
    },
    amount: () => randRange(50, 2000),
    weight: 14,
  },
  // Transport / Cab / Auto
  {
    detail: () => {
      const transport = ['OLA CABS INDIA', 'UBER INDIA SYS', 'RAPIDO BIKE TAXI', 'YULU BIKES', 'IRCTC RAIL TICKET', 'REDBUS TICKETING'];
      return `TO TRANSFER-UPI/DR/${genRef()}/${pick(transport)}/PAYTM/Payme-`;
    },
    amount: () => randRange(50, 600),
    weight: 9,
  },
  // Education / Books
  {
    detail: () => {
      const edu = ['BYJU LEARNING', 'UNACADEMY PLUS', 'COURSERA INC', 'UDEMY INDIA', 'VEDANTU INNOVATION'];
      return `TO TRANSFER-UPI/DR/${genRef()}/${pick(edu)}/ICIC/Payme-`;
    },
    amount: () => randRange(199, 1999),
    weight: 4,
  },
  // Insurance Premium
  {
    detail: () => {
      const ins = ['LIC PREMIUM ONLINE', 'HDFC LIFE INSURANCE', 'SBI LIFE INSURANCE', 'BAJAJ ALLIANZ GEN', 'ICICI PRUDENTIAL'];
      const ref = genRef();
      return `TO TRANSFER-NEFT*SBIN*${ref}*${pick(ins)}`;
    },
    amount: () => randRange(500, 3000),
    weight: 4,
  },
];

// ── Salaried small Credit Types (family, cashback, refunds) ───────────────────
const SALARIED_CREDIT_TEMPLATES: { detail: () => string; amount: () => number; weight: number }[] = [
  // Family transfer
  {
    detail: () => {
      const name = getRandomName();
      const bank = getRandomBank();
      return `BY TRANSFER-UPI/CR/${genRef()}/${name}/${bank}/Payme-`;
    },
    amount: () => randRange(200, 3000),
    weight: 40,
  },
  // Cashback / Refund
  {
    detail: () => {
      const src = ['AMAZON REFUND', 'FLIPKART REFUND', 'SWIGGY CASHBACK', 'PAYTM CASHBACK', 'PHONEPE CASHBACK', 'GPAY REWARD'];
      return `BY TRANSFER-UPI/CR/${genRef()}/${pick(src)}/ICIC/Payme-`;
    },
    amount: () => randRange(10, 500),
    weight: 35,
  },
  // NEFT from friend/family
  {
    detail: () => {
      const name = getRandomName();
      const ref = genRef();
      return `BY TRANSFER-NEFT*SBIN*${ref}*${name}`;
    },
    amount: () => randRange(500, 2000),
    weight: 25,
  },
];

// ── Helper: pick random item from array ──────────────────────────────────────
function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}
function genRef(): string {
  return Array.from({ length: 12 }, () => Math.floor(Math.random() * 10)).join('');
}

// ── Weighted random picker ───────────────────────────────────────────────────
function weightedPick<T extends { weight: number }>(items: T[]): T {
  const total = items.reduce((s, i) => s + i.weight, 0);
  let r = Math.random() * total;
  for (const item of items) {
    r -= item.weight;
    if (r <= 0) return item;
  }
  return items[items.length - 1];
}

// ── Main Salaried Generator ──────────────────────────────────────────────────
function generateRawSalariedTransactions(
  settings: StatementSettings,
  info: AccountInfo,
  localTime: string
): Transaction[] {
  const currentDate = localTime ? new Date(localTime) : new Date();
  const startDay = new Date(2026, 0, 1, 0, 0, 0);  // 01-01-2026 hardcoded
  const endDay = new Date(currentDate.getTime());
  endDay.setHours(23, 59, 59, 999);

  // ── Fix salary info for entire statement ─────────────────────────────────
  const salaryAmount = getRandomSalaryAmount();
  const companyName = getRandomCompany();

  // ── Target transaction count (from settings) ─────────────────────────────
  const targetTxCount = Math.max(10, settings.pageCount === 'Custom'
    ? settings.customTransactionsCount
    : getPageToTxCount(settings.pageCount));

  // Number of days in range
  const totalDays = Math.max(1, Math.round((endDay.getTime() - startDay.getTime()) / (1000 * 60 * 60 * 24)));

  // ── Build all transactions ───────────────────────────────────────────────
  const jan1TxCount = randRange(5, 10);
  const todayTxCount = randRange(5, 15);
  const adjustedTargetTxCount = Math.max(targetTxCount, jan1TxCount + todayTxCount + 15);

  let runningBal = info.openingBalance;

  // Generate Jan 1st transactions (5-10)
  const jan1Times: Date[] = [];
  const jan1Date = new Date(startDay.getTime());
  for (let k = 0; k < jan1TxCount; k++) {
    const txTime = new Date(jan1Date.getTime());
    txTime.setHours(randRange(8, 22), randRange(0, 59), randRange(0, 59));
    jan1Times.push(txTime);
  }
  jan1Times.sort((a, b) => a.getTime() - b.getTime());

  const jan1Txs: Transaction[] = jan1Times.map((txTime, k) => {
    const isCredit = Math.random() < 0.15;
    const tmpl = isCredit ? weightedPick(SALARIED_CREDIT_TEMPLATES) : weightedPick(SALARIED_DEBIT_TEMPLATES);
    const amount = Math.round(tmpl.amount());
    if (isCredit) {
      runningBal += amount;
    } else {
      if (runningBal - amount < 2000) {
        runningBal = Math.max(2050, runningBal); // safeguard
      }
      runningBal -= amount;
    }
    const dateStr = formatDate(txTime);
    return {
      id: `tx_sl_jan_${k}_${txTime.getTime()}`,
      valueDate: dateStr,
      postDate: dateStr,
      details: tmpl.detail(),
      refNo: genRef(),
      debit: isCredit ? null : amount,
      credit: isCredit ? amount : null,
      balance: runningBal,
    };
  });

  // Generate in-between transactions on active days
  const numActiveDays = Math.min(totalDays - 1, Math.max(25, Math.round((adjustedTargetTxCount - jan1TxCount - todayTxCount) / 1.8)));
  const activeDayIndices = new Set<number>();
  while (activeDayIndices.size < numActiveDays) {
    activeDayIndices.add(randRange(1, totalDays - 1));
  }
  const sortedActiveDays = Array.from(activeDayIndices).sort((a, b) => a - b);

  const inBetweenTxs: Transaction[] = [];
  let txIdx = 0;
  const targetInBetweenTxCount = adjustedTargetTxCount - jan1TxCount - todayTxCount;

  for (const dayIdx of sortedActiveDays) {
    const txDate = new Date(startDay.getTime());
    txDate.setDate(startDay.getDate() + dayIdx);
    if (txDate > endDay) break;
    if (txIdx >= targetInBetweenTxCount) break;

    const txsThisDay = randRange(1, 3);
    const dayTxs: { time: Date; tx: Transaction }[] = [];

    for (let k = 0; k < txsThisDay; k++) {
      if (txIdx >= targetInBetweenTxCount) break;

      const txTime = new Date(txDate.getTime());
      txTime.setHours(randRange(8, 22), randRange(0, 59), randRange(0, 59));

      const isCredit = Math.random() < 0.15;

      if (isCredit) {
        const tmpl = weightedPick(SALARIED_CREDIT_TEMPLATES);
        const amount = Math.round(tmpl.amount());
        runningBal += amount;
        const dateStr = formatDate(txTime);
        dayTxs.push({
          time: txTime,
          tx: {
            id: `tx_sl_${txIdx}_${txTime.getTime()}`,
            valueDate: dateStr,
            postDate: dateStr,
            details: tmpl.detail(),
            refNo: genRef(),
            debit: null,
            credit: amount,
            balance: runningBal,
          },
        });
      } else {
        const tmpl = weightedPick(SALARIED_DEBIT_TEMPLATES);
        let amount = Math.round(tmpl.amount());
        if (runningBal - amount < 2000) {
          amount = Math.max(50, Math.floor(runningBal - 2000));
        }
        if (amount <= 0) { txIdx++; continue; }
        runningBal -= amount;
        const dateStr = formatDate(txTime);
        dayTxs.push({
          time: txTime,
          tx: {
            id: `tx_sl_${txIdx}_${txTime.getTime()}`,
            valueDate: dateStr,
            postDate: dateStr,
            details: tmpl.detail(),
            refNo: genRef(),
            debit: amount,
            credit: null,
            balance: runningBal,
          },
        });
      }
      txIdx++;
    }

    dayTxs.sort((a, b) => a.time.getTime() - b.time.getTime());
    inBetweenTxs.push(...dayTxs.map(d => d.tx));
  }

  // Now generate today's transactions (5-15) using the accumulated runningBal
  const todayTimes: Date[] = [];
  for (let k = 0; k < todayTxCount; k++) {
    const txTime = new Date(endDay.getTime());
    txTime.setHours(randRange(8, 22), randRange(0, 59), randRange(0, 59));
    todayTimes.push(txTime);
  }
  todayTimes.sort((a, b) => a.getTime() - b.getTime());

  const todayTxs: Transaction[] = todayTimes.map((txTime, k) => {
    const isCredit = Math.random() < 0.15;
    const tmpl = isCredit ? weightedPick(SALARIED_CREDIT_TEMPLATES) : weightedPick(SALARIED_DEBIT_TEMPLATES);
    const amount = Math.round(tmpl.amount());
    if (isCredit) {
      runningBal += amount;
    } else {
      if (runningBal - amount < 2000) {
        runningBal = Math.max(2050, runningBal);
      }
      runningBal -= amount;
    }
    const dateStr = formatDate(txTime);
    return {
      id: `tx_sl_today_${k}_${txTime.getTime()}`,
      valueDate: dateStr,
      postDate: dateStr,
      details: tmpl.detail(),
      refNo: genRef(),
      debit: isCredit ? null : amount,
      credit: isCredit ? amount : null,
      balance: runningBal,
    };
  });

  const allTxs: Transaction[] = [...jan1Txs, ...inBetweenTxs, ...todayTxs];

  // ── Inject salary credits on 1st of each month ──────────────────────────
  const salaryTxs: { sortKey: number; tx: Transaction }[] = [];
  for (let m = 0; m < 6; m++) {
    const salaryDate = new Date(startDay.getFullYear(), startDay.getMonth() + m, 1, 10, 0, 0);
    if (salaryDate > currentDate) break;
    const dateStr = formatDate(salaryDate);
    const ref = genRef();
    const sortKey = salaryDate.getFullYear() * 10000 + (salaryDate.getMonth() + 1) * 100 + 1;
    salaryTxs.push({
      sortKey,
      tx: {
        id: `tx_salary_${m}_${salaryDate.getTime()}`,
        valueDate: dateStr,
        postDate: dateStr,
        details: `BY TRANSFER-NEFT*SBIN*${ref}*${companyName}`,
        refNo: ref,
        debit: null,
        credit: salaryAmount,
        balance: 0, // recalculated below
      },
    });
  }

  // ── Merge, sort, and recalculate balances ────────────────────────────────
  function dateStrToSortKey(dateStr: string): number {
    const [d, mo, y] = dateStr.split('-').map(Number);
    return y * 10000 + mo * 100 + d;
  }

  const merged: { sortKey: number; isSalary: boolean; tx: Transaction }[] = [
    ...allTxs.map(tx => ({ sortKey: dateStrToSortKey(tx.valueDate), isSalary: false, tx })),
    ...salaryTxs.map(s => ({ sortKey: s.sortKey, isSalary: true, tx: s.tx })),
  ];

  merged.sort((a, b) => {
    if (a.sortKey !== b.sortKey) return a.sortKey - b.sortKey;
    // Salary comes first on the 1st (credited at 10:00 AM)
    if (a.isSalary && !b.isSalary) return -1;
    if (!a.isSalary && b.isSalary) return 1;
    return 0;
  });

  // Recalculate running balance from opening balance
  let bal = info.openingBalance;
  return merged.map(({ tx }) => {
    if (tx.credit) bal += tx.credit;
    if (tx.debit) bal -= tx.debit;
    return { ...tx, balance: bal };
  });
}

export function generateSalariedStatementTransactions(
  settings: StatementSettings,
  info: AccountInfo,
  localTime: string
): Transaction[] {
  return generateRawSalariedTransactions(settings, info, localTime);
}

