import React, { useEffect } from 'react';
import { Printer, Download, X, HelpCircle, FileText, CheckCircle, Calendar, CalendarDays } from 'lucide-react';
import { StatementRecord, Transaction } from '../types';
import { formatDate, isoToIndianFormat } from '../lib/transactionEngine';
import { logToSystem } from '../lib/dbBridge';

interface StatementPreviewProps {
  record: StatementRecord;
  onClose: () => void;
  onPrint?: () => Promise<boolean>;
}

function formatKotakDate(dateStr: string): string {
  if (!dateStr) return '';
  if (/^\d{2}\s[A-Za-z]{3}\s\d{4}$/.test(dateStr)) {
    return dateStr;
  }
  const parts = dateStr.split(/[-/]/);
  if (parts.length === 3) {
    const day = parts[0].padStart(2, '0');
    if (/^\d+$/.test(parts[1])) {
      const monthIdx = parseInt(parts[1], 10) - 1;
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      if (monthIdx >= 0 && monthIdx < 12) {
        return `${day} ${months[monthIdx]} ${parts[2]}`;
      }
    } else {
      return `${day} ${parts[1]} ${parts[2]}`;
    }
  }
  return dateStr;
}

// Custom programmatic division of transactions into exact physical pages
function chunkTransactionsForA4(transactions: Transaction[], firstPageLimit = 12, subsequentPageLimit = 22) {
  const pages: Transaction[][] = [];
  if (transactions.length === 0) return [[]];

  // Page 1 gets up to firstPageLimit
  pages.push(transactions.slice(0, firstPageLimit));

  // Subsequent pages get subsequentPageLimit chunks
  let index = firstPageLimit;
  while (index < transactions.length) {
    pages.push(transactions.slice(index, index + subsequentPageLimit));
    index += subsequentPageLimit;
  }

  return pages;
}

function formatSbiDetails(details: string, refNo?: string): React.ReactNode {
  const text = details.toUpperCase();

  // 1. NEFT
  if (text.startsWith('BY TRANSFER-NEFT*') || text.startsWith('TO TRANSFER-NEFT*')) {
    const isTo = text.startsWith('TO TRANSFER-');
    const prefix = isTo ? 'TO TRANSFER-' : 'BY TRANSFER-';
    const rest = text.substring(prefix.length);
    const parts = rest.split('*');
    if (parts.length >= 4) {
      const line1 = prefix;
      const line2 = `${parts[0]}*${parts[1]}*${parts[2]}*`;
      const line3 = parts.slice(3).join('*') + (refNo ? `*${refNo}` : '');
      return (
        <span style={{ display: 'block', lineHeight: '1.25' }}>
          <span style={{ display: 'block', whiteSpace: 'nowrap' }}>{line1}</span>
          <span style={{ display: 'block', whiteSpace: 'nowrap' }}>{line2}</span>
          <span style={{ display: 'block', whiteSpace: 'nowrap' }}>{line3}</span>
        </span>
      );
    }
  }

  // 2. UPI/IMPS/Mobile Banking
  if (text.includes('TRANSFER-')) {
    const prefix = text.includes('TO TRANSFER-') ? 'TO TRANSFER-' : 'BY TRANSFER-';
    const rest = text.substring(prefix.length);

    if (rest.includes('/')) {
      const parts = rest.split('/');
      if (parts.length >= 5) {
        const line1 = prefix;
        const line2 = parts.slice(0, 4).join('/') + '/';
        const line3 = parts.slice(4).join('/') + (refNo || '');
        return (
          <span style={{ display: 'block', lineHeight: '1.25' }}>
            <span style={{ display: 'block', whiteSpace: 'nowrap' }}>{line1}</span>
            <span style={{ display: 'block', whiteSpace: 'nowrap' }}>{line2}</span>
            <span style={{ display: 'block', whiteSpace: 'nowrap' }}>{line3}</span>
          </span>
        );
      } else {
        const line1 = prefix;
        const line2 = parts.slice(0, 2).join('/') + '/';
        const line3 = parts.slice(2).join('/') + (refNo ? `/${refNo}` : '');
        return (
          <span style={{ display: 'block', lineHeight: '1.25' }}>
            <span style={{ display: 'block', whiteSpace: 'nowrap' }}>{line1}</span>
            <span style={{ display: 'block', whiteSpace: 'nowrap' }}>{line2}</span>
            <span style={{ display: 'block', whiteSpace: 'nowrap' }}>{line3}</span>
          </span>
        );
      }
    }
  }

  // 3. ATM
  if (text.startsWith('TO ATM WD-')) {
    const prefix = 'TO ATM WD-';
    const rest = text.substring(prefix.length);
    const parts = rest.split(' ');
    if (parts.length >= 2) {
      const line1 = prefix;
      const line2 = `${parts[0]} ${parts[1]}`;
      const line3 = parts.slice(2).join(' ') + (refNo ? ` ${refNo}` : '');
      return (
        <span style={{ display: 'block', lineHeight: '1.25' }}>
          <span style={{ display: 'block', whiteSpace: 'nowrap' }}>{line1}</span>
          <span style={{ display: 'block', whiteSpace: 'nowrap' }}>{line2}</span>
          <span style={{ display: 'block', whiteSpace: 'nowrap' }}>{line3}</span>
        </span>
      );
    }
  }

  // Fallback
  return (
    <span style={{ display: 'block', lineHeight: '1.25' }}>
      <span style={{ display: 'block', whiteSpace: 'nowrap' }}>{text}</span>
      {refNo && <span style={{ display: 'block', whiteSpace: 'nowrap' }}>{refNo}</span>}
    </span>
  );
}

interface MetadataRowProps {
  label: string;
  value: React.ReactNode;
  isRightColumn?: boolean;
}

function MetadataRow({ label, value, isRightColumn = false }: MetadataRowProps) {
  if (!label && !value) {
    return <div className="sbi-metadata-row" />;
  }
  return (
    <div className={`sbi-metadata-row ${isRightColumn ? 'sbi-metadata-row-right' : 'sbi-metadata-row-left'}`}>
      <span className="sbi-metadata-label">{label}</span>
      <span className="sbi-metadata-colon">{label ? ':' : ''}</span>
      <span className="sbi-metadata-value">{value}</span>
    </div>
  );
}

interface MetadataBlockProps {
  icon?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
}

function MetadataBlock({ icon, children, className = '', style }: MetadataBlockProps) {
  if (!icon) {
    return <div className={`sbi-metadata-block-no-icon ${className}`} style={style}>{children}</div>;
  }
  return (
    <div className={`sbi-metadata-block ${className}`} style={style}>
      <div className="sbi-metadata-icon-container">
        <div className="sbi-metadata-icon">
          {icon}
        </div>
      </div>
      <div className="sbi-metadata-block-content">
        {children}
      </div>
    </div>
  );
}

interface MetadataColumnProps {
  children: React.ReactNode;
}

function MetadataColumn({ children }: MetadataColumnProps) {
  return <div className="flex flex-col gap-2">{children}</div>;
}

export default function StatementPreview({ record, onClose, onPrint }: StatementPreviewProps) {
  const { customerDetails, branchDetails, accountInfo, settings, transactions, closingBalance, totalCredits, totalDebits, drCount, crCount } = record;

  const pageChunks = settings.bankStyle === 'SBI'
    ? chunkTransactionsForA4(transactions, 6, 21)
    : settings.bankStyle === 'BOI'
      ? chunkTransactionsForA4(transactions, 16, 30)
      : settings.bankStyle === 'PNB'
        ? chunkTransactionsForA4(transactions, 15, 30)
        : chunkTransactionsForA4(transactions, 12, 21);

  const allPages = settings.bankStyle === 'BOI'
    ? pageChunks
    : [...pageChunks, [] as Transaction[]];

  useEffect(() => {
    logToSystem('SYSTEM', 'INFO', `Preview initialized for record: "${customerDetails.accountHolderName}". Loaded ${allPages.length} compiled pages.`);
  }, [record]);

  const handlePrint = async () => {
    if (onPrint) {
      const allowed = await onPrint();
      if (!allowed) return;
    }
    logToSystem('IPC_BRIDGE', 'INFO', 'Invoking browser-level native printer/PDF output spooler.');
    window.print();
  };


  return (
    <div className="space-y-6">

      {/* Action Controls Header (Non-printable) */}
      <div className="bg-white border border-slate-200 p-5 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-4 shadow-xs print:hidden">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-emerald-50 text-emerald-700 rounded-xl border border-emerald-100">
            <CheckCircle size={18} />
          </div>
          <div>
            <h4 className="text-sm font-extrabold text-slate-800 uppercase tracking-wide">Statement Assembled</h4>
            <p className="text-slate-500 text-xs mt-0.5">Physical proofs are ready for print layout inspection. System: <strong className="text-indigo-600 font-semibold">A4 Programmatic Bounds</strong>.</p>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            onClick={handlePrint}
            className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2 px-4 rounded-xl text-xs transition-colors flex items-center gap-1.5 cursor-pointer shadow-sm"
          >
            <Printer size={13} /> Print or Save PDF
          </button>



        </div>
      </div>

      {/* Proof container area */}
      <div className="flex flex-col items-center gap-8 bg-slate-50 p-6 rounded-2xl border border-slate-200/60 overflow-y-auto max-h-[800px] shadow-inner select-text print:bg-white print:p-0 print:border-none print:shadow-none print:max-h-none print:overflow-visible">

        {/* Printable target wrapper */}
        <div className="print-container-target space-y-8 print:space-y-0 print:m-0 print:p-0">

          {allPages.map((chunkTransactions, pageIndex) => {
            const pageNum = pageIndex + 1;
            const isFirst = pageIndex === 0;
            const isLast = pageIndex === allPages.length - 1;

            // Brought Forward value is previous page's last transaction balance (or opening balance for Page 1)
            let broughtForwardVal = accountInfo.openingBalance;
            if (!isFirst && pageIndex > 0) {
              for (let p = pageIndex - 1; p >= 0; p--) {
                const chunk = allPages[p];
                if (chunk && chunk.length > 0) {
                  broughtForwardVal = chunk[chunk.length - 1].balance;
                  break;
                }
              }
            }

            return (
              <div
                key={pageIndex}
                className={`print-page w-[210mm] min-h-[297mm] h-[297mm] bg-white text-black relative flex flex-col ${settings.bankStyle === 'BOI' ? 'justify-start' : 'justify-between'} shadow-xl border border-slate-200 print:border-none print:shadow-none print:m-0 print:page-break-after p-0 pb-0`}
                style={{ contentVisibility: 'auto', fontFamily: 'sans-serif' }}
              >

                <div className={`${settings.bankStyle === 'BOI' ? 'flex flex-col h-full' : 'space-y-4'} print:space-y-0 print:mt-0 print:pt-0`} style={{ marginTop: 0, paddingTop: 0, flex: settings.bankStyle === 'BOI' ? 1 : undefined }}>

                  {/* BRAND TEMPLATE HEADER */}
                  {settings.bankStyle === 'SBI' ? (
                    /* SBI DESIGN THEME */
                    <div className="w-full print:m-0 print:p-0 print:mt-0 print:pt-0" style={{ fontFamily: 'sans-serif', marginTop: 0, paddingTop: 0 }}>
                      {isFirst ? (
                        /* FIRST PAGE COMPLETE SBI METRICS HEADER */
                        <div className="w-full flex flex-col select-none print:m-0 print:mt-0 print:pt-0" style={{ marginTop: 0, paddingTop: 0 }}>
                          {/* Full-width header top bar */}
                          <div style={{
                            height: '68px',
                            background: '#5452AA',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            borderBottom: '2px solid black',
                            padding: '0 3mm',
                            width: '100%',
                            boxSizing: 'border-box',
                            position: 'relative',
                            marginTop: 0,
                            paddingTop: 0
                          }}>
                            {/* Left Side: Logo & SBI Text + Account Summary */}
                            <div style={{ display: 'flex', alignItems: 'start', gap: '' }}>
                              {/* Image - tumhari jagah */}
                              <img
                                src="/image.png"
                                alt="icon"
                                style={{
                                  width: 'auto',
                                  height: '64px',  // original ratio maintain hogi
                                }}
                              />
                            </div>

                            {/* Middle date capsule */}
                            <div style={{
                              display: 'flex',
                              alignItems: 'center',
                              border: '1px solid rgba(255, 255, 255, 1)',
                              borderRadius: '4px',
                              padding: '3px 10px',
                              color: '#ffffff',
                              fontSize: '11px',
                              position: 'absolute',
                              left: '50%',
                              transform: 'translateX(-50%)'
                            }}>
                              <CalendarDays style={{ width: '20px', height: '20px', marginRight: '6px' }} />
                              <span>As on {formatDate(new Date())}</span>
                            </div>

                            {/* Right Section Welcome detail */}
                            <div style={{ textAlign: 'right', color: '#ffffff', fontSize: '10.5px', lineHeight: '1.2' }}>
                              <div style={{ fontSize: '11px', textTransform: 'capitalize' }}>Welcome:</div>
                              <div style={{ fontWeight: 400, fontSize: '11.5px', marginTop: '1px' }}>{customerDetails.accountHolderName}</div>
                            </div>
                          </div>

                          {/* Content below header */}
                          <div style={{ padding: '0 8mm', boxSizing: 'border-box', display: 'flex', flexDirection: 'column' }}>
                            {/* Title Centered with thin divider line */}
                            <div style={{ textAlign: 'center', marginTop: '2px', borderBottom: '2px solid #e2e8f0', paddingBottom: '12px', marginBottom: '16px' }}>
                              <h1 style={{ fontSize: '16px', fontWeight: 400, textTransform: 'uppercase', margin: 0, letterSpacing: '0.04em', color: '#000000' }}>
                                STATEMENT OF ACCOUNT
                              </h1>
                            </div>

                            {/* Two-Column Metadata Section: Recreated from sgsgf4.html using Flexbox/Grid with SVG Icons */}
                            <div className="sbi-metadata-container">
                              {/* Upper Block: Customer / Bank split */}
                              <div className="sbi-metadata-upper">
                                {/* Customer Info (Left) */}
                                <div className="sbi-metadata-customer-info">
                                  <MetadataBlock icon={
                                    <svg viewBox="0 0 24 24">
                                      <circle cx="12" cy="8" r="3.25" />
                                      <path d="M5.8 19.2c.8-3.2 3-4.8 6.2-4.8s5.4 1.6 6.2 4.8M12 23a11 11 0 100-22 11 11 0 000 22z" />
                                    </svg>
                                  }>
                                    <div className="sbi-metadata-customer-name">
                                      {customerDetails.accountHolderName}
                                    </div>
                                  </MetadataBlock>
                                  <MetadataBlock icon={
                                    <svg viewBox="0 0 24 24">
                                      <path d="M3 6h18v13H3zM3.5 7l8.5 6 8.5-6" />
                                    </svg>
                                  }>
                                    <div className="sbi-metadata-customer-email">
                                      <a href={`mailto:${customerDetails.email || 'sarif@gmail.com'}`} target="_blank" rel="noreferrer" className="text-black hover:underline" style={{ pointerEvents: 'auto' }}>
                                        {customerDetails.email || 'sarif@gmail.com'}
                                      </a>
                                    </div>
                                  </MetadataBlock>
                                  <MetadataBlock className="sbi-stretch-block sbi-address-stretch-block" icon={
                                    <svg viewBox="0 0 20 24">
                                      <path d="M20 10c0 5-8 12-8 12S4 15 4 10a8 8 0 1116 0z" />
                                      <circle cx="12" cy="10" r="2" />
                                    </svg>
                                  } style={{ marginTop: '' }}>
                                    <div className="sbi-metadata-customer-address">
                                      {customerDetails.address}
                                    </div>
                                  </MetadataBlock>
                                </div>

                                {/* Bank/Branch Info (Right) */}
                                <div className="sbi-metadata-bank-info">
                                  <MetadataBlock>
                                    <div className="sbi-metadata-bank-name">
                                      State Bank of India
                                    </div>
                                    <div className="sbi-metadata-branch-name">
                                      {branchDetails.branchName}
                                    </div>
                                  </MetadataBlock>
                                  <MetadataBlock className="sbi-stretch-block sbi-address-stretch-block" icon={
                                    <svg viewBox="0 0 20 24">
                                      <path d="M20 10c0 5-8 12-8 12S4 15 4 10a8 8 0 1116 0z" />
                                      <circle cx="12" cy="10" r="2" />
                                    </svg>
                                  }>
                                    <div className="sbi-metadata-branch-address">
                                      {branchDetails.branchAddress || 'INDUSTRIAL AREA GOVINDPURA, BHOPAL,\nMADHYA PRADESH - 462023'}
                                    </div>
                                  </MetadataBlock>
                                </div>
                              </div>

                              {/* Lower Block: 13-row Grid */}
                              <div className="sbi-metadata-lower">
                                <MetadataColumn>
                                  {/* Left Col Block 1: Calendar icon */}
                                  <MetadataBlock icon={
                                    <svg viewBox="0 0 24 24">
                                      <rect x="3" y="5" width="18" height="16" rx="1" />
                                      <path d="M7 3v4m10-4v4M3 9h18M7 13h2m3 0h2m3 0h1M7 17h2m3 0h2m3 0h1" />
                                    </svg>
                                  } style={{}}>
                                    <MetadataRow label="Date of Statement" value={transactions[transactions.length - 1]?.valueDate || '12-06-2026'} />
                                  </MetadataBlock>

                                  {/* Left Col Block 2: Wallet icon */}
                                  <MetadataBlock className="sbi-stretch-block" icon={
                                    <svg viewBox="0 0 24 24">
                                      <rect x="2" y="5" width="20" height="14" rx="2" />
                                      <path d="M22 10h-6a2 2 0 000 4h6" />
                                    </svg>
                                  }>
                                    <MetadataRow label="Clear Balance" value={`${accountInfo.openingBalance.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}CR`} />
                                    <MetadataRow label="Uncleared Amount" value="0.00" />
                                    <MetadataRow label="+MOD Bal" value="0.00" />
                                    <MetadataRow label="Lien" value="0.0" />
                                    <MetadataRow label="Limit" value="0.00" />
                                    <MetadataRow label="Monthly Avg Balance" value="0.00" />
                                    <MetadataRow label="Interest Rate" value={`${accountInfo.interestRate.toFixed(2)} % p.a.`} />
                                    <MetadataRow label="Drawing Power" value="0.00" />
                                  </MetadataBlock>

                                  {/* Left Col Block 3: Bank icon */}
                                  <MetadataBlock icon={
                                    <svg viewBox="0 0 24 24">
                                      <path d="M3 9l9-5 9 5M4 9v10M20 9v10M2 20h20M9 9v10M15 9v10" />
                                    </svg>
                                  } style={{ marginTop: '27px' }}>
                                    <MetadataRow label="Account open Date" value={isoToIndianFormat(customerDetails.accountOpenDate)} />
                                  </MetadataBlock>
                                </MetadataColumn>

                                <MetadataColumn>
                                  {/* Right Col Block 1: Bank icon */}
                                  <MetadataBlock className="sbi-stretch-block" icon={
                                    <svg viewBox="0 0 24 24">
                                      <path d="M3 9l9-5 9 5M4 9v10M20 9v10M2 20h20M9 9v10M15 9v10" />
                                    </svg>
                                  }>
                                    <MetadataRow label="Branch Code" value={branchDetails.branchCode || '04823'} isRightColumn={true} />
                                    <MetadataRow label="Branch Name" value={branchDetails.branchName} isRightColumn={true} />
                                    <MetadataRow
                                      label="Branch Email ID"
                                      value={
                                        <a href={`mailto:${branchDetails.branchEmail || ('SBI.' + (branchDetails.branchCode || '04823') + '@SBI.CO.IN').toUpperCase()}`} target="_blank" rel="noreferrer" className="text-black hover:underline" style={{ pointerEvents: 'auto' }}>
                                          {(branchDetails.branchEmail || ('SBI.' + (branchDetails.branchCode || '04823') + '@SBI.CO.IN')).toUpperCase()}
                                        </a>
                                      }
                                      isRightColumn={true}
                                    />
                                    <MetadataRow label="Branch Phone" value={branchDetails.branchPhone || '0755-2781939'} isRightColumn={true} />
                                  </MetadataBlock>

                                  {/* Right Col Block 2: Document icon */}
                                  <MetadataBlock className="sbi-stretch-block" icon={
                                    <svg viewBox="0 0 24 24">
                                      <rect x="3" y="4" width="18" height="16" rx="2" />
                                      <path d="M8 10h8M8 14h4" />
                                    </svg>
                                  }>
                                    <MetadataRow label="CIF Number" value={customerDetails.cifNumber} isRightColumn={true} />
                                    <MetadataRow label="Account Number" value={customerDetails.accountNumber} isRightColumn={true} />
                                    <MetadataRow label="Product" value={(accountInfo.accountType || '').toUpperCase()} isRightColumn={true} />
                                    <MetadataRow label="IFSC Code" value={branchDetails.ifscCode} isRightColumn={true} />
                                    <MetadataRow label="Currency" value="INR" isRightColumn={true} />
                                    <MetadataRow label="Account Status" value="OPEN" isRightColumn={true} />
                                    <MetadataRow label="CKYCR Number" value={branchDetails.ckycrNumber || '50046100545797'} isRightColumn={true} />
                                    <MetadataRow label="MICR Code" value={branchDetails.micrCode || '462002501'} isRightColumn={true} />
                                  </MetadataBlock>

                                  {/* Right Col Block 3: Nominee Name (User+ icon) */}
                                  <MetadataBlock icon={
                                    <svg viewBox="0 0 24 24">
                                      <path d="M12 12a4 4 0 100-8 4 4 0 000 8zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
                                      <path d="M20 12h4m-2-2v4" />
                                    </svg>
                                  }>
                                    <MetadataRow label="Nominee Name" value={customerDetails.nomineeName ? customerDetails.nomineeName.toUpperCase() : 'XXXXXXXXXX'} isRightColumn={true} />
                                  </MetadataBlock>
                                </MetadataColumn>
                              </div>
                            </div>

                            {/* Spacer before Statement From */}
                            <div style={{ height: '6px' }}></div>

                            {/* Statement From strip */}
                            <div style={{
                              textAlign: 'center',
                              fontSize: '10.5px',
                              color: '#000000',
                              padding: '4px 0 4px 0',
                              borderBottom: '1.5px solid #e2e8f0',
                              margin: 0
                            }}>
                              Statement From &nbsp; : &nbsp; {transactions[0]?.valueDate || '01-01-2026'} to {transactions[transactions.length - 1]?.valueDate || '22-06-2026'}
                            </div>
                          </div>
                        </div>
                      ) : (
                        /* PAGE 2+ REPEATED HEADER EMPTY DIV */
                        <div style={{ height: '0px' }}></div>
                      )}
                    </div>
                  ) : settings.bankStyle === 'BOI' ? (
                    /* BOI DESIGN THEME */
                    <div className="w-full px-[10mm] pt-4" style={{ fontFamily: 'Arial, sans-serif', color: '#000000', paddingTop: '15px' }}>
                      {isFirst ? (
                        <div>
                          {/* Logo Top Right */}
                          <div className="flex justify-end mb-2">
                            <img
                              src="/boi-logo.png"
                              alt="Bank of India"
                              style={{ height: '100px', width: 'auto' }}
                            />
                          </div>

                          {/* Title Centered */}
                          <div className="text-center my-2 mb-10">
                            <h1 className="text-xl font-bold text-black m-0">Detailed Statement</h1>
                          </div>

                          {/* Date Right Aligned */}
                          <div className="text-right text-xs font-bold text-black mb-2">
                            Date: {(() => {
                              const d = new Date();
                              return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
                            })()}
                          </div> <br />

                          {/* Account Metadata Box Table */}
                          <table className="w-full border-collapse border border-black text-xs mb-4" style={{ color: '#000' }}>
                            <tbody>
                              <tr>
                                <td className="p-1.5 pt-2.5  w-1/2 align-top">
                                  <span className="inline-block w-40 font-normal">Account holder name:</span>
                                  <span className="font-normal">{customerDetails.accountHolderName}</span>
                                </td>
                                <td className="p-1.5 pt-2.5 w-1/2 align-top">
                                  <span className="inline-block w-44 font-normal">Account holder address:</span>
                                  <span className="font-normal">{customerDetails.address?.replace(/\n/g, ' ')}</span>
                                </td>
                              </tr>
                              <tr>
                                <td className="p-1.5  align-top">
                                  <span className="inline-block w-40 font-normal">Customer ID:</span>
                                  <span className="font-normal">{customerDetails.cifNumber}</span>
                                </td>
                                <td className="p-1.5 align-top">
                                  <span className="inline-block w-44 font-normal">IFSC:</span>
                                  <span className="font-normal">{branchDetails.ifscCode}</span>
                                </td>
                              </tr>
                              <tr>
                                <td className="p-1.5  align-top">
                                  <span className="inline-block w-40 font-normal">Account number:</span>
                                  <span className="font-normal">{customerDetails.accountNumber}</span>
                                </td>
                                <td className="p-1.5 align-top">
                                  <span className="inline-block w-44 font-normal">Branch Name:</span>
                                  <span className="font-normal">{branchDetails.branchName}</span>
                                </td>
                              </tr>
                            </tbody>
                          </table>

                          {/* Transaction Date Filter Block */}
                          <div className="text-xs leading-relaxed text-black mb-4 space-y-1">
                            <div className="flex">
                              <span className="w-40 font-bold">Transaction Date</span>
                              <span><strong>from: {transactions[0]?.valueDate?.replace(/\//g, '-') || '01-12-2025'} &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; </strong> <strong>to: {transactions[transactions.length - 1]?.valueDate?.replace(/\//g, '-') || '31-05-2026'}</strong></span>
                            </div>
                            <div className="flex">
                              <span className="w-40 font-bold">Amount</span>
                              <span><strong>from:</strong> - &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; <strong>to:</strong> -</span>
                            </div>
                            <div className="flex">
                              <span className="w-40 font-bold">Cheque</span>
                              <span><strong>from:</strong> - &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; <strong>to:</strong> -</span>
                            </div>
                            <div className="mt-1"><strong>Transaction type: All</strong></div>
                          </div>
                        </div>
                      ) : (
                        <div></div>
                        // <div style={{ padding: '15px 0 10px 0', display: 'flex', justifyContent: 'space-between', fontFamily: 'Arial, sans-serif', fontSize: '11px', borderBottom: '1px solid #ccc', marginBottom: '10px' }}>
                        //   <span><strong>Detailed Statement:</strong> {customerDetails.accountHolderName} (Acc: {customerDetails.accountNumber})</span>
                        //   <span>Page {pageNum}</span>
                        // </div>
                      )}
                    </div>
                  ) : settings.bankStyle === 'PNB' ? (
                    /* PNB DESIGN THEME */
                    <div className="w-full" style={{ fontFamily: 'Arial, sans-serif' }}>
                      {isFirst ? (
                        <div>
                          {/* Banner: fixed height strip at top */}
                          <div style={{ width: '100%', margin: 0, padding: 0 }}>
                            <img
                              src="/image copy.png"
                              alt="Punjab National Bank"
                              style={{ width: '100%', height: '50px', objectFit: 'cover', objectPosition: 'center', display: 'block', margin: 0, padding: 0 }}
                            />
                          </div>

                          {/* Account Statement title */}
                          <div style={{ textAlign: 'center', margin: '10px 0 8px 0', fontSize: '13px', fontWeight: '', color: '#000' }}>
                            Account Statement For Account:{customerDetails.accountNumber}
                          </div>

                          {/* Vertical stacked details */}
                          <div style={{ padding: '0 10mm', fontSize: '10.5px', lineHeight: '1.45', color: '#000', marginBottom: '12px' }}>
                            <div style={{ fontWeight: '', marginBottom: '4px', fontSize: '13px' }}>Branch Details</div>
                            <div style={{ display: 'flex' }}><span style={{ width: '130px' }}>Branch Name:</span><span>{branchDetails.branchName}</span></div>
                            <div style={{ display: 'flex' }}><span style={{ width: '130px' }}>Bank Address:</span><span>{branchDetails.branchAddress}</span></div>
                            <div style={{ display: 'flex' }}><span style={{ width: '130px' }}>City:</span><span>{branchDetails.city || 'SHAJAPUR'}</span></div>
                            <div style={{ display: 'flex' }}><span style={{ width: '130px' }}>Pin:</span><span>{branchDetails.pinCode || '466038'}</span></div>
                            <div style={{ display: 'flex' }}><span style={{ width: '130px' }}>IFSC Code:</span><span>{branchDetails.ifscCode}</span></div>
                            <div style={{ display: 'flex' }}><span style={{ width: '130px' }}>MICR Code :</span><span>{branchDetails.micrCode}</span></div>
                          </div>

                          <div style={{ padding: '0 10mm', fontSize: '10.5px', lineHeight: '1.45', color: '#000', marginBottom: '14px' }}>
                            <div style={{ fontWeight: '', marginBottom: '4px', fontSize: '13px' }}>Customer Details</div>
                            <div style={{ display: 'flex' }}><span style={{ width: '150px' }}>Account Name :</span><span>{customerDetails.accountHolderName}</span></div><br />
                            <div>Joint Account Holder 1:</div> <br />
                            <div>Joint Account Holder 2:</div> <br />
                            <div>Joint Account Holder 3:</div> <br />
                            <div style={{ display: 'flex', marginTop: '6px' }}><span style={{ width: '150px' }}>Customer Address:</span><span>{customerDetails.address?.replace(/\n/g, ' ')}</span></div><br />
                            <div style={{ display: 'flex' }}><span style={{ width: '150px' }}>City:</span><span>{customerDetails.city || 'SHAJAPUR'}</span></div><br />
                            <div style={{ display: 'flex' }}><span style={{ width: '150px' }}>Pin:</span><span>{customerDetails.pinCode || '466038'}</span></div><br />
                            <div style={{ display: 'flex' }}><span style={{ width: '150px' }}>Nominee :</span><span>{customerDetails.nomineeName || 'NIRMALA'}</span></div><br />
                          </div>

                          {/* Statement Period */}
                          <div style={{ padding: '0 10mm', fontSize: '11px', fontWeight: '', marginBottom: '14px', color: '#000' }}>
                            Statement Period : &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; {transactions[0]?.valueDate?.replace(/-/g, '/') || '02/12/2025'} &nbsp;&nbsp;&nbsp;&nbsp;&nbsp; to &nbsp;&nbsp;&nbsp;&nbsp;&nbsp; {transactions[transactions.length - 1]?.valueDate?.replace(/-/g, '/') || '10/06/2026'}
                          </div>
                        </div>
                      ) : (
                        <div style={{ textAlign: 'center', fontSize: '13px', fontWeight: '', padding: '8px 0', marginBottom: '8px', color: '#000' }}>
                          Account Statement For Account:{customerDetails.accountNumber}
                        </div>
                      )}
                    </div>
                  ) : (
                    /* KOTAK MAHINDRA DESIGN THEME */
                    <div>
                      {isFirst ? (
                        /* FIRST PAGE COMPLETE KOTAK HEADER */
                        <div style={{ fontFamily: 'Arial, Helvetica, sans-serif' }}>
                          {/* Top red header bar */}
                          <div style={{
                            padding: '1px 10mm',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            boxSizing: 'border-box',
                            width: '100%',
                          }}>
                            {/* Left image: Kotak logo + Mahindra Bank (combined or separate) */}
                            <div>
                              <img
                                src="/kotak-logo1.png"   // replace with your actual image path
                                alt="Kotak Mahindra Bank"
                                style={{
                                  height: '100px',               // adjust to match visual size of the text
                                  width: 'auto',
                                  display: 'block',
                                }}
                              />
                            </div>

                            {/* Right image: "Account Statement" label + date (if you want a combined image) */}
                            <div>
                              <img
                                src="kotak-logo2.png"   // replace with your actual image path
                                alt="Account Statement"
                                style={{
                                  height: 'auto',
                                  maxHeight: '90px',            // adjust as needed
                                  width: 'auto',
                                  display: 'block',
                                }}
                              />
                            </div>
                          </div>

                          {/* Statement period bar */}
                          <div style={{
                            // background: '#f9f9f9',
                            padding: '20px 18mm',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                          }}>
                            <div style={{ display: 'flex', flexDirection: 'column' }}>
                              <span className='text-3xl font-semibold' style={{ color: '#111827' }}>Account Statement</span>
                              <div style={{
                                display: 'flex',
                                alignItems: 'center',
                                fontSize: '11px',
                                marginTop: '4px'
                              }}>
                                <span style={{ color: '#374151' }}>
                                  <strong style={{ fontSize: '9.5px', fontWeight: 'normal' }}>
                                    {formatKotakDate(transactions[0]?.valueDate) || '--'}
                                  </strong>{' '}
                                  -{' '}
                                  <strong style={{ fontSize: '9.5px', fontWeight: 'normal' }}>
                                    {formatKotakDate(transactions[transactions.length - 1]?.valueDate) || '--'}
                                  </strong>
                                </span>
                              </div>
                            </div>

                            {/* <span style={{   color: '#6b7280' }}>Ref: KKBK-{record.id.substring(5, 13).toUpperCase()}</span> */}
                          </div>

                          {/* Two-column: Customer & Account info */}
                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0px', borderBottom: '1px solid #e5e7eb', margin: '0 10mm', paddingTop: '20px' }}>
                            {/* Left: Customer Info */}
                            <div style={{ padding: '' }}>
                              <div style={{ fontSize: '8px', fontWeight: 700, color: '#ED1C24', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '6px' }}></div>
                              <div style={{ fontSize: '15px', fontWeight: 700, color: '#111827', marginBottom: '40px', marginLeft: '8mm' }}>{customerDetails.accountHolderName} <br /> <h5 style={{ fontSize: '11px', color: '#4b5563', lineHeight: 1.5, whiteSpace: 'pre-line', marginBottom: '4px', fontWeight: '400' }}>CRN  xxxxxx{customerDetails.cifNumber?.slice(-3)}</h5></div>
                              <div className=''>
                                <div className='text-gray-900' style={{
                                  fontSize: '12px',
                                  lineHeight: 1.5,
                                  whiteSpace: 'normal',           // allow wrapping
                                  wordWrap: 'break-word',
                                  maxWidth: '120px',              // adjust based on your font and words
                                  marginBottom: '4px',
                                  margin: '0 8mm',
                                  // fontWeight: '700',
                                  // color: '#4b5563',               // set a proper colour
                                }}>
                                  {customerDetails.address}
                                </div>

                                {/* MICR & IFSC – same line, smaller font, with top margin */}
                                <div style={{
                                  gridColumn: '1 / -1',
                                  marginTop: '20px',
                                  marginLeft: '8mm',
                                  fontSize: '12px',
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '10px'
                                }}>
                                  <div>
                                    <span style={{ color: '#A8A8A8' }}>MICR Code </span>
                                    <span style={{ color: '#111827', fontSize: '12px', fontWeight: '500' }}>{branchDetails.micrCode}</span>
                                  </div>
                                  <div>
                                    <span style={{ color: '#A8A8A8' }}>IFSC Code </span>
                                    <span style={{ color: '#111827', fontSize: '12px', fontWeight: '500' }}>{branchDetails.ifscCode}</span>
                                  </div>
                                </div>
                                {/* <div style={{ fontSize: '9px', color: '#6b7280' }}>Email: <span style={{ color: '#111827' }}>{customerDetails.email}</span></div> */}
                              </div>
                            </div>
                            {/* Right: Account Info */}
                            <div
                              style={{
                                padding: "10px 0 10px 12px",
                                marginLeft: "60px",
                                fontFamily: "Arial, Helvetica, sans-serif",
                                fontSize: "15px",
                                lineHeight: "1.18",
                                color: "#111",
                              }}
                            >
                              <div style={{ marginBottom: "5px" }}>
                                <span
                                  style={{
                                    color: "#A2A2A2",
                                    fontWeight: 400,
                                  }}
                                >
                                  Account No.&nbsp;
                                </span>

                                <span
                                  className="text-sm font-bold"
                                  style={{
                                    color: "#111111",
                                    fontWeight: 700,
                                  }}
                                >
                                  {customerDetails.accountNumber}
                                </span>
                              </div>

                              <div style={{ marginBottom: "5px" }}>
                                <span
                                  style={{
                                    color: "#A2A2A2",
                                    fontWeight: 400,
                                  }}
                                >
                                  Account Type&nbsp;
                                </span>

                                <span
                                  className="text-sm font-bold"
                                  style={{
                                    color: "#111111",
                                    fontWeight: 700,
                                  }}
                                >
                                  {accountInfo.accountType}
                                </span>
                              </div>

                              <div style={{ marginBottom: "5px" }}>
                                <span

                                  style={{
                                    color: "#A2A2A2",
                                    fontWeight: 400,

                                  }}
                                >
                                  Branch&nbsp;
                                </span>

                                <span
                                  className="text-xs font-bold"
                                  style={{
                                    color: "#111111",
                                    fontWeight: 700,
                                  }}
                                >
                                  {branchDetails.branchName}
                                </span>
                              </div>

                              <div style={{ marginBottom: "20px" }}>
                                <span
                                  style={{
                                    color: "#A2A2A2",
                                    fontWeight: 400,
                                  }}
                                >
                                  Branch Phone Number&nbsp;
                                </span>

                                <span
                                  className="text-sm font-bold"
                                  style={{
                                    color: "#111111",
                                    fontWeight: 700,
                                  }}
                                >
                                  9713063909
                                </span>
                              </div>

                              <div style={{ marginBottom: "3px" }}>
                                <span
                                  style={{
                                    color: "#A2A2A2",
                                    fontWeight: 400,
                                  }}
                                >
                                  Account Status&nbsp;
                                </span>

                                <span
                                  className="text-sm font-bold"
                                  style={{
                                    color: "#111111",
                                    fontWeight: 700,
                                  }}
                                >
                                  Active
                                </span>
                              </div>

                              <div style={{ marginBottom: "18px" }}>
                                <span
                                  style={{
                                    color: "#A2A2A2",
                                    fontWeight: 400,
                                  }}
                                >
                                  Nominee Registered&nbsp;
                                </span>

                                <span
                                  className="text-sm font-bold"
                                  style={{
                                    color: "#111111",
                                    fontWeight: 700,
                                  }}
                                >
                                  Yes
                                </span>
                              </div>

                              <div>
                                <span
                                  style={{
                                    color: "#A2A2A2",
                                    fontWeight: 400,
                                  }}
                                >
                                  Currency&nbsp;
                                </span>

                                <span
                                  className="text-xs font-bold"
                                  style={{
                                    color: "#111111",
                                    fontWeight: 700,
                                  }}
                                >
                                  INDIAN RUPEE
                                </span>
                              </div>
                            </div>
                          </div>

                          {/* Balance Summary Strip */}
                          {/* <div style={{
                            display: 'grid',
                            gridTemplateColumns: 'repeat(3, 1fr)',
                            background: '#1c1c1c',
                            margin: '0 10mm',
                            padding: '6px 12px',
                            boxSizing: 'border-box',
                          }}>
                            <div style={{ textAlign: 'center', borderRight: '1px solid #333', padding: '4px 0' }}>
                              <div style={{ fontSize: '7.5px', color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Opening Balance</div>
                              <div style={{ fontSize: '11px', fontWeight: 700, color: '#ffffff',   marginTop: '2px' }}>
                                &#8377;{accountInfo.openingBalance.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                              </div>
                            </div>
                            <div style={{ textAlign: 'center', borderRight: '1px solid #333', padding: '4px 0' }}>
                              <div style={{ fontSize: '7.5px', color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Closing Balance</div>
                              <div style={{ fontSize: '11px', fontWeight: 700, color: '#4ade80',   marginTop: '2px' }}>
                                &#8377;{closingBalance.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                              </div>
                            </div>
                            <div style={{ textAlign: 'center', padding: '4px 0' }}>
                              <div style={{ fontSize: '7.5px', color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Account Status</div>
                              <div style={{ fontSize: '11px', fontWeight: 700, color: '#ED1C24', marginTop: '2px', letterSpacing: '0.06em' }}>ACTIVE</div>
                            </div>
                          </div> */}
                        </div>
                      ) : (
                        /* PAGE 2+ KOTAK CONTINUATION HEADER */
                        <div style={{
                          padding: '15px 10mm 10px 10mm',
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'flex-start',
                          fontFamily: 'Arial, Helvetica, sans-serif',
                          fontSize: '13px',
                          lineHeight: '1.4',
                          color: '#000000',
                        }}>
                          <div style={{ fontWeight: 'normal', fontSize: '16px', textTransform: 'uppercase', marginBottom: '4px', color: '#111827' }}>
                            {customerDetails.accountHolderName}
                          </div>
                          <div style={{ color: '#111827' }}>
                            <span style={{ color: '#8c8c8c' }}>Account No. </span>
                            <span style={{ fontWeight: 600 }}>{customerDetails.accountNumber}</span>
                          </div>
                          <div style={{ color: '#111827' }}>
                            <span style={{ color: '#8c8c8c' }}>Account Statement </span>
                            <span style={{ fontWeight: 600 }}>
                              {formatKotakDate(transactions[0]?.valueDate)} - {formatKotakDate(transactions[transactions.length - 1]?.valueDate)}
                            </span>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* STATEMENT TRANSACTIONS LIST TABLE */}
                  {chunkTransactions.length > 0 && (
                    <div className={`${settings.bankStyle === 'BOI' ? 'px-[10mm] mt-2' : settings.bankStyle === 'SBI' ? 'px-[8mm] mt-2' : 'px-[8mm] mt-2'}`}>
                      {settings.bankStyle === 'SBI' ? (
                        /* ─── SBI TABLE (unchanged) ──────────────────────────────── */
                        <table className="w-full border-collapse" style={{ fontFamily: 'sans-serif', border: '1px solid #E0E0E0' }}>
                          <thead>
                            <tr style={{ height: '32px', backgroundColor: '#5452AA', color: '#ffffff', fontSize: '10px', fontWeight: 600, userSelect: 'none' }}>
                              <th style={{ width: '9%', padding: '3px 4px', textAlign: 'center', fontWeight: 600, border: '2px solid #E0E0E0' }}>Value Date</th>
                              <th style={{ width: '9%', padding: '3px 4px', textAlign: 'center', fontWeight: 600, border: '1px solid #E0E0E0' }}>Post Date</th>
                              <th style={{ width: '33%', padding: '3px 4px', textAlign: 'left', fontWeight: 600, border: '1px solid #E0E0E0' }}>Details</th>
                              <th style={{ width: '12%', padding: '3px 4px', textAlign: 'center', fontWeight: 600, border: '1px solid #E0E0E0', lineHeight: '1.2' }}>Ref No/<br />Cheque<br />No</th>
                              <th style={{ width: '12%', padding: '3px 4px', textAlign: 'center', fontWeight: 600, border: '1px solid #E0E0E0' }}>₹ Debit</th>
                              <th style={{ width: '12%', padding: '3px 4px', textAlign: 'center', fontWeight: 600, border: '1px solid #E0E0E0' }}>₹ Credit</th>
                              <th style={{ width: '13%', padding: '3px 4px', textAlign: 'center', fontWeight: 600, border: '1px solid #E0E0E0' }}>Balance</th>
                            </tr>
                          </thead>
                          <tbody style={{ backgroundColor: '#ffffff', color: '#111827' }}>
                            {chunkTransactions.map((tx) => (
                              <tr key={tx.id} style={{ borderBottom: '1px solid #e5e7eb', height: 'auto', lineHeight: '1.2' }}>
                                <td style={{ width: '9%', padding: '5.5px 4px', textAlign: 'center', border: '1px solid #e5e7eb', fontSize: '8.5px', whiteSpace: 'nowrap' }}>{tx.valueDate}</td>
                                <td style={{ width: '9%', padding: '5.5px 4px', textAlign: 'center', border: '1px solid #e5e7eb', fontSize: '8.5px', whiteSpace: 'nowrap' }}>{tx.postDate}</td>
                                <td style={{ width: '33%', padding: '5.5px 4px', textAlign: 'left', border: '1px solid #e5e7eb', fontSize: '8.5px', lineHeight: '1.2', textTransform: 'uppercase' }}>
                                  <div style={{ wordBreak: 'break-all', lineHeight: '1' }}>{formatSbiDetails(tx.details, tx.refNo)}</div>
                                </td>
                                <td style={{ width: '12%', padding: '5.5px 4px', textAlign: 'center', border: '1px solid #e5e7eb', fontSize: '8.5px' }}>-</td>
                                <td style={{ width: '12%', padding: '5.5px 4px', textAlign: 'right', border: '1px solid #e5e7eb', fontSize: '8.5px', paddingRight: '6px' }}>
                                  {tx.debit ? tx.debit.toLocaleString('en-IN', { minimumFractionDigits: 2 }) : '-'}
                                </td>
                                <td style={{ width: '12%', padding: '5.5px 4px', textAlign: 'right', border: '1px solid #e5e7eb', fontSize: '8.5px', paddingRight: '6px' }}>
                                  {tx.credit ? tx.credit.toLocaleString('en-IN', { minimumFractionDigits: 2 }) : '-'}
                                </td>
                                <td style={{ width: '13%', padding: '5.5px 4px', textAlign: 'right', border: '1px solid #e5e7eb', fontSize: '8.5px', fontWeight: '500', paddingRight: '6px' }}>
                                  {tx.balance.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                                </td>
                              </tr>
                            ))}
                            <tr style={{ height: '25px', backgroundColor: '#5452AA', userSelect: 'none' }}>
                              <td colSpan={7} style={{ padding: 0, margin: 0, height: '25px', border: '1px solid #5452AA' }}></td>
                            </tr>
                          </tbody>
                        </table>
                      ) : settings.bankStyle === 'BOI' ? (
                        /* ─── BOI TABLE ─────────────────────────────────────────── */
                        <div style={{ fontFamily: 'Arial, Helvetica, sans-serif', padding: '10px 0' }}>
                          <table className="w-full border-collapse" style={{ border: '1px solid #000', fontSize: '10.5px' }}>
                            {isFirst && (
                              <thead>
                                <tr style={{ backgroundColor: '#ffffff', color: '#000000', fontWeight: 'normal', height: '32px' }}>
                                  <th style={{ width: '6%', padding: '4px 6px', textAlign: 'left', border: '1px solid #000', fontWeight: 'normal' }}>Sr No</th>
                                  <th style={{ width: '12%', padding: '4px 6px', textAlign: 'left', border: '1px solid #000', fontWeight: 'normal' }}>Date</th>
                                  <th style={{ width: '44%', padding: '4px 6px', textAlign: 'left', border: '1px solid #000', fontWeight: 'normal' }}>Remarks</th>
                                  <th style={{ width: '12%', padding: '4px 6px', textAlign: 'right', border: '1px solid #000', fontWeight: 'normal' }}>Debit</th>
                                  <th style={{ width: '12%', padding: '4px 6px', textAlign: 'right', border: '1px solid #000', fontWeight: 'normal' }}>Credit</th>
                                  <th style={{ width: '14%', padding: '4px 6px', textAlign: 'right', border: '1px solid #000', fontWeight: 'normal' }}>Balance</th>
                                </tr>
                              </thead>
                            )}
                            <tbody style={{ backgroundColor: '#ffffff', color: '#111827' }}>
                              {chunkTransactions.map((tx) => {
                                const serialNo = transactions.indexOf(tx) + 1;
                                return (
                                  <tr key={tx.id} style={{ borderBottom: '1px solid #000' }}>
                                    <td style={{ padding: '5px 6px', textAlign: 'left', fontSize: '10px', color: '#111827', width: '6%', border: '1px solid #000' }}>{serialNo}</td>
                                    <td style={{ padding: '5px 6px', textAlign: 'left', fontSize: '10px', whiteSpace: 'nowrap', color: '#111827', width: '12%', border: '1px solid #000' }}>{tx.valueDate.replace(/\//g, '-')}</td>
                                    <td style={{ padding: '5px 6px', textAlign: 'left', fontSize: '10px', lineHeight: 1.3, color: '#111827', width: '44%', wordBreak: 'break-word', border: '1px solid #000', textTransform: 'uppercase' }}>{tx.details}</td>
                                    <td style={{ padding: '5px 6px', textAlign: 'right', fontSize: '10px', color: '#111827', width: '12%', border: '1px solid #000' }}>{tx.debit ? tx.debit.toLocaleString('en-IN', { minimumFractionDigits: 2 }) : ''}</td>
                                    <td style={{ padding: '5px 6px', textAlign: 'right', fontSize: '10px', color: '#111827', width: '12%', border: '1px solid #000' }}>{tx.credit ? tx.credit.toLocaleString('en-IN', { minimumFractionDigits: 2 }) : ''}</td>
                                    <td style={{ padding: '5px 6px', textAlign: 'right', fontSize: '10px', color: '#111827', width: '14%', border: '1px solid #000', whiteSpace: 'nowrap' }}>₹ {tx.balance.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                          {isLast && (
                            <div className="mt-4 text-xs text-slate-900 leading-relaxed font-sans select-none">
                              <strong>NOTE:</strong><br />
                              Any discrepancy in the account statement should be notified to the bank within period of 30 days of generation of statement. It will be treated that the entries/contents of this statement are checked and found correct by you, if no such complaint is made within the period stated above. Please do not share your ATM, Card details, PIN, OTP and Passwords with anyone else. Bank never asks for such details.
                            </div>
                          )}
                        </div>
                      ) : settings.bankStyle === 'PNB' ? (
                        /* ─── PNB TABLE ─────────────────────────────────────────── */
                        <div style={{ fontFamily: 'Arial, Helvetica, sans-serif' }}>
                          <table className="w-full border-collapse" style={{ border: '1px solid #000', fontSize: '10px' }}>
                            <thead>
                              <tr style={{ backgroundColor: '#d9d9d9', color: '#000000', fontWeight: 'bold', height: '28px' }}>
                                <th style={{ width: '12%', padding: '3px 5px', textAlign: 'center', border: '1px solid #000' }}>Transaction<br />Date</th>
                                <th style={{ width: '10%', padding: '3px 5px', textAlign: 'center', border: '1px solid #000' }}>Cheque<br />Number</th>
                                <th style={{ width: '14%', padding: '3px 5px', textAlign: 'right', border: '1px solid #000' }}>Withdrawal</th>
                                <th style={{ width: '14%', padding: '3px 5px', textAlign: 'right', border: '1px solid #000' }}>Deposit</th>
                                <th style={{ width: '16%', padding: '3px 5px', textAlign: 'right', border: '1px solid #000' }}>Balance</th>
                                <th style={{ width: '34%', padding: '3px 5px', textAlign: 'left', border: '1px solid #000' }}>Narration</th>
                              </tr>
                            </thead>
                            <tbody style={{ backgroundColor: '#ffffff', color: '#000000' }}>
                              {chunkTransactions.map((tx) => (
                                <tr key={tx.id} style={{ borderBottom: '1px solid #000' }}>
                                  <td style={{ padding: '3px 5px', textAlign: 'center', fontSize: '10px', color: '#000', width: '12%', border: '1px solid #000', whiteSpace: 'nowrap', lineHeight: 1.25, verticalAlign: 'middle' }}>{tx.valueDate.replace(/-/g, '/')}</td>
                                  <td style={{ padding: '3px 5px', textAlign: 'center', fontSize: '10px', color: '#000', width: '10%', border: '1px solid #000', lineHeight: 1.25, verticalAlign: 'middle' }}></td>
                                  <td style={{ padding: '3px 5px', textAlign: 'right', fontSize: '10px', color: '#000', width: '14%', border: '1px solid #000', lineHeight: 1.25, verticalAlign: 'middle' }}>{tx.debit ? tx.debit.toLocaleString('en-IN', { minimumFractionDigits: 2 }) : ''}</td>
                                  <td style={{ padding: '3px 5px', textAlign: 'right', fontSize: '10px', color: '#000', width: '14%', border: '1px solid #000', lineHeight: 1.25, verticalAlign: 'middle' }}>{tx.credit ? tx.credit.toLocaleString('en-IN', { minimumFractionDigits: 2 }) : ''}</td>
                                  <td style={{ padding: '3px 5px', textAlign: 'right', fontSize: '10px', color: '#000', width: '16%', border: '1px solid #000', whiteSpace: 'nowrap', lineHeight: 1.25, verticalAlign: 'middle' }}>{tx.balance.toLocaleString('en-IN', { minimumFractionDigits: 2 })} Cr.</td>
                                  <td style={{ padding: '3px 5px', textAlign: 'left', fontSize: '10px', color: '#000', width: '34%', border: '1px solid #000', wordBreak: 'break-word', textTransform: 'uppercase', lineHeight: 1.25, verticalAlign: 'middle' }}>{tx.details}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      ) : (
                        /* ─── KOTAK TABLE – updated header UI ──────────────────── */
                        <div style={{ fontFamily: 'Arial, Helvetica, sans-serif' }}>
                          {/* ── Title Bar ── */}
                          <div style={{
                            backgroundColor: '#ED1C24',
                            height: '40px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            margin: '',
                            padding: '0 8mm',
                            boxSizing: 'border-box',
                            fontFamily: 'Arial, Helvetica, sans-serif',
                          }}>
                            <span style={{
                              color: '#ffffff',
                              fontSize: '18px',
                              fontWeight: 500,
                              fontFamily: 'Arial, Helvetica, sans-serif',
                              letterSpacing: '0.3px',
                              textAlign: 'center',
                            }}>
                              Savings Account Transactions
                            </span>
                          </div>

                          {/* ── Table ── */}
                          <table className="w-full border-collapse" style={{ fontFamily: 'Arial, Helvetica, sans-serif', border: 'none', borderTop: '1px solid #d1d5db', borderBottom: '1px solid #d1d5db' }}>
                            <thead>
                              <tr style={{
                                backgroundColor: '#A8A8A8',
                                height: '42px',
                                userSelect: 'none',
                              }}>
                                <th style={{
                                  width: '6%',
                                  padding: '0 4px 0 12px',
                                  textAlign: 'left',
                                  verticalAlign: 'middle',
                                  border: 'none',
                                  borderRight: '1px solid #ffffff',
                                  color: '#ffffff',
                                  fontSize: '13px',
                                  fontWeight: 400,
                                  fontFamily: 'Arial, Helvetica, sans-serif',
                                }}>#</th>
                                <th style={{
                                  width: '12%',
                                  padding: '0 4px 0 12px',
                                  textAlign: 'left',
                                  verticalAlign: 'middle',
                                  border: 'none',
                                  borderRight: '1px solid #ffffff',
                                  color: '#ffffff',
                                  fontSize: '13px',
                                  fontWeight: 400,
                                  fontFamily: 'Arial, Helvetica, sans-serif',
                                }}>Date</th>
                                <th style={{
                                  width: '35%',
                                  padding: '0 4px 0 12px',
                                  textAlign: 'left',
                                  verticalAlign: 'middle',
                                  border: 'none',
                                  borderRight: '1px solid #ffffff',
                                  color: '#ffffff',
                                  fontSize: '13px',
                                  fontWeight: 400,
                                  fontFamily: 'Arial, Helvetica, sans-serif',
                                }}>Description</th>
                                <th style={{
                                  width: '17%',
                                  padding: '0 4px 0 12px',
                                  textAlign: 'left',
                                  verticalAlign: 'middle',
                                  border: 'none',
                                  borderRight: '1px solid #ffffff',
                                  color: '#ffffff',
                                  fontSize: '13px',
                                  fontWeight: 400,
                                  fontFamily: 'Arial, Helvetica, sans-serif',
                                }}>Chq/Ref. No.</th>
                                <th style={{
                                  width: '10%',
                                  padding: '0 4px 0 12px',
                                  textAlign: 'left',
                                  verticalAlign: 'middle',
                                  border: 'none',
                                  borderRight: '1px solid #ffffff',
                                  color: '#ffffff',
                                  fontSize: '13px',
                                  fontWeight: 400,
                                  fontFamily: 'Arial, Helvetica, sans-serif',
                                }}>Withdrawal (Dr.)</th>
                                <th style={{
                                  width: '10%',
                                  padding: '0 4px 0 12px',
                                  textAlign: 'left',
                                  verticalAlign: 'middle',
                                  border: 'none',
                                  borderRight: '1px solid #ffffff',
                                  color: '#ffffff',
                                  fontSize: '13px',
                                  fontWeight: 400,
                                  fontFamily: 'Arial, Helvetica, sans-serif',
                                }}>Deposit (Cr.)</th>
                                <th style={{
                                  width: '10%',
                                  padding: '0 4px 0 12px',
                                  textAlign: 'left',
                                  verticalAlign: 'middle',
                                  border: 'none',
                                  color: '#ffffff',
                                  fontSize: '13px',
                                  fontWeight: 400,
                                  fontFamily: 'Arial, Helvetica, sans-serif',
                                }}>Balance</th>
                              </tr>
                            </thead>
                            <tbody style={{ fontSize: '10px', color: '#111827' }}>
                              {/* Brought forward row for subsequent pages */}
                              {!isFirst && (
                                <tr style={{ background: '#ffffff' }}>
                                  <td style={{ padding: '6px 8px', textAlign: 'left', color: '#111827', borderBottom: '0.5px solid #d1d5db' }}></td>
                                  <td style={{ padding: '6px 8px', textAlign: 'left', color: '#111827', whiteSpace: 'nowrap', borderBottom: '0.5px solid #d1d5db' }}>{formatKotakDate(chunkTransactions[0]?.valueDate)}</td>
                                  <td style={{ padding: '6px 8px', fontWeight: 'normal', color: '#111827', borderBottom: '0.5px solid #d1d5db' }} colSpan={2}>Balance brought forward from page {pageIndex}</td>
                                  <td style={{ padding: '6px 8px', textAlign: 'right', color: '#111827', borderBottom: '0.5px solid #d1d5db' }}></td>
                                  <td style={{ padding: '6px 8px', textAlign: 'right', color: '#111827', borderBottom: '0.5px solid #d1d5db' }}></td>
                                  <td style={{ padding: '6px 8px', textAlign: 'right', color: '#111827', borderBottom: '0.5px solid #d1d5db' }}>{broughtForwardVal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                                </tr>
                              )}
                              {chunkTransactions.map((tx) => {
                                const serialNo = transactions.indexOf(tx) + 1;
                                const borderBottomStyle = (serialNo % 3 === 2)
                                  ? '1.2px solid #d1d5db'
                                  : '0.5px solid #d1d5db';
                                return (
                                  <tr key={tx.id} style={{ background: '#ffffff' }}>
                                    <td style={{ padding: '6px 8px', textAlign: 'left', color: '#111827', width: '6%', borderBottom: borderBottomStyle }}>{serialNo}</td>
                                    <td style={{ padding: '6px 8px', textAlign: 'left', whiteSpace: 'nowrap', color: '#111827', width: '12%', borderBottom: borderBottomStyle }}>{formatKotakDate(tx.valueDate)}</td>
                                    <td style={{ padding: '6px 8px', textAlign: 'left', lineHeight: 1.35, color: '#111827', width: '35%', wordWrap: 'break-word', whiteSpace: 'normal', borderBottom: borderBottomStyle }}>
                                      {tx.details.toUpperCase()}
                                    </td>
                                    <td style={{ padding: '6px 8px', textAlign: 'left', color: '#111827', width: '17%', wordWrap: 'break-word', whiteSpace: 'normal', borderBottom: borderBottomStyle }}>{tx.refNo || ''}</td>
                                    <td style={{ padding: '6px 8px', textAlign: 'right', color: '#111827', width: '10%', borderBottom: borderBottomStyle }}>
                                      {tx.debit ? tx.debit.toLocaleString('en-IN', { minimumFractionDigits: 2 }) : ''}
                                    </td>
                                    <td style={{ padding: '6px 8px', textAlign: 'right', color: '#111827', width: '10%', borderBottom: borderBottomStyle }}>
                                      {tx.credit ? tx.credit.toLocaleString('en-IN', { minimumFractionDigits: 2 }) : ''}
                                    </td>
                                    <td style={{ padding: '6px 8px', textAlign: 'right', color: '#111827', width: '10%', borderBottom: borderBottomStyle }}>
                                      {tx.balance.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  )}

                </div>

                {/* DYNAMIC LAST PAGE SUMMARY SUMMARY & SIGNATURE (FOR SBI/KOTAK) */}
                <div className={`${settings.bankStyle === 'SBI' ? 'px-[8mm] space-y-4' : 'space-y-4'}`}>
                  {isLast && settings.bankStyle === 'SBI' && (
                    <div className="mt-6 space-y-3 print:break-inside-avoid">
                      <div className="bg-[#5452AA] text-white text-xs font-medium py-2 px-3 text-center rounded-t select-none uppercase tracking-wide">
                        Statement Summary : {transactions[0]?.valueDate || '01-12-2025'} To {transactions[transactions.length - 1]?.valueDate || '31-05-2026'}
                      </div>
                      <table className="w-full text-center text-xs border border-zinc-200">
                        <thead>
                          <tr className="bg-[#5452AA] text-white font-medium text-[11px] border-b border-[#5452AA]">
                            <th className="p-2 border-r border-[#7472cb] last:border-r-0">Brought Forward (₹)</th>
                            <th className="p-2 border-r border-[#7472cb] last:border-r-0">Dr Count</th>
                            <th className="p-2 border-r border-[#7472cb] last:border-r-0">Cr Count</th>
                            <th className="p-2 border-r border-[#7472cb] last:border-r-0">Total Debits (₹)</th>
                            <th className="p-2 border-r border-[#7472cb] last:border-r-0">Total Credits (₹)</th>
                            <th className="p-2 last:border-0">Closing Balance (₹)</th>
                          </tr>
                        </thead>
                        <tbody className="bg-white text-zinc-800 font-medium text-[11px]">
                          <tr className="border-b border-zinc-200 text-zinc-950">
                            <td className="p-2.5 border-r border-zinc-200">{accountInfo.openingBalance.toLocaleString('en-IN', { minimumFractionDigits: 2 })}CR</td>
                            <td className="p-2.5 border-r border-zinc-200">{drCount}</td>
                            <td className="p-2.5 border-r border-zinc-200">{crCount}</td>
                            <td className="p-2.5 text-red-650 border-r border-zinc-200">₹{totalDebits.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                            <td className="p-2.5 text-emerald-650 border-r border-zinc-200">₹{totalCredits.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                            <td className="p-2.5 text-zinc-950">₹{closingBalance.toLocaleString('en-IN', { minimumFractionDigits: 2 })}CR</td>
                          </tr>
                        </tbody>
                      </table>

                      {/* Official disclaimer bullets underneath */}
                      <div className="pt-2 text-[9px] text-zinc-650 leading-normal pl-4 list-disc space-y-1 select-none">
                        <div className="flex items-start gap-2">
                          <span className="text-zinc-500 font-medium">•</span>
                          <span>Please do not share your ATM, Debit/Credit Card number, PIN (Personal Identification number ), OTP (One-Time Password), Username or Password with anyone via email, SMS, phone call, or any other medium. Bank never asks for such information.</span>
                        </div>
                        <div className="flex items-start gap-2">
                          <span className="text-zinc-500 font-medium">•</span>
                          <span>If your account is operated by a Power of Attorney holder, please review the transactions with extra care.</span>
                        </div>
                        <div className="flex items-start gap-2">
                          <span className="text-zinc-500 font-medium">•</span>
                          <span>This is a computer generated statement and does not require a signature.</span>
                        </div>
                      </div>
                    </div>
                  )}



                  {isLast && settings.bankStyle === 'PNB' && (
                    <div className="px-[8mm] text-[9px] leading-tight text-black border-t border-black pt-2 mt-3 font-sans select-none">
                      <div>Unless constituent notifies the bank immediately of any discrepancy found by him in his statement of Account, it will be taken that he has found the account correct.</div>
                      <div>*COMPUTER GENERATED ENTERIES SHOWN IN THE STATEMENT OF ACCOUNT DO NOT REQUIRE ANY AUTHENTICATION / INITIAL FROM THE BANK OFFICIAL.PLEASE DO NOT ACCEPT ANY MANUAL ENTRY IN YOUR COMPUTER GENERATED STATEMENT OF ACCOUNT</div>
                      <div>* PLEASE ENSURE THAT ALL THE CHEQUE LEAVES IN YOUR CUSTODY ARE DULY BRANDED WITH YOUR 16 DIGITS ACCOUNT NUMBER</div>
                      <div>* CUSTOMERS ARE REQUESTED IN THEIR OWN INTEREST NOT TO ISSUE CHEQUES WITHOUT ADEQUATE CLEAR FUNDS /ARRANGEMENTS. SUCH CHEQUES CAN BE RETURNED WITHOUT MAKING ANY FURTHER REFERENCE TO THEM.</div>
                      <div>* PLEASE MAINTAIN MINIMUM AVERAGE BALANCE,TO AVOID LEVY OF CHARGES.</div>
                      <div className="mt-1 font-bold">Abbreviations are as under:</div>
                      <div>BR: Branch Name , Csh: Cash , Clg: Clearing , ISO: Inter Sol(##) | QAB:Quarterly Average Balances , LF Chg: Ledger Folio Charges , Intt: Interest , Chrg: Charges | Ret:Returning , Chq: Cheque , SI: Standing Instruction , Stk Stmt: Stock Statement , Trf: Transfer , POSP:POINT OF SALE</div>
                    </div>
                  )}

                  {isLast && settings.bankStyle === 'Kotak' && (
                    <div style={{ margin: '40px 40px 40px 40px', fontFamily: 'Arial, Helvetica, sans-serif' }}>
                      {/* Kotak Summary Table */}
                      <div style={{ border: '1px solid #d1d5db', borderRadius: '4px', overflow: 'hidden' }}>
                        <div style={{ background: '#ED1C24', color: '#ffffff', padding: '8px 12px', fontSize: '14px', fontWeight: 'normal', textAlign: 'center' }}>
                          Account Summary
                        </div>
                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', textAlign: 'left', border: 'none' }}>
                          <thead>
                            <tr style={{ background: '#A8A8A8', color: '#ffffff', fontWeight: 'normal', height: '36px', userSelect: 'none' }}>
                              <th style={{ width: '50%', padding: '0 12px', textAlign: 'left', verticalAlign: 'middle', border: 'none', borderRight: '1px solid #ffffff' }}>Particulars</th>
                              <th style={{ width: '25%', padding: '0 12px', textAlign: 'right', verticalAlign: 'middle', border: 'none', borderRight: '1px solid #ffffff' }}>Opening Balance</th>
                              <th style={{ width: '25%', padding: '0 12px', textAlign: 'right', verticalAlign: 'middle', border: 'none' }}>Closing Balance</th>
                            </tr>
                          </thead>
                          <tbody>
                            <tr style={{ background: '#ffffff', height: '36px', color: '#111827', borderBottom: '1px solid #d1d5db' }}>
                              <td style={{ padding: '0 12px', textAlign: 'left', verticalAlign: 'middle', border: 'none' }}>Savings Account (SA):</td>
                              <td style={{ padding: '0 12px', textAlign: 'right', verticalAlign: 'middle', border: 'none' }}>{accountInfo.openingBalance.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                              <td style={{ padding: '0 12px', textAlign: 'right', verticalAlign: 'middle', border: 'none' }}>{closingBalance.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                            </tr>
                          </tbody>
                        </table>
                      </div>

                      {/* Disclaimer */}
                      <div style={{ marginTop: '40px', fontFamily: 'Arial, Helvetica, sans-serif', textAlign: 'center', color: '#111827', fontSize: '11px', lineHeight: '1.6', userSelect: 'none', width: '100%' }}>
                        <div style={{ fontSize: '14px', marginBottom: '8px', color: '#000000' }}>End of Statement</div>
                        <div>Any discrepancy in the statement should be brought to the notice of Kotak Mahindra Bank Ltd. within</div>
                        <div style={{ marginBottom: '6px' }}>one month from the date of receipt of the statement.</div>
                        <div>This is a system generated report and does not require signature and stamp.</div>
                      </div>
                    </div>
                  )}

                </div>

                {settings.bankStyle === 'SBI' ? (
                  <div style={{ textAlign: 'center', fontFamily: 'sans-serif', fontSize: '11px', fontWeight: 400, color: '#4b5563', paddingBottom: '10px', userSelect: 'none' }}>
                    Page no. {pageNum}
                  </div>
                ) : settings.bankStyle === 'PNB' ? (
                  <div style={{ textAlign: 'right', fontFamily: 'sans-serif', fontSize: '10px', fontWeight: 400, color: '#000000', paddingRight: '10mm', paddingBottom: '10px', userSelect: 'none' }}>
                    Page No - {pageNum}
                  </div>
                ) : (
                  /* Kotak / BOI bottom bar */
                  // <div style={{ marginTop: '6px' }}>
                  //   <div className='text-gray-600' style={{
                  //     fontSize: '8.5px',
                  //     fontFamily: 'Arial, Helvetica, sans-serif',
                  //     padding: '5px 10mm',
                  //     display: 'flex',
                  //     alignItems: 'center',
                  //     justifyContent: 'space-between',
                  //     userSelect: 'none',
                  //   }}>
                  //     <span className='text-gray-600' style={{ fontStyle: 'italic', fontSize: '12px', letterSpacing: '-0.3px' }}>Statement Generated on {formattedDateNow()}</span>
                  //     {/* <span style={{ opacity: 0.85 }}>This is a system-generated statement. | Kotak Mahindra Bank Ltd.</span> */}
                  //     <span className='text-gray-600' style={{ background: 'rgba(255,255,255,0.15)', padding: '1px 8px', borderRadius: '3px', fontSize: '12px' }}>Page {pageNum} of {allPages.length}</span>
                  //   </div>
                  // </div>
                  <div></div>
                )}

              </div>
            );
          })}

        </div>

      </div>

    </div>
  );
}

// Helpers
function formattedDateNow() {
  const d = new Date();
  return `${d.toISOString().split('T')[0]} ${d.toTimeString().split(' ')[0]}`;
}
