import { StatementRecord, SystemLog, CustomerDetails, BranchDetails, AccountInfo, StatementSettings } from '../types';

// Broadcasters for console feed
let logListeners: ((log: SystemLog) => void)[] = [];

export function addLogListener(listener: (log: SystemLog) => void) {
  logListeners.push(listener);
}

export function removeLogListener(listener: (log: SystemLog) => void) {
  logListeners = logListeners.filter(l => l !== listener);
}

export function logToSystem(channel: SystemLog['channel'], level: SystemLog['level'], message: string) {
  const newLog: SystemLog = {
    id: `log_${Date.now()}_${Math.random()}`,
    timestamp: new Date().toLocaleTimeString(),
    channel,
    level,
    message
  };
  
  // Persist logs in session
  const existing = sessionStorage.getItem('system_logs');
  const logsList = existing ? JSON.parse(existing) : [];
  logsList.push(newLog);
  // Cap at 100 logs
  if (logsList.length > 100) logsList.shift();
  sessionStorage.setItem('system_logs', JSON.stringify(logsList));
  
  logListeners.forEach(listener => listener(newLog));
}

// Initial Standard Mock Presets for easy user generation
export const CUSTOMER_PRESETS: {
  name: string;
  bank: 'SBI' | 'Kotak';
  customer: CustomerDetails;
  branch: BranchDetails;
  info: AccountInfo;
  settings: StatementSettings;
}[] = [
  {
    name: "S. K. Sharma (CEO, Spark Technologies)",
    bank: "SBI",
    customer: {
      accountHolderName: "SUDHIR KUMAR SHARMA",
      email: "sudhir.sharma@sparktech.co.in",
      address: "B-402, Block 4, Prestige Whispering Palms, Whitefield, Bangalore, Karnataka - 560066",
      accountNumber: "30524185263",
      cifNumber: "85962145321",
      accountOpenDate: "2015-04-12",
      nomineeName: "MEENAKSHI SHARMA (WIFE)"
    },
    branch: {
      branchName: "WHITEFIELD INDUSTRIAL AREA BRANCH",
      branchAddress: "ITPL Main Road, Bangalore, Landmark near Shanti Sagar",
      branchCode: "SBIN0005214",
      branchEmail: "sbi.05214@sbi.co.in",
      branchPhone: "+91-80-28563212",
      ifscCode: "SBIN0005214",
      micrCode: "560002142",
      ckycrNumber: "8954712365412"
    },
    info: {
      openingBalance: 450000.00,
      interestRate: 2.70,
      currency: 'INR',
      accountStatus: 'Active',
      accountType: 'Savings'
    },
    settings: {
      bankStyle: 'SBI',
      duration: '3 Months',
      pageCount: '2 Pages',
      customTransactionsCount: 32,
      transactionMode: 'High',
      profile: 'Personal'
    }
  },
  {
    name: "Anshuman Roy (Senior Software Dev)",
    bank: "Kotak",
    customer: {
      accountHolderName: "ANSHUMAN ROY",
      email: "anshuman.roy92@gmail.com",
      address: "Flat 503, Tower C, Elita Promenade, J.P. Nagar 7th Phase, Bangalore, Karnataka - 560078",
      accountNumber: "8412563984",
      cifNumber: "74512963",
      accountOpenDate: "2019-11-22",
      nomineeName: "RITA ROY (MOTHER)"
    },
    branch: {
      branchName: "J P NAGAR BRANCH - BANGALORE",
      branchAddress: "No. 42, 24th Main Road, JP Nagar 1st Phase, Bangalore",
      branchCode: "KKBK0000421",
      branchEmail: "jpnagar@kotak.com",
      branchPhone: "+91-80-26457812",
      ifscCode: "KKBK0000421",
      micrCode: "560485002",
      ckycrNumber: "741258963214"
    },
    info: {
      openingBalance: 120000.00,
      interestRate: 3.50,
      currency: 'INR',
      accountStatus: 'Active',
      accountType: 'Savings'
    },
    settings: {
      bankStyle: 'Kotak',
      duration: '1 Month',
      pageCount: '1 Page',
      customTransactionsCount: 12,
      transactionMode: 'Normal',
      profile: 'Personal'
    }
  },
  {
    name: "Mahindra Trading Corp (Current Account)",
    bank: "Kotak",
    customer: {
      accountHolderName: "MAHINDRA TRADING CORPORATION",
      email: "finance@mahindratrades.in",
      address: "Shop No. 12, APMC Market, Vashi, Navi Mumbai, Maharashtra - 400703",
      accountNumber: "9910541285",
      cifNumber: "55124963",
      accountOpenDate: "2012-08-01",
      nomineeName: "NOT REG (PROPRIETORSHIP)"
    },
    branch: {
      branchName: "VASHI APMC MARKET BRANCH",
      branchAddress: "Plot No. 11, Sector-19, Vashi, Navi Mumbai, Maharashtra",
      branchCode: "KKBK0001052",
      branchEmail: "apmc.vashi@kotak.com",
      branchPhone: "+91-22-27891244",
      ifscCode: "KKBK0001052",
      micrCode: "400485042",
      ckycrNumber: "951478523698"
    },
    info: {
      openingBalance: 1250000.00,
      interestRate: 0.00, // Current account holds 0%
      currency: 'INR',
      accountStatus: 'Active',
      accountType: 'Current'
    },
    settings: {
      bankStyle: 'Kotak',
      duration: '6 Months',
      pageCount: '5 Pages',
      customTransactionsCount: 92,
      transactionMode: 'High',
      profile: 'Business'
    }
  }
];

// LocalStorage statements CRUD operations with verbose Electron simulated console prints
export function loadStatementsFromLocal(): StatementRecord[] {
  logToSystem('PRISMA_ORM', 'INFO', 'Invoking prisma.statementGeneration.findMany() query...');
  logToSystem('SQLITE_DB', 'DEBUG', 'EXECUTE: SELECT * FROM "StatementGeneration" ORDER BY "createdAt" DESC');
  
  const raw = localStorage.getItem('local_statements_db');
  if (!raw) {
    // Generate a default statement if database is empty on first boot
    logToSystem('SQLITE_DB', 'WARN', 'SQLite Database file is empty. Initializing empty collection.');
    return [];
  }
  try {
    const list = JSON.parse(raw) as StatementRecord[];
    logToSystem('PRISMA_ORM', 'INFO', `Successfully fetched list of ${list.length} records.`);
    return list;
  } catch (err) {
    logToSystem('SYSTEM', 'ERROR', 'Could not read localStorage database file corrupt!');
    return [];
  }
}

export function saveStatementToLocal(record: StatementRecord): StatementRecord[] {
  logToSystem('PRISMA_ORM', 'INFO', `Invoking prisma.statementGeneration.create() with record ID: ${record.id}`);
  logToSystem('SQLITE_DB', 'DEBUG', `EXECUTE: INSERT INTO "StatementGeneration" ("id", "createdAt", "holderName", "accountNumber") VALUES ('${record.id}', '${record.createdAt}', '${record.customerDetails.accountHolderName}', '${record.customerDetails.accountNumber}')`);
  
  const list = loadStatementsFromLocal();
  // Check if we are updating an existing record (e.g. with the same id)
  const existingIdx = list.findIndex(item => item.id === record.id);
  if (existingIdx !== -1) {
    list[existingIdx] = record;
    logToSystem('PRISMA_ORM', 'INFO', `Updated existing statement generation with UUID: ${record.id}`);
  } else {
    list.unshift(record);
    logToSystem('PRISMA_ORM', 'INFO', `Statement generated and synced inside sqlite container with UUID: ${record.id}`);
  }
  
  localStorage.setItem('local_statements_db', JSON.stringify(list));
  logToSystem('SYSTEM', 'INFO', `File Sync complete for UUID: ${record.id}`);
  return list;
}

export function deleteStatementFromLocal(id: string): StatementRecord[] {
  logToSystem('PRISMA_ORM', 'INFO', `Invoking prisma.statementGeneration.delete() for record ID: ${id}`);
  logToSystem('SQLITE_DB', 'DEBUG', `EXECUTE: DELETE FROM "StatementGeneration" WHERE "id" = '${id}'`);
  
  const list = loadStatementsFromLocal();
  const filtered = list.filter(item => item.id !== id);
  localStorage.setItem('local_statements_db', JSON.stringify(filtered));
  logToSystem('SYSTEM', 'WARN', `Statement record ${id} permanetly erased from SQLite database container.`);
  return filtered;
}

export function clearAllStatementsFromLocal(): StatementRecord[] {
  logToSystem('PRISMA_ORM', 'WARN', 'Invoking prisma.statementGeneration.deleteMany() - Erasing all data history!');
  logToSystem('SQLITE_DB', 'DEBUG', 'EXECUTE: TRUNCATE TABLE "StatementGeneration"');
  
  localStorage.removeItem('local_statements_db');
  logToSystem('SYSTEM', 'WARN', 'Prisma Schema clean complete.');
  return [];
}
