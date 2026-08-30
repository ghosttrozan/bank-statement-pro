import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import { logToSystem } from './dbBridge';

export interface ExportPdfOptions {
  filename?: string;
  password?: string;
  onProgress?: (percent: number, statusText: string) => void;
}

/**
 * Helper to convert any `oklch(...)` or `oklab(...)` color strings in CSS to standard RGB/HEX
 * using browser's native Canvas rendering context, preventing html2canvas parse crashes.
 */
function sanitizeColorCss(cssText: string): string {
  if (!cssText || (!cssText.includes('oklch') && !cssText.includes('oklab'))) {
    return cssText;
  }

  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');

  return cssText.replace(/(oklch|oklab)\([^)]+\)/gi, (match) => {
    if (ctx) {
      try {
        ctx.fillStyle = match;
        const computedColor = ctx.fillStyle;
        if (computedColor && !computedColor.includes('oklch') && !computedColor.includes('oklab')) {
          return computedColor;
        }
      } catch {
        // Fallback if browser parsing fails
      }
    }
    return '#64748b'; // Fallback neutral color
  });
}

/**
 * Renders `.print-page` elements inside a container element into a PDF document,
 * with optional AES/RC4 password encryption.
 */
export async function exportStatementToPdf(
  containerElement: HTMLElement,
  options: ExportPdfOptions = {}
): Promise<void> {
  const { filename = 'bank_statement.pdf', password, onProgress } = options;

  // Find all printable pages
  const pageElements = Array.from(
    containerElement.querySelectorAll<HTMLElement>('.print-page')
  );

  if (pageElements.length === 0) {
    throw new Error('No statement pages found to render.');
  }

  logToSystem(
    'SYSTEM',
    'INFO',
    `Starting PDF compilation: ${pageElements.length} pages. Password protected: ${Boolean(password && password.trim())}`
  );

  const hasPassword = Boolean(password && password.trim().length > 0);
  const pdfOptions: any = {
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
    compress: true,
  };

  if (hasPassword) {
    const trimmedPass = password!.trim();
    pdfOptions.encryption = {
      userPassword: trimmedPass,
      ownerPassword: trimmedPass,
      userPermissions: ['print', 'modify', 'copy', 'annot-forms'],
    };
  }

  const pdf = new jsPDF(pdfOptions);

  for (let i = 0; i < pageElements.length; i++) {
    const pageEl = pageElements[i];
    const pageNum = i + 1;

    if (onProgress) {
      const progressPercent = Math.round(((i + 0.5) / pageElements.length) * 100);
      onProgress(progressPercent, `Rendering page ${pageNum} of ${pageElements.length}...`);
    }

    // Capture element using html2canvas with oklch CSS sanitizer in onclone
    const canvas = await html2canvas(pageEl, {
      scale: 1.5, // balanced scale: clear but not oversized
      useCORS: true,
      allowTaint: true,
      logging: false,
      imageTimeout: 5000, // 5s timeout to prevent hanging on external image loads
      backgroundColor: '#ffffff',
      windowWidth: pageEl.scrollWidth || 794, // Standard A4 pixel equivalent at 96DPI
      onclone: (clonedDoc, clonedElement) => {
        // 1. Sanitize all <style> tags in document head & body to replace oklch/oklab colors
        const styleElements = clonedDoc.querySelectorAll('style');
        styleElements.forEach((styleEl) => {
          if (styleEl.textContent) {
            styleEl.textContent = sanitizeColorCss(styleEl.textContent);
          }
        });

        // 2. Sanitize inline styles & box-shadows on cloned elements
        const allNodes = [clonedElement, ...Array.from(clonedElement.querySelectorAll('*'))] as HTMLElement[];
        allNodes.forEach((node) => {
          const styleAttr = node.getAttribute('style');
          if (styleAttr) {
            node.setAttribute('style', sanitizeColorCss(styleAttr));
          }

          // Strip box-shadow if it still contains oklch/oklab
          const computed = window.getComputedStyle(node);
          if (computed.boxShadow && (computed.boxShadow.includes('oklch') || computed.boxShadow.includes('oklab'))) {
            node.style.boxShadow = 'none';
          }
        });
      },
    });

    const imgData = canvas.toDataURL('image/jpeg', 0.50); // 0.50 = optimized compression (~500KB file size)

    if (i > 0) {
      pdf.addPage('a4', 'portrait');
    }

    // Exact A4 dimensions: 210mm x 297mm
    pdf.addImage(imgData, 'JPEG', 0, 0, 210, 297, undefined, 'FAST');

    if (onProgress) {
      const progressPercent = Math.round(((i + 1) / pageElements.length) * 100);
      onProgress(progressPercent, `Compiled page ${pageNum} of ${pageElements.length}`);
    }
  }

  if (onProgress) {
    onProgress(100, 'Finalizing & saving encrypted PDF file...');
  }

  pdf.save(filename);
  logToSystem('SYSTEM', 'INFO', `PDF compilation completed successfully: ${filename}`);
}

/**
 * Converts all <img> tags inside an element to inline Base64 data URIs
 * using an HTML5 Canvas, ensuring logo images are 100% embedded in the PDF payload.
 */
async function inlineImagesAsBase64(element: HTMLElement): Promise<HTMLElement> {
  const clone = element.cloneNode(true) as HTMLElement;
  const imgs = Array.from(clone.querySelectorAll<HTMLImageElement>('img'));

  for (const img of imgs) {
    const src = img.getAttribute('src');
    if (!src || src.startsWith('data:')) continue;

    try {
      const base64 = await new Promise<string>((resolve) => {
        const tempImg = new Image();
        tempImg.crossOrigin = 'anonymous';
        tempImg.onload = () => {
          try {
            const canvas = document.createElement('canvas');
            canvas.width = tempImg.naturalWidth || tempImg.width || 100;
            canvas.height = tempImg.naturalHeight || tempImg.height || 100;
            const ctx = canvas.getContext('2d');
            if (ctx) {
              ctx.drawImage(tempImg, 0, 0);
              resolve(canvas.toDataURL('image/png'));
            } else {
              resolve(src);
            }
          } catch {
            resolve(src);
          }
        };
        tempImg.onerror = () => resolve(src);
        tempImg.src = src.startsWith('http') ? src : `${window.location.origin}/${src.replace(/^\//, '')}`;
      });

      if (base64 && base64.startsWith('data:')) {
        img.src = base64;
      }
    } catch (e) {
      console.warn('Failed to inline logo image:', src, e);
    }
  }

  return clone;
}

/**
 * Generate a native vector PDF via the Puppeteer backend.
 * This creates a TEXT-EXTRACTABLE, selectable PDF (not image-based).
 * Perfect for bank verification systems (Perfios, Karza, Finbit, etc.)
 *
 * @param container - The DOM element to capture the full HTML from
 * @param options   - filename, onProgress callback
 */
export async function exportStatementToPdfViaBackend(
  container: HTMLElement,
  options: ExportPdfOptions = {}
): Promise<void> {
  const {
    filename = 'bank_statement.pdf',
    password,
    onProgress,
  } = options;

  if (onProgress) onProgress(10, 'Preparing statement HTML...');

  // Inline all bank logo images as Base64 data URIs for 100% reliable PDF embedding
  const clonedContainer = await inlineImagesAsBase64(container);
  const containerHtml = clonedContainer.outerHTML;

  // Build a complete self-contained HTML document with all computed stylesheets embedded
  const allStyles = Array.from(document.styleSheets)
    .map((sheet) => {
      try {
        return Array.from(sheet.cssRules || []).map((r) => r.cssText).join('\n');
      } catch {
        // cross-origin sheets: include them via <link> ref fallback
        return sheet.href ? `@import url("${sheet.href}");` : '';
      }
    })
    .join('\n');

  const originUrl = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000';

  const fullHtml = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<base href="${originUrl}/" />
<style>
  * { box-sizing: border-box; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  body { margin: 0; padding: 0; background: white; font-family: sans-serif; }
  @page { size: A4; margin: 0; }
  ${allStyles}
</style>
</head>
<body>
${containerHtml}
</body>
</html>`;

  if (onProgress) onProgress(30, 'Connecting to PDF engine...');

  const API_BASE_URL = (import.meta as any).env.VITE_API_URL || '';

  // Get auth token from store
  const { useAuthStore } = await import('../store/authStore');
  const accessToken = useAuthStore.getState().accessToken;

  // Set 60-second timeout to accommodate Render free tier cold-starts & Puppeteer launch
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 60000);

  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}/api/pdf/generate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
      },
      credentials: 'include',
      signal: controller.signal,
      body: JSON.stringify({ html: fullHtml, password, filename }),
    });
  } catch (fetchErr: any) {
    clearTimeout(timeoutId);
    if (fetchErr.name === 'AbortError') {
      throw new Error('Backend PDF request timed out (60s). Falling back to client renderer.');
    }
    throw fetchErr;
  } finally {
    clearTimeout(timeoutId);
  }

  if (!response.ok) {
    let errMsg = `Backend PDF generation failed (${response.status})`;
    try {
      const errData = await response.json();
      if (errData?.message) errMsg = errData.message;
    } catch {}
    throw new Error(errMsg);
  }

  if (onProgress) onProgress(85, 'Downloading PDF...');

  const blob = await response.blob();

  if (onProgress) onProgress(100, 'Done!');

  // Trigger download
  saveBlobAsFile(blob, filename);

  logToSystem('SYSTEM', 'INFO', `Backend PDF (text-layer) downloaded successfully: ${filename}`);
}

/**
 * Reliable browser file download trigger for Blobs (PDF, etc.)
 */
export function saveBlobAsFile(blob: Blob, filename: string): void {
  const pdfBlob = blob.type === 'application/pdf' ? blob : new Blob([blob], { type: 'application/pdf' });
  const blobUrl = window.URL.createObjectURL(pdfBlob);

  const link = document.createElement('a');
  link.style.display = 'none';
  link.href = blobUrl;
  link.download = filename;
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();

  // Defer revoking the blob URL by 15s so the browser starts & finishes the download stream
  setTimeout(() => {
    try {
      if (document.body.contains(link)) {
        document.body.removeChild(link);
      }
      window.URL.revokeObjectURL(blobUrl);
    } catch {}
  }, 15000);
}

/**
 * Directly calls Java Spring Boot backend (Port 8080) to generate transactions,
 * compile high-performance iText 8 vector PDF with authentic fonts and security,
 * and download directly to client.
 */
export async function downloadStatementFromJavaBackend(payload: {
  customerDetails: any;
  branchDetails: any;
  accountInfo: any;
  settings: any;
  transactions?: any[];
  onProgress?: (percent: number, text: string) => void;
}): Promise<{ filename: string; record?: any }> {
  const { customerDetails, branchDetails, accountInfo, settings, transactions, onProgress } = payload;

  if (onProgress) onProgress(20, 'Sending request to Java Vector PDF Engine (Port 8080)...');

  const JAVA_API_BASE_URL = (import.meta as any).env.VITE_JAVA_API_URL || 'http://localhost:8080';

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 30000);

  let response: Response;
  try {
    response = await fetch(`${JAVA_API_BASE_URL}/api/statements/download`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      signal: controller.signal,
      body: JSON.stringify({
        customerDetails,
        branchDetails,
        accountInfo,
        settings,
        transactions,
      }),
    });
  } catch (err: any) {
    clearTimeout(timeoutId);
    if (err.name === 'AbortError') {
      throw new Error('Java backend request timed out (30s).');
    }
    throw err;
  } finally {
    clearTimeout(timeoutId);
  }

  if (!response.ok) {
    let errMsg = `Java PDF generation failed (${response.status})`;
    try {
      const errData = await response.json();
      if (errData?.message) errMsg = errData.message;
    } catch {}
    throw new Error(errMsg);
  }

  if (onProgress) onProgress(80, 'Receiving high-fidelity vector PDF from Java Engine...');

  const blob = await response.blob();
  const randCode = Math.random().toString(36).substring(2, 8).toUpperCase() + Math.floor(1000 + Math.random() * 9000);
  const filename = `${settings.bankStyle || 'Bank'}_Statement_${randCode}.pdf`;

  if (onProgress) onProgress(100, 'Download complete!');

  saveBlobAsFile(blob, filename);

  logToSystem('SYSTEM', 'INFO', `Java iText Vector PDF downloaded successfully: ${filename}`);
  return { filename };
}

/**
 * Sends user inputs to the Node backend (/api/pdf/generate-statement) as fallback
 */
export async function downloadStatementPdfFromBackend(payload: {
  customerDetails: any;
  branchDetails: any;
  accountInfo: any;
  settings: any;
  onProgress?: (percent: number, text: string) => void;
}): Promise<void> {
  const { customerDetails, branchDetails, accountInfo, settings, onProgress } = payload;

  if (onProgress) onProgress(20, 'Sending request to backend PDF engine...');

  const API_BASE_URL = (import.meta as any).env.VITE_API_URL || '';

  const { useAuthStore } = await import('../store/authStore');
  const accessToken = useAuthStore.getState().accessToken;

  const response = await fetch(`${API_BASE_URL}/api/pdf/generate-statement`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
    },
    credentials: 'include',
    body: JSON.stringify({ customerDetails, branchDetails, accountInfo, settings }),
  });

  if (!response.ok) {
    let errMsg = `Backend PDF generation failed (${response.status})`;
    try {
      const errData = await response.json();
      if (errData?.message) errMsg = errData.message;
    } catch {}
    throw new Error(errMsg);
  }

  if (onProgress) onProgress(75, 'Receiving PDF stream from backend...');

  const blob = await response.blob();

  const randCode = Math.random().toString(36).substring(2, 8).toUpperCase() + Math.floor(1000 + Math.random() * 9000);
  const filename = `${settings.bankStyle || 'Bank'}_Statement_${randCode}.pdf`;

  if (onProgress) onProgress(100, 'Download complete!');

  saveBlobAsFile(blob, filename);

  logToSystem('SYSTEM', 'INFO', `Backend PDF generated & downloaded successfully: ${filename}`);
}


