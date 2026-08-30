import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import { Landmark, User, RefreshCw, LogOut, ShieldAlert, Building2, Calendar, Wallet, XCircle } from 'lucide-react';
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

const SALARY_DAY_PRESETS: { val: string; label: string }[] = [
  { val: '1', label: '1st' },
  { val: '3', label: '3rd' },
  { val: '5', label: '5th' },
  { val: '7', label: '7th' },
  { val: '10', label: '10th' },
  { val: '15', label: '15th' },
  { val: '25', label: '25th' },
  { val: '30', label: '30th' },
  { val: 'last_day', label: 'Last' },
];

const BANK_STYLE_OPTIONS: { value: 'SBI' | 'SBI2' | 'Kotak' | 'BOI' | 'PNB'; label: string }[] = [
  { value: 'SBI', label: 'SBI' },
  { value: 'SBI2', label: 'SBI V2' },
  { value: 'Kotak', label: 'Kotak' },
  { value: 'BOI', label: 'BOI' },
  { value: 'PNB', label: 'PNB' },
];

// ── Shared form building blocks (flat sectioned-card design) ────────────────
const inputCls = "w-full bg-white text-slate-900 border border-slate-300 px-3.5 py-2.5 rounded-lg text-sm font-sans focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all placeholder-slate-400";

function FieldLabel({ children }: { children: React.ReactNode }) {
  return <label className="block text-slate-500 text-[10.5px] font-semibold uppercase tracking-wide mb-1.5">{children}</label>;
}

function Grid2({ children }: { children: React.ReactNode }) {
  return <div className="grid grid-cols-2 gap-3">{children}</div>;
}

function Section({ icon: Icon, title, children }: { icon: any; title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
      <div className="flex items-center gap-2 px-4 py-3 border-b border-slate-100 bg-slate-50/70">
        <Icon size={14} className="text-slate-400" />
        <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">{title}</span>
      </div>
      <div className="p-4 space-y-3.5">
        {children}
      </div>
    </div>
  );
}

function SegmentedToggle<T extends string>({ value, options, onChange }: { value: T; options: { value: T; label: string }[]; onChange: (v: T) => void }) {
  return (
    <div className="inline-flex w-full rounded-lg border border-slate-200 bg-slate-50 p-0.5">
      {options.map(opt => (
        <button
          key={opt.value}
          type="button"
          onClick={() => onChange(opt.value)}
          className={`flex-1 px-3 py-1.5 rounded-md text-xs font-semibold cursor-pointer transition-colors ${
            value === opt.value
              ? 'bg-white text-blue-600 shadow-sm border border-slate-200'
              : 'text-slate-500 hover:text-slate-700'
          }`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}

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

export default function GeneratorPage() {
  const { user, logout } = useAuth();

  const [statementType, setStatementType] = useState<StatementType>('salaried');
  const [duration, setDuration] = useState<StatementDuration>('6months');
  const [generationMode, setGenerationMode] = useState<GenerationMode>('duration');
  const [fromDate, setFromDate] = useState<string>('');
  const [toDate, setToDate] = useState<string>('');
  const [bankStyle, setBankStyle] = useState<'SBI' | 'SBI2' | 'Kotak' | 'BOI' | 'PNB'>('SBI');

  // ─── Salary configuration states ──────────────────────────────────────
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
            bankStyle === 'SBI' ? 'bg-blue-600' : bankStyle === 'Kotak' ? 'bg-rose-600' : bankStyle === 'BOI' ? 'bg-sky-700' : 'bg-red-700'
          }`}>
            <Landmark size={22} className="text-white" />
          </div>
          <div>
            <h1 className="font-extrabold text-lg tracking-tight leading-none flex items-center gap-1.5">
              {getBankFullName(bankStyle)}{' '}
              <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider ${
                bankStyle === 'SBI' ? 'text-blue-300' : bankStyle === 'Kotak' ? 'text-rose-300' : bankStyle === 'BOI' ? 'text-sky-300' : 'text-amber-300'
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
              className="flex items-center gap-1.5 bg-blue-600/10 hover:bg-blue-600/20 text-blue-400 font-bold px-3 py-1.5 rounded-xl border border-blue-500/20 text-xs transition-all"
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
        <aside className="w-full lg:w-96 flex flex-col space-y-5 select-none print:hidden shrink-0 lg:overflow-y-auto lg:h-full lg:pr-2">

          {/* Select Project (bank format) pill switch */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-4">
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider text-center mb-3">Select Project</p>
            <div className="flex gap-1.5 overflow-x-auto pb-0.5">
              {BANK_STYLE_OPTIONS.map(opt => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => handleBankStyleChange(opt.value)}
                  className={`flex-1 min-w-[64px] whitespace-nowrap py-2 px-2 rounded-lg text-xs font-bold cursor-pointer transition-colors ${
                    bankStyle === opt.value
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Statement Type */}
          <Section icon={Building2} title="Statement Type">
            <SegmentedToggle
              value={statementType}
              onChange={handleTypeChange}
              options={[
                { value: 'salaried', label: 'Salaried' },
                { value: 'business', label: 'Business' },
              ]}
            />
            <p className="text-[10.5px] text-slate-400 leading-relaxed">
              {statementType === 'salaried'
                ? 'Salary of ₹20,000–₹80,000 credited via NEFT from a company each month.'
                : 'Mixed UPI / IMPS / NEFT / ATM transactions, no fixed salary pattern.'}
            </p>
          </Section>

          {/* Account */}
          <Section icon={Landmark} title="Account">
            <Grid2>
              <div>
                <FieldLabel>Account Number</FieldLabel>
                <input
                  type="text"
                  value={customer.accountNumber}
                  onChange={e => handleInputChange('accountNumber', e.target.value.replace(/\D/g, ''))}
                  className={`${inputCls} font-mono tracking-widest`}
                />
              </div>
              <div>
                <FieldLabel>Opening Balance (₹)</FieldLabel>
                <input
                  type="number"
                  value={account.openingBalance}
                  onChange={e => handleAccountInputChange('openingBalance', parseFloat(e.target.value) || 0)}
                  className={`${inputCls} font-mono font-bold`}
                />
              </div>
            </Grid2>
          </Section>

          {/* Salary Configuration (only for Salaried) */}
          {statementType === 'salaried' && (
            <Section icon={Wallet} title="Salary">
              <SegmentedToggle<SalaryMode>
                value={salaryMode}
                onChange={setSalaryMode}
                options={[
                  { value: 'auto', label: 'Auto' },
                  { value: 'manual', label: 'Manual' },
                ]}
              />

              {salaryMode === 'manual' && (
                <Grid2>
                  <div>
                    <FieldLabel>Salary Amount (₹)</FieldLabel>
                    <input
                      type="number"
                      min={1}
                      value={monthlySalary ?? ''}
                      onChange={(e) => {
                        const val = e.target.value;
                        if (val === '') {
                          setMonthlySalary(undefined);
                        } else {
                          const num = Number(val);
                          if (!isNaN(num) && num >= 0) {
                            setMonthlySalary(Math.floor(num));
                          }
                        }
                      }}
                      placeholder="e.g. 45000"
                      className={`${inputCls} font-mono`}
                    />
                  </div>
                  <div>
                    <FieldLabel>Company Name</FieldLabel>
                    <input
                      type="text"
                      value={companyName}
                      onChange={(e) => handleCompanyNameChange(e.target.value)}
                      placeholder="e.g. INFOSYS LIMITED"
                      className={inputCls}
                    />
                  </div>
                </Grid2>
              )}

              <div>
                <FieldLabel>Salary Credit Day</FieldLabel>
                <div className="grid grid-cols-5 gap-1.5">
                  {SALARY_DAY_PRESETS.map(({ val, label }) => (
                    <button
                      key={val}
                      type="button"
                      onClick={() => setSalaryDay(val as any)}
                      className={`py-1.5 rounded-lg text-[10.5px] font-bold cursor-pointer transition-colors border ${
                        salaryDay === val
                          ? 'bg-blue-600 text-white border-blue-600'
                          : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
                <div className="flex items-center gap-2 mt-2">
                  <span className="text-[11px] text-slate-400 font-medium whitespace-nowrap">Custom day (1–31):</span>
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
                    className={`${inputCls} w-20 py-1.5`}
                  />
                </div>
                <p className="text-[10px] text-slate-400 mt-1.5">Sunday credit dates automatically shift to Saturday.</p>
              </div>
            </Section>
          )}

          {/* Branch */}
          <Section icon={Building2} title="Branch">
            <div>
              <FieldLabel>Branch Name</FieldLabel>
              <input
                type="text"
                value={branch.branchName}
                onChange={e => handleBranchInputChange('branchName', e.target.value)}
                className={inputCls}
              />
            </div>
            <div>
              <FieldLabel>Branch Address</FieldLabel>
              <textarea
                value={branch.branchAddress}
                onChange={e => handleBranchInputChange('branchAddress', e.target.value)}
                rows={2}
                className={`${inputCls} resize-none`}
              />
            </div>
            <Grid2>
              <div>
                <FieldLabel>IFSC Code</FieldLabel>
                <input
                  type="text"
                  value={branch.ifscCode}
                  onChange={e => handleBranchInputChange('ifscCode', e.target.value)}
                  className={`${inputCls} font-mono tracking-wider`}
                />
              </div>
              <div>
                <FieldLabel>MICR Code</FieldLabel>
                <input
                  type="text"
                  value={branch.micrCode}
                  onChange={e => handleBranchInputChange('micrCode', e.target.value)}
                  className={`${inputCls} font-mono`}
                />
              </div>
            </Grid2>
          </Section>

          {/* Customer */}
          <Section icon={User} title="Customer">
            <Grid2>
              <div>
                <FieldLabel>Account Holder Name</FieldLabel>
                <input
                  type="text"
                  value={customer.accountHolderName}
                  onChange={e => handleInputChange('accountHolderName', e.target.value)}
                  className={inputCls}
                />
              </div>
              <div>
                <FieldLabel>Nominee Name</FieldLabel>
                <input
                  type="text"
                  value={customer.nomineeName}
                  onChange={e => handleInputChange('nomineeName', e.target.value)}
                  className={inputCls}
                />
              </div>
            </Grid2>
            <Grid2>
              <div>
                <FieldLabel>Account Type</FieldLabel>
                <input
                  type="text"
                  value={account.accountType}
                  onChange={e => handleAccountInputChange('accountType', e.target.value)}
                  placeholder="e.g. SAVINGS BANK AC"
                  className={inputCls}
                />
              </div>
              <div>
                <FieldLabel>CIF Number</FieldLabel>
                <input
                  type="text"
                  value={customer.cifNumber}
                  onChange={e => handleInputChange('cifNumber', e.target.value.replace(/\D/g, ''))}
                  className={`${inputCls} font-mono tracking-wider`}
                />
              </div>
            </Grid2>
            <div>
              <FieldLabel>Primary Email ID</FieldLabel>
              <input
                type="email"
                value={customer.email}
                onChange={e => handleInputChange('email', e.target.value)}
                className={inputCls}
              />
            </div>
            <div>
              <FieldLabel>Mailing Address</FieldLabel>
              <textarea
                value={customer.address}
                onChange={e => handleInputChange('address', e.target.value)}
                rows={2}
                className={`${inputCls} resize-none`}
              />
            </div>
          </Section>

          {/* Statement Period */}
          <Section icon={Calendar} title="Statement Period">
            <SegmentedToggle<GenerationMode>
              value={generationMode}
              onChange={setGenerationMode}
              options={[
                { value: 'duration', label: 'Quick Duration' },
                { value: 'custom', label: 'Custom Range' },
              ]}
            />

            {generationMode === 'duration' ? (
              <>
                <div className="grid grid-cols-3 gap-2">
                  {DURATION_OPTIONS.map(opt => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => handleDurationChange(opt.value)}
                      className={`py-2.5 rounded-lg text-xs font-bold cursor-pointer transition-colors border ${
                        duration === opt.value
                          ? 'bg-blue-600 text-white border-blue-600'
                          : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
                <p className="text-[10.5px] text-slate-400">
                  {duration === '3months' && 'Showing last 3 months of transactions.'}
                  {duration === '6months' && 'Full 6-month statement — default view.'}
                  {duration === '1year' && 'Full 12-month statement.'}
                </p>
              </>
            ) : (
              <>
                <Grid2>
                  <div>
                    <FieldLabel>From Date</FieldLabel>
                    <input
                      type="date"
                      value={fromDate}
                      onChange={(e) => setFromDate(e.target.value)}
                      className={inputCls}
                    />
                  </div>
                  <div>
                    <FieldLabel>To Date</FieldLabel>
                    <input
                      type="date"
                      value={toDate}
                      onChange={(e) => setToDate(e.target.value)}
                      className={inputCls}
                    />
                  </div>
                </Grid2>
                {rangeInfo && (
                  <div className="text-[11px] font-semibold text-blue-700 bg-blue-50 border border-blue-100 rounded-lg px-3 py-2">
                    {rangeInfo.days} days · ≈ {rangeInfo.months.toFixed(1)} months
                  </div>
                )}
                {(!fromDate || !toDate) && (
                  <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2.5 text-amber-800 text-[11px]">
                    <span>⚠️</span>
                    <span>Please select both dates.</span>
                  </div>
                )}
                {fromDate && toDate && new Date(fromDate) > new Date(toDate) && (
                  <div className="flex items-start gap-2 bg-rose-50 border border-rose-200 rounded-lg px-3 py-2.5 text-rose-700 text-[11px]">
                    <XCircle size={13} className="mt-0.5 flex-shrink-0" />
                    <span>From Date must be on or before To Date.</span>
                  </div>
                )}
              </>
            )}
          </Section>

          {/* Summary */}
          <Section icon={Landmark} title="Summary">
            <div className="grid grid-cols-2 gap-3 text-zinc-700 text-[11px] leading-relaxed">
              <div className="bg-slate-50 rounded-xl p-2.5 border border-slate-200/60">
                <span className="text-[9px] text-slate-400 font-bold block uppercase mb-0.5">Bank</span>
                <span className="font-extrabold text-slate-900">{getBankFullName(bankStyle)}</span>
              </div>
              <div className="bg-slate-50 rounded-xl p-2.5 border border-slate-200/60">
                <span className="text-[9px] text-slate-400 font-bold block uppercase mb-0.5">Branch</span>
                <span className="font-extrabold text-slate-900">{branch.branchName}</span>
              </div>
              <div className="bg-slate-50 rounded-xl p-2.5 border border-slate-200/60">
                <span className="text-[9px] text-slate-400 font-bold block uppercase mb-0.5">Interest Rate</span>
                <span className="font-extrabold text-slate-900">2.50% p.a.</span>
              </div>
              <div className="bg-slate-50 rounded-xl p-2.5 border border-slate-200/60">
                <span className="text-[9px] text-slate-400 font-bold block uppercase mb-0.5">Open Date</span>
                <span className="font-extrabold text-slate-900">09-05-2022</span>
              </div>
              <div className="bg-slate-50 rounded-xl p-2.5 border border-slate-200/60 col-span-2">
                <span className="text-[9px] text-slate-400 font-bold block uppercase mb-0.5">Statement Duration</span>
                <span className="font-extrabold text-slate-900">
                  {getPeriodDisplay()}
                  {generationMode === 'duration' && activeRecord && activeRecord.transactions.length > 0 && (
                    <> ({activeRecord.transactions[0].valueDate} to {activeRecord.transactions[activeRecord.transactions.length - 1].valueDate})</>
                  )}
                </span>
              </div>
              <div className="bg-slate-50 rounded-xl p-2.5 border border-slate-200/60 col-span-2">
                <span className="text-[9px] text-slate-400 font-bold block uppercase mb-0.5">Opening Balance</span>
                <span className="font-extrabold text-emerald-600 font-mono text-xs">
                  ₹{(activeRecord ? activeRecord.accountInfo.openingBalance : account.openingBalance).toLocaleString('en-IN', { minimumFractionDigits: 2 })} CR
                </span>
              </div>
            </div>
          </Section>

          {/* Action Trigger */}
          <button
            onClick={handleTriggerRegenerate}
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-bold py-3.5 px-6 rounded-xl shadow-lg shadow-blue-100 cursor-pointer transition-all text-sm flex items-center justify-center gap-2 active:scale-98"
          >
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
            Regenerate Transactions
          </button>

        </aside>

        {/* Right Side: Exact Original Bank Layout Preview Container */}
        <main className="flex-1 overflow-auto min-w-0 bg-white lg:bg-slate-200/20 lg:border lg:border-slate-200 lg:rounded-3xl p-0 lg:p-6 shadow-inner print:p-0 print:border-none print:shadow-none print:bg-white print:overflow-visible h-full">
          {loading && !activeRecord ? (
            <div className="flex flex-col items-center justify-center py-20 text-slate-400 font-sans italic">
              <RefreshCw size={24} className="animate-spin mb-2 text-blue-500" />
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
