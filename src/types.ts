export interface CustomerDetails {
  accountHolderName: string;
  email: string;
  address: string;
  accountNumber: string;
  cifNumber: string;
  accountOpenDate: string;
  nomineeName: string;
}

export interface BranchDetails {
  branchName: string;
  branchAddress: string;
  branchCode: string;
  branchEmail: string;
  branchPhone: string;
  ifscCode: string;
  micrCode: string;
  ckycrNumber: string;
}

export interface AccountInfo {
  openingBalance: number;
  interestRate: number;
  currency: 'INR' | 'USD' | 'EUR' | 'GBP';
  accountStatus: 'Active' | 'Dormant' | 'Frozen';
  accountType: 'Savings' | 'Current';
}

export interface StatementSettings {
  bankStyle: 'SBI' | 'Kotak';
  duration: '1 Month' | '2 Months' | '3 Months' | '6 Months' | '12 Months';
  pageCount: '1 Page' | '2 Pages' | '3 Pages' | '5 Pages' | '10 Pages' | '20 Pages' | 'Custom';
  customTransactionsCount: number;
  transactionMode: 'Low' | 'Normal' | 'High';
  profile: 'Personal' | 'Business';
}

export interface Transaction {
  id: string;
  valueDate: string;
  postDate: string;
  details: string;
  refNo: string;
  debit: number | null;
  credit: number | null;
  balance: number;
}

export interface StatementRecord {
  id: string;
  createdAt: string;
  customerDetails: CustomerDetails;
  branchDetails: BranchDetails;
  accountInfo: AccountInfo;
  settings: StatementSettings;
  transactions: Transaction[];
  closingBalance: number;
  totalCredits: number;
  totalDebits: number;
  drCount: number;
  crCount: number;
}

export interface SystemLog {
  id: string;
  timestamp: string;
  channel: 'IPC_BRIDGE' | 'PRISMA_ORM' | 'SQLITE_DB' | 'SYSTEM';
  level: 'INFO' | 'DEBUG' | 'WARN' | 'ERROR';
  message: string;
}
