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
import java.util.Locale;

/**
 * Pixel-accurate IndusInd Bank (INDIE) Statement Template.
 * Exact replication of official IndusInd INDIE statements (ADHOC10092026211406-100296834836.pdf).
 */
public class IndusindTemplate implements StatementTemplate {

    private static final String[] MONTH_NAMES = {
        "Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"
    };

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

            byte[] logoBytes = loadResourceBytes("/logos/indusind_logo.png");

            List<Transaction> transactions = record.transactions() != null ? record.transactions() : List.of();

            String startDateStr = transactions.isEmpty() ? "01 Feb 2026" : formatDisplayDate(transactions.get(0).valueDate());
            String endDateStr   = transactions.isEmpty() ? "08 Sep 2026" : formatDisplayDate(transactions.get(transactions.size() - 1).valueDate());
            String periodStr    = startDateStr + " - " + endDateStr;

            String accNum = record.customerDetails().accountNumber() != null && !record.customerDetails().accountNumber().isBlank()
                    ? record.customerDetails().accountNumber() : "100296834836";

            List<List<Transaction>> pages = splitTransactions(transactions);
            int totalPages = Math.max(1, pages.size());

            // If the last page has > 11 rows, add a dedicated page for disclaimers so it doesn't overflow
            boolean needSeparateDisclaimerPage = false;
            List<Transaction> lastPageTxs = pages.get(totalPages - 1);
            if (lastPageTxs.size() > 11) {
                needSeparateDisclaimerPage = true;
            }

            for (int pIdx = 0; pIdx < totalPages; pIdx++) {
                boolean isFirstPage = (pIdx == 0);
                boolean isLastPage  = (pIdx == totalPages - 1 && !needSeparateDisclaimerPage);
                List<Transaction> pageTxs = pages.get(pIdx);

                PdfPage page = pdfDoc.addNewPage(new PageSize(IndusindLayout.PAGE_WIDTH, IndusindLayout.PAGE_HEIGHT));
                PdfCanvas canvas = new PdfCanvas(page);

                if (isFirstPage) {
                    renderPage1Header(canvas, record, logoBytes, fontRegular, fontBold, accNum, periodStr, endDateStr);
                    float tableTopY = 510.8f;
                    renderTable(canvas, pageTxs, fontRegular, fontBold, tableTopY);
                    if (isLastPage) {
                        float tableBottomY = tableTopY + IndusindLayout.TABLE_HEADER_HEIGHT + pageTxs.size() * IndusindLayout.ROW_HEIGHT;
                        renderDisclaimers(canvas, fontRegular, fontBold, tableBottomY + 25.0f, endDateStr);
                    }
                } else {
                    float tableTopY = 47.2f;
                    renderTable(canvas, pageTxs, fontRegular, fontBold, tableTopY);
                    if (isLastPage) {
                        float tableBottomY = tableTopY + IndusindLayout.TABLE_HEADER_HEIGHT + pageTxs.size() * IndusindLayout.ROW_HEIGHT;
                        renderDisclaimers(canvas, fontRegular, fontBold, tableBottomY + 25.0f, endDateStr);
                    }
                }
            }

            if (needSeparateDisclaimerPage) {
                PdfPage lastPage = pdfDoc.addNewPage(new PageSize(IndusindLayout.PAGE_WIDTH, IndusindLayout.PAGE_HEIGHT));
                PdfCanvas lastCanvas = new PdfCanvas(lastPage);
                renderDisclaimers(lastCanvas, fontRegular, fontBold, 60.0f, endDateStr);
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

        // Page 1: up to 5 rows
        int p1Count = Math.min(IndusindLayout.PAGE_1_ROWS, total);
        pages.add(new ArrayList<>(all.subList(0, p1Count)));
        idx += p1Count;

        // Continuation pages: up to 17 rows
        while (idx < total) {
            int end = Math.min(idx + IndusindLayout.PAGE_N_ROWS, total);
            pages.add(new ArrayList<>(all.subList(idx, end)));
            idx = end;
        }

        return pages;
    }

    private void renderPage1Header(PdfCanvas canvas, StatementRecord record, byte[] logoBytes,
                                   PdfFont fontRegular, PdfFont fontBold,
                                   String accNum, String periodStr, String asOfDateStr) {
        CustomerDetails cust = record.customerDetails();
        BranchDetails branch = record.branchDetails();

        float H = IndusindLayout.PAGE_HEIGHT;

        // 1. Cream Background Box for Address/Header (36.0, 36.0, width 523.0, height 185.7)
        canvas.saveState();
        canvas.setFillColor(IndusindLayout.COLOR_CREAM_BG);
        canvas.roundRectangle(36.0f, H - 221.7f, 523.0f, 185.7f, 8.0f);
        canvas.fill();
        canvas.restoreState();

        // 2. Red Pill Badge for "Account Statement" (37.5, 41.5, width 194.3, height 36.8)
        canvas.saveState();
        canvas.setFillColor(IndusindLayout.COLOR_RED);
        canvas.roundRectangle(37.5f, H - 78.3f, 194.3f, 36.8f, 6.0f);
        canvas.fill();
        canvas.restoreState();

        // Text inside Pill Badge
        canvas.saveState();
        canvas.setFillColor(IndusindLayout.COLOR_WHITE);
        canvas.beginText();
        canvas.setFontAndSize(fontBold, 10.5f);
        canvas.moveText(52.5f, H - 46.9f - 8.5f);
        canvas.showText("Account Statement");
        canvas.endText();

        canvas.beginText();
        canvas.setFontAndSize(fontRegular, 9.0f);
        canvas.moveText(52.5f, H - 61.8f - 7.5f);
        canvas.showText(accNum);
        canvas.endText();
        canvas.restoreState();

        // 3. Logo (441.4, 52.5, width 86.9, height 11.2)
        if (logoBytes != null) {
            try {
                canvas.addImageWithTransformationMatrix(ImageDataFactory.create(logoBytes),
                        86.9f, 0, 0, 11.2f, 441.4f, H - 52.5f - 11.2f);
            } catch (Exception ignored) {}
        }

        // 4. Customer Address block inside cream container (Left)
        String custName = cust.accountHolderName() != null ? cust.accountHolderName().toUpperCase() : "SUNIL";
        String addr1 = cust.address() != null ? cust.address().toUpperCase() : "HOUSE NO 108 MMG ROAD";
        String city  = cust.city() != null ? cust.city().toUpperCase() : "INDORE";
        String pin   = cust.pinCode() != null ? cust.pinCode() : "452010";

        canvas.saveState();
        canvas.setFillColor(IndusindLayout.COLOR_BLACK);

        canvas.beginText();
        canvas.setFontAndSize(fontBold, 10.5f);
        canvas.moveText(53.2f, H - 102.0f - 8.5f);
        canvas.showText(custName);
        canvas.endText();

        float curY = 119.1f;
        String[] addrParts = addr1.split("[,\\n]+");
        for (String part : addrParts) {
            String p = part.trim();
            if (!p.isEmpty()) {
                canvas.beginText();
                canvas.setFontAndSize(fontRegular, 9.0f);
                canvas.moveText(53.2f, H - curY - 7.5f);
                canvas.showText(p);
                canvas.endText();
                curY += 15.0f;
            }
        }
        // City & Pin
        canvas.beginText();
        canvas.setFontAndSize(fontRegular, 9.0f);
        canvas.moveText(53.2f, H - curY - 7.5f);
        canvas.showText(city);
        canvas.endText();
        curY += 15.0f;

        canvas.beginText();
        canvas.setFontAndSize(fontRegular, 9.0f);
        canvas.moveText(53.2f, H - curY - 7.5f);
        canvas.showText(pin);
        canvas.endText();

        // 5. Right metadata inside cream container
        canvas.beginText();
        canvas.setFontAndSize(fontBold, 9.0f);
        canvas.moveText(299.0f, H - 101.9f - 7.5f);
        canvas.showText("Date:");
        canvas.setFontAndSize(fontRegular, 9.0f);
        canvas.moveText(21.8f, 0);
        canvas.showText(" " + asOfDateStr);
        canvas.endText();

        canvas.beginText();
        canvas.setFontAndSize(fontBold, 9.0f);
        canvas.moveText(299.0f, H - 114.7f - 7.5f);
        canvas.showText("Period: ");
        float prW = fontBold.getWidth("Period: ", 9.0f);
        canvas.setFontAndSize(fontRegular, 9.0f);
        canvas.moveText(prW, 0);
        canvas.showText(periodStr);
        canvas.endText();
        canvas.restoreState();

        // 6. Customer Details Card (y = 270.5, h = 60.9)
        canvas.saveState();
        canvas.beginText();
        canvas.setFontAndSize(fontBold, 10.5f);
        canvas.setFillColor(IndusindLayout.COLOR_BLACK);
        canvas.moveText(51.0f, H - 252.7f - 8.5f);
        canvas.showText("Customer Details");
        canvas.endText();

        float cY = 270.5f;
        float cH = 60.9f;
        // Header pink fill
        canvas.setFillColor(IndusindLayout.COLOR_LIGHT_PINK);
        canvas.rectangle(51.5f, H - cY - 28.0f, 492.0f, 27.5f);
        canvas.fill();
        // Red outline
        canvas.setStrokeColor(IndusindLayout.COLOR_RED);
        canvas.setLineWidth(1.0f);
        canvas.roundRectangle(51.0f, H - cY - cH, 493.0f, cH, 5.0f);
        canvas.stroke();

        // Header labels
        canvas.setFillColor(IndusindLayout.COLOR_BLACK);
        canvas.beginText();
        canvas.setFontAndSize(fontBold, 9.0f);
        canvas.moveText(76.1f, H - 281.4f - 7.5f);
        canvas.showText("Name");
        canvas.endText();

        canvas.beginText();
        canvas.setFontAndSize(fontBold, 9.0f);
        canvas.moveText(271.2f, H - 281.4f - 7.5f);
        canvas.showText("Holding Status");
        canvas.endText();

        canvas.beginText();
        canvas.setFontAndSize(fontBold, 9.0f);
        canvas.moveText(430.8f, H - 281.4f - 7.5f);
        canvas.showText("Customer ID");
        canvas.endText();

        // Value row
        String custId = cust.cifNumber() != null ? cust.cifNumber() : "6XXXX602";
        canvas.beginText();
        canvas.setFontAndSize(fontRegular, 9.0f);
        canvas.moveText(76.1f, H - 309.3f - 7.5f);
        canvas.showText(custName);
        canvas.endText();

        canvas.beginText();
        canvas.setFontAndSize(fontRegular, 9.0f);
        canvas.moveText(271.2f, H - 309.3f - 7.5f);
        canvas.showText("Primary Holder");
        canvas.endText();

        canvas.beginText();
        canvas.setFontAndSize(fontRegular, 9.0f);
        canvas.moveText(430.8f, H - 309.3f - 7.5f);
        canvas.showText(custId);
        canvas.endText();
        canvas.restoreState();

        // 7. Account Summary Card (y = 365.2, h = 61.0)
        canvas.saveState();
        canvas.beginText();
        canvas.setFontAndSize(fontBold, 10.5f);
        canvas.setFillColor(IndusindLayout.COLOR_BLACK);
        canvas.moveText(51.0f, H - 347.4f - 8.5f);
        canvas.showText("Account Summary");
        canvas.endText();

        float asY = 365.2f;
        float asH = 61.0f;
        // Header pink fill
        canvas.setFillColor(IndusindLayout.COLOR_LIGHT_PINK);
        canvas.rectangle(51.5f, H - asY - 28.0f, 492.0f, 27.5f);
        canvas.fill();
        // Red outline
        canvas.setStrokeColor(IndusindLayout.COLOR_RED);
        canvas.setLineWidth(1.0f);
        canvas.roundRectangle(51.0f, H - asY - asH, 493.0f, asH, 5.0f);
        canvas.stroke();

        // Header labels
        canvas.setFillColor(IndusindLayout.COLOR_BLACK);
        canvas.beginText();
        canvas.setFontAndSize(fontBold, 9.0f);
        canvas.moveText(80.8f, H - 376.1f - 7.5f);
        canvas.showText("Account No.");
        canvas.endText();

        canvas.beginText();
        canvas.setFontAndSize(fontBold, 9.0f);
        canvas.moveText(175.1f, H - 376.1f - 7.5f);
        canvas.showText("Account Type");
        canvas.endText();

        canvas.beginText();
        canvas.setFontAndSize(fontBold, 9.0f);
        canvas.moveText(282.5f, H - 376.1f - 7.5f);
        canvas.showText("Currency");
        canvas.endText();

        canvas.beginText();
        canvas.setFontAndSize(fontBold, 9.0f);
        canvas.moveText(372.1f, H - 376.1f - 7.5f);
        canvas.showText("Lien Amount");
        canvas.endText();

        canvas.beginText();
        canvas.setFontAndSize(fontBold, 9.0f);
        canvas.moveText(472.5f, H - 376.1f - 7.5f);
        canvas.showText("Balance");
        canvas.endText();

        // Values
        double bal = record.closingBalance();
        String balStr = String.format(Locale.US, "%.2f", bal);
        String accType = record.accountInfo() != null && record.accountInfo().accountType() != null
                ? record.accountInfo().accountType() : "INDUS CLASSIC";

        canvas.beginText();
        canvas.setFontAndSize(fontRegular, 9.0f);
        canvas.moveText(73.4f, H - 404.0f - 7.5f);
        canvas.showText(accNum);
        canvas.endText();

        canvas.beginText();
        canvas.setFontAndSize(fontRegular, 9.0f);
        canvas.moveText(169.8f, H - 404.0f - 7.5f);
        canvas.showText(accType);
        canvas.endText();

        canvas.beginText();
        canvas.setFontAndSize(fontRegular, 9.0f);
        canvas.moveText(293.4f, H - 404.0f - 7.5f);
        canvas.showText("INR");
        canvas.endText();

        canvas.beginText();
        canvas.setFontAndSize(fontRegular, 9.0f);
        canvas.moveText(389.3f, H - 404.0f - 7.5f);
        canvas.showText("0.00");
        canvas.endText();

        canvas.beginText();
        canvas.setFontAndSize(fontRegular, 9.0f);
        canvas.moveText(478.8f, H - 404.0f - 7.5f);
        canvas.showText(balStr);
        canvas.endText();
        canvas.restoreState();

        // 8. Transaction History Header & Metadata
        canvas.saveState();
        canvas.beginText();
        canvas.setFontAndSize(fontBold, 10.5f);
        canvas.setFillColor(IndusindLayout.COLOR_BLACK);
        canvas.moveText(51.0f, H - 442.1f - 8.5f);
        canvas.showText("Transaction History");
        canvas.endText();

        // Grey divider line
        canvas.setFillColor(IndusindLayout.COLOR_GREY_DIVIDER);
        canvas.rectangle(51.0f, H - 457.3f, 493.0f, 1.1f);
        canvas.fill();

        // Vertical red side accents
        canvas.setFillColor(IndusindLayout.COLOR_RED);
        canvas.rectangle(51.0f, H - 514.5f, 1.1f, 58.3f);
        canvas.rectangle(542.9f, H - 514.5f, 1.1f, 58.3f);
        canvas.fill();

        // Statement Period
        canvas.setFillColor(IndusindLayout.COLOR_BLACK);
        canvas.beginText();
        canvas.setFontAndSize(fontBold, 9.0f);
        canvas.moveText(67.1f, H - 466.4f - 7.5f);
        canvas.showText("Statement Period: ");
        float spW = fontBold.getWidth("Statement Period: ", 9.0f);
        canvas.setFontAndSize(fontRegular, 9.0f);
        canvas.moveText(spW, 0);
        canvas.showText(periodStr);
        canvas.endText();

        // Nomination Registered
        canvas.beginText();
        canvas.setFontAndSize(fontBold, 9.0f);
        canvas.moveText(67.1f, H - 486.7f - 7.5f);
        canvas.showText("Nomination Registered: ");
        float nrW = fontBold.getWidth("Nomination Registered: ", 9.0f);
        canvas.setFontAndSize(fontRegular, 9.0f);
        canvas.moveText(nrW, 0);
        canvas.showText("Yes");
        canvas.endText();

        // Branch IFSC Code
        String ifsc = branch.ifscCode() != null ? branch.ifscCode() : "INDB0001325";
        canvas.beginText();
        canvas.setFontAndSize(fontBold, 9.0f);
        canvas.moveText(347.3f, H - 466.4f - 7.5f);
        canvas.showText("Branch IFSC Code: ");
        float ifscW = fontBold.getWidth("Branch IFSC Code: ", 9.0f);
        canvas.setFontAndSize(fontRegular, 9.0f);
        canvas.moveText(ifscW, 0);
        canvas.showText(ifsc);
        canvas.endText();
        canvas.restoreState();
    }

    private void renderTable(PdfCanvas canvas, List<Transaction> transactions,
                             PdfFont fontRegular, PdfFont fontBold, float tableTopY) {
        float H = IndusindLayout.PAGE_HEIGHT;
        int rowCount = transactions.size();
        float totalH = IndusindLayout.TABLE_HEADER_HEIGHT + rowCount * IndusindLayout.ROW_HEIGHT;

        // 1. Header pink background (51.0 to 544.0, height 27.9)
        canvas.saveState();
        canvas.setFillColor(IndusindLayout.COLOR_LIGHT_PINK);
        canvas.rectangle(51.5f, H - tableTopY - IndusindLayout.TABLE_HEADER_HEIGHT, 492.0f, IndusindLayout.TABLE_HEADER_HEIGHT);
        canvas.fill();

        // 2. Outer red border enclosing the table
        canvas.setStrokeColor(IndusindLayout.COLOR_RED);
        canvas.setLineWidth(1.0f);
        canvas.roundRectangle(51.0f, H - tableTopY - totalH, 493.0f, totalH, 5.0f);
        canvas.stroke();

        // 3. Header column text
        canvas.setFillColor(IndusindLayout.COLOR_BLACK);
        float hTextY = tableTopY + 14.5f;

        canvas.beginText();
        canvas.setFontAndSize(fontBold, 9.0f);
        canvas.moveText(59.6f, H - hTextY - 7.5f);
        canvas.showText("Date");
        canvas.endText();

        canvas.beginText();
        canvas.setFontAndSize(fontBold, 9.0f);
        canvas.moveText(133.2f, H - hTextY - 7.5f);
        canvas.showText("Particulars");
        canvas.endText();

        canvas.beginText();
        canvas.setFontAndSize(fontBold, 9.0f);
        canvas.moveText(255.9f, H - hTextY - 7.5f);
        canvas.showText("Chq No/Ref No");
        canvas.endText();

        canvas.beginText();
        canvas.setFontAndSize(fontBold, 9.0f);
        canvas.moveText(345.6f, H - hTextY - 7.5f);
        canvas.showText("Withdrawal");
        canvas.endText();

        canvas.beginText();
        canvas.setFontAndSize(fontBold, 9.0f);
        canvas.moveText(436.7f, H - hTextY - 7.5f);
        canvas.showText("Deposit");
        canvas.endText();

        canvas.beginText();
        canvas.setFontAndSize(fontBold, 9.0f);
        canvas.moveText(495.1f, H - hTextY - 7.5f);
        canvas.showText("Balance");
        canvas.endText();

        // 4. Rows
        float curRowTop = tableTopY + IndusindLayout.TABLE_HEADER_HEIGHT;
        for (int i = 0; i < rowCount; i++) {
            Transaction tx = transactions.get(i);
            float rowCenterY = curRowTop + 13.0f;

            // Date
            String dtStr = formatDisplayDate(tx.valueDate());
            canvas.beginText();
            canvas.setFontAndSize(fontRegular, 9.0f);
            canvas.moveText(59.6f, H - rowCenterY - 7.5f);
            canvas.showText(dtStr);
            canvas.endText();

            // Particulars (wrap up to 2-3 lines)
            String desc = tx.details() != null ? tx.details() : "UPI/TXN";
            List<String> lines = wrapText(desc, 22);
            for (int lIdx = 0; lIdx < Math.min(3, lines.size()); lIdx++) {
                canvas.beginText();
                canvas.setFontAndSize(fontRegular, 9.0f);
                canvas.moveText(133.2f, H - (rowCenterY + lIdx * 12.8f) - 7.5f);
                canvas.showText(lines.get(lIdx));
                canvas.endText();
            }

            // Chq No/Ref No
            String refNo = tx.refNo() != null && !tx.refNo().isBlank() ? tx.refNo() : ("S" + Math.abs(tx.hashCode() % 90000000 + 10000000));
            canvas.beginText();
            canvas.setFontAndSize(fontRegular, 9.0f);
            canvas.moveText(255.9f, H - rowCenterY - 7.5f);
            canvas.showText(refNo);
            canvas.endText();

            // Withdrawal
            String wStr = (tx.debit() != null && tx.debit() > 0) ? String.format(Locale.US, "%.2f", tx.debit()) : "0.00";
            float wWidth = fontRegular.getWidth(wStr, 9.0f);
            canvas.beginText();
            canvas.setFontAndSize(fontRegular, 9.0f);
            canvas.moveText(394.5f - wWidth - 10.0f, H - rowCenterY - 7.5f);
            canvas.showText(wStr);
            canvas.endText();

            // Deposit
            String dStr = (tx.credit() != null && tx.credit() > 0) ? String.format(Locale.US, "%.2f", tx.credit()) : "0.00";
            float dWidth = fontRegular.getWidth(dStr, 9.0f);
            canvas.beginText();
            canvas.setFontAndSize(fontRegular, 9.0f);
            canvas.moveText(468.1f - dWidth - 10.0f, H - rowCenterY - 7.5f);
            canvas.showText(dStr);
            canvas.endText();

            // Balance
            String bStr = String.format(Locale.US, "%.2f", tx.balance());
            float bWidth = fontRegular.getWidth(bStr, 9.0f);
            canvas.beginText();
            canvas.setFontAndSize(fontRegular, 9.0f);
            canvas.moveText(541.7f - bWidth - 10.0f, H - rowCenterY - 7.5f);
            canvas.showText(bStr);
            canvas.endText();

            curRowTop += IndusindLayout.ROW_HEIGHT;
        }

        canvas.restoreState();
    }

    private void renderDisclaimers(PdfCanvas canvas, PdfFont fontRegular, PdfFont fontBold,
                                   float startY, String asOfDateStr) {
        float H = IndusindLayout.PAGE_HEIGHT;

        canvas.saveState();
        canvas.setFillColor(IndusindLayout.COLOR_BLACK);

        String[] legalLines = {
            "This is a computer generated statement and does not require signature. For any queries of details on out of products & services, please call our",
            "Phones Banking Numbers : 1860-267-7777.(within INDIA) and +91 22 4406 6666 (Outside India) or write to us at  reachus@indusind.com  or",
            "visit us at www.indusind.com. ",
            "*Service Tax Registration Number AAACI1314GST001. *Any discrepancies in this statement may kind be brought to the notice of the bank within",
            "seven days. ",
            "*This is a computer generated statement and so valid without signature. ",
            "Registered office : INDUSIND BANK LTD, 2401, General Thimmayya Road (Cantonment), Maharashtra Pune - 41101. Corporate Identify Number",
            "(CIN) : L65191PN1994PLC076333"
        };

        float curY = startY;
        for (String line : legalLines) {
            canvas.beginText();
            canvas.setFontAndSize(fontRegular, 7.5f);
            canvas.moveText(51.0f, H - curY - 6.5f);
            canvas.showText(line);
            canvas.endText();
            curY += 10.7f;
        }

        curY += 15.0f;
        String[] acronymLines = {
            "Acronyms: MICR :Magnetic Ink Character recognition, IFSC Code :Indian Financial System Code, NEFT :National Electronic Fund Transfer, RTGS",
            ":Real Time Gross Settlement, ECS :Electronic Clearance Service, TDS :Tax Deduction at Source, IMPS :Immediate Payment Service, MMID :Mobile",
            "Money Identification Number, POS :Point of Sale, TXN :Transaction, ATM :Automated Teller Machine, PG :Payment Gateway, GST :Goods and",
            "Services Tax"
        };

        for (String line : acronymLines) {
            canvas.beginText();
            canvas.setFontAndSize(fontRegular, 7.5f);
            canvas.moveText(51.0f, H - curY - 6.5f);
            canvas.showText(line);
            canvas.endText();
            curY += 10.7f;
        }

        // INDIE note
        curY += 30.0f;
        String indieNote = "This statement is downloaded from INDIE mobile application on " + asOfDateStr + " at 9.14 PM";
        float indieW = fontRegular.getWidth(indieNote, 10.5f);
        canvas.beginText();
        canvas.setFontAndSize(fontRegular, 10.5f);
        canvas.moveText((IndusindLayout.PAGE_WIDTH - indieW) / 2f, H - curY - 9.0f);
        canvas.showText(indieNote);
        canvas.endText();

        curY += 30.0f;
        String grText = "Grievance Officer details";
        float grW = fontBold.getWidth(grText, 10.5f);
        canvas.beginText();
        canvas.setFontAndSize(fontBold, 10.5f);
        canvas.moveText((IndusindLayout.PAGE_WIDTH - grW) / 2f, H - curY - 9.0f);
        canvas.showText(grText);
        canvas.endText();

        curY += 15.0f;
        String urlLine1 = "https://www.indusind.com/content/dam/regulatoryDisclosure/grievanceRedressal/grievance-redressal-";
        float urlW1 = fontRegular.getWidth(urlLine1, 10.5f);
        float urlX1 = (IndusindLayout.PAGE_WIDTH - urlW1) / 2f;
        canvas.beginText();
        canvas.setFontAndSize(fontRegular, 10.5f);
        canvas.moveText(urlX1, H - curY - 9.0f);
        canvas.showText(urlLine1);
        canvas.endText();
        // underline
        canvas.setStrokeColor(IndusindLayout.COLOR_BLACK);
        canvas.setLineWidth(0.6f);
        canvas.moveTo(urlX1, H - curY - 10.5f);
        canvas.lineTo(urlX1 + urlW1, H - curY - 10.5f);
        canvas.stroke();

        curY += 15.0f;
        String urlLine2 = "mechanism.pdf";
        float urlW2 = fontRegular.getWidth(urlLine2, 10.5f);
        float urlX2 = (IndusindLayout.PAGE_WIDTH - urlW2) / 2f;
        canvas.beginText();
        canvas.setFontAndSize(fontRegular, 10.5f);
        canvas.moveText(urlX2, H - curY - 9.0f);
        canvas.showText(urlLine2);
        canvas.endText();
        // underline
        canvas.moveTo(urlX2, H - curY - 10.5f);
        canvas.lineTo(urlX2 + urlW2, H - curY - 10.5f);
        canvas.stroke();

        canvas.restoreState();
    }

    private List<String> wrapText(String text, int maxChars) {
        List<String> list = new ArrayList<>();
        if (text == null || text.isBlank()) {
            list.add("");
            return list;
        }
        int len = text.length();
        int start = 0;
        while (start < len) {
            int end = Math.min(start + maxChars, len);
            list.add(text.substring(start, end));
            start = end;
        }
        return list;
    }

    private String formatDisplayDate(String rawDate) {
        if (rawDate == null || rawDate.isBlank()) return "08 Sep 2026";
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
