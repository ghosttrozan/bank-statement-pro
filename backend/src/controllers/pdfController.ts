import { Request, Response } from 'express';
import puppeteer from 'puppeteer';
import muhammara from 'muhammara';
import { generateStatementTransactions } from '../services/transactionEngine';
import { renderStatementHtml } from '../templates/statementTemplates';
import { StatementRecord } from '../types/statement';

/**
 * Encrypts a PDF Buffer with user and owner passwords using muhammara,
 * maintaining 100% vector text extractability and compact file size.
 */
function encryptPdfBuffer(pdfBuffer: Buffer, pass: string): Buffer {
  try {
    const inStream = new muhammara.PDFRStreamForBuffer(pdfBuffer);
    const outStream = new muhammara.PDFWStreamForBuffer();

    muhammara.recrypt(inStream, outStream, {
      userPassword: pass,
      ownerPassword: pass,
      userProtectionFlag: 4,
    });

    return outStream.buffer;
  } catch (err) {
    console.error('[encryptPdfBuffer] Error encrypting PDF:', err);
    return pdfBuffer;
  }
}

/**
 * POST /api/pdf/generate
 * 
 * Body: { html: string, password?: string, filename?: string }
 */
export const generatePdf = async (req: Request, res: Response): Promise<void> => {
  let browser: any = null;
  try {
    const { html, password, filename = 'bank_statement.pdf' } = req.body;

    if (!html || typeof html !== 'string') {
      res.status(400).json({ message: 'HTML content is required.' });
      return;
    }

    const safeFilename = filename.replace(/[^a-zA-Z0-9._\-]/g, '_').substring(0, 128);

    browser = await puppeteer.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu',
        '--disable-web-security',
        '--allow-file-access-from-files',
      ],
    });

    const page = await browser.newPage();

    await page.setContent(html, {
      waitUntil: 'domcontentloaded',
      timeout: 10000,
    });

    try {
      await Promise.race([
        page.evaluate(() => (globalThis as any).document?.fonts?.ready),
        new Promise((resolve) => setTimeout(resolve, 2000)),
      ]);
    } catch {}

    let pdfBuffer: Buffer = await page.pdf({
      format: 'A4',
      printBackground: true,
      preferCSSPageSize: true,
      margin: { top: 0, bottom: 0, left: 0, right: 0 },
    });

    await browser.close();
    browser = null;

    const hasPassword = Boolean(password && typeof password === 'string' && password.trim().length > 0);
    if (hasPassword) {
      pdfBuffer = encryptPdfBuffer(pdfBuffer, (password as string).trim());
    }

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${safeFilename}"`);
    res.setHeader('Content-Length', pdfBuffer.length);
    res.setHeader('X-PDF-Type', 'native-vector');

    res.end(pdfBuffer);
  } catch (err: any) {
    if (browser) {
      try { await browser.close(); } catch {}
    }
    console.error('[generatePdf] Error:', err);
    res.status(500).json({
      message: 'PDF generation failed',
      error: process.env.NODE_ENV === 'development' ? err.message : undefined,
    });
  }
};

/**
 * POST /api/pdf/generate-statement
 * 
 * Body: { customerDetails, branchDetails, accountInfo, settings, transactions? }
 * 
 * Server-side full statement generation pipeline:
 * 1. Generates transactions list using backend transaction engine if not provided.
 * 2. Fills/renders server-side HTML bank statement template.
 * 3. Compiles HTML into text-selectable vector PDF using Puppeteer.
 * 4. Applies optional PDF password encryption.
 * 5. Returns binary stream directly to frontend.
 */
export const generateStatementPdf = async (req: Request, res: Response): Promise<void> => {
  let browser: any = null;
  try {
    const { customerDetails, branchDetails, accountInfo, settings, transactions: providedTx } = req.body;

    if (!customerDetails || !branchDetails || !accountInfo || !settings) {
      res.status(400).json({ message: 'customerDetails, branchDetails, accountInfo, and settings are required.' });
      return;
    }

    // 1. Generate or use provided transactions
    const finalTime = new Date().toISOString();
    const transactions = providedTx && Array.isArray(providedTx) && providedTx.length > 0
      ? providedTx
      : generateStatementTransactions(settings, accountInfo, finalTime);

    let totalDebits = 0;
    let totalCredits = 0;
    let drCount = 0;
    let crCount = 0;

    transactions.forEach((tx: any) => {
      if (tx.debit) {
        totalDebits += tx.debit;
        drCount++;
      }
      if (tx.credit) {
        totalCredits += tx.credit;
        crCount++;
      }
    });

    const closingBalance = transactions.length > 0 ? transactions[transactions.length - 1].balance : accountInfo.openingBalance;

    const record: StatementRecord = {
      id: `stmt_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
      createdAt: finalTime,
      customerDetails,
      branchDetails,
      accountInfo,
      settings,
      transactions,
      closingBalance,
      totalCredits,
      totalDebits,
      drCount,
      crCount
    };

    // 2. Render HTML template on Backend
    const htmlContent = renderStatementHtml(record);

    // 3. Launch Puppeteer to render PDF
    browser = await puppeteer.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu',
        '--disable-web-security',
      ],
    });

    const page = await browser.newPage();
    await page.setContent(htmlContent, { waitUntil: 'domcontentloaded', timeout: 10000 });

    let pdfBuffer: Buffer = await page.pdf({
      format: 'A4',
      printBackground: true,
      preferCSSPageSize: true,
      margin: { top: 0, bottom: 0, left: 0, right: 0 },
    });

    await browser.close();
    browser = null;

    // 4. Apply password protection if configured in settings
    const pdfPass = settings.enablePdfPassword && settings.pdfPassword ? settings.pdfPassword.trim() : undefined;
    if (pdfPass) {
      pdfBuffer = encryptPdfBuffer(pdfBuffer, pdfPass);
    }

    const randCode = Math.random().toString(36).substring(2, 8).toUpperCase() + Math.floor(1000 + Math.random() * 9000);
    const filename = `${settings.bankStyle || 'Bank'}_Statement_${randCode}.pdf`;

    // 5. Stream PDF binary back to frontend
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Length', pdfBuffer.length);
    res.setHeader('X-Statement-ID', record.id);

    res.end(pdfBuffer);
  } catch (err: any) {
    if (browser) {
      try { await browser.close(); } catch {}
    }
    console.error('[generateStatementPdf] Error:', err);
    res.status(500).json({
      message: 'Server statement PDF generation failed',
      error: process.env.NODE_ENV === 'development' ? err.message : undefined,
    });
  }
};
