import { Router } from 'express';
import express from 'express';
import { generatePdf, generateStatementPdf } from '../controllers/pdfController';

const router = Router();

// POST /api/pdf/generate — Generate PDF from raw HTML
router.post(
  '/generate',
  express.json({ limit: '15mb' }),
  generatePdf
);

// POST /api/pdf/generate-statement — Backend full HTML statement template rendering & PDF generation
router.post(
  '/generate-statement',
  express.json({ limit: '5mb' }),
  generateStatementPdf
);

export default router;
