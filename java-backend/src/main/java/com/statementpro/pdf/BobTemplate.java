package com.statementpro.pdf;

import com.itextpdf.io.font.constants.StandardFonts;
import com.itextpdf.io.image.ImageDataFactory;
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
import com.itextpdf.kernel.pdf.canvas.draw.ILineDrawer;
import com.itextpdf.layout.Document;
import com.itextpdf.layout.borders.Border;
import com.itextpdf.layout.borders.SolidBorder;
import com.itextpdf.layout.element.AreaBreak;
import com.itextpdf.layout.element.Cell;
import com.itextpdf.layout.element.Image;
import com.itextpdf.layout.element.Paragraph;
import com.itextpdf.layout.element.Table;
import com.itextpdf.layout.element.Text;
import com.itextpdf.layout.properties.AreaBreakType;
import com.itextpdf.layout.properties.TextAlignment;
import com.itextpdf.layout.properties.UnitValue;
import com.itextpdf.layout.properties.VerticalAlignment;
import com.statementpro.model.BranchDetails;
import com.statementpro.model.CustomerDetails;
import com.statementpro.model.StatementRecord;
import com.statementpro.model.Transaction;

import java.io.ByteArrayOutputStream;
import java.io.InputStream;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.List;

/**
 * Pixel-accurate Bank of Baroda (bob World) Statement Template.
 * Exact replication of official bob World PDF statements (2-bob.pdf).
 */
public class BobTemplate implements StatementTemplate {

    private static final DeviceRgb COLOR_HEADER_GRAY = new DeviceRgb(204, 204, 204); // rgb(0.8, 0.8, 0.8)
    private static final DeviceRgb COLOR_BORDER_GRAY = new DeviceRgb(153, 153, 153); // rgb(0.6, 0.6, 0.6)
    private static final DeviceRgb COLOR_ZEBRA_BG    = new DeviceRgb(231, 231, 231); // rgb(0.906, 0.906, 0.906)
    private static final DeviceRgb COLOR_DOSSIER_PEACH = new DeviceRgb(255, 222, 214);
    private static final DeviceRgb COLOR_DOSSIER_BORDER = new DeviceRgb(255, 153, 153);
    private static final DeviceRgb COLOR_BLACK       = new DeviceRgb(0, 0, 0);

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

            doc.setMargins(BobLayout.MARGIN_TOP, BobLayout.MARGIN_RIGHT, BobLayout.MARGIN_BOTTOM, BobLayout.MARGIN_LEFT);

            PdfFont fontRegular = PdfFontFactory.createFont(StandardFonts.HELVETICA);
            PdfFont fontBold    = PdfFontFactory.createFont(StandardFonts.HELVETICA_BOLD);

            List<Transaction> transactions = record.transactions() != null ? record.transactions() : List.of();

            String startDateStr = transactions.isEmpty() ? "01-04-2026"
                    : formatBobDate(transactions.get(0).valueDate());
            String endDateStr   = transactions.isEmpty() ? "30-06-2026"
                    : formatBobDate(transactions.get(transactions.size() - 1).valueDate());
            String titleText    = "Account Statement from " + startDateStr + " to " + endDateStr;

            // Split into pages (Page 1 has Opening Balance + up to 11 transactions = 12 rows)
            // Continuation pages have 22 rows
            List<List<Transaction>> pages = splitTransactions(transactions);

            byte[] headerLogoBytes = loadResourceBytes("/logos/bob_header_full.png");
            byte[] footerBarBytes  = loadResourceBytes("/logos/bob_footer_bar.png");

            int totalPages = Math.max(1, pages.size());
            int globalSerial = 1;

            // Track table bottom Y coordinate per page for exact post-table footer positioning
            List<Float> pageTableBottoms = new ArrayList<>();

            for (int pIdx = 0; pIdx < totalPages; pIdx++) {
                boolean isFirstPage = (pIdx == 0);
                boolean isLastPage  = (pIdx == totalPages - 1);

                if (!isFirstPage) {
                    doc.add(new AreaBreak(AreaBreakType.NEXT_PAGE));
                }

                // 1. Header Banner Image
                if (headerLogoBytes != null) {
                    Image headerImg = new Image(ImageDataFactory.create(headerLogoBytes));
                    headerImg.setWidth(555.0f);
                    headerImg.setHeight(148.0f);
                    headerImg.setMarginTop(0f);
                    headerImg.setMarginBottom(0f);
                    doc.add(headerImg);
                }

                // 2. Page 1 Dossier Box (Account Details)
                if (isFirstPage) {
                    doc.add(buildDossierTable(record, fontRegular, fontBold));
                }

                // 3. Transactions Table
                List<Transaction> pageTxs = pages.isEmpty() ? List.of() : pages.get(pIdx);
                Table table = buildPageTable(pageTxs, isFirstPage, record.accountInfo().openingBalance(),
                        startDateStr, globalSerial, fontRegular, fontBold);
                doc.add(table);

                // Advance globalSerial
                if (isFirstPage) {
                    globalSerial += 1 + pageTxs.size(); // opening balance + tx count
                } else {
                    globalSerial += pageTxs.size();
                }
            }

            // Flush layout so we can measure and draw overlay canvas decorations
            doc.flush();

            // ── Overlay Phase: Add Title text in orange banner, Watermark, Footer Pill, Notices, Footer Bar ──
            String genTimestamp = LocalDateTime.now().format(DateTimeFormatter.ofPattern("dd/MM/yyyy hh:mm:ss a"));

            for (int i = 1; i <= totalPages; i++) {
                PdfPage page = pdfDoc.getPage(i);
                PdfCanvas canvas = new PdfCanvas(page);



                // B. Banner Title text: "Account Statement from DD-MM-YYYY to DD-MM-YYYY" in white over orange banner
                // In reference: y0 = 127.6pt, size 15pt bold Helvetica white, centered horizontally
                float titleWidth = fontBold.getWidth(titleText, 15.0f);
                float titleX = (BobLayout.PAGE_WIDTH - titleWidth) / 2.0f;
                float titleY = BobLayout.PAGE_HEIGHT - 142.0f; // y from bottom: 842 - 142 = 700 (142pt from top)

                canvas.saveState();
                canvas.beginText();
                canvas.setFontAndSize(fontBold, 15.0f);
                canvas.setFillColor(new DeviceRgb(255, 255, 255));
                canvas.moveText(titleX, titleY);
                canvas.showText(titleText);
                canvas.endText();
                canvas.restoreState();

                // C. Footer Components
                // Measure position: on intermediate pages it's fixed near bottom; on last page if fewer rows, follows table
                float noteBoxTopY;
                int rowCountOnThisPage;
                if (i == 1) {
                    rowCountOnThisPage = 1 + (pages.isEmpty() ? 0 : pages.get(0).size());
                    noteBoxTopY = 706.75f;
                } else {
                    rowCountOnThisPage = pages.get(i - 1).size();
                    if (i == totalPages && rowCountOnThisPage < 18) {
                        // Position dynamically right below table
                        // Table starts at y = 175.5pt. Header = 22pt. Each row = 22pt.
                        float tableBottomY = 175.5f + 22.0f + (rowCountOnThisPage * 22.0f);
                        noteBoxTopY = tableBottomY + 13.75f;
                    } else {
                        noteBoxTopY = 696.75f;
                    }
                }

                drawFooterSection(canvas, fontRegular, fontBold, footerBarBytes, i, totalPages, genTimestamp, noteBoxTopY);
            }
        }

        return out.toByteArray();
    }

    /**
     * Splits transactions: Page 1 holds 11 txs (with opening balance = 12 rows).
     * Continuation pages hold 22 txs.
     */
    private List<List<Transaction>> splitTransactions(List<Transaction> all) {
        List<List<Transaction>> pages = new ArrayList<>();
        if (all == null || all.isEmpty()) {
            pages.add(List.of());
            return pages;
        }

        int total = all.size();
        int idx = 0;

        // Page 1: up to 11 transactions (total 12 rows with opening balance)
        int p1Target = Math.min(11, total);
        pages.add(new ArrayList<>(all.subList(0, p1Target)));
        idx += p1Target;

        // Continuation pages: 22 per page
        while (idx < total) {
            int end = Math.min(idx + 22, total);
            pages.add(new ArrayList<>(all.subList(idx, end)));
            idx = end;
        }

        return pages;
    }

    /**
     * Builds Page 1 Account Details dossier box.
     */
    private Table buildDossierTable(StatementRecord record, PdfFont fontRegular, PdfFont fontBold) {
        CustomerDetails cust = record.customerDetails();
        BranchDetails branch = record.branchDetails();

        // 2 outer columns: Left (Customer Info) = 285pt, Right (Branch Info) = 270pt (total 555pt)
        Table table = new Table(UnitValue.createPointArray(new float[]{285.0f, 270.0f}));
        table.setWidth(555.0f);
        table.setMarginTop(8.0f);
        table.setMarginBottom(10.0f);
        table.setBackgroundColor(new DeviceRgb(255, 255, 255));
        table.setBorder(new SolidBorder(COLOR_DOSSIER_BORDER, 0.5f));

        // Header spanning both columns: "Account Details"
        Cell headerCell = new Cell(1, 2)
                .setBackgroundColor(COLOR_DOSSIER_PEACH)
                .setBorder(Border.NO_BORDER)
                .setPaddingLeft(11.0f)
                .setPaddingTop(6.0f)
                .setPaddingBottom(6.0f);
        Paragraph headerP = new Paragraph("Account Details")
                .setFont(fontBold)
                .setFontSize(14.0f)
                .setFontColor(COLOR_BLACK)
                .setMargin(0);
        headerCell.add(headerP);
        table.addCell(headerCell);

        // Row 1: Account Name & Branch Name
        table.addCell(dossierBlock("Account Name", cust.accountHolderName(), fontRegular, fontBold, TextAlignment.LEFT));
        table.addCell(dossierBlock("Branch Name", branch.branchName() != null ? branch.branchName().toUpperCase() : "ASHTA", fontRegular, fontBold, TextAlignment.RIGHT));

        // Row 2: Account Number & IFSC Code
        String accNum = cust.accountNumber() != null && !cust.accountNumber().isBlank() ? cust.accountNumber() : "68130100008269";
        table.addCell(dossierBlock("Account Number", accNum, fontRegular, fontBold, TextAlignment.LEFT));
        table.addCell(dossierBlock("IFSC Code", branch.ifscCode() != null ? branch.ifscCode() : "BARB0VJASHT", fontRegular, fontBold, TextAlignment.RIGHT));

        // Row 3: Account Type & MICR Code
        String accType = record.accountInfo() != null && record.accountInfo().accountType() != null ? record.accountInfo().accountType() : "SBA";
        if (accType.toLowerCase().contains("saving")) accType = "SBA";
        table.addCell(dossierBlock("Account Type", accType, fontRegular, fontBold, TextAlignment.LEFT));
        table.addCell(dossierBlock("MICR Code", branch.micrCode() != null ? branch.micrCode() : "466012002", fontRegular, fontBold, TextAlignment.RIGHT));

        // Row 4: Customer Address & Branch Address
        String custAddr = cust.address() != null && !cust.address().isBlank()
                ? cust.address()
                : "VIL..-NAVRANGPUR,P.O.-BAMULIABHATI ASHTA\nSEHORE MADHYA PRADESH,INDIA\n466116";
        String branchAddr = branch.branchAddress() != null && !branch.branchAddress().isBlank()
                ? branch.branchAddress()
                : "KANNOD ROAD ASHTA\nMADHYA PRADESH 466116 MP";

        table.addCell(dossierAddressBlock("Customer Address", custAddr, fontRegular, fontBold, TextAlignment.LEFT));
        table.addCell(dossierAddressBlock("Branch Address", branchAddr, fontRegular, fontBold, TextAlignment.RIGHT));

        return table;
    }

    private Cell dossierBlock(String label, String value, PdfFont fontReg, PdfFont fontBld, TextAlignment align) {
        Cell cell = new Cell().setBorder(Border.NO_BORDER).setPaddingLeft(10.0f).setPaddingRight(10.0f).setPaddingTop(4.0f).setPaddingBottom(3.0f);
        Paragraph pLabel = new Paragraph(label).setFont(fontReg).setFontSize(6.0f).setFontColor(new DeviceRgb(50, 50, 50)).setMargin(0).setTextAlignment(align);
        Paragraph pVal   = new Paragraph(value != null ? value : "").setFont(fontBld).setFontSize(9.0f).setFontColor(COLOR_BLACK).setMargin(0).setMarginTop(1.0f).setTextAlignment(align);
        cell.add(pLabel).add(pVal);
        return cell;
    }

    private Cell dossierAddressBlock(String label, String address, PdfFont fontReg, PdfFont fontBld, TextAlignment align) {
        Cell cell = new Cell().setBorder(Border.NO_BORDER).setPaddingLeft(10.0f).setPaddingRight(10.0f).setPaddingTop(4.0f).setPaddingBottom(6.0f);
        Paragraph pLabel = new Paragraph(label).setFont(fontReg).setFontSize(6.0f).setFontColor(new DeviceRgb(50, 50, 50)).setMargin(0).setTextAlignment(align);
        cell.add(pLabel);

        String[] lines = address.split("[\\r\\n]+");
        for (String line : lines) {
            Paragraph p = new Paragraph(line.trim()).setFont(fontBld).setFontSize(7.5f).setFontColor(COLOR_BLACK).setMargin(0).setTextAlignment(align);
            cell.add(p);
        }
        return cell;
    }

    /**
     * Builds per-page 8-column Table.
     */
    private Table buildPageTable(List<Transaction> txs, boolean isFirstPage, double openingBal,
                                  String startDateStr, int startSerial,
                                  PdfFont fontReg, PdfFont fontBld) {
        Table table = new Table(UnitValue.createPointArray(BobLayout.LEDGER_COLS));
        table.setWidth(553.5f);
        table.setMarginLeft(1.25f);
        table.setMarginTop(isFirstPage ? 0f : 8f);
        table.setMarginBottom(0);

        // Header Row
        table.addHeaderCell(headerCell("Serial\nNo", fontBld, TextAlignment.CENTER, true));
        table.addHeaderCell(headerCell("Transaction\nDate", fontBld, TextAlignment.CENTER, false));
        table.addHeaderCell(headerCell("Value\nDate", fontBld, TextAlignment.CENTER, false));
        table.addHeaderCell(headerCell("Description", fontBld, TextAlignment.LEFT, false));
        table.addHeaderCell(headerCell("Cheque\nNumber", fontBld, TextAlignment.CENTER, false));
        table.addHeaderCell(headerCell("Debit", fontBld, TextAlignment.RIGHT, false));
        table.addHeaderCell(headerCell("Credit", fontBld, TextAlignment.RIGHT, false));
        table.addHeaderCell(headerCell("Balance", fontBld, TextAlignment.RIGHT, false));

        int serial = startSerial;
        int rowIdx = 0;

        // If Page 1: First row is Opening Balance
        if (isFirstPage) {
            boolean isZebra = (rowIdx % 2 != 0);
            DeviceRgb rowBg = isZebra ? COLOR_ZEBRA_BG : null;

            table.addCell(dataCell(String.valueOf(serial++), fontReg, TextAlignment.CENTER, rowBg, true));
            table.addCell(dataCell(startDateStr, fontReg, TextAlignment.CENTER, rowBg, false));
            table.addCell(dataCell("", fontReg, TextAlignment.CENTER, rowBg, false));
            table.addCell(dataCell("Opening Balance", fontReg, TextAlignment.LEFT, rowBg, false));
            table.addCell(dataCell("", fontReg, TextAlignment.CENTER, rowBg, false));
            table.addCell(dataCell("-", fontReg, TextAlignment.CENTER, rowBg, false));
            table.addCell(dataCell("-", fontReg, TextAlignment.CENTER, rowBg, false));
            table.addCell(dataCell(TemplateUtils.formatCurrency(openingBal), fontReg, TextAlignment.RIGHT, rowBg, false));
            rowIdx++;
        }

        // Transactions
        for (Transaction tx : txs) {
            boolean isZebra = (rowIdx % 2 != 0);
            DeviceRgb rowBg = isZebra ? COLOR_ZEBRA_BG : null;

            String txDate  = formatBobDate(tx.valueDate());
            String valDate = formatBobDate(tx.postDate());
            String desc    = wrapBobDescription(tx.details());
            String chq     = tx.refNo() != null && tx.refNo().length() <= 6 ? tx.refNo() : "";

            String debitStr  = tx.debit()  != null ? TemplateUtils.formatCurrency(tx.debit())  : "-";
            String creditStr = tx.credit() != null ? TemplateUtils.formatCurrency(tx.credit()) : "-";
            String balStr    = TemplateUtils.formatCurrency(tx.balance());

            table.addCell(dataCell(String.valueOf(serial++), fontReg, TextAlignment.CENTER, rowBg, true));
            table.addCell(dataCell(txDate, fontReg, TextAlignment.CENTER, rowBg, false));
            table.addCell(dataCell(valDate, fontReg, TextAlignment.CENTER, rowBg, false));
            table.addCell(dataCell(desc, fontReg, TextAlignment.LEFT, rowBg, false));
            table.addCell(dataCell(chq, fontReg, TextAlignment.CENTER, rowBg, false));
            table.addCell(dataCell(debitStr, fontReg, tx.debit() != null ? TextAlignment.RIGHT : TextAlignment.CENTER, rowBg, false));
            table.addCell(dataCell(creditStr, fontReg, tx.credit() != null ? TextAlignment.RIGHT : TextAlignment.CENTER, rowBg, false));
            table.addCell(dataCell(balStr, fontReg, TextAlignment.RIGHT, rowBg, false));

            rowIdx++;
        }

        return table;
    }

    private Cell headerCell(String text, PdfFont font, TextAlignment align, boolean drawLeft) {
        Cell cell = new Cell()
                .setBackgroundColor(COLOR_HEADER_GRAY)
                .setBorder(Border.NO_BORDER)
                .setPadding(2.0f)
                .setPaddingTop(3.0f)
                .setPaddingBottom(3.0f)
                .setTextAlignment(align)
                .setVerticalAlignment(VerticalAlignment.MIDDLE);

        Paragraph p = new Paragraph(text)
                .setFont(font)
                .setFontSize(7.0f)
                .setFontColor(COLOR_BLACK)
                .setMultipliedLeading(0.95f)
                .setMargin(0);
        cell.add(p);

        cell.setNextRenderer(new CustomBorderCellRenderer(cell, 0.5f, COLOR_BORDER_GRAY,
                true, true, true, drawLeft));
        return cell;
    }

    private Cell dataCell(String text, PdfFont font, TextAlignment align, DeviceRgb bgColor, boolean drawLeft) {
        Cell cell = new Cell()
                .setBorder(Border.NO_BORDER)
                .setPadding(2.0f)
                .setPaddingTop(3.5f)
                .setPaddingBottom(3.5f)
                .setTextAlignment(align)
                .setVerticalAlignment(VerticalAlignment.MIDDLE);

        if (bgColor != null) {
            cell.setBackgroundColor(bgColor);
        }

        Paragraph p = new Paragraph(text)
                .setFont(font)
                .setFontSize(7.0f)
                .setFontColor(COLOR_BLACK)
                .setMultipliedLeading(1.05f)
                .setMargin(0);
        cell.add(p);

        cell.setNextRenderer(new CustomBorderCellRenderer(cell, 0.5f, COLOR_BORDER_GRAY,
                false, true, true, drawLeft));
        return cell;
    }

    /**
     * Draws the rounded grey "Note" pill, computer-generated disclaimer, page numbers, and gradient bottom bar.
     */
    private void drawFooterSection(PdfCanvas canvas, PdfFont fontReg, PdfFont fontBold,
                                   byte[] footerBarBytes, int pageNum, int totalPages,
                                   String timestamp, float topYFromBottom) {
        float xLeft  = 20.75f;
        float xRight = 574.0f;
        float width  = xRight - xLeft;

        // In iText, 0,0 is bottom-left. Y in reference is measured from top:
        // y_itext = PAGE_HEIGHT - y_ref
        float pillTopIText    = BobLayout.PAGE_HEIGHT - topYFromBottom;
        float pillHeight      = 36.5f;
        float pillBottomIText = pillTopIText - pillHeight;

        canvas.saveState();

        // 1. Note Pill Box (Rounded rectangle filled with #CCCCCC)
        canvas.setFillColor(COLOR_HEADER_GRAY);
        canvas.roundRectangle(xLeft, pillBottomIText, width, pillHeight, 9.0f);
        canvas.fill();

        // Note Pill Text
        canvas.beginText();
        canvas.setFontAndSize(fontBold, 8.0f);
        canvas.setFillColor(COLOR_BLACK);
        canvas.moveText(xLeft + 9.25f, pillBottomIText + 14.0f);
        canvas.showText("Note: ");
        canvas.setFontAndSize(fontReg, 8.0f);
        canvas.showText("In case you find any discrepancy, we advise you to take up with your base branch or raise a complaint using bob World.");
        canvas.endText();

        // 2. Computer-generated disclaimer text
        float disclaimerY = pillBottomIText - 22.0f;
        canvas.beginText();
        canvas.setFontAndSize(fontReg, 7.0f);
        canvas.setFillColor(COLOR_BLACK);
        canvas.moveText(25.0f, disclaimerY);
        canvas.showText("This is a computer-generated statement hence does not require signature. Statement is generated on "
                + timestamp + " (through bob World mobile app) from the system");
        canvas.endText();

        canvas.beginText();
        canvas.setFontAndSize(fontReg, 7.0f);
        canvas.setFillColor(COLOR_BLACK);
        canvas.moveText(160.0f, disclaimerY - 8.5f);
        canvas.showText("maintained in the bank containing transactions carried out in normal course of business.");
        canvas.endText();

        // 3. Page X of Y (centered)
        String pageStr = "Page " + pageNum + " of " + totalPages;
        float pageStrWidth = fontBold.getWidth(pageStr, 8.0f);
        float pageX = (BobLayout.PAGE_WIDTH - pageStrWidth) / 2.0f;
        canvas.beginText();
        canvas.setFontAndSize(fontBold, 8.0f);
        canvas.setFillColor(COLOR_BLACK);
        canvas.moveText(pageX, disclaimerY - 24.0f);
        canvas.showText(pageStr);
        canvas.endText();

        // 4. Bottom Gradient Bar Image
        if (footerBarBytes != null) {
            try {
                Image footerImg = new Image(ImageDataFactory.create(footerBarBytes));
                footerImg.setFixedPosition(19.5f, disclaimerY - 38.0f, 555.0f);
                footerImg.setHeight(8.0f);
                // Draw through canvas directly or as image
            } catch (Exception ignored) {}
        }

        canvas.restoreState();

        // Draw footer accent bar rectangle in fallback if image not drawn via canvas:
        canvas.saveState();
        canvas.setFillColor(new DeviceRgb(242, 92, 5));
        canvas.rectangle(19.5f, disclaimerY - 38.0f, 555.0f, 7.0f);
        canvas.fill();
        canvas.restoreState();
    }

    private String wrapBobDescription(String raw) {
        if (raw == null || raw.isBlank()) return "";
        // Clean and break long narratives like UPI/341801005447/11:05:16/UPI/9575565225-2@axl/Pa
        if (raw.length() <= 32) return raw;
        StringBuilder sb = new StringBuilder();
        int cur = 0;
        while (cur < raw.length()) {
            int next = Math.min(cur + 30, raw.length());
            if (sb.length() > 0) sb.append("\n");
            sb.append(raw, cur, next);
            cur = next;
        }
        return sb.toString();
    }

    private String formatBobDate(String rawDate) {
        if (rawDate == null || rawDate.isBlank()) return "01-04-2026";
        String s = rawDate.trim();
        String[] parts = s.split("[-/ ]");
        if (parts.length == 3) {
            if (parts[0].length() == 4) { // yyyy-mm-dd
                return String.format("%02d-%02d-%s", Integer.parseInt(parts[2]), Integer.parseInt(parts[1]), parts[0]);
            } else if (parts[2].length() == 4) { // dd-mm-yyyy
                int month = parseMonthNum(parts[1]);
                return String.format("%02d-%02d-%s", Integer.parseInt(parts[0]), month, parts[2]);
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

    private byte[] loadResourceBytes(String path) {
        try (InputStream in = getClass().getResourceAsStream(path)) {
            if (in == null) return null;
            return in.readAllBytes();
        } catch (Exception e) {
            return null;
        }
    }
}
