export interface CustomerDetails {
  accountHolderName: string;
  email: string;
  address: string;
  accountNumber: string;
  cifNumber: string;
  accountOpenDate: string;
  nomineeName: string;
  city?: string;
  pinCode?: string;
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
  city?: string;
  pinCode?: string;
}

export interface AccountInfo {
  openingBalance: number;
  interestRate: number;
  currency: 'INR' | 'USD' | 'EUR' | 'GBP';
  accountStatus: 'Active' | 'Dormant' | 'Frozen';
  accountType: string;
}

export interface StatementSettings {
  bankStyle: 'SBI' | 'SBI2' | 'Kotak' | 'BOI' | 'PNB';

  duration: '1 Month' | '2 Months' | '3 Months' | '6 Months' | '12 Months';
  generationMode?: 'duration' | 'custom';
  fromDate?: string;
  toDate?: string;
  pageCount: '1 Page' | '2 Pages' | '3 Pages' | '5 Pages' | '10 Pages' | '15 Pages' | '20 Pages' | '30 Pages' | 'Custom';
  customTransactionsCount: number;
  transactionMode: 'Low' | 'Normal' | 'High';
  profile: 'Personal' | 'Business';
  salaryMode?: 'auto' | 'manual';
  companyName?: string;
  monthlySalary?: number;
  salaryDay?: string;
  pdfPassword?: string;
  enablePdfPassword?: boolean;
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
