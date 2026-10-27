package com.statementpro.pdf;

import com.itextpdf.io.font.PdfEncodings;
import com.itextpdf.io.image.ImageData;
import com.itextpdf.io.image.ImageDataFactory;
import com.itextpdf.kernel.colors.ColorConstants;
import com.itextpdf.kernel.colors.DeviceRgb;
import com.itextpdf.kernel.font.PdfFont;
import com.itextpdf.kernel.font.PdfFontFactory;
import com.itextpdf.kernel.geom.PageSize;
import com.itextpdf.kernel.geom.Rectangle;
import com.itextpdf.kernel.pdf.PdfDocument;
import com.itextpdf.kernel.pdf.PdfPage;
import com.itextpdf.kernel.pdf.PdfWriter;
import com.itextpdf.kernel.pdf.WriterProperties;
import com.itextpdf.kernel.pdf.canvas.PdfCanvas;
import com.itextpdf.layout.Document;
import com.itextpdf.layout.borders.Border;
import com.itextpdf.layout.borders.SolidBorder;
import com.itextpdf.layout.element.AreaBreak;
import com.itextpdf.layout.element.Cell;
import com.itextpdf.layout.element.Div;
import com.itextpdf.layout.element.Image;
import com.itextpdf.layout.element.Paragraph;
import com.itextpdf.layout.element.Table;
import com.itextpdf.layout.properties.AreaBreakType;
import com.itextpdf.layout.properties.HorizontalAlignment;
import com.itextpdf.layout.properties.TextAlignment;
import com.itextpdf.layout.properties.UnitValue;
import com.itextpdf.layout.properties.VerticalAlignment;
import com.statementpro.model.BranchDetails;
import com.statementpro.model.CustomerDetails;
import com.statementpro.model.StatementRecord;
import com.statementpro.model.Transaction;

import java.io.ByteArrayOutputStream;
import java.io.InputStream;
import java.text.DecimalFormat;
import java.text.DecimalFormatSymbols;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;

/**
 * 100% Pixel-accurate SBI V1 Statement Template.
 * Exact replication of "Bank Statement Generator.pdf".
 */
public class SbiV1Template implements StatementTemplate {

    // ── Exact Colors ────────────────────────────────────────────────────────
    private static final DeviceRgb COLOR_PURPLE_HEADER = new DeviceRgb(84, 82, 170);   // #5452AA
    private static final DeviceRgb COLOR_PURPLE_BORDER = new DeviceRgb(116, 114, 203); // #7472CB
    private static final DeviceRgb COLOR_CYAN_BANK     = new DeviceRgb(0, 183, 255);   // #00B7FF
    private static final DeviceRgb COLOR_BLACK         = new DeviceRgb(0, 0, 0);
    private static final DeviceRgb COLOR_WHITE         = new DeviceRgb(255, 255, 255);
    private static final DeviceRgb COLOR_DARK_GRAY     = new DeviceRgb(17, 24, 39);    // #111827
    private static final DeviceRgb COLOR_MUTED_GRAY    = new DeviceRgb(75, 85, 99);    // #4B5563
    private static final DeviceRgb COLOR_LIGHT_BORDER  = new DeviceRgb(224, 224, 224); // #E0E0E0
    private static final DeviceRgb COLOR_DIVIDER       = new DeviceRgb(226, 232, 240); // #E2E8F0
    private static final DeviceRgb COLOR_RED_DEBIT     = new DeviceRgb(220, 38, 38);
    private static final DeviceRgb COLOR_GREEN_CREDIT  = new DeviceRgb(5, 150, 105);

    // ── Layout Dimensions (Points) ──────────────────────────────────────────
    private static final float PAGE_WIDTH    = 595.5f;
    private static final float PAGE_HEIGHT   = 842.25f;
    private static final float MARGIN_SIDE   = 23.25f;
    private static final float USABLE_WIDTH  = 549.0f; // 595.5 - 2 * 23.25

    // Ledger Table Column Widths (matching exact coordinates):
    // Col 0: Value Date      48.00pt  (9.0%)
    // Col 1: Post Date       47.25pt  (9.0%)
    // Col 2: Details        206.25pt (39.0%)
    // Col 3: Ref No/Chq No   60.00pt (11.0%)
    // Col 4: ₹ Debit         60.75pt (11.5%)
    // Col 5: ₹ Credit        60.75pt (11.5%)
    // Col 6: Balance         66.00pt (12.5%)
    //                       ────────
    // Total                 549.00pt
    private static final float[] LEDGER_COLS = { 48.00f, 47.25f, 206.25f, 60.00f, 60.75f, 60.75f, 66.00f };

    private static final int PAGE_1_ROWS = 6;
    private static final int CONT_PAGE_ROWS = 21;

    @Override
    public byte[] render(StatementRecord record) throws java.io.IOException {
        return render(record, null);
    }

    @Override
    public byte[] render(StatementRecord record, WriterProperties writerProperties) throws java.io.IOException {
        ByteArrayOutputStream out = new ByteArrayOutputStream();
        PdfWriter writer = writerProperties != null ? new PdfWriter(out, writerProperties) : new PdfWriter(out);

        try (PdfDocument pdfDoc = new PdfDocument(writer);
             Document doc = new Document(pdfDoc, PageSize.A4, false)) {

            // Set document margins: 0 top, side margins, 20pt bottom
            doc.setMargins(0f, MARGIN_SIDE, 20f, MARGIN_SIDE);

            // Official banking metadata (clean authentic tags)
            pdfDoc.getDocumentInfo()
                    .setTitle("Account Statement")
                    .setAuthor("State Bank of India")
                    .setCreator("State Bank of India CBS")
                    .setSubject("Account Statement");

            // Load fonts (Embedded Arial for exact glyphs + Rupee symbol support)
            PdfFont fontRegular = loadFont("/fonts/arial.ttf");
            PdfFont fontBold    = loadFont("/fonts/arialbd.ttf");

            List<Transaction> transactions = record.transactions() != null ? record.transactions() : List.of();

            String startDateStr = (transactions.isEmpty() ? "01-01-2026" : transactions.get(0).valueDate()).replace('/', '-');
            String endDateStr   = (transactions.isEmpty() ? "27-10-2026" : transactions.get(transactions.size() - 1).valueDate()).replace('/', '-');

            // Split transactions: 6 on Page 1, 21 on continuation pages
            List<List<Transaction>> pages = splitTransactions(transactions);

            // Final page is dedicated Statement Summary page
            int totalPages = pages.size() + 1;

            byte[] headerLogoBytes = loadResourceBytes("/logos/sbi_v1_header.png");

            // Calculate totals for summary page
            double totalDebit = 0.0;
            double totalCredit = 0.0;
            int drCount = 0;
            int crCount = 0;
            for (Transaction tx : transactions) {
                if (tx.debit() != null && tx.debit() > 0) {
                    totalDebit += tx.debit();
                    drCount++;
                }
                if (tx.credit() != null && tx.credit() > 0) {
                    totalCredit += tx.credit();
                    crCount++;
                }
            }
            double openingBal = record.accountInfo() != null ? record.accountInfo().openingBalance() : 90000.0;
            double closingBal = transactions.isEmpty() ? openingBal : transactions.get(transactions.size() - 1).balance();

            // ── Render Pages ────────────────────────────────────────────────
            for (int pIdx = 0; pIdx < totalPages; pIdx++) {
                boolean isFirstPage = (pIdx == 0);
                boolean isLastPage  = (pIdx == totalPages - 1);

                if (!isFirstPage) {
                    doc.add(new AreaBreak(AreaBreakType.NEXT_PAGE));
                }

                if (isFirstPage) {
                    // Exact top margin so table starts at y = 552.0pt (matching reference PDF)
                    doc.add(new Paragraph("").setMarginTop(550.0f).setMarginBottom(0));

                    // ── Page 1 Ledger Table (6 rows) ────────────────────
                    List<Transaction> p1Txns = pages.isEmpty() ? List.of() : pages.get(0);
                    doc.add(buildLedgerTable(p1Txns, fontRegular, fontBold, false));

                } else if (!isLastPage) {
                    // Continuation Ledger Page (21 rows)
                    doc.add(new Paragraph("").setMarginTop(10.0f).setMarginBottom(0));
                    List<Transaction> contTxns = pages.get(pIdx);
                    doc.add(buildLedgerTable(contTxns, fontRegular, fontBold, true));

                } else {
                    // Final Page: Statement Summary Table & Disclaimers
                    doc.add(new Paragraph("").setMarginTop(320.0f).setMarginBottom(0));
                    doc.add(buildSummaryTable(fontRegular, fontBold, startDateStr, endDateStr, openingBal, drCount, crCount, totalDebit, totalCredit, closingBal));
                    doc.add(buildDisclaimers(fontRegular));
                }
            }

            // Flush document layout
            doc.flush();

            // Post-rendering canvas overlay
            int actualPages = pdfDoc.getNumberOfPages();
            if (actualPages > 0) {
                PdfPage page1 = pdfDoc.getPage(1);
                PdfCanvas page1Canvas = new PdfCanvas(page1);
                drawTopHeaderBanner(page1Canvas, fontRegular, fontBold, record, endDateStr, headerLogoBytes);
                drawPage1Icons(page1Canvas);
                drawPage1HeaderAndDossier(page1Canvas, fontRegular, fontBold, record, startDateStr, endDateStr, closingBal);
            }

            for (int i = 1; i <= actualPages; i++) {
                PdfPage page = pdfDoc.getPage(i);
                PdfCanvas pageCanvas = new PdfCanvas(page);
                drawPageFooter(pageCanvas, fontRegular, i);
            }
        }

        return out.toByteArray();
    }

    // ── Helper: Draw Top Header Banner ──────────────────────────────────────
    private void drawTopHeaderBanner(PdfCanvas canvas, PdfFont regular, PdfFont bold,
                                     StatementRecord record, String dateStr, byte[] logoBytes) {
        float bannerHeight = 51.0f;
        float bannerY = PAGE_HEIGHT - bannerHeight;

        canvas.saveState();
        // Purple background
        canvas.setFillColor(COLOR_PURPLE_HEADER);
        canvas.rectangle(0, bannerY, PAGE_WIDTH, bannerHeight);
        canvas.fill();

        // Bottom thin black border (1.5pt)
        canvas.setFillColor(COLOR_BLACK);
        canvas.rectangle(0, bannerY, PAGE_WIDTH, 1.5f);
        canvas.fill();
        canvas.restoreState();

        // Logo on left: exact 126.75pt x 48.0pt at x=8.25, y=793.5 inside banner
        if (logoBytes != null) {
            try {
                ImageData imgData = ImageDataFactory.create(logoBytes);
                canvas.addImageWithTransformationMatrix(imgData, 126.75f, 0, 0, 48.0f, 8.25f, 793.5f);
            } catch (Exception ignored) {}
        }

        // Capsule text: "As on {date}"
        canvas.saveState();
        canvas.beginText();
        canvas.setFontAndSize(regular, 8.25f);
        canvas.setFillColor(COLOR_WHITE);
        canvas.moveText(274.58f, 814.75f);
        canvas.showText("As on " + dateStr);
        canvas.endText();
        canvas.restoreState();

        // Right Welcome section: "Welcome:" and customer name
        String custName = record.customerDetails() != null && record.customerDetails().accountHolderName() != null
                ? record.customerDetails().accountHolderName() : "SUDHIR KUMAR SHARMA";

        canvas.saveState();
        canvas.beginText();
        canvas.setFontAndSize(regular, 8.25f);
        canvas.setFillColor(COLOR_WHITE);
        float welcomeWidth = regular.getWidth("Welcome:", 8.25f);
        canvas.moveText(586.75f - welcomeWidth, 820.75f);
        canvas.showText("Welcome:");
        canvas.endText();

        canvas.beginText();
        canvas.setFontAndSize(bold, 8.62f);
        canvas.setFillColor(COLOR_WHITE);
        float nameWidth = bold.getWidth(custName, 8.62f);
        canvas.moveText(586.75f - nameWidth, 810.17f);
        canvas.showText(custName);
        canvas.endText();
        canvas.restoreState();
    }

    private void drawPage1Icons(PdfCanvas canvas) {
        canvas.saveState();
        // Drawn using exact vector paths extracted from reference PDF
        // Drawing 178 (f) rect=(22.50, 79.50, 572.25, 81.00)
        canvas.saveState();
        canvas.setFillColor(new DeviceRgb(0.8863000273704529f, 0.9097999930381775f, 0.9412000179290771f));
        canvas.rectangle(22.50f, 761.25f, 549.75f, 1.50f);
        canvas.fill();
        canvas.restoreState();
        // Drawing 179 (f) rect=(45.75, 96.75, 46.50, 116.25)
        canvas.saveState();
        canvas.setFillColor(new DeviceRgb(0.4000000059604645f, 0.20000000298023224f, 0.5685999989509583f));
        canvas.rectangle(45.75f, 726.00f, 0.75f, 19.50f);
        canvas.fill();
        canvas.restoreState();
        // Drawing 180 (s) rect=(29.27, 101.52, 33.73, 105.98)
        canvas.saveState();
        canvas.setStrokeColor(new DeviceRgb(0.4000000059604645f, 0.20000000298023224f, 0.5685999989509583f));
        canvas.setLineWidth(1.375f);
        canvas.moveTo(33.73f, 738.50f);
        canvas.curveTo(33.73f, 738.20f, 33.68f, 737.92f, 33.56f, 737.64f);
        canvas.moveTo(33.56f, 737.64f);
        canvas.curveTo(33.45f, 737.37f, 33.29f, 737.13f, 33.08f, 736.92f);
        canvas.moveTo(33.08f, 736.92f);
        canvas.curveTo(32.87f, 736.71f, 32.63f, 736.55f, 32.36f, 736.44f);
        canvas.moveTo(32.36f, 736.44f);
        canvas.curveTo(32.08f, 736.32f, 31.80f, 736.27f, 31.50f, 736.27f);
        canvas.moveTo(31.50f, 736.27f);
        canvas.curveTo(31.20f, 736.27f, 30.92f, 736.32f, 30.64f, 736.44f);
        canvas.moveTo(30.64f, 736.44f);
        canvas.curveTo(30.37f, 736.55f, 30.13f, 736.71f, 29.92f, 736.92f);
        canvas.moveTo(29.92f, 736.92f);
        canvas.curveTo(29.71f, 737.13f, 29.55f, 737.37f, 29.44f, 737.64f);
        canvas.moveTo(29.44f, 737.64f);
        canvas.curveTo(29.32f, 737.92f, 29.27f, 738.20f, 29.27f, 738.50f);
        canvas.moveTo(29.27f, 738.50f);
        canvas.curveTo(29.27f, 738.80f, 29.32f, 739.08f, 29.44f, 739.36f);
        canvas.moveTo(29.44f, 739.36f);
        canvas.curveTo(29.55f, 739.63f, 29.71f, 739.87f, 29.92f, 740.08f);
        canvas.moveTo(29.92f, 740.08f);
        canvas.curveTo(30.13f, 740.29f, 30.37f, 740.45f, 30.64f, 740.56f);
        canvas.moveTo(30.64f, 740.56f);
        canvas.curveTo(30.92f, 740.68f, 31.20f, 740.73f, 31.50f, 740.73f);
        canvas.moveTo(31.50f, 740.73f);
        canvas.curveTo(31.80f, 740.73f, 32.08f, 740.68f, 32.36f, 740.56f);
        canvas.moveTo(32.36f, 740.56f);
        canvas.curveTo(32.63f, 740.45f, 32.87f, 740.29f, 33.08f, 740.08f);
        canvas.moveTo(33.08f, 740.08f);
        canvas.curveTo(33.29f, 739.87f, 33.45f, 739.63f, 33.56f, 739.36f);
        canvas.moveTo(33.56f, 739.36f);
        canvas.curveTo(33.68f, 739.08f, 33.73f, 738.80f, 33.73f, 738.50f);
        canvas.stroke();
        canvas.restoreState();
        // Drawing 181 (s) rect=(23.94, 98.94, 39.06, 114.06)
        canvas.saveState();
        canvas.setStrokeColor(new DeviceRgb(0.4000000059604645f, 0.20000000298023224f, 0.5685999989509583f));
        canvas.setLineWidth(1.375f);
        canvas.moveTo(27.24f, 730.80f);
        canvas.curveTo(27.79f, 733.00f, 29.30f, 734.10f, 31.50f, 734.10f);
        canvas.moveTo(31.50f, 734.10f);
        canvas.curveTo(33.70f, 734.10f, 35.21f, 733.00f, 35.76f, 730.80f);
        canvas.moveTo(31.50f, 728.19f);
        canvas.curveTo(32.00f, 728.19f, 32.49f, 728.24f, 32.98f, 728.33f);
        canvas.moveTo(32.98f, 728.33f);
        canvas.curveTo(33.46f, 728.43f, 33.94f, 728.57f, 34.39f, 728.76f);
        canvas.moveTo(34.39f, 728.76f);
        canvas.curveTo(34.85f, 728.95f, 35.29f, 729.19f, 35.70f, 729.46f);
        canvas.moveTo(35.70f, 729.46f);
        canvas.curveTo(36.11f, 729.74f, 36.50f, 730.05f, 36.85f, 730.40f);
        canvas.moveTo(36.85f, 730.40f);
        canvas.curveTo(37.20f, 730.75f, 37.51f, 731.14f, 37.79f, 731.55f);
        canvas.moveTo(37.79f, 731.55f);
        canvas.curveTo(38.06f, 731.96f, 38.30f, 732.40f, 38.49f, 732.86f);
        canvas.moveTo(38.49f, 732.86f);
        canvas.curveTo(38.68f, 733.31f, 38.82f, 733.79f, 38.92f, 734.27f);
        canvas.moveTo(38.92f, 734.27f);
        canvas.curveTo(39.01f, 734.76f, 39.06f, 735.25f, 39.06f, 735.75f);
        canvas.moveTo(39.06f, 735.75f);
        canvas.curveTo(39.06f, 736.25f, 39.01f, 736.74f, 38.92f, 737.23f);
        canvas.moveTo(38.92f, 737.23f);
        canvas.curveTo(38.82f, 737.71f, 38.68f, 738.19f, 38.49f, 738.64f);
        canvas.moveTo(38.49f, 738.64f);
        canvas.curveTo(38.30f, 739.10f, 38.06f, 739.54f, 37.79f, 739.95f);
        canvas.moveTo(37.79f, 739.95f);
        canvas.curveTo(37.51f, 740.36f, 37.20f, 740.75f, 36.85f, 741.10f);
        canvas.moveTo(36.85f, 741.10f);
        canvas.curveTo(36.50f, 741.45f, 36.11f, 741.76f, 35.70f, 742.04f);
        canvas.moveTo(35.70f, 742.04f);
        canvas.curveTo(35.29f, 742.31f, 34.85f, 742.55f, 34.39f, 742.74f);
        canvas.moveTo(34.39f, 742.74f);
        canvas.curveTo(33.94f, 742.93f, 33.46f, 743.07f, 32.98f, 743.17f);
        canvas.moveTo(32.98f, 743.17f);
        canvas.curveTo(32.49f, 743.26f, 32.00f, 743.31f, 31.50f, 743.31f);
        canvas.moveTo(31.50f, 743.31f);
        canvas.curveTo(31.00f, 743.31f, 30.51f, 743.26f, 30.02f, 743.17f);
        canvas.moveTo(30.02f, 743.17f);
        canvas.curveTo(29.54f, 743.07f, 29.06f, 742.93f, 28.61f, 742.74f);
        canvas.moveTo(28.61f, 742.74f);
        canvas.curveTo(28.15f, 742.55f, 27.71f, 742.31f, 27.30f, 742.04f);
        canvas.moveTo(27.30f, 742.04f);
        canvas.curveTo(26.89f, 741.76f, 26.50f, 741.45f, 26.15f, 741.10f);
        canvas.moveTo(26.15f, 741.10f);
        canvas.curveTo(25.80f, 740.75f, 25.49f, 740.36f, 25.21f, 739.95f);
        canvas.moveTo(25.21f, 739.95f);
        canvas.curveTo(24.94f, 739.54f, 24.70f, 739.10f, 24.51f, 738.64f);
        canvas.moveTo(24.51f, 738.64f);
        canvas.curveTo(24.32f, 738.19f, 24.18f, 737.71f, 24.08f, 737.23f);
        canvas.moveTo(24.08f, 737.23f);
        canvas.curveTo(23.99f, 736.74f, 23.94f, 736.25f, 23.94f, 735.75f);
        canvas.moveTo(23.94f, 735.75f);
        canvas.curveTo(23.94f, 735.25f, 23.99f, 734.76f, 24.08f, 734.27f);
        canvas.moveTo(24.08f, 734.27f);
        canvas.curveTo(24.18f, 733.79f, 24.32f, 733.31f, 24.51f, 732.86f);
        canvas.moveTo(24.51f, 732.86f);
        canvas.curveTo(24.70f, 732.40f, 24.94f, 731.96f, 25.21f, 731.55f);
        canvas.moveTo(25.21f, 731.55f);
        canvas.curveTo(25.49f, 731.14f, 25.80f, 730.75f, 26.15f, 730.40f);
        canvas.moveTo(26.15f, 730.40f);
        canvas.curveTo(26.50f, 730.05f, 26.89f, 729.74f, 27.30f, 729.46f);
        canvas.moveTo(27.30f, 729.46f);
        canvas.curveTo(27.71f, 729.19f, 28.15f, 728.95f, 28.61f, 728.76f);
        canvas.moveTo(28.61f, 728.76f);
        canvas.curveTo(29.06f, 728.57f, 29.54f, 728.43f, 30.02f, 728.33f);
        canvas.moveTo(30.02f, 728.33f);
        canvas.curveTo(30.51f, 728.24f, 31.00f, 728.19f, 31.50f, 728.19f);
        canvas.stroke();
        canvas.restoreState();
        // Drawing 182 (f) rect=(45.75, 123.00, 46.50, 142.50)
        canvas.saveState();
        canvas.setFillColor(new DeviceRgb(0.4000000059604645f, 0.20000000298023224f, 0.5685999989509583f));
        canvas.rectangle(45.75f, 699.75f, 0.75f, 19.50f);
        canvas.fill();
        canvas.restoreState();
        // Drawing 183 (s) rect=(25.31, 128.62, 37.69, 137.56)
        canvas.saveState();
        canvas.setStrokeColor(new DeviceRgb(0.4000000059604645f, 0.20000000298023224f, 0.5685999989509583f));
        canvas.setLineWidth(1.375f);
        canvas.rectangle(25.31f, 704.69f, 12.38f, 8.94f);
        canvas.moveTo(25.66f, 712.94f);
        canvas.lineTo(31.50f, 708.81f);
        canvas.moveTo(31.50f, 708.81f);
        canvas.lineTo(37.34f, 712.94f);
        canvas.stroke();
        canvas.restoreState();
        // Drawing 184 (f) rect=(45.75, 160.50, 46.50, 199.50)
        canvas.saveState();
        canvas.setFillColor(new DeviceRgb(0.4000000059604645f, 0.20000000298023224f, 0.5685999989509583f));
        canvas.rectangle(45.75f, 642.75f, 0.75f, 39.00f);
        canvas.fill();
        canvas.restoreState();
        // Drawing 185 (s) rect=(27.37, 173.12, 38.38, 186.88)
        canvas.saveState();
        canvas.setStrokeColor(new DeviceRgb(0.4000000059604645f, 0.20000000298023224f, 0.5685999989509583f));
        canvas.setLineWidth(1.375f);
        canvas.moveTo(38.38f, 663.62f);
        canvas.curveTo(38.38f, 660.19f, 32.88f, 655.38f, 32.88f, 655.38f);
        canvas.moveTo(32.88f, 655.38f);
        canvas.curveTo(32.88f, 655.38f, 27.37f, 660.19f, 27.37f, 663.62f);
        canvas.moveTo(27.37f, 663.62f);
        canvas.curveTo(27.37f, 663.99f, 27.41f, 664.34f, 27.48f, 664.70f);
        canvas.moveTo(27.48f, 664.70f);
        canvas.curveTo(27.55f, 665.05f, 27.66f, 665.40f, 27.79f, 665.73f);
        canvas.moveTo(27.79f, 665.73f);
        canvas.curveTo(27.93f, 666.06f, 28.10f, 666.38f, 28.30f, 666.68f);
        canvas.moveTo(28.30f, 666.68f);
        canvas.curveTo(28.50f, 666.98f, 28.73f, 667.26f, 28.99f, 667.51f);
        canvas.moveTo(28.99f, 667.51f);
        canvas.curveTo(29.24f, 667.77f, 29.52f, 668.00f, 29.82f, 668.20f);
        canvas.moveTo(29.82f, 668.20f);
        canvas.curveTo(30.12f, 668.40f, 30.44f, 668.57f, 30.77f, 668.71f);
        canvas.moveTo(30.77f, 668.71f);
        canvas.curveTo(31.10f, 668.84f, 31.45f, 668.95f, 31.80f, 669.02f);
        canvas.moveTo(31.80f, 669.02f);
        canvas.curveTo(32.16f, 669.09f, 32.51f, 669.12f, 32.88f, 669.12f);
        canvas.moveTo(32.88f, 669.12f);
        canvas.curveTo(33.24f, 669.12f, 33.59f, 669.09f, 33.95f, 669.02f);
        canvas.moveTo(33.95f, 669.02f);
        canvas.curveTo(34.30f, 668.95f, 34.65f, 668.84f, 34.98f, 668.71f);
        canvas.moveTo(34.98f, 668.71f);
        canvas.curveTo(35.31f, 668.57f, 35.63f, 668.40f, 35.93f, 668.20f);
        canvas.moveTo(35.93f, 668.20f);
        canvas.curveTo(36.23f, 668.00f, 36.51f, 667.77f, 36.76f, 667.51f);
        canvas.moveTo(36.76f, 667.51f);
        canvas.curveTo(37.02f, 667.26f, 37.25f, 666.98f, 37.45f, 666.68f);
        canvas.moveTo(37.45f, 666.68f);
        canvas.curveTo(37.65f, 666.38f, 37.82f, 666.06f, 37.96f, 665.73f);
        canvas.moveTo(37.96f, 665.73f);
        canvas.curveTo(38.09f, 665.40f, 38.20f, 665.05f, 38.27f, 664.70f);
        canvas.moveTo(38.27f, 664.70f);
        canvas.curveTo(38.34f, 664.34f, 38.37f, 663.99f, 38.38f, 663.62f);
        canvas.stroke();
        canvas.restoreState();
        // Drawing 186 (s) rect=(31.50, 177.25, 34.25, 180.00)
        canvas.saveState();
        canvas.setStrokeColor(new DeviceRgb(0.4000000059604645f, 0.20000000298023224f, 0.5685999989509583f));
        canvas.setLineWidth(1.375f);
        canvas.moveTo(34.25f, 663.62f);
        canvas.curveTo(34.25f, 663.44f, 34.22f, 663.27f, 34.15f, 663.10f);
        canvas.moveTo(34.15f, 663.10f);
        canvas.curveTo(34.08f, 662.93f, 33.98f, 662.78f, 33.85f, 662.65f);
        canvas.moveTo(33.85f, 662.65f);
        canvas.curveTo(33.72f, 662.52f, 33.57f, 662.42f, 33.40f, 662.35f);
        canvas.moveTo(33.40f, 662.35f);
        canvas.curveTo(33.23f, 662.28f, 33.06f, 662.25f, 32.88f, 662.25f);
        canvas.moveTo(32.88f, 662.25f);
        canvas.curveTo(32.69f, 662.25f, 32.52f, 662.28f, 32.35f, 662.35f);
        canvas.moveTo(32.35f, 662.35f);
        canvas.curveTo(32.18f, 662.42f, 32.03f, 662.52f, 31.90f, 662.65f);
        canvas.moveTo(31.90f, 662.65f);
        canvas.curveTo(31.77f, 662.78f, 31.67f, 662.93f, 31.60f, 663.10f);
        canvas.moveTo(31.60f, 663.10f);
        canvas.curveTo(31.53f, 663.27f, 31.50f, 663.44f, 31.50f, 663.62f);
        canvas.moveTo(31.50f, 663.62f);
        canvas.curveTo(31.50f, 663.81f, 31.53f, 663.98f, 31.60f, 664.15f);
        canvas.moveTo(31.60f, 664.15f);
        canvas.curveTo(31.67f, 664.32f, 31.77f, 664.47f, 31.90f, 664.60f);
        canvas.moveTo(31.90f, 664.60f);
        canvas.curveTo(32.03f, 664.73f, 32.18f, 664.83f, 32.35f, 664.90f);
        canvas.moveTo(32.35f, 664.90f);
        canvas.curveTo(32.52f, 664.97f, 32.69f, 665.00f, 32.88f, 665.00f);
        canvas.moveTo(32.88f, 665.00f);
        canvas.curveTo(33.06f, 665.00f, 33.23f, 664.97f, 33.40f, 664.90f);
        canvas.moveTo(33.40f, 664.90f);
        canvas.curveTo(33.57f, 664.83f, 33.72f, 664.73f, 33.85f, 664.60f);
        canvas.moveTo(33.85f, 664.60f);
        canvas.curveTo(33.98f, 664.47f, 34.08f, 664.32f, 34.15f, 664.15f);
        canvas.moveTo(34.15f, 664.15f);
        canvas.curveTo(34.22f, 663.98f, 34.25f, 663.81f, 34.25f, 663.62f);
        canvas.stroke();
        canvas.restoreState();
        // Drawing 187 (f) rect=(334.50, 142.50, 335.25, 165.00)
        canvas.saveState();
        canvas.setFillColor(new DeviceRgb(0.4000000059604645f, 0.20000000298023224f, 0.5685999989509583f));
        canvas.rectangle(334.50f, 677.25f, 0.75f, 22.50f);
        canvas.fill();
        canvas.restoreState();
        // Drawing 188 (s) rect=(315.37, 146.88, 326.37, 160.62)
        canvas.saveState();
        canvas.setStrokeColor(new DeviceRgb(0.4000000059604645f, 0.20000000298023224f, 0.5685999989509583f));
        canvas.setLineWidth(1.375f);
        canvas.moveTo(326.37f, 689.88f);
        canvas.curveTo(326.37f, 686.44f, 320.87f, 681.62f, 320.87f, 681.62f);
        canvas.moveTo(320.87f, 681.62f);
        canvas.curveTo(320.87f, 681.62f, 315.37f, 686.44f, 315.37f, 689.88f);
        canvas.moveTo(315.37f, 689.88f);
        canvas.curveTo(315.37f, 690.24f, 315.41f, 690.59f, 315.48f, 690.95f);
        canvas.moveTo(315.48f, 690.95f);
        canvas.curveTo(315.55f, 691.30f, 315.66f, 691.65f, 315.79f, 691.98f);
        canvas.moveTo(315.79f, 691.98f);
        canvas.curveTo(315.93f, 692.31f, 316.10f, 692.63f, 316.30f, 692.93f);
        canvas.moveTo(316.30f, 692.93f);
        canvas.curveTo(316.50f, 693.23f, 316.73f, 693.51f, 316.99f, 693.76f);
        canvas.moveTo(316.99f, 693.76f);
        canvas.curveTo(317.24f, 694.02f, 317.52f, 694.25f, 317.82f, 694.45f);
        canvas.moveTo(317.82f, 694.45f);
        canvas.curveTo(318.12f, 694.65f, 318.44f, 694.82f, 318.77f, 694.96f);
        canvas.moveTo(318.77f, 694.96f);
        canvas.curveTo(319.10f, 695.09f, 319.45f, 695.20f, 319.80f, 695.27f);
        canvas.moveTo(319.80f, 695.27f);
        canvas.curveTo(320.16f, 695.34f, 320.51f, 695.38f, 320.87f, 695.38f);
        canvas.moveTo(320.87f, 695.38f);
        canvas.curveTo(321.24f, 695.38f, 321.59f, 695.34f, 321.95f, 695.27f);
        canvas.moveTo(321.95f, 695.27f);
        canvas.curveTo(322.30f, 695.20f, 322.65f, 695.09f, 322.98f, 694.96f);
        canvas.moveTo(322.98f, 694.96f);
        canvas.curveTo(323.31f, 694.82f, 323.63f, 694.65f, 323.93f, 694.45f);
        canvas.moveTo(323.93f, 694.45f);
        canvas.curveTo(324.23f, 694.25f, 324.51f, 694.02f, 324.76f, 693.76f);
        canvas.moveTo(324.76f, 693.76f);
        canvas.curveTo(325.02f, 693.51f, 325.25f, 693.23f, 325.45f, 692.93f);
        canvas.moveTo(325.45f, 692.93f);
        canvas.curveTo(325.65f, 692.63f, 325.82f, 692.31f, 325.96f, 691.98f);
        canvas.moveTo(325.96f, 691.98f);
        canvas.curveTo(326.09f, 691.65f, 326.20f, 691.30f, 326.27f, 690.95f);
        canvas.moveTo(326.27f, 690.95f);
        canvas.curveTo(326.34f, 690.59f, 326.37f, 690.24f, 326.37f, 689.88f);
        canvas.stroke();
        canvas.restoreState();
        // Drawing 189 (s) rect=(319.50, 151.00, 322.25, 153.75)
        canvas.saveState();
        canvas.setStrokeColor(new DeviceRgb(0.4000000059604645f, 0.20000000298023224f, 0.5685999989509583f));
        canvas.setLineWidth(1.375f);
        canvas.moveTo(322.25f, 689.88f);
        canvas.curveTo(322.25f, 689.69f, 322.22f, 689.52f, 322.15f, 689.35f);
        canvas.moveTo(322.15f, 689.35f);
        canvas.curveTo(322.08f, 689.18f, 321.98f, 689.03f, 321.85f, 688.90f);
        canvas.moveTo(321.85f, 688.90f);
        canvas.curveTo(321.72f, 688.77f, 321.57f, 688.67f, 321.40f, 688.60f);
        canvas.moveTo(321.40f, 688.60f);
        canvas.curveTo(321.23f, 688.53f, 321.06f, 688.50f, 320.87f, 688.50f);
        canvas.moveTo(320.87f, 688.50f);
        canvas.curveTo(320.69f, 688.50f, 320.52f, 688.53f, 320.35f, 688.60f);
        canvas.moveTo(320.35f, 688.60f);
        canvas.curveTo(320.18f, 688.67f, 320.03f, 688.77f, 319.90f, 688.90f);
        canvas.moveTo(319.90f, 688.90f);
        canvas.curveTo(319.77f, 689.03f, 319.67f, 689.18f, 319.60f, 689.35f);
        canvas.moveTo(319.60f, 689.35f);
        canvas.curveTo(319.53f, 689.52f, 319.50f, 689.69f, 319.50f, 689.88f);
        canvas.moveTo(319.50f, 689.88f);
        canvas.curveTo(319.50f, 690.06f, 319.53f, 690.23f, 319.60f, 690.40f);
        canvas.moveTo(319.60f, 690.40f);
        canvas.curveTo(319.67f, 690.57f, 319.77f, 690.72f, 319.90f, 690.85f);
        canvas.moveTo(319.90f, 690.85f);
        canvas.curveTo(320.03f, 690.98f, 320.18f, 691.08f, 320.35f, 691.15f);
        canvas.moveTo(320.35f, 691.15f);
        canvas.curveTo(320.52f, 691.22f, 320.69f, 691.25f, 320.87f, 691.25f);
        canvas.moveTo(320.87f, 691.25f);
        canvas.curveTo(321.06f, 691.25f, 321.23f, 691.22f, 321.40f, 691.15f);
        canvas.moveTo(321.40f, 691.15f);
        canvas.curveTo(321.57f, 691.08f, 321.72f, 690.98f, 321.85f, 690.85f);
        canvas.moveTo(321.85f, 690.85f);
        canvas.curveTo(321.98f, 690.72f, 322.08f, 690.57f, 322.15f, 690.40f);
        canvas.moveTo(322.15f, 690.40f);
        canvas.curveTo(322.22f, 690.23f, 322.25f, 690.06f, 322.25f, 689.88f);
        canvas.stroke();
        canvas.restoreState();
        // Drawing 190 (f) rect=(45.75, 230.25, 46.50, 249.75)
        canvas.saveState();
        canvas.setFillColor(new DeviceRgb(0.4000000059604645f, 0.20000000298023224f, 0.5685999989509583f));
        canvas.rectangle(45.75f, 592.50f, 0.75f, 19.50f);
        canvas.fill();
        canvas.restoreState();
        // Drawing 191 (s) rect=(25.31, 235.19, 37.69, 246.19)
        canvas.saveState();
        canvas.setStrokeColor(new DeviceRgb(0.4000000059604645f, 0.20000000298023224f, 0.5685999989509583f));
        canvas.setLineWidth(1.375f);
        canvas.moveTo(26.00f, 607.06f);
        canvas.lineTo(37.00f, 607.06f);
        canvas.moveTo(37.00f, 607.06f);
        canvas.curveTo(37.19f, 607.06f, 37.35f, 607.00f, 37.49f, 606.86f);
        canvas.moveTo(37.49f, 606.86f);
        canvas.curveTo(37.62f, 606.73f, 37.69f, 606.56f, 37.69f, 606.38f);
        canvas.moveTo(37.69f, 606.38f);
        canvas.lineTo(37.69f, 596.75f);
        canvas.moveTo(37.69f, 596.75f);
        canvas.curveTo(37.69f, 596.56f, 37.62f, 596.40f, 37.49f, 596.26f);
        canvas.moveTo(37.49f, 596.26f);
        canvas.curveTo(37.35f, 596.13f, 37.19f, 596.06f, 37.00f, 596.06f);
        canvas.moveTo(37.00f, 596.06f);
        canvas.lineTo(26.00f, 596.06f);
        canvas.moveTo(26.00f, 596.06f);
        canvas.curveTo(25.81f, 596.06f, 25.65f, 596.13f, 25.51f, 596.26f);
        canvas.moveTo(25.51f, 596.26f);
        canvas.curveTo(25.38f, 596.40f, 25.31f, 596.56f, 25.31f, 596.75f);
        canvas.moveTo(25.31f, 596.75f);
        canvas.lineTo(25.31f, 606.38f);
        canvas.moveTo(25.31f, 606.38f);
        canvas.curveTo(25.31f, 606.56f, 25.38f, 606.73f, 25.51f, 606.86f);
        canvas.moveTo(25.51f, 606.86f);
        canvas.curveTo(25.65f, 607.00f, 25.81f, 607.06f, 26.00f, 607.06f);
        canvas.stroke();
        canvas.restoreState();
        // Drawing 192 (s) rect=(28.06, 233.81, 37.69, 243.44)
        canvas.saveState();
        canvas.setStrokeColor(new DeviceRgb(0.4000000059604645f, 0.20000000298023224f, 0.5685999989509583f));
        canvas.setLineWidth(1.375f);
        canvas.moveTo(28.06f, 608.44f);
        canvas.lineTo(28.06f, 605.69f);
        canvas.moveTo(34.94f, 608.44f);
        canvas.lineTo(34.94f, 605.69f);
        canvas.moveTo(25.31f, 604.31f);
        canvas.lineTo(37.69f, 604.31f);
        canvas.moveTo(28.06f, 601.56f);
        canvas.lineTo(29.44f, 601.56f);
        canvas.moveTo(31.50f, 601.56f);
        canvas.lineTo(32.88f, 601.56f);
        canvas.moveTo(34.94f, 601.56f);
        canvas.lineTo(35.62f, 601.56f);
        canvas.moveTo(28.06f, 598.81f);
        canvas.lineTo(29.44f, 598.81f);
        canvas.moveTo(31.50f, 598.81f);
        canvas.lineTo(32.88f, 598.81f);
        canvas.moveTo(34.94f, 598.81f);
        canvas.lineTo(35.62f, 598.81f);
        canvas.stroke();
        canvas.restoreState();
        // Drawing 193 (f) rect=(45.75, 260.25, 46.50, 422.25)
        canvas.saveState();
        canvas.setFillColor(new DeviceRgb(0.4000000059604645f, 0.20000000298023224f, 0.5685999989509583f));
        canvas.rectangle(45.75f, 420.00f, 0.75f, 162.00f);
        canvas.fill();
        canvas.restoreState();
        // Drawing 194 (s) rect=(24.62, 336.44, 38.38, 346.06)
        canvas.saveState();
        canvas.setStrokeColor(new DeviceRgb(0.4000000059604645f, 0.20000000298023224f, 0.5685999989509583f));
        canvas.setLineWidth(1.375f);
        canvas.moveTo(26.00f, 505.81f);
        canvas.lineTo(37.00f, 505.81f);
        canvas.moveTo(37.00f, 505.81f);
        canvas.curveTo(37.18f, 505.81f, 37.36f, 505.78f, 37.53f, 505.71f);
        canvas.moveTo(37.53f, 505.71f);
        canvas.curveTo(37.69f, 505.64f, 37.84f, 505.54f, 37.97f, 505.41f);
        canvas.moveTo(37.97f, 505.41f);
        canvas.curveTo(38.10f, 505.28f, 38.20f, 505.13f, 38.27f, 504.96f);
        canvas.moveTo(38.27f, 504.96f);
        canvas.curveTo(38.34f, 504.80f, 38.38f, 504.62f, 38.38f, 504.44f);
        canvas.moveTo(38.38f, 504.44f);
        canvas.lineTo(38.38f, 497.56f);
        canvas.moveTo(38.38f, 497.56f);
        canvas.curveTo(38.38f, 497.38f, 38.34f, 497.20f, 38.27f, 497.04f);
        canvas.moveTo(38.27f, 497.04f);
        canvas.curveTo(38.20f, 496.87f, 38.10f, 496.72f, 37.97f, 496.59f);
        canvas.moveTo(37.97f, 496.59f);
        canvas.curveTo(37.84f, 496.46f, 37.69f, 496.36f, 37.53f, 496.29f);
        canvas.moveTo(37.53f, 496.29f);
        canvas.curveTo(37.36f, 496.22f, 37.18f, 496.19f, 37.00f, 496.19f);
        canvas.moveTo(37.00f, 496.19f);
        canvas.lineTo(26.00f, 496.19f);
        canvas.moveTo(26.00f, 496.19f);
        canvas.curveTo(25.82f, 496.19f, 25.64f, 496.22f, 25.47f, 496.29f);
        canvas.moveTo(25.47f, 496.29f);
        canvas.curveTo(25.31f, 496.36f, 25.16f, 496.46f, 25.03f, 496.59f);
        canvas.moveTo(25.03f, 496.59f);
        canvas.curveTo(24.90f, 496.72f, 24.80f, 496.87f, 24.73f, 497.04f);
        canvas.moveTo(24.73f, 497.04f);
        canvas.curveTo(24.66f, 497.20f, 24.62f, 497.38f, 24.62f, 497.56f);
        canvas.moveTo(24.62f, 497.56f);
        canvas.lineTo(24.62f, 504.44f);
        canvas.moveTo(24.62f, 504.44f);
        canvas.curveTo(24.62f, 504.62f, 24.66f, 504.80f, 24.73f, 504.96f);
        canvas.moveTo(24.73f, 504.96f);
        canvas.curveTo(24.80f, 505.13f, 24.90f, 505.28f, 25.03f, 505.41f);
        canvas.moveTo(25.03f, 505.41f);
        canvas.curveTo(25.16f, 505.54f, 25.31f, 505.64f, 25.47f, 505.71f);
        canvas.moveTo(25.47f, 505.71f);
        canvas.curveTo(25.64f, 505.78f, 25.82f, 505.81f, 26.00f, 505.81f);
        canvas.stroke();
        canvas.restoreState();
        // Drawing 195 (s) rect=(32.88, 339.88, 38.38, 342.62)
        canvas.saveState();
        canvas.setStrokeColor(new DeviceRgb(0.4000000059604645f, 0.20000000298023224f, 0.5685999989509583f));
        canvas.setLineWidth(1.375f);
        canvas.moveTo(38.38f, 502.38f);
        canvas.lineTo(34.25f, 502.38f);
        canvas.moveTo(34.25f, 502.38f);
        canvas.curveTo(34.07f, 502.38f, 33.89f, 502.34f, 33.72f, 502.27f);
        canvas.moveTo(33.72f, 502.27f);
        canvas.curveTo(33.56f, 502.20f, 33.41f, 502.10f, 33.28f, 501.97f);
        canvas.moveTo(33.28f, 501.97f);
        canvas.curveTo(33.15f, 501.84f, 33.05f, 501.69f, 32.98f, 501.53f);
        canvas.moveTo(32.98f, 501.53f);
        canvas.curveTo(32.91f, 501.36f, 32.88f, 501.18f, 32.88f, 501.00f);
        canvas.moveTo(32.88f, 501.00f);
        canvas.curveTo(32.88f, 500.82f, 32.91f, 500.64f, 32.98f, 500.47f);
        canvas.moveTo(32.98f, 500.47f);
        canvas.curveTo(33.05f, 500.31f, 33.15f, 500.16f, 33.28f, 500.03f);
        canvas.moveTo(33.28f, 500.03f);
        canvas.curveTo(33.41f, 499.90f, 33.56f, 499.80f, 33.72f, 499.73f);
        canvas.moveTo(33.72f, 499.73f);
        canvas.curveTo(33.89f, 499.66f, 34.07f, 499.62f, 34.25f, 499.62f);
        canvas.moveTo(34.25f, 499.62f);
        canvas.lineTo(38.38f, 499.62f);
        canvas.stroke();
        canvas.restoreState();
        // Drawing 196 (f) rect=(45.75, 453.75, 46.50, 473.25)
        canvas.saveState();
        canvas.setFillColor(new DeviceRgb(0.4000000059604645f, 0.20000000298023224f, 0.5685999989509583f));
        canvas.rectangle(45.75f, 369.00f, 0.75f, 19.50f);
        canvas.fill();
        canvas.restoreState();
        // Drawing 197 (s) rect=(25.31, 458.00, 38.38, 469.00)
        canvas.saveState();
        canvas.setStrokeColor(new DeviceRgb(0.4000000059604645f, 0.20000000298023224f, 0.5685999989509583f));
        canvas.setLineWidth(1.375f);
        canvas.moveTo(25.31f, 380.81f);
        canvas.lineTo(31.50f, 384.25f);
        canvas.moveTo(31.50f, 384.25f);
        canvas.lineTo(37.69f, 380.81f);
        canvas.moveTo(26.00f, 380.81f);
        canvas.lineTo(26.00f, 373.94f);
        canvas.moveTo(37.00f, 380.81f);
        canvas.lineTo(37.00f, 373.94f);
        canvas.moveTo(24.62f, 373.25f);
        canvas.lineTo(38.38f, 373.25f);
        canvas.moveTo(29.44f, 380.81f);
        canvas.lineTo(29.44f, 373.94f);
        canvas.moveTo(33.56f, 380.81f);
        canvas.lineTo(33.56f, 373.94f);
        canvas.stroke();
        canvas.restoreState();
        // Drawing 198 (f) rect=(333.75, 234.00, 334.50, 315.00)
        canvas.saveState();
        canvas.setFillColor(new DeviceRgb(0.4000000059604645f, 0.20000000298023224f, 0.5685999989509583f));
        canvas.rectangle(333.75f, 527.25f, 0.75f, 81.00f);
        canvas.fill();
        canvas.restoreState();
        // Drawing 199 (s) rect=(312.56, 269.00, 325.62, 280.00)
        canvas.saveState();
        canvas.setStrokeColor(new DeviceRgb(0.4000000059604645f, 0.20000000298023224f, 0.5685999989509583f));
        canvas.setLineWidth(1.375f);
        canvas.moveTo(312.56f, 569.81f);
        canvas.lineTo(318.75f, 573.25f);
        canvas.moveTo(318.75f, 573.25f);
        canvas.lineTo(324.94f, 569.81f);
        canvas.moveTo(313.25f, 569.81f);
        canvas.lineTo(313.25f, 562.94f);
        canvas.moveTo(324.25f, 569.81f);
        canvas.lineTo(324.25f, 562.94f);
        canvas.moveTo(311.88f, 562.25f);
        canvas.lineTo(325.62f, 562.25f);
        canvas.moveTo(316.69f, 569.81f);
        canvas.lineTo(316.69f, 562.94f);
        canvas.moveTo(320.81f, 569.81f);
        canvas.lineTo(320.81f, 562.94f);
        canvas.stroke();
        canvas.restoreState();
        // Drawing 200 (f) rect=(333.75, 330.00, 334.50, 492.00)
        canvas.saveState();
        canvas.setFillColor(new DeviceRgb(0.4000000059604645f, 0.20000000298023224f, 0.5685999989509583f));
        canvas.rectangle(333.75f, 350.25f, 0.75f, 162.00f);
        canvas.fill();
        canvas.restoreState();
        // Drawing 201 (s) rect=(312.56, 405.50, 324.94, 416.50)
        canvas.saveState();
        canvas.setStrokeColor(new DeviceRgb(0.4000000059604645f, 0.20000000298023224f, 0.5685999989509583f));
        canvas.setLineWidth(1.375f);
        canvas.moveTo(313.94f, 436.75f);
        canvas.lineTo(323.56f, 436.75f);
        canvas.moveTo(323.56f, 436.75f);
        canvas.curveTo(323.74f, 436.75f, 323.92f, 436.72f, 324.09f, 436.65f);
        canvas.moveTo(324.09f, 436.65f);
        canvas.curveTo(324.26f, 436.58f, 324.41f, 436.48f, 324.53f, 436.35f);
        canvas.moveTo(324.53f, 436.35f);
        canvas.curveTo(324.66f, 436.22f, 324.76f, 436.07f, 324.83f, 435.90f);
        canvas.moveTo(324.83f, 435.90f);
        canvas.curveTo(324.90f, 435.73f, 324.94f, 435.56f, 324.94f, 435.38f);
        canvas.moveTo(324.94f, 435.38f);
        canvas.lineTo(324.94f, 427.12f);
        canvas.moveTo(324.94f, 427.12f);
        canvas.curveTo(324.94f, 426.94f, 324.90f, 426.77f, 324.83f, 426.60f);
        canvas.moveTo(324.83f, 426.60f);
        canvas.curveTo(324.76f, 426.43f, 324.66f, 426.28f, 324.53f, 426.15f);
        canvas.moveTo(324.53f, 426.15f);
        canvas.curveTo(324.41f, 426.02f, 324.26f, 425.92f, 324.09f, 425.85f);
        canvas.moveTo(324.09f, 425.85f);
        canvas.curveTo(323.92f, 425.78f, 323.74f, 425.75f, 323.56f, 425.75f);
        canvas.moveTo(323.56f, 425.75f);
        canvas.lineTo(313.94f, 425.75f);
        canvas.moveTo(313.94f, 425.75f);
        canvas.curveTo(313.76f, 425.75f, 313.58f, 425.78f, 313.41f, 425.85f);
        canvas.moveTo(313.41f, 425.85f);
        canvas.curveTo(313.24f, 425.92f, 313.09f, 426.02f, 312.97f, 426.15f);
        canvas.moveTo(312.97f, 426.15f);
        canvas.curveTo(312.84f, 426.28f, 312.74f, 426.43f, 312.67f, 426.60f);
        canvas.moveTo(312.67f, 426.60f);
        canvas.curveTo(312.60f, 426.77f, 312.56f, 426.94f, 312.56f, 427.12f);
        canvas.moveTo(312.56f, 427.12f);
        canvas.lineTo(312.56f, 435.38f);
        canvas.moveTo(312.56f, 435.38f);
        canvas.curveTo(312.56f, 435.56f, 312.60f, 435.73f, 312.67f, 435.90f);
        canvas.moveTo(312.67f, 435.90f);
        canvas.curveTo(312.74f, 436.07f, 312.84f, 436.22f, 312.97f, 436.35f);
        canvas.moveTo(312.97f, 436.35f);
        canvas.curveTo(313.09f, 436.48f, 313.24f, 436.58f, 313.41f, 436.65f);
        canvas.moveTo(313.41f, 436.65f);
        canvas.curveTo(313.58f, 436.72f, 313.76f, 436.75f, 313.94f, 436.75f);
        canvas.stroke();
        canvas.restoreState();
        // Drawing 202 (s) rect=(316.00, 409.62, 321.50, 412.38)
        canvas.saveState();
        canvas.setStrokeColor(new DeviceRgb(0.4000000059604645f, 0.20000000298023224f, 0.5685999989509583f));
        canvas.setLineWidth(1.375f);
        canvas.moveTo(316.00f, 432.62f);
        canvas.lineTo(321.50f, 432.62f);
        canvas.moveTo(316.00f, 429.88f);
        canvas.lineTo(318.75f, 429.88f);
        canvas.stroke();
        canvas.restoreState();
        // Drawing 203 (f) rect=(333.75, 503.25, 334.50, 522.75)
        canvas.saveState();
        canvas.setFillColor(new DeviceRgb(0.4000000059604645f, 0.20000000298023224f, 0.5685999989509583f));
        canvas.rectangle(333.75f, 319.50f, 0.75f, 19.50f);
        canvas.fill();
        canvas.restoreState();
        // Drawing 204 (s) rect=(313.25, 507.50, 324.25, 518.50)
        canvas.saveState();
        canvas.setStrokeColor(new DeviceRgb(0.4000000059604645f, 0.20000000298023224f, 0.5685999989509583f));
        canvas.setLineWidth(1.375f);
        canvas.moveTo(318.75f, 329.25f);
        canvas.curveTo(319.11f, 329.25f, 319.47f, 329.32f, 319.80f, 329.46f);
        canvas.moveTo(319.80f, 329.46f);
        canvas.curveTo(320.14f, 329.60f, 320.44f, 329.80f, 320.69f, 330.06f);
        canvas.moveTo(320.69f, 330.06f);
        canvas.curveTo(320.95f, 330.31f, 321.15f, 330.61f, 321.29f, 330.95f);
        canvas.moveTo(321.29f, 330.95f);
        canvas.curveTo(321.43f, 331.28f, 321.50f, 331.64f, 321.50f, 332.00f);
        canvas.moveTo(321.50f, 332.00f);
        canvas.curveTo(321.50f, 332.36f, 321.43f, 332.72f, 321.29f, 333.05f);
        canvas.moveTo(321.29f, 333.05f);
        canvas.curveTo(321.15f, 333.39f, 320.95f, 333.69f, 320.69f, 333.94f);
        canvas.moveTo(320.69f, 333.94f);
        canvas.curveTo(320.44f, 334.20f, 320.14f, 334.40f, 319.80f, 334.54f);
        canvas.moveTo(319.80f, 334.54f);
        canvas.curveTo(319.47f, 334.68f, 319.11f, 334.75f, 318.75f, 334.75f);
        canvas.moveTo(318.75f, 334.75f);
        canvas.curveTo(318.39f, 334.75f, 318.03f, 334.68f, 317.70f, 334.54f);
        canvas.moveTo(317.70f, 334.54f);
        canvas.curveTo(317.36f, 334.40f, 317.06f, 334.20f, 316.81f, 333.94f);
        canvas.moveTo(316.81f, 333.94f);
        canvas.curveTo(316.55f, 333.69f, 316.35f, 333.39f, 316.21f, 333.05f);
        canvas.moveTo(316.21f, 333.05f);
        canvas.curveTo(316.07f, 332.72f, 316.00f, 332.36f, 316.00f, 332.00f);
        canvas.moveTo(316.00f, 332.00f);
        canvas.curveTo(316.00f, 331.64f, 316.07f, 331.28f, 316.21f, 330.95f);
        canvas.moveTo(316.21f, 330.95f);
        canvas.curveTo(316.35f, 330.61f, 316.55f, 330.31f, 316.81f, 330.06f);
        canvas.moveTo(316.81f, 330.06f);
        canvas.curveTo(317.06f, 329.80f, 317.36f, 329.60f, 317.70f, 329.46f);
        canvas.moveTo(317.70f, 329.46f);
        canvas.curveTo(318.03f, 329.32f, 318.39f, 329.25f, 318.75f, 329.25f);
        canvas.moveTo(318.75f, 327.88f);
        canvas.curveTo(316.91f, 327.88f, 313.25f, 326.95f, 313.25f, 325.12f);
        canvas.moveTo(313.25f, 325.12f);
        canvas.lineTo(313.25f, 323.75f);
        canvas.moveTo(313.25f, 323.75f);
        canvas.lineTo(324.25f, 323.75f);
        canvas.moveTo(324.25f, 323.75f);
        canvas.lineTo(324.25f, 325.12f);
        canvas.moveTo(324.25f, 325.12f);
        canvas.curveTo(324.25f, 326.95f, 320.59f, 327.88f, 318.75f, 327.88f);
        canvas.stroke();
        canvas.restoreState();
        // Drawing 205 (s) rect=(324.25, 513.00, 327.00, 514.38)
        canvas.saveState();
        canvas.setStrokeColor(new DeviceRgb(0.4000000059604645f, 0.20000000298023224f, 0.5685999989509583f));
        canvas.setLineWidth(1.375f);
        canvas.moveTo(324.25f, 329.25f);
        canvas.lineTo(327.00f, 329.25f);
        canvas.moveTo(325.62f, 330.62f);
        canvas.lineTo(325.62f, 327.88f);
        canvas.stroke();
        canvas.restoreState();
        // Drawing 206 (f) rect=(22.50, 545.25, 572.25, 546.00)
        canvas.saveState();
        canvas.setFillColor(new DeviceRgb(0.8863000273704529f, 0.9097999930381775f, 0.9412000179290771f));
        canvas.rectangle(22.50f, 296.25f, 549.75f, 0.75f);
        canvas.fill();
        canvas.restoreState();
        // Drawing 209 (s) rect=(247.32, 14.62, 347.82, 34.88)
        canvas.saveState();
        canvas.setStrokeColor(new DeviceRgb(1.0f, 1.0f, 1.0f));
        canvas.setLineWidth(0.75f);
        canvas.moveTo(247.32f, 810.00f);
        canvas.lineTo(247.32f, 825.00f);
        canvas.moveTo(247.32f, 825.00f);
        canvas.curveTo(247.32f, 825.35f, 247.39f, 825.68f, 247.52f, 826.00f);
        canvas.moveTo(247.52f, 826.00f);
        canvas.curveTo(247.66f, 826.33f, 247.85f, 826.61f, 248.09f, 826.86f);
        canvas.moveTo(248.09f, 826.86f);
        canvas.curveTo(248.34f, 827.10f, 248.62f, 827.29f, 248.94f, 827.43f);
        canvas.moveTo(248.94f, 827.43f);
        canvas.curveTo(249.27f, 827.56f, 249.60f, 827.62f, 249.95f, 827.62f);
        canvas.moveTo(249.95f, 827.62f);
        canvas.lineTo(345.20f, 827.62f);
        canvas.moveTo(345.20f, 827.62f);
        canvas.curveTo(345.55f, 827.62f, 345.88f, 827.56f, 346.20f, 827.43f);
        canvas.moveTo(346.20f, 827.43f);
        canvas.curveTo(346.53f, 827.29f, 346.81f, 827.10f, 347.06f, 826.86f);
        canvas.moveTo(347.06f, 826.86f);
        canvas.curveTo(347.30f, 826.61f, 347.49f, 826.33f, 347.62f, 826.00f);
        canvas.moveTo(347.62f, 826.00f);
        canvas.curveTo(347.76f, 825.68f, 347.82f, 825.35f, 347.82f, 825.00f);
        canvas.moveTo(347.82f, 825.00f);
        canvas.lineTo(347.82f, 810.00f);
        canvas.moveTo(347.82f, 810.00f);
        canvas.curveTo(347.82f, 809.65f, 347.76f, 809.32f, 347.62f, 809.00f);
        canvas.moveTo(347.62f, 809.00f);
        canvas.curveTo(347.49f, 808.67f, 347.30f, 808.39f, 347.06f, 808.14f);
        canvas.moveTo(347.06f, 808.14f);
        canvas.curveTo(346.81f, 807.90f, 346.53f, 807.71f, 346.20f, 807.57f);
        canvas.moveTo(346.20f, 807.57f);
        canvas.curveTo(345.88f, 807.44f, 345.55f, 807.38f, 345.20f, 807.38f);
        canvas.moveTo(345.20f, 807.38f);
        canvas.lineTo(249.95f, 807.38f);
        canvas.moveTo(249.95f, 807.38f);
        canvas.curveTo(249.60f, 807.38f, 249.27f, 807.44f, 248.94f, 807.57f);
        canvas.moveTo(248.94f, 807.57f);
        canvas.curveTo(248.62f, 807.71f, 248.34f, 807.90f, 248.09f, 808.14f);
        canvas.moveTo(248.09f, 808.14f);
        canvas.curveTo(247.85f, 808.39f, 247.66f, 808.67f, 247.52f, 809.00f);
        canvas.moveTo(247.52f, 809.00f);
        canvas.curveTo(247.39f, 809.32f, 247.32f, 809.65f, 247.32f, 810.00f);
        canvas.stroke();
        canvas.restoreState();
        // Drawing 210 (s) rect=(260.20, 18.50, 260.20, 21.00)
        canvas.saveState();
        canvas.setStrokeColor(new DeviceRgb(1.0f, 1.0f, 1.0f));
        canvas.setLineWidth(1.2499998807907104f);
        canvas.moveTo(260.20f, 823.75f);
        canvas.lineTo(260.20f, 821.25f);
        canvas.stroke();
        canvas.restoreState();
        // Drawing 211 (s) rect=(265.20, 18.50, 265.20, 21.00)
        canvas.saveState();
        canvas.setStrokeColor(new DeviceRgb(1.0f, 1.0f, 1.0f));
        canvas.setLineWidth(1.2499998807907104f);
        canvas.moveTo(265.20f, 823.75f);
        canvas.lineTo(265.20f, 821.25f);
        canvas.stroke();
        canvas.restoreState();
        // Drawing 212 (s) rect=(257.07, 19.75, 268.32, 31.00)
        canvas.saveState();
        canvas.setStrokeColor(new DeviceRgb(1.0f, 1.0f, 1.0f));
        canvas.setLineWidth(1.2499998807907104f);
        canvas.moveTo(258.32f, 822.50f);
        canvas.lineTo(267.07f, 822.50f);
        canvas.moveTo(267.07f, 822.50f);
        canvas.curveTo(267.24f, 822.50f, 267.40f, 822.47f, 267.55f, 822.40f);
        canvas.moveTo(267.55f, 822.40f);
        canvas.curveTo(267.71f, 822.34f, 267.84f, 822.25f, 267.96f, 822.13f);
        canvas.moveTo(267.96f, 822.13f);
        canvas.curveTo(268.08f, 822.02f, 268.17f, 821.88f, 268.23f, 821.73f);
        canvas.moveTo(268.23f, 821.73f);
        canvas.curveTo(268.29f, 821.58f, 268.32f, 821.42f, 268.32f, 821.25f);
        canvas.moveTo(268.32f, 821.25f);
        canvas.lineTo(268.32f, 812.50f);
        canvas.moveTo(268.32f, 812.50f);
        canvas.curveTo(268.32f, 812.33f, 268.29f, 812.17f, 268.23f, 812.02f);
        canvas.moveTo(268.23f, 812.02f);
        canvas.curveTo(268.17f, 811.87f, 268.08f, 811.73f, 267.96f, 811.62f);
        canvas.moveTo(267.96f, 811.62f);
        canvas.curveTo(267.84f, 811.50f, 267.71f, 811.41f, 267.55f, 811.35f);
        canvas.moveTo(267.55f, 811.35f);
        canvas.curveTo(267.40f, 811.28f, 267.24f, 811.25f, 267.07f, 811.25f);
        canvas.moveTo(267.07f, 811.25f);
        canvas.lineTo(258.32f, 811.25f);
        canvas.moveTo(258.32f, 811.25f);
        canvas.curveTo(258.16f, 811.25f, 258.00f, 811.28f, 257.85f, 811.35f);
        canvas.moveTo(257.85f, 811.35f);
        canvas.curveTo(257.69f, 811.41f, 257.56f, 811.50f, 257.44f, 811.62f);
        canvas.moveTo(257.44f, 811.62f);
        canvas.curveTo(257.32f, 811.73f, 257.23f, 811.87f, 257.17f, 812.02f);
        canvas.moveTo(257.17f, 812.02f);
        canvas.curveTo(257.11f, 812.17f, 257.07f, 812.33f, 257.07f, 812.50f);
        canvas.moveTo(257.07f, 812.50f);
        canvas.lineTo(257.07f, 821.25f);
        canvas.moveTo(257.07f, 821.25f);
        canvas.curveTo(257.07f, 821.42f, 257.11f, 821.58f, 257.17f, 821.73f);
        canvas.moveTo(257.17f, 821.73f);
        canvas.curveTo(257.23f, 821.88f, 257.32f, 822.02f, 257.44f, 822.13f);
        canvas.moveTo(257.44f, 822.13f);
        canvas.curveTo(257.56f, 822.25f, 257.69f, 822.34f, 257.85f, 822.40f);
        canvas.moveTo(257.85f, 822.40f);
        canvas.curveTo(258.00f, 822.47f, 258.16f, 822.50f, 258.32f, 822.50f);
        canvas.stroke();
        canvas.restoreState();
        // Drawing 213 (s) rect=(257.07, 23.50, 268.32, 23.50)
        canvas.saveState();
        canvas.setStrokeColor(new DeviceRgb(1.0f, 1.0f, 1.0f));
        canvas.setLineWidth(1.2499998807907104f);
        canvas.moveTo(257.07f, 818.75f);
        canvas.lineTo(268.32f, 818.75f);
        canvas.stroke();
        canvas.restoreState();
        // Drawing 214 (s) rect=(260.20, 26.00, 260.21, 26.00)
        canvas.saveState();
        canvas.setStrokeColor(new DeviceRgb(1.0f, 1.0f, 1.0f));
        canvas.setLineWidth(1.2499998807907104f);
        canvas.moveTo(260.20f, 816.25f);
        canvas.lineTo(260.21f, 816.25f);
        canvas.stroke();
        canvas.restoreState();
        // Drawing 215 (s) rect=(262.70, 26.00, 262.71, 26.00)
        canvas.saveState();
        canvas.setStrokeColor(new DeviceRgb(1.0f, 1.0f, 1.0f));
        canvas.setLineWidth(1.2499998807907104f);
        canvas.moveTo(262.70f, 816.25f);
        canvas.lineTo(262.71f, 816.25f);
        canvas.stroke();
        canvas.restoreState();
        // Drawing 216 (s) rect=(265.20, 26.00, 265.21, 26.00)
        canvas.saveState();
        canvas.setStrokeColor(new DeviceRgb(1.0f, 1.0f, 1.0f));
        canvas.setLineWidth(1.2499998807907104f);
        canvas.moveTo(265.20f, 816.25f);
        canvas.lineTo(265.21f, 816.25f);
        canvas.stroke();
        canvas.restoreState();
        // Drawing 217 (s) rect=(260.20, 28.50, 260.21, 28.50)
        canvas.saveState();
        canvas.setStrokeColor(new DeviceRgb(1.0f, 1.0f, 1.0f));
        canvas.setLineWidth(1.2499998807907104f);
        canvas.moveTo(260.20f, 813.75f);
        canvas.lineTo(260.21f, 813.75f);
        canvas.stroke();
        canvas.restoreState();
        // Drawing 218 (s) rect=(262.70, 28.50, 262.71, 28.50)
        canvas.saveState();
        canvas.setStrokeColor(new DeviceRgb(1.0f, 1.0f, 1.0f));
        canvas.setLineWidth(1.2499998807907104f);
        canvas.moveTo(262.70f, 813.75f);
        canvas.lineTo(262.71f, 813.75f);
        canvas.stroke();
        canvas.restoreState();
        // Drawing 219 (s) rect=(265.20, 28.50, 265.21, 28.50)
        canvas.saveState();
        canvas.setStrokeColor(new DeviceRgb(1.0f, 1.0f, 1.0f));
        canvas.setLineWidth(1.2499998807907104f);
        canvas.moveTo(265.20f, 813.75f);
        canvas.lineTo(265.21f, 813.75f);
        canvas.stroke();
        canvas.restoreState();
        canvas.restoreState();
    }

    // ── Helper: Upper Customer & Bank Details Section ───────────────────────
    private Table buildUpperSection(StatementRecord record, PdfFont regular, PdfFont bold) {
        Table upper = new Table(new float[]{ 274.5f, 274.5f });
        upper.setWidth(USABLE_WIDTH);
        upper.setMarginTop(8.0f);
        upper.setMarginBottom(12.0f);

        CustomerDetails cust = record.customerDetails();
        BranchDetails branch = record.branchDetails();

        String custName    = cust != null && cust.accountHolderName() != null ? cust.accountHolderName() : "SUDHIR KUMAR SHARMA";
        String custEmail   = cust != null && cust.email() != null ? cust.email() : "sudhir.sharma@sparktech.co.in";
        String custAddress = cust != null && cust.address() != null ? cust.address() : "B-402, Block 4, Prestige Whispering Palms,\nWhitefield, Bangalore, Karnataka - 560066";

        String branchName    = branch != null && branch.branchName() != null ? branch.branchName() : "GOVINDPURA, BHOPAL";
        String branchAddress = branch != null && branch.branchAddress() != null ? branch.branchAddress() : "INDUSTRIAL AREA GOVINDPURA, BHOPAL, MADHYA\nPRADESH - 462023";

        // Left cell: Customer details
        Cell leftCell = new Cell().setBorder(Border.NO_BORDER).setPadding(0).setPaddingLeft(30.0f);
        leftCell.add(new Paragraph(custName).setFont(bold).setFontSize(12.0f).setFontColor(COLOR_BLACK).setMarginBottom(4.0f));
        leftCell.add(new Paragraph(custEmail).setFont(regular).setFontSize(9.75f).setFontColor(COLOR_BLACK).setMarginBottom(6.0f));
        leftCell.add(new Paragraph(custAddress).setFont(regular).setFontSize(9.75f).setFontColor(COLOR_BLACK).setMultipliedLeading(1.2f));

        // Right cell: Bank details
        Cell rightCell = new Cell().setBorder(Border.NO_BORDER).setPadding(0).setPaddingLeft(43.0f);
        rightCell.add(new Paragraph("State Bank of India").setFont(regular).setFontSize(14.0f).setFontColor(COLOR_CYAN_BANK).setMarginBottom(2.0f));
        rightCell.add(new Paragraph(branchName).setFont(regular).setFontSize(9.75f).setFontColor(COLOR_BLACK).setMarginBottom(6.0f));
        rightCell.add(new Paragraph(branchAddress).setFont(regular).setFontSize(8.25f).setFontColor(COLOR_BLACK).setMultipliedLeading(1.2f));

        upper.addCell(leftCell);
        upper.addCell(rightCell);
        return upper;
    }

    // ── Helper: Lower Dossier Section ───────────────────────────────────────
    private Table buildDossierSection(StatementRecord record, PdfFont regular, String endDateStr, double closingBal) {
        Table dossier = new Table(new float[]{ 274.5f, 274.5f });
        dossier.setWidth(USABLE_WIDTH);
        dossier.setMarginBottom(6.0f);

        CustomerDetails cust = record.customerDetails();
        BranchDetails branch = record.branchDetails();

        String openDate = cust != null && cust.accountOpenDate() != null ? cust.accountOpenDate() : "09-05-2022";
        String branchCode = branch != null && branch.branchCode() != null ? branch.branchCode() : "01916";
        String branchName = branch != null && branch.branchName() != null ? branch.branchName() : "GOVINDPURA, BHOPAL";
        String branchEmail = branch != null && branch.branchEmail() != null ? branch.branchEmail().toUpperCase() : "SBI.01916@SBI.CO.IN";
        String branchPhone = branch != null && branch.branchPhone() != null ? branch.branchPhone() : "+91-755-2586241";
        String cifNo = cust != null && cust.cifNumber() != null ? cust.cifNumber() : "85962145321";
        String accNo = cust != null && cust.accountNumber() != null ? cust.accountNumber() : "30521458920";
        String ifsc = branch != null && branch.ifscCode() != null ? branch.ifscCode() : "SBIN0001916";
        String ckycr = branch != null && branch.ckycrNumber() != null ? branch.ckycrNumber() : "50046100545797";
        String micr = branch != null && branch.micrCode() != null ? branch.micrCode() : "462002015";
        String nominee = cust != null && cust.nomineeName() != null && !cust.nomineeName().isBlank() ? cust.nomineeName().toUpperCase() : "MEENAKSHI SHARMA (WIFE)";

        // Left Column Key-Values Table
        Table leftKv = new Table(new float[]{ 105f, 7.5f, 132f });
        leftKv.setWidth(UnitValue.createPercentValue(100));
        addKvRow(leftKv, regular, "Date of Statement", endDateStr);
        addKvRow(leftKv, regular, "Clear Balance", formatIndianCurrency(closingBal) + "CR");
        addKvRow(leftKv, regular, "Uncleared Amount", "0.00");
        addKvRow(leftKv, regular, "+MOD Bal", "0.00");
        addKvRow(leftKv, regular, "Lien", "0.0");
        addKvRow(leftKv, regular, "Limit", "0.00");
        addKvRow(leftKv, regular, "Monthly Avg Balance", "0.00");
        addKvRow(leftKv, regular, "Interest Rate", "2.50 % p.a.");
        addKvRow(leftKv, regular, "Drawing Power", "0.00");
        addKvRow(leftKv, regular, "Account open Date", openDate);

        // Right Column Key-Values Table
        Table rightKv = new Table(new float[]{ 90f, 7.5f, 134f });
        rightKv.setWidth(UnitValue.createPercentValue(100));
        addKvRow(rightKv, regular, "Branch Code", branchCode);
        addKvRow(rightKv, regular, "Branch Name", branchName);
        addKvRow(rightKv, regular, "Branch Email ID", branchEmail);
        addKvRow(rightKv, regular, "Branch Phone", branchPhone);
        addKvRow(rightKv, regular, "CIF Number", cifNo);
        addKvRow(rightKv, regular, "Account Number", accNo);
        addKvRow(rightKv, regular, "Product", "SAVINGS");
        addKvRow(rightKv, regular, "IFSC Code", ifsc);
        addKvRow(rightKv, regular, "Currency", "INR");
        addKvRow(rightKv, regular, "Account Status", "OPEN");
        addKvRow(rightKv, regular, "CKYCR Number", ckycr);
        addKvRow(rightKv, regular, "MICR Code", micr);
        addKvRow(rightKv, regular, "Nominee Name", nominee);

        dossier.addCell(new Cell().setBorder(Border.NO_BORDER).setPadding(0).setPaddingLeft(30.0f).add(leftKv));
        dossier.addCell(new Cell().setBorder(Border.NO_BORDER).setPadding(0).setPaddingLeft(43.0f).add(rightKv));
        return dossier;
    }

    private void addKvRow(Table table, PdfFont font, String label, String value) {
        Paragraph lPara = new Paragraph(label).setFont(font).setFontSize(9.75f).setFontColor(COLOR_BLACK).setMargin(0);
        Paragraph cPara = new Paragraph(":").setFont(font).setFontSize(9.75f).setFontColor(COLOR_BLACK).setMargin(0);
        Paragraph vPara = new Paragraph(value != null ? value : "").setFont(font).setFontSize(9.75f).setFontColor(COLOR_BLACK).setMargin(0);

        Cell lCell = new Cell().setBorder(Border.NO_BORDER).setPadding(0).setPaddingBottom(3.2f).add(lPara);
        Cell cCell = new Cell().setBorder(Border.NO_BORDER).setPadding(0).setPaddingBottom(3.2f).add(cPara);
        Cell vCell = new Cell().setBorder(Border.NO_BORDER).setPadding(0).setPaddingBottom(3.2f).add(vPara);
        table.addCell(lCell);
        table.addCell(cCell);
        table.addCell(vCell);
    }

    // ── Helper: Build Ledger Table ──────────────────────────────────────────
    private Table buildLedgerTable(List<Transaction> transactions, PdfFont regular, PdfFont bold, boolean isContinuation) {
        Table table = new Table(LEDGER_COLS);
        table.setWidth(USABLE_WIDTH);
        table.setBorder(new SolidBorder(COLOR_LIGHT_BORDER, 0.75f));

        // Header Row
        table.addHeaderCell(createHeaderCell("Value Date", bold, TextAlignment.CENTER));
        table.addHeaderCell(createHeaderCell("Post Date", bold, TextAlignment.CENTER));
        table.addHeaderCell(createHeaderCell("Details", bold, TextAlignment.LEFT));
        table.addHeaderCell(createHeaderCell("Ref No/\nCheque\nNo", bold, TextAlignment.CENTER));
        table.addHeaderCell(createHeaderCell("₹ Debit", bold, TextAlignment.CENTER));
        table.addHeaderCell(createHeaderCell("₹ Credit", bold, TextAlignment.CENTER));
        table.addHeaderCell(createHeaderCell("Balance", bold, TextAlignment.CENTER));

        // Transaction Data Rows
        for (Transaction tx : transactions) {
            table.addCell(createDataCell(tx.valueDate() != null ? tx.valueDate().replace('/', '-') : "-", regular, TextAlignment.CENTER, 6.38f));
            table.addCell(createDataCell(tx.postDate() != null ? tx.postDate().replace('/', '-') : "-", regular, TextAlignment.CENTER, 6.38f));

            // Details cell (Multi-line narrative)
            table.addCell(createDetailsCell(tx.details(), regular));

            // Ref No cell
            String refStr = tx.refNo() != null && !tx.refNo().isBlank() ? tx.refNo() : "-";
            table.addCell(createDataCell(refStr, regular, TextAlignment.CENTER, 6.38f));

            // Debit cell
            String debitStr = tx.debit() != null && tx.debit() > 0 ? formatIndianCurrency(tx.debit()) : "-";
            table.addCell(createDataCell(debitStr, regular, TextAlignment.RIGHT, 6.38f));

            // Credit cell
            String creditStr = tx.credit() != null && tx.credit() > 0 ? formatIndianCurrency(tx.credit()) : "-";
            table.addCell(createDataCell(creditStr, regular, TextAlignment.RIGHT, 6.38f));

            // Balance cell
            String balStr = formatIndianCurrency(tx.balance());
            table.addCell(createDataCell(balStr, regular, TextAlignment.RIGHT, 6.38f));
        }

        // Purple bottom bar row (height 25pt)
        Cell bottomBar = new Cell(1, 7)
                .setBackgroundColor(COLOR_PURPLE_HEADER)
                .setHeight(18.0f)
                .setBorder(Border.NO_BORDER);
        table.addFooterCell(bottomBar);

        return table;
    }

    private Cell createHeaderCell(String text, PdfFont font, TextAlignment align) {
        return new Cell()
                .setBackgroundColor(COLOR_PURPLE_HEADER)
                .setBorder(new SolidBorder(COLOR_LIGHT_BORDER, 0.5f))
                .setPadding(3.0f)
                .setVerticalAlignment(VerticalAlignment.MIDDLE)
                .setTextAlignment(align)
                .add(new Paragraph(text)
                        .setFont(font)
                        .setFontSize(7.5f)
                        .setFontColor(COLOR_WHITE)
                        .setMultipliedLeading(1.05f)
                        .setMargin(0));
    }

    private Cell createDataCell(String text, PdfFont font, TextAlignment align, float fontSize) {
        return new Cell()
                .setBorder(new SolidBorder(COLOR_LIGHT_BORDER, 0.5f))
                .setPadding(4.0f)
                .setPaddingTop(6.0f)
                .setPaddingBottom(6.0f)
                .setVerticalAlignment(VerticalAlignment.MIDDLE)
                .setTextAlignment(align)
                .add(new Paragraph(text)
                        .setFont(font)
                        .setFontSize(fontSize)
                        .setFontColor(COLOR_DARK_GRAY)
                        .setMargin(0));
    }

    private Cell createDetailsCell(String details, PdfFont font) {
        Cell cell = new Cell()
                .setBorder(new SolidBorder(COLOR_LIGHT_BORDER, 0.5f))
                .setPadding(4.0f)
                .setPaddingTop(5.0f)
                .setPaddingBottom(5.0f)
                .setVerticalAlignment(VerticalAlignment.MIDDLE)
                .setTextAlignment(TextAlignment.LEFT);

        String[] lines = formatDetailsLines(details);
        for (String line : lines) {
            cell.add(new Paragraph(line)
                    .setFont(font)
                    .setFontSize(6.38f)
                    .setFontColor(COLOR_DARK_GRAY)
                    .setMultipliedLeading(1.1f)
                    .setMargin(0));
        }
        return cell;
    }

    private String[] formatDetailsLines(String raw) {
        if (raw == null || raw.isBlank()) return new String[]{"-"};
        String text = raw.toUpperCase().trim();

        // 1. NEFT
        if (text.startsWith("BY TRANSFER-NEFT*") || text.startsWith("TO TRANSFER-NEFT*")) {
            boolean isTo = text.startsWith("TO TRANSFER-");
            String prefix = isTo ? "TO TRANSFER-" : "BY TRANSFER-";
            String rest = text.substring(prefix.length());
            String[] parts = rest.split("\\*");
            if (parts.length >= 4) {
                String line1 = prefix;
                String line2 = parts[0] + "*" + parts[1] + "*" + parts[2] + "*";
                String line3 = String.join("*", java.util.Arrays.copyOfRange(parts, 3, parts.length));
                return new String[]{ line1, line2, line3 };
            }
        }

        // 2. UPI/TRANSFER
        if (text.contains("TRANSFER-")) {
            String prefix = text.contains("TO TRANSFER-") ? "TO TRANSFER-" : "BY TRANSFER-";
            String rest = text.substring(prefix.length());
            if (rest.contains("/")) {
                String[] parts = rest.split("/");
                if (parts.length >= 5) {
                    String line1 = prefix;
                    String line2 = String.join("/", java.util.Arrays.copyOfRange(parts, 0, 4)) + "/";
                    String line3 = String.join("/", java.util.Arrays.copyOfRange(parts, 4, parts.length));
                    return new String[]{ line1, line2, line3 };
                } else if (parts.length >= 3) {
                    String line1 = prefix;
                    String line2 = String.join("/", java.util.Arrays.copyOfRange(parts, 0, 2)) + "/";
                    String line3 = String.join("/", java.util.Arrays.copyOfRange(parts, 2, parts.length));
                    return new String[]{ line1, line2, line3 };
                }
            }
        }

        // 3. ATM
        if (text.startsWith("TO ATM WD-")) {
            String prefix = "TO ATM WD-";
            String rest = text.substring(prefix.length()).trim();
            String[] parts = rest.split("\\s+");
            if (parts.length >= 3) {
                String line1 = prefix;
                String line2 = parts[0] + " " + parts[1];
                String line3 = String.join(" ", java.util.Arrays.copyOfRange(parts, 2, parts.length));
                return new String[]{ line1, line2, line3 };
            }
        }

        return new String[]{ text };
    }

    // ── Helper: Statement Summary Table on Final Page ───────────────────────
    private Table buildSummaryTable(PdfFont regular, PdfFont bold, String startDate, String endDate,
                                    double broughtForward, int drCount, int crCount,
                                    double totalDebits, double totalCredits, double closingBal) {
        Table table = new Table(new float[]{ 95f, 50f, 50f, 95f, 95f, 104f });
        table.setWidth(USABLE_WIDTH);
        table.setBorder(new SolidBorder(COLOR_LIGHT_BORDER, 0.75f));
        table.setMarginBottom(14.0f);

        // Header Title Banner Cell
        Cell titleCell = new Cell(1, 6)
                .setBackgroundColor(COLOR_PURPLE_HEADER)
                .setTextAlignment(TextAlignment.CENTER)
                .setPadding(6.0f)
                .setBorder(Border.NO_BORDER)
                .add(new Paragraph("STATEMENT SUMMARY : " + startDate + " TO " + endDate)
                        .setFont(regular)
                        .setFontSize(9.0f)
                        .setFontColor(COLOR_WHITE)
                        .setMargin(0));
        table.addHeaderCell(titleCell);

        // Column Headers
        table.addHeaderCell(createSummaryHeaderCell("Brought Forward (₹)", bold));
        table.addHeaderCell(createSummaryHeaderCell("Dr Count", bold));
        table.addHeaderCell(createSummaryHeaderCell("Cr Count", bold));
        table.addHeaderCell(createSummaryHeaderCell("Total Debits (₹)", bold));
        table.addHeaderCell(createSummaryHeaderCell("Total Credits (₹)", bold));
        table.addHeaderCell(createSummaryHeaderCell("Closing Balance (₹)", bold));

        // Data Row (all in authentic dark black text - no red/green)
        table.addCell(createSummaryDataCell(formatIndianCurrency(broughtForward) + "CR", regular, COLOR_DARK_GRAY));
        table.addCell(createSummaryDataCell(String.valueOf(drCount), regular, COLOR_DARK_GRAY));
        table.addCell(createSummaryDataCell(String.valueOf(crCount), regular, COLOR_DARK_GRAY));
        table.addCell(createSummaryDataCell("₹" + formatIndianCurrency(totalDebits), regular, COLOR_DARK_GRAY));
        table.addCell(createSummaryDataCell("₹" + formatIndianCurrency(totalCredits), regular, COLOR_DARK_GRAY));
        table.addCell(createSummaryDataCell("₹" + formatIndianCurrency(closingBal) + "CR", regular, COLOR_DARK_GRAY));

        return table;
    }

    private Cell createSummaryHeaderCell(String text, PdfFont font) {
        return new Cell()
                .setBackgroundColor(COLOR_PURPLE_HEADER)
                .setBorder(new SolidBorder(COLOR_PURPLE_BORDER, 0.5f))
                .setPadding(5.0f)
                .setTextAlignment(TextAlignment.CENTER)
                .setVerticalAlignment(VerticalAlignment.MIDDLE)
                .add(new Paragraph(text).setFont(font).setFontSize(8.2f).setFontColor(COLOR_WHITE).setMargin(0));
    }

    private Cell createSummaryDataCell(String text, PdfFont font, DeviceRgb color) {
        return new Cell()
                .setBackgroundColor(COLOR_WHITE)
                .setBorder(new SolidBorder(COLOR_LIGHT_BORDER, 0.5f))
                .setPadding(6.0f)
                .setTextAlignment(TextAlignment.CENTER)
                .setVerticalAlignment(VerticalAlignment.MIDDLE)
                .add(new Paragraph(text).setFont(font).setFontSize(8.2f).setFontColor(color).setMargin(0));
    }

    // ── Helper: Disclaimers Section on Final Page ───────────────────────────
    private Div buildDisclaimers(PdfFont regular) {
        Div div = new Div();
        div.setMarginLeft(8.0f);
        div.setMarginRight(8.0f);

        String bullet1 = "•   Please do not share your ATM, Debit/Credit Card number, PIN (Personal Identification number ), OTP (One-Time Password), Username or Password with anyone via email, SMS, phone call, or any other medium. Bank never asks for such information.";
        String bullet2 = "•   If your account is operated by a Power of Attorney holder, please review the transactions with extra care.";
        String bullet3 = "•   This is a computer generated statement and does not require a signature.";

        div.add(new Paragraph(bullet1).setFont(regular).setFontSize(6.8f).setFontColor(COLOR_BLACK).setMultipliedLeading(1.2f).setMarginBottom(4.0f));
        div.add(new Paragraph(bullet2).setFont(regular).setFontSize(6.8f).setFontColor(COLOR_BLACK).setMultipliedLeading(1.2f).setMarginBottom(4.0f));
        div.add(new Paragraph(bullet3).setFont(regular).setFontSize(6.8f).setFontColor(COLOR_BLACK).setMultipliedLeading(1.2f).setMarginBottom(0));

        return div;
    }

    // ── Helper: Draw Page 1 Upper Details & Dossier at Exact Reference PDF Coordinates ──
    private void drawPage1HeaderAndDossier(PdfCanvas canvas, PdfFont regular, PdfFont bold,
                                           StatementRecord record, String startDateStr, String endDateStr,
                                           double closingBal) {
        CustomerDetails cust = record.customerDetails();
        BranchDetails branch = record.branchDetails();

        String custName = cust != null && cust.accountHolderName() != null ? cust.accountHolderName() : "SUDHIR KUMAR SHARMA";
        String custEmail = cust != null && cust.email() != null ? cust.email() : "sudhir.sharma@sparktech.co.in";
        String custAddress = cust != null && cust.address() != null ? cust.address() : "B-402, Block 4, Prestige Whispering Palms,\nWhitefield, Bangalore, Karnataka - 560066";

        String branchName = branch != null && branch.branchName() != null ? branch.branchName() : "GOVINDPURA, BHOPAL";
        String branchAddress = branch != null && branch.branchAddress() != null ? branch.branchAddress() : "INDUSTRIAL AREA GOVINDPURA, BHOPAL, MADHYA\nPRADESH - 462023";

        String openDate = cust != null && cust.accountOpenDate() != null ? cust.accountOpenDate().replace('/', '-') : "09-05-2022";
        String branchCode = branch != null && branch.branchCode() != null ? branch.branchCode() : "01916";
        String branchEmail = branch != null && branch.branchEmail() != null ? branch.branchEmail().toUpperCase() : "SBI.01916@SBI.CO.IN";
        String branchPhone = branch != null && branch.branchPhone() != null ? branch.branchPhone() : "+91-755-2586241";
        String cifNo = cust != null && cust.cifNumber() != null ? cust.cifNumber() : "85962145321";
        String accNo = cust != null && cust.accountNumber() != null ? cust.accountNumber() : "30521458920";
        String ifsc = branch != null && branch.ifscCode() != null ? branch.ifscCode() : "SBIN0001916";
        String ckycr = branch != null && branch.ckycrNumber() != null ? branch.ckycrNumber() : "50046100545797";
        String micr = branch != null && branch.micrCode() != null ? branch.micrCode() : "462002015";
        String nominee = cust != null && cust.nomineeName() != null && !cust.nomineeName().isBlank() ? cust.nomineeName().toUpperCase() : "MEENAKSHI SHARMA (WIFE)";

        // STATEMENT OF ACCOUNT (centered)
        drawText(canvas, regular, 12.0f, COLOR_BLACK, 216.49f, 842.25f - 65.25f, "STATEMENT OF ACCOUNT");

        // Customer Name, Email, Address
        drawText(canvas, bold, 12.0f, COLOR_BLACK, 52.68f, 842.25f - 110.25f, custName);
        drawText(canvas, regular, 9.75f, COLOR_BLACK, 52.68f, 842.25f - 135.75f, custEmail);
        String[] addrLines = custAddress.split("\n");
        if (addrLines.length > 0) drawText(canvas, regular, 9.75f, COLOR_BLACK, 52.68f, 842.25f - 173.25f, addrLines[0].trim());
        if (addrLines.length > 1) drawText(canvas, regular, 9.75f, COLOR_BLACK, 52.68f, 842.25f - 192.75f, addrLines[1].trim());

        // Branch Name & Address
        drawText(canvas, regular, 13.95f, COLOR_CYAN_BANK, 341.13f, 842.25f - 108.0f, "State Bank of India");
        drawText(canvas, regular, 9.75f, COLOR_BLACK, 341.13f, 842.25f - 121.5f, branchName);
        String[] bAddrLines = branchAddress.split("\n");
        if (bAddrLines.length > 0) drawText(canvas, regular, 8.25f, COLOR_BLACK, 341.13f, 842.25f - 153.0f, bAddrLines[0].trim());
        if (bAddrLines.length > 1) drawText(canvas, regular, 8.25f, COLOR_BLACK, 341.13f, 842.25f - 162.75f, bAddrLines[1].trim());

        // Left Dossier (Date of Statement, Balances, Open Date)
        drawDossierRow(canvas, regular, 52.68f, 157.68f, 165.18f, 842.25f - 243.0f, "Date of Statement", endDateStr);
        drawDossierRow(canvas, regular, 52.68f, 157.68f, 165.18f, 842.25f - 273.75f, "Clear Balance", formatIndianCurrency(closingBal) + "CR");
        drawDossierRow(canvas, regular, 52.68f, 157.68f, 165.18f, 842.25f - 294.0f, "Uncleared Amount", "0.00");
        drawDossierRow(canvas, regular, 52.68f, 157.68f, 165.18f, 842.25f - 314.25f, "+MOD Bal", "0.00");
        drawDossierRow(canvas, regular, 52.68f, 157.68f, 165.18f, 842.25f - 334.5f, "Lien", "0.0");
        drawDossierRow(canvas, regular, 52.68f, 157.68f, 165.18f, 842.25f - 354.75f, "Limit", "0.00");
        drawDossierRow(canvas, regular, 52.68f, 157.68f, 165.18f, 842.25f - 375.0f, "Monthly Avg Balance", "0.00");
        drawDossierRow(canvas, regular, 52.68f, 157.68f, 165.18f, 842.25f - 395.25f, "Interest Rate", "2.50 % p.a.");
        drawDossierRow(canvas, regular, 52.68f, 157.68f, 165.18f, 842.25f - 415.5f, "Drawing Power", "0.00");
        drawDossierRow(canvas, regular, 52.68f, 157.68f, 165.18f, 842.25f - 466.5f, "Account open Date", openDate);

        // Right Dossier (Branch & Account & Nominee info)
        drawDossierRow(canvas, regular, 340.20f, 430.20f, 437.70f, 842.25f - 247.5f, "Branch Code", branchCode);
        drawDossierRow(canvas, regular, 340.20f, 430.20f, 437.70f, 842.25f - 267.75f, "Branch Name", branchName);
        drawDossierRow(canvas, regular, 340.20f, 430.20f, 437.70f, 842.25f - 288.0f, "Branch Email ID", branchEmail);
        drawDossierRow(canvas, regular, 340.20f, 430.20f, 437.70f, 842.25f - 308.25f, "Branch Phone", branchPhone);
        drawDossierRow(canvas, regular, 340.20f, 430.20f, 437.70f, 842.25f - 343.5f, "CIF Number", cifNo);
        drawDossierRow(canvas, regular, 340.20f, 430.20f, 437.70f, 842.25f - 363.75f, "Account Number", accNo);
        drawDossierRow(canvas, regular, 340.20f, 430.20f, 437.70f, 842.25f - 384.0f, "Product", "SAVINGS");
        drawDossierRow(canvas, regular, 340.20f, 430.20f, 437.70f, 842.25f - 404.25f, "IFSC Code", ifsc);
        drawDossierRow(canvas, regular, 340.20f, 430.20f, 437.70f, 842.25f - 424.5f, "Currency", "INR");
        drawDossierRow(canvas, regular, 340.20f, 430.20f, 437.70f, 842.25f - 444.75f, "Account Status", "OPEN");
        drawDossierRow(canvas, regular, 340.20f, 430.20f, 437.70f, 842.25f - 465.0f, "CKYCR Number", ckycr);
        drawDossierRow(canvas, regular, 340.20f, 430.20f, 437.70f, 842.25f - 485.25f, "MICR Code", micr);
        drawDossierRow(canvas, regular, 340.20f, 430.20f, 437.70f, 842.25f - 516.0f, "Nominee Name", nominee);

        // Statement From strip (centered)
        String stmtFrom = "Statement From   :   " + startDateStr + " to " + endDateStr;
        float stmtW = regular.getWidth(stmtFrom, 7.88f);
        drawText(canvas, regular, 7.88f, COLOR_BLACK, (PAGE_WIDTH - stmtW) / 2f, 842.25f - 538.5f, stmtFrom);
    }

    private void drawText(PdfCanvas canvas, PdfFont font, float size, DeviceRgb color, float x, float y, String text) {
        canvas.saveState();
        canvas.beginText();
        canvas.setFontAndSize(font, size);
        canvas.setFillColor(color);
        canvas.moveText(x, y);
        canvas.showText(text);
        canvas.endText();
        canvas.restoreState();
    }

    private void drawDossierRow(PdfCanvas canvas, PdfFont font, float labelX, float colonX, float valX, float y, String label, String val) {
        drawText(canvas, font, 9.75f, COLOR_BLACK, labelX, y, label);
        drawText(canvas, font, 9.75f, COLOR_BLACK, colonX, y, ":");
        drawText(canvas, font, 9.75f, COLOR_BLACK, valX, y, val != null ? val : "");
    }


    // ── Helper: Draw Page Footer ────────────────────────────────────────────
    private void drawPageFooter(PdfCanvas canvas, PdfFont regular, int pageNum) {
        canvas.saveState();
        canvas.beginText();
        canvas.setFontAndSize(regular, 8.25f);
        canvas.setFillColor(COLOR_MUTED_GRAY);
        String text = "Page no. " + pageNum;
        float textWidth = regular.getWidth(text, 8.25f);
        canvas.moveText((PAGE_WIDTH - textWidth) / 2f, 15.0f);
        canvas.showText(text);
        canvas.endText();
        canvas.restoreState();
    }

    private Div createDividerLine() {
        Div line = new Div();
        line.setWidth(USABLE_WIDTH);
        line.setHeight(1.0f);
        line.setBackgroundColor(COLOR_DIVIDER);
        line.setMarginBottom(8.0f);
        return line;
    }

    // ── Helper: Split transactions ──────────────────────────────────────────
    private List<List<Transaction>> splitTransactions(List<Transaction> transactions) {
        List<List<Transaction>> pages = new ArrayList<>();
        if (transactions == null || transactions.isEmpty()) {
            pages.add(new ArrayList<>());
            return pages;
        }

        // Page 1 gets up to 6 transactions
        int p1End = Math.min(PAGE_1_ROWS, transactions.size());
        pages.add(new ArrayList<>(transactions.subList(0, p1End)));

        // Continuation pages get 21 transactions each
        int idx = p1End;
        while (idx < transactions.size()) {
            int end = Math.min(idx + CONT_PAGE_ROWS, transactions.size());
            pages.add(new ArrayList<>(transactions.subList(idx, end)));
            idx = end;
        }

        return pages;
    }

    private PdfFont loadFont(String resourcePath) {
        try (InputStream in = getClass().getResourceAsStream(resourcePath)) {
            if (in != null) {
                byte[] fontBytes = in.readAllBytes();
                return PdfFontFactory.createFont(fontBytes, PdfEncodings.IDENTITY_H);
            }
        } catch (Exception ignored) {}
        try {
            return PdfFontFactory.createFont(com.itextpdf.io.font.constants.StandardFonts.HELVETICA);
        } catch (Exception e) {
            throw new RuntimeException("Failed to initialize PDF fallback font", e);
        }
    }

    private byte[] loadResourceBytes(String resourcePath) {
        try (InputStream in = getClass().getResourceAsStream(resourcePath)) {
            if (in != null) {
                return in.readAllBytes();
            }
        } catch (Exception ignored) {}
        return null;
    }

    private String formatIndianCurrency(double amount) {
        DecimalFormatSymbols symbols = new DecimalFormatSymbols(Locale.ENGLISH);
        DecimalFormat df = new DecimalFormat("#,##,##0.00", symbols);
        return df.format(amount);
    }
}
