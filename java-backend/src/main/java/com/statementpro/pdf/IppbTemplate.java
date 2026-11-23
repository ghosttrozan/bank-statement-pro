package com.statementpro.pdf;

import com.itextpdf.io.font.constants.StandardFonts;
import com.itextpdf.io.image.ImageData;
import com.itextpdf.io.image.ImageDataFactory;
import com.itextpdf.kernel.colors.ColorConstants;
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
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;

/**
 * Pixel-accurate India Post Payments Bank (IPPB) Statement Template.
 * Exact replication of official IPPB statements (AccountStatement_Report_6007230625_08052026_10_42 (1).pdf).
 */
public class IppbTemplate implements StatementTemplate {

    private static final DateTimeFormatter IPPB_DATE_FMT = DateTimeFormatter.ofPattern("dd-MM-yyyy", Locale.ENGLISH);
    private static final DateTimeFormatter IPPB_PERIOD_FMT = DateTimeFormatter.ofPattern("dd-MMM-yyyy", Locale.ENGLISH);

    private static final String[] GUIDELINES_BULLETS = {
        "• Download India Post Payment Bank’s Mobile Banking App from Google Play Store/ Apple App Store only",
        "• Before downloading, confirm that the app has been developed by India Post Payment Bank Ltd.",
        "• Use a screen inactivity lock in conjunction with a pass code / pattern / fingerprint / face recognition unlock",
        "• Never share the MPIN of your IPPB mobile app with anyone",
        "• Frequently change the MPIN of your IPPB mobile app",
        "• Never share your confidential account information , passwords over a call, message, an email or in person",
        "• Never share the OTP for the transaction with anyone over a call, message, an email or in person",
        "• Never accept any collect money request sent on the mobile app if not initiated with your knowledge",
        "• Ensure that the operating system of your phone is updated to the latest version available",
        "• Do not remove the security controls from the phone often called 'jail breaking' or 'rooting",
        "• Be careful while granting access to various apps during installation",
        "• Never give remote access of your device to persons whom you don’t know"
    };

    private static final String[] REMEMBER_BULLETS = {
        "• IPPB will never call you and ask your confidential account information, MPIN or OTP for the transaction",
        "• IPPB will never call and ask you to install any app on your phone for assisting you"
    };

    @Override
    public byte[] render(StatementRecord record) throws java.io.IOException {
        return render(record, null);
    }

    @Override
    public byte[] render(StatementRecord record, WriterProperties writerProperties) throws java.io.IOException {
        ByteArrayOutputStream out = new ByteArrayOutputStream();
        if (writerProperties == null) {
            writerProperties = new WriterProperties();
        }
        writerProperties.setPdfVersion(com.itextpdf.kernel.pdf.PdfVersion.PDF_1_6);
        writerProperties.setFullCompressionMode(true);

        PdfWriter writer = new PdfWriter(out, writerProperties);

        try (PdfDocument pdfDoc = new PdfDocument(writer)) {
            // Set metadata matching reference IPPB PDF
            com.itextpdf.kernel.pdf.PdfDocumentInfo info = pdfDoc.getDocumentInfo();
            info.setTitle("");
            info.setAuthor("");
            info.setSubject("");
            info.setKeywords("");
            info.setCreator("");
            info.setProducer("");

            PdfFont fontTimes = PdfFontFactory.createFont(StandardFonts.TIMES_ROMAN);
            PdfFont fontTimesBold = PdfFontFactory.createFont(StandardFonts.TIMES_BOLD);

            byte[] logoBytes = loadResourceBytes("/logos/ippb_header.jpg");

            List<Transaction> transactions = record.transactions() != null ? record.transactions() : List.of();

            String startDateStr = transactions.isEmpty() ? "01-Apr-2026" : formatPeriodDate(transactions.get(0).valueDate());
            String endDateStr   = transactions.isEmpty() ? "30-Apr-2026" : formatPeriodDate(transactions.get(transactions.size() - 1).valueDate());
            String dateRangeStr = startDateStr + " to " + endDateStr;

            CustomerDetails customer = record.customerDetails();
            BranchDetails branch = record.branchDetails();

            String custName = (customer != null && customer.accountHolderName() != null && !customer.accountHolderName().isBlank())
                    ? customer.accountHolderName() : "VARUN";
            String branchName = (branch != null && branch.branchName() != null && !branch.branchName().isBlank())
                    ? branch.branchName() : "DEWAS BRANCH";
            String branchAddr = (branch != null && branch.branchAddress() != null && !branch.branchAddress().isBlank())
                    ? branch.branchAddress() : "DEWAS BRANCH , JIYAGAON , JIYAGAON,DEWAS - - DEWAS MADHYA PRADESH 455336";
            String custAddr = (customer != null && customer.address() != null && !customer.address().isBlank())
                    ? customer.address() : ", JIYAGAON , JIYAGAON,DEWAS - - DEWAS MADHYA PRADESH 455336";

            String mobile = "XXXXXX3369";
            String email = (customer != null && customer.email() != null && !customer.email().isBlank())
                    ? customer.email() : "JXXXXXX5@gmail.com";
            String accNum = (customer != null && customer.accountNumber() != null && !customer.accountNumber().isBlank())
                    ? customer.accountNumber() : "027810033405";
            String ifsc = (branch != null && branch.ifscCode() != null && !branch.ifscCode().isBlank())
                    ? branch.ifscCode() : "IPOS0000001";
            String nomination = (customer != null && customer.nomineeName() != null && !customer.nomineeName().isBlank())
                    ? "Yes" : "No";
            String custId = (customer != null && customer.cifNumber() != null && !customer.cifNumber().isBlank())
                    ? customer.cifNumber() : "XXXXX0625";
            String accType = (record.accountInfo() != null && record.accountInfo().accountType() != null && !record.accountInfo().accountType().isBlank())
                    ? record.accountInfo().accountType() : "Savings Account";
            String micr = (branch != null && branch.micrCode() != null && !branch.micrCode().isBlank())
                    ? branch.micrCode() : "455768001";

            // Page geometry
            float H = IppbLayout.PAGE_HEIGHT;

            // Partition transactions across pages
            List<PageSlice> pageSlices = layoutPages(transactions, fontTimes);

            int totalPages = pageSlices.size();

            for (int pIdx = 0; pIdx < totalPages; pIdx++) {
                PageSlice slice = pageSlices.get(pIdx);
                boolean isFirstPage = (pIdx == 0);

                PdfPage page = pdfDoc.addNewPage(new PageSize(IppbLayout.PAGE_WIDTH, IppbLayout.PAGE_HEIGHT));
                PdfCanvas canvas = new PdfCanvas(page);

                if (isFirstPage) {
                    renderPage1Header(canvas, fontTimes, fontTimesBold, logoBytes, H,
                            custName, dateRangeStr, branchName, custAddr, mobile, email,
                            accNum, ifsc, nomination, custId, accType, micr);

                    // Opening balance row
                    renderOpeningBalanceRow(canvas, fontTimes, fontTimesBold, H, record.accountInfo() != null ? record.accountInfo().openingBalance() : 122.73);
                } else {
                    renderContinuationHeader(canvas, fontTimes, fontTimesBold, H);
                }

                // Render transactions for this page
                float currentY = isFirstPage ? IppbLayout.P1_ROWS_START_Y : IppbLayout.CONT_ROWS_START_Y;
                float tableTopY = isFirstPage ? IppbLayout.P1_HEADER_TOP : IppbLayout.CONT_HEADER_TOP;

                for (TxRow txRow : slice.txRows) {
                    renderTransactionRow(canvas, fontTimes, H, currentY, txRow);
                    currentY += txRow.rowHeight;
                }

                float tableBottomY = currentY;

                // Draw vertical grid lines for the transaction table on this page
                drawTableVerticalLines(canvas, H, tableTopY, tableBottomY);

                // Bottom horizontal line of transaction table
                drawHorizontalLine(canvas, H, tableBottomY, 18.0f, 594.0f, IppbLayout.COLOR_MAROON, 0.75f);

                // Render summary & footer components if on this slice
                if (slice.hasSummaryTable) {
                    currentY = renderAccountSummary(canvas, fontTimes, fontTimesBold, H, currentY + 4.0f, record, transactions.size());
                }

                if (slice.guidelineStartIdx >= 0) {
                    currentY = renderGuidelinesSection(canvas, fontTimes, fontTimesBold, H, currentY + 4.0f,
                            slice.guidelineStartIdx, slice.guidelineEndIdx, slice.includeGuidelinesHeading);
                }

                if (slice.includeRememberThat) {
                    renderRememberThatSection(canvas, fontTimes, fontTimesBold, H, currentY + 4.0f);
                }
            }
        }

        return out.toByteArray();
    }

    private void renderPage1Header(PdfCanvas canvas, PdfFont fontTimes, PdfFont fontTimesBold, byte[] logoBytes, float H,
                                   String custName, String dateRangeStr, String branchName, String custAddr,
                                   String mobile, String email, String accNum, String ifsc, String nomination,
                                   String custId, String accType, String micr) {

        // 1. IPPB Header Image
        if (logoBytes != null) {
            try {
                ImageData imgData = ImageDataFactory.create(logoBytes);
                canvas.addImageWithTransformationMatrix(imgData,
                        IppbLayout.LOGO_WIDTH, 0, 0, IppbLayout.LOGO_HEIGHT,
                        IppbLayout.LOGO_X, H - (IppbLayout.LOGO_Y + IppbLayout.LOGO_HEIGHT), false);
            } catch (Exception ignored) {}
        }

        // 2. Account Holder Name
        canvas.saveState();
        canvas.beginText();
        canvas.setFontAndSize(fontTimes, 20.0f);
        canvas.setFillColor(IppbLayout.COLOR_MAROON);
        canvas.moveText(20.10f, H - 210.20f);
        canvas.showText(custName);
        canvas.endText();

        // 3. ACCOUNT DETAILS & TRANSACTION PERIOD
        canvas.beginText();
        canvas.setFontAndSize(fontTimesBold, 10.0f);
        canvas.setFillColor(IppbLayout.COLOR_MAROON);
        canvas.moveText(19.80f, H - 226.16f);
        canvas.showText("ACCOUNT DETAILS");
        canvas.endText();

        canvas.beginText();
        canvas.setFontAndSize(fontTimesBold, 10.0f);
        canvas.setFillColor(IppbLayout.COLOR_MAROON);
        canvas.moveText(309.30f, H - 227.66f);
        canvas.showText("TRANSACTION PERIOD :");
        canvas.endText();

        canvas.beginText();
        canvas.setFontAndSize(fontTimes, 10.0f);
        canvas.setFillColor(IppbLayout.COLOR_MAROON);
        canvas.moveText(451.80f, H - 227.29f);
        canvas.showText(dateRangeStr);
        canvas.endText();
        canvas.restoreState();

        // 4. Solid Black Divider Line
        drawHorizontalLine(canvas, H, 236.21f, 18.0f, 594.0f, IppbLayout.COLOR_BLACK, 2.25f);

        // 5. Branch Office & Customer Address
        canvas.saveState();
        canvas.beginText();
        canvas.setFontAndSize(fontTimesBold, 10.0f);
        canvas.setFillColor(IppbLayout.COLOR_MAROON);
        canvas.moveText(19.80f, H - 248.94f);
        canvas.showText("Branch Office : India Post Payments Bank");
        canvas.endText();

        canvas.beginText();
        canvas.setFontAndSize(fontTimesBold, 10.0f);
        canvas.setFillColor(IppbLayout.COLOR_MAROON);
        canvas.moveText(307.80f, H - 248.94f);
        canvas.showText("Customer Address :");
        canvas.endText();

        canvas.beginText();
        canvas.setFontAndSize(fontTimes, 10.0f);
        canvas.setFillColor(IppbLayout.COLOR_MAROON);
        canvas.moveText(19.80f, H - 263.10f);
        canvas.showText(branchName);
        canvas.endText();

        // Split customer address if long
        String addr1 = custAddr;
        String addr2 = "";
        if (custAddr.length() > 42) {
            int splitIdx = custAddr.lastIndexOf(' ', 42);
            if (splitIdx > 20) {
                addr1 = custAddr.substring(0, splitIdx).trim();
                addr2 = custAddr.substring(splitIdx).trim();
            }
        }
        canvas.beginText();
        canvas.setFontAndSize(fontTimes, 10.0f);
        canvas.setFillColor(IppbLayout.COLOR_MAROON);
        canvas.moveText(307.80f, H - 263.10f);
        canvas.showText(addr1);
        canvas.endText();

        if (!addr2.isEmpty()) {
            canvas.beginText();
            canvas.setFontAndSize(fontTimes, 10.0f);
            canvas.setFillColor(IppbLayout.COLOR_MAROON);
            canvas.moveText(307.80f, H - 274.26f);
            canvas.showText(addr2);
            canvas.endText();
        }

        // 6. Registered Mobile & Email
        canvas.beginText();
        canvas.setFontAndSize(fontTimesBold, 10.0f);
        canvas.setFillColor(IppbLayout.COLOR_MAROON);
        canvas.moveText(309.30f, H - 290.29f);
        canvas.showText("Registered Mobile");
        canvas.endText();

        canvas.beginText();
        canvas.setFontAndSize(fontTimes, 10.0f);
        canvas.setFillColor(IppbLayout.COLOR_MAROON);
        canvas.moveText(451.80f, H - 289.92f);
        canvas.showText(mobile);
        canvas.endText();

        canvas.beginText();
        canvas.setFontAndSize(fontTimesBold, 10.0f);
        canvas.setFillColor(IppbLayout.COLOR_MAROON);
        canvas.moveText(309.30f, H - 307.82f);
        canvas.showText("Registered E-Mail ID");
        canvas.endText();

        canvas.beginText();
        canvas.setFontAndSize(fontTimes, 10.0f);
        canvas.setFillColor(IppbLayout.COLOR_MAROON);
        canvas.moveText(451.80f, H - 307.45f);
        canvas.showText(email);
        canvas.endText();

        // 7. Grid Row 1 (Account Number, IFSC, Nomination, Customer ID)
        canvas.beginText();
        canvas.setFontAndSize(fontTimesBold, 10.0f);
        canvas.setFillColor(IppbLayout.COLOR_MAROON);
        canvas.moveText(21.30f, H - 325.35f);
        canvas.showText("Account Number");
        canvas.endText();

        canvas.beginText();
        canvas.setFontAndSize(fontTimes, 10.0f);
        canvas.setFillColor(IppbLayout.COLOR_MAROON);
        canvas.moveText(107.70f, H - 324.98f);
        canvas.showText(accNum);
        canvas.endText();

        canvas.beginText();
        canvas.setFontAndSize(fontTimesBold, 10.0f);
        canvas.setFillColor(IppbLayout.COLOR_MAROON);
        canvas.moveText(194.10f, H - 325.35f);
        canvas.showText("IFSC");
        canvas.endText();

        canvas.beginText();
        canvas.setFontAndSize(fontTimes, 10.0f);
        canvas.setFillColor(IppbLayout.COLOR_MAROON);
        canvas.moveText(230.10f, H - 324.98f);
        canvas.showText(ifsc);
        canvas.endText();

        canvas.beginText();
        canvas.setFontAndSize(fontTimesBold, 10.0f);
        canvas.setFillColor(IppbLayout.COLOR_MAROON);
        canvas.moveText(309.30f, H - 325.35f);
        canvas.showText("Nomination");
        canvas.endText();

        canvas.beginText();
        canvas.setFontAndSize(fontTimes, 10.0f);
        canvas.setFillColor(IppbLayout.COLOR_MAROON);
        canvas.moveText(380.55f, H - 324.98f);
        canvas.showText(nomination);
        canvas.endText();

        canvas.beginText();
        canvas.setFontAndSize(fontTimesBold, 10.0f);
        canvas.setFillColor(IppbLayout.COLOR_MAROON);
        canvas.moveText(451.80f, H - 325.35f);
        canvas.showText("Customer ID");
        canvas.endText();

        canvas.beginText();
        canvas.setFontAndSize(fontTimes, 10.0f);
        canvas.setFillColor(IppbLayout.COLOR_MAROON);
        canvas.moveText(523.05f, H - 324.98f);
        canvas.showText(custId);
        canvas.endText();

        // 8. Grid Row 2 (Account Type, MICR)
        canvas.beginText();
        canvas.setFontAndSize(fontTimesBold, 10.0f);
        canvas.setFillColor(IppbLayout.COLOR_MAROON);
        canvas.moveText(21.30f, H - 342.88f);
        canvas.showText("Account Type");
        canvas.endText();

        canvas.beginText();
        canvas.setFontAndSize(fontTimes, 10.0f);
        canvas.setFillColor(IppbLayout.COLOR_MAROON);
        canvas.moveText(107.70f, H - 342.51f);
        canvas.showText(accType);
        canvas.endText();

        canvas.beginText();
        canvas.setFontAndSize(fontTimesBold, 10.0f);
        canvas.setFillColor(IppbLayout.COLOR_MAROON);
        canvas.moveText(194.10f, H - 342.88f);
        canvas.showText("MICR");
        canvas.endText();

        canvas.beginText();
        canvas.setFontAndSize(fontTimes, 10.0f);
        canvas.setFillColor(IppbLayout.COLOR_MAROON);
        canvas.moveText(230.10f, H - 342.51f);
        canvas.showText(micr);
        canvas.endText();

        // 9. Transaction Details Section Title
        canvas.beginText();
        canvas.setFontAndSize(fontTimesBold, 16.0f);
        canvas.setFillColor(IppbLayout.COLOR_MAROON);
        canvas.moveText(239.59f, H - 364.97f);
        canvas.showText("Transaction Details");
        canvas.endText();
        canvas.restoreState();

        // 10. Table Header Row (Page 1)
        drawTableHeader(canvas, fontTimes, H, IppbLayout.P1_HEADER_TOP, IppbLayout.P1_HEADER_BOTTOM, 378.79f);
    }

    private void renderContinuationHeader(PdfCanvas canvas, PdfFont fontTimes, PdfFont fontTimesBold, float H) {
        canvas.saveState();
        canvas.beginText();
        canvas.setFontAndSize(fontTimesBold, 16.0f);
        canvas.setFillColor(IppbLayout.COLOR_MAROON);
        canvas.moveText(218.26f, H - 36.41f);
        canvas.showText("Transaction Details");
        canvas.endText();
        canvas.restoreState();

        // Table Header Row (Continuation)
        drawTableHeader(canvas, fontTimes, H, IppbLayout.CONT_HEADER_TOP, IppbLayout.CONT_HEADER_BOTTOM, 49.03f);
    }

    private void drawTableHeader(PdfCanvas canvas, PdfFont fontTimes, float H, float topY, float bottomY, float baselineY) {
        float height = bottomY - topY;

        // Background filled rectangles
        canvas.saveState();
        canvas.setFillColor(IppbLayout.COLOR_MAROON);
        for (int i = 0; i < IppbLayout.COL_X.length - 1; i++) {
            float x = IppbLayout.COL_X[i];
            float w = IppbLayout.COL_X[i + 1] - x;
            canvas.rectangle(x, H - bottomY, w, height);
        }
        canvas.fill();
        canvas.restoreState();

        // Header Labels (white text)
        canvas.saveState();
        canvas.beginText();
        canvas.setFontAndSize(fontTimes, 8.0f);
        canvas.setFillColor(IppbLayout.COLOR_WHITE);

        canvas.moveText(36.30f, H - baselineY);
        canvas.showText("DATE");
        canvas.endText();

        canvas.beginText();
        canvas.setFontAndSize(fontTimes, 8.0f);
        canvas.setFillColor(IppbLayout.COLOR_WHITE);
        canvas.moveText(94.63f, H - baselineY);
        canvas.showText("TRAN ID");
        canvas.endText();

        canvas.beginText();
        canvas.setFontAndSize(fontTimes, 8.0f);
        canvas.setFillColor(IppbLayout.COLOR_WHITE);
        canvas.moveText(190.53f, H - baselineY);
        canvas.showText("TRANSACTION PARTICULARS");
        canvas.endText();

        canvas.beginText();
        canvas.setFontAndSize(fontTimes, 8.0f);
        canvas.setFillColor(IppbLayout.COLOR_WHITE);
        canvas.moveText(358.33f, H - baselineY);
        canvas.showText("WITHDRWAL"); // Exact reference spelling
        canvas.endText();

        canvas.beginText();
        canvas.setFontAndSize(fontTimes, 8.0f);
        canvas.setFillColor(IppbLayout.COLOR_WHITE);
        canvas.moveText(437.86f, H - baselineY);
        canvas.showText("DEPOSIT");
        canvas.endText();

        canvas.beginText();
        canvas.setFontAndSize(fontTimes, 8.0f);
        canvas.setFillColor(IppbLayout.COLOR_WHITE);
        canvas.moveText(513.36f, H - baselineY);
        canvas.showText("BALANCE");
        canvas.endText();
        canvas.restoreState();

        // Horizontal lines top and bottom of header
        drawHorizontalLine(canvas, H, topY, 18.0f, 594.0f, IppbLayout.COLOR_MAROON, 0.75f);
        drawHorizontalLine(canvas, H, bottomY, 18.0f, 594.0f, IppbLayout.COLOR_MAROON, 0.75f);
    }

    private void renderOpeningBalanceRow(PdfCanvas canvas, PdfFont fontTimes, PdfFont fontTimesBold, float H, double openingBal) {
        float topY = IppbLayout.P1_HEADER_BOTTOM;
        float bottomY = IppbLayout.P1_ROWS_START_Y;
        float baselineY = 393.51f;

        canvas.saveState();
        // "Opening Balance :" in column 2 (Particulars)
        canvas.beginText();
        canvas.setFontAndSize(fontTimesBold, 8.0f);
        canvas.setFillColor(IppbLayout.COLOR_BLACK);
        canvas.moveText(215.53f, H - baselineY);
        canvas.showText("Opening Balance :");
        canvas.endText();

        // Amount in Balance column (right-aligned to 571.90f)
        String balStr = String.format(Locale.ENGLISH, "%.2f", openingBal);
        float balWidth = fontTimes.getWidth(balStr, 8.0f);
        canvas.beginText();
        canvas.setFontAndSize(fontTimes, 8.0f);
        canvas.setFillColor(IppbLayout.COLOR_BLACK);
        canvas.moveText(571.90f - balWidth, H - 393.22f);
        canvas.showText(balStr);
        canvas.endText();

        // "Cr." in Cr/Dr column
        canvas.beginText();
        canvas.setFontAndSize(fontTimes, 8.0f);
        canvas.setFillColor(IppbLayout.COLOR_BLACK);
        canvas.moveText(579.32f, H - 392.22f);
        canvas.showText("Cr.");
        canvas.endText();
        canvas.restoreState();

        // Bottom line of opening balance row
        drawHorizontalLine(canvas, H, bottomY, 18.0f, 594.0f, IppbLayout.COLOR_MAROON, 0.75f);
    }

    private void renderTransactionRow(PdfCanvas canvas, PdfFont fontTimes, float H, float rowTopY, TxRow tx) {
        float baseline1 = rowTopY + 10.04f;
        float rowBottomY = rowTopY + tx.rowHeight;

        canvas.saveState();
        // 1. Date
        canvas.beginText();
        canvas.setFontAndSize(fontTimes, 8.0f);
        canvas.setFillColor(IppbLayout.COLOR_BLACK);
        canvas.moveText(28.30f, H - baseline1);
        canvas.showText(tx.dateStr);
        canvas.endText();

        // 2. Tran ID
        canvas.beginText();
        canvas.setFontAndSize(fontTimes, 8.0f);
        canvas.setFillColor(IppbLayout.COLOR_BLACK);
        canvas.moveText(78.18f, H - baseline1);
        canvas.showText(tx.tranId);
        canvas.endText();

        // 3. Particulars (Line 1 & optional Line 2)
        canvas.beginText();
        canvas.setFontAndSize(fontTimes, 8.0f);
        canvas.setFillColor(IppbLayout.COLOR_BLACK);
        canvas.moveText(149.05f, H - baseline1);
        canvas.showText(tx.particularsLine1);
        canvas.endText();

        if (tx.particularsLine2 != null && !tx.particularsLine2.isEmpty()) {
            float baseline2 = rowTopY + 18.97f;
            canvas.beginText();
            canvas.setFontAndSize(fontTimes, 8.0f);
            canvas.setFillColor(IppbLayout.COLOR_BLACK);
            canvas.moveText(149.05f, H - baseline2);
            canvas.showText(tx.particularsLine2);
            canvas.endText();
        }

        // 4. Withdrawal (right aligned to 415.99f)
        if (tx.debitStr != null && !tx.debitStr.isEmpty()) {
            float w = fontTimes.getWidth(tx.debitStr, 8.0f);
            canvas.beginText();
            canvas.setFontAndSize(fontTimes, 8.0f);
            canvas.setFillColor(IppbLayout.COLOR_BLACK);
            canvas.moveText(415.99f - w, H - baseline1);
            canvas.showText(tx.debitStr);
            canvas.endText();
        }

        // 5. Deposit (right aligned to 486.86f)
        if (tx.creditStr != null && !tx.creditStr.isEmpty()) {
            float w = fontTimes.getWidth(tx.creditStr, 8.0f);
            canvas.beginText();
            canvas.setFontAndSize(fontTimes, 8.0f);
            canvas.setFillColor(IppbLayout.COLOR_BLACK);
            canvas.moveText(486.86f - w, H - baseline1);
            canvas.showText(tx.creditStr);
            canvas.endText();
        }

        // 6. Balance (right aligned to 571.90f)
        float balW = fontTimes.getWidth(tx.balanceStr, 8.0f);
        canvas.beginText();
        canvas.setFontAndSize(fontTimes, 8.0f);
        canvas.setFillColor(IppbLayout.COLOR_BLACK);
        canvas.moveText(571.90f - balW, H - baseline1);
        canvas.showText(tx.balanceStr);
        canvas.endText();

        // 7. Cr./Dr. suffix
        canvas.beginText();
        canvas.setFontAndSize(fontTimes, 8.0f);
        canvas.setFillColor(IppbLayout.COLOR_BLACK);
        canvas.moveText(579.32f, H - baseline1);
        canvas.showText(tx.suffix);
        canvas.endText();

        canvas.restoreState();

        // Bottom border of this row
        drawHorizontalLine(canvas, H, rowBottomY, 18.0f, 594.0f, IppbLayout.COLOR_MAROON, 0.75f);
    }

    private void drawTableVerticalLines(PdfCanvas canvas, float H, float topY, float bottomY) {
        canvas.saveState();
        canvas.setStrokeColor(IppbLayout.COLOR_MAROON);
        canvas.setLineWidth(0.75f);
        for (float x : IppbLayout.COL_X) {
            canvas.moveTo(x, H - topY);
            canvas.lineTo(x, H - bottomY);
        }
        canvas.stroke();
        canvas.restoreState();
    }

    private float renderAccountSummary(PdfCanvas canvas, PdfFont fontTimes, PdfFont fontTimesBold, float H,
                                       float startY, StatementRecord record, int txCount) {
        float titleBaseline = startY + 16.70f;
        float headerTop = startY + 20.49f;
        float headerBottom = headerTop + 12.68f;
        float rowBottom = headerBottom + 13.05f;

        // Title: ACCOUNT SUMMARY
        canvas.saveState();
        canvas.beginText();
        canvas.setFontAndSize(fontTimesBold, 16.0f);
        canvas.setFillColor(IppbLayout.COLOR_MAROON);
        canvas.moveText(221.38f, H - titleBaseline);
        canvas.showText("ACCOUNT SUMMARY");
        canvas.endText();
        canvas.restoreState();

        // Header Background Rectangles
        canvas.saveState();
        canvas.setFillColor(IppbLayout.COLOR_MAROON);
        for (int i = 0; i < IppbLayout.SUMM_COL_X.length - 1; i++) {
            float x = IppbLayout.SUMM_COL_X[i];
            float w = IppbLayout.SUMM_COL_X[i + 1] - x;
            canvas.rectangle(x, H - headerBottom, w, 12.68f);
        }
        canvas.fill();
        canvas.restoreState();

        // Header Labels (white text centered)
        String[] headers = {
            "OPENING BALANCE", "TOTAL WITHDRAWALS", "TOTAL DEPOSITS", "CLOSING BALANCE", "No. of Transactions"
        };
        float headerBaseline = headerTop + 10.04f;

        canvas.saveState();
        for (int i = 0; i < headers.length; i++) {
            float colLeft = IppbLayout.SUMM_COL_X[i];
            float colWidth = IppbLayout.SUMM_COL_X[i + 1] - colLeft;
            float textWidth = fontTimes.getWidth(headers[i], 8.0f);
            float tx = colLeft + (colWidth - textWidth) / 2.0f;

            canvas.beginText();
            canvas.setFontAndSize(fontTimes, 8.0f);
            canvas.setFillColor(IppbLayout.COLOR_WHITE);
            canvas.moveText(tx, H - headerBaseline);
            canvas.showText(headers[i]);
            canvas.endText();
        }

        // Summary Values
        double openingBal = record.accountInfo() != null ? record.accountInfo().openingBalance() : 122.73;
        double totalDebits = record.totalDebits();
        double totalCredits = record.totalCredits();
        double closingBal = record.closingBalance();

        String opStr = formatAmountWithCommas(openingBal);
        String drStr = formatAmountWithCommas(totalDebits);
        String crStr = formatAmountWithCommas(totalCredits);
        String clStr = formatAmountWithCommas(closingBal);
        String cntStr = Integer.toString(txCount);

        String[] values = { opStr, drStr, crStr, clStr, cntStr };
        float valBaseline = headerBottom + 10.03f;

        for (int i = 0; i < values.length; i++) {
            float colLeft = IppbLayout.SUMM_COL_X[i];
            float colWidth = IppbLayout.SUMM_COL_X[i + 1] - colLeft;
            float textWidth = fontTimes.getWidth(values[i], 8.0f);
            float tx = colLeft + (colWidth - textWidth) / 2.0f;

            canvas.beginText();
            canvas.setFontAndSize(fontTimes, 8.0f);
            canvas.setFillColor(IppbLayout.COLOR_MAROON);
            canvas.moveText(tx, H - valBaseline);
            canvas.showText(values[i]);
            canvas.endText();
        }
        canvas.restoreState();

        // Borders around Summary Table
        canvas.saveState();
        canvas.setStrokeColor(IppbLayout.COLOR_MAROON);
        canvas.setLineWidth(0.75f);
        // Vertical lines
        for (float x : IppbLayout.SUMM_COL_X) {
            canvas.moveTo(x, H - headerTop);
            canvas.lineTo(x, H - rowBottom);
        }
        canvas.stroke();
        canvas.restoreState();

        drawHorizontalLine(canvas, H, headerTop, 18.0f, 594.0f, IppbLayout.COLOR_MAROON, 0.75f);
        drawHorizontalLine(canvas, H, headerBottom, 18.0f, 594.0f, IppbLayout.COLOR_MAROON, 0.75f);
        drawHorizontalLine(canvas, H, rowBottom, 18.0f, 594.0f, IppbLayout.COLOR_MAROON, 0.75f);

        // ******************* END OF REPORT *******************
        float endReportBaseline = rowBottom + 18.04f;
        canvas.saveState();
        canvas.beginText();
        canvas.setFontAndSize(fontTimesBold, 16.0f);
        canvas.setFillColor(IppbLayout.COLOR_MAROON);
        canvas.moveText(85.14f, H - endReportBaseline);
        canvas.showText("******************* END OF REPORT *******************");
        canvas.endText();

        // Disclaimer
        float disc1Baseline = endReportBaseline + 12.02f;
        float disc2Baseline = disc1Baseline + 11.16f;
        float disc3Baseline = disc2Baseline + 11.16f;

        canvas.beginText();
        canvas.setFontAndSize(fontTimes, 10.0f);
        canvas.setFillColor(IppbLayout.COLOR_MAROON);
        canvas.moveText(26.62f, H - disc1Baseline);
        canvas.showText("DISCLAIMER : Please review information provided in the statement, in case of any discrepancy, please inform the bank within 15 days of ");
        canvas.endText();

        canvas.beginText();
        canvas.setFontAndSize(fontTimes, 10.0f);
        canvas.setFillColor(IppbLayout.COLOR_MAROON);
        canvas.moveText(242.71f, H - disc2Baseline);
        canvas.showText("the receipt of account statement");
        canvas.endText();

        canvas.beginText();
        canvas.setFontAndSize(fontTimes, 10.0f);
        canvas.setFillColor(IppbLayout.COLOR_MAROON);
        canvas.moveText(198.37f, H - disc3Baseline);
        canvas.showText("Call Us at 155299 Email Us at contact@ippbonline.in");
        canvas.endText();
        canvas.restoreState();

        return disc3Baseline + 4.0f;
    }

    private float renderGuidelinesSection(PdfCanvas canvas, PdfFont fontTimes, PdfFont fontTimesBold, float H,
                                          float startY, int startIdx, int endIdx, boolean includeHeading) {
        float currentBaseline = startY;

        canvas.saveState();
        if (includeHeading) {
            currentBaseline += 16.70f;
            canvas.beginText();
            canvas.setFontAndSize(fontTimesBold, 16.0f);
            canvas.setFillColor(IppbLayout.COLOR_MAROON);
            canvas.moveText(19.98f, H - currentBaseline);
            canvas.showText("Guidelines for safe and secure Mobile Banking");
            canvas.endText();
        }

        for (int i = startIdx; i <= endIdx && i < GUIDELINES_BULLETS.length; i++) {
            currentBaseline += 11.16f;
            canvas.beginText();
            canvas.setFontAndSize(fontTimes, 10.0f);
            canvas.setFillColor(IppbLayout.COLOR_MAROON);
            canvas.moveText(19.80f, H - currentBaseline);
            canvas.showText(GUIDELINES_BULLETS[i]);
            canvas.endText();
        }
        canvas.restoreState();

        return currentBaseline;
    }

    private void renderRememberThatSection(PdfCanvas canvas, PdfFont fontTimes, PdfFont fontTimesBold, float H, float startY) {
        float titleBaseline = startY + 20.59f;

        canvas.saveState();
        canvas.beginText();
        canvas.setFontAndSize(fontTimesBold, 16.0f);
        canvas.setFillColor(IppbLayout.COLOR_MAROON);
        canvas.moveText(19.98f, H - titleBaseline);
        canvas.showText("Remember that");
        canvas.endText();

        float b1Baseline = titleBaseline + 12.02f;
        canvas.beginText();
        canvas.setFontAndSize(fontTimes, 10.0f);
        canvas.setFillColor(IppbLayout.COLOR_MAROON);
        canvas.moveText(19.80f, H - b1Baseline);
        canvas.showText(REMEMBER_BULLETS[0]);
        canvas.endText();

        float b2Baseline = b1Baseline + 11.16f;
        canvas.beginText();
        canvas.setFontAndSize(fontTimes, 10.0f);
        canvas.setFillColor(IppbLayout.COLOR_MAROON);
        canvas.moveText(19.80f, H - b2Baseline);
        canvas.showText(REMEMBER_BULLETS[1]);
        canvas.endText();
        canvas.restoreState();
    }

    private void drawHorizontalLine(PdfCanvas canvas, float H, float y, float x1, float x2, DeviceRgb color, float lineWidth) {
        canvas.saveState();
        canvas.setStrokeColor(color);
        canvas.setLineWidth(lineWidth);
        canvas.moveTo(x1, H - y);
        canvas.lineTo(x2, H - y);
        canvas.stroke();
        canvas.restoreState();
    }

    private List<PageSlice> layoutPages(List<Transaction> transactions, PdfFont fontTimes) {
        List<PageSlice> slices = new ArrayList<>();
        List<TxRow> allRows = new ArrayList<>();

        for (int i = 0; i < transactions.size(); i++) {
            Transaction t = transactions.get(i);
            allRows.add(prepareTxRow(t, i, fontTimes));
        }

        int txIdx = 0;
        int totalTxs = allRows.size();

        // Page 1
        PageSlice p1 = new PageSlice();
        float p1Height = IppbLayout.P1_ROWS_START_Y;
        while (txIdx < totalTxs) {
            TxRow r = allRows.get(txIdx);
            if (p1Height + r.rowHeight > IppbLayout.P1_MAX_TABLE_Y) {
                break;
            }
            p1.txRows.add(r);
            p1Height += r.rowHeight;
            txIdx++;
        }
        slices.add(p1);

        // Continuation transaction pages
        while (txIdx < totalTxs) {
            PageSlice cont = new PageSlice();
            float contHeight = IppbLayout.CONT_ROWS_START_Y;
            while (txIdx < totalTxs) {
                TxRow r = allRows.get(txIdx);
                if (contHeight + r.rowHeight > IppbLayout.CONT_MAX_TABLE_Y) {
                    break;
                }
                cont.txRows.add(r);
                contHeight += r.rowHeight;
                txIdx++;
            }
            slices.add(cont);
        }

        // Now handle summary & guidelines on the final page(s)
        PageSlice lastSlice = slices.get(slices.size() - 1);
        boolean isP1 = (slices.size() == 1);
        float currentY = isP1 ? IppbLayout.P1_ROWS_START_Y : IppbLayout.CONT_ROWS_START_Y;
        for (TxRow r : lastSlice.txRows) {
            currentY += r.rowHeight;
        }

        float maxY = isP1 ? IppbLayout.P1_MAX_TABLE_Y : IppbLayout.CONT_MAX_TABLE_Y;
        float remainingSpace = maxY - currentY;

        // Total height for summary table + END OF REPORT + disclaimer = ~110 pt
        if (remainingSpace >= 110.0f) {
            lastSlice.hasSummaryTable = true;
            lastSlice.includeGuidelinesHeading = true;

            // How many guideline bullets fit?
            float spaceAfterSummary = remainingSpace - 107.0f;
            int bulletsThatFit = (int) Math.floor((spaceAfterSummary - 18.0f) / 11.16f);

            if (bulletsThatFit >= GUIDELINES_BULLETS.length + 4) { // all bullets + remember that
                lastSlice.guidelineStartIdx = 0;
                lastSlice.guidelineEndIdx = GUIDELINES_BULLETS.length - 1;
                lastSlice.includeRememberThat = true;
            } else if (bulletsThatFit > 0) {
                int endIdx = Math.min(bulletsThatFit - 1, GUIDELINES_BULLETS.length - 1);
                lastSlice.guidelineStartIdx = 0;
                lastSlice.guidelineEndIdx = endIdx;

                // Overflow to an extra page
                PageSlice overflow = new PageSlice();
                overflow.guidelineStartIdx = endIdx + 1;
                overflow.guidelineEndIdx = GUIDELINES_BULLETS.length - 1;
                overflow.includeGuidelinesHeading = false;
                overflow.includeRememberThat = true;
                slices.add(overflow);
            } else {
                // Summary fits, all bullets go to next page
                PageSlice overflow = new PageSlice();
                overflow.includeGuidelinesHeading = true;
                overflow.guidelineStartIdx = 0;
                overflow.guidelineEndIdx = GUIDELINES_BULLETS.length - 1;
                overflow.includeRememberThat = true;
                slices.add(overflow);
            }
        } else {
            // Start a new page for summary and guidelines
            PageSlice summarySlice = new PageSlice();
            summarySlice.hasSummaryTable = true;
            summarySlice.includeGuidelinesHeading = true;
            summarySlice.guidelineStartIdx = 0;
            summarySlice.guidelineEndIdx = GUIDELINES_BULLETS.length - 1;
            summarySlice.includeRememberThat = true;
            slices.add(summarySlice);
        }

        return slices;
    }

    private TxRow prepareTxRow(Transaction t, int index, PdfFont fontTimes) {
        TxRow r = new TxRow();
        r.dateStr = (t.valueDate() != null && !t.valueDate().isBlank()) ? formatTxDate(t.valueDate()) : "02-04-2026";
        r.tranId = (t.refNo() != null && !t.refNo().isBlank() && t.refNo().startsWith("S"))
                ? t.refNo() : "S" + (50000000 + (index * 739311) % 49000000);

        String desc = t.details() != null ? t.details() : "UPI Transaction";
        if (desc.contains("\n")) {
            int nl = desc.indexOf('\n');
            r.particularsLine1 = desc.substring(0, nl);
            r.particularsLine2 = desc.substring(nl + 1);
            r.rowHeight = 21.60f;
        } else {
            int lastSpace = desc.lastIndexOf(' ');
            if (lastSpace > 15 && fontTimes.getWidth(desc, 8.0f) > 198.0f) {
                r.particularsLine1 = desc.substring(0, lastSpace);
                r.particularsLine2 = desc.substring(lastSpace + 1);
                r.rowHeight = 21.60f;
            } else {
                r.particularsLine1 = desc;
                r.particularsLine2 = "";
                r.rowHeight = 12.68f;
            }
        }

        r.debitStr = (t.debit() != null && t.debit() > 0.001) ? String.format(Locale.ENGLISH, "%.2f", t.debit()) : "";
        r.creditStr = (t.credit() != null && t.credit() > 0.001) ? String.format(Locale.ENGLISH, "%.2f", t.credit()) : "";
        r.balanceStr = String.format(Locale.ENGLISH, "%.2f", Math.abs(t.balance()));
        r.suffix = (t.balance() >= 0) ? "Cr." : "Dr.";

        return r;
    }

    private String formatTxDate(String dateStr) {
        try {
            if (dateStr.matches("\\d{2}-\\d{2}-\\d{4}")) return dateStr;
            if (dateStr.matches("\\d{4}-\\d{2}-\\d{2}")) {
                LocalDate d = LocalDate.parse(dateStr);
                return d.format(IPPB_DATE_FMT);
            }
        } catch (Exception ignored) {}
        return dateStr;
    }

    private String formatPeriodDate(String dateStr) {
        try {
            if (dateStr.matches("\\d{4}-\\d{2}-\\d{2}")) {
                LocalDate d = LocalDate.parse(dateStr);
                return d.format(IPPB_PERIOD_FMT);
            }
            if (dateStr.matches("\\d{2}-\\d{2}-\\d{4}")) {
                LocalDate d = LocalDate.parse(dateStr, IPPB_DATE_FMT);
                return d.format(IPPB_PERIOD_FMT);
            }
        } catch (Exception ignored) {}
        return dateStr;
    }

    private String formatAmountWithCommas(double val) {
        String base = String.format(Locale.ENGLISH, "%.2f", val);
        int dot = base.indexOf('.');
        String intPart = (dot >= 0) ? base.substring(0, dot) : base;
        String decPart = (dot >= 0) ? base.substring(dot) : "";

        if (intPart.length() <= 3) return base;

        String last3 = intPart.substring(intPart.length() - 3);
        String rest = intPart.substring(0, intPart.length() - 3);

        StringBuilder sb = new StringBuilder();
        for (int i = 0; i < rest.length(); i++) {
            if (i > 0 && (rest.length() - i) % 2 == 0) {
                sb.append(',');
            }
            sb.append(rest.charAt(i));
        }
        sb.append(',').append(last3).append(decPart);
        return sb.toString();
    }

    private byte[] loadResourceBytes(String path) {
        try (InputStream in = getClass().getResourceAsStream(path)) {
            if (in != null) {
                return in.readAllBytes();
            }
        } catch (Exception ignored) {}
        return null;
    }

    private static class TxRow {
        String dateStr;
        String tranId;
        String particularsLine1;
        String particularsLine2;
        String debitStr;
        String creditStr;
        String balanceStr;
        String suffix;
        float rowHeight;
    }

    private static class PageSlice {
        List<TxRow> txRows = new ArrayList<>();
        boolean hasSummaryTable = false;
        boolean includeGuidelinesHeading = false;
        int guidelineStartIdx = -1;
        int guidelineEndIdx = -1;
        boolean includeRememberThat = false;
    }
}
