import React, { useState } from 'react';
import {
  User, Building2, Landmark, Settings, Sparkles, CalendarClock, Wallet, Loader2, Download, XCircle
} from 'lucide-react';
import { CustomerDetails, BranchDetails, AccountInfo, StatementSettings, StatementRecord } from '../types';
import { CUSTOMER_PRESETS, logToSystem } from '../lib/dbBridge';
import { generateStatementTransactions, getRandomOpeningBalance } from '../lib/transactionEngine';
import { downloadStatementPdfFromBackend } from '../lib/pdfExport';

interface GenerateTabProps {
  onGenerate: (record: StatementRecord) => void;
  onSetPreset: (presetName: string) => void;
}

const BANK_STYLE_OPTIONS: { value: StatementSettings['bankStyle']; label: string }[] = [
  { value: 'SBI', label: 'SBI' },
  { value: 'SBI2', label: 'SBI V2' },
  { value: 'Kotak', label: 'Kotak' },
  { value: 'BOI', label: 'BOI' },
  { value: 'PNB', label: 'PNB' },
];

const inputCls = "w-full bg-white text-slate-900 border border-slate-300 px-3.5 py-2.5 rounded-lg text-sm font-sans focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all placeholder-slate-400";

function FieldLabel({ children }: { children: React.ReactNode }) {
  return <label className="block text-slate-500 text-[10.5px] font-semibold uppercase tracking-wide mb-1.5">{children}</label>;
}

function Grid2({ children }: { children: React.ReactNode }) {
  return <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">{children}</div>;
}

function Section({ icon: Icon, title, children }: { icon: any; title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
      <div className="flex items-center gap-2 px-5 py-3 border-b border-slate-100 bg-slate-50/70">
        <Icon size={14} className="text-slate-400" />
        <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">{title}</span>
      </div>
      <div className="p-5 space-y-4">
        {children}
      </div>
    </div>
  );
}

function SegmentedToggle<T extends string>({ value, options, onChange }: { value: T; options: { value: T; label: string }[]; onChange: (v: T) => void }) {
  return (
    <div className="inline-flex rounded-lg border border-slate-200 bg-slate-50 p-0.5">
      {options.map(opt => (
        <button
          key={opt.value}
          type="button"
          onClick={() => onChange(opt.value)}
          className={`px-3 py-1.5 rounded-md text-xs font-semibold cursor-pointer transition-colors ${
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

export default function GenerateTab({ onGenerate, onSetPreset }: GenerateTabProps) {
  // Customer Details state
  const [customer, setCustomer] = useState<CustomerDetails>({
    accountHolderName: '',
    email: '',
    address: '',
    accountNumber: '',
    cifNumber: '',
    accountOpenDate: '2020-01-01',
    nomineeName: 'No nominee registered'
  });

  // Branch Details state
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

  // Account Info state
  const [account, setAccount] = useState<AccountInfo>({
    openingBalance: getRandomOpeningBalance(),
    interestRate: 2.70,
    currency: 'INR',
    accountStatus: 'Active',
    accountType: 'Savings'
  });

  // Statement + generation settings
  const [settings, setSettings] = useState<StatementSettings>({
    bankStyle: 'SBI',
    duration: '3 Months',
    generationMode: 'duration',
    fromDate: '',
    toDate: '',
    pageCount: '12 Pages',
    customTransactionsCount: 270,
    transactionMode: 'Normal',
    profile: 'Personal',
    salaryMode: 'auto',
    companyName: '',
    monthlySalary: undefined,
    salaryDay: '1'
  });

  const updateCustomer = (field: keyof CustomerDetails, value: any) => setCustomer(prev => ({ ...prev, [field]: value }));
  const updateAccount = (field: keyof AccountInfo, value: any) => setAccount(prev => ({ ...prev, [field]: value }));
  const updateSettings = (field: keyof StatementSettings, value: any) => setSettings(prev => ({ ...prev, [field]: value }));

  const updateBranch = (field: keyof BranchDetails, value: any) => {
    let finalVal = value;
    if (['ifscCode', 'branchCode', 'micrCode'].includes(field as string)) {
      finalVal = String(value).toUpperCase().replace(/\s/g, '');
    }
    setBranch(prev => ({ ...prev, [field]: finalVal }));
    if (field === 'ifscCode') {
      const cleanIFSC = String(finalVal).toUpperCase();
      if (cleanIFSC.startsWith('PUNB')) updateSettings('bankStyle', 'PNB');
      else if (cleanIFSC.startsWith('BKID')) updateSettings('bankStyle', 'BOI');
      else if (cleanIFSC.startsWith('KKBK')) updateSettings('bankStyle', 'Kotak');
      else if (cleanIFSC.startsWith('SBIN')) updateSettings('bankStyle', 'SBI');
    }
  };

  // Handle Preset quick fill
  const handleLoadPreset = (index: number) => {
    const p = CUSTOMER_PRESETS[index];
    setCustomer(p.customer);
    setBranch(p.branch);
    setAccount(p.info);
    setSettings(prev => ({ ...prev, ...p.settings }));
    onSetPreset(p.name);

    logToSystem('IPC_BRIDGE', 'INFO', `Preset Loader invoked: "${p.name}". Automatically synchronized 27 fields across model schema.`);
    logToSystem('SQLITE_DB', 'DEBUG', `SELECT * FROM "Presets" WHERE "name" = '${p.name}' LIMIT 1;`);
  };

  const [validationError, setValidationError] = useState<string | null>(null);
  const [backendError, setBackendError] = useState<string | null>(null);
  const [isGeneratingBackendPdf, setIsGeneratingBackendPdf] = useState(false);
  const [downloadStatus, setDownloadStatus] = useState('');

  const validateAll = (): string | null => {
    if (!customer.accountHolderName.trim()) return 'Account Holder Name is required.';
    if (!customer.accountNumber.trim()) return 'Account Number is required.';
    if (!/^\d+$/.test(customer.accountNumber.trim())) return 'Account Number must contain numbers only.';
    if (customer.email && !customer.email.includes('@')) return 'Enter a valid Customer Email address.';
    if (!branch.branchName.trim()) return 'Branch Name is required.';
    if (!branch.ifscCode.trim()) return 'IFSC Code is required.';
    if (branch.ifscCode.length < 5) return 'Invalid IFSC Code length.';
    if (isNaN(account.openingBalance)) return 'Opening Balance must be a numeric value.';
    if (account.openingBalance < 0) return 'Opening Balance cannot be negative.';
    if (settings.generationMode === 'custom') {
      if (!settings.fromDate || !settings.toDate) return 'Select both From and To dates for the statement period.';
      if (new Date(settings.fromDate) > new Date(settings.toDate)) return 'From date must be before To date.';
    }
    if (settings.pageCount === 'Custom' && (!settings.customTransactionsCount || settings.customTransactionsCount < 5)) {
      return 'Enter a custom transaction count between 5 and 500.';
    }
    if (settings.salaryMode === 'manual') {
      if (!settings.companyName?.trim()) return 'Company Name is required for manual salary mode.';
      if (!settings.monthlySalary || settings.monthlySalary <= 0) return 'Enter a valid monthly salary amount.';
    }
    return null;
  };

  const handleCreateDocumentPayload = async () => {
    setValidationError(null);
    setBackendError(null);

    const error = validateAll();
    if (error) {
      setValidationError(error);
      logToSystem('SYSTEM', 'WARN', `Validation failed: ${error}`);
      return;
    }

    const finalTime = new Date().toISOString();
    logToSystem('SYSTEM', 'INFO', 'Invoking Backend Statement HTML Template & PDF Generation Engine.');

    setIsGeneratingBackendPdf(true);
    setDownloadStatus('Connecting to backend PDF generator...');

    try {
      // 1. Send form payload to Backend API to compile HTML template and download PDF directly
      await downloadStatementPdfFromBackend({
        customerDetails: customer,
        branchDetails: branch,
        accountInfo: account,
        settings,
        onProgress: (pct, msg) => setDownloadStatus(msg),
      });

      // 2. Local fallback sync for preview history
      const transactions = generateStatementTransactions(settings, account, finalTime, customer, branch);
      let totalDebits = 0;
      let totalCredits = 0;
      let drCount = 0;
      let crCount = 0;

      transactions.forEach(tx => {
        if (tx.debit) { totalDebits += tx.debit; drCount++; }
        if (tx.credit) { totalCredits += tx.credit; crCount++; }
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
    } catch (err: any) {
      console.error('Backend PDF download error:', err);
      logToSystem('SYSTEM', 'ERROR', `Backend PDF generation failed: ${err.message}`);
      setBackendError(err?.message || 'Backend PDF generation failed. Falling back to local preview.');

      // Fallback preview record creation
      const transactions = generateStatementTransactions(settings, account, finalTime, customer, branch);
      let totalDebits = 0;
      let totalCredits = 0;
      let drCount = 0;
      let crCount = 0;

      transactions.forEach(tx => {
        if (tx.debit) { totalDebits += tx.debit; drCount++; }
        if (tx.credit) { totalCredits += tx.credit; crCount++; }
      });

      const closingBalance = transactions.length > 0 ? transactions[transactions.length - 1].balance : account.openingBalance;

      onGenerate({
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
      });
    } finally {
      setIsGeneratingBackendPdf(false);
      setDownloadStatus('');
    }
  };

  const activeBankLabel = BANK_STYLE_OPTIONS.find(o => o.value === settings.bankStyle)?.label || settings.bankStyle;

  return (
    <div className="max-w-2xl mx-auto space-y-5">

      {/* Select Project (bank style) pill switch */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-4">
        <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider text-center mb-3">Select Project</p>
        <div className="flex gap-1.5 overflow-x-auto pb-0.5">
          {BANK_STYLE_OPTIONS.map(opt => (
            <button
              key={opt.value}
              type="button"
              onClick={() => updateSettings('bankStyle', opt.value)}
              className={`flex-1 min-w-[72px] whitespace-nowrap py-2 px-3 rounded-lg text-xs font-bold cursor-pointer transition-colors ${
                settings.bankStyle === opt.value
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Quick Profile presets tray */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <span className="text-blue-600 font-bold text-xs flex items-center gap-1.5 font-sans uppercase tracking-wider">
            <Sparkles size={14} className="text-amber-500" />
            Instant Ledger Presets
          </span>
          <p className="text-slate-400 text-[11px] mt-0.5">Click to fetch pre-audited Indian standard accounts.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {CUSTOMER_PRESETS.map((p, idx) => (
            <button
              key={idx}
              onClick={() => handleLoadPreset(idx)}
              className="bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 hover:text-slate-900 py-1.5 px-3 rounded-lg text-xs font-semibold cursor-pointer transition-colors shadow-xs"
            >
              Load {p.bank === 'SBI' ? 'SBI' : 'Kotak'}: {p.customer.accountHolderName.split(' ')[0]}
            </button>
          ))}
        </div>
      </div>

      {/* ACCOUNT */}
      <Section icon={Landmark} title="Account">
        <Grid2>
          <div>
            <FieldLabel>Account Number</FieldLabel>
            <input
              type="text"
              value={customer.accountNumber}
              onChange={e => updateCustomer('accountNumber', e.target.value.replace(/\D/g, ''))}
              placeholder="e.g. 3052145892"
              maxLength={18}
              className={`${inputCls} font-mono tracking-widest`}
            />
          </div>
          <div>
            <FieldLabel>Opening Balance (₹)</FieldLabel>
            <input
              type="number"
              value={account.openingBalance}
              onChange={e => updateAccount('openingBalance', parseFloat(e.target.value) || 0)}
              className={`${inputCls} font-mono font-bold`}
            />
          </div>
        </Grid2>
      </Section>

      {/* CUSTOMER */}
      <Section icon={User} title="Customer">
        <Grid2>
          <div>
            <FieldLabel>Customer Name</FieldLabel>
            <input
              type="text"
              value={customer.accountHolderName}
              onChange={e => updateCustomer('accountHolderName', e.target.value.toUpperCase())}
              placeholder="e.g. RATAN TATA"
              className={inputCls}
            />
          </div>
          <div>
            <FieldLabel>Nominee</FieldLabel>
            <input
              type="text"
              value={customer.nomineeName}
              onChange={e => updateCustomer('nomineeName', e.target.value)}
              placeholder="e.g. RITA ROY (MOTHER)"
              className={inputCls}
            />
          </div>
        </Grid2>
        <div>
          <FieldLabel>Address</FieldLabel>
          <input
            type="text"
            value={customer.address}
            onChange={e => updateCustomer('address', e.target.value)}
            placeholder="Flat/House/Street No, Cross Road, Landmark, PIN Code"
            className={inputCls}
          />
        </div>
        <Grid2>
          <div>
            <FieldLabel>Email</FieldLabel>
            <input
              type="email"
              value={customer.email}
              onChange={e => updateCustomer('email', e.target.value)}
              placeholder="name@personal-domain.com"
              className={inputCls}
            />
          </div>
          <div>
            <FieldLabel>CIF Number</FieldLabel>
            <input
              type="text"
              value={customer.cifNumber}
              onChange={e => updateCustomer('cifNumber', e.target.value.replace(/\D/g, ''))}
              placeholder="e.g. 74512963"
              maxLength={15}
              className={`${inputCls} font-mono`}
            />
          </div>
        </Grid2>
        <div>
          <FieldLabel>Account Open Date</FieldLabel>
          <input
            type="date"
            value={customer.accountOpenDate}
            onChange={e => updateCustomer('accountOpenDate', e.target.value)}
            className={`${inputCls} sm:w-1/2`}
          />
        </div>
      </Section>

      {/* BRANCH */}
      <Section icon={Building2} title="Branch">
        <div>
          <FieldLabel>Branch Name</FieldLabel>
          <input
            type="text"
            value={branch.branchName}
            onChange={e => updateBranch('branchName', e.target.value.toUpperCase())}
            placeholder="e.g. WHITEFIELD INDUSTRIAL AREA BRANCH"
            className={inputCls}
          />
        </div>
        <div>
          <FieldLabel>Bank Address</FieldLabel>
          <input
            type="text"
            value={branch.branchAddress}
            onChange={e => updateBranch('branchAddress', e.target.value)}
            placeholder="Physical street address of branch office"
            className={inputCls}
          />
        </div>
        <Grid2>
          <div>
            <FieldLabel>Branch Code</FieldLabel>
            <input
              type="text"
              value={branch.branchCode}
              onChange={e => updateBranch('branchCode', e.target.value)}
              placeholder="e.g. 05214"
              maxLength={10}
              className={`${inputCls} font-mono`}
            />
          </div>
          <div>
            <FieldLabel>IFSC Code</FieldLabel>
            <input
              type="text"
              value={branch.ifscCode}
              onChange={e => updateBranch('ifscCode', e.target.value)}
              placeholder="e.g. SBIN0005214"
              maxLength={11}
              className={`${inputCls} font-mono tracking-wider`}
            />
          </div>
        </Grid2>
        <Grid2>
          <div>
            <FieldLabel>MICR Code</FieldLabel>
            <input
              type="text"
              value={branch.micrCode}
              onChange={e => updateBranch('micrCode', e.target.value)}
              placeholder="9-digit MICR code"
              maxLength={9}
              className={`${inputCls} font-mono`}
            />
          </div>
          <div>
            <FieldLabel>CKYCR Number</FieldLabel>
            <input
              type="text"
              value={branch.ckycrNumber}
              onChange={e => updateBranch('ckycrNumber', e.target.value)}
              placeholder="14-digit central KYC reference"
              maxLength={14}
              className={`${inputCls} font-mono`}
            />
          </div>
        </Grid2>
        <Grid2>
          <div>
            <FieldLabel>Branch Phone</FieldLabel>
            <input
              type="text"
              value={branch.branchPhone}
              onChange={e => updateBranch('branchPhone', e.target.value)}
              placeholder="+91-80-2856XXXX"
              className={inputCls}
            />
          </div>
          <div>
            <FieldLabel>Branch Email</FieldLabel>
            <input
              type="text"
              value={branch.branchEmail}
              onChange={e => updateBranch('branchEmail', e.target.value)}
              placeholder="branch@sbi.co.in"
              className={inputCls}
            />
          </div>
        </Grid2>
      </Section>

      {/* STATEMENT PERIOD */}
      <Section icon={CalendarClock} title="Statement Period">
        <SegmentedToggle
          value={settings.generationMode === 'custom' ? 'custom' : 'duration'}
          onChange={(v) => updateSettings('generationMode', v)}
          options={[
            { value: 'duration', label: 'Duration Preset' },
            { value: 'custom', label: 'Custom Range' },
          ]}
        />

        {settings.generationMode === 'custom' ? (
          <Grid2>
            <div>
              <FieldLabel>From (DD/MM/YYYY)</FieldLabel>
              <input
                type="date"
                value={settings.fromDate || ''}
                onChange={e => updateSettings('fromDate', e.target.value)}
                className={inputCls}
              />
            </div>
            <div>
              <FieldLabel>To (DD/MM/YYYY)</FieldLabel>
              <input
                type="date"
                value={settings.toDate || ''}
                onChange={e => updateSettings('toDate', e.target.value)}
                className={inputCls}
              />
            </div>
          </Grid2>
        ) : (
          <div>
            <FieldLabel>Statement Historical Duration</FieldLabel>
            <select
              value={settings.duration}
              onChange={e => updateSettings('duration', e.target.value)}
              className={inputCls}
            >
              <option value="1 Month">1 Month Backwards</option>
              <option value="2 Months">2 Months Backwards</option>
              <option value="3 Months">3 Months Backwards</option>
              <option value="6 Months">6 Months Backwards</option>
              <option value="12 Months">12 Months (Full Financial Year)</option>
            </select>
          </div>
        )}

        <div>
          <FieldLabel>Target Statement Page Length</FieldLabel>
          <select
            value={settings.pageCount}
            onChange={e => updateSettings('pageCount', e.target.value)}
            className={inputCls}
          >
            <option value="1 Page">1 Page (~12 transactions)</option>
            <option value="2 Pages">2 Pages (~32 transactions)</option>
            <option value="3 Pages">3 Pages (~52 transactions)</option>
            <option value="5 Pages">5 Pages (~92 transactions)</option>
            <option value="10 Pages">10 Pages (~224 transactions)</option>
            <option value="12 Pages">12 Pages (~270 transactions - Optimal)</option>
            <option value="15 Pages">15 Pages (~336 transactions)</option>
            <option value="20 Pages">20 Pages (~544 transactions)</option>
            <option value="30 Pages">30 Pages (~820 transactions)</option>
            <option value="Custom">Custom Selection</option>
          </select>
        </div>

        {settings.pageCount === 'Custom' && (
          <div>
            <FieldLabel>Custom Total Transactions (5 - 500)</FieldLabel>
            <input
              type="number"
              min={5}
              max={500}
              value={settings.customTransactionsCount}
              onChange={e => updateSettings('customTransactionsCount', Math.max(5, Math.min(500, parseInt(e.target.value) || 20)))}
              className={`${inputCls} font-mono sm:w-1/2`}
            />
          </div>
        )}
      </Section>

      {/* GENERATION SETTINGS */}
      <Section icon={Settings} title="Generation Settings">
        <Grid2>
          <div>
            <FieldLabel>Transaction Intensity</FieldLabel>
            <select
              value={settings.transactionMode}
              onChange={e => updateSettings('transactionMode', e.target.value)}
              className={inputCls}
            >
              <option value="Low">Low (₹100 – ₹10,000)</option>
              <option value="Normal">Normal (₹500 – ₹50,000)</option>
              <option value="High">HNI High Value (up to ₹2.5L)</option>
            </select>
          </div>
          <div>
            <FieldLabel>Transaction Profile</FieldLabel>
            <select
              value={settings.profile}
              onChange={e => updateSettings('profile', e.target.value)}
              className={inputCls}
            >
              <option value="Personal">Personal / Salary Account</option>
              <option value="Business">Business Account</option>
            </select>
          </div>
        </Grid2>
      </Section>

      {/* SALARY */}
      <Section icon={Wallet} title="Salary">
        <SegmentedToggle
          value={settings.salaryMode === 'manual' ? 'manual' : 'auto'}
          onChange={(v) => updateSettings('salaryMode', v)}
          options={[
            { value: 'auto', label: 'Auto' },
            { value: 'manual', label: 'Manual' },
          ]}
        />

        {settings.salaryMode === 'manual' && (
          <>
            <Grid2>
              <div>
                <FieldLabel>Salary Amount (₹)</FieldLabel>
                <input
                  type="number"
                  value={settings.monthlySalary ?? ''}
                  onChange={e => updateSettings('monthlySalary', parseFloat(e.target.value) || 0)}
                  placeholder="e.g. 45000"
                  className={`${inputCls} font-mono`}
                />
              </div>
              <div>
                <FieldLabel>Company Name</FieldLabel>
                <input
                  type="text"
                  value={settings.companyName || ''}
                  onChange={e => updateSettings('companyName', e.target.value.toUpperCase())}
                  placeholder="e.g. INFOSYS LTD"
                  className={inputCls}
                />
              </div>
            </Grid2>
            <div>
              <FieldLabel>Salary Credit Day</FieldLabel>
              <select
                value={settings.salaryDay || '1'}
                onChange={e => updateSettings('salaryDay', e.target.value)}
                className={`${inputCls} sm:w-1/2`}
              >
                {Array.from({ length: 28 }, (_, i) => i + 1).map(d => (
                  <option key={d} value={String(d)}>{d}{d === 1 ? 'st' : d === 2 ? 'nd' : d === 3 ? 'rd' : 'th'} of month</option>
                ))}
                <option value="last_day">Last day of month</option>
              </select>
            </div>
          </>
        )}
      </Section>

      {/* Validation error banner */}
      {validationError && (
        <div className="flex items-start gap-2.5 bg-rose-50 border border-rose-200 rounded-xl px-4 py-3.5 text-rose-700">
          <XCircle size={16} className="mt-0.5 flex-shrink-0" />
          <span className="text-sm">{validationError}</span>
        </div>
      )}

      {/* Backend/technical warning banner */}
      {backendError && (
        <div className="flex items-start gap-2.5 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3.5 text-amber-800">
          <span className="mt-0.5 flex-shrink-0">⚠️</span>
          <pre className="whitespace-pre-wrap break-words font-mono text-[11px] leading-relaxed">{backendError}</pre>
        </div>
      )}

      {/* Generate button */}
      <button
        onClick={handleCreateDocumentPayload}
        disabled={isGeneratingBackendPdf}
        className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-bold py-3.5 px-6 rounded-xl shadow-lg shadow-blue-100 cursor-pointer transition-all text-sm flex items-center justify-center gap-2"
      >
        {isGeneratingBackendPdf ? (
          <>
            <Loader2 size={16} className="animate-spin" />
            <span>{downloadStatus || 'Generating Backend PDF...'}</span>
          </>
        ) : (
          <>
            <Download size={16} />
            <span>Generate {activeBankLabel} Statement PDF</span>
          </>
        )}
      </button>

    </div>
  );
}
