import { generateStatementTransactions } from '../services/transactionEngine';
import { CustomerDetails, BranchDetails, AccountInfo, StatementSettings, StatementRecord } from '../types/statement';
import * as fs from 'fs';
import * as path from 'path';

async function run() {
  const customer: CustomerDetails = {
    accountHolderName: 'Ms. NEHA SHARMA',
    email: 'neha.sharma@gmail.com',
    address: 'D/O: RATANLAL SHARMA DEEPLA KHEDI ASHTA NAZAR GANJ SEHORE MADHYA PRADESH',
    accountNumber: '45356528941', // Unpadded 11-digit account number
    cifNumber: '92487330553',
    accountOpenDate: '15/06/2018',
    nomineeName: 'No',
    city: 'SEHORE',
    pinCode: '466001',
  };

  const branch: BranchDetails = {
    branchName: 'ASHTA NAZAR GANJ',
    branchAddress: 'NAZAR GANJ, ASHTA, SEHORE',
    branchCode: '317',
    branchEmail: 'sbi.00317@sbi.co.in',
    branchPhone: '8989793482',
    ifscCode: 'SBIN0000317',
    micrCode: '466002002',
    ckycrNumber: 'CKYCR22035635104',
    city: 'SEHORE',
    pinCode: '466001',
  };

  const account: AccountInfo = {
    openingBalance: 40998.12,
    interestRate: 2.50,
    currency: 'INR',
    accountStatus: 'Active',
    accountType: 'REGULAR SAVINGS BANK ACCOUNT',
  };

  const settings: StatementSettings = {
    bankStyle: 'SBI2',
    duration: '6 Months',
    generationMode: 'custom',
    fromDate: '2026-02-01',
    toDate: '2026-08-29',
    pageCount: 'Custom',
    customTransactionsCount: 198,
    transactionMode: 'Normal',
    profile: 'Personal',
    salaryMode: 'manual',
    companyName: 'TATA ELXSI LIMITED',
    monthlySalary: 76500.00,
    salaryDay: '1',
  };

  const createdAt = new Date().toISOString();
  const transactions = generateStatementTransactions(
    settings,
    account,
    createdAt,
    customer,
    branch
  );

  const totalDebits = transactions.filter(t => t.debit !== null).reduce((sum, t) => sum + (t.debit || 0), 0);
  const totalCredits = transactions.filter(t => t.credit !== null).reduce((sum, t) => sum + (t.credit || 0), 0);
  const drCount = transactions.filter(t => t.debit !== null).length;
  const crCount = transactions.filter(t => t.credit !== null).length;
  const closingBalance = transactions.length > 0 ? (transactions[transactions.length - 1].balance || account.openingBalance) : account.openingBalance;

  const record: StatementRecord = {
    id: 'stmt_ts_' + Date.now(),
    createdAt,
    customerDetails: customer,
    branchDetails: branch,
    accountInfo: account,
    settings,
    transactions,
    closingBalance,
    totalCredits,
    totalDebits,
    drCount,
    crCount,
  };

  const outJsonPath = path.resolve(__dirname, '../../../neha_tx_data.json');
  fs.writeFileSync(outJsonPath, JSON.stringify(record, null, 2), 'utf-8');

  console.log('TS_TX_DATA_SAVED:', outJsonPath, '| TxCount:', transactions.length);
}

run().catch(console.error);
