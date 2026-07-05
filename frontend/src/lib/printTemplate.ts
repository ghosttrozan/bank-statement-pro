import { StatementRecord } from '../types';

function getTodayDateStr(): string {
  const d = new Date();
  const date = d.getDate().toString().padStart(2, '0');
  const month = (d.getMonth() + 1).toString().padStart(2, '0');
  const year = d.getFullYear();
  return `${date}-${month}-${year}`;
}

function formatDetails(details: string | null | undefined, refNo?: string | null | undefined): string {
  if (!details) return '';
  const text = details.toUpperCase();
  const ref = refNo ? refNo.toUpperCase() : '';

  const toHtml = (l1: string, l2: string, l3: string) => {
    return `
      <span style="display:block; line-height:1.25;">
        <span style="display:block; white-space:nowrap;">${l1}</span>
        <span style="display:block; white-space:nowrap;">${l2}</span>
        <span style="display:block; white-space:nowrap;">${l3}</span>
      </span>
    `;
  };

  // 1. NEFT
  if (text.startsWith('BY TRANSFER-NEFT*') || text.startsWith('TO TRANSFER-NEFT*')) {
    const isTo = text.startsWith('TO TRANSFER-');
    const prefix = isTo ? 'TO TRANSFER-' : 'BY TRANSFER-';
    const rest = text.substring(prefix.length);
    const parts = rest.split('*');
    if (parts.length >= 4) {
      const line1 = prefix;
      const line2 = `${parts[0]}*${parts[1]}*${parts[2]}*`;
      const line3 = parts.slice(3).join('*') + (ref ? `*${ref}` : '');
      return toHtml(line1, line2, line3);
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
        const line3 = parts.slice(4).join('/') + ref;
        return toHtml(line1, line2, line3);
      } else {
        const line1 = prefix;
        const line2 = parts.slice(0, 2).join('/') + '/';
        const line3 = parts.slice(2).join('/') + (ref ? `/${ref}` : '');
        return toHtml(line1, line2, line3);
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
      const line3 = parts.slice(2).join(' ') + (ref ? ` ${ref}` : '');
      return toHtml(line1, line2, line3);
    }
  }

  // Fallback
  return `
    <span style="display:block; line-height:1.25;">
      <span style="display:block; white-space:nowrap;">${text}</span>
      ${ref ? `<span style="display:block; white-space:nowrap;">${ref}</span>` : ''}
    </span>
  `;
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

function generatePrintHtmlKotak(record: any): string {
  const txs = record.transactions || [];

  // Resolve customer details
  const customer = record.customerDetails ? {
    accountHolderName: record.customerDetails.accountHolderName,
    email: record.customerDetails.email,
    address: record.customerDetails.address,
    accountNumber: record.customerDetails.accountNumber,
    cifNumber: record.customerDetails.cifNumber,
    nomineeName: record.customerDetails.nomineeName || 'N/A',
    accountOpenDate: record.customerDetails.accountOpenDate,
  } : {
    accountHolderName: record.holderName || 'Valued Customer',
    email: record.config?.email || '',
    address: record.config?.address || '',
    accountNumber: record.accountNumber || '',
    cifNumber: record.config?.cifNo || '',
    nomineeName: 'N/A',
    accountOpenDate: '',
  };

  const branch = record.branchDetails ? {
    branchName: record.branchDetails.branchName,
    branchAddress: record.branchDetails.branchAddress,
    ifscCode: record.branchDetails.ifscCode,
    branchCode: record.branchDetails.branchCode,
    micrCode: record.branchDetails.micrCode,
    ckycrNumber: record.branchDetails.ckycrNumber,
    branchPhone: record.branchDetails.branchPhone,
    branchEmail: record.branchDetails.branchEmail,
  } : {
    branchName: 'MAIN BRANCH',
    branchAddress: '',
    ifscCode: 'KKBK0000001',
    branchCode: '0001',
    micrCode: '',
    ckycrNumber: '',
    branchPhone: '',
    branchEmail: '',
  };

  const accountInfo = record.accountInfo || { openingBalance: record.openingBalance || 0, interestRate: 3.5, accountType: 'Savings' };
  const openingBalance = accountInfo.openingBalance;
  const closingBalance = record.closingBalance || 0;
  const totalCredits = record.totalCredits || 0;
  const totalDebits = record.totalDebits || 0;
  const drCount = txs.filter((tx: any) => tx.debit > 0).length;
  const crCount = txs.filter((tx: any) => tx.credit > 0).length;

  // Date range
  let startDateStr = '--';
  let endDateStr = '--';
  if (txs.length > 0) {
    startDateStr = formatKotakDate(txs[0].valueDate);
    endDateStr = formatKotakDate(txs[txs.length - 1].valueDate);
  }

  // Paginate: first page 10 rows, subsequent 22 rows
  const paginateKotakTxs = (transactions: any[]): any[][] => {
    const pages: any[][] = [];
    if (transactions.length === 0) return [[]];
    pages.push(transactions.slice(0, 10));
    let i = 10;
    while (i < transactions.length) {
      pages.push(transactions.slice(i, i + 22));
      i += 22;
    }
    return pages;
  };

  const pages = paginateKotakTxs(txs);

  const pagesHtml = pages.map((pageTxs, pIndex) => {
    const pNum = pIndex + 1;
    const isFirstPage = pNum === 1;
    const isLastPage = pNum === pages.length;
    let broughtFwd = openingBalance;
    if (!isFirstPage && pIndex > 0) {
      const prev = pages[pIndex - 1];
      if (prev.length > 0) broughtFwd = prev[prev.length - 1].balance;
    }

    const rowsHtml = pageTxs.map((tx: any, txIdx: number) => {
      const debitTxt = tx.debit ? tx.debit.toLocaleString('en-IN', { minimumFractionDigits: 2 }) : '';
      const creditTxt = tx.credit ? tx.credit.toLocaleString('en-IN', { minimumFractionDigits: 2 }) : '';
      const balTxt = tx.balance.toLocaleString('en-IN', { minimumFractionDigits: 2 });
      const serialNo = txs.indexOf(tx) + 1;
      const borderStyle = (serialNo % 3 === 2)
        ? 'border-bottom:1.2px solid #d1d5db;'
        : 'border-bottom:0.5px solid #d1d5db;';

      return `
        <tr style="background:#ffffff;">
          <td style="padding:6px 8px; text-align:left; font-family:Arial,Helvetica,sans-serif; font-size:10px; color:#111827; width:6%; ${borderStyle}">${serialNo}</td>
          <td style="padding:6px 8px; text-align:left; font-family:Arial,Helvetica,sans-serif; font-size:10px; white-space:nowrap; color:#111827; width:12%; ${borderStyle}">${formatKotakDate(tx.valueDate)}</td>
          <td style="padding:6px 8px; text-align:left; font-family:Arial,Helvetica,sans-serif; font-size:10px; line-height:1.35; color:#111827; width:35%; word-wrap:break-word; white-space:normal; ${borderStyle}">${(tx.details || '').toUpperCase()}</td>
          <td style="padding:6px 8px; text-align:left; font-family:Arial,Helvetica,sans-serif; font-size:10px; color:#111827; width:17%; word-wrap:break-word; white-space:normal; ${borderStyle}">${tx.refNo || ''}</td>
          <td style="padding:6px 8px; text-align:right; font-family:Arial,Helvetica,sans-serif; font-size:10px; color:#111827; width:10%; ${borderStyle}">${debitTxt}</td>
          <td style="padding:6px 8px; text-align:right; font-family:Arial,Helvetica,sans-serif; font-size:10px; color:#111827; width:10%; ${borderStyle}">${creditTxt}</td>
          <td style="padding:6px 8px; text-align:right; font-family:Arial,Helvetica,sans-serif; font-size:10px; color:#111827; width:10%; ${borderStyle}">${balTxt}</td>
        </tr>
      `;
    }).join('');

    const bfRow = !isFirstPage ? `
      <tr style="background:#ffffff;">
        <td style="padding:6px 8px; text-align:left; font-family:Arial,Helvetica,sans-serif; font-size:10px; color:#111827; border-bottom:0.5px solid #d1d5db;"></td>
        <td style="padding:6px 8px; text-align:left; font-family:Arial,Helvetica,sans-serif; font-size:10px; white-space:nowrap; color:#111827; border-bottom:0.5px solid #d1d5db;">${formatKotakDate(pageTxs[0]?.valueDate || '')}</td>
        <td style="padding:6px 8px; font-weight:normal; font-family:Arial,Helvetica,sans-serif; color:#111827; font-size:10px; border-bottom:0.5px solid #d1d5db;" colspan="2">Balance brought forward from page ${pIndex}</td>
        <td style="padding:6px 8px; text-align:right; font-family:Arial,Helvetica,sans-serif; color:#111827; font-size:10px; border-bottom:0.5px solid #d1d5db;"></td>
        <td style="padding:6px 8px; text-align:right; font-family:Arial,Helvetica,sans-serif; color:#111827; font-size:10px; border-bottom:0.5px solid #d1d5db;"></td>
        <td style="padding:6px 8px; text-align:right; font-family:Arial,Helvetica,sans-serif; font-size:10px; color:#111827; border-bottom:0.5px solid #d1d5db;">${broughtFwd.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
      </tr>
    ` : '';

    const firstPageHeader = isFirstPage ? `
      <!-- Statement period bar -->
      <div style="background:#f9f9f9; border-bottom:1px solid #e5e7eb; padding:5px 10mm; display:flex; justify-content:space-between; align-items:center; font-size:9.5px; color:#374151; box-sizing:border-box;">
        <span>Statement Period: <strong>${startDateStr}</strong> to <strong>${endDateStr}</strong></span>
        <span style="font-family:monospace; color:#6b7280;">Ref: KKBK-${(record.id || '').substring(5, 13).toUpperCase()}</span>
      </div>

      <!-- Two-column metadata -->
      <div style="display:grid; grid-template-columns:1fr 1fr; gap:0; border-bottom:1px solid #e5e7eb; margin:0 10mm; box-sizing:border-box;">
        <div style="padding:10px 12px 10px 0; border-right:1px solid #e5e7eb;">
          <div style="font-size:8px; font-weight:700; color:#ED1C24; text-transform:uppercase; letter-spacing:0.06em; margin-bottom:6px;">Customer Details</div>
          <div style="font-size:11px; font-weight:700; color:#111827; margin-bottom:3px;">${customer.accountHolderName}</div>
          <div style="font-size:9.5px; color:#4b5563; line-height:1.5; white-space:pre-line; margin-bottom:4px;">${customer.address}</div>
          <div style="font-size:9px; color:#6b7280;">Email: <span style="color:#111827;">${customer.email}</span></div>
        </div>
        <div style="padding:10px 0 10px 12px;">
          <div style="font-size:8px; font-weight:700; color:#ED1C24; text-transform:uppercase; letter-spacing:0.06em; margin-bottom:6px;">Account Details</div>
          <table style="font-size:9.5px; border:none; border-collapse:collapse; width:100%;">
            <tr><td style="color:#6b7280; padding:1px 6px 1px 0; white-space:nowrap;">Account No.:</td><td style="color:#111827; font-weight:700; font-family:monospace; letter-spacing:0.05em;">${customer.accountNumber}</td></tr>
            <tr><td style="color:#6b7280; padding:1px 6px 1px 0;">Account Type:</td><td style="color:#111827; font-weight:700;">${accountInfo.accountType || 'Savings'} Account</td></tr>
            <tr><td style="color:#6b7280; padding:1px 6px 1px 0;">CIF No.:</td><td style="color:#111827; font-weight:700; font-family:monospace;">${customer.cifNumber}</td></tr>
            <tr><td style="color:#6b7280; padding:1px 6px 1px 0;">IFSC Code:</td><td style="color:#111827; font-weight:700;">${branch.ifscCode}</td></tr>
            <tr><td style="color:#6b7280; padding:1px 6px 1px 0;">Branch:</td><td style="color:#111827; font-weight:700;">${branch.branchName}</td></tr>
            <tr><td style="color:#6b7280; padding:1px 6px 1px 0;">MICR Code:</td><td style="color:#111827; font-weight:700; font-family:monospace;">${branch.micrCode}</td></tr>
            <tr><td style="color:#6b7280; padding:1px 6px 1px 0;">Open Date:</td><td style="color:#111827; font-weight:700;">${customer.accountOpenDate}</td></tr>
            <tr><td style="color:#6b7280; padding:1px 6px 1px 0;">Nominee:</td><td style="color:#111827; font-weight:700;">${customer.nomineeName}</td></tr>
            <tr><td style="color:#6b7280; padding:1px 6px 1px 0;">Interest Rate:</td><td style="color:#111827; font-weight:700;">${accountInfo.interestRate?.toFixed(2) || '3.50'}% p.a.</td></tr>
            <tr><td style="color:#6b7280; padding:1px 6px 1px 0;">Currency:</td><td style="color:#111827; font-weight:700;">INR</td></tr>
          </table>
        </div>
      </div>

      <!-- Balance summary dark strip -->
      <div style="display:grid; grid-template-columns:repeat(3, 1fr); background:#1c1c1c; margin:0 10mm; padding:6px 12px; box-sizing:border-box;">
        <div style="text-align:center; border-right:1px solid #333; padding:4px 0;">
          <div style="font-size:7.5px; color:#9ca3af; text-transform:uppercase; letter-spacing:0.05em;">Opening Balance</div>
          <div style="font-size:11px; font-weight:700; color:#ffffff; font-family:monospace; margin-top:2px;">&#8377;${openingBalance.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</div>
        </div>
        <div style="text-align:center; border-right:1px solid #333; padding:4px 0;">
          <div style="font-size:7.5px; color:#9ca3af; text-transform:uppercase; letter-spacing:0.05em;">Closing Balance</div>
          <div style="font-size:11px; font-weight:700; color:#4ade80; font-family:monospace; margin-top:2px;">&#8377;${closingBalance.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</div>
        </div>
        <div style="text-align:center; padding:4px 0;">
          <div style="font-size:7.5px; color:#9ca3af; text-transform:uppercase; letter-spacing:0.05em;">Account Status</div>
          <div style="font-size:11px; font-weight:700; color:#ED1C24; margin-top:2px; letter-spacing:0.06em;">ACTIVE</div>
        </div>
      </div>
    ` : '';

    const continuationHeader = !isFirstPage ? `
      <div style="padding:15px 10mm 10px 10mm; display:flex; flex-direction:column; align-items:flex-start; font-family:Arial,Helvetica,sans-serif; font-size:13px; line-height:1.4; color:#000000; box-sizing:border-box; width:100%;">
        <div style="font-weight:normal; font-size:16px; text-transform:uppercase; margin-bottom:4px; color:#111827;">
          ${customer.accountHolderName}
        </div>
        <div style="color:#111827;">
          <span style="color:#8c8c8c;">Account No. </span>
          <span style="font-weight:600;">${customer.accountNumber}</span>
        </div>
        <div style="color:#111827;">
          <span style="color:#8c8c8c;">Account Statement </span>
          <span style="font-weight:600;">
            ${formatKotakDate(txs[0]?.valueDate)} - ${formatKotakDate(txs[txs.length - 1]?.valueDate)}
          </span>
        </div>
      </div>
    ` : '';

    const summaryHtml = isLastPage ? `
      <div style="padding:0 10mm; margin-top:20px; box-sizing:border-box;">
        <div style="border:1px solid #d1d5db; border-radius:4px; overflow:hidden; font-family:Arial,Helvetica,sans-serif;">
          <div style="background:#ED1C24; color:#ffffff; padding:8px 12px; font-size:14px; font-weight:400; text-align:center;">
            Account Summary
          </div>
          <table style="width:100%; border-collapse:collapse; font-size:13px; text-align:left; border:none;">
            <thead>
              <tr style="background:#A8A8A8; color:#ffffff; font-weight:400; height:36px; user-select:none;">
                <th style="width:50%; padding:0 12px; text-align:left; vertical-align:middle; border:none; border-right:1px solid #ffffff;">Particulars</th>
                <th style="width:25%; padding:0 12px; text-align:right; vertical-align:middle; border:none; border-right:1px solid #ffffff;">Opening Balance</th>
                <th style="width:25%; padding:0 12px; text-align:right; vertical-align:middle; border:none;">Closing Balance</th>
              </tr>
            </thead>
            <tbody>
              <tr style="background:#ffffff; height:36px; color:#111827; border-bottom:1px solid #d1d5db;">
                <td style="padding:0 12px; text-align:left; vertical-align:middle; border:none;">Savings Account (SA):</td>
                <td style="padding:0 12px; text-align:right; vertical-align:middle; border:none;">${openingBalance.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                <td style="padding:0 12px; text-align:right; vertical-align:middle; border:none;">${closingBalance.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
              </tr>
            </tbody>
          </table>
        </div>
        <div style="margin-top:40px; font-family:Arial,Helvetica,sans-serif; text-align:center; color:#111827; font-size:11px; line-height:1.6; user-select:none; width:100%;">
          <div style="font-size:14px; margin-bottom:8px; color:#000000;">End of Statement</div>
          <div>Any discrepancy in the statement should be brought to the notice of Kotak Mahindra Bank Ltd. within</div>
          <div style="margin-bottom:6px;">one month from the date of receipt of the statement.</div>
          <div>This is a system generated report and does not require signature and stamp.</div>
        </div>
      </div>
    ` : '';

    return `
      <div class="doc-card" style="box-sizing:border-box; width:210mm; min-width:210mm; max-width:210mm; height:297mm; min-height:297mm; max-height:297mm; background:#fff; margin:0 auto 30px auto; position:relative; overflow:hidden; display:flex; flex-direction:column; justify-content:space-between; font-family:Arial,Helvetica,sans-serif;">
        <div style="display:flex; flex-direction:column; width:100%;">
          ${isFirstPage ? `
            <!-- Kotak Red Header -->
            <div style="background:#ED1C24; padding:10px 10mm; display:flex; align-items:center; justify-content:space-between; box-sizing:border-box; width:100%;">
              <div style="display:flex; align-items:baseline; gap:6px;">
                <span style="font-size:34px; font-weight:900; color:#ffffff; letter-spacing:-1px; line-height:1; font-style:italic;">kotak</span>
                <span style="font-size:13px; font-weight:400; color:rgba(255,255,255,0.85); letter-spacing:0.02em;">Mahindra Bank</span>
              </div>
              <div style="text-align:right; color:#ffffff;">
                <div style="font-size:12px; font-weight:700; letter-spacing:0.06em; text-transform:uppercase;">Account Statement</div>
                <div style="font-size:9px; margin-top:2px; opacity:0.85;">As on ${getTodayDateStr()}</div>
              </div>
            </div>
            ${firstPageHeader}
          ` : continuationHeader}

          <!-- Transaction Table -->
          <div style="padding:8px 10mm 0 10mm; width:100%; box-sizing:border-box;">
            <table style="width:100%; table-layout:fixed; border-collapse:collapse; border:none; font-family:Arial,Helvetica,sans-serif; border-top:1px solid #d1d5db; border-bottom:1px solid #d1d5db;">
              <thead>
                <tr style="background:#A8A8A8; color:#ffffff; font-size:13px; font-weight:400; height:42px; user-select:none;">
                  <th style="width:6%; padding:0 4px 0 12px; text-align:left; vertical-align:middle; border:none; border-right:1px solid #ffffff;">#</th>
                  <th style="width:12%; padding:0 4px 0 12px; text-align:left; vertical-align:middle; border:none; border-right:1px solid #ffffff;">Date</th>
                  <th style="width:35%; padding:0 4px 0 12px; text-align:left; vertical-align:middle; border:none; border-right:1px solid #ffffff;">Description</th>
                  <th style="width:17%; padding:0 4px 0 12px; text-align:left; vertical-align:middle; border:none; border-right:1px solid #ffffff;">Chq/Ref. No.</th>
                  <th style="width:10%; padding:0 4px 0 12px; text-align:left; vertical-align:middle; border:none; border-right:1px solid #ffffff;">Withdrawal (Dr.)</th>
                  <th style="width:10%; padding:0 4px 0 12px; text-align:left; vertical-align:middle; border:none; border-right:1px solid #ffffff;">Deposit (Cr.)</th>
                  <th style="width:10%; padding:0 4px 0 12px; text-align:left; vertical-align:middle; border:none;">Balance</th>
                </tr>
              </thead>
              <tbody style="background:#ffffff;">
                ${bfRow}
                ${rowsHtml}
              </tbody>
            </table>
          </div>

          ${summaryHtml}
        </div>

        <!-- Kotak red footer -->
        <div style="background:#ED1C24; color:#fff; font-size:8.5px; font-family:Arial,Helvetica,sans-serif; padding:5px 10mm; display:flex; align-items:center; justify-content:space-between;">
          <span style="font-style:italic; font-weight:700; letter-spacing:-0.3px;">kotak</span>
          <span style="opacity:0.85;">This is a system-generated statement. | Kotak Mahindra Bank Ltd.</span>
          <span style="font-family:monospace; background:rgba(255,255,255,0.15); padding:1px 8px; border-radius:3px;">Page ${pNum} of ${pages.length}</span>
        </div>
      </div>
    `;
  }).join('');

  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <title>Kotak Mahindra Bank Statement - ${customer.accountHolderName}</title>
      <style>
        @page { size: A4 portrait; margin: 0; }
        html, body { background: #ffffff !important; color: #000 !important; padding: 0 !important; margin: 0 !important; font-family: Arial, Helvetica, sans-serif !important; width: 100%; }
        .doc-card { page-break-after: always !important; break-after: page !important; }
        .doc-card:last-of-type { page-break-after: avoid !important; break-after: avoid !important; }
        table { width: 100%; border-collapse: collapse; }
        th, td { box-sizing: border-box; }
      </style>
    </head>
    <body style="background:#ffffff; margin:0; padding:0;">
      ${pagesHtml}
    </body>
    </html>
  `;
}


export function generatePrintHtml(record: any): string {
  // Determine date ranges and variables dynamically
  let startDateStr = '01-12-2025';
  let endDateStr = '31-05-2026';
  let acctOpenDate = '09/05/2022';

  const txs = record.transactions || [];

  if (txs && txs.length > 0) {
    const parseDate = (dStr: string) => {
      const parts = dStr.split(/[-/]/);
      if (parts.length === 3) {
        const d = parseInt(parts[0], 10);
        const m = parseInt(parts[1], 10) - 1;
        const y = parseInt(parts[2], 10);
        return new Date(y, m, d);
      }
      return new Date();
    };

    const sortedTx = [...txs].sort((a, b) => {
      return parseDate(a.valueDate).getTime() - parseDate(b.valueDate).getTime();
    });

    if (sortedTx.length > 0) {
      startDateStr = sortedTx[0].valueDate.replace(/\//g, '-');
      endDateStr = sortedTx[sortedTx.length - 1].valueDate.replace(/\//g, '-');
      const sDate = parseDate(sortedTx[0].valueDate);
      const openDate = new Date(sDate.getTime() - 4 * 365 * 24 * 60 * 60 * 1000);
      const pad = (n: number) => String(n).padStart(2, '0');
      acctOpenDate = `${pad(openDate.getDate())}/${pad(openDate.getMonth() + 1)}/${openDate.getFullYear()}`;
    }
  }

  // Handle support check for bank style Kotak
  const isKotak = record.style === 'Kotak' || record.settings?.bankStyle === 'Kotak';
  if (isKotak) {
    return generatePrintHtmlKotak(record);
  }

  // Resolve config and details
  const isCustomRecord = !record.customerDetails;
  const customer = isCustomRecord ? {
    accountHolderName: record.holderName,
    email: record.config?.email || `${record.holderName.toLowerCase().replace(/\s+/g, '')}@gmail.com`,
    address: record.config?.address || '',
    accountNumber: record.accountNumber || '',
    cifNumber: record.config?.cifNo || '',
    nomineeName: record.config?.nomination === 'Yes' ? 'XXXXXXXXXX' : 'NONE',
    accountOpenDate: acctOpenDate
  } : {
    accountHolderName: record.customerDetails.accountHolderName,
    email: record.customerDetails.email,
    address: record.customerDetails.address,
    accountNumber: record.customerDetails.accountNumber,
    cifNumber: record.customerDetails.cifNumber,
    nomineeName: record.customerDetails.nomineeName || 'XXXXXXXXXX',
    accountOpenDate: record.customerDetails.accountOpenDate
  };

  const branchCode = isCustomRecord 
    ? (record.config?.ifscCode ? record.config?.ifscCode.substring(record.config?.ifscCode.length - 5) : '00623')
    : record.branchDetails.branchCode;
  
  const branch = isCustomRecord ? {
    branchName: record.config?.branchName || 'Pachore',
    branchAddress: `A.B. ROAD, ${record.config?.branchName || 'Pachore'}, MADHYA PRADESH - 465683`,
    branchCode: branchCode,
    branchEmail: `sbi.${branchCode}@sbi.co.in`,
    branchPhone: '07371-236041',
    ifscCode: record.config?.ifscCode || 'SBIN0000623',
    micrCode: record.config?.micrCode || '465002512',
    ckycrNumber: record.config?.ckycrNumber || '50046100545797'
  } : {
    branchName: record.branchDetails.branchName,
    branchAddress: record.branchDetails.branchAddress,
    branchCode: record.branchDetails.branchCode,
    branchEmail: record.branchDetails.branchEmail,
    branchPhone: record.branchDetails.branchPhone,
    ifscCode: record.branchDetails.ifscCode,
    micrCode: record.branchDetails.micrCode,
    ckycrNumber: record.branchDetails.ckycrNumber
  };

  const interestRate = isCustomRecord 
    ? (record.config?.interestRate || 2.70) 
    : record.accountInfo.interestRate;

  const accountType = isCustomRecord
    ? 'Savings'
    : (record.accountInfo?.accountType || 'Savings');

  const openingBalance = isCustomRecord ? record.openingBalance : record.accountInfo.openingBalance;
  const closingBalance = isCustomRecord ? record.closingBalance : record.closingBalance;
  const totalCredits = isCustomRecord ? record.totalCredits : record.totalCredits;
  const totalDebits = isCustomRecord ? record.totalDebits : record.totalDebits;

  const drCount = txs.filter((tx: any) => tx.debit > 0).length;
  const crCount = txs.filter((tx: any) => tx.credit > 0).length;

  const paginateSbiTransactions = (
    transactions: any[],
    opBalance: number
  ): any[][] => {
    // Exact division calculations to avoid page breaking
    const pagesList: any[][] = [];
    const firstPageLimit = 6;
    const subsequentPageLimit = 21;

    if (transactions.length === 0) return [[]];

    pagesList.push(transactions.slice(0, firstPageLimit));

    let index = firstPageLimit;
    while (index < transactions.length) {
      pagesList.push(transactions.slice(index, index + subsequentPageLimit));
      index += subsequentPageLimit;
    }

    return pagesList;
  };

  const pages = paginateSbiTransactions(txs, openingBalance);

  const pagesHtml = pages.map((pageTransactions, pIndex) => {
    const pNum = pIndex + 1;
    const isFirstPage = pNum === 1;
    const isLastPage = pNum === pages.length;

    // Resolve brought forward balance
    let broughtForwardVal = openingBalance;
    if (!isFirstPage && pIndex > 0) {
      // Balance is running sum, find the balance of transaction immediately before current page's first transaction
      const prevPageTxs = pages[pIndex - 1];
      if (prevPageTxs.length > 0) {
        broughtForwardVal = prevPageTxs[prevPageTxs.length - 1].balance;
      }
    }

    const maybeOpeningRow = isFirstPage ? `
        <tr style="height:auto; border-bottom:1px solid #d1d5db;">
          <td style="font-size:11px; line-height:14px; border:1px solid #d1d5db; padding:6px; text-align:center; width:9%; white-space:nowrap;">-</td>
          <td style="font-size:11px; line-height:14px; border:1px solid #d1d5db; padding:6px; text-align:center; width:9%; white-space:nowrap;">-</td>
          <td style="font-size:11px; line-height:14px; font-weight:bold; color:#111827; border:1px solid #d1d5db; padding:6px; text-align:left; width:33%;">OPENING BALANCE</td>
          <td style="font-size:11px; line-height:14px; border:1px solid #d1d5db; padding:6px; text-align:center; width:12%;">-</td>
          <td style="font-size:11px; line-height:14px; border:1px solid #d1d5db; padding:6px; text-align:right; width:12%; padding-right:8px;">-</td>
          <td style="font-size:11px; line-height:14px; border:1px solid #d1d5db; padding:6px; text-align:right; width:12%; padding-right:8px;">-</td>
          <td style="font-size:11px; line-height:14px; border:1px solid #d1d5db; padding:6px; text-align:right; color:#111827; font-weight:bold; width:13%; padding-right:8px;">${openingBalance.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
        </tr>
    ` : `
        <tr style="height:auto; border-bottom:1px solid #d1d5db; background-color:#f9fafb;">
          <td style="font-size:11px; line-height:14px; border:1px solid #d1d5db; padding:6px; text-align:center; width:9%; white-space:nowrap;">${pageTransactions[0]?.valueDate || startDateStr}</td>
          <td style="font-size:11px; line-height:14px; border:1px solid #d1d5db; padding:6px; text-align:center; width:9%; white-space:nowrap;">-</td>
          <td style="font-size:11px; line-height:14px; font-weight:bold; color:#111827; border:1px solid #d1d5db; padding:6px; text-align:left; width:33%;">Brought Forward balance from sheet page ${pIndex}</td>
          <td style="font-size:11px; line-height:14px; border:1px solid #d1d5db; padding:6px; text-align:center; width:12;">-</td>
          <td style="font-size:11px; line-height:14px; border:1px solid #d1d5db; padding:6px; text-align:right; width:12%; padding-right:8px;">-</td>
          <td style="font-size:11px; line-height:14px; border:1px solid #d1d5db; padding:6px; text-align:right; width:12%; padding-right:8px;">-</td>
          <td style="font-size:11px; line-height:14px; border:1px solid #d1d5db; padding:6px; text-align:right; color:#111827; font-weight:bold; width:13%; padding-right:8px;">${broughtForwardVal.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
        </tr>
    `;

    const rowsHtmlOfPage = pageTransactions.map((tx: any) => {
      const debitText = tx.debit ? tx.debit.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '-';
      const creditText = tx.credit ? tx.credit.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '-';
      const balText = tx.balance.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

      return `
        <tr style="height:auto; border-bottom:1px solid #d1d5db;">
          <td style="font-size:11px; line-height:14px; border:1px solid #d1d5db; padding:5px 6px; text-align:center; white-space:nowrap; width:9%;">${tx.valueDate}</td>
          <td style="font-size:11px; line-height:14px; border:1px solid #d1d5db; padding:5px 6px; text-align:center; white-space:nowrap; width:9%;">${tx.postDate}</td>
          <td style="font-size:11px; line-height:14px; border:1px solid #d1d5db; padding:5px 6px; text-align:left; word-break:break-word; overflow-wrap:anywhere; width:33%;">
            <div>${formatDetails(tx.details, tx.refNo)}</div>
          </td>
          <td style="border:1px solid #d1d5db; padding:5px 6px; text-align:center; width:12%;">-</td>
          <td style="font-size:11px; line-height:14px; font-weight:400; color:#111827; border:1px solid #d1d5db; padding:5px 6px; text-align:right; white-space:nowrap; width:12%; padding-right:8px;">${debitText}</td>
          <td style="font-size:11px; line-height:14px; font-weight:400; color:#111827; border:1px solid #d1d5db; padding:5px 6px; text-align:right; white-space:nowrap; width:12%; padding-right:8px;">${creditText}</td>
          <td style="font-size:11px; line-height:14px; font-weight:500; color:#111827; border:1px solid #d1d5db; padding:5px 6px; text-align:right; white-space:nowrap; width:13%; padding-right:8px;">${balText}</td>
        </tr>
      `;
    }).join('');

    const footerBarRow = `
      <tr style="height:25px; background-color:#5553AA;">
        <td colspan="7" style="height:25px; padding:0; border:none; background-color:#5553AA;"></td>
      </tr>
    `;

    let headerHtml = '';
    let contentWrapperStyle = 'padding: 0;';
    if (isFirstPage) {
      headerHtml = `
        <div style="height:70px; background:#5553AA; display:flex; align-items:center; justify-content:space-between; padding:0 15mm; width:100%; box-sizing:border-box; margin:0;">
          <div style="display:flex; align-items:center; gap:8px;">
            <svg style="width:40px; height:40px; color:#ffffff; fill:currentColor; flex-shrink:0;" viewBox="0 0 100 100">
              <circle cx="50" cy="50" r="40" stroke="currentColor" stroke-width="8" fill="none"></circle>
              <circle cx="50" cy="50" r="16"></circle>
              <rect x="46" y="50" width="8" height="42" fill="currentColor"></rect>
            </svg>
            <div style="display:flex; align-items:baseline; gap:8px;">
              <span style="font-size:52px; font-weight:bold; line-height:1; color:#ffffff;">SBI</span>
              <span style="font-size:18px; font-weight:400; color:#ffffff; white-space:nowrap;">Account Summary</span>
            </div>
          </div>
          <div style="display:flex; align-items:center; background-color:rgba(255, 255, 255, 0.1); border:1px solid rgba(255, 255, 255, 0.4); border-radius:4px; padding:3px 10px; color:#ffffff; fontSize:12px;">
            <span>As on ${getTodayDateStr()}</span>
          </div>
          <div style="text-align:right; color:#ffffff; font-size:12px; line-height:1.2;">
            <div style="opacity:0.8; font-size:10px;">Welcome:</div>
            <div style="font-weight:bold;">${customer.accountHolderName}</div>
          </div>
        </div>
      `;
    } else {
      headerHtml = `
        <div style="height:35px; width:100%;"></div>
      `;
    }

    return `
      <div class="doc-card" style="box-sizing:border-box; width:210mm; min-width:210mm; max-width:210mm; height:297mm; min-height:297mm; max-height:297mm; background-color:#ffffff; margin:0 auto 30px auto; position:relative; overflow:hidden; display:flex; flex-direction:column; justify-content:space-between;">
        <div style="display:flex; flex-direction:column; width:100%;">
          ${headerHtml}
          
          <div style="padding:0; box-sizing:border-box; width:100%;">
            ${isFirstPage ? `
              <!-- Statement Title -->
              <div style="padding: 0 15mm;">
                <div style="text-align:center; margin-top:12px; margin-bottom:12px; border-bottom:2px solid #d1d5db; padding-bottom:8px;">
                  <h1 style="font-family:Arial, Helvetica, sans-serif; font-size:20px; font-weight:400; text-transform:uppercase; margin:0; letter-spacing:0.1em; color:#111827;">
                    STATEMENT OF ACCOUNT
                  </h1>
                </div>

                <!-- Two-Column Metadata Section -->
                <div style="display:grid; grid-template-columns:1fr 1fr; gap:35px; box-sizing:border-box; margin-bottom:12px;">
                  
                  <!-- Left Column: Customer Details -->
                  <div style="display:flex; flex-direction:column; gap:8px;">
                    
                    <div style="display:grid; grid-template-columns:32px 1fr; gap:8px; align-items:center;">
                      <div style="display:flex; align-items:center; justify-content:center; color:#6B2FB3; border-right:1.2px solid #6B2FB3; height:22px;">
                        <svg style="width:22px; height:22px;" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">
                          <circle cx="12" cy="8" r="4" />
                          <path d="M5.5 21a8.5 8.5 0 0113 0" />
                        </svg>
                      </div>
                      <div style="font-size:15px; font-weight:400; line-height:18px; color:#111827;">
                        ${customer.accountHolderName}
                      </div>
                    </div>

                    <div style="display:grid; grid-template-columns:32px 1fr; gap:8px; align-items:center;">
                      <div style="display:flex; align-items:center; justify-content:center; color:#6B2FB3; border-right:1.2px solid #6B2FB3; height:22px;">
                        <svg style="width:22px; height:22px;" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">
                          <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                          <polyline points="22,6 12,13 2,6" />
                        </svg>
                      </div>
                      <div style="font-size:15px; font-weight:400; line-height:18px; color:#111827;">
                        ${customer.email}
                      </div>
                    </div>

                    <div style="display:grid; grid-template-columns:32px 1fr; gap:8px; align-items:stretch; padding:16px 0;">
                      <div style="display:flex; align-items:center; justify-content:center; color:#6B2FB3; border-right:1.2px solid #6B2FB3; height:100%; min-height:44px;">
                        <svg style="width:22px; height:22px;" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">
                          <path d="M12 2a8 8 0 00-8 8c0 5.25 8 12 8 12s8-6.75 8-12a8 8 0 00-8-8z" />
                          <circle cx="12" cy="10" r="3" />
                        </svg>
                      </div>
                      <div style="font-size:14px; font-weight:400; line-height:16px; color:#111827; white-space:pre-wrap; margin-top:4px;">
                        ${customer.address}
                      </div>
                    </div>

                    <div style="display:grid; grid-template-columns:32px 1fr; gap:8px; align-items:start;">
                      <div style="border-right:1.2px solid #6B2FB3; height:100%; min-height:140px;"></div>
                      <div style="display:flex; flex-direction:column; gap:4px;">
                        <div style="font-size:15px; font-weight:400; line-height:18px; color:#111827;">Date Of Statement : &nbsp;${endDateStr}</div>
                        <div style="font-size:15px; font-weight:400; line-height:18px; color:#111827;">Clear Balance : &nbsp;$90000.00CR</div>
                        <div style="font-size:15px; font-weight:400; line-height:18px; color:#111827;">Uncleared Amount : &nbsp;0.00</div>
                        <div style="font-size:15px; font-weight:400; line-height:18px; color:#111827;">+MOD Bal : &nbsp;0.00</div>
                        <div style="font-size:15px; font-weight:400; line-height:18px; color:#111827;">Lien : &nbsp;0.00</div>
                        <div style="font-size:15px; font-weight:400; line-height:18px; color:#111827;">Limit : &nbsp;0.00</div>
                        <div style="font-size:15px; font-weight:400; line-height:18px; color:#111827;">Monthly Average Balance : &nbsp;0.00</div>
                        <div style="font-size:15px; font-weight:400; line-height:18px; color:#111827;">${interestRate.toFixed(2)} % p.a. : &nbsp;0.00</div>
                        <div style="font-size:15px; font-weight:400; line-height:18px; color:#111827;">Drawing Power Balance : &nbsp;0.00</div>
                      </div>
                    </div>

                    <div style="display:grid; grid-template-columns:32px 1fr; gap:8px; align-items:center;">
                      <div style="display:flex; align-items:center; justify-content:center; color:#6B2FB3; border-right:1.2px solid #6B2FB3; height:22px;">
                        <svg style="width:22px; height:22px;" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">
                          <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                          <line x1="16" y1="2" x2="16" y2="6" />
                          <line x1="8" y1="2" x2="8" y2="6" />
                          <line x1="3" y1="10" x2="21" y2="10" />
                        </svg>
                      </div>
                      <div style="font-size:15px; font-weight:400; line-height:18px; color:#111827;">
                        Account Open Date : &nbsp;${customer.accountOpenDate}
                      </div>
                    </div>

                  </div>

                  <!-- Right Column: Bank Details -->
                  <div style="display:flex; flex-direction:column; gap:8px;">
                    
                    <div style="display:flex; flex-direction:column; padding-left:40px; margin-bottom:4px;">
                      <div style="color:#00AEEF; font-size:18px; font-weight:400;">State Bank of India</div>
                      <div style="color:#000000; font-size:15px; font-weight:400; margin-top:2px;">
                        ${branch.branchName}
                      </div>
                    </div>

                    <div style="display:grid; grid-template-columns:32px 1fr; gap:8px; align-items:stretch; padding:16px 0;">
                      <div style="display:flex; align-items:center; justify-content:center; color:#6B2FB3; border-right:1.2px solid #6B2FB3; height:100%; min-height:44px;">
                        <svg style="width:22px; height:22px;" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">
                          <path d="M12 2a8 8 0 00-8 8c0 5.25 8 12 8 12s8-6.75 8-12a8 8 0 00-8-8z" />
                          <circle cx="12" cy="10" r="3" />
                        </svg>
                      </div>
                      <div style="font-size:14px; font-weight:400; line-height:16px; color:#111827; white-space:pre-wrap; margin-top:4px;">
                        ${branch.branchAddress}
                      </div>
                    </div>

                    <div style="display:grid; grid-template-columns:32px 1fr; gap:8px; align-items:start;">
                      <div style="border-right:1.2px solid #6B2FB3; height:100%; min-height:190px;"></div>
                      <div style="display:flex; flex-direction:column; gap:4px;">
                        <div style="font-size:15px; font-weight:400; line-height:18px; color:#111827;">Branch Code : &nbsp;${branch.branchCode}</div>
                        <div style="font-size:15px; font-weight:400; line-height:18px; color:#111827;">Branch Name : &nbsp;${branch.branchName}</div>
                        <div style="font-size:15px; font-weight:400; line-height:18px; color:#111827;">Branch Email ID : &nbsp;${branch.branchEmail.toUpperCase()}</div>
                        <div style="font-size:15px; font-weight:400; line-height:18px; color:#111827;">Branch Phone : &nbsp;${branch.branchPhone}</div>
                        
                        <div style="height:1px; backgroundColor:#e5e7eb; margin:4px 0;"></div>

                        <div style="font-size:15px; font-weight:400; line-height:18px; color:#111827;">CIF Number : &nbsp;${customer.cifNumber}</div>
                        <div style="font-size:15px; font-weight:400; line-height:18px; color:#111827;">Account Number : &nbsp;${customer.accountNumber}</div>
                        <div style="font-size:15px; font-weight:400; line-height:18px; color:#111827;">Product : &nbsp;${(accountType || '').toUpperCase()}</div>
                        <div style="font-size:15px; font-weight:400; line-height:18px; color:#111827;">IFSC Code : &nbsp;${branch.ifscCode}</div>
                        <div style="font-size:15px; font-weight:400; line-height:18px; color:#111827;">Currency : &nbsp;INR</div>
                        <div style="font-size:15px; font-weight:400; line-height:18px; color:#111827;">Account Status : &nbsp;OPEN</div>
                        <div style="font-size:15px; font-weight:400; line-height:18px; color:#111827;">CKYC Number : &nbsp;${branch.ckycrNumber}</div>
                        <div style="font-size:15px; font-weight:400; line-height:18px; color:#111827;">MICR Code : &nbsp;${branch.micrCode}</div>
                      </div>
                    </div>

                    <div style="display:grid; grid-template-columns:32px 1fr; gap:8px; align-items:center;">
                      <div style="display:flex; align-items:center; justify-content:center; color:#6B2FB3; border-right:1.2px solid #6B2FB3; height:22px;">
                        <svg style="width:22px; height:22px;" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">
                          <circle cx="12" cy="12" r="10" />
                          <line x1="12" y1="8" x2="12" y2="16" />
                          <line x1="8" y1="12" x2="16" y2="12" />
                        </svg>
                      </div>
                      <div style="font-size:15px; font-weight:400; line-height:18px; color:#111827;">
                        Nominee Name : &nbsp;${customer.nomineeName}
                      </div>
                    </div>

                  </div>

                </div>

                <!-- Statement Period Capsule bar -->
                <div style="text-align:center; font-size:12px; font-weight:bold; color:#1f2937; padding:8px 0; background-color:#f9fafb; border:1px solid #e5e7eb; border-radius:4px; margin-bottom:12px;">
                  Statement From : <span style="font-weight:bold;">${startDateStr}</span> to <span style="font-weight:bold;">${endDateStr}</span>
                </div>
              </div>
            ` : ''}

            <!-- Printable Transaction table layout -->
            <div style="padding: 0 15mm; width:100%; box-sizing:border-box;">
              <table style="width:100%; table-layout:fixed; border-collapse:collapse; border:1px solid #d1d5db; font-family:Arial, Helvetica, sans-serif;">
                <thead>
                  <tr style="height:48px; background-color:#5553AA; color:#ffffff;">
                    <th style="width:9%; font-size:12px; font-weight:500; color:#ffffff; border:1px solid #d1d5db; padding:0 6px; text-align:center; box-sizing:border-box;">Value Date</th>
                    <th style="width:9%; font-size:12px; font-weight:500; color:#ffffff; border:1px solid #d1d5db; padding:0 6px; text-align:center; box-sizing:border-box;">Post Date</th>
                    <th style="width:33%; font-size:12px; font-weight:500; color:#ffffff; border:1px solid #d1d5db; padding:0 6px; text-align:left; box-sizing:border-box;">Details</th>
                    <th style="width:12%; font-size:12px; font-weight:500; color:#ffffff; border:1px solid #d1d5db; padding:0 6px; text-align:center; box-sizing:border-box; line-height:1.2;">Ref No/<br>Cheque<br>No</th>
                    <th style="width:12%; font-size:12px; font-weight:500; color:#ffffff; border:1px solid #d1d5db; padding:0 8px; text-align:right; box-sizing:border-box; padding-right:8px;">₹ Debit</th>
                    <th style="width:12%; font-size:12px; font-weight:500; color:#ffffff; border:1px solid #d1d5db; padding:0 8px; text-align:right; box-sizing:border-box; padding-right:8px;">₹ Credit</th>
                    <th style="width:13%; font-size:12px; font-weight:500; color:#ffffff; border:1px solid #d1d5db; padding:0 8px; text-align:right; box-sizing:border-box; padding-right:8px;">Balance</th>
                  </tr>
                </thead>
                <tbody style="background-color:#ffffff;">
                  ${maybeOpeningRow}
                  ${rowsHtmlOfPage}
                  ${footerBarRow}
                </tbody>
              </table>
            </div>

            ${isLastPage ? `
              <!-- Statement Summary section on final page -->
              <div style="padding:0 15mm; margin-top:12px; box-sizing:border-box; width:100%;">
                <div style="border:1px solid #d1d5db; border-radius:4px; overflow:hidden;">
                  <div style="background-color:#5553AA; color:#ffffff; padding:6px 0; text-align:center; font-size:12px; font-weight:bold; text-transform:uppercase;">
                    Statement Summary : ${startDateStr} To ${endDateStr}
                  </div>
                  <table style="width:100%; border-collapse:collapse; text-align:center;">
                    <thead>
                      <tr style="background-color:#f9fafb; font-size:11px; font-weight:bold; color:#374151; text-transform:uppercase;">
                        <th style="padding:8px; border:1px solid #d1d5db; text-align:center; color:#374151; background:none !important; font-weight:bold;">Brought Forward (₹)</th>
                        <th style="padding:8px; border:1px solid #d1d5db; text-align:center; color:#374151; background:none !important; font-weight:bold;">Dr Count</th>
                        <th style="padding:8px; border:1px solid #d1d5db; text-align:center; color:#374151; background:none !important; font-weight:bold;">Cr Count</th>
                        <th style="padding:8px; border:1px solid #d1d5db; text-align:center; color:#374151; background:none !important; font-weight:bold;">Total Debits (₹)</th>
                        <th style="padding:8px; border:1px solid #d1d5db; text-align:center; color:#374151; background:none !important; font-weight:bold;">Total Credits (₹)</th>
                        <th style="padding:8px; border:1px solid #d1d5db; text-align:center; color:#374151; background:none !important; font-weight:bold;">Closing Balance (₹)</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr style="font-size:11px; font-weight:bold; color:#1f2937;">
                        <td style="padding:8px; border:1px solid #d1d5db; font-family:monospace; background-color:#ffffff !important;">${openingBalance.toLocaleString('en-IN', { minimumFractionDigits: 2 })}CR</td>
                        <td style="padding:8px; border:1px solid #d1d5db; font-family:monospace; color:#374151; background-color:#ffffff !important;">${drCount}</td>
                        <td style="padding:8px; border:1px solid #d1d5db; font-family:monospace; color:#374151; background-color:#ffffff !important;">${crCount}</td>
                        <td style="padding:8px; border:1px solid #d1d5db; font-family:monospace; color:#374151; background-color:#ffffff !important;">${totalDebits.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                        <td style="padding:8px; border:1px solid #d1d5db; font-family:monospace; color:#374151; background-color:#ffffff !important;">${totalCredits.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                        <td style="padding:8px; border:1px solid #d1d5db; font-family:monospace; color:#5553AA; font-weight:bold; background-color:#ffffff !important;">${closingBalance.toLocaleString('en-IN', { minimumFractionDigits: 2 })}CR</td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                <!-- Disclaimer warning bullets -->
                <ul style="margin-top:12px; padding-left:0; list-style:none; font-size:11px; color:#4b5563; line-height:1.4;">
                  <li style="display:flex; align-items:start; gap:6px; margin-bottom:4px;">
                    <span style="font-size:12px; line-height:1.2; color:#9ca3af;">•</span>
                    <span>Please do not share your ATM, Debit/Credit Card number, PIN, OTP (One-Time Password), Username or Password with anyone via email, SMS, phone call or any other medium. Bank never asks for such information.</span>
                  </li>
                  <li style="display:flex; align-items:start; gap:6px; margin-bottom:4px;">
                    <span style="font-size:12px; line-height:1.2; color:#9ca3af;">•</span>
                    <span>If your account is operated by a Power of Attorney holder, please review the transactions with extra care.</span>
                  </li>
                  <li style="display:flex; align-items:start; gap:6px; margin-bottom:4px;">
                    <span style="font-size:12px; line-height:1.2; color:#9ca3af;">•</span>
                    <span>This is a computer generated statement and does not require a signature.</span>
                  </li>
                </ul>
              </div>
            ` : ''}
          </div>
        </div>

        <div style="text-align:center; font-family:Arial, Helvetica, sans-serif; font-size:12px; font-weight:400; color:#374151; padding:15px 0;">
          Page no. ${pNum}
        </div>
      </div>
    `;
  }).join('');

  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <title>Statement of Account - ${customer.accountHolderName}</title>
      <style>
        @page {
          size: A4 portrait;
          margin: 0;
        }
        html, body {
          background-color: #ffffff !important;
          color: #000000 !important;
          padding: 0 !important;
          margin: 0 !important;
          font-family: Arial, Helvetica, sans-serif !important;
          width: 100%;
          min-height: 100%;
        }
        .doc-card {
          page-break-after: always !important;
          break-after: page !important;
        }
        .doc-card:last-of-type {
          page-break-after: avoid !important;
          break-after: avoid !important;
        }
        table {
          width: 100%;
          border-collapse: collapse;
          border: 1px solid #d1d5db;
          table-layout: fixed !important;
        }
        th {
          background-color: #5553AA !important;
          color: #ffffff !important;
          border: 1px solid #d1d5db !important;
          font-family: Arial, Helvetica, sans-serif !important;
          font-size: 12px !important;
          font-weight: 500 !important;
          height: 48px !important;
          padding: 0 6px !important;
          box-sizing: border-box !important;
        }
        td {
          border: 1px solid #d1d5db !important;
          vertical-align: middle !important;
          font-family: Arial, Helvetica, sans-serif !important;
          font-size: 11px !important;
          font-weight: normal !important;
          padding: 5px 6px !important;
          box-sizing: border-box !important;
          background-color: #ffffff !important;
          color: #1f2937 !important;
          line-height: 1.25 !important;
        }
      </style>
    </head>
    <body style="background-color:#ffffff; margin:0; padding:0;">
      ${pagesHtml}
    </body>
    </html>
  `;
}
