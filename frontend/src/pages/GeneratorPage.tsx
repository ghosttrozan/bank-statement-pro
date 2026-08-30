import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import {
  Landmark,
  User,
  RefreshCw,
  LogOut,
  ShieldAlert,
  Building2,
  Calendar,
  Wallet,
  XCircle,
  Download,
  Printer,
  Lock,
  Eye,
  EyeOff,
  FileText,
  CheckCircle2,
  ArrowDownRight,
  ArrowUpRight,
  ShieldCheck,
  Sparkles,
  Sliders
} from 'lucide-react';
import { Link } from 'react-router-dom';

// Components, Types & Hooks
import StatementPreview from '../components/StatementPreview';
import {
  generateStatementTransactions,
  generateSalariedStatementTransactions,
  formatDate,
  getRandomOpeningBalance
} from '../lib/transactionEngine';
import {
  StatementRecord,
  CustomerDetails,
  BranchDetails,
  AccountInfo,
  StatementSettings,
  Transaction
} from '../types';
import { logToSystem } from '../lib/dbBridge';
import { useAuth } from '../hooks/useAuth';
import {
  exportStatementToPdf,
  exportStatementToPdfViaBackend,
  downloadStatementPdfFromBackend
} from '../lib/pdfExport';
import api from '../lib/api';

type StatementType = 'salaried' | 'business';
type StatementDuration = '3months' | '6months' | '1year';
type GenerationMode = 'duration' | 'custom';
type SalaryMode = 'auto' | 'manual';

// Duration options config
const DURATION_OPTIONS: { value: StatementDuration; label: string; sub: string; months: number }[] = [
  { value: '3months', label: '3 Months', sub: 'Last 3 months', months: 3 },
  { value: '6months', label: '6 Months', sub: 'Last 6 months', months: 6 },
  { value: '1year', label: '1 Year', sub: 'Last 12 months', months: 12 },
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

// ── Shared form building blocks ────────────────
const inputCls =
  'w-full bg-white text-slate-900 border border-slate-300 px-3.5 py-2.5 rounded-xl text-sm font-sans focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all placeholder-slate-400';

function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <label className="block text-slate-500 text-[11px] font-bold uppercase tracking-wider mb-1.5">
      {children}
    </label>
  );
}

function Grid2({ children }: { children: React.ReactNode }) {
  return <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">{children}</div>;
}

function Section({
  icon: Icon,
  title,
  subtitle,
  children,
}: {
  icon: any;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden transition-shadow hover:shadow-sm">
      <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-100 bg-slate-50/80">
        <div className="flex items-center gap-2.5">
          <div className="p-1.5 rounded-lg bg-blue-50 text-blue-600">
            <Icon size={16} />
          </div>
          <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">{title}</span>
        </div>
        {subtitle && <span className="text-[11px] text-slate-400 font-medium">{subtitle}</span>}
      </div>
      <div className="p-5 space-y-4">{children}</div>
    </div>
  );
}

function SegmentedToggle<T extends string>({
  value,
  options,
  onChange,
}: {
  value: T;
  options: { value: T; label: string }[];
  onChange: (v: T) => void;
}) {
  return (
    <div className="inline-flex w-full rounded-xl border border-slate-200 bg-slate-100/80 p-1">
      {options.map((opt) => (
        <button
          key={opt.value}
          type="button"
          onClick={() => onChange(opt.value)}
          className={`flex-1 px-3.5 py-2 rounded-lg text-xs font-bold cursor-pointer transition-all ${value === opt.value
              ? 'bg-white text-blue-600 shadow-sm border border-slate-200/60'
              : 'text-slate-500 hover:text-slate-800'
            }`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}

function formatDateDisplay(date: Date): string {
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const day = String(date.getDate()).padStart(2, '0');
  const month = months[date.getMonth()];
  const year = date.getFullYear();
  return `${day} ${month} ${year}`;
}

function getDateRangeInfo(from: string, to: string): { days: number; months: number } | null {
  if (!from || !to) return null;
  const fromDate = new Date(from);
  const toDate = new Date(to);
  if (isNaN(fromDate.getTime()) || isNaN(toDate.getTime())) return null;
  const diffTime = toDate.getTime() - fromDate.getTime();
  if (diffTime < 0) return null;
  const days = Math.floor(diffTime / (1000 * 60 * 60 * 24)) + 1;
  const months = days / 30.44;
  return { days, months };
}

// Default branch presets
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

  // Password Protection state
  const [enablePassword, setEnablePassword] = useState(false);
  const [pdfPassword, setPdfPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const [baseRecord, setBaseRecord] = useState<StatementRecord | null>(null);
  const [activeRecord, setActiveRecord] = useState<StatementRecord | null>(null);
  const [loading, setLoading] = useState(false);
  const [isDownloadingPdf, setIsDownloadingPdf] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState<{ percent: number; text: string }>({
    percent: 0,
    text: '',
  });

  const [customer, setCustomer] = useState<CustomerDetails>({
    accountHolderName: 'SUDHIR KUMAR SHARMA',
    email: 'sudhir.sharma@sparktech.co.in',
    address: 'B-402, Block 4, Prestige Whispering Palms,\nWhitefield, Bangalore, Karnataka - 560066',
    accountNumber: '30521458920',
    cifNumber: '85962145321',
    accountOpenDate: '2022-05-09',
    nomineeName: 'MEENAKSHI SHARMA (WIFE)',
  });

  const [branch, setBranch] = useState<BranchDetails>(SBI_BRANCH_DEFAULTS);

  const [account, setAccount] = useState<AccountInfo>({
    openingBalance: getRandomOpeningBalance(),
    interestRate: 2.5,
    currency: 'INR',
    accountStatus: 'Active',
    accountType: 'Savings',
  });

  const baseSettings: StatementSettings = {
    bankStyle,
    duration: '6 Months',
    pageCount: '12 Pages',
    customTransactionsCount: 270,
    transactionMode: 'Normal',
    profile: 'Personal',
  };

  const handleBankStyleChange = (style: 'SBI' | 'SBI2' | 'Kotak' | 'BOI' | 'PNB') => {
    setBankStyle(style);
    let newBranch = SBI_BRANCH_DEFAULTS;
    if (style === 'Kotak') newBranch = KOTAK_BRANCH_DEFAULTS;
    else if (style === 'BOI') newBranch = BOI_BRANCH_DEFAULTS;
    else if (style === 'PNB') newBranch = PNB_BRANCH_DEFAULTS;
    setBranch(newBranch);

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

  // Initialize dates on mount
  useEffect(() => {
    const now = new Date();
    const year = now.getFullYear();
    const defaultFrom = `${year}-01-01`;
    const defaultTo = now.toISOString().split('T')[0];
    setFromDate(defaultFrom);
    setToDate(defaultTo);
  }, []);

  // Reset salary config & toggle opening balance when switching type
  useEffect(() => {
    if (statementType === 'business') {
      setSalaryMode('auto');
      setCompanyName('');
      setMonthlySalary(undefined);
      setSalaryDay('5');
      setAccount((prev) => ({ ...prev, openingBalance: 90000.0 }));
    } else {
      setAccount((prev) => ({ ...prev, openingBalance: getRandomOpeningBalance() }));
    }
  }, [statementType]);

  const handleGenerateStatement = (
    currentCustomer: CustomerDetails,
    type: StatementType = statementType,
    dur: StatementDuration = duration,
    isRegenerate = false
  ) => {
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

    const settings: StatementSettings = {
      ...baseSettings,
      bankStyle,
      duration: dur === '3months' ? '3 Months' : dur === '1year' ? '12 Months' : '6 Months',
      enablePdfPassword: enablePassword && Boolean(pdfPassword.trim()),
      pdfPassword: enablePassword ? pdfPassword.trim() : undefined,
      ...(generationMode === 'custom' && {
        generationMode: 'custom',
        fromDate,
        toDate,
      }),
      ...(type === 'salaried' && {
        salaryMode,
        companyName: salaryMode === 'manual' ? companyName.trim() : undefined,
        monthlySalary: salaryMode === 'manual' ? monthlySalary : undefined,
        salaryDay,
      }),
    };

    setLoading(true);
    try {
      const transactions =
        type === 'salaried'
          ? generateSalariedStatementTransactions(settings, account, new Date().toISOString(), currentCustomer, branch)
          : generateStatementTransactions(settings, account, new Date().toISOString(), currentCustomer, branch);

      let totalDebits = 0;
      let totalCredits = 0;
      let drCount = 0;
      let crCount = 0;

      transactions.forEach((t) => {
        if (t.debit) {
          totalDebits += t.debit;
          drCount++;
        }
        if (t.credit) {
          totalCredits += t.credit;
          crCount++;
        }
      });

      const closingBalance =
        transactions.length > 0 ? transactions[transactions.length - 1].balance : account.openingBalance;

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
        crCount,
      };

      setBaseRecord(base);
      setActiveRecord(base);

      if (isRegenerate) {
        toast.success('Successfully regenerated transactions with fresh random seeds!', { theme: 'dark' });
      }
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
      return true;
    }
  };

  // Generate initial statement
  useEffect(() => {
    handleGenerateStatement(customer, statementType, duration);
  }, []);

  const handleInputChange = (field: keyof CustomerDetails, value: string) => {
    const nextCustomer = { ...customer, [field]: value };
    setCustomer(nextCustomer);
    if (activeRecord) {
      setActiveRecord((prev) => (prev ? { ...prev, customerDetails: nextCustomer } : null));
    }
    if (baseRecord) {
      setBaseRecord((prev) => (prev ? { ...prev, customerDetails: nextCustomer } : null));
    }
  };

  const handleBranchInputChange = (field: keyof BranchDetails, value: string) => {
    const nextBranch = { ...branch, [field]: value };
    setBranch(nextBranch);
    if (activeRecord) {
      setActiveRecord((prev) => (prev ? { ...prev, branchDetails: nextBranch } : null));
    }
    if (baseRecord) {
      setBaseRecord((prev) => (prev ? { ...prev, branchDetails: nextBranch } : null));
    }
  };

  const handleAccountInputChange = (field: keyof AccountInfo, value: any) => {
    const nextAccount = { ...account, [field]: value };
    setAccount(nextAccount);
    if (activeRecord) {
      setActiveRecord((prev) => (prev ? { ...prev, accountInfo: nextAccount } : null));
    }
    if (baseRecord) {
      setBaseRecord((prev) => (prev ? { ...prev, accountInfo: nextAccount } : null));
    }
  };

  const handleTriggerRegenerate = () => {
    handleGenerateStatement(customer, statementType, duration, true);
  };

  const handleTypeChange = (type: StatementType) => {
    setStatementType(type);
    handleGenerateStatement(customer, type, duration, false);
  };

  const handleDurationChange = (dur: StatementDuration) => {
    setDuration(dur);
    handleGenerateStatement(customer, statementType, dur, false);
  };

  // ── High Performance PDF Export ──
  const handleDownloadPdf = async (mode: 'vector' | 'standard' = 'vector') => {
    await handlePrintCheck();

    setIsDownloadingPdf(true);
    setDownloadProgress({ percent: 15, text: 'Preparing statement payload...' });

    const passToUse = enablePassword && pdfPassword.trim() ? pdfPassword.trim() : undefined;
    const randCode =
      Math.random().toString(36).substring(2, 8).toUpperCase() + Math.floor(1000 + Math.random() * 9000);
    const filename = `${bankStyle}_Statement_${randCode}.pdf`;

    try {
      const container = document.querySelector('.print-container-target') as HTMLElement;

      if (container) {
        setDownloadProgress({ percent: 35, text: 'Compiling high-fidelity vector PDF...' });
        try {
          await exportStatementToPdfViaBackend(container, {
            filename,
            password: passToUse,
            onProgress: (pct, msg) => setDownloadProgress({ percent: pct, text: msg }),
          });
          toast.success(
            passToUse
              ? `🔐 Password-protected PDF downloaded! Password: "${passToUse}"`
              : '📄 Statement PDF downloaded successfully!',
            { theme: 'dark' }
          );
        } catch (backendErr) {
          console.warn('Backend vector PDF fallback to client canvas PDF:', backendErr);
          setDownloadProgress({ percent: 60, text: 'Rendering via client PDF engine...' });
          await exportStatementToPdf(container, {
            filename,
            password: passToUse,
            onProgress: (pct, msg) => setDownloadProgress({ percent: pct, text: msg }),
          });
          toast.success('📄 Statement PDF downloaded successfully!', { theme: 'dark' });
        }
      } else {
        // Fallback directly to backend statement generator
        const settings: StatementSettings = {
          ...baseSettings,
          bankStyle,
          enablePdfPassword: Boolean(passToUse),
          pdfPassword: passToUse,
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
          onProgress: (pct, msg) => setDownloadProgress({ percent: pct, text: msg }),
        });
        toast.success('📄 Statement PDF downloaded successfully!', { theme: 'dark' });
      }
    } catch (err: any) {
      console.error('PDF download failed:', err);
      toast.error(`Download failed: ${err.message || 'Unknown error'}`, { theme: 'dark' });
    } finally {
      setIsDownloadingPdf(false);
      setDownloadProgress({ percent: 0, text: '' });
    }
  };

  const handlePrint = async () => {
    await handlePrintCheck();
    window.print();
  };

  const getBankFullName = (style: 'SBI' | 'SBI2' | 'Kotak' | 'BOI' | 'PNB') => {
    switch (style) {
      case 'SBI':
        return 'State Bank of India';
      case 'SBI2':
        return 'State Bank of India 2.0';
      case 'Kotak':
        return 'Kotak Mahindra Bank';
      case 'BOI':
        return 'Bank of India';
      case 'PNB':
        return 'Punjab National Bank';
    }
  };

  const rangeInfo = generationMode === 'custom' ? getDateRangeInfo(fromDate, toDate) : null;

  return (
    <div className="min-h-screen bg-slate-100/70 text-slate-800 flex flex-col font-sans overflow-x-hidden">
      {/* Top Navbar */}
      <header className="sticky top-0 z-30 bg-slate-900 text-white py-3.5 px-4 sm:px-6 shadow-md border-b border-slate-800 select-none print:hidden">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center space-x-3 w-full sm:w-auto justify-between sm:justify-start">
            <div className="flex items-center space-x-3">
              <div
                className={`w-9 h-9 rounded-xl flex items-center justify-center text-white shadow-inner ${bankStyle === 'SBI'
                    ? 'bg-blue-600'
                    : bankStyle === 'Kotak'
                      ? 'bg-rose-600'
                      : bankStyle === 'BOI'
                        ? 'bg-sky-700'
                        : 'bg-red-700'
                  }`}
              >
                <Landmark size={20} className="text-white" />
              </div>
              <div>
                <h1 className="font-extrabold text-base tracking-tight leading-none flex items-center gap-2">
                  <span>{getBankFullName(bankStyle)}</span>
                  <span
                    className={`text-[9px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider ${bankStyle === 'SBI'
                        ? 'bg-blue-900/60 text-blue-300'
                        : bankStyle === 'Kotak'
                          ? 'bg-rose-900/60 text-rose-300'
                          : bankStyle === 'BOI'
                            ? 'bg-sky-900/60 text-sky-300'
                            : 'bg-red-900/60 text-amber-300'
                      }`}
                  >
                    Generator
                  </span>
                </h1>
                <span className="text-[10px] text-slate-400 font-semibold block mt-0.5">
                  HIGH-FIDELITY VECTOR ENGINE
                </span>
              </div>
            </div>
          </div>

          {/* Navigation Links */}
          <div className="flex flex-wrap items-center gap-2.5 w-full sm:w-auto justify-end">
            {user && (user.role === 'SUPER_ADMIN' || user.role === 'ADMIN') && (
              <Link
                to="/admin/dashboard"
                className="flex items-center gap-1.5 bg-blue-600/15 hover:bg-blue-600/25 text-blue-400 font-bold px-3 py-1.5 rounded-xl border border-blue-500/20 text-xs transition-all"
              >
                <ShieldAlert size={13} />
                Admin Portal
              </Link>
            )}

            <Link
              to="/profile"
              className="flex items-center gap-1.5 bg-slate-800 hover:bg-slate-700 font-bold px-3 py-1.5 rounded-xl border border-slate-700 text-xs transition-all text-slate-200"
            >
              <User size={13} />
              {user?.fullName || 'Profile'}
            </Link>

            <button
              onClick={logout}
              className="flex items-center gap-1.5 bg-rose-600/90 hover:bg-rose-600 text-white font-bold px-3 py-1.5 rounded-xl text-xs transition-all active:scale-95 cursor-pointer shadow-xs"
            >
              <LogOut size={13} />
              Logout
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Dashboard */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
        {/* Bank Selector Bar */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-4 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-blue-600 animate-pulse"></div>
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Select Bank Project:</span>
          </div>

          <div className="flex flex-wrap gap-2 w-full sm:w-auto">
            {BANK_STYLE_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => handleBankStyleChange(opt.value)}
                className={`flex-1 sm:flex-none px-4 py-2 rounded-xl text-xs font-bold cursor-pointer transition-all ${bankStyle === opt.value
                    ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20 scale-102'
                    : 'bg-slate-100 text-slate-700 border border-slate-200 hover:bg-slate-200'
                  }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* 2-Column Responsive Dashboard Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left Form Controls Area (8 cols on lg) */}
          <div className="lg:col-span-8 space-y-6">
            {/* Statement Type & Salary Configuration */}
            <Section icon={Building2} title="Statement Type & Salary Settings">
              <SegmentedToggle
                value={statementType}
                onChange={handleTypeChange}
                options={[
                  { value: 'salaried', label: '💼 Salaried Account' },
                  { value: 'business', label: '🏢 Business Account' },
                ]}
              />

              {statementType === 'salaried' ? (
                <div className="space-y-4 pt-2 border-t border-slate-100">
                  <div className="flex items-center justify-between">
                    <FieldLabel>Salary Credit Mode</FieldLabel>
                    <span className="text-[11px] text-blue-600 font-semibold">
                      {salaryMode === 'auto' ? 'Auto Calculated' : 'Custom Defined'}
                    </span>
                  </div>

                  <SegmentedToggle<SalaryMode>
                    value={salaryMode}
                    onChange={setSalaryMode}
                    options={[
                      { value: 'auto', label: 'Auto Salary Engine' },
                      { value: 'manual', label: 'Manual Salary Details' },
                    ]}
                  />

                  {salaryMode === 'manual' && (
                    <Grid2>
                      <div>
                        <FieldLabel>Monthly Salary Amount (₹)</FieldLabel>
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
                        <FieldLabel>Employer / Company Name</FieldLabel>
                        <input
                          type="text"
                          value={companyName}
                          onChange={(e) => setCompanyName(e.target.value.toUpperCase())}
                          placeholder="e.g. INFOSYS LIMITED"
                          className={inputCls}
                        />
                      </div>
                    </Grid2>
                  )}

                  <div>
                    <FieldLabel>Monthly Salary Credit Day</FieldLabel>
                    <div className="grid grid-cols-5 sm:grid-cols-9 gap-1.5">
                      {SALARY_DAY_PRESETS.map(({ val, label }) => (
                        <button
                          key={val}
                          type="button"
                          onClick={() => setSalaryDay(val as any)}
                          className={`py-2 rounded-xl text-xs font-bold cursor-pointer transition-all border ${salaryDay === val
                              ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                              : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                            }`}
                        >
                          {label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-600">
                  Business mode generates natural mixed UPI / IMPS / NEFT / ATM & Vendor transactions without a
                  fixed monthly corporate salary pattern.
                </div>
              )}
            </Section>

            {/* Account & Financials */}
            <Section icon={Landmark} title="Account & Balance">
              <Grid2>
                <div>
                  <FieldLabel>Account Number</FieldLabel>
                  <input
                    type="text"
                    value={customer.accountNumber}
                    onChange={(e) => handleInputChange('accountNumber', e.target.value.replace(/\D/g, ''))}
                    className={`${inputCls} font-mono font-bold tracking-wider`}
                  />
                </div>
                <div>
                  <FieldLabel>Opening Balance (₹)</FieldLabel>
                  <input
                    type="number"
                    value={account.openingBalance}
                    onChange={(e) => handleAccountInputChange('openingBalance', parseFloat(e.target.value) || 0)}
                    className={`${inputCls} font-mono font-bold text-emerald-600`}
                  />
                </div>
              </Grid2>

              <Grid2>
                <div>
                  <FieldLabel>Account Type</FieldLabel>
                  <input
                    type="text"
                    value={account.accountType}
                    onChange={(e) => handleAccountInputChange('accountType', e.target.value)}
                    placeholder="e.g. SAVINGS BANK AC"
                    className={inputCls}
                  />
                </div>
                <div>
                  <FieldLabel>Interest Rate (% p.a.)</FieldLabel>
                  <input
                    type="number"
                    step="0.01"
                    value={account.interestRate}
                    onChange={(e) => handleAccountInputChange('interestRate', parseFloat(e.target.value) || 0)}
                    className={inputCls}
                  />
                </div>
              </Grid2>
            </Section>

            {/* Customer Information */}
            <Section icon={User} title="Customer / Account Holder">
              <Grid2>
                <div>
                  <FieldLabel>Account Holder Name</FieldLabel>
                  <input
                    type="text"
                    value={customer.accountHolderName}
                    onChange={(e) => handleInputChange('accountHolderName', e.target.value.toUpperCase())}
                    className={inputCls}
                  />
                </div>
                <div>
                  <FieldLabel>Nominee Name</FieldLabel>
                  <input
                    type="text"
                    value={customer.nomineeName}
                    onChange={(e) => handleInputChange('nomineeName', e.target.value.toUpperCase())}
                    className={inputCls}
                  />
                </div>
              </Grid2>

              <Grid2>
                <div>
                  <FieldLabel>CIF Number</FieldLabel>
                  <input
                    type="text"
                    value={customer.cifNumber}
                    onChange={(e) => handleInputChange('cifNumber', e.target.value.replace(/\D/g, ''))}
                    className={`${inputCls} font-mono tracking-wider`}
                  />
                </div>
                <div>
                  <FieldLabel>Primary Email Address</FieldLabel>
                  <input
                    type="email"
                    value={customer.email}
                    onChange={(e) => handleInputChange('email', e.target.value)}
                    className={inputCls}
                  />
                </div>
              </Grid2>

              <div>
                <FieldLabel>Mailing Address</FieldLabel>
                <textarea
                  value={customer.address}
                  onChange={(e) => handleInputChange('address', e.target.value)}
                  rows={2}
                  className={`${inputCls} resize-none`}
                />
              </div>
            </Section>

            {/* Branch Details */}
            <Section icon={Building2} title="Bank Branch Information">
              <Grid2>
                <div>
                  <FieldLabel>Branch Name</FieldLabel>
                  <input
                    type="text"
                    value={branch.branchName}
                    onChange={(e) => handleBranchInputChange('branchName', e.target.value)}
                    className={inputCls}
                  />
                </div>
                <div>
                  <FieldLabel>Branch Code</FieldLabel>
                  <input
                    type="text"
                    value={branch.branchCode}
                    onChange={(e) => handleBranchInputChange('branchCode', e.target.value)}
                    className={`${inputCls} font-mono`}
                  />
                </div>
              </Grid2>

              <div>
                <FieldLabel>Branch Address</FieldLabel>
                <textarea
                  value={branch.branchAddress}
                  onChange={(e) => handleBranchInputChange('branchAddress', e.target.value)}
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
                    onChange={(e) => handleBranchInputChange('ifscCode', e.target.value.toUpperCase())}
                    className={`${inputCls} font-mono tracking-wider`}
                  />
                </div>
                <div>
                  <FieldLabel>MICR Code</FieldLabel>
                  <input
                    type="text"
                    value={branch.micrCode}
                    onChange={(e) => handleBranchInputChange('micrCode', e.target.value)}
                    className={`${inputCls} font-mono`}
                  />
                </div>
              </Grid2>
            </Section>

            {/* Statement Period */}
            <Section icon={Calendar} title="Statement Duration & Date Range">
              <SegmentedToggle<GenerationMode>
                value={generationMode}
                onChange={setGenerationMode}
                options={[
                  { value: 'duration', label: '⚡ Quick Duration' },
                  { value: 'custom', label: '📅 Custom Date Range' },
                ]}
              />

              {generationMode === 'duration' ? (
                <div className="space-y-3 pt-2">
                  <div className="grid grid-cols-3 gap-2.5">
                    {DURATION_OPTIONS.map((opt) => (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => handleDurationChange(opt.value)}
                        className={`py-3 px-3 rounded-xl text-xs font-bold cursor-pointer transition-all border ${duration === opt.value
                            ? 'bg-blue-600 text-white border-blue-600 shadow-md shadow-blue-500/15'
                            : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                          }`}
                      >
                        <div>{opt.label}</div>
                        <div
                          className={`text-[10px] font-normal mt-0.5 ${duration === opt.value ? 'text-blue-100' : 'text-slate-400'
                            }`}
                        >
                          {opt.sub}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="space-y-3 pt-2">
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
                    <div className="text-xs font-semibold text-blue-700 bg-blue-50 border border-blue-100 rounded-xl px-3.5 py-2.5 flex items-center justify-between">
                      <span>Calculated Range:</span>
                      <span className="font-bold">
                        {rangeInfo.days} Days (approx. {rangeInfo.months.toFixed(1)} Months)
                      </span>
                    </div>
                  )}
                  {fromDate && toDate && new Date(fromDate) > new Date(toDate) && (
                    <div className="flex items-center gap-2 bg-rose-50 border border-rose-200 rounded-xl px-3 py-2 text-rose-700 text-xs">
                      <XCircle size={14} className="flex-shrink-0" />
                      <span>From Date must be on or before To Date.</span>
                    </div>
                  )}
                </div>
              )}
            </Section>
          </div>

          {/* Right Action & Summary Panel (4 cols on lg, sticky on desktop) */}
          <div className="lg:col-span-4 space-y-6 lg:sticky lg:top-20">
            {/* Live Financial Metrics Card */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-5 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <Sparkles size={16} className="text-amber-500" />
                  <h3 className="font-bold text-slate-800 text-xs uppercase tracking-wider">Statement Summary</h3>
                </div>
                <span className="text-[10px] font-extrabold bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full border border-blue-100">
                  {bankStyle}
                </span>
              </div>

              <div className="space-y-2.5">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-500">Account Holder:</span>
                  <span className="font-bold text-slate-800 truncate max-w-[170px]">
                    {customer.accountHolderName}
                  </span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-500">Account Number:</span>
                  <span className="font-mono font-bold text-slate-800">{customer.accountNumber}</span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-500">Total Transactions:</span>
                  <span className="font-bold text-slate-800">
                    {activeRecord?.transactions.length || 0} Transactions
                  </span>
                </div>
              </div>

              {/* Financial Balances Grid */}
              <div className="grid grid-cols-2 gap-2.5 pt-2 border-t border-slate-100">
                <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200/70">
                  <div className="flex items-center gap-1 text-[10px] text-emerald-600 font-bold uppercase mb-0.5">
                    <ArrowDownRight size={12} /> Total Credits
                  </div>
                  <div className="font-mono font-bold text-xs text-slate-900">
                    ₹{(activeRecord?.totalCredits || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                  </div>
                  <div className="text-[9px] text-slate-400 mt-0.5">{activeRecord?.crCount || 0} credits</div>
                </div>

                <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200/70">
                  <div className="flex items-center gap-1 text-[10px] text-rose-600 font-bold uppercase mb-0.5">
                    <ArrowUpRight size={12} /> Total Debits
                  </div>
                  <div className="font-mono font-bold text-xs text-slate-900">
                    ₹{(activeRecord?.totalDebits || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                  </div>
                  <div className="text-[9px] text-slate-400 mt-0.5">{activeRecord?.drCount || 0} debits</div>
                </div>
              </div>

              <div className="bg-gradient-to-br from-blue-50 to-indigo-50/60 p-3.5 rounded-xl border border-blue-100 flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-bold uppercase text-blue-700 tracking-wider block">
                    Calculated Closing Balance
                  </span>
                  <span className="font-mono font-extrabold text-base text-blue-950">
                    ₹
                    {(activeRecord?.closingBalance || account.openingBalance).toLocaleString('en-IN', {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}{' '}
                    CR
                  </span>
                </div>
                <CheckCircle2 size={22} className="text-blue-600 flex-shrink-0" />
              </div>
            </div>

            {/* PDF Export & Security Settings Card */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-5 space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <Lock size={15} className="text-slate-500" />
                  <h3 className="font-bold text-slate-800 text-xs uppercase tracking-wider">PDF Security & Export</h3>
                </div>
              </div>

              {/* Password Protection Toggle */}
              <div className="space-y-3 bg-slate-50/80 p-3.5 rounded-xl border border-slate-200/70">
                <div className="flex items-center justify-between">
                  <label htmlFor="enable-password" className="text-xs font-bold text-slate-700 cursor-pointer">
                    Enable PDF Password Protection
                  </label>
                  <input
                    id="enable-password"
                    type="checkbox"
                    checked={enablePassword}
                    onChange={(e) => setEnablePassword(e.target.checked)}
                    className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500 cursor-pointer"
                  />
                </div>

                {enablePassword && (
                  <div className="pt-2">
                    <FieldLabel>Opening Password</FieldLabel>
                    <div className="relative">
                      <input
                        type={showPassword ? 'text' : 'password'}
                        value={pdfPassword}
                        onChange={(e) => setPdfPassword(e.target.value)}
                        placeholder="e.g. SUDH1234 or Date of Birth"
                        className={`${inputCls} pr-10`}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                      >
                        {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Primary Download Button */}
              <button
                onClick={() => handleDownloadPdf('vector')}
                disabled={isDownloadingPdf}
                className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 disabled:opacity-60 text-white font-bold py-3.5 px-4 rounded-xl shadow-lg shadow-blue-500/20 cursor-pointer transition-all flex items-center justify-center gap-2 active:scale-98 text-sm"
              >
                {isDownloadingPdf ? (
                  <>
                    <RefreshCw size={16} className="animate-spin" />
                    <span>{downloadProgress.text || 'Generating Statement PDF...'}</span>
                  </>
                ) : (
                  <>
                    <Download size={16} />
                    <span>Download Statement PDF</span>
                  </>
                )}
              </button>

              {/* Progress Bar when Downloading */}
              {isDownloadingPdf && downloadProgress.percent > 0 && (
                <div className="space-y-1.5">
                  <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden border border-slate-200">
                    <div
                      className="bg-blue-600 h-full transition-all duration-300 rounded-full"
                      style={{ width: `${downloadProgress.percent}%` }}
                    ></div>
                  </div>
                  <div className="text-[10px] text-slate-500 text-center font-medium">
                    {downloadProgress.percent}% · {downloadProgress.text}
                  </div>
                </div>
              )}

              {/* Secondary Actions */}
              <div className="grid grid-cols-2 gap-2 pt-1">
                <button
                  type="button"
                  onClick={handleTriggerRegenerate}
                  disabled={loading || isDownloadingPdf}
                  className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-2.5 px-3 rounded-xl text-xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer border border-slate-200/80"
                >
                  <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
                  <span>Regenerate</span>
                </button>

                <button
                  type="button"
                  onClick={handlePrint}
                  className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-2.5 px-3 rounded-xl text-xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer border border-slate-200/80"
                >
                  <Printer size={13} />
                  <span>Print (A4)</span>
                </button>
              </div>
            </div>

            {/* Quality Guarantee badge */}
            <div className="bg-emerald-50/70 border border-emerald-200/60 rounded-2xl p-4 flex items-start gap-3">
              <ShieldCheck size={18} className="text-emerald-600 mt-0.5 flex-shrink-0" />
              <div>
                <h4 className="text-xs font-bold text-emerald-900">100% Vector & OCR Extractable</h4>
                <p className="text-[11px] text-emerald-700 leading-relaxed mt-0.5">
                  Generated PDF contains complete native text layers compatible with automated verifiers (Karza,
                  Perfios, Finbit, Digitap).
                </p>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Hidden Offscreen Export & Print Target (Does not show in UI, but provides full DOM for PDF compilation and print) */}
      <div
        className="offscreen-export-target print:block"
        style={{
          position: 'fixed',
          left: '-99999px',
          top: '0',
          width: '210mm',
          opacity: 0,
          pointerEvents: 'none',
          zIndex: -1,
        }}
        aria-hidden="true"
      >
        {activeRecord && (
          <div className="print-container-target">
            <StatementPreview
              record={activeRecord}
              onClose={() => { }}
              onPrint={handlePrintCheck}
              hideControls={true}
            />
          </div>
        )}
      </div>
    </div>
  );
}
