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
    : chunkTransactionsForA4(transactions, 13, 23);

  const allPages = [...pageChunks, [] as Transaction[]];

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
              const prevChunk = allPages[pageIndex - 1];
              if (prevChunk && prevChunk.length > 0) {
                broughtForwardVal = prevChunk[prevChunk.length - 1].balance;
              }
            }

            return (
              <div 
                key={pageIndex}
                className={`print-page w-[210mm] min-h-[297mm] h-[297mm] bg-white text-black relative flex flex-col justify-between shadow-xl border border-slate-200 print:border-none print:shadow-none print:m-0 print:page-break-after ${
                  settings.bankStyle === 'SBI' ? 'p-0 pb-[6mm]' : 'p-[8mm] print:p-[8mm]'
                }`}
                style={{ contentVisibility: 'auto', fontFamily: 'sans-serif' }}
              >
                
                <div className="space-y-4 print:space-y-0 print:mt-0 print:pt-0" style={{ marginTop: 0, paddingTop: 0 }}>
                  
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
                              <div style={{  fontSize: '11px', textTransform: 'capitalize' }}>Welcome:</div>
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
                                    <MetadataRow label="Clear Balance" value="90,000.00CR" />
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
                                    <MetadataRow label="Product" value="-" isRightColumn={true} />
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
                  ) : (
                    /* KOTAK MAHINDRA DESIGN THEME */
                    <div>
                      {isFirst ? (
                        /* FIRST PAGE COMPLETE KOTAK METRICS HEADER */
                        <div className="border-b-2 border-[#ef4444] pb-4">
                          <div className="flex items-center justify-between">
                            {/* SVG Kotak Vector Logo */}
                            <div className="flex items-center gap-1">
                              <div className="flex items-baseline space-x-1">
                                <span className="text-3xl font-extrabold text-[#e11d48] lowercase tracking-tighter">kotak</span>
                                <span className="text-xl font-bold text-[#1e1b4b] tracking-tight">Kotak Mahindra Bank</span>
                              </div>
                            </div>
                            <div className="text-right text-[10px] text-[#6c7086] font-mono">
                              <div>Process Identifier No: KKBK-{record.id.substring(5, 11).toUpperCase()}</div>
                              <div>Generation ISO: {formattedDateNow()}</div>
                            </div>
                          </div>

                          {/* Grid Customer and Branch info split */}
                          <div className="grid grid-cols-2 gap-4 mt-5 text-[11px] text-zinc-800 leading-snug">
                            
                            {/* Customer details */}
                            <div className="p-3 border-l-2 border-zinc-300 bg-zinc-50 rounded-r">
                              <span className="text-[10px] text-rose-600 font-bold uppercase block tracking-wider mb-1">POSTAL MAILING DOSSIER</span>
                              <div className="font-extrabold text-[#11111b] mb-1">{customerDetails.accountHolderName}</div>
                              <div className="text-zinc-650 whitespace-pre-line leading-relaxed">{customerDetails.address}</div>
                              <div className="mt-2 text-[10px] text-zinc-400 font-mono">Email: <span className="text-black">{customerDetails.email || 'N/A'}</span></div>
                            </div>

                            {/* Acc Infobox & Branch details */}
                            <div className="p-3 border-l-2 border-[#e11d48] bg-rose-50/20 rounded-r leading-relaxed">
                              <span className="text-[10px] text-[#1e1b4b] font-bold uppercase block tracking-wider mb-0.5">ACCOUNTS BRANCH REGISTRY</span>
                              <div className="font-bold text-zinc-900">{branchDetails.branchName}</div>
                              <div className="text-zinc-500 text-[10px]">{branchDetails.branchAddress}</div>
                              <div className="grid grid-cols-2 gap-x-2 mt-2 pt-2 border-t border-rose-100 font-mono text-[9px]">
                                <div>IFSC CODE: <strong className="text-black">{branchDetails.ifscCode}</strong></div>
                                <div>BRANCH CODE: <span className="text-black">{branchDetails.branchCode || 'N/A'}</span></div>
                                <div>MICR CODE: <span className="text-black">{branchDetails.micrCode || 'N/A'}</span></div>
                                <div>CKYCR NO: <span className="text-black">{branchDetails.ckycrNumber || 'N/A'}</span></div>
                                <div>NOMINEE REG: <strong className="text-black uppercase">{customerDetails.nomineeName || 'N/A'}</strong></div>
                                <div>OPEN DATE: <span className="text-black">{isoToIndianFormat(customerDetails.accountOpenDate)}</span></div>
                              </div>
                            </div>

                          </div>

                          {/* Kotak Account metadata strip */}
                          <div className="grid grid-cols-4 gap-2 text-center bg-[#1e1b4b] text-white p-2 rounded mt-3 text-[10px] font-mono leading-none">
                            <div className="border-r border-slate-700 py-1">
                              <span className="text-slate-400 text-[8px] block uppercase">ACCOUNT NO</span>
                              <strong className="text-white text-xs tracking-widest">{customerDetails.accountNumber}</strong>
                            </div>
                            <div className="border-r border-slate-700 py-1">
                              <span className="text-slate-400 text-[8px] block uppercase">PRODUCT SCHEME</span>
                              <strong className="text-white text-[11px]">{accountInfo.accountType.toUpperCase()}</strong>
                            </div>
                            <div className="border-r border-slate-700 py-1">
                              <span className="text-slate-400 text-[8px] block">INTEREST ACCRUAL</span>
                              <strong className="text-white text-[11px]">{accountInfo.interestRate}% P.A</strong>
                            </div>
                            <div className="py-1">
                              <span className="text-slate-400 text-[8px] block uppercase">SCHEDULER PERIOD</span>
                              <strong className="text-rose-400 text-[11px]">{settings.duration.toUpperCase()}</strong>
                            </div>
                          </div>

                        </div>
                      ) : (
                        /* SEQUENTIAL PAGES CONCIERGE HEADER (KOTAK) */
                        <div className="flex justify-between items-end border-b border-rose-200 pb-2 mb-4 text-[10px] font-mono text-zinc-500">
                          <div className="flex items-center space-x-1 text-[#1e1b4b]">
                            <span className="text-rose-600 font-extrabold text-sm lowercase leading-none">kotak</span>
                            <span>| ACC: {customerDetails.accountNumber}</span>
                          </div>
                          <div>Sheet Page {pageNum} of {allPages.length}</div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* STATEMENT TRANSACTIONS LIST TABLE */}
                  {chunkTransactions.length > 0 && (
                    <div className={`${settings.bankStyle === 'SBI' ? 'px-[8mm] mt-2' : 'mt-4'}`}>
                      {settings.bankStyle === 'SBI' ? (
                        <table className="w-full border-collapse" style={{ fontFamily: 'sans-serif', border: '1px solid #E0E0E0' }}>
                          <thead>
                            <tr style={{ height: '32px', backgroundColor: '#5452AA', color: '#ffffff', fontSize: '10px', fontWeight: 600, userSelect: 'none' }}>
                              <th style={{ width: '9%', padding: '3px 4px', textAlign: 'center', fontWeight: 600, border: '2px solid #E0E0E0' }}>Value Date</th>
                              <th style={{ width: '9%', padding: '3px 4px', textAlign: 'center', fontWeight: 600, border: '1px solid #E0E0E0' }}>Post Date</th>
                              <th style={{ width: '33%', padding: '3px 4px', textAlign: 'left', fontWeight: 600, border: '1px solid #E0E0E0' }}>Details</th>
                              <th style={{ width: '12%', padding: '3px 4px', textAlign: 'center', fontWeight: 600, border: '1px solid #E0E0E0', lineHeight: '1.2' }}>Ref No/<br/>Cheque<br/>No</th>
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
                                <td style={{ width: '12%', padding: '5.5px 4px', textAlign: 'center', border: '1px solid #e5e7eb', fontSize: '8.5px' }}>
                                  -
                                </td>
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

                            {/* Mandated Solid Purple Footer Row height 25px spanning all columns */}
                            <tr style={{ height: '25px', backgroundColor: '#5452AA', userSelect: 'none' }}>
                              <td colSpan={7} style={{ padding: 0, margin: 0, height: '25px', border: '1px solid #5452AA' }}></td>
                            </tr>
                          </tbody>
                        </table>
                      ) : (
                        <table className="w-full text-left text-[11px] font-sans border-collapse">
                          <thead>
                            <tr className="bg-slate-100 text-zinc-700 border-b-2 border-zinc-300 font-semibold font-mono">
                              <th className="p-1 px-2 w-[85px]">Value Date</th>
                              <th className="p-1 px-2 w-[85px]">Post Date</th>
                              <th className="p-1 px-2">Transaction Details</th>
                              <th className="p-1 px-2 w-[125px]">Ref / Chq No</th>
                              <th className="p-1 px-2 w-[90px] text-right">Debit (Dr)</th>
                              <th className="p-1 px-2 w-[90px] text-right">Credit (Cr)</th>
                              <th className="p-1 px-2 w-[110px] text-right">Balance</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-zinc-200 text-zinc-800">
                            {/* Brought forward line if not page 1 */}
                            {!isFirst && (
                              <tr className="bg-zinc-50 font-mono text-zinc-500 italic text-[10px]">
                                <td className="p-1.5 px-2">{chunkTransactions[0].valueDate}</td>
                                <td className="p-1.5 px-2">--</td>
                                <td className="p-1.5 px-2" colSpan={2}>Brought Forward balance from sheet page {pageIndex}</td>
                                <td className="p-1.5 px-2 text-right">--</td>
                                <td className="p-1.5 px-2 text-right">--</td>
                                <td className="p-1.5 px-2 text-right font-semibold text-zinc-700">
                                  ₹{broughtForwardVal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                                </td>
                              </tr>
                            )}

                            {chunkTransactions.map((tx) => (
                              <tr key={tx.id} className="hover:bg-slate-50/50 transition-colors leading-relaxed">
                                <td className="p-1.5 px-2 font-mono text-zinc-650 tracking-tighter whitespace-nowrap">{tx.valueDate}</td>
                                <td className="p-1.5 px-2 font-mono text-zinc-400 tracking-tighter whitespace-nowrap">{tx.postDate}</td>
                                <td className="p-1.5 px-2 break-all text-zinc-900 leading-snug font-medium tracking-tight pr-4">{tx.details}</td>
                                <td className="p-1.5 px-2 font-mono text-zinc-600 text-[10px] tracking-tighter whitespace-nowrap">{tx.refNo}</td>
                                <td className="p-1.5 px-2 text-right font-mono text-red-700 font-semibold">
                                  {tx.debit ? `₹${tx.debit.toLocaleString('en-IN', { minimumFractionDigits: 2 })}` : ''}
                                </td>
                                <td className="p-1.5 px-2 text-right font-mono text-emerald-700 font-semibold">
                                  {tx.credit ? `₹${tx.credit.toLocaleString('en-IN', { minimumFractionDigits: 2 })}` : ''}
                                </td>
                                <td className="p-1.5 px-2 text-right font-mono text-zinc-900 font-bold">
                                  ₹{tx.balance.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
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

                  {isLast && settings.bankStyle !== 'SBI' && (
                    <div className="border hover:border-slate-300 p-4 rounded bg-slate-50/50 mt-6 grid grid-cols-2 gap-6 text-[11px] leading-relaxed select-none">
                      
                      {/* Calculated Aggregate ledger metrics */}
                      <div>
                        <span className="text-[10px] text-zinc-500 font-bold uppercase block tracking-wider mb-2">LEDGER BALANCES ANALYSIS</span>
                        <div className="space-y-1 font-mono text-zinc-700">
                          <div className="flex justify-between">
                            <span>Balance Brought Forward:</span>
                            <span className="text-zinc-900 font-medium">₹{accountInfo.openingBalance.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Total Debits ({drCount} events):</span>
                            <span className="text-red-700">₹{totalDebits.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                          </div>
                          <div className="flex justify-between pb-1 border-b border-zinc-200">
                            <span>Total Credits ({crCount} events):</span>
                            <span className="text-emerald-700">+₹{totalCredits.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                          </div>
                          <div className="flex justify-between text-xs font-bold pt-1 text-zinc-950">
                            <span>Final Closing Balance:</span>
                            <span>₹{closingBalance.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                          </div>
                        </div>
                      </div>

                      {/* Official Disclaimer & Audit Watermark */}
                      <div className="flex flex-col justify-between text-zinc-500 text-[10px] text-right border-l border-zinc-200 pl-6 leading-relaxed">
                        <div>
                          <strong className="text-zinc-800 uppercase block font-semibold mb-1">AUDIT SUMMARY & SEAL</strong>
                          <p>This document verifies currency deposits, interest rates, and debits in reference to individual ledger accounts. This statement has been programmatically certified correct in accordance with container math buffers.</p>
                        </div>
                        <div className="font-mono text-slate-400 mt-2">
                          <div className="italic">Signed Digitally / Secure Server Seal</div>
                          <div>STATE_LABS INTEGRATION ENGINE</div>
                        </div>
                      </div>

                    </div>
                  )}

                </div>

                {settings.bankStyle === 'SBI' ? (
                  <div style={{ textAlign: 'center', fontFamily: 'sans-serif', fontSize: '11px', fontWeight: 400, color: '#4b5563', paddingBottom: '10px', userSelect: 'none' }}>
                    Page no. {pageNum}
                  </div>
                ) : (
                  /* MANDATORY STRICT REQUIREMENT: "Every page must end with a solid purple footer row. Color: #663391. The footer row should span all columns." */
                  <div className="mt-4 pt-1">
                    <div className="bg-[#663391] text-white text-[9px] font-mono p-2 py-2.5 rounded flex items-center justify-between uppercase tracking-wider leading-none select-none">
                      <div className="font-semibold">Statement Labs System Proof • CONFIDENTIAL TRAINER MATRIX</div>
                      <div className="flex items-center gap-3">
                        <span>SECURITY COGNIZANT</span>
                        <span className="bg-white/10 px-2 py-0.5 rounded font-bold text-white">PAGE {pageNum} OF {allPages.length}</span>
                      </div>
                    </div>
                  </div>
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
