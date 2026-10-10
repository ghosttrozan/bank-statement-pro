package com.statementpro.pdf;

import com.itextpdf.io.font.constants.StandardFonts;
import com.itextpdf.io.image.ImageDataFactory;
import com.itextpdf.kernel.colors.DeviceRgb;
import com.itextpdf.kernel.font.PdfFont;
import com.itextpdf.kernel.font.PdfFontFactory;
import com.itextpdf.kernel.geom.PageSize;
import com.itextpdf.kernel.pdf.PdfDocument;
import com.itextpdf.kernel.pdf.PdfPage;
import com.itextpdf.kernel.pdf.PdfWriter;
import com.itextpdf.kernel.pdf.WriterProperties;
import com.itextpdf.kernel.pdf.canvas.PdfCanvas;
import com.statementpro.model.BranchDetails;
import com.statementpro.model.CustomerDetails;
import com.statementpro.model.StatementRecord;
import com.statementpro.model.Transaction;

import java.io.ByteArrayOutputStream;
import java.io.InputStream;
import java.util.ArrayList;
import java.util.List;

/**
 * Pixel-accurate Punjab National Bank Statement Template.
 * Exact replication of official PNB statements (9-pnb.pdf).
 */
public class PnbTemplate implements StatementTemplate {

    private static final DeviceRgb COLOR_BLACK = new DeviceRgb(0, 0, 0);
    private static final DeviceRgb COLOR_HEADER_BG = new DeviceRgb(217, 217, 217); // RGB 0.851

    @Override
    public byte[] render(StatementRecord record) throws java.io.IOException {
        return render(record, null);
    }

    @Override
    public byte[] render(StatementRecord record, WriterProperties writerProperties) throws java.io.IOException {
        ByteArrayOutputStream out = new ByteArrayOutputStream();
        PdfWriter writer = writerProperties != null ? new PdfWriter(out, writerProperties) : new PdfWriter(out);

        try (PdfDocument pdfDoc = new PdfDocument(writer)) {
            PdfFont fontArialMT = PdfFontFactory.createFont(StandardFonts.HELVETICA);
            PdfFont fontArialBold = PdfFontFactory.createFont(StandardFonts.HELVETICA_BOLD);

            byte[] headerBytes = loadResourceBytes("/logos/pnb_header.png");

            List<Transaction> transactions = record.transactions() != null ? record.transactions() : List.of();

            String startDateStr = transactions.isEmpty() ? "24/07/2025" : formatPnbDate(transactions.get(0).valueDate());
            String endDateStr   = transactions.isEmpty() ? "23/07/2026" : formatPnbDate(transactions.get(transactions.size() - 1).valueDate());

            String accNum = record.customerDetails().accountNumber() != null && !record.customerDetails().accountNumber().isBlank()
                    ? record.customerDetails().accountNumber() : "6592001700122650";

            List<List<Transaction>> pages = splitTransactions(transactions);
            int txPagesCount = Math.max(1, pages.size());
            int totalPages = txPagesCount + 1; // plus 1 for final disclaimers & abbreviations page

            // 1. Transaction Pages
            for (int pIdx = 0; pIdx < txPagesCount; pIdx++) {
                int pageNum = pIdx + 1;
                boolean isFirstPage = (pIdx == 0);
                List<Transaction> pageTxs = pages.isEmpty() ? List.of() : pages.get(pIdx);

                PdfPage page = pdfDoc.addNewPage(new PageSize(PnbLayout.PAGE_WIDTH, PnbLayout.PAGE_HEIGHT));
                PdfCanvas canvas = new PdfCanvas(page);

                if (isFirstPage) {
                    renderPage1Header(canvas, record, headerBytes, fontArialMT, fontArialBold, accNum, startDateStr, endDateStr);
                    renderTable(canvas, pageTxs, fontArialMT, fontArialBold, PnbLayout.PAGE_HEIGHT - 398.25f, true);
                } else {
                    renderContinuationHeader(canvas, fontArialMT, accNum);
                    renderTable(canvas, pageTxs, fontArialMT, fontArialBold, PnbLayout.PAGE_HEIGHT - 33.0f, false);
                }

                // Page Footer
                renderFooter(canvas, fontArialMT, pageNum);
            }

            // 2. Concluding Disclaimers & Abbreviations Page
            PdfPage lastPage = pdfDoc.addNewPage(new PageSize(PnbLayout.PAGE_WIDTH, PnbLayout.PAGE_HEIGHT));
            PdfCanvas lastCanvas = new PdfCanvas(lastPage);
            renderConcludingPage(lastCanvas, fontArialMT, fontArialBold, accNum, totalPages);
        }

        return out.toByteArray();
    }

    private List<List<Transaction>> splitTransactions(List<Transaction> all) {
        List<List<Transaction>> pages = new ArrayList<>();
        if (all == null || all.isEmpty()) {
            pages.add(List.of());
            return pages;
        }

        int total = all.size();
        int idx = 0;

        // Page 1: up to 15 rows
        int p1Target = Math.min(PnbLayout.PAGE_1_ROWS, total);
        pages.add(new ArrayList<>(all.subList(0, p1Target)));
        idx += p1Target;

        // Continuation pages: up to 30 rows
        while (idx < total) {
            int end = Math.min(idx + PnbLayout.PAGE_N_ROWS, total);
            pages.add(new ArrayList<>(all.subList(idx, end)));
            idx = end;
        }

        return pages;
    }

    private void renderPage1Header(PdfCanvas canvas, StatementRecord record, byte[] headerBytes,
                                   PdfFont fontArialMT, PdfFont fontArialBold,
                                   String accNum, String startDateStr, String endDateStr) {
        CustomerDetails cust = record.customerDetails();
        BranchDetails branch = record.branchDetails();

        // Banner Image across top: width 595.5, height 37.5
        if (headerBytes != null) {
            try {
                canvas.addImageWithTransformationMatrix(ImageDataFactory.create(headerBytes),
                        PnbLayout.PAGE_WIDTH, 0, 0, 37.5f, 0.0f, PnbLayout.PAGE_HEIGHT - 37.5f);
            } catch (Exception ignored) {}
        }



        // Account Statement For Account:XXXX
        String titleText = "Account Statement For Account:" + accNum;
        float titleW = fontArialMT.getWidth(titleText, 9.75f);
        canvas.saveState();
        canvas.beginText();
        canvas.setFontAndSize(fontArialMT, 9.75f);
        canvas.setFillColor(COLOR_BLACK);
        canvas.moveText((PnbLayout.PAGE_WIDTH - titleW) / 2f, PnbLayout.PAGE_HEIGHT - 55.0f);
        canvas.showText(titleText);
        canvas.endText();
        canvas.restoreState();

        // Branch Details Section
        drawText(canvas, "Branch Details", 28.34f, PnbLayout.PAGE_HEIGHT - 74.0f, fontArialMT, 9.75f);

        String bName = branch.branchName() != null && !branch.branchName().isBlank() ? branch.branchName() : "SHAJAPUR";
        String bAddr = branch.branchAddress() != null && !branch.branchAddress().isBlank() ? branch.branchAddress() : "AJAY SHARE TAKTEO SHAJAPUR 466038";
        String ifsc = branch.ifscCode() != null && !branch.ifscCode().isBlank() ? branch.ifscCode() : "PUNB0659200";
        String micr = branch.micrCode() != null && !branch.micrCode().isBlank() ? branch.micrCode() : "465024505";

        drawField(canvas, "Branch Name:", bName, 28.34f, 125.84f, PnbLayout.PAGE_HEIGHT - 90.0f, fontArialMT, 7.88f);
        drawField(canvas, "Bank Address:", bAddr, 28.34f, 125.84f, PnbLayout.PAGE_HEIGHT - 102.0f, fontArialMT, 7.88f);
        drawField(canvas, "City:", bName, 28.34f, 125.84f, PnbLayout.PAGE_HEIGHT - 113.0f, fontArialMT, 7.88f);
        drawField(canvas, "Pin:", "466038", 28.34f, 125.84f, PnbLayout.PAGE_HEIGHT - 124.0f, fontArialMT, 7.88f);
        drawField(canvas, "IFSC Code:", ifsc, 28.34f, 125.84f, PnbLayout.PAGE_HEIGHT - 135.0f, fontArialMT, 7.88f);
        drawField(canvas, "MICR Code :", micr, 28.34f, 125.84f, PnbLayout.PAGE_HEIGHT - 146.0f, fontArialMT, 7.88f);

        // Customer Details Section
        drawText(canvas, "Customer Details", 28.34f, PnbLayout.PAGE_HEIGHT - 169.0f, fontArialMT, 9.75f);

        String custName = cust.accountHolderName() != null && !cust.accountHolderName().isBlank() ? cust.accountHolderName() : "RAMESH JI";
        String custAddr = cust.address() != null && !cust.address().isBlank() ? cust.address() : "GRAM PALKHANDA POST KAREDI MATAJI UJJAIN MADHYA PRADESH";
        String nominee = cust.nomineeName() != null && !cust.nomineeName().isBlank() ? cust.nomineeName() : custName.split(" ")[0];
        String cCity = cust.city() != null && !cust.city().isBlank() ? cust.city() : bName;
        String cPin = cust.pinCode() != null && !cust.pinCode().isBlank() ? cust.pinCode() : "466038";

        drawField(canvas, "Account Name :", custName, 28.34f, 140.84f, PnbLayout.PAGE_HEIGHT - 185.0f, fontArialMT, 7.88f);
        drawText(canvas, "Joint Account Holder 1:", 28.34f, PnbLayout.PAGE_HEIGHT - 207.0f, fontArialMT, 7.88f);
        drawText(canvas, "Joint Account Holder 2:", 28.34f, PnbLayout.PAGE_HEIGHT - 229.0f, fontArialMT, 7.88f);
        drawText(canvas, "Joint Account Holder 3:", 28.34f, PnbLayout.PAGE_HEIGHT - 252.0f, fontArialMT, 7.88f);
        drawField(canvas, "Customer Address:", custAddr, 28.34f, 140.84f, PnbLayout.PAGE_HEIGHT - 279.0f, fontArialMT, 7.88f);
        drawField(canvas, "City:", cCity, 28.34f, 140.84f, PnbLayout.PAGE_HEIGHT - 302.0f, fontArialMT, 7.88f);
        drawField(canvas, "Pin:", cPin, 28.34f, 140.84f, PnbLayout.PAGE_HEIGHT - 325.0f, fontArialMT, 7.88f);
        drawField(canvas, "Nominee :", nominee, 28.34f, 140.84f, PnbLayout.PAGE_HEIGHT - 348.0f, fontArialMT, 7.88f);

        // Statement Period
        String periodText = "Statement Period :          " + startDateStr + "      to      " + endDateStr;
        drawText(canvas, periodText, 28.34f, PnbLayout.PAGE_HEIGHT - 383.0f, fontArialMT, 8.25f);
    }

    private void renderContinuationHeader(PdfCanvas canvas, PdfFont fontArialMT, String accNum) {
        String titleText = "Account Statement For Account:" + accNum;
        float titleW = fontArialMT.getWidth(titleText, 9.75f);
        canvas.saveState();
        canvas.beginText();
        canvas.setFontAndSize(fontArialMT, 9.75f);
        canvas.setFillColor(COLOR_BLACK);
        canvas.moveText((PnbLayout.PAGE_WIDTH - titleW) / 2f, PnbLayout.PAGE_HEIGHT - 15.0f);
        canvas.showText(titleText);
        canvas.endText();
        canvas.restoreState();
    }

    private void renderTable(PdfCanvas canvas, List<Transaction> transactions,
                             PdfFont fontArialMT, PdfFont fontArialBold,
                             float headerTopY, boolean isPage1) {
        float x0 = PnbLayout.MARGIN_LEFT;
        float hTop = headerTopY;
        float hBot = hTop - PnbLayout.HEADER_HEIGHT;

        float[] colX = new float[PnbLayout.COL_WIDTHS.length + 1];
        colX[0] = x0;
        for (int i = 0; i < PnbLayout.COL_WIDTHS.length; i++) {
            colX[i + 1] = colX[i] + PnbLayout.COL_WIDTHS[i];
        }

        // Draw 6 Header Cells
        String[][] headerLabels = {
            {"Transaction", "Date"},
            {"Cheque", "Number"},
            {"Withdrawal", ""},
            {"Deposit", ""},
            {"Balance", ""},
            {"Narration", ""}
        };

        for (int c = 0; c < 6; c++) {
            float cellX = colX[c];
            float cellW = PnbLayout.COL_WIDTHS[c];

            // Fill & border
            canvas.saveState();
            canvas.setFillColor(COLOR_HEADER_BG);
            canvas.rectangle(cellX, hBot, cellW, PnbLayout.HEADER_HEIGHT);
            canvas.fill();
            canvas.setStrokeColor(COLOR_BLACK);
            canvas.setLineWidth(0.75f);
            canvas.rectangle(cellX, hBot, cellW, PnbLayout.HEADER_HEIGHT);
            canvas.stroke();
            canvas.restoreState();

            // Header Text
            String line1 = headerLabels[c][0];
            String line2 = headerLabels[c][1];

            if (line2.isEmpty()) {
                // Single line centered vertically
                float w = fontArialBold.getWidth(line1, 7.50f);
                float tx = (c == 5) ? cellX + 4.09f : cellX + (cellW - w) / 2f;
                float ty = hBot + (PnbLayout.HEADER_HEIGHT - 7.50f) / 2f + 1.5f;
                drawText(canvas, line1, tx, ty, fontArialBold, 7.50f);
            } else {
                // Two lines
                float w1 = fontArialBold.getWidth(line1, 7.50f);
                float w2 = fontArialBold.getWidth(line2, 7.50f);
                float tx1 = cellX + (cellW - w1) / 2f;
                float tx2 = cellX + (cellW - w2) / 2f;
                drawText(canvas, line1, tx1, hBot + 14.5f, fontArialBold, 7.50f);
                drawText(canvas, line2, tx2, hBot + 4.5f, fontArialBold, 7.50f);
            }
        }

        // Draw Data Rows
        float rowTop = hBot;
        for (Transaction tx : transactions) {
            float rowBot = rowTop - PnbLayout.ROW_HEIGHT;

            // Draw white cells with borders
            for (int c = 0; c < 6; c++) {
                float cellX = colX[c];
                float cellW = PnbLayout.COL_WIDTHS[c];

                canvas.saveState();
                canvas.setFillColor(new DeviceRgb(255, 255, 255));
                canvas.rectangle(cellX, rowBot, cellW, PnbLayout.ROW_HEIGHT);
                canvas.fill();
                canvas.setStrokeColor(COLOR_BLACK);
                canvas.setLineWidth(0.75f);
                canvas.rectangle(cellX, rowBot, cellW, PnbLayout.ROW_HEIGHT);
                canvas.stroke();
                canvas.restoreState();
            }

            // Col 0: Date (centered)
            String dateStr = formatPnbDate(tx.valueDate());
            float dateW = fontArialMT.getWidth(dateStr, 7.50f);
            drawText(canvas, dateStr, colX[0] + (PnbLayout.COL_WIDTHS[0] - dateW) / 2f, rowBot + 8.5f, fontArialMT, 7.50f);

            // Col 1: Cheque Number (empty unless an actual <= 6 digit cheque number)
            String chq = (tx.refNo() != null && tx.refNo().length() <= 6 && tx.refNo().matches("\\d+")) ? tx.refNo() : "";
            if (!chq.isEmpty()) {
                float chqW = fontArialMT.getWidth(chq, 7.50f);
                drawText(canvas, chq, colX[1] + (PnbLayout.COL_WIDTHS[1] - chqW) / 2f, rowBot + 8.5f, fontArialMT, 7.50f);
            }

            // Col 2: Withdrawal (right-aligned)
            if (tx.debit() != null && tx.debit() > 0) {
                String wStr = formatIndian(tx.debit());
                float wW = fontArialMT.getWidth(wStr, 7.50f);
                drawText(canvas, wStr, colX[2] + PnbLayout.COL_WIDTHS[2] - wW - 5.0f, rowBot + 8.5f, fontArialMT, 7.50f);
            }

            // Col 3: Deposit (right-aligned)
            if (tx.credit() != null && tx.credit() > 0) {
                String dStr = formatIndian(tx.credit());
                float dW = fontArialMT.getWidth(dStr, 7.50f);
                drawText(canvas, dStr, colX[3] + PnbLayout.COL_WIDTHS[3] - dW - 5.0f, rowBot + 8.5f, fontArialMT, 7.50f);
            }

            // Col 4: Balance (right-aligned + " Cr.")
            String bStr = formatIndian(tx.balance()) + " Cr.";
            float bW = fontArialMT.getWidth(bStr, 7.50f);
            drawText(canvas, bStr, colX[4] + PnbLayout.COL_WIDTHS[4] - bW - 5.0f, rowBot + 8.5f, fontArialMT, 7.50f);

            // Col 5: Narration (left-aligned at x=389.59, wrapped)
            List<String> nLines = splitNarration(tx.details(), fontArialMT, 7.50f, PnbLayout.COL_WIDTHS[5] - 8.0f);
            if (nLines.size() == 1) {
                drawText(canvas, nLines.get(0), colX[5] + 4.09f, rowBot + 8.5f, fontArialMT, 7.50f);
            } else {
                drawText(canvas, nLines.get(0), colX[5] + 4.09f, rowBot + 13.0f, fontArialMT, 7.50f);
                drawText(canvas, nLines.get(1), colX[5] + 4.09f, rowBot + 4.0f, fontArialMT, 7.50f);
            }

            rowTop = rowBot;
        }
    }

    private void renderFooter(PdfCanvas canvas, PdfFont fontArialMT, int pageNum) {
        String footerText = "Page No - " + pageNum;
        drawText(canvas, footerText, 526.90f, PnbLayout.PAGE_HEIGHT - 828.0f, fontArialMT, 7.50f);
    }

    private void renderConcludingPage(PdfCanvas canvas, PdfFont fontArialMT, PdfFont fontArialBold,
                                      String accNum, int totalPages) {
        // Top Header: Account Statement For Account:XXXX
        String titleText = "Account Statement For Account:" + accNum;
        float titleW = fontArialMT.getWidth(titleText, 9.75f);
        drawText(canvas, titleText, (PnbLayout.PAGE_WIDTH - titleW) / 2f, PnbLayout.PAGE_HEIGHT - 15.0f, fontArialMT, 9.75f);

        // Black horizontal divider line at y = 384.0f from top
        float divY = PnbLayout.PAGE_HEIGHT - 384.0f;
        canvas.saveState();
        canvas.setStrokeColor(COLOR_BLACK);
        canvas.setLineWidth(0.75f);
        canvas.moveTo(0.0f, divY);
        canvas.lineTo(PnbLayout.PAGE_WIDTH, divY);
        canvas.stroke();
        canvas.restoreState();

        // Disclaimers text
        float textX = 22.68f;
        String[] disclaimers = {
            "Unless constituent notifies the bank immediately of any discrepancy found by him in his statement of Account, it will be taken that he has found the account correct.",
            "*COMPUTER GENERATED ENTERIES SHOWN IN THE STATEMENT OF ACCOUNT DO NOT REQUIRE ANY AUTHENTICATION / INITIAL FROM THE BANK OFFICIAL.PLEASE",
            "DO NOT ACCEPT ANY MANUAL ENTRY IN YOUR COMPUTER GENERATED STATEMENT OF ACCOUNT",
            "* PLEASE ENSURE THAT ALL THE CHEQUE LEAVES IN YOUR CUSTODY ARE DULY BRANDED WITH YOUR 16 DIGITS ACCOUNT NUMBER",
            "* CUSTOMERS ARE REQUESTED IN THEIR OWN INTEREST NOT TO ISSUE CHEQUES WITHOUT ADEQUATE CLEAR FUNDS /ARRANGEMENTS. SUCH CHEQUES CAN BE",
            "RETURNED WITHOUT MAKING ANY FURTHER REFERENCE TO THEM.",
            "* PLEASE MAINTAIN MINIMUM AVERAGE BALANCE,TO AVOID LEVY OF CHARGES."
        };

        float curY = PnbLayout.PAGE_HEIGHT - 392.5f;
        for (String d : disclaimers) {
            drawText(canvas, d, textX, curY, fontArialMT, 6.80f);
            curY -= 8.5f;
        }

        // Abbreviations Section
        curY -= 3.0f;
        drawText(canvas, "Abbreviations are as under:", textX, curY, fontArialBold, 6.80f);
        curY -= 8.5f;

        String abbr1 = "BR: Branch Name , Csh: Cash , Clg: Clearing , ISO: Inter Sol(##) | QAB:Quarterly Average Balances , LF Chg: Ledger Folio Charges , Intt: Interest , Chrg: Charges |";
        drawText(canvas, abbr1, textX, curY, fontArialMT, 6.80f);
        curY -= 8.5f;

        String abbr2 = "Ret:Returning , Chq: Cheque , SI: Standing Instruction , Stk Stmt: Stock Statement , Trf: Transfer , POSP:POINT OF SALE";
        drawText(canvas, abbr2, textX, curY, fontArialMT, 6.80f);

        // Footer
        String footerText = "Page No - " + totalPages;
        drawText(canvas, footerText, 522.7f, PnbLayout.PAGE_HEIGHT - 828.0f, fontArialMT, 7.50f);
    }

    private void drawText(PdfCanvas canvas, String text, float x, float y, PdfFont font, float fontSize) {
        if (text == null || text.isEmpty()) return;
        canvas.saveState();
        canvas.beginText();
        canvas.setFontAndSize(font, fontSize);
        canvas.setFillColor(COLOR_BLACK);
        canvas.moveText(x, y);
        canvas.showText(text);
        canvas.endText();
        canvas.restoreState();
    }

    private void drawField(PdfCanvas canvas, String label, String value, float labelX, float valueX, float y, PdfFont font, float fontSize) {
        drawText(canvas, label, labelX, y, font, fontSize);
        drawText(canvas, value, valueX, y, font, fontSize);
    }

    private List<String> splitNarration(String raw, PdfFont font, float fontSize, float maxWidth) {
        List<String> lines = new ArrayList<>();
        if (raw == null || raw.isBlank()) {
            lines.add("");
            return lines;
        }
        String clean = raw.trim().replace("\r\n", " ").replace("\n", " ");
        if (font.getWidth(clean, fontSize) <= maxWidth) {
            lines.add(clean);
            return lines;
        }

        int bestBreak = -1;
        for (int i = 24; i <= Math.min(clean.length(), 40); i++) {
            char c = clean.charAt(i - 1);
            if (c == '/' || c == ' ' || c == '*' || c == '-') {
                bestBreak = i;
            }
        }
        if (bestBreak == -1) {
            bestBreak = Math.min(clean.length(), 38);
        }

        lines.add(clean.substring(0, bestBreak).trim());
        String rest = clean.substring(bestBreak).trim();
        lines.add(rest);
        return lines;
    }

    private String formatPnbDate(String rawDate) {
        if (rawDate == null || rawDate.isBlank()) return "24/07/2025";
        String s = rawDate.trim();
        String[] parts = s.split("[-/ ]");
        if (parts.length == 3) {
            if (parts[0].length() == 4) {
                return String.format("%02d/%02d/%s", Integer.parseInt(parts[2]), Integer.parseInt(parts[1]), parts[0]);
            } else if (parts[2].length() == 4) {
                return String.format("%02d/%02d/%s", Integer.parseInt(parts[0]), parseMonthNum(parts[1]), parts[2]);
            }
        }
        return s;
    }

    private int parseMonthNum(String m) {
        if (m.matches("\\d+")) return Integer.parseInt(m);
        String[] months = {"jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"};
        String lower = m.toLowerCase();
        for (int i = 0; i < months.length; i++) {
            if (lower.startsWith(months[i])) return i + 1;
        }
        return 1;
    }

    public static String formatIndian(double val) {
        long whole = (long) Math.floor(Math.abs(val));
        long dec = Math.round((Math.abs(val) - whole) * 100);
        String s = Long.toString(whole);
        if (s.length() <= 3) {
            return String.format("%s.%02d", s, dec);
        }
        String last3 = s.substring(s.length() - 3);
        String rest = s.substring(0, s.length() - 3);
        StringBuilder sb = new StringBuilder();
        int count = 0;
        for (int i = rest.length() - 1; i >= 0; i--) {
            if (count > 0 && count % 2 == 0) {
                sb.insert(0, ",");
            }
            sb.insert(0, rest.charAt(i));
            count++;
        }
        return sb.toString() + "," + last3 + String.format(".%02d", dec);
    }

    private byte[] loadResourceBytes(String path) {
        try (InputStream in = getClass().getResourceAsStream(path)) {
            if (in == null) return null;
            return in.readAllBytes();
        } catch (Exception e) {
            return null;
        }
    }
}
