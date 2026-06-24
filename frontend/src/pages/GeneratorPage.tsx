import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import { Landmark, User, RefreshCw, LogOut, ShieldAlert, Building2, Calendar } from 'lucide-react';
import { Link } from 'react-router-dom';

// Components, Types & Hooks
import StatementPreview from '../components/StatementPreview';
import { generateStatementTransactions, generateSalariedStatementTransactions, formatDate } from '../lib/transactionEngine';
import { StatementRecord, CustomerDetails, BranchDetails, AccountInfo, StatementSettings, Transaction } from '../types';
import { logToSystem } from '../lib/dbBridge';
import { useAuth } from '../hooks/useAuth';
import api from '../lib/api';

type StatementType = 'salaried' | 'business';
type StatementDuration = '3months' | '6months' | '1year';

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
  if (duration === '6months' || record.transactions.length === 0) return record;

  const txs = record.transactions;

  // ── 3 Months: take the first 3 months starting from Jan 1st 2026 ──────────
  if (duration === '3months') {
    const startDate = new Date(2026, 0, 1, 0, 0, 0, 0); // 01-01-2026
    const cutoff = new Date(2026, 3, 1, 0, 0, 0, 0);    // 01-04-2026

    const filtered: Transaction[] = [];
    for (let i = 0; i < txs.length; i++) {
      const txDate = parseIndianDate(txs[i].valueDate);
      if (txDate >= startDate && txDate < cutoff) {
        filtered.push({ ...txs[i] });
      }
    }

    if (filtered.length > 0) {
      filtered[0].valueDate = '01-01-2026';
      filtered[0].postDate = '01-01-2026';
    }

    const totals = recomputeTotals(filtered, record.accountInfo.openingBalance);

    return {
      ...record,
      transactions: filtered,
      ...totals,
    };
  }

  // ── 1 Year: prepend a cloned-and-shifted previous 6 months ──────────────
  if (duration === '1year') {
    // Clone txs shifted 6 months back with ±10% variation in amounts
    const vary = (amount: number): number =>
      Math.max(50, Math.round(amount * (0.90 + Math.random() * 0.20)));

    const prevTxsRaw: Transaction[] = txs.map((tx, i) => {
      const d = parseIndianDate(tx.valueDate);
      d.setMonth(d.getMonth() - 6);
      const dateStr = formatDate(d);
      return {
        ...tx,
        id: `tx_prev_${i}_${d.getTime()}`,
        valueDate: dateStr,
        postDate: dateStr,
        debit: tx.debit ? vary(tx.debit) : null,
        credit: tx.credit ? vary(tx.credit) : null,
        balance: 0, // recalculated below
      };
    });

    // Calculate net flow of previous period to derive its opening balance
    let prevNetFlow = 0;
    for (const tx of prevTxsRaw) {
      if (tx.credit) prevNetFlow += tx.credit;
      if (tx.debit) prevNetFlow -= tx.debit;
    }
    // After prev period, balance should equal current period opening balance
    const prevOpeningBal = Math.max(1000, record.accountInfo.openingBalance - prevNetFlow);

    // Recalculate balances for prev period
    let bal = prevOpeningBal;
    const prevTxs = prevTxsRaw.map(tx => {
      if (tx.credit) bal += tx.credit;
      if (tx.debit) bal -= tx.debit;
      // Guard against negative balance
      if (bal < 500 && tx.debit) {
        // Reverse the debit partially
        const excess = 500 - bal;
        bal += excess;
        return { ...tx, debit: (tx.debit || 0) - excess, balance: bal };
      }
      return { ...tx, balance: bal };
    });

    const allTxs = [...prevTxs, ...txs];
    const totals = recomputeTotals(allTxs, prevOpeningBal);

    return {
      ...record,
      accountInfo: { ...record.accountInfo, openingBalance: prevOpeningBal },
      transactions: allTxs,
      ...totals,
    };
  }

  return record;
}

// Duration options config
const DURATION_OPTIONS: { value: StatementDuration; label: string; sub: string; months: number }[] = [
  { value: '3months', label: '3 Months',  sub: 'Last 3 months', months: 3 },
  { value: '6months', label: '6 Months',  sub: 'Last 6 months', months: 6 },
  { value: '1year',   label: '1 Year',    sub: 'Last 12 months', months: 12 },
];


export default function GeneratorPage() {
  const { user, logout } = useAuth();

  const [statementType, setStatementType] = useState<StatementType>('salaried');
  const [duration, setDuration] = useState<StatementDuration>('6months');

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

  const [branch, setBranch] = useState<BranchDetails>({
    branchName: 'GOVINDPURA, BHOPAL',
    branchAddress: 'INDUSTRIAL AREA GOVINDPURA, BHOPAL, MADHYA PRADESH - 462023',
    branchCode: '01916',
    branchEmail: 'sbi.01916@sbi.co.in',
    branchPhone: '+91-755-2586241',
    ifscCode: 'SBIN0001916',
    micrCode: '462002015',
    ckycrNumber: '50046100545797',
  });

  const account: AccountInfo = {
    openingBalance: 90000.00,
    interestRate: 2.50,
    currency: 'INR',
    accountStatus: 'Active',
    accountType: 'Savings',
  };

  const settings: StatementSettings = {
    bankStyle: 'SBI',
    duration: '6 Months',
    pageCount: 'Custom',
    customTransactionsCount: 320,
    transactionMode: 'Normal',
    profile: 'Personal',
  };

  const [activeRecord, setActiveRecord] = useState<StatementRecord | null>(null);
  const [loading, setLoading] = useState(true);

  // Generate / Regenerate statement record helper
  const handleGenerateStatement = (
    currentCustomer: CustomerDetails,
    type: StatementType = statementType,
    dur: StatementDuration = duration,
    isRegenerate = false
  ) => {
    setLoading(true);
    try {
      logToSystem('SYSTEM', 'INFO', `Invoking ${type === 'salaried' ? 'Salaried' : 'Business'} SBI Transaction Generation Engine.`);

      const transactions =
        type === 'salaried'
          ? generateSalariedStatementTransactions(settings, account, new Date().toISOString())
          : generateStatementTransactions(settings, account, new Date().toISOString());

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
        id: `stmt_sbi_${Date.now()}`,
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

      // Apply duration filtering/extension
      const displayed = applyDuration(base, dur);

      setBaseRecord(base);
      setActiveRecord(displayed);

      if (isRegenerate) {
        toast.success('Successfully regenerated transactions with unique random seeds!', { theme: 'dark' });
      }
      logToSystem('SYSTEM', 'INFO', `Compiled SBI statement: ${transactions.length} base rows → ${displayed.transactions.length} displayed rows (${dur}). Final balance: ₹${displayed.closingBalance.toLocaleString()}`);
    } catch (e: any) {
      console.warn('Could not generate statement', e);
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
      finalValue = value.toUpperCase();
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
      finalValue = value.toUpperCase();
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

  const handleTriggerRegenerate = () => {
    handleGenerateStatement(customer, statementType, duration, true);
  };

  // When statement type changes, auto-regenerate
  const handleTypeChange = (type: StatementType) => {
    setStatementType(type);
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

  return (
    <div className="h-screen overflow-hidden bg-slate-50 text-slate-800 flex flex-col font-sans print:bg-white print:text-black print:h-auto print:overflow-visible">
      {/* Non-printable Header */}
      <header className="bg-slate-900 text-white py-4 px-6 shadow-md border-b border-slate-800 select-none print:hidden flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center text-white shadow-inner">
            <Landmark size={22} className="text-white" />
          </div>
          <div>
            <h1 className="font-extrabold text-lg tracking-tight leading-none flex items-center gap-1.5">
              State Bank of India <span className="text-[10px] bg-indigo-850 text-indigo-300 px-2 py-0.5 rounded-full font-bold uppercase tracking-wider">Statistical Generator</span>
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

          {/* ── Statement Duration Selector ── */}
          <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-xs">
            <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-2 mb-4">
              <Calendar size={14} className="text-indigo-600" /> Statement Duration
            </h2>

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
                <span className="font-extrabold text-slate-900">State Bank of India</span>
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
                  {duration === '3months' ? '3 Months' : duration === '1year' ? '1 Year (12 Months)' : '6 Months'}
                  {activeRecord && activeRecord.transactions.length > 0 && (
                    <> ({activeRecord.transactions[0].valueDate} to {activeRecord.transactions[activeRecord.transactions.length - 1].valueDate})</>
                  )}
                </span>
              </div>
              <div className="bg-white rounded-xl p-2.5 border border-slate-200/40 col-span-2">
                <span className="text-[9px] text-slate-400 font-bold block uppercase mb-0.5">OPENING BALANCE</span>
                <span className="font-extrabold text-emerald-600 font-mono text-xs">
                  ₹{activeRecord ? activeRecord.accountInfo.openingBalance.toLocaleString('en-IN', { minimumFractionDigits: 2 }) : '90,000.00'} CR
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

        {/* Right Side: A4 Preview Container */}
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
