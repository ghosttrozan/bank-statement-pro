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
import java.text.NumberFormat;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;

/**
 * Pixel-accurate Kotak Mahindra Bank Statement Template.
 * Exact replication of official Kotak statements (21XXXXX953_01-02-2026_12-08-2026.pdf).
 */
public class KotakTemplate implements StatementTemplate {

    private static final String[] MONTH_NAMES = {
        "Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"
    };

    private static final DateTimeFormatter GEN_DATE_FMT = DateTimeFormatter.ofPattern("dd MMM yyyy, HH:mm", Locale.ENGLISH);
    private static final NumberFormat CURRENCY_FMT = NumberFormat.getNumberInstance(new Locale("en", "IN"));

    static {
        CURRENCY_FMT.setMinimumFractionDigits(2);
        CURRENCY_FMT.setMaximumFractionDigits(2);
    }

    @Override
    public byte[] render(StatementRecord record) throws java.io.IOException {
        return render(record, null);
    }

    @Override
    public byte[] render(StatementRecord record, WriterProperties writerProperties) throws java.io.IOException {
        ByteArrayOutputStream out = new ByteArrayOutputStream();
        PdfWriter writer = writerProperties != null ? new PdfWriter(out, writerProperties) : new PdfWriter(out);

        try (PdfDocument pdfDoc = new PdfDocument(writer)) {
            PdfFont fontRegular = PdfFontFactory.createFont(StandardFonts.HELVETICA);
            PdfFont fontBold    = PdfFontFactory.createFont(StandardFonts.HELVETICA_BOLD);

            byte[] headerBytes = loadResourceBytes("/logos/kotak_header.jpeg");

            List<Transaction> transactions = record.transactions() != null ? record.transactions() : List.of();

            String startDateStr = transactions.isEmpty() ? "01 Feb 2026" : formatDisplayDate(transactions.get(0).valueDate());
            String endDateStr   = transactions.isEmpty() ? "12 Aug 2026" : formatDisplayDate(transactions.get(transactions.size() - 1).valueDate());
            String periodStr    = startDateStr + " - " + endDateStr;

            String accNum = record.customerDetails().accountNumber() != null && !record.customerDetails().accountNumber().isBlank()
                    ? record.customerDetails().accountNumber() : "2113956953";

            double openingBal = record.accountInfo() != null ? record.accountInfo().openingBalance() : 1000.00;

            String genTimestampStr = LocalDateTime.now().format(GEN_DATE_FMT);

            List<List<Transaction>> pages = splitTransactions(transactions);
            int txPagesCount = Math.max(1, pages.size());

            boolean separateLegendPage = false;
            List<Transaction> lastPageTxs = pages.get(txPagesCount - 1);
            if (txPagesCount == 1 && lastPageTxs.size() > 15) {
                separateLegendPage = true;
            } else if (txPagesCount > 1 && lastPageTxs.size() > 24) {
                separateLegendPage = true;
            }

            int totalPages = txPagesCount + (separateLegendPage ? 1 : 0);

            int currentSerial = 1;

            for (int pIdx = 0; pIdx < txPagesCount; pIdx++) {
                int pageNum = pIdx + 1;
                boolean isFirstPage = (pIdx == 0);
                boolean isLastPage  = (pIdx == txPagesCount - 1 && !separateLegendPage);
                List<Transaction> pageTxs = pages.get(pIdx);

                PdfPage page = pdfDoc.addNewPage(new PageSize(KotakLayout.PAGE_WIDTH, KotakLayout.PAGE_HEIGHT));
                PdfCanvas canvas = new PdfCanvas(page);

                if (isFirstPage) {
                    renderPage1Header(canvas, record, headerBytes, fontRegular, fontBold, accNum, periodStr);
                    float tableEndY = renderTable(canvas, pageTxs, fontRegular, fontBold, 329.5f, true, openingBal, currentSerial);
                    currentSerial += pageTxs.size();

                    if (isLastPage) {
                        renderLegendBox(canvas, fontRegular, tableEndY + 15.0f);
                    }
                } else {
                    renderContinuationHeader(canvas, record, fontRegular, fontBold, accNum, periodStr);
                    float tableEndY = renderTable(canvas, pageTxs, fontRegular, fontBold, 85.5f, false, openingBal, currentSerial);
                    currentSerial += pageTxs.size();

                    if (isLastPage) {
                        renderLegendBox(canvas, fontRegular, tableEndY + 15.0f);
                    }
                }

                renderFooter(canvas, fontRegular, genTimestampStr, pageNum, totalPages);
            }

            if (separateLegendPage) {
                int pageNum = totalPages;
                PdfPage lastPage = pdfDoc.addNewPage(new PageSize(KotakLayout.PAGE_WIDTH, KotakLayout.PAGE_HEIGHT));
                PdfCanvas lastCanvas = new PdfCanvas(lastPage);

                renderContinuationHeader(lastCanvas, record, fontRegular, fontBold, accNum, periodStr);
                renderLegendBox(lastCanvas, fontRegular, 80.0f);
                renderFooter(lastCanvas, fontRegular, genTimestampStr, pageNum, totalPages);
            }
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

        // Page 1: up to 24 rows
        int p1Count = Math.min(KotakLayout.PAGE_1_ROWS, total);
        pages.add(new ArrayList<>(all.subList(0, p1Count)));
        idx += p1Count;

        // Continuation pages: up to 40 rows
        while (idx < total) {
            int end = Math.min(idx + KotakLayout.PAGE_N_ROWS, total);
            pages.add(new ArrayList<>(all.subList(idx, end)));
            idx = end;
        }

        return pages;
    }

    private void renderPage1Header(PdfCanvas canvas, StatementRecord record, byte[] headerBytes,
                                   PdfFont fontRegular, PdfFont fontBold,
                                   String accNum, String periodStr) {
        CustomerDetails cust = record.customerDetails();
        BranchDetails branch = record.branchDetails();
        float H = KotakLayout.PAGE_HEIGHT;

        // 1. Full-width Header Banner (0, 0, width 595.0, height 74.85)
        if (headerBytes != null) {
            try {
                canvas.addImageWithTransformationMatrix(ImageDataFactory.create(headerBytes),
                        KotakLayout.PAGE_WIDTH, 0, 0, 74.85f, 0, H - 74.85f);
            } catch (Exception ignored) {}
        }



        // 3. Title: Account Statement (25.0pt bold) + Period (11.0pt regular)
        canvas.saveState();
        canvas.setFillColor(KotakLayout.COLOR_BLACK);
        canvas.beginText();
        canvas.setFontAndSize(fontBold, 25.0f);
        canvas.moveText(36.0f, H - 98.0f - 20.0f);
        canvas.showText("Account Statement");
        canvas.endText();

        canvas.beginText();
        canvas.setFontAndSize(fontRegular, 11.0f);
        canvas.moveText(36.0f, H - 128.0f - 9.0f);
        canvas.showText(periodStr);
        canvas.endText();

        // 4. Dossier Left Side (x = 38.0)
        String custName = cust.accountHolderName() != null ? cust.accountHolderName() : "Mishi Hasan";
        String crn = "CRN xxxxxx" + (accNum.length() >= 3 ? accNum.substring(accNum.length() - 3) : "175");

        canvas.beginText();
        canvas.setFontAndSize(fontBold, 14.0f);
        canvas.moveText(38.0f, H - 168.0f - 11.0f);
        canvas.showText(custName);
        canvas.endText();

        canvas.setFillColor(KotakLayout.COLOR_TEXT_GREY);
        canvas.beginText();
        canvas.setFontAndSize(fontRegular, 11.0f);
        canvas.moveText(38.0f, H - 187.5f - 9.0f);
        canvas.showText(crn);
        canvas.endText();

        // Address Lines
        canvas.setFillColor(KotakLayout.COLOR_BLACK);
        String addr = cust.address() != null ? cust.address() : "01,Housing Board Near Police C";
        String city  = cust.city() != null ? cust.city() : "Bhopal";
        String pin   = cust.pinCode() != null ? cust.pinCode() : "462038";

        float adrY = 222.5f;
        String[] addrParts = addr.split("[,\\n]+");
        for (String part : addrParts) {
            String p = part.trim();
            if (!p.isEmpty() && adrY < 290.0f) {
                canvas.beginText();
                canvas.setFontAndSize(fontRegular, 9.0f);
                canvas.moveText(38.0f, H - adrY - 7.5f);
                canvas.showText(p);
                canvas.endText();
                adrY += 15.0f;
            }
        }
        canvas.beginText();
        canvas.setFontAndSize(fontRegular, 9.0f);
        canvas.moveText(38.0f, H - adrY - 7.5f);
        canvas.showText(city + " - " + pin);
        canvas.endText();
        adrY += 15.0f;

        canvas.beginText();
        canvas.setFontAndSize(fontRegular, 9.0f);
        canvas.moveText(38.0f, H - adrY - 7.5f);
        canvas.showText("Madhya Pradesh - India");
        canvas.endText();

        // MICR & IFSC Code
        String micr = branch.micrCode() != null ? branch.micrCode() : "462485007";
        String ifsc = branch.ifscCode() != null ? branch.ifscCode() : "KKBK0005891";

        canvas.setFillColor(KotakLayout.COLOR_TEXT_GREY);
        canvas.beginText();
        canvas.setFontAndSize(fontRegular, 9.0f);
        canvas.moveText(38.0f, H - 308.5f - 7.5f);
        canvas.showText("MICR  ");
        canvas.setFillColor(KotakLayout.COLOR_BLACK);
        canvas.setFontAndSize(fontBold, 9.0f);
        canvas.moveText(25.0f, 0);
        canvas.showText(micr);

        canvas.setFillColor(KotakLayout.COLOR_TEXT_GREY);
        canvas.setFontAndSize(fontRegular, 9.0f);
        canvas.moveText(55.0f, 0);
        canvas.showText("    IFSC Code  ");
        canvas.setFillColor(KotakLayout.COLOR_BLACK);
        canvas.setFontAndSize(fontBold, 9.0f);
        canvas.moveText(60.0f, 0);
        canvas.showText(ifsc);
        canvas.endText();

        // 5. Dossier Right Side (x = 347.5)
        float rX = 347.5f;
        String branchName = branch.branchName() != null ? branch.branchName() : "Bhopal - Hamedia Road";
        String accType = record.accountInfo() != null && record.accountInfo().accountType() != null
                ? record.accountInfo().accountType() : "Savings";

        renderLabelValue(canvas, fontRegular, fontBold, rX, H - 168.0f - 7.5f, "Account No.  ", accNum);
        renderLabelValue(canvas, fontRegular, fontBold, rX, H - 184.0f - 7.5f, "Account Type   ", accType);
        renderLabelValue(canvas, fontRegular, fontBold, rX, H - 200.0f - 7.5f, "Branch  ", branchName);
        renderLabelValue(canvas, fontRegular, fontBold, rX, H - 226.0f - 7.5f, "Account Status  ", "Active");
        renderLabelValue(canvas, fontRegular, fontBold, rX, H - 242.0f - 7.5f, "Nominee Registered  ", "Yes");
        renderLabelValue(canvas, fontRegular, fontBold, rX, H - 268.0f - 7.5f, "Currency  ", "INDIAN RUPEE");

        canvas.restoreState();
    }

    private void renderContinuationHeader(PdfCanvas canvas, StatementRecord record,
                                          PdfFont fontRegular, PdfFont fontBold,
                                          String accNum, String periodStr) {
        CustomerDetails cust = record.customerDetails();
        float H = KotakLayout.PAGE_HEIGHT;



        String custName = cust.accountHolderName() != null ? cust.accountHolderName() : "Mishi Hasan";

        canvas.setFillColor(KotakLayout.COLOR_BLACK);
        canvas.beginText();
        canvas.setFontAndSize(fontBold, 9.0f);
        canvas.moveText(36.0f, H - 26.0f - 7.5f);
        canvas.showText(custName);
        canvas.endText();

        canvas.beginText();
        canvas.setFontAndSize(fontRegular, 9.0f);
        canvas.moveText(36.0f, H - 38.0f - 7.5f);
        canvas.showText("Account No.  " + accNum);
        canvas.endText();

        canvas.beginText();
        canvas.setFontAndSize(fontRegular, 9.0f);
        canvas.moveText(36.0f, H - 50.0f - 7.5f);
        canvas.showText("Account Statement  " + periodStr);
        canvas.endText();

        canvas.restoreState();
    }

    private void renderLabelValue(PdfCanvas canvas, PdfFont fontRegular, PdfFont fontBold,
                                  float x, float y, String label, String value) {
        canvas.setFillColor(KotakLayout.COLOR_TEXT_GREY);
        canvas.beginText();
        canvas.setFontAndSize(fontRegular, 9.0f);
        canvas.moveText(x, y);
        canvas.showText(label);
        float lw = fontRegular.getWidth(label, 9.0f);
        canvas.setFillColor(KotakLayout.COLOR_BLACK);
        canvas.setFontAndSize(fontBold, 9.0f);
        canvas.moveText(lw, 0);
        canvas.showText(value);
        canvas.endText();
    }

    private float renderTable(PdfCanvas canvas, List<Transaction> transactions,
                              PdfFont fontRegular, PdfFont fontBold, float startTopY,
                              boolean isFirstPage, double openingBal, int startSerial) {
        float H = KotakLayout.PAGE_HEIGHT;
        float W = KotakLayout.TABLE_WIDTH;

        // 1. Red Banner: Savings Account Transactions (height 25.0)
        canvas.saveState();
        canvas.setFillColor(KotakLayout.COLOR_KOTAK_RED);
        canvas.rectangle(KotakLayout.MARGIN_LEFT, H - startTopY - 25.0f, W, 25.0f);
        canvas.fill();

        String bannerText = "Savings Account Transactions";
        float bannerW = fontBold.getWidth(bannerText, 12.0f);
        canvas.setFillColor(KotakLayout.COLOR_WHITE);
        canvas.beginText();
        canvas.setFontAndSize(fontBold, 12.0f);
        canvas.moveText((KotakLayout.PAGE_WIDTH - bannerW) / 2f, H - startTopY - 17.5f);
        canvas.showText(bannerText);
        canvas.endText();

        // 2. Grey Header Bar (height 25.0)
        float hTopY = startTopY + 25.0f;
        canvas.setFillColor(KotakLayout.COLOR_HEADER_GREY);
        canvas.rectangle(KotakLayout.MARGIN_LEFT, H - hTopY - 25.0f, W, 25.0f);
        canvas.fill();

        // Vertical white divider strokes inside header
        canvas.setStrokeColor(KotakLayout.COLOR_WHITE);
        canvas.setLineWidth(0.6f);
        for (int i = 1; i < KotakLayout.COL_X.length - 1; i++) {
            float x = KotakLayout.COL_X[i];
            canvas.moveTo(x, H - hTopY);
            canvas.lineTo(x, H - hTopY - 25.0f);
        }
        canvas.stroke();

        // Header Labels (white 9.0pt)
        canvas.setFillColor(KotakLayout.COLOR_WHITE);
        float hTextY = hTopY + 16.0f;

        canvas.beginText();
        canvas.setFontAndSize(fontRegular, 9.0f);
        canvas.moveText(44.0f, H - hTextY);
        canvas.showText("#");
        canvas.endText();

        canvas.beginText();
        canvas.setFontAndSize(fontRegular, 9.0f);
        canvas.moveText(75.18f, H - hTextY);
        canvas.showText("Date");
        canvas.endText();

        canvas.beginText();
        canvas.setFontAndSize(fontRegular, 9.0f);
        canvas.moveText(124.19f, H - hTextY);
        canvas.showText("Description");
        canvas.endText();

        canvas.beginText();
        canvas.setFontAndSize(fontRegular, 9.0f);
        canvas.moveText(279.66f, H - hTextY);
        canvas.showText("Chq/Ref. No.");
        canvas.endText();

        canvas.beginText();
        canvas.setFontAndSize(fontRegular, 9.0f);
        canvas.moveText(354.85f, H - hTextY);
        canvas.showText("Withdrawal (Dr.)");
        canvas.endText();

        canvas.beginText();
        canvas.setFontAndSize(fontRegular, 9.0f);
        canvas.moveText(428.90f, H - hTextY);
        canvas.showText("Deposit (Cr.)");
        canvas.endText();

        canvas.beginText();
        canvas.setFontAndSize(fontRegular, 9.0f);
        canvas.moveText(497.95f, H - hTextY);
        canvas.showText("Balance");
        canvas.endText();

        // Header bottom divider line
        canvas.setStrokeColor(KotakLayout.COLOR_HEADER_GREY);
        canvas.setLineWidth(0.5f);
        canvas.moveTo(KotakLayout.MARGIN_LEFT, H - hTopY - 25.0f);
        canvas.lineTo(KotakLayout.MARGIN_LEFT + W, H - hTopY - 25.0f);
        canvas.stroke();

        float curRowTop = hTopY + 25.0f;

        // 3. Opening Balance Row (Only on Page 1)
        if (isFirstPage) {
            float opRowH = 13.7f;
            float textBaseline = H - curRowTop - 9.5f;

            canvas.setFillColor(KotakLayout.COLOR_BLACK);

            // Col 0: -
            canvas.beginText();
            canvas.setFontAndSize(fontRegular, 7.68f);
            canvas.moveText(44.0f, textBaseline);
            canvas.showText("-");
            canvas.endText();

            // Col 1: -
            canvas.beginText();
            canvas.setFontAndSize(fontRegular, 7.68f);
            canvas.moveText(80.0f, textBaseline);
            canvas.showText("-");
            canvas.endText();

            // Col 2: Opening Balance
            canvas.beginText();
            canvas.setFontAndSize(fontRegular, 7.68f);
            canvas.moveText(119.19f, textBaseline);
            canvas.showText("Opening Balance");
            canvas.endText();

            // Col 3: -
            canvas.beginText();
            canvas.setFontAndSize(fontRegular, 7.68f);
            canvas.moveText(285.0f, textBaseline);
            canvas.showText("-");
            canvas.endText();

            // Col 5: -
            canvas.beginText();
            canvas.setFontAndSize(fontRegular, 7.68f);
            canvas.moveText(435.0f, textBaseline);
            canvas.showText("-");
            canvas.endText();

            // Col 6: Balance amount
            String opBalStr = CURRENCY_FMT.format(openingBal);
            float opBalW = fontRegular.getWidth(opBalStr, 7.68f);
            canvas.beginText();
            canvas.setFontAndSize(fontRegular, 7.68f);
            canvas.moveText(559.0f - opBalW - 4.0f, textBaseline);
            canvas.showText(opBalStr);
            canvas.endText();

            // Bottom border
            canvas.setStrokeColor(KotakLayout.COLOR_HEADER_GREY);
            canvas.setLineWidth(0.5f);
            canvas.moveTo(KotakLayout.MARGIN_LEFT, H - curRowTop - opRowH);
            canvas.lineTo(KotakLayout.MARGIN_LEFT + W, H - curRowTop - opRowH);
            canvas.stroke();

            curRowTop += opRowH;
        }

        // 4. Transactions Rows
        int serial = startSerial;
        for (Transaction tx : transactions) {
            String desc = tx.details() != null ? tx.details() : "UPI Transaction";
            List<String> descLines = wrapText(desc, 30);
            boolean isDoubleLine = descLines.size() > 1;
            float rowH = isDoubleLine ? 21.36f : 13.68f;

            float textBaseline = H - curRowTop - 9.5f;

            canvas.setFillColor(KotakLayout.COLOR_BLACK);

            // Serial #
            canvas.beginText();
            canvas.setFontAndSize(fontRegular, 7.68f);
            canvas.moveText(39.0f, textBaseline);
            canvas.showText(String.valueOf(serial));
            canvas.endText();

            // Date
            String dtStr = formatDisplayDate(tx.valueDate());
            canvas.beginText();
            canvas.setFontAndSize(fontRegular, 7.68f);
            canvas.moveText(72.77f, textBaseline);
            canvas.showText(dtStr);
            canvas.endText();

            // Description
            canvas.beginText();
            canvas.setFontAndSize(fontRegular, 7.68f);
            canvas.moveText(119.19f, textBaseline);
            canvas.showText(descLines.get(0));
            canvas.endText();
            if (isDoubleLine) {
                canvas.beginText();
                canvas.setFontAndSize(fontRegular, 7.68f);
                canvas.moveText(119.19f, textBaseline - 8.0f);
                canvas.showText(descLines.get(1));
                canvas.endText();
            }

            // Chq/Ref. No.
            String refNo = tx.refNo() != null && !tx.refNo().isBlank() ? tx.refNo() : ("UPI-" + Math.abs(tx.hashCode() % 900000000000L + 100000000000L));
            canvas.beginText();
            canvas.setFontAndSize(fontRegular, 7.68f);
            canvas.moveText(274.66f, textBaseline);
            canvas.showText(refNo);
            canvas.endText();

            // Withdrawal (Dr.)
            if (tx.debit() != null && tx.debit() > 0) {
                String wStr = CURRENCY_FMT.format(tx.debit());
                float wWidth = fontRegular.getWidth(wStr, 7.68f);
                canvas.beginText();
                canvas.setFontAndSize(fontRegular, 7.68f);
                canvas.moveText(420.9f - wWidth - 4.0f, textBaseline);
                canvas.showText(wStr);
                canvas.endText();
            }

            // Deposit (Cr.)
            if (tx.credit() != null && tx.credit() > 0) {
                String dStr = CURRENCY_FMT.format(tx.credit());
                float dWidth = fontRegular.getWidth(dStr, 7.68f);
                canvas.beginText();
                canvas.setFontAndSize(fontRegular, 7.68f);
                canvas.moveText(490.0f - dWidth - 4.0f, textBaseline);
                canvas.showText(dStr);
                canvas.endText();
            }

            // Balance
            String bStr = CURRENCY_FMT.format(tx.balance());
            float bWidth = fontRegular.getWidth(bStr, 7.68f);
            canvas.beginText();
            canvas.setFontAndSize(fontRegular, 7.68f);
            canvas.moveText(559.0f - bWidth - 4.0f, textBaseline);
            canvas.showText(bStr);
            canvas.endText();

            // Bottom border
            canvas.setStrokeColor(KotakLayout.COLOR_HEADER_GREY);
            canvas.setLineWidth(0.5f);
            canvas.moveTo(KotakLayout.MARGIN_LEFT, H - curRowTop - rowH);
            canvas.lineTo(KotakLayout.MARGIN_LEFT + W, H - curRowTop - rowH);
            canvas.stroke();

            curRowTop += rowH;
            serial++;
        }

        canvas.restoreState();
        return curRowTop;
    }

    private void renderLegendBox(PdfCanvas canvas, PdfFont fontRegular, float topY) {
        float H = KotakLayout.PAGE_HEIGHT;
        float W = KotakLayout.TABLE_WIDTH;
        float left = KotakLayout.MARGIN_LEFT;
        float midX = (left + left + W) / 2f;
        float right = left + W;

        String[][] legendRows = {
            {"MB - Transaction done on Mobile banking", "Int. Pd. - Interest credited on your savings account balance"},
            {"NACH - National Automated Clearing House", "Sweep transfer to - Booking new Term Deposit"},
            {"NEFT - National Electronic Funds Transfer", "Sweep transfer from - Broken existing Term Deposit"}
        };

        canvas.saveState();
        canvas.setStrokeColor(KotakLayout.COLOR_HEADER_GREY);
        canvas.setLineWidth(0.5f);

        float curY = topY;
        for (String[] r : legendRows) {
            float rowH = 13.7f;

            canvas.moveTo(left, H - curY);
            canvas.lineTo(right, H - curY);
            canvas.lineTo(right, H - curY - rowH);
            canvas.lineTo(left, H - curY - rowH);
            canvas.closePath();
            canvas.stroke();

            canvas.moveTo(midX, H - curY);
            canvas.lineTo(midX, H - curY - rowH);
            canvas.stroke();

            canvas.setFillColor(KotakLayout.COLOR_BLACK);
            canvas.beginText();
            canvas.setFontAndSize(fontRegular, 7.68f);
            canvas.moveText(left + 3.0f, H - curY - 9.5f);
            canvas.showText(r[0]);
            canvas.endText();

            canvas.beginText();
            canvas.setFontAndSize(fontRegular, 7.68f);
            canvas.moveText(midX + 3.0f, H - curY - 9.5f);
            canvas.showText(r[1]);
            canvas.endText();

            curY += rowH;
        }

        canvas.restoreState();
    }

    private void renderFooter(PdfCanvas canvas, PdfFont fontRegular, String genTimestampStr,
                              int pageNum, int totalPages) {
        float H = KotakLayout.PAGE_HEIGHT;

        canvas.saveState();
        canvas.setFillColor(KotakLayout.COLOR_TEXT_GREY);

        String genText = "Statement Generated on " + genTimestampStr;
        canvas.beginText();
        canvas.setFontAndSize(fontRegular, 9.6f);
        canvas.moveText(36.0f, H - 816.4f);
        canvas.showText(genText);
        canvas.endText();

        String pText = "Page " + pageNum + " of  " + totalPages;
        canvas.beginText();
        canvas.setFontAndSize(fontRegular, 10.0f);
        canvas.moveText(515.0f, H - 816.0f);
        canvas.showText(pText);
        canvas.endText();

        canvas.restoreState();
    }

    private List<String> wrapText(String text, int maxChars) {
        List<String> list = new ArrayList<>();
        if (text == null || text.isBlank()) {
            list.add("");
            return list;
        }
        if (text.length() <= maxChars) {
            list.add(text);
            return list;
        }
        list.add(text.substring(0, maxChars));
        int remaining = text.length() - maxChars;
        list.add(text.substring(maxChars, maxChars + Math.min(remaining, maxChars)));
        return list;
    }

    private String formatDisplayDate(String rawDate) {
        if (rawDate == null || rawDate.isBlank()) return "01 Feb 2026";
        String s = rawDate.trim();
        String[] parts = s.split("[-/ ]");
        if (parts.length == 3) {
            try {
                if (parts[0].length() == 4) { // yyyy-mm-dd
                    int day = Integer.parseInt(parts[2]);
                    int month = Integer.parseInt(parts[1]);
                    int year = Integer.parseInt(parts[0]);
                    return String.format(Locale.ENGLISH, "%02d %s %d", day, MONTH_NAMES[Math.max(0, Math.min(11, month - 1))], year);
                } else if (parts[2].length() == 4) { // dd-mm-yyyy
                    int day = Integer.parseInt(parts[0]);
                    int month = parseMonth(parts[1]);
                    int year = Integer.parseInt(parts[2]);
                    return String.format(Locale.ENGLISH, "%02d %s %d", day, MONTH_NAMES[Math.max(0, Math.min(11, month - 1))], year);
                }
            } catch (Exception ignored) {}
        }
        return s;
    }

    private int parseMonth(String m) {
        if (m.matches("\\d+")) return Integer.parseInt(m);
        String lower = m.toLowerCase();
        for (int i = 0; i < MONTH_NAMES.length; i++) {
            if (lower.startsWith(MONTH_NAMES[i].toLowerCase())) return i + 1;
        }
        return 1;
    }

    private byte[] loadResourceBytes(String path) {
        try (InputStream is = getClass().getResourceAsStream(path)) {
            if (is == null) return null;
            return is.readAllBytes();
        } catch (Exception e) {
            return null;
        }
    }
}
