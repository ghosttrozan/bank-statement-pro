import { StatementRecord, Transaction } from '../types/statement';

// Helper to chunk transactions into pages for clean A4 printing
function chunkTransactions(transactions: Transaction[], firstPageSize = 12, nextPageSize = 26): Transaction[][] {
  const pages: Transaction[][] = [];
  if (transactions.length === 0) return [[]];
  pages.push(transactions.slice(0, firstPageSize));
  let idx = firstPageSize;
  while (idx < transactions.length) {
    pages.push(transactions.slice(idx, idx + nextPageSize));
    idx += nextPageSize;
  }
  return pages;
}

// Format numbers into Indian Rupee formatting (e.g. 1,50,000.00)
function formatCurrency(val: number | null): string {
  if (val === null || val === undefined) return '';
  return val.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function formatAddress4Lines(address: string): string {
  if (!address) return '';
  const parts = address.split(/[\n,]+/).map(s => s.trim()).filter(Boolean);
  if (parts.length === 0) return '';
  if (parts.length <= 4) {
    return parts.join('\n');
  }
  return [parts[0], parts[1], parts[2], parts.slice(3).join(', ')].join('\n');
}


export function renderStatementHtml(record: StatementRecord): string {
  const { customerDetails, branchDetails, accountInfo, settings, transactions, closingBalance, totalCredits, totalDebits, drCount, crCount } = record;
  const bankStyle = settings.bankStyle || 'SBI';

  // If bankStyle is SBI2, render the 100% exact clean SBI2 table layout
  if (bankStyle === 'SBI2') {
    const pages = chunkTransactions(transactions, 15, 26);
    const totalPagesCount = pages.length;

    const sbi2Pages = pages.map((pageTxs, pageIdx) => {
      const isFirstPage = pageIdx === 0;
      const startDateStr = transactions[0]?.valueDate || '21 Jul 2025';
      const endDateStr = transactions[transactions.length - 1]?.valueDate || '21 Jan 2026';

      return `
      <div class="page" style="page-break-after: always; padding: 15mm 10mm; box-sizing: border-box; min-height: 297mm; font-family: Arial, Helvetica, sans-serif; color: #000000; ${!isFirstPage ? 'display: flex; flex-direction: column; justify-content: center;' : ''}">
        
        ${isFirstPage ? `
        <!-- SBI 2 Header & Logo -->
        <div style="margin-bottom: 10px;">
          <img src="/sbi2-logo.png" alt="SBI" style="height: 58px; width: auto; display: block;" />
        </div>


        <!-- SBI 2 Customer Account Meta Dossier -->
        <table style="width: 100%; font-size: 11px; line-height: 1.35; border-collapse: collapse; color: #000000; margin-bottom: 14px;">
          <tbody>
            <tr><td style="width: 165px; vertical-align: top;">Account Name</td><td style="width: 8px; vertical-align: top; padding-right: 2px;">:</td><td style="vertical-align: top;">${customerDetails.accountHolderName}</td></tr>
            <tr><td style="vertical-align: top;">Address</td><td style="vertical-align: top;">:</td><td style="vertical-align: top; white-space: pre-line;">${formatAddress4Lines(customerDetails.address)}</td></tr>
            <tr><td style="vertical-align: top;">Date</td><td style="vertical-align: top;">:</td><td style="vertical-align: top;">${endDateStr}</td></tr>
            <tr><td style="vertical-align: top;">Account Number</td><td style="vertical-align: top;">:</td><td style="vertical-align: top; font-family: monospace;">${customerDetails.accountNumber || ''}</td></tr>
            <tr><td style="vertical-align: top;">Account Description</td><td style="vertical-align: top;">:</td><td style="vertical-align: top;">SBCHQ-SGSP-PUBIND-DIAMOND-INR</td></tr>
            <tr><td style="vertical-align: top;">Branch</td><td style="vertical-align: top;">:</td><td style="vertical-align: top;">${branchDetails.branchName}</td></tr>
            <tr><td style="vertical-align: top;">Drawing Power</td><td style="vertical-align: top;">:</td><td style="vertical-align: top;">0.00</td></tr>
            <tr><td style="vertical-align: top;">Interest Rate(% p.a.)</td><td style="vertical-align: top;">:</td><td style="vertical-align: top;">${accountInfo.interestRate || '2.5'}</td></tr>
            <tr><td style="vertical-align: top;">MOD Balance</td><td style="vertical-align: top;">:</td><td style="vertical-align: top;">0.00</td></tr>
            <tr><td style="vertical-align: top;">CIF No.</td><td style="vertical-align: top;">:</td><td style="vertical-align: top; font-family: monospace;">${customerDetails.cifNumber}</td></tr>
            <tr><td style="vertical-align: top;">CKYCR Number</td><td style="vertical-align: top;">:</td><td style="vertical-align: top; font-family: monospace;">${(() => { const val = branchDetails.ckycrNumber || '1234'; const digits = val.replace(/\D/g, ''); const last4 = digits.length >= 4 ? digits.slice(-4) : '1234'; return `XXXXXXXXXXX${last4}`; })()}</td></tr>
            <tr><td style="vertical-align: top;">IFS Code</td><td style="vertical-align: top;">:</td><td style="vertical-align: top;">${branchDetails.ifscCode}</td></tr>
            <tr><td style="font-size: 10px; color: #000000; padding-bottom: 2px;" colSpan="3">(Indian Financial System)</td></tr>
            <tr><td style="vertical-align: top;">MICR Code</td><td style="vertical-align: top;">:</td><td style="vertical-align: top; font-family: monospace;">${branchDetails.micrCode}</td></tr>
            <tr><td style="font-size: 10px; color: #000000; padding-bottom: 2px;" colSpan="3">(Magnetic Ink Character Recognition)</td></tr>
            <tr><td style="vertical-align: top;">Nomination Registered</td><td style="vertical-align: top;">:</td><td style="vertical-align: top;">${customerDetails.nomineeName && !customerDetails.nomineeName.toLowerCase().includes('no') ? 'Yes' : 'No'}</td></tr>
            <tr><td style="vertical-align: top;">Balance as on ${startDateStr}</td><td style="vertical-align: top;">:</td><td style="vertical-align: top;">${formatCurrency(accountInfo.openingBalance)}</td></tr>
          </tbody>
        </table>

        <div style="font-size: 12px; font-weight: bold; margin: 10px 0 8px 0; color: #000000;">
          Account Statement from ${startDateStr} to ${endDateStr}
        </div>
        ` : ''}

        <!-- SBI 2 Clean Ledger Table -->
        <table style="width: 100%; border-collapse: collapse; border: 1px solid #000000; font-size: 10px; color: #000000;">
          <thead>
            <tr style="height: 28px; background-color: #ffffff; color: #000000; font-size: 10.5px; font-weight: bold;">
              <th style="width: 11%; padding: 4px 6px; text-align: left; font-weight: bold; border: 1px solid #000000;">Txn Date</th>
              <th style="width: 11%; padding: 4px 6px; text-align: left; font-weight: bold; border: 1px solid #000000;">Value Date</th>
              <th style="width: 38%; padding: 4px 6px; text-align: left; font-weight: bold; border: 1px solid #000000;">Description</th>
              <th style="width: 18%; padding: 4px 6px; text-align: left; font-weight: bold; border: 1px solid #000000;">Ref No./Cheque No.</th>
              <th style="width: 7%; padding: 4px 6px; text-align: right; font-weight: bold; border: 1px solid #000000;">Debit</th>
              <th style="width: 7%; padding: 4px 6px; text-align: right; font-weight: bold; border: 1px solid #000000;">Credit</th>
              <th style="width: 8%; padding: 4px 6px; text-align: right; font-weight: bold; border: 1px solid #000000;">Balance</th>
            </tr>
          </thead>
          <tbody>
            ${pageTxs.map((tx) => {
        let descLine1 = '';
        let descLine2 = '';
        let refLine1 = '';
        let refLine2 = '';

        if (tx.credit && (tx.details.includes('NEFT') || tx.details.includes('SALARY'))) {
          descLine1 = 'BY TRANSFER-';
          descLine2 = `${tx.details}-`;
          refLine1 = 'TRANSFER FROM';
          refLine2 = tx.refNo || Array.from({ length: 13 }, () => Math.floor(Math.random() * 10)).join('');
        } else if (tx.credit && tx.details.includes('INTEREST')) {
          descLine1 = 'CREDIT INTEREST--';
          descLine2 = '';
          refLine1 = '';
          refLine2 = '';
        } else {
          descLine1 = 'TO TRANSFER-';
          const cleanDetails = tx.details.startsWith('TO TRANSFER-') ? tx.details.replace('TO TRANSFER-', '') : tx.details;
          descLine2 = `${cleanDetails}-`;
          refLine1 = 'TRANSFER TO';
          refLine2 = tx.refNo || Array.from({ length: 13 }, () => Math.floor(Math.random() * 10)).join('');
        }

        return `
              <tr style="border-bottom: 1px solid #000000; height: 38px; min-height: 38px;">
                <td style="padding: 4px 6px; text-align: left; border: 1px solid #000000; font-size: 9.5px; white-space: nowrap; vertical-align: top; line-height: 1.25;">${tx.valueDate}</td>
                <td style="padding: 4px 6px; text-align: left; border: 1px solid #000000; font-size: 9.5px; white-space: nowrap; vertical-align: top; line-height: 1.25;">${tx.postDate}</td>
                <td style="padding: 4px 6px; text-align: left; border: 1px solid #000000; font-size: 9.5px; word-break: break-all; vertical-align: top; line-height: 1.25;">
                  <div>${descLine1}</div>
                  ${descLine2 ? `<div>${descLine2}</div>` : ''}
                </td>
                <td style="padding: 4px 6px; text-align: left; border: 1px solid #000000; font-size: 9.5px; word-break: break-all; vertical-align: top; line-height: 1.25;">
                  ${refLine1 ? `<div>${refLine1}</div>` : ''}
                  ${refLine2 ? `<div>${refLine2}</div>` : ''}
                </td>
                <td style="padding: 4px 6px; text-align: right; border: 1px solid #000000; font-size: 9.5px; vertical-align: top; line-height: 1.25;">${tx.debit ? formatCurrency(tx.debit) : ''}</td>
                <td style="padding: 4px 6px; text-align: right; border: 1px solid #000000; font-size: 9.5px; vertical-align: top; line-height: 1.25;">${tx.credit ? formatCurrency(tx.credit) : ''}</td>
                <td style="padding: 4px 6px; text-align: right; border: 1px solid #000000; font-size: 9.5px; vertical-align: top; line-height: 1.25;">${formatCurrency(tx.balance)}</td>
              </tr>
              `;
      }).join('')}
          </tbody>

        </table>

        ${pageIdx === totalPagesCount - 1 ? `
        <div style="margin-top: 14px; font-size: 9.5px; line-height: 1.35; color: #000000;">
          Please do not share your ATM, Debit/Credit card number, PIN (Personal Identification Number) and OTP (One Time Password) with anyone over mail, SMS, phone call or any other media. Bank never asks for such information
        </div>
        ` : ''}

      </div>
      `;
    }).join('');

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="author" content="State Bank of India">
  <meta name="creator" content="State Bank of India Corporate Banking Portal">
  <meta name="publisher" content="State Bank of India">
  <meta name="subject" content="Official Account Statement">
  <meta name="description" content="State Bank of India Account Statement for ${customerDetails.accountHolderName}">
  <meta name="keywords" content="SBI, State Bank of India, Account Statement, Bank Ledger">
  <meta name="generator" content="SBI Internet Banking System">
  <title>State Bank of India - Account Statement</title>
  <style>
    @page { size: A4 portrait; margin: 0; }
    body { margin: 0; padding: 0; font-family: Arial, Helvetica, sans-serif; background: white; color: #000000; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    .page { width: 210mm; min-height: 297mm; box-sizing: border-box; }
  </style>
</head>
<body>
  ${sbi2Pages}
</body>
</html>`;
  }

  // Bank Theme Accent Colors & Headers for standard themes
  let primaryColor = '#005DAA'; // SBI Blue
  let headerTitle = 'STATE BANK OF INDIA';
  let bankTagline = 'ACCOUNT STATEMENT';

  if (bankStyle === 'BOI') {
    primaryColor = '#E21A22';
    headerTitle = 'BANK OF INDIA';
    bankTagline = 'STATEMENT OF ACCOUNT';
  } else if (bankStyle === 'Kotak') {
    primaryColor = '#ED1C24';
    headerTitle = 'KOTAK MAHINDRA BANK';
    bankTagline = 'ACCOUNT LEDGER STATEMENT';
  } else if (bankStyle === 'PNB') {
    primaryColor = '#A21D21';
    headerTitle = 'PUNJAB NATIONAL BANK';
    bankTagline = 'ACCOUNT STATEMENT';
  }

  const pages = chunkTransactions(transactions);
  const totalPagesCount = pages.length;

  const renderedPagesHtml = pages.map((pageTxs, pageIdx) => {
    const pageNum = pageIdx + 1;
    const isFirstPage = pageIdx === 0;

    return `
    <div class="page" style="page-break-after: always; padding: 25px 30px; box-sizing: border-box; min-height: 297mm; position: relative;">
      
      <!-- Top Bank Header -->
      <div style="border-bottom: 2px solid ${primaryColor}; padding-bottom: 12px; margin-bottom: 16px; display: flex; justify-content: space-between; align-items: flex-end;">
        <div>
          <h1 style="margin: 0; color: ${primaryColor}; font-size: 20px; font-weight: 800; letter-spacing: 0.5px;">${headerTitle}</h1>
          <p style="margin: 2px 0 0 0; font-size: 11px; color: #475569; text-transform: uppercase; font-weight: 600;">${bankTagline}</p>
        </div>
        <div style="text-align: right; font-size: 10px; color: #64748b;">
          <div>Page ${pageNum} of ${totalPagesCount}</div>
          <div>Generated: ${new Date(record.createdAt || Date.now()).toLocaleDateString('en-IN')}</div>
        </div>
      </div>

      ${isFirstPage ? `
      <!-- Account & Customer Details Dossier (First Page Only) -->
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 18px; background: #f8fafc; padding: 14px; border-radius: 6px; border: 1px solid #e2e8f0; font-size: 11px;">
        
        <div>
          <div style="font-weight: 700; color: #1e293b; margin-bottom: 6px; border-bottom: 1px solid #cbd5e1; padding-bottom: 4px; text-transform: uppercase; font-size: 10px; color: ${primaryColor};">Account Holder Information</div>
          <table style="width: 100%; border-collapse: collapse; line-height: 1.6;">
            <tr><td style="color: #64748b; width: 38%;">Name:</td><td style="font-weight: 700; color: #0f172a;">${customerDetails.accountHolderName || 'N/A'}</td></tr>
            <tr><td style="color: #64748b;">Account No:</td><td style="font-family: monospace; font-weight: 700;">${customerDetails.accountNumber || 'N/A'}</td></tr>
            <tr><td style="color: #64748b;">CIF No:</td><td style="font-family: monospace;">${customerDetails.cifNumber || 'N/A'}</td></tr>
            <tr><td style="color: #64748b;">Address:</td><td>${customerDetails.address || 'N/A'}</td></tr>
          </table>
        </div>

        <div>
          <div style="font-weight: 700; color: #1e293b; margin-bottom: 6px; border-bottom: 1px solid #cbd5e1; padding-bottom: 4px; text-transform: uppercase; font-size: 10px; color: ${primaryColor};">Branch & Financial Details</div>
          <table style="width: 100%; border-collapse: collapse; line-height: 1.6;">
            <tr><td style="color: #64748b; width: 38%;">Branch:</td><td style="font-weight: 600;">${branchDetails.branchName || 'N/A'}</td></tr>
            <tr><td style="color: #64748b;">IFSC Code:</td><td style="font-family: monospace; font-weight: 700;">${branchDetails.ifscCode || 'N/A'}</td></tr>
            <tr><td style="color: #64748b;">MICR Code:</td><td style="font-family: monospace;">${branchDetails.micrCode || 'N/A'}</td></tr>
            <tr><td style="color: #64748b;">Opening Bal:</td><td style="font-weight: 700; color: #047857;">₹${formatCurrency(accountInfo.openingBalance)}</td></tr>
          </table>
        </div>

      </div>
      ` : ''}

      <!-- Transactions Ledger Table -->
      <table style="width: 100%; border-collapse: collapse; font-size: 10px; line-height: 1.4;">
        <thead>
          <tr style="background-color: ${primaryColor}; color: white; text-align: left;">
            <th style="padding: 6px 8px; width: 12%;">Txn Date</th>
            <th style="padding: 6px 8px; width: 44%;">Transaction Details</th>
            <th style="padding: 6px 8px; width: 14%;">Ref / Chq No</th>
            <th style="padding: 6px 8px; width: 10%; text-align: right;">Debit (Dr)</th>
            <th style="padding: 6px 8px; width: 10%; text-align: right;">Credit (Cr)</th>
            <th style="padding: 6px 8px; width: 10%; text-align: right;">Balance</th>
          </tr>
        </thead>
        <tbody>
          ${pageTxs.map((tx, idx) => `
            <tr style="border-bottom: 1px solid #e2e8f0; background-color: ${idx % 2 === 0 ? '#ffffff' : '#f8fafc'};">
              <td style="padding: 6px 8px; white-space: nowrap; color: #334155;">${tx.valueDate}</td>
              <td style="padding: 6px 8px; word-break: break-word; color: #0f172a; font-family: sans-serif;">${tx.details}</td>
              <td style="padding: 6px 8px; font-family: monospace; color: #475569;">${tx.refNo || '-'}</td>
              <td style="padding: 6px 8px; text-align: right; color: #b91c1c; font-weight: 600;">${tx.debit ? formatCurrency(tx.debit) : ''}</td>
              <td style="padding: 6px 8px; text-align: right; color: #047857; font-weight: 600;">${tx.credit ? formatCurrency(tx.credit) : ''}</td>
              <td style="padding: 6px 8px; text-align: right; font-weight: 700; color: #0f172a; font-family: monospace;">${formatCurrency(tx.balance)}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>

      ${pageNum === totalPagesCount ? `
      <!-- Summary Totals Footer (Final Page Only) -->
      <div style="margin-top: 24px; padding: 14px; background: #f1f5f9; border-radius: 6px; border: 1px solid #cbd5e1; font-size: 11px; display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; text-align: center;">
        <div>
          <span style="display: block; color: #64748b; font-size: 10px; text-transform: uppercase;">Total Debits (${drCount})</span>
          <strong style="color: #b91c1c; font-size: 13px;">₹${formatCurrency(totalDebits)}</strong>
        </div>
        <div>
          <span style="display: block; color: #64748b; font-size: 10px; text-transform: uppercase;">Total Credits (${crCount})</span>
          <strong style="color: #047857; font-size: 13px;">₹${formatCurrency(totalCredits)}</strong>
        </div>
        <div>
          <span style="display: block; color: #64748b; font-size: 10px; text-transform: uppercase;">Opening Balance</span>
          <strong style="color: #334155; font-size: 13px;">₹${formatCurrency(accountInfo.openingBalance)}</strong>
        </div>
        <div>
          <span style="display: block; color: #64748b; font-size: 10px; text-transform: uppercase;">Closing Balance</span>
          <strong style="color: ${primaryColor}; font-size: 14px;">₹${formatCurrency(closingBalance)}</strong>
        </div>
      </div>

      <div style="margin-top: 30px; border-top: 1px dashed #cbd5e1; padding-top: 10px; text-align: center; font-size: 9px; color: #94a3b8;">
        This is a computer-generated account statement and does not require a physical signature.
      </div>
      ` : ''}

    </div>
    `;
  }).join('');

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="author" content="${headerTitle}">
  <meta name="creator" content="${headerTitle} Internet Banking Portal">
  <meta name="publisher" content="${headerTitle}">
  <meta name="subject" content="${headerTitle} Account Statement">
  <meta name="description" content="${headerTitle} Official Account Statement for ${customerDetails.accountHolderName}">
  <meta name="keywords" content="${headerTitle}, Account Statement, Bank Statement, Banking Ledger, Financial Record">
  <meta name="generator" content="${headerTitle} Automated Core Banking System">
  <title>${headerTitle} - Statement</title>
  <style>
    @page { size: A4 portrait; margin: 0; }
    body { margin: 0; padding: 0; font-family: 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background: white; color: #1e293b; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    .page { width: 210mm; min-height: 297mm; box-sizing: border-box; }
  </style>
</head>
<body>
  ${renderedPagesHtml}
</body>
</html>`;
}
