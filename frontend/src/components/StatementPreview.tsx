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
    : chunkTransactionsForA4(transactions, 15, 28);

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
                className={`print-page w-[210mm] min-h-[297mm] h-[297mm] bg-white text-black relative flex flex-col justify-between shadow-xl border border-slate-200 print:border-none print:shadow-none print:m-0 print:page-break-after p-0 pb-0`}
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
                            <span className='text-2xl font-semibold '>Account Statement <div style={{
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  fontSize: '11px',
  // fontFamily: 'Arial, Helvetica, sans-serif',
}}>
  <span>
    <strong style={{ fontSize: '9.5px', fontWeight: 'normal' }}>
      {transactions[0]?.valueDate || '--'}
    </strong>{' '}
    -{' '}
    <strong style={{ fontSize: '9.5px', fontWeight: 'normal' }}>
      {transactions[transactions.length - 1]?.valueDate || '--'}
    </strong>
  </span>
</div> </span>
                            
                            {/* <span style={{   color: '#6b7280' }}>Ref: KKBK-{record.id.substring(5, 13).toUpperCase()}</span> */}
                          </div>

                          {/* Two-column: Customer & Account info */}
                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0px', borderBottom: '1px solid #e5e7eb', margin: '0 10mm',  paddingTop:'20px' }}>
                            {/* Left: Customer Info */}
                            <div style={{ padding: '' }}>
                              <div style={{ fontSize: '8px', fontWeight: 700, color: '#ED1C24', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '6px' }}></div>
                              <div style={{ fontSize: '15px', fontWeight: 700, color: '#111827', marginBottom: '3px', marginBottom: '40px' , marginLeft: '8mm' }}>{customerDetails.accountHolderName} <br/> <h5 style={{ fontSize: '11px', color: '#4b5563', lineHeight: 1.5, whiteSpace: 'pre-line', marginBottom: '4px', fontWeight: '400' }}>CRN  xxxxxx{customerDetails.cifNumber?.slice(-3)}</h5></div>
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
  gap: '6px',        
  fontWeight: '700'              // space between items
}}>
  <span style={{ color: '#6b7280' }}>MICR Code:</span>
  <span style={{ color: '#111827',   fontSize: '14px' }}>{branchDetails.micrCode}</span>
  <span style={{ color: '#6b7280' }}>IFSC Code:</span>
  <span style={{ color: '#111827',   fontSize: '14px'  }}>{branchDetails.ifscCode}</span>
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
    className="text-sm font-semibold"
      style={{
        color: "#111111",
        fontWeight: 600,
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
    className="text-sm font-semibold"
      style={{
        color: "#111111",
        fontWeight: 600,
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
     className="text-xs font-semibold"
      style={{
        color: "#111111",
        fontWeight: 600,
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
     className="text-sm font-semibold"
      style={{
        color: "#111111",
        fontWeight: 600,
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
     className="text-sm font-semibold"
      style={{
        color: "#111111",
        // fontWeight: 600,
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
     className="text-sm font-semibold"
      style={{
        color: "#111111",
        // fontWeight: 600,
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
    className="text-xs font-semibold"
      style={{
        color: "#111111",
        // fontWeight: ,
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
                        <div className='' style={{
                          // background: '#ED1C24',
                          padding: '6px 10mm',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontFamily: 'Arial, Helvetica, sans-serif',
                        }}>
                          <div style={{ color: '#fff', fontSize: '16px' }}>
                             {/* Account Transactions */}
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* STATEMENT TRANSACTIONS LIST TABLE */}
                 {chunkTransactions.length > 0 && (
  <div className={`${settings.bankStyle === 'SBI' ? 'px-[8mm] mt-2' : 'px-[8mm] mt-2'}`}>
    {settings.bankStyle === 'SBI' ? (
      /* ─── SBI TABLE (unchanged) ──────────────────────────────── */
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
    <table className="w-full border-collapse" style={{ fontFamily: 'Arial, Helvetica, sans-serif', border: 'none' }}>
      <thead>
        <tr style={{
          backgroundColor: '#A8A8A8',
          height: '42px',
          userSelect: 'none',
          borderBottom: '1px solid #DDDDDD',
        }}>
          <th style={{
            width: '11%',
            padding: '0 4px 0 12px',
            textAlign: 'left',
            verticalAlign: 'middle',
            borderRight: '1px solid #ffffff',
            color: '#ffffff',
            fontSize: '14px',
            fontWeight: 400,
            fontFamily: 'Arial, Helvetica, sans-serif',
          }}>Date</th>
          <th style={{
            width: '31%',
            padding: '0 4px 0 12px',
            textAlign: 'left',
            verticalAlign: 'middle',
            borderRight: '1px solid #ffffff',
            color: '#ffffff',
            fontSize: '14px',
            fontWeight: 400,
            fontFamily: 'Arial, Helvetica, sans-serif',
          }}>Description</th>
          <th style={{
            width: '13%',
            padding: '0 4px 0 12px',
            textAlign: 'left',
            verticalAlign: 'middle',
            borderRight: '1px solid #ffffff',
            color: '#ffffff',
            fontSize: '14px',
            fontWeight: 400,
            fontFamily: 'Arial, Helvetica, sans-serif',
          }}>Chq/Ref. No.</th>
          <th style={{
            width: '10%',
            padding: '0 4px 0 12px',
            textAlign: 'left',
            verticalAlign: 'middle',
            borderRight: '1px solid #ffffff',
            color: '#ffffff',
            fontSize: '14px',
            fontWeight: 400,
            fontFamily: 'Arial, Helvetica, sans-serif',
          }}>Value Date</th>
          <th style={{
            width: '11%',
            padding: '0 4px 0 12px',
            textAlign: 'left',
            verticalAlign: 'middle',
            borderRight: '1px solid #ffffff',
            color: '#ffffff',
            fontSize: '14px',
            fontWeight: 400,
            fontFamily: 'Arial, Helvetica, sans-serif',
          }}>Withdrawal (Dr.)</th>
          <th style={{
            width: '11%',
            padding: '0 4px 0 12px',
            textAlign: 'left',
            verticalAlign: 'middle',
            borderRight: '1px solid #ffffff',
            color: '#ffffff',
            fontSize: '14px',
            fontWeight: 400,
            fontFamily: 'Arial, Helvetica, sans-serif',
          }}>Deposit (Cr.)</th>
          <th style={{
            width: '13%',
            padding: '0 4px 0 12px',
            textAlign: 'left',
            verticalAlign: 'middle',
            color: '#ffffff',
            fontSize: '14px',
            fontWeight: 400,
            fontFamily: 'Arial, Helvetica, sans-serif',
          }}>Balance</th>
        </tr>
      </thead>
      <tbody style={{ fontSize: '9px', color: '#111827' }}>
        {/* Brought forward row for subsequent pages */}
        {!isFirst && (
          <tr style={{ background: '#fef2f2', borderBottom: '1px solid #DDDDDD' }}>
            <td style={{ padding: '4px 5px', textAlign: 'center', color: '#9ca3af' }}>{chunkTransactions[0]?.valueDate}</td>
            <td style={{ padding: '4px 5px', fontWeight: 600, color: '#374151' }} colSpan={2}>Balance brought forward from page {pageIndex}</td>
            <td style={{ padding: '4px 5px', textAlign: 'center', color: '#9ca3af' }}>--</td>
            <td style={{ padding: '4px 5px', textAlign: 'right', color: '#9ca3af' }}>--</td>
            <td style={{ padding: '4px 5px', textAlign: 'right', color: '#9ca3af' }}>--</td>
            <td style={{ padding: '4px 5px', textAlign: 'right', fontWeight: 700, color: '#111827' }}>&#8377;{broughtForwardVal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
          </tr>
        )}
        {chunkTransactions.map((tx, txIdx) => (
          <tr key={tx.id} style={{ borderBottom: '3px solid #f3f4f6', background: txIdx % 2 === 0 ? '#ffffff' : '#ffffff' }}>
            <td style={{ padding: '3.5px 5px', textAlign: 'center', fontSize: '8.5px', whiteSpace: 'nowrap', color: '#374151' }}>{tx.valueDate}</td>
            <td style={{ padding: '3.5px 5px', textAlign: 'left', lineHeight: 1.3, color: '#111827', fontWeight: 500 }}>
              {tx.details.toUpperCase()}
            </td>
            <td style={{ padding: '3.5px 5px', textAlign: 'center', fontSize: '8px', color: '#6b7280', wordBreak: 'break-all' }}>{tx.refNo || '--'}</td>
            <td style={{ padding: '3.5px 5px', textAlign: 'center', fontSize: '8.5px', whiteSpace: 'nowrap', color: '#374151' }}>{tx.postDate}</td>
            <td style={{ padding: '3.5px 5px', textAlign: 'right', color: tx.debit ? '#111827' : '#9ca3af', fontWeight: tx.debit ? 600 : 400 }}>
              {tx.debit ? tx.debit.toLocaleString('en-IN', { minimumFractionDigits: 2 }) : ''}
            </td>
            <td style={{ padding: '3.5px 5px', textAlign: 'right', color: tx.credit ? '#111827' : '#9ca3af', fontWeight: tx.credit ? 600 : 400 }}>
              {tx.credit ? tx.credit.toLocaleString('en-IN', { minimumFractionDigits: 2 }) : ''}
            </td>
            <td style={{ padding: '3.5px 5px', textAlign: 'right', fontWeight: 700, color: '#111827' }}>
              {tx.balance.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </td>
          </tr>
        ))}
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

                  {isLast && settings.bankStyle !== 'SBI' && (
                    <div style={{ margin: '40px 40px 40px 40px', fontFamily: 'Arial, Helvetica, sans-serif' }}>
                      {/* Kotak Summary Table */}
                      <div style={{ border: '1px solid #e5e7eb', overflow: 'hidden',}}>
                        <div className='text-center' style={{ background: '#ED1C24', color: '#fff', padding: '5px 10px', fontSize: '18px', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                          Account Statement Summary
                        </div>
                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                          <thead >
                            <tr className='mt-8' style={{ background: '#A8A8A8', color: 'white',  }}>
                              <th style={{ padding: '18px 8px', borderBottom: '1px solid #e5e7eb', borderRight: '1px solid #e5e7eb', textAlign: 'center' }}>Opening Balance (&#8377;)</th>
                              <th style={{ padding: '6px 8px', borderBottom: '1px solid #e5e7eb', borderRight: '1px solid #e5e7eb', textAlign: 'center' }}>Total Debits (&#8377;)</th>
                              <th style={{ padding: '6px 8px', borderBottom: '1px solid #e5e7eb', borderRight: '1px solid #e5e7eb', textAlign: 'center' }}>Total Credits (&#8377;)</th>
                              <th style={{ padding: '6px 8px', borderBottom: '1px solid #e5e7eb', borderRight: '1px solid #e5e7eb', textAlign: 'center' }}>Dr Count</th>
                              <th style={{ padding: '6px 8px', borderBottom: '1px solid #e5e7eb', borderRight: '1px solid #e5e7eb', textAlign: 'center' }}>Cr Count</th>
                              <th style={{ padding: '6px 8px', borderBottom: '1px solid #e5e7eb', textAlign: 'center' }}>Closing Balance (&#8377;)</th>
                            </tr>
                          </thead>
                          <tbody>
                            <tr style={{   fontWeight: 600, color: '#111827', textAlign: 'center' }}>
                              <td style={{ padding: '7px 8px', borderRight: '1px solid #e5e7eb' }}>{accountInfo.openingBalance.toLocaleString('en-IN', { minimumFractionDigits: 2 })} Cr</td>
                              <td style={{ padding: '7px 8px', borderRight: '1px solid #e5e7eb' }}>{totalDebits.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                              <td style={{ padding: '7px 8px', borderRight: '1px solid #e5e7eb' }}>{totalCredits.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                              <td style={{ padding: '7px 8px', borderRight: '1px solid #e5e7eb' }}>{drCount}</td>
                              <td style={{ padding: '7px 8px', borderRight: '1px solid #e5e7eb' }}>{crCount}</td>
                              <td style={{ padding: '7px 8px', fontWeight: 700, }}>{closingBalance.toLocaleString('en-IN', { minimumFractionDigits: 2 })} Cr</td>
                            </tr>
                          </tbody>
                        </table>
                      </div>

                      {/* Disclaimer */}
                      <div style={{ marginTop: '8px', fontSize: '8px', color: '#6b7280', lineHeight: 1.5 }}>
                        <div style={{ marginBottom: '3px' }}>• This is a computer generated statement and does not require a signature.</div>
                        <div style={{ marginBottom: '3px' }}>• Please do not share your ATM PIN, OTP, net banking credentials or card details with anyone. Kotak Bank will never ask for such information.</div>
                        <div>• For any queries, please call Kotak Customer Care at 1860-266-2666 or write to service.kotak@kotak.com</div>
                      </div>
                    </div>
                  )}

                </div>

                {settings.bankStyle === 'SBI' ? (
                  <div style={{ textAlign: 'center', fontFamily: 'sans-serif', fontSize: '11px', fontWeight: 400, color: '#4b5563', paddingBottom: '10px', userSelect: 'none' }}>
                    Page no. {pageNum}
                  </div>
                ) : (
                  /* Kotak red footer bar */
                  <div style={{ marginTop: '6px' }}>
                    <div className='text-gray-600' style={{
                      fontSize: '8.5px',
                      fontFamily: 'Arial, Helvetica, sans-serif',
                      padding: '5px 10mm',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      userSelect: 'none',
                    }}>
                      <span className='text-gray-600' style={{ fontStyle: 'italic', fontSize:'12px' , letterSpacing: '-0.3px' }}>Statement Generated on {formattedDateNow()}</span>
                      {/* <span style={{ opacity: 0.85 }}>This is a system-generated statement. | Kotak Mahindra Bank Ltd.</span> */}
                      <span className='text-gray-600' style={{   background: 'rgba(255,255,255,0.15)', padding: '1px 8px', borderRadius: '3px', fontSize:'12px' }}>Page {pageNum} of {allPages.length}</span>
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
