import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import { Landmark, User, RefreshCw, LogOut, ShieldAlert, Building2, Calendar, ChevronsUpDown, Download, Loader2, FileCheck, CheckCircle2, ShieldCheck } from 'lucide-react';
import { Link } from 'react-router-dom';

// Components, Types & Hooks
import StatementPreview from '../components/StatementPreview';
import { generateStatementTransactions, generateSalariedStatementTransactions, formatDate, getRandomOpeningBalance } from '../lib/transactionEngine';
import { StatementRecord, CustomerDetails, BranchDetails, AccountInfo, StatementSettings, Transaction } from '../types';
import { logToSystem } from '../lib/dbBridge';
import { useAuth } from '../hooks/useAuth';
import { downloadStatementPdfFromBackend } from '../lib/pdfExport';
import api from '../lib/api';



type StatementType = 'salaried' | 'business';
type StatementDuration = '3months' | '6months' | '1year';
type GenerationMode = 'duration' | 'custom';
type SalaryMode = 'auto' | 'manual';

// ── Duration post-processor ──────────────────────────────────────────────────
// Engine always generates 6-month data. This trims or extends based on user choice.
function parseIndianDate(dateStr: string): Date {
  const [d, m, y] = dateStr.split('-').map(Number);
  return new Date(y, m - 1, d);
}

function recomputeTotals(transactions: Transaction[], openingBal: number): {
  totalDebits: number; totalCredits: number; drCount: number; crCount: number; closingBalance: number;
} {
  let totalDebits = 0, totalCredits = 0, drCount = 0, crCount = 0;
  transactions.forEach(t => {
    if (t.debit) { totalDebits += t.debit; drCount++; }
    if (t.credit) { totalCredits += t.credit; crCount++; }
  });
  const closingBalance = transactions.length > 0 ? transactions[transactions.length - 1].balance : openingBal;
  return { totalDebits, totalCredits, drCount, crCount, closingBalance };
}

function applyDuration(record: StatementRecord, duration: StatementDuration): StatementRecord {
  // Statement transactions are already generated for the exact duration
  // via transactionEngine. Return record intact without corrupting dates/salary credits.
  return record;
}

// Duration options config
const DURATION_OPTIONS: { value: StatementDuration; label: string; sub: string; months: number }[] = [
  { value: '3months', label: '3 Months',  sub: 'Last 3 months', months: 3 },
  { value: '6months', label: '6 Months',  sub: 'Last 6 months', months: 6 },
  { value: '1year',   label: '1 Year',    sub: 'Last 12 months', months: 12 },
];


// Default branch presets per bank
const SBI_BRANCH_DEFAULTS: BranchDetails = {
  branchName: 'GOVINDPURA, BHOPAL',
  branchAddress: 'INDUSTRIAL AREA GOVINDPURA, BHOPAL, MADHYA PRADESH - 462023',
  branchCode: '01916',
  branchEmail: 'sbi.01916@sbi.co.in',
  branchPhone: '+91-755-2586241',
  ifscCode: 'SBIN0001916',
  micrCode: '462002015',
  ckycrNumber: '50046100545797',
};

const KOTAK_BRANCH_DEFAULTS: BranchDetails = {
  branchName: 'BHOPAL MAIN BRANCH',
  branchAddress: 'PLOT NO. 12, MP NAGAR ZONE-II, BHOPAL, MADHYA PRADESH - 462011',
  branchCode: '1590',
  branchEmail: 'bhopal.mpnagar@kotak.com',
  branchPhone: '+91-755-4255900',
  ifscCode: 'KKBK0001590',
  micrCode: '462485002',
  ckycrNumber: '70021900823421',
};

const BOI_BRANCH_DEFAULTS: BranchDetails = {
  branchName: 'Ashta',
  branchAddress: 'H N 12 KEVDA WALA BAGH BHOPAL 462008',
  branchCode: '009017',
  branchEmail: 'ashta.bhopal@bankofindia.co.in',
  branchPhone: '+91-7562-242017',
  ifscCode: 'BKID0009017',
  micrCode: '466013002',
  ckycrNumber: '60018200391823',
};

const PNB_BRANCH_DEFAULTS: BranchDetails = {
  branchName: 'SHAJAPUR',
  branchAddress: 'AJAY SHARE TAKTEO SHAJAPUR 466038',
  branchCode: '078000',
  branchEmail: 'bo7800@pnb.co.in',
  branchPhone: '+91-7364-222038',
  ifscCode: 'PUNB0780000',
  micrCode: '465024505',
  ckycrNumber: '40057100381924',
};

// Helper to format a date object to DD-MMM-YYYY (e.g., 01 Apr 2025)
function formatDateDisplay(date: Date): string {
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const day = String(date.getDate()).padStart(2, '0');
  const month = months[date.getMonth()];
  const year = date.getFullYear();
  return `${day} ${month} ${year}`;
}

// Compute days and approximate months between two dates
function getDateRangeInfo(from: string, to: string): { days: number; months: number } | null {
  if (!from || !to) return null;
  const fromDate = new Date(from);
  const toDate = new Date(to);
  if (isNaN(fromDate.getTime()) || isNaN(toDate.getTime())) return null;
  const diffTime = toDate.getTime() - fromDate.getTime();
  if (diffTime < 0) return null;
  const days = Math.floor(diffTime / (1000 * 60 * 60 * 24)) + 1; // inclusive
  const months = days / 30.44; // approximate
  return { days, months };
}

export default function GeneratorPage() {
  const { user, logout } = useAuth();

  const [statementType, setStatementType] = useState<StatementType>('salaried');
  const [duration, setDuration] = useState<StatementDuration>('6months');
  const [generationMode, setGenerationMode] = useState<GenerationMode>('duration');
  const [fromDate, setFromDate] = useState<string>('');
  const [toDate, setToDate] = useState<string>('');
  const [bankStyle, setBankStyle] = useState<'SBI' | 'SBI2' | 'Kotak' | 'BOI' | 'PNB'>('SBI');

  // ─── New salary configuration states ──────────────────────────────────────
  const [salaryMode, setSalaryMode] = useState<SalaryMode>('auto');
  const [companyName, setCompanyName] = useState<string>('');
  const [monthlySalary, setMonthlySalary] = useState<number | undefined>(undefined);
  const [salaryDay, setSalaryDay] = useState<'1' | '3' | '5' | '7' | '10' | 'last_day'>('5');

  // Separate base record (always 6-month) from displayed record (duration-adjusted)
  const [baseRecord, setBaseRecord] = useState<StatementRecord | null>(null);

  const [customer, setCustomer] = useState<CustomerDetails>({
    accountHolderName: 'SUDHIR KUMAR SHARMA',
    email: 'sudhir.sharma@sparktech.co.in',
    address: "B-402, Block 4, Prestige Whispering Palms,\nWhitefield, Bangalore, Karnataka - 560066",
    accountNumber: '30521458920',
    cifNumber: '85962145321',
    accountOpenDate: '2022-05-09',
    nomineeName: 'MEENAKSHI SHARMA (WIFE)',
  });

  const [branch, setBranch] = useState<BranchDetails>(SBI_BRANCH_DEFAULTS);

  const [account, setAccount] = useState<AccountInfo>({
    openingBalance: getRandomOpeningBalance(),
    interestRate: 2.50,
    currency: 'INR',
    accountStatus: 'Active',
    accountType: 'Savings',
  });

  // Base settings (will be augmented with generation mode, dates, and salary config)
  const baseSettings: StatementSettings = {
    bankStyle,
    duration: '6 Months',
    pageCount: '12 Pages',
    customTransactionsCount: 270,
    transactionMode: 'Normal',
    profile: 'Personal',
  };

  // When bank switches, auto-update branch defaults and patch the live record
  const handleBankStyleChange = (style: 'SBI' | 'SBI2' | 'Kotak' | 'BOI' | 'PNB') => {
    setBankStyle(style);
    let newBranch = SBI_BRANCH_DEFAULTS;
    if (style === 'Kotak') newBranch = KOTAK_BRANCH_DEFAULTS;
    else if (style === 'BOI') newBranch = BOI_BRANCH_DEFAULTS;
    else if (style === 'PNB') newBranch = PNB_BRANCH_DEFAULTS;
    setBranch(newBranch);

    // Patch active/base records in-place so preview switches immediately
    // (same transaction data is kept — only the bank format/template changes)
    const patchRecord = (prev: StatementRecord | null) => {
      if (!prev) return null;
      return {
        ...prev,
        branchDetails: newBranch,
        settings: { ...prev.settings, bankStyle: style },
      };
    };
    setActiveRecord(patchRecord);
    setBaseRecord(patchRecord);
  };

  const [activeRecord, setActiveRecord] = useState<StatementRecord | null>(null);
  const [loading, setLoading] = useState(false);
  const [isDownloadingPdf, setIsDownloadingPdf] = useState(false);
  const [downloadStatus, setDownloadStatus] = useState('');

  const handleDownloadBackendPdf = async () => {
    setIsDownloadingPdf(true);
    setDownloadStatus('Connecting to backend PDF engine...');

    try {
      const settings: StatementSettings = {
        ...baseSettings,
        bankStyle,
        ...(generationMode === 'custom' && {
          generationMode: 'custom',
          fromDate,
          toDate,
        }),
        ...(statementType === 'salaried' && {
          salaryMode,
          companyName: salaryMode === 'manual' ? companyName.trim() : undefined,
          monthlySalary: salaryMode === 'manual' ? monthlySalary : undefined,
          salaryDay,
        }),
      };

      await downloadStatementPdfFromBackend({
        customerDetails: customer,
        branchDetails: branch,
        accountInfo: account,
        settings,
        onProgress: (pct, msg) => setDownloadStatus(msg),
      });

      toast.success('Statement PDF generated & downloaded directly from backend!', { theme: 'dark' });
      logToSystem('SYSTEM', 'INFO', `Direct backend statement PDF generated & downloaded for ${customer.accountHolderName}`);
    } catch (err: any) {
      console.error('Backend PDF generation failed:', err);
      toast.error(`Backend PDF generation error: ${err.message || 'Failed to download'}`, { theme: 'dark' });
      logToSystem('SYSTEM', 'ERROR', `Backend PDF generation failed: ${err.message}`);
    } finally {
      setIsDownloadingPdf(false);
      setDownloadStatus('');
    }
  };


  // Initialize default custom dates on mount
  useEffect(() => {
    const now = new Date();
    const year = now.getFullYear();
    const defaultFrom = `${year}-01-01`;
    const defaultTo = now.toISOString().split('T')[0];
    setFromDate(defaultFrom);
    setToDate(defaultTo);
  }, []);

  // ─── Reset salary config & toggle opening balance when switching type ────────
  useEffect(() => {
    if (statementType === 'business') {
      setSalaryMode('auto');
      setCompanyName('');
      setMonthlySalary(undefined);
      setSalaryDay('5');
      setAccount((prev) => ({ ...prev, openingBalance: 90000.00 }));
    } else {
      setAccount((prev) => ({ ...prev, openingBalance: getRandomOpeningBalance() }));
    }
  }, [statementType]);

  // Generate / Regenerate statement record helper
  const handleGenerateStatement = (
    currentCustomer: CustomerDetails,
    type: StatementType = statementType,
    dur: StatementDuration = duration,
    isRegenerate = false
  ) => {
    // ── Validation for custom mode ──────────────────────────────────────────────
    if (generationMode === 'custom') {
      if (!fromDate || !toDate) {
        toast.error('Please select both From and To dates.', { theme: 'dark' });
        return;
      }
      const from = new Date(fromDate);
      const to = new Date(toDate);
      if (isNaN(from.getTime()) || isNaN(to.getTime())) {
        toast.error('Invalid date format.', { theme: 'dark' });
        return;
      }
      if (from > to) {
        toast.error('From Date must be earlier than or equal to To Date.', { theme: 'dark' });
        return;
      }
    }

    // ── Validation for manual salary configuration ────────────────────────────
    if (type === 'salaried' && salaryMode === 'manual') {
      const trimmedCompany = companyName.trim();
      if (!trimmedCompany) {
        toast.error('Please enter a Company Name for manual salary.', { theme: 'dark' });
        return;
      }
      if (!monthlySalary || monthlySalary <= 0) {
        toast.error('Monthly Salary must be a positive amount.', { theme: 'dark' });
        return;
      }
    }

    // ── Build the settings object with current mode, dates, and salary config ──
    const settings: StatementSettings = {
      ...baseSettings,
      bankStyle,
      duration: dur === '3months' ? '3 Months' : dur === '1year' ? '12 Months' : '6 Months',
      // Add generation mode and dates if custom
      ...(generationMode === 'custom' && {
        generationMode: 'custom',
        fromDate,
        toDate,
      }),
      // Add salary config if salaried
      ...(type === 'salaried' && {
        salaryMode,
        companyName: salaryMode === 'manual' ? companyName.trim() : undefined,
        monthlySalary: salaryMode === 'manual' ? monthlySalary : undefined,
        salaryDay,
      }),
    };

    setLoading(true);
    try {
      const logMsg = `Invoking ${type === 'salaried' ? 'Salaried' : 'Business'} Transaction Engine (mode: ${generationMode})`;
      logToSystem('SYSTEM', 'INFO', logMsg);

      const transactions =
        type === 'salaried'
          ? generateSalariedStatementTransactions(settings, account, new Date().toISOString(), customer, branch)
          : generateStatementTransactions(settings, account, new Date().toISOString(), customer, branch);

      // Compute totals
      let totalDebits = 0;
      let totalCredits = 0;
      let drCount = 0;
      let crCount = 0;

      transactions.forEach(t => {
        if (t.debit) { totalDebits += t.debit; drCount++; }
        if (t.credit) { totalCredits += t.credit; crCount++; }
      });

      const closingBalance = transactions.length > 0 ? transactions[transactions.length - 1].balance : account.openingBalance;

      const base: StatementRecord = {
        id: `stmt_${bankStyle.toLowerCase()}_${Date.now()}`,
        createdAt: new Date().toISOString(),
        customerDetails: currentCustomer,
        branchDetails: branch,
        accountInfo: account,
        settings,
        transactions,
        closingBalance,
        totalCredits,
        totalDebits,
        drCount,
        crCount
      };

      // ── Apply duration post-processing only in duration mode ──────────────────
      let displayed: StatementRecord;
      if (generationMode === 'duration') {
        displayed = applyDuration(base, dur);
      } else {
        // Custom mode: no trimming/extending; use the generated transactions as-is
        displayed = base;
      }

      setBaseRecord(base);
      setActiveRecord(displayed);

      if (isRegenerate) {
        toast.success('Successfully regenerated transactions with unique random seeds!', { theme: 'dark' });
      }
      logToSystem('SYSTEM', 'INFO', `Compiled ${bankStyle} statement: ${transactions.length} transactions, final balance: ₹${displayed.closingBalance.toLocaleString()}`);
    } catch (e: any) {
      console.warn('Could not generate statement', e);
      toast.error('Failed to generate statement. Please try again.', { theme: 'dark' });
    } finally {
      setLoading(false);
    }
  };

  const handlePrintCheck = async (): Promise<boolean> => {
    try {
      await api.post('/api/statements/increment');
      return true;
    } catch (e) {
      return false;
    }
  };

  // Generate on first load
  useEffect(() => {
    handleGenerateStatement(customer, statementType, duration);
  }, []);

  const handleInputChange = (field: keyof CustomerDetails, value: string) => {
    let finalValue = value;
    if (field === 'accountHolderName') {
      finalValue = value;
    }
    const nextCustomer = { ...customer, [field]: finalValue };
    setCustomer(nextCustomer);

    // Update active record in-place without hitting database/regenerating random transactions list
    if (activeRecord) {
      setActiveRecord(prev => {
        if (!prev) return null;
        return {
          ...prev,
          customerDetails: nextCustomer
        };
      });
    }
    if (baseRecord) {
      setBaseRecord(prev => {
        if (!prev) return null;
        return {
          ...prev,
          customerDetails: nextCustomer
        };
      });
    }
  };

  const handleBranchInputChange = (field: keyof BranchDetails, value: string) => {
    let finalValue = value;
    if (field === 'branchName' || field === 'ifscCode') {
      finalValue = value;
    }
    const nextBranch = { ...branch, [field]: finalValue };
    setBranch(nextBranch);

    // Update active record in-place without hitting database/regenerating random transactions list
    if (activeRecord) {
      setActiveRecord(prev => {
        if (!prev) return null;
        return {
          ...prev,
          branchDetails: nextBranch
        };
      });
    }
    if (baseRecord) {
      setBaseRecord(prev => {
        if (!prev) return null;
        return {
          ...prev,
          branchDetails: nextBranch
        };
      });
    }
  };

  const handleAccountInputChange = (field: keyof AccountInfo, value: any) => {
    const nextAccount = { ...account, [field]: value };
    setAccount(nextAccount);

    // Update active record in-place without hitting database/regenerating random transactions list
    if (activeRecord) {
      setActiveRecord(prev => {
        if (!prev) return null;
        return {
          ...prev,
          accountInfo: nextAccount
        };
      });
    }
    if (baseRecord) {
      setBaseRecord(prev => {
        if (!prev) return null;
        return {
          ...prev,
          accountInfo: nextAccount
        };
      });
    }
  };

  const handleTriggerRegenerate = () => {
    handleGenerateStatement(customer, statementType, duration, true);
  };

  // When statement type changes, auto-regenerate
  const handleTypeChange = (type: StatementType) => {
    setStatementType(type);
    // The useEffect will reset salary config when switching to business,
    // but we also need to regenerate with the new type
    handleGenerateStatement(customer, type, duration, false);
  };

  // When duration changes — re-apply to existing base record (no regenerate needed)
  const handleDurationChange = (dur: StatementDuration) => {
    setDuration(dur);
    if (baseRecord) {
      const displayed = applyDuration(baseRecord, dur);
      setActiveRecord(displayed);
    } else {
      handleGenerateStatement(customer, statementType, dur, false);
    }
  };

  // Get period display string for hardcoded section
  const getPeriodDisplay = (): string => {
    if (generationMode === 'duration') {
      const durationLabel = DURATION_OPTIONS.find(d => d.value === duration)?.label || '6 Months';
      return durationLabel;
    } else {
      // custom
      if (fromDate && toDate) {
        const from = new Date(fromDate);
        const to = new Date(toDate);
        if (!isNaN(from.getTime()) && !isNaN(to.getTime())) {
          return `${formatDateDisplay(from)} → ${formatDateDisplay(to)}`;
        }
      }
      return 'Custom range';
    }
  };

  // Compute date range info for custom mode
  const rangeInfo = generationMode === 'custom' ? getDateRangeInfo(fromDate, toDate) : null;

  // Helper to handle company name input: uppercase and trim
  const handleCompanyNameChange = (value: string) => {
    const upper = value.toUpperCase();
    setCompanyName(upper);
  };

  // Helper to format bank names
  const getBankFullName = (style: 'SBI' | 'SBI2' | 'Kotak' | 'BOI' | 'PNB') => {
    switch (style) {
      case 'SBI': return 'State Bank of India';
      case 'SBI2': return 'State Bank of India 2.0';
      case 'Kotak': return 'Kotak Mahindra Bank';
      case 'BOI': return 'Bank of India';
      case 'PNB': return 'Punjab National Bank';
    }
  };


  return (
    <div className="h-screen overflow-hidden bg-slate-50 text-slate-800 flex flex-col font-sans print:bg-white print:text-black print:h-auto print:overflow-visible">
      {/* Non-printable Header */}
      <header className="bg-slate-900 text-white py-4 px-6 shadow-md border-b border-slate-800 select-none print:hidden flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center space-x-3">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-white shadow-inner ${
            bankStyle === 'SBI' ? 'bg-indigo-600' : bankStyle === 'Kotak' ? 'bg-rose-600' : bankStyle === 'BOI' ? 'bg-sky-700' : 'bg-red-700'
          }`}>
            <Landmark size={22} className="text-white" />
          </div>
          <div>
            <h1 className="font-extrabold text-lg tracking-tight leading-none flex items-center gap-1.5">
              {getBankFullName(bankStyle)}{' '}
              <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider ${
                bankStyle === 'SBI' ? 'text-indigo-300' : bankStyle === 'Kotak' ? 'text-rose-300' : bankStyle === 'BOI' ? 'text-sky-300' : 'text-amber-300'
              }`}>Statistical Generator</span>
            </h1>
            <span className="text-[10.5px] text-slate-400 font-semibold block mt-0.5">HIGH-FIDELITY TRANSACTION ENGINE</span>
          </div>
        </div>

        {/* User profile & Navigation */}
        <div className="flex flex-wrap items-center gap-3">
          {user && (user.role === 'SUPER_ADMIN' || user.role === 'ADMIN') && (
            <Link
              to="/admin/dashboard"
              className="flex items-center gap-1.5 bg-indigo-600/10 hover:bg-indigo-600/20 text-indigo-400 font-bold px-3 py-1.5 rounded-xl border border-indigo-500/20 text-xs transition-all"
            >
              <ShieldAlert size={14} />
              Admin Portal
            </Link>
          )}

          <Link
            to="/profile"
            className="flex items-center gap-1.5 bg-slate-800 hover:bg-slate-700 font-bold px-3 py-1.5 rounded-xl border border-slate-750 text-xs transition-all text-slate-200"
          >
            <User size={14} />
            Profile ({user?.fullName})
          </Link>

          <button
            onClick={logout}
            className="flex items-center gap-1.5 bg-rose-650 hover:bg-rose-600 text-white font-bold px-3 py-1.5 rounded-xl text-xs transition-all shadow-md shadow-rose-900/10 active:scale-95 cursor-pointer"
          >
            <LogOut size={14} />
            Logout
          </button>
        </div>
      </header>

      {/* Main Work Area */}
      <div className="flex-1 overflow-hidden flex flex-col lg:flex-row p-6 lg:p-8 gap-8 print:p-0 print:gap-0 print:block print:overflow-visible">
        
        {/* Left Side: Control Panel (Non-printable) */}
        <aside className="w-full lg:w-96 flex flex-col space-y-6 select-none print:hidden shrink-0 lg:overflow-y-auto lg:h-full lg:pr-2">
          
          {/* ── Bank Style Selector ── */}
          <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs">
            <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2 mb-4">
              <ChevronsUpDown size={14} className="text-indigo-600" /> Bank Format
            </h2>
            <div className="grid grid-cols-2 gap-2.5">
              {/* SBI Option */}
              <button
                onClick={() => handleBankStyleChange('SBI')}
                className={`relative flex flex-col items-center gap-1.5 p-3 rounded-xl border-2 transition-all duration-200 cursor-pointer group ${
                  bankStyle === 'SBI'
                    ? 'border-indigo-500 bg-indigo-50 shadow-sm shadow-indigo-100'
                    : 'border-slate-200 bg-slate-50 hover:border-slate-300 hover:bg-white'
                }`}
              >
                {bankStyle === 'SBI' && (
                  <div className="absolute top-2 right-2 w-2 h-2 rounded-full bg-indigo-500" />
                )}
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-[10px] font-black transition-colors ${
                  bankStyle === 'SBI'
                    ? 'bg-indigo-500 text-white'
                    : 'bg-slate-200 text-slate-600 group-hover:bg-slate-300'
                }`}>SBI</div>
                <div className="text-center">
                  <div className={`text-[11px] font-extrabold uppercase tracking-wide ${
                    bankStyle === 'SBI' ? 'text-indigo-700' : 'text-slate-600'
                  }`}>SBI</div>
                  <div className="text-[8.5px] text-slate-400 leading-tight">State Bank</div>
                </div>
              </button>

              {/* SBI 2 Option */}
              <button
                onClick={() => handleBankStyleChange('SBI2')}
                className={`relative flex flex-col items-center gap-1.5 p-3 rounded-xl border-2 transition-all duration-200 cursor-pointer group ${
                  bankStyle === 'SBI2'
                    ? 'border-cyan-600 bg-cyan-50 shadow-sm shadow-cyan-100'
                    : 'border-slate-200 bg-slate-50 hover:border-slate-300 hover:bg-white'
                }`}
              >
                {bankStyle === 'SBI2' && (
                  <div className="absolute top-2 right-2 w-2 h-2 rounded-full bg-cyan-600" />
                )}
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-[10px] font-black transition-colors ${
                  bankStyle === 'SBI2'
                    ? 'bg-cyan-600 text-white'
                    : 'bg-slate-200 text-slate-600 group-hover:bg-slate-300'
                }`}>SBI 2</div>
                <div className="text-center">
                  <div className={`text-[11px] font-extrabold uppercase tracking-wide ${
                    bankStyle === 'SBI2' ? 'text-cyan-800' : 'text-slate-600'
                  }`}>SBI 2.0</div>
                  <div className="text-[8.5px] text-slate-400 leading-tight">Clean Table</div>
                </div>
              </button>


              {/* Kotak Option */}
              <button
                onClick={() => handleBankStyleChange('Kotak')}
                className={`relative flex flex-col items-center gap-1.5 p-3 rounded-xl border-2 transition-all duration-200 cursor-pointer group ${
                  bankStyle === 'Kotak'
                    ? 'border-rose-500 bg-rose-50 shadow-sm shadow-rose-100'
                    : 'border-slate-200 bg-slate-50 hover:border-slate-300 hover:bg-white'
                }`}
              >
                {bankStyle === 'Kotak' && (
                  <div className="absolute top-2 right-2 w-2 h-2 rounded-full bg-rose-500" />
                )}
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-[9px] font-black transition-colors ${
                  bankStyle === 'Kotak'
                    ? 'bg-rose-500 text-white'
                    : 'bg-slate-200 text-slate-600 group-hover:bg-slate-300'
                }`}>KKBK</div>
                <div className="text-center">
                  <div className={`text-[11px] font-extrabold uppercase tracking-wide ${
                    bankStyle === 'Kotak' ? 'text-rose-700' : 'text-slate-600'
                  }`}>Kotak</div>
                  <div className="text-[8.5px] text-slate-400 leading-tight">Kotak Mahindra</div>
                </div>
              </button>

              {/* BOI Option */}
              <button
                onClick={() => handleBankStyleChange('BOI')}
                className={`relative flex flex-col items-center gap-1.5 p-3 rounded-xl border-2 transition-all duration-200 cursor-pointer group ${
                  bankStyle === 'BOI'
                    ? 'border-sky-600 bg-sky-50 shadow-sm shadow-sky-100'
                    : 'border-slate-200 bg-slate-50 hover:border-slate-300 hover:bg-white'
                }`}
              >
                {bankStyle === 'BOI' && (
                  <div className="absolute top-2 right-2 w-2 h-2 rounded-full bg-sky-600" />
                )}
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-[10px] font-black transition-colors ${
                  bankStyle === 'BOI'
                    ? 'bg-sky-600 text-white'
                    : 'bg-slate-200 text-slate-600 group-hover:bg-slate-300'
                }`}>BKID</div>
                <div className="text-center">
                  <div className={`text-[11px] font-extrabold uppercase tracking-wide ${
                    bankStyle === 'BOI' ? 'text-sky-700' : 'text-slate-600'
                  }`}>BOI</div>
                  <div className="text-[8.5px] text-slate-400 leading-tight">Bank of India</div>
                </div>
              </button>

              {/* PNB Option */}
              <button
                onClick={() => handleBankStyleChange('PNB')}
                className={`relative flex flex-col items-center gap-1.5 p-3 rounded-xl border-2 transition-all duration-200 cursor-pointer group ${
                  bankStyle === 'PNB'
                    ? 'border-amber-500 bg-amber-50 shadow-sm shadow-amber-100'
                    : 'border-slate-200 bg-slate-50 hover:border-slate-300 hover:bg-white'
                }`}
              >
                {bankStyle === 'PNB' && (
                  <div className="absolute top-2 right-2 w-2 h-2 rounded-full bg-amber-500" />
                )}
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-[9px] font-black transition-colors ${
                  bankStyle === 'PNB'
                    ? 'bg-red-700 text-amber-300 border border-amber-400'
                    : 'bg-slate-200 text-slate-600 group-hover:bg-slate-300'
                }`}>PUNB</div>
                <div className="text-center">
                  <div className={`text-[11px] font-extrabold uppercase tracking-wide ${
                    bankStyle === 'PNB' ? 'text-amber-800' : 'text-slate-600'
                  }`}>PNB</div>
                  <div className="text-[8.5px] text-slate-400 leading-tight">Punjab National</div>
                </div>
              </button>
            </div>
            <div className={`mt-3 p-3 rounded-xl text-[10.5px] leading-relaxed font-medium transition-colors ${
              bankStyle === 'SBI'
                ? 'bg-indigo-50 text-indigo-700 border border-indigo-100'
                : bankStyle === 'Kotak'
                ? 'bg-rose-50 text-rose-700 border border-rose-100'
                : bankStyle === 'BOI'
                ? 'bg-sky-50 text-sky-800 border border-sky-100'
                : 'bg-amber-50 text-amber-900 border border-amber-200'
            }`}>
              {bankStyle === 'SBI' && '🏦 SBI format — official blue/purple A4 layout with SBI branding and branch metadata.'}
              {bankStyle === 'Kotak' && '🔴 Kotak format — authentic red/white Kotak Mahindra 811 style statement layout.'}
              {bankStyle === 'BOI' && '🔷 BOI format — official Bank of India detailed statement layout with customer ID & IFSC box.'}
              {bankStyle === 'PNB' && '🟡 PNB format — official Punjab National Bank red & yellow header statement layout.'}
            </div>
          </div>

          {/* ── Statement Type Selector ── */}
          <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs">
            <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2 mb-4">
              <Building2 size={14} className="text-indigo-600" /> Statement Type
            </h2>

            <div className="grid grid-cols-2 gap-3">
              {/* Salaried Option */}
              <button
                onClick={() => handleTypeChange('salaried')}
                className={`relative flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all duration-200 cursor-pointer group ${
                  statementType === 'salaried'
                    ? 'border-indigo-500 bg-indigo-50 shadow-sm shadow-indigo-100'
                    : 'border-slate-200 bg-slate-50 hover:border-slate-300 hover:bg-white'
                }`}
              >
                {statementType === 'salaried' && (
                  <div className="absolute top-2 right-2 w-2 h-2 rounded-full bg-indigo-500" />
                )}
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-colors ${
                  statementType === 'salaried'
                    ? 'bg-indigo-500 text-white'
                    : 'bg-slate-200 text-slate-500 group-hover:bg-slate-300'
                }`}>
                  <User size={18} />
                </div>
                <div className="text-center">
                  <div className={`text-xs font-extrabold uppercase tracking-wide ${
                    statementType === 'salaried' ? 'text-indigo-700' : 'text-slate-600'
                  }`}>Salaried</div>
                  <div className="text-[9px] text-slate-400 mt-0.5 leading-tight">Monthly salary<br/>on 1st of each month</div>
                </div>
              </button>

              {/* Business Option */}
              <button
                onClick={() => handleTypeChange('business')}
                className={`relative flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all duration-200 cursor-pointer group ${
                  statementType === 'business'
                    ? 'border-emerald-500 bg-emerald-50 shadow-sm shadow-emerald-100'
                    : 'border-slate-200 bg-slate-50 hover:border-slate-300 hover:bg-white'
                }`}
              >
                {statementType === 'business' && (
                  <div className="absolute top-2 right-2 w-2 h-2 rounded-full bg-emerald-500" />
                )}
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-colors ${
                  statementType === 'business'
                    ? 'bg-emerald-500 text-white'
                    : 'bg-slate-200 text-slate-500 group-hover:bg-slate-300'
                }`}>
                  <Building2 size={18} />
                </div>
                <div className="text-center">
                  <div className={`text-xs font-extrabold uppercase tracking-wide ${
                    statementType === 'business' ? 'text-emerald-700' : 'text-slate-600'
                  }`}>Business</div>
                  <div className="text-[9px] text-slate-400 mt-0.5 leading-tight">Mixed UPI/IMPS/NEFT<br/>transactions</div>
                </div>
              </button>
            </div>

            {/* Active type description */}
            <div className={`mt-3 p-3 rounded-xl text-[10.5px] leading-relaxed font-medium transition-colors ${
              statementType === 'salaried'
                ? 'bg-indigo-50 text-indigo-700 border border-indigo-100'
                : 'bg-emerald-50 text-emerald-700 border border-emerald-100'
            }`}>
              {statementType === 'salaried'
                ? '💼 Salary of ₹20,000–₹80,000 will be credited via NEFT on the 1st of every month from a random Indian company.'
                : '🏢 Standard business transactions: UPI, IMPS, NEFT, and ATM withdrawals without a fixed salary pattern.'}
            </div>
          </div>

          {/* ── NEW: Salary Configuration (only for Salaried) ──────────────────── */}
          {statementType === 'salaried' && (
            <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs">
              <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2 mb-4">
                <User size={14} className="text-indigo-600" /> Salary Configuration
              </h2>

              {/* Mode toggle */}
              <div className="flex gap-2 mb-4 bg-slate-50 p-1 rounded-xl border border-slate-200/60">
                <button
                  onClick={() => setSalaryMode('auto')}
                  className={`flex-1 py-2 px-3 rounded-lg text-xs font-bold uppercase tracking-wider transition-all ${
                    salaryMode === 'auto'
                      ? 'bg-indigo-500 text-white shadow-sm'
                      : 'text-slate-500 hover:bg-slate-200/50'
                  }`}
                >
                  Auto Generate
                </button>
                <button
                  onClick={() => setSalaryMode('manual')}
                  className={`flex-1 py-2 px-3 rounded-lg text-xs font-bold uppercase tracking-wider transition-all ${
                    salaryMode === 'manual'
                      ? 'bg-indigo-500 text-white shadow-sm'
                      : 'text-slate-500 hover:bg-slate-200/50'
                  }`}
                >
                  Manual Entry
                </button>
              </div>

              {salaryMode === 'auto' ? (
                <div className="p-3 rounded-xl text-[10.5px] leading-relaxed font-medium bg-slate-50 text-slate-600 border border-slate-200/60">
                  Company name and salary will be generated automatically.
                </div>
              ) : (
                <div className="space-y-3.5">
                  <div>
                    <label className="block text-slate-600 text-[10.5px] font-bold mb-1 uppercase tracking-wider">Company Name</label>
                    <input
                      type="text"
                      value={companyName}
                      onChange={(e) => handleCompanyNameChange(e.target.value)}
                      placeholder="e.g., INFOSYS LIMITED"
                      className="w-full bg-slate-50 text-slate-900 border border-slate-200/80 px-3 py-2 rounded-xl text-xs font-sans font-bold focus:outline-none focus:bg-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 transition-all"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-600 text-[10.5px] font-bold mb-1 uppercase tracking-wider">Monthly Salary</label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-xs">₹</span>
                      <input
                        type="number"
                        min="1"
                        step="1"
                        value={monthlySalary ?? ''}
                        onChange={(e) => {
                          const val = e.target.value;
                          if (val === '') {
                            setMonthlySalary(undefined);
                          } else {
                            const num = Number(val);
                            if (!isNaN(num) && num >= 0) {
                              setMonthlySalary(Math.floor(num)); // ensure integer
                            }
                          }
                        }}
                        placeholder="e.g., 45000"
                        className="w-full bg-slate-50 text-slate-900 border border-slate-200/80 pl-8 pr-3 py-2 rounded-xl text-xs font-mono font-semibold focus:outline-none focus:bg-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 transition-all"
                      />
                    </div>
                  </div>
                  <div className="text-[10px] text-slate-400 italic">
                    Enter salary as a whole number (no decimals).
                  </div>
                </div>
              )}

              {/* ── Salary Credit Day Selector ── */}
              <div className="mt-4 pt-4 border-t border-slate-100">
                <label className="block text-slate-600 text-[10.5px] font-bold mb-2 uppercase tracking-wider">
                  Salary Credit Day of Month
                </label>
                <div className="grid grid-cols-5 gap-1.5 mb-2">
                  {[
                    { val: '1', label: '1st' },
                    { val: '3', label: '3rd' },
                    { val: '5', label: '5th' },
                    { val: '7', label: '7th' },
                    { val: '10', label: '10th' },
                    { val: '15', label: '15th' },
                    { val: '25', label: '25th' },
                    { val: '30', label: '30th' },
                    { val: 'last_day', label: 'Last Day' },
                  ].map(({ val, label }) => (
                    <button
                      key={val}
                      onClick={() => setSalaryDay(val as any)}
                      className={`py-1.5 px-2 rounded-lg text-[10.5px] font-bold uppercase tracking-wider transition-all border ${
                        salaryDay === val
                          ? 'bg-indigo-500 text-white border-indigo-500 shadow-sm'
                          : 'bg-slate-50 text-slate-500 border-slate-200/80 hover:bg-slate-100'
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
                <div className="flex items-center gap-2 mt-2">
                  <span className="text-xs text-slate-500 font-medium">Or custom day (1-31):</span>
                  <input
                    type="number"
                    min={1}
                    max={31}
                    value={salaryDay !== 'last_day' ? salaryDay : ''}
                    onChange={(e) => {
                      const v = parseInt(e.target.value, 10);
                      if (!isNaN(v) && v >= 1 && v <= 31) {
                        setSalaryDay(v.toString() as any);
                      }
                    }}
                    placeholder="Day"
                    className="w-20 px-2 py-1 text-xs border border-slate-200 rounded-md font-mono text-slate-800 focus:outline-none focus:border-indigo-500"
                  />
                </div>
                <div className="mt-2 text-[10px] text-slate-400 italic">
                  Salary will be credited on the chosen day of month for every month in statement duration. Sunday dates auto-shift to Saturday.
                </div>
              </div>
            </div>
          )}


          {/* ── Statement Generation Mode & Duration / Custom Dates ── */}
          <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs">
            <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2 mb-4">
              <Calendar size={14} className="text-indigo-600" /> Statement Duration
            </h2>

            {/* Mode Selector */}
            <div className="flex gap-2 mb-4 bg-slate-50 p-1 rounded-xl border border-slate-200/60">
              <button
                onClick={() => setGenerationMode('duration')}
                className={`flex-1 py-2 px-3 rounded-lg text-xs font-bold uppercase tracking-wider transition-all ${
                  generationMode === 'duration'
                    ? 'bg-indigo-500 text-white shadow-sm'
                    : 'text-slate-500 hover:bg-slate-200/50'
                }`}
              >
                Quick Duration
              </button>
              <button
                onClick={() => setGenerationMode('custom')}
                className={`flex-1 py-2 px-3 rounded-lg text-xs font-bold uppercase tracking-wider transition-all ${
                  generationMode === 'custom'
                    ? 'bg-indigo-500 text-white shadow-sm'
                    : 'text-slate-500 hover:bg-slate-200/50'
                }`}
              >
                Custom Date Range
              </button>
            </div>

            {/* Conditional Content */}
            {generationMode === 'duration' ? (
              <>
                <div className="grid grid-cols-3 gap-2">
                  {DURATION_OPTIONS.map(opt => (
                    <button
                      key={opt.value}
                      onClick={() => handleDurationChange(opt.value)}
                      className={`relative flex flex-col items-center gap-1.5 py-3 px-2 rounded-xl border-2 transition-all duration-200 cursor-pointer group ${
                        duration === opt.value
                          ? 'border-violet-500 bg-violet-50 shadow-sm shadow-violet-100'
                          : 'border-slate-200 bg-slate-50 hover:border-slate-300 hover:bg-white'
                      }`}
                    >
                      {duration === opt.value && (
                        <div className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full bg-violet-500" />
                      )}
                      <div className={`text-xs font-extrabold uppercase tracking-wide ${
                        duration === opt.value ? 'text-violet-700' : 'text-slate-600'
                      }`}>{opt.label}</div>
                      <div className="text-[9px] text-slate-400 leading-tight text-center">{opt.sub}</div>
                    </button>
                  ))}
                </div>
                <div className="mt-3 p-3 rounded-xl text-[10.5px] leading-relaxed font-medium bg-violet-50 text-violet-700 border border-violet-100">
                  {duration === '3months' && '📅 Showing last 3 months of transactions (half the data of 6-month base).'}
                  {duration === '6months' && '📅 Full 6-month statement — default view with complete transaction history.'}
                  {duration === '1year' && '📅 Full 12-month statement — previous 6 months auto-generated from base data.'}
                </div>
              </>
            ) : (
              <>
                <div className="space-y-3">
                  <div>
                    <label className="block text-slate-600 text-[10.5px] font-bold mb-1 uppercase tracking-wider">From Date</label>
                    <input
                      type="date"
                      value={fromDate}
                      onChange={(e) => setFromDate(e.target.value)}
                      className="w-full bg-slate-50 text-slate-900 border border-slate-200/80 px-3 py-2 rounded-xl text-xs font-sans focus:outline-none focus:bg-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 transition-all"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-600 text-[10.5px] font-bold mb-1 uppercase tracking-wider">To Date</label>
                    <input
                      type="date"
                      value={toDate}
                      onChange={(e) => setToDate(e.target.value)}
                      className="w-full bg-slate-50 text-slate-900 border border-slate-200/80 px-3 py-2 rounded-xl text-xs font-sans focus:outline-none focus:bg-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 transition-all"
                    />
                  </div>
                </div>
                {rangeInfo && (
                  <div className="mt-3 p-3 rounded-xl text-[10.5px] leading-relaxed font-medium bg-indigo-50 text-indigo-700 border border-indigo-100">
                    <div>{rangeInfo.days} Days</div>
                    <div>≈ {rangeInfo.months.toFixed(1)} Months</div>
                  </div>
                )}
                {(!fromDate || !toDate) && (
                  <div className="mt-3 p-3 rounded-xl text-[10.5px] leading-relaxed font-medium bg-amber-50 text-amber-700 border border-amber-100">
                    ⚠️ Please select both dates.
                  </div>
                )}
                {fromDate && toDate && new Date(fromDate) > new Date(toDate) && (
                  <div className="mt-3 p-3 rounded-xl text-[10.5px] leading-relaxed font-medium bg-red-50 text-red-700 border border-red-100">
                    ❌ From Date must be on or before To Date.
                  </div>
                )}
              </>
            )}
          </div>

          {/* Section: Customer Config */}
          <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs space-y-4">
            <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
              <User size={14} className="text-indigo-600" /> Customer Parameters
            </h2>

            <div className="space-y-3.5">
              <div>
                <label className="block text-slate-600 text-[10.5px] font-bold mb-1 uppercase tracking-wider">Account Holder Name</label>
                <input 
                  type="text"
                  value={customer.accountHolderName}
                  onChange={e => handleInputChange('accountHolderName', e.target.value)}
                  className="w-full bg-slate-50 text-slate-900 border border-slate-200/80 px-3 py-2 rounded-xl text-xs font-sans font-bold focus:outline-none focus:bg-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 transition-all"
                />
              </div>

              <div>
                <label className="block text-slate-600 text-[10.5px] font-bold mb-1 uppercase tracking-wider">Account Number</label>
                <input 
                  type="text"
                  value={customer.accountNumber}
                  onChange={e => handleInputChange('accountNumber', e.target.value.replace(/\D/g, ''))}
                  className="w-full bg-slate-50 text-slate-900 border border-slate-200/80 px-3 py-2 rounded-xl text-xs font-mono font-semibold tracking-wider focus:outline-none focus:bg-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 transition-all"
                />
              </div>

              <div>
                <label className="block text-slate-600 text-[10.5px] font-bold mb-1 uppercase tracking-wider">Account Type</label>
                <input 
                  type="text"
                  value={account.accountType}
                  onChange={e => handleAccountInputChange('accountType', e.target.value)}
                  placeholder="e.g., SAVINGS BANK AC"
                  className="w-full bg-slate-50 text-slate-900 border border-slate-200/80 px-3 py-2 rounded-xl text-xs font-sans font-bold focus:outline-none focus:bg-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 transition-all"
                />
              </div>

              <div>
                <label className="block text-slate-600 text-[10.5px] font-bold mb-1 uppercase tracking-wider">CIF Number</label>
                <input 
                  type="text"
                  value={customer.cifNumber}
                  onChange={e => handleInputChange('cifNumber', e.target.value.replace(/\D/g, ''))}
                  className="w-full bg-slate-50 text-slate-900 border border-slate-200/80 px-3 py-2 rounded-xl text-xs font-mono font-semibold tracking-wider focus:outline-none focus:bg-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 transition-all"
                />
              </div>

              <div>
                <label className="block text-slate-600 text-[10.5px] font-bold mb-1 uppercase tracking-wider">Nominee Name</label>
                <input 
                  type="text"
                  value={customer.nomineeName}
                  onChange={e => handleInputChange('nomineeName', e.target.value)}
                  className="w-full bg-slate-50 text-slate-900 border border-slate-200/80 px-3 py-2 rounded-xl text-xs font-sans font-semibold focus:outline-none focus:bg-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 transition-all"
                />
              </div>

              <div>
                <label className="block text-slate-600 text-[10.5px] font-bold mb-1 uppercase tracking-wider">Primary Email ID</label>
                <input 
                  type="email"
                  value={customer.email}
                  onChange={e => handleInputChange('email', e.target.value)}
                  className="w-full bg-slate-50 text-slate-900 border border-slate-200/80 px-3 py-2 rounded-xl text-xs font-sans focus:outline-none focus:bg-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 transition-all"
                />
              </div>

              <div>
                <label className="block text-slate-600 text-[10.5px] font-bold mb-1 uppercase tracking-wider">Mailing Address</label>
                <textarea 
                  value={customer.address}
                  onChange={e => handleInputChange('address', e.target.value)}
                  rows={2}
                  className="w-full bg-slate-50 text-slate-900 border border-slate-200/80 px-3 py-2 rounded-xl text-xs font-sans focus:outline-none focus:bg-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 transition-all resize-none"
                />
              </div>
            </div>
          </div>

          {/* Section: Branch Parameters */}
          <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs space-y-4">
            <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
              <Building2 size={14} className="text-indigo-600" /> Branch Parameters
            </h2>

            <div className="space-y-3.5">
              <div>
                <label className="block text-slate-600 text-[10.5px] font-bold mb-1 uppercase tracking-wider">Branch Name</label>
                <input 
                  type="text"
                  value={branch.branchName}
                  onChange={e => handleBranchInputChange('branchName', e.target.value)}
                  className="w-full bg-slate-50 text-slate-900 border border-slate-200/80 px-3 py-2 rounded-xl text-xs font-sans font-bold focus:outline-none focus:bg-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 transition-all"
                />
              </div>

              <div>
                <label className="block text-slate-600 text-[10.5px] font-bold mb-1 uppercase tracking-wider">IFSC Code</label>
                <input 
                  type="text"
                  value={branch.ifscCode}
                  onChange={e => handleBranchInputChange('ifscCode', e.target.value)}
                  className="w-full bg-slate-50 text-slate-900 border border-slate-200/80 px-3 py-2 rounded-xl text-xs font-mono font-semibold tracking-wider focus:outline-none focus:bg-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 transition-all"
                />
              </div>

              <div>
                <label className="block text-slate-600 text-[10.5px] font-bold mb-1 uppercase tracking-wider">MICR Code</label>
                <input 
                  type="text"
                  value={branch.micrCode}
                  onChange={e => handleBranchInputChange('micrCode', e.target.value)}
                  className="w-full bg-slate-50 text-slate-900 border border-slate-200/80 px-3 py-2 rounded-xl text-xs font-mono font-semibold tracking-wider focus:outline-none focus:bg-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 transition-all"
                />
              </div>

              <div>
                <label className="block text-slate-600 text-[10.5px] font-bold mb-1 uppercase tracking-wider">Branch Address</label>
                <textarea 
                  value={branch.branchAddress}
                  onChange={e => handleBranchInputChange('branchAddress', e.target.value)}
                  rows={2}
                  className="w-full bg-slate-50 text-slate-900 border border-slate-200/80 px-3 py-2 rounded-xl text-xs font-sans focus:outline-none focus:bg-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 transition-all resize-none"
                />
              </div>
            </div>
          </div>

          {/* Section: Locked Parameters */}
          <div className="bg-slate-100 rounded-2xl border border-slate-200/60 p-5 shadow-xs space-y-4">
            <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2">
              <Landmark size={14} className="text-indigo-600" /> Hardcoded Parameters
            </h2>

            <div className="grid grid-cols-2 gap-3 text-zinc-700 text-[11px] leading-relaxed">
              <div className="bg-white rounded-xl p-2.5 border border-slate-200/40">
                <span className="text-[9px] text-slate-400 font-bold block uppercase mb-0.5">BANK</span>
                <span className="font-extrabold text-slate-900">{getBankFullName(bankStyle)}</span>
              </div>
              <div className="bg-white rounded-xl p-2.5 border border-slate-200/40">
                <span className="text-[9px] text-slate-400 font-bold block uppercase mb-0.5">BRANCH</span>
                <span className="font-extrabold text-slate-900">{branch.branchName}</span>
              </div>
              <div className="bg-white rounded-xl p-2.5 border border-slate-200/40">
                <span className="text-[9px] text-slate-400 font-bold block uppercase mb-0.5">INTEREST RATE</span>
                <span className="font-extrabold text-slate-900">2.50% p.a.</span>
              </div>
              <div className="bg-white rounded-xl p-2.5 border border-slate-200/40">
                <span className="text-[9px] text-slate-400 font-bold block uppercase mb-0.5">OPEN DATE</span>
                <span className="font-extrabold text-slate-900">09-05-2022</span>
              </div>
              <div className="bg-white rounded-xl p-2.5 border border-slate-200/40 col-span-2">
                <span className="text-[9px] text-slate-400 font-bold block uppercase mb-0.5">STATEMENT DURATION</span>
                <span className="font-extrabold text-slate-900">
                  {getPeriodDisplay()}
                  {generationMode === 'duration' && activeRecord && activeRecord.transactions.length > 0 && (
                    <> ({activeRecord.transactions[0].valueDate} to {activeRecord.transactions[activeRecord.transactions.length - 1].valueDate})</>
                  )}
                </span>
              </div>
              <div className="bg-white rounded-xl p-2.5 border border-slate-200/40 col-span-2">
                <span className="text-[9px] text-slate-400 font-bold block uppercase mb-0.5">OPENING BALANCE</span>
                <span className="font-extrabold text-emerald-600 font-mono text-xs">
                  ₹{(activeRecord ? activeRecord.accountInfo.openingBalance : account.openingBalance).toLocaleString('en-IN', { minimumFractionDigits: 2 })} CR
                </span>
              </div>
            </div>
          </div>

          {/* Action Trigger */}
          <button
            onClick={handleTriggerRegenerate}
            disabled={loading}
            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3.5 px-6 rounded-2xl shadow-md hover:shadow-lg hover:shadow-indigo-100 cursor-pointer transition-all text-xs uppercase tracking-widest flex items-center justify-center gap-2 group active:scale-98 disabled:opacity-50"
          >
            <RefreshCw size={14} className={`group-hover:rotate-180 transition-transform duration-500 ${loading ? 'animate-spin' : ''}`} />
            Regenerate Transactions
          </button>

        </aside>

        {/* Right Side: Exact Original Bank Layout Preview Container */}
        <main className="flex-1 overflow-auto min-w-0 bg-white lg:bg-slate-200/20 lg:border lg:border-slate-200 lg:rounded-3xl p-0 lg:p-6 shadow-inner print:p-0 print:border-none print:shadow-none print:bg-white print:overflow-visible h-full">
          {loading && !activeRecord ? (
            <div className="flex flex-col items-center justify-center py-20 text-slate-400 font-sans italic">
              <RefreshCw size={24} className="animate-spin mb-2 text-indigo-500" />
              Initializing Statistical Statement...
            </div>
          ) : activeRecord ? (
            <div className="min-w-[210mm] w-fit mx-auto print:mx-0">
              <StatementPreview 
                record={activeRecord} 
                onPrint={handlePrintCheck}
                onClose={() => {}} 
              />
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-20 text-slate-400 font-sans italic">
              No statement compiled yet.
            </div>
          )}
        </main>


      </div>
    </div>
  );

}