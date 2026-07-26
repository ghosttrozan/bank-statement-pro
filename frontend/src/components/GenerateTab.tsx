import React, { useState } from 'react';
import { 
  User, Building2, Landmark, Settings, Sparkles, CheckCircle2, ChevronRight, ChevronLeft, Info, HelpCircle
} from 'lucide-react';
import { CustomerDetails, BranchDetails, AccountInfo, StatementSettings, StatementRecord } from '../types';
import { CUSTOMER_PRESETS, logToSystem } from '../lib/dbBridge';
import { generateStatementTransactions } from '../lib/transactionEngine';

interface GenerateTabProps {
  onGenerate: (record: StatementRecord) => void;
  onSetPreset: (presetName: string) => void;
}

export default function GenerateTab({ onGenerate, onSetPreset }: GenerateTabProps) {
  const [currentStep, setCurrentStep] = useState<number>(1);
  
  // Step 1: Customer Details state
  const [customer, setCustomer] = useState<CustomerDetails>({
    accountHolderName: '',
    email: '',
    address: '',
    accountNumber: '',
    cifNumber: '',
    accountOpenDate: '2020-01-01',
    nomineeName: 'No nominee registered'
  });

  // Step 2: Branch Details state
  const [branch, setBranch] = useState<BranchDetails>({
    branchName: '',
    branchAddress: '',
    branchCode: '',
    branchEmail: '',
    branchPhone: '',
    ifscCode: '',
    micrCode: '',
    ckycrNumber: ''
  });

  // Step 3: Account Info state
  const [account, setAccount] = useState<AccountInfo>({
    openingBalance: 50000.00,
    interestRate: 2.70,
    currency: 'INR',
    accountStatus: 'Active',
    accountType: 'Savings'
  });

  // Step 4: Statement settings
  const [settings, setSettings] = useState<StatementSettings>({
    bankStyle: 'SBI',
    duration: '3 Months',
    pageCount: '2 Pages',
    customTransactionsCount: 32,
    transactionMode: 'Normal',
    profile: 'Personal'
  });

  // Handle Preset quick fill
  const handleLoadPreset = (index: number) => {
    const p = CUSTOMER_PRESETS[index];
    setCustomer(p.customer);
    setBranch(p.branch);
    setAccount(p.info);
    setSettings(p.settings);
    onSetPreset(p.name);
    
    logToSystem('IPC_BRIDGE', 'INFO', `Preset Loader invoked: "${p.name}". Automatically synchronized 27 fields across model schema.`);
    logToSystem('SQLITE_DB', 'DEBUG', `SELECT * FROM "Presets" WHERE "name" = '${p.name}' LIMIT 1;`);
  };

  const handleInputChange = (step: number, field: string, value: any) => {
    if (step === 1) {
      setCustomer(prev => ({ ...prev, [field]: value }));
    } else if (step === 2) {
      // Automatic uppercase for financial network identifiers (IFSC, MICR, Br Code)
      let finalVal = value;
      if (['ifscCode', 'branchCode', 'micrCode'].includes(field)) {
        finalVal = String(value).toUpperCase().replace(/\s/g, '');
      }
      setBranch(prev => ({ ...prev, [field]: finalVal }));
      if (field === 'ifscCode') {
        const cleanIFSC = finalVal.toUpperCase();
        if (cleanIFSC.startsWith('PUNB')) {
          setSettings(prev => ({ ...prev, bankStyle: 'PNB' }));
        } else if (cleanIFSC.startsWith('BKID')) {
          setSettings(prev => ({ ...prev, bankStyle: 'BOI' }));
        } else if (cleanIFSC.startsWith('KKBK')) {
          setSettings(prev => ({ ...prev, bankStyle: 'Kotak' }));
        } else if (cleanIFSC.startsWith('SBIN')) {
          setSettings(prev => ({ ...prev, bankStyle: 'SBI' }));
        }
      }
    } else if (step === 3) {
      setAccount(prev => ({ ...prev, [field]: value }));
    } else if (step === 4) {
      setSettings(prev => {
        const next = { ...prev, [field]: value };
        // Sync custom transaction input limit boundaries
        if (field === 'pageCount' && value === 'Custom') {
          next.customTransactionsCount = 20;
        }
        return next;
      });
    }
  };

  const validateStep = (step: number): { valid: boolean; error?: string } => {
    if (step === 1) {
      if (!customer.accountHolderName.trim()) return { valid: false, error: 'Account Holder Name is required.' };
      if (!customer.accountNumber.trim()) return { valid: false, error: 'Account Number is required.' };
      if (!/^\d+$/.test(customer.accountNumber.trim())) return { valid: false, error: 'Account Number must contain numbers only.' };
      if (customer.email && !customer.email.includes('@')) return { valid: false, error: 'Enter a valid Customer Email address.' };
    } else if (step === 2) {
      if (!branch.branchName.trim()) return { valid: false, error: 'Branch Name is required.' };
      if (!branch.ifscCode.trim()) return { valid: false, error: 'IFSC Code is required.' };
      if (branch.ifscCode.length < 5) return { valid: false, error: 'Invalid IFSC Code length.' };
    } else if (step === 3) {
      if (isNaN(account.openingBalance)) return { valid: false, error: 'Opening Balance must be a numeric multiplier.' };
      if (account.openingBalance < 0) return { valid: false, error: 'Opening Balance cannot be negative.' };
    }
    return { valid: true };
  };

  const handleNextStep = () => {
    const check = validateStep(currentStep);
    if (!check.valid) {
      alert(check.error);
      logToSystem('SYSTEM', 'WARN', `Validation failed at Step ${currentStep}: ${check.error}`);
      return;
    }
    
    logToSystem('SYSTEM', 'INFO', `User checked and passed Form Step ${currentStep}. Moving layout cursor.`);
    setCurrentStep(prev => prev + 1);
  };

  const handlePrevStep = () => {
    setCurrentStep(prev => prev - 1);
  };

  const handleCreateDocumentPayload = () => {
    const finalTime = new Date().toISOString();
    logToSystem('SYSTEM', 'INFO', 'Invoking final Transaction Generation Engine algorithms.');
    
    // Generate transactions array chronologically
    const transactions = generateStatementTransactions(settings, account, finalTime);
    
    // Calculate aggregate totals
    let totalDebits = 0;
    let totalCredits = 0;
    let drCount = 0;
    let crCount = 0;
    
    transactions.forEach(tx => {
      if (tx.debit) {
        totalDebits += tx.debit;
        drCount++;
      }
      if (tx.credit) {
        totalCredits += tx.credit;
        crCount++;
      }
    });

    const closingBalance = transactions.length > 0 ? transactions[transactions.length - 1].balance : account.openingBalance;

    const payload: StatementRecord = {
      id: `stmt_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
      createdAt: finalTime,
      customerDetails: customer,
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

    onGenerate(payload);
  };

  const stepsList = [
    { num: 1, label: 'Customer', icon: User },
    { num: 2, label: 'Branch', icon: Building2 },
    { num: 3, label: 'Account Info', icon: Landmark },
    { num: 4, label: 'Settings', icon: Settings },
    { num: 5, label: 'Execute', icon: Sparkles }
  ];

  return (
    <div className="bg-white p-6 sm:p-8 rounded-2xl border border-slate-200 shadow-xs relative">
      
      {/* Quick Profile presets tray */}
      <div className="mb-6 bg-slate-50 p-4 rounded-xl flex flex-col md:flex-row md:items-center justify-between border border-slate-200 gap-4">
        <div>
          <span className="text-indigo-600 font-bold text-xs flex items-center gap-1.5 font-sans uppercase tracking-wider">
            <Sparkles size={14} className="text-amber-500 animate-spin-slow" />
            Instant Ledger Presets
          </span>
          <p className="text-slate-500 text-[11px] mt-0.5">Avoid spelling out 30+ details manually. Click to fetch pre-audited Indian standard accounts.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {CUSTOMER_PRESETS.map((p, idx) => (
            <button
              key={idx}
              onClick={() => handleLoadPreset(idx)}
              className="bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 font-sans hover:text-slate-900 py-1.5 px-3 rounded-lg text-xs font-semibold cursor-pointer transition-colors shadow-xs"
            >
              Load {p.bank === 'SBI' ? 'SBI' : 'Kotak'}: {p.customer.accountHolderName.split(' ')[0]}
            </button>
          ))}
        </div>
      </div>

      {/* Step Indicators Header */}
      <div className="flex items-center justify-between mx-auto max-w-4xl mb-8 relative border-b border-slate-100 pb-4">
        {stepsList.map((st, idx) => {
          const IconComp = st.icon;
          const isActive = currentStep === st.num;
          const isPassed = currentStep > st.num;
          
          return (
            <div key={st.num} className="flex-1 flex flex-col items-center relative select-none">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center border transition-all ${
                isActive ? 'bg-indigo-600 text-white border-indigo-600 shadow-md shadow-indigo-100 scale-110 font-bold' :
                isPassed ? 'bg-emerald-500 text-white border-emerald-500' :
                'bg-slate-50 text-slate-400 border-slate-200'
              }`}>
                {isPassed ? <CheckCircle2 size={16} /> : <IconComp size={15} />}
              </div>
              <span className={`text-[10px] sm:text-xs mt-1.5 font-semibold transition-colors ${
                isActive ? 'text-indigo-600' : 'text-slate-400'
              }`}>
                {st.label}
              </span>
            </div>
          );
        })}
      </div>

      {/* Step Form Switch Container */}
      <div className="min-h-[290px] max-w-4xl mx-auto py-1">
        
        {/* STEP 1: Customer details */}
        {currentStep === 1 && (
          <div className="animate-fadeIn space-y-4">
            <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
              <User size={16} className="text-indigo-600" /> Customer Identity & Contact Dossier
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-slate-600 text-xs font-semibold mb-1.5">Account Holder Legal Name *</label>
                <input 
                  type="text"
                  value={customer.accountHolderName}
                  onChange={e => handleInputChange(1, 'accountHolderName', e.target.value.toUpperCase())}
                  placeholder="e.g. RATAN TATA"
                  className="w-full bg-white text-slate-900 border border-slate-200 p-2.5 rounded-lg text-sm font-sans focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 transition-all placeholder-slate-400"
                />
              </div>
              <div>
                <label className="block text-slate-600 text-xs font-semibold mb-1.5">Primary Email ID</label>
                <input 
                  type="email"
                  value={customer.email}
                  onChange={e => handleInputChange(1, 'email', e.target.value)}
                  placeholder="name@personal-domain.com"
                  className="w-full bg-white text-slate-900 border border-slate-200 p-2.5 rounded-lg text-sm font-sans focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 transition-all placeholder-slate-400"
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-slate-600 text-xs font-semibold mb-1.5">Contact Mailing Address</label>
                <input 
                  type="text"
                  value={customer.address}
                  onChange={e => handleInputChange(1, 'address', e.target.value)}
                  placeholder="Flat/House/Street No, Cross Road, Landmark, PIN Code"
                  className="w-full bg-white text-slate-900 border border-slate-200 p-2.5 rounded-lg text-sm font-sans focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 transition-all placeholder-slate-400"
                />
              </div>
              <div>
                <label className="block text-slate-600 text-xs font-semibold mb-1.5">Bank Account Number * (Numbers Only)</label>
                <input 
                  type="text"
                  value={customer.accountNumber}
                  onChange={e => handleInputChange(1, 'accountNumber', e.target.value.replace(/\D/g, ''))}
                  placeholder="e.g. 3052145892"
                  maxLength={18}
                  className="w-full bg-white text-slate-900 border border-slate-200 p-2.5 rounded-lg text-sm font-mono tracking-widest focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 transition-all placeholder-slate-400"
                />
              </div>
              <div>
                <label className="block text-slate-600 text-xs font-semibold mb-1.5">Customer CIF (Customer Information File) No.</label>
                <input 
                  type="text"
                  value={customer.cifNumber}
                  onChange={e => handleInputChange(1, 'cifNumber', e.target.value.replace(/\D/g, ''))}
                  placeholder="e.g. 74512963"
                  maxLength={15}
                  className="w-full bg-white text-slate-900 border border-slate-200 p-2.5 rounded-lg text-sm font-mono focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 transition-all placeholder-slate-400"
                />
              </div>
              <div>
                <label className="block text-slate-600 text-xs font-semibold mb-1.5">Account Open Date</label>
                <input 
                  type="date"
                  value={customer.accountOpenDate}
                  onChange={e => handleInputChange(1, 'accountOpenDate', e.target.value)}
                  className="w-full bg-white text-slate-900 border border-slate-200 p-2.5 rounded-lg text-sm font-sans focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 transition-all"
                />
              </div>
              <div>
                <label className="block text-slate-600 text-xs font-semibold mb-1.5">Nominee Registration Name</label>
                <input 
                  type="text"
                  value={customer.nomineeName}
                  onChange={e => handleInputChange(1, 'nomineeName', e.target.value)}
                  placeholder="e.g. RITA ROY (MOTHER) or No nominee registered"
                  className="w-full bg-white text-slate-900 border border-slate-200 p-2.5 rounded-lg text-sm font-sans focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 transition-all placeholder-slate-400"
                />
              </div>
            </div>
          </div>
        )}

        {/* STEP 2: Branch details */}
        {currentStep === 2 && (
          <div className="animate-fadeIn space-y-4">
            <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
              <Building2 size={16} className="text-indigo-600" /> Official Bank Branch Settings
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-slate-600 text-xs font-semibold mb-1.5">Branch Name *</label>
                <input 
                  type="text"
                  value={branch.branchName}
                  onChange={e => handleInputChange(2, 'branchName', e.target.value.toUpperCase())}
                  placeholder="e.g. WHITEFIELD INDUSTRIAL AREA BRANCH"
                  className="w-full bg-white text-slate-900 border border-slate-200 p-2.5 rounded-lg text-sm font-sans focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 transition-all placeholder-slate-400"
                />
              </div>
              <div>
                <label className="block text-slate-600 text-xs font-semibold mb-1.5">Branch Code (4/5 digits)</label>
                <input 
                  type="text"
                  value={branch.branchCode}
                  onChange={e => handleInputChange(2, 'branchCode', e.target.value)}
                  placeholder="e.g. 05214"
                  maxLength={10}
                  className="w-full bg-white text-slate-900 border border-slate-200 p-2.5 rounded-lg text-sm font-mono focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 transition-all placeholder-slate-400"
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-slate-600 text-xs font-semibold mb-1.5">Branch Complete Address</label>
                <input 
                  type="text"
                  value={branch.branchAddress}
                  onChange={e => handleInputChange(2, 'branchAddress', e.target.value)}
                  placeholder="Physical street address of branch office"
                  className="w-full bg-white text-slate-900 border border-slate-200 p-2.5 rounded-lg text-sm font-sans focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 transition-all placeholder-slate-400"
                />
              </div>
              <div>
                <label className="block text-slate-600 text-xs font-semibold mb-1.5">Branch Contact Phone</label>
                <input 
                  type="text"
                  value={branch.branchPhone}
                  onChange={e => handleInputChange(2, 'branchPhone', e.target.value)}
                  placeholder="+91-80-2856XXXX"
                  className="w-full bg-white text-slate-900 border border-slate-200 p-2.5 rounded-lg text-sm font-sans focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 transition-all placeholder-slate-400"
                />
              </div>
              <div>
                <label className="block text-slate-600 text-xs font-semibold mb-1.5">Branch Official Email ID</label>
                <input 
                  type="text"
                  value={branch.branchEmail}
                  onChange={e => handleInputChange(2, 'branchEmail', e.target.value)}
                  placeholder="branch@sbi.co.in"
                  className="w-full bg-white text-slate-900 border border-slate-200 p-2.5 rounded-lg text-sm font-sans focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 transition-all placeholder-slate-400"
                />
              </div>
              <div>
                <label className="block text-slate-600 text-xs font-semibold mb-1.5">IFSC (Indian Financial System) Code *</label>
                <input 
                  type="text"
                  value={branch.ifscCode}
                  onChange={e => handleInputChange(2, 'ifscCode', e.target.value)}
                  placeholder="e.g. SBIN0005214"
                  maxLength={11}
                  className="w-full bg-white text-slate-900 border border-slate-200 p-2.5 rounded-lg text-sm font-mono tracking-wider focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 transition-all placeholder-slate-400"
                />
              </div>
              <div>
                <label className="block text-slate-600 text-xs font-semibold mb-1.5">MICR (Magnetic Ink Character Recognition) Code</label>
                <input 
                  type="text"
                  value={branch.micrCode}
                  onChange={e => handleInputChange(2, 'micrCode', e.target.value)}
                  placeholder="9-digit MICR code"
                  maxLength={9}
                  className="w-full bg-white text-slate-900 border border-slate-200 p-2.5 rounded-lg text-sm font-mono focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 transition-all placeholder-slate-400"
                />
              </div>
              <div>
                <label className="block text-slate-600 text-xs font-semibold mb-1.5">CKYCR (Central KYC Registry) Number</label>
                <input 
                  type="text"
                  value={branch.ckycrNumber}
                  onChange={e => handleInputChange(2, 'ckycrNumber', e.target.value)}
                  placeholder="14-digit central KYC reference link"
                  maxLength={14}
                  className="w-full bg-white text-slate-900 border border-slate-200 p-2.5 rounded-lg text-sm font-mono focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 transition-all placeholder-slate-400"
                />
              </div>
            </div>
          </div>
        )}

        {/* STEP 3: Account details */}
        {currentStep === 3 && (
          <div className="animate-fadeIn space-y-4">
            <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
              <Landmark size={16} className="text-indigo-600" /> Account Financial Status parameters
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-slate-600 text-xs font-semibold mb-1.5">Opening Ledger Balance (INR) *</label>
                <div className="relative">
                  <span className="absolute left-3.5 top-2.5 text-slate-400 font-bold text-sm">₹</span>
                  <input 
                    type="number"
                    value={account.openingBalance}
                    onChange={e => handleInputChange(3, 'openingBalance', parseFloat(e.target.value) || 0)}
                    className="w-full bg-white text-slate-900 border border-slate-200 py-2.5 pl-8 pr-4 rounded-lg text-sm font-mono font-bold focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 transition-all"
                  />
                </div>
                <p className="text-[10px] text-slate-400 mt-1">Starting point balance, before adding generated credit/debit records.</p>
              </div>
              <div>
                <label className="block text-slate-600 text-xs font-semibold mb-1.5">Savings Account Interest Rate (%)</label>
                <input 
                  type="number"
                  step="0.05"
                  value={account.interestRate}
                  onChange={e => handleInputChange(3, 'interestRate', parseFloat(e.target.value) || 0)}
                  className="w-full bg-white text-slate-900 border border-slate-200 p-2.5 rounded-lg text-sm font-mono focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 transition-all"
                />
              </div>
              <div>
                <label className="block text-slate-600 text-xs font-semibold mb-1.5">Currency Designation</label>
                <select 
                  value={account.currency}
                  onChange={e => handleInputChange(3, 'currency', e.target.value)}
                  className="w-full bg-white text-slate-900 border border-slate-200 p-2.5 rounded-lg text-sm font-sans focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 transition-all"
                >
                  <option value="INR">INR (₹) - Indian Rupees</option>
                  <option value="USD">USD ($) - US Dollar</option>
                  <option value="EUR">EUR (€) - Euro</option>
                  <option value="GBP">GBP (£) - British Pound</option>
                </select>
              </div>
              <div>
                <label className="block text-slate-600 text-xs font-semibold mb-1.5">Account Status Flag</label>
                <select 
                  value={account.accountStatus}
                  onChange={e => handleInputChange(3, 'accountStatus', e.target.value)}
                  className="w-full bg-white text-slate-900 border border-slate-200 p-2.5 rounded-lg text-sm font-sans focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 transition-all"
                >
                  <option value="Active">Active</option>
                  <option value="Dormant">Dormant</option>
                  <option value="Frozen">Frozen (Hold)</option>
                </select>
              </div>
              <div>
                <label className="block text-slate-600 text-xs font-semibold mb-1.5">Account Type Scheme</label>
                <select 
                  value={account.accountType}
                  onChange={e => handleInputChange(3, 'accountType', e.target.value)}
                  className="w-full bg-white text-slate-900 border border-slate-200 p-2.5 rounded-lg text-sm font-sans focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 transition-all"
                >
                  <option value="Savings">Savings Base Account</option>
                  <option value="Current">Current Commercial Account</option>
                </select>
              </div>
            </div>
          </div>
        )}

        {/* STEP 4: Settings */}
        {currentStep === 4 && (
          <div className="animate-fadeIn space-y-4">
            <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider flex items-center gap-2">
              <Settings size={16} className="text-indigo-600" /> Banking Branding & Page-Length presets
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-slate-600 text-xs font-semibold mb-1.5 pointer-events-none">Design Theme / Corporate Style *</label>
                <select 
                  value={settings.bankStyle}
                  onChange={e => handleInputChange(4, 'bankStyle', e.target.value)}
                  className="w-full bg-white text-slate-900 border border-slate-200 p-2.5 rounded-lg text-sm font-sans focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 transition-all font-medium"
                >
                  <option value="SBI">State Bank of India (Official SBI Blue Layout)</option>
                  <option value="Kotak">Kotak Mahindra Bank (Red/Navy 811 Style Layout)</option>
                  <option value="BOI">Bank of India (Detailed Statement Blue Star Layout)</option>
                  <option value="PNB">Punjab National Bank (Red/Yellow Corporate Layout)</option>
                </select>
              </div>
              <div>
                <label className="block text-slate-600 text-xs font-semibold mb-1.5">Statement Historical Duration (Months)</label>
                <select 
                  value={settings.duration}
                  onChange={e => handleInputChange(4, 'duration', e.target.value)}
                  className="w-full bg-white text-slate-900 border border-slate-200 p-2.5 rounded-lg text-sm font-sans focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 transition-all font-medium"
                >
                  <option value="1 Month">1 Month Backwards</option>
                  <option value="2 Months">2 Months Backwards</option>
                  <option value="3 Months">3 Months Backwards</option>
                  <option value="6 Months">6 Months Backwards</option>
                  <option value="12 Months">12 Months (Full Financial Year)</option>
                </select>
              </div>
              <div>
                <label className="block text-slate-600 text-xs font-semibold mb-1.5">Target Statement Page Length *</label>
                <select 
                  value={settings.pageCount}
                  onChange={e => handleInputChange(4, 'pageCount', e.target.value)}
                  className="w-full bg-white text-slate-900 border border-slate-200 p-2.5 rounded-lg text-sm font-sans focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 transition-all font-medium"
                >
                  <option value="1 Page">1 Page (~12 transactions to fill page)</option>
                  <option value="2 Pages">2 Pages (~32 transactions to fill pages)</option>
                  <option value="3 Pages">3 Pages (~52 transactions to fill pages)</option>
                  <option value="5 Pages">5 Pages (~92 transactions)</option>
                  <option value="10 Pages">10 Pages (~192 transactions)</option>
                  <option value="20 Pages">20 Pages (~392 transactions)</option>
                  <option value="Custom">Custom Selection (Define exact number below)</option>
                </select>
              </div>
              <div>
                <label className="block text-slate-600 text-xs font-semibold mb-1.5">Transaction Intensity Mode *</label>
                <select 
                  value={settings.transactionMode}
                  onChange={e => handleInputChange(4, 'transactionMode', e.target.value)}
                  className="w-full bg-white text-slate-900 border border-slate-200 p-2.5 rounded-lg text-sm font-sans focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 transition-all font-medium"
                >
                  <option value="Low">Low Profile (Debit / Credit range: ₹100 – ₹10,000)</option>
                  <option value="Normal">Normal Profile (Debit / Credit range: ₹500 – ₹50,000)</option>
                  <option value="High">HNI High Value (Debit / Credit range: above ₹20,000 up to ₹2.5 Lakhs)</option>
                </select>
              </div>
              <div>
                <label className="block text-slate-600 text-xs font-semibold mb-1.5">Transaction Profile *</label>
                <select 
                  value={settings.profile}
                  onChange={e => handleInputChange(4, 'profile', e.target.value)}
                  className="w-full bg-white text-slate-900 border border-slate-200 p-2.5 rounded-lg text-sm font-sans focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 transition-all font-medium"
                >
                  <option value="Personal">Personal / Salary Account</option>
                  <option value="Business">Business Account</option>
                </select>
              </div>

              {settings.pageCount === 'Custom' && (
                <div className="md:col-span-2">
                  <label className="block text-slate-600 text-xs font-semibold mb-1.5">Enter Custom Total Transactions Count (5 - 500)</label>
                  <input 
                    type="number"
                    min={5}
                    max={500}
                    value={settings.customTransactionsCount}
                    onChange={e => handleInputChange(4, 'customTransactionsCount', Math.max(5, Math.min(500, parseInt(e.target.value) || 20)))}
                    className="w-full md:w-1/2 bg-white text-slate-900 border border-slate-200 p-2.5 rounded-lg text-sm font-mono focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 transition-all"
                  />
                  <p className="text-[10px] text-slate-400 mt-1">This will force generate exactly this quantity of transactions into your chosen template, flowing cleanly onto multiple A4 sections.</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* STEP 5: Final confirmation */}
        {currentStep === 5 && (
          <div className="animate-fadeIn space-y-6 text-center py-6">
            <div className="max-w-md mx-auto space-y-4">
              <div className="w-16 h-16 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center mx-auto border border-emerald-200 shadow-sm">
                <CheckCircle2 size={36} className="animate-bounce" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-800 uppercase tracking-wider">Ready for Assembly</h3>
                <p className="text-slate-500 text-xs mt-1">All variables satisfy local schemas. Statement assembly will now synthesize balanced chronological ledger transactions.</p>
              </div>

              {/* Data checklist review table */}
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 text-left font-sans space-y-2 text-xs divide-y divide-slate-200/60">
                <div className="flex justify-between py-2 text-slate-500">
                  <span>Customer Profile:</span>
                  <strong className="text-slate-900 font-semibold">{customer.accountHolderName || "N/A"}</strong>
                </div>
                <div className="flex justify-between py-2 text-slate-500">
                  <span>Transaction Engine Profile:</span>
                  <strong className="text-indigo-700 font-semibold">{settings.profile === 'Personal' ? 'Personal / Salary' : 'Business Account'}</strong>
                </div>
                <div className="flex justify-between py-2 text-slate-500">
                  <span>Routing Bridge Code:</span>
                  <strong className="text-slate-900 font-mono font-semibold">{branch.ifscCode || "N/A"}</strong>
                </div>
                <div className="flex justify-between py-2.5 text-slate-500">
                  <span>Design Corporate Pattern:</span>
                  <span className={`px-2 py-0.5 rounded font-bold text-[10px] uppercase font-mono ${
                    settings.bankStyle === 'SBI' ? 'bg-sky-50 text-sky-700 border border-sky-100' :
                    settings.bankStyle === 'Kotak' ? 'bg-rose-50 text-rose-700 border border-rose-100' :
                    settings.bankStyle === 'BOI' ? 'bg-blue-50 text-blue-700 border border-blue-100' :
                    'bg-amber-50 text-amber-800 border border-amber-200'
                  }`}>
                    {settings.bankStyle} Design Format
                  </span>
                </div>
                <div className="flex justify-between py-2.5 text-slate-500 font-semibold">
                  <span>Opening Ledger Balance:</span>
                  <strong className="text-emerald-700 font-mono">₹{account.openingBalance.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</strong>
                </div>
              </div>

              <button
                onClick={handleCreateDocumentPayload}
                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3.5 px-6 rounded-xl shadow-lg shadow-indigo-100 cursor-pointer transition-all text-xs uppercase tracking-widest flex items-center justify-center gap-2"
              >
                Assemble Statement Record
              </button>
            </div>
          </div>
        )}

      </div>

      {/* Steps Navigation Bar */}
      <div className="mt-8 flex justify-between border-t border-slate-100 pt-4">
        {currentStep > 1 ? (
          <button
            onClick={handlePrevStep}
            className="bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 font-semibold py-2 px-4 rounded-xl text-xs transition-colors flex items-center gap-1 cursor-pointer shadow-sm"
          >
            <ChevronLeft size={16} /> Previous
          </button>
        ) : (
          <div />
        )}

        {currentStep < 5 ? (
          <button
            onClick={handleNextStep}
            className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2.5 px-5 rounded-xl text-xs transition-transform hover:scale-102 flex items-center gap-1 cursor-pointer ml-auto shadow-md shadow-indigo-100"
          >
            Next Step <ChevronRight size={16} />
          </button>
        ) : (
          <div />
        )}
      </div>

    </div>
  );
}
