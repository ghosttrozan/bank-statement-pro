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
import com.itextpdf.layout.Document;
import com.itextpdf.layout.borders.Border;
import com.itextpdf.layout.element.AreaBreak;
import com.itextpdf.layout.element.Cell;
import com.itextpdf.layout.element.Image;
import com.itextpdf.layout.element.Paragraph;
import com.itextpdf.layout.element.Table;
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
import java.util.ArrayList;
import java.util.List;

/**
 * Pixel-accurate Axis Bank Statement Template.
 * Exact replication of official Axis Bank statements (6-axis.pdf).
 */
public class AxisTemplate implements StatementTemplate {

    private static final DeviceRgb COLOR_BLACK = new DeviceRgb(0, 0, 0);

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

            doc.setMargins(AxisLayout.MARGIN_TOP, AxisLayout.MARGIN_RIGHT, AxisLayout.MARGIN_BOTTOM, AxisLayout.MARGIN_LEFT);

            PdfFont fontTimesBold = PdfFontFactory.createFont(StandardFonts.TIMES_BOLD);
            PdfFont fontTimesRom  = PdfFontFactory.createFont(StandardFonts.TIMES_ROMAN);

            List<Transaction> transactions = record.transactions() != null ? record.transactions() : List.of();

            String startDateStr = transactions.isEmpty() ? "01-05-2026" : formatAxisDate(transactions.get(0).valueDate());
            String endDateStr   = transactions.isEmpty() ? "25-07-2026" : formatAxisDate(transactions.get(transactions.size() - 1).valueDate());

            String accNum = record.customerDetails().accountNumber() != null && !record.customerDetails().accountNumber().isBlank()
                    ? record.customerDetails().accountNumber() : "924010018137066";

            byte[] logoBytes = loadResourceBytes("/logos/axis_logo.png");

            // Split transactions into pages
            // Page 1: Opening Balance + up to 23 transactions (total 24 rows)
            // Continuation pages: up to 34 rows
            List<List<Transaction>> pages = splitTransactions(transactions);

            int totalPages = Math.max(1, pages.size());
            String branchCode = record.branchDetails().branchCode() != null ? record.branchDetails().branchCode() : "5251";

            double runningBalance = record.accountInfo() != null ? record.accountInfo().openingBalance() : 1001.80;
            double totalDebit = 0.0;
            double totalCredit = 0.0;

            for (Transaction tx : transactions) {
                if (tx.debit() != null) totalDebit += tx.debit();
                if (tx.credit() != null) totalCredit += tx.credit();
                runningBalance = tx.balance();
            }

            for (int pIdx = 0; pIdx < totalPages; pIdx++) {
                boolean isFirstPage = (pIdx == 0);
                boolean isLastPage  = (pIdx == totalPages - 1);

                if (!isFirstPage) {
                    doc.add(new AreaBreak(AreaBreakType.NEXT_PAGE));
                }

                if (isFirstPage) {
                    // 1. Centered Axis Bank Logo
                    if (logoBytes != null) {
                        Image logo = new Image(ImageDataFactory.create(logoBytes));
                        logo.setWidth(176.4f);
                        logo.setHeight(40.6f);
                        logo.setHorizontalAlignment(com.itextpdf.layout.properties.HorizontalAlignment.CENTER);
                        logo.setMarginTop(0f);
                        logo.setMarginBottom(10.0f);
                        doc.add(logo);
                    }

                    // 2. Customer & Branch Details Dossier
                    doc.add(buildDossier(record, fontTimesBold, fontTimesRom));

                    // 3. Statement Header Title: Statement of Axis Account No: X for the period (From: ... To: ...)
                    Paragraph pTitle = new Paragraph("Statement of Axis Account No: " + accNum
                            + " for the period (From: " + startDateStr + "  To: " + endDateStr + ")")
                            .setFont(fontTimesBold)
                            .setFontSize(10.0f)
                            .setFontColor(COLOR_BLACK)
                            .setTextAlignment(TextAlignment.CENTER)
                            .setMarginTop(8.0f)
                            .setMarginBottom(8.0f);
                    doc.add(pTitle);
                }

                // Table for current page
                List<Transaction> pageTxs = pages.isEmpty() ? List.of() : pages.get(pIdx);
                Table table = buildPageTable(pageTxs, isFirstPage, isLastPage,
                        record.accountInfo().openingBalance(), startDateStr, branchCode,
                        totalDebit, totalCredit, runningBalance, fontTimesBold, fontTimesRom);
                doc.add(table);

                // If last page: Add Disclaimers and DICGC notes
                if (isLastPage) {
                    doc.add(buildClosingNotes(fontTimesRom));
                }
            }

            // Flush document layout
            doc.flush();

            // Overlay Phase: Add DUMMY STATEMENT line at top of Page 1
            PdfPage page1 = pdfDoc.getPage(1);
            PdfCanvas canvas = new PdfCanvas(page1);
            canvas.saveState();
            canvas.beginText();
            canvas.setFontAndSize(PdfFontFactory.createFont(StandardFonts.HELVETICA_BOLD), 8.0f);
            canvas.setFillColor(new DeviceRgb(220, 50, 50));
            canvas.moveText(36.0f, AxisLayout.PAGE_HEIGHT - 12.0f);
            canvas.showText("DUMMY STATEMENT - FOR TESTING / DEMONSTRATION PURPOSES ONLY");
            canvas.endText();
            canvas.restoreState();

            // Underline under customer name on Page 1 (matches 6-axis.pdf drawing at y=68)
            canvas.saveState();
            canvas.setStrokeColor(COLOR_BLACK);
            canvas.setLineWidth(0.6f);
            canvas.moveTo(38.0f, AxisLayout.PAGE_HEIGHT - 68.0f);
            canvas.lineTo(150.0f, AxisLayout.PAGE_HEIGHT - 68.0f);
            canvas.stroke();
            canvas.restoreState();

            // Append Legends & Compliance page at the very end
            doc.add(new AreaBreak(AreaBreakType.NEXT_PAGE));
            doc.add(buildLegendsPage(record.branchDetails(), fontTimesRom, fontTimesBold));
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

        // Page 1 target: up to 23 txs (24 rows including opening balance)
        int p1Target = Math.min(23, total);
        pages.add(new ArrayList<>(all.subList(0, p1Target)));
        idx += p1Target;

        // Continuation pages: 34 rows per page
        while (idx < total) {
            int end = Math.min(idx + 34, total);
            pages.add(new ArrayList<>(all.subList(idx, end)));
            idx = end;
        }

        return pages;
    }

    private Table buildDossier(StatementRecord record, PdfFont fontBold, PdfFont fontRom) {
        CustomerDetails cust = record.customerDetails();
        BranchDetails branch = record.branchDetails();

        Table table = new Table(UnitValue.createPointArray(new float[]{275.0f, 248.0f}));
        table.setWidth(523.0f);
        table.setMargin(0);
        table.setMarginBottom(4.0f);

        // Left block: Customer Name & Address
        Cell leftCell = new Cell().setBorder(Border.NO_BORDER).setPadding(0).setMargin(0);
        leftCell.add(new Paragraph(cust.accountHolderName().toUpperCase())
                .setFont(fontBold).setFontSize(9.0f).setMargin(0));
        leftCell.add(new Paragraph("Joint Holder:- -")
                .setFont(fontRom).setFontSize(9.0f).setMargin(0));

        String addr = cust.address() != null && !cust.address().isBlank()
                ? cust.address()
                : "C/O: GOKUL SINGH,24 GRAAM SHAMBHUPURA\nTAHSIL AWNTIPUR BADODIYA,SHAMBHUPURA\nSHUJALPUR,SHAJAPUR,BINAYA-SHAJAPUR\nMADHYA PRADESH-INDIA\n465116";
        String[] addrLines = addr.split("[\\r\\n]+");
        for (String line : addrLines) {
            leftCell.add(new Paragraph(line.trim()).setFont(fontRom).setFontSize(9.0f).setMargin(0));
        }

        leftCell.add(new Paragraph("Registered Mobile No: XXXXXX6601").setFont(fontRom).setFontSize(9.0f).setMargin(0).setMarginTop(8.0f));
        leftCell.add(new Paragraph("Registered Email ID: " + (cust.email() != null && !cust.email().isBlank() ? cust.email() : "toXXXX92@gmail.com")).setFont(fontRom).setFontSize(9.0f).setMargin(0));
        leftCell.add(new Paragraph("Scheme: SAVINGS-EASYACCESS").setFont(fontRom).setFontSize(9.0f).setMargin(0));
        leftCell.add(new Paragraph("Currency: INR").setFont(fontRom).setFontSize(9.0f).setMargin(0));

        // Right block: Bank / Account Identifiers
        Cell rightCell = new Cell().setBorder(Border.NO_BORDER).setPadding(0).setMargin(0).setTextAlignment(TextAlignment.RIGHT);
        rightCell.add(new Paragraph("Customer ID: " + (cust.cifNumber() != null ? cust.cifNumber() : "964785889")).setFont(fontRom).setFontSize(9.0f).setMargin(0).setMarginTop(45.0f));
        rightCell.add(new Paragraph("IFSC Code: " + (branch.ifscCode() != null ? branch.ifscCode() : "UTIB0005251")).setFont(fontRom).setFontSize(9.0f).setMargin(0));
        rightCell.add(new Paragraph("MICR Code: " + (branch.micrCode() != null ? branch.micrCode() : "465211102")).setFont(fontRom).setFontSize(9.0f).setMargin(0));
        rightCell.add(new Paragraph("Nominee Registered: Y").setFont(fontRom).setFontSize(9.0f).setMargin(0));
        rightCell.add(new Paragraph("Nominee Name: " + (cust.nomineeName() != null && !cust.nomineeName().isBlank() ? cust.nomineeName().toUpperCase() : "GOKAL SINGH GURJAR")).setFont(fontRom).setFontSize(9.0f).setMargin(0));
        rightCell.add(new Paragraph("PAN: EJRPG7867M").setFont(fontRom).setFontSize(9.0f).setMargin(0));
        rightCell.add(new Paragraph("CKYC No: XXXXXXXXXX1484").setFont(fontRom).setFontSize(9.0f).setMargin(0));

        table.addCell(leftCell);
        table.addCell(rightCell);
        return table;
    }

    private Table buildPageTable(List<Transaction> txs, boolean isFirstPage, boolean isLastPage,
                                  double openingBal, String startDateStr, String branchCode,
                                  double totalDebit, double totalCredit, double closingBal,
                                  PdfFont fontBold, PdfFont fontRom) {
        Table table = new Table(UnitValue.createPointArray(AxisLayout.LEDGER_COLS));
        table.setWidth(AxisLayout.USABLE_WIDTH);
        table.setMargin(0);
        table.setMarginBottom(0);

        // Header Row (Printed on Page 1 or if needed)
        if (isFirstPage) {
            table.addHeaderCell(headerCell("Tran Date", fontBold, TextAlignment.CENTER));
            table.addHeaderCell(headerCell("Chq No", fontBold, TextAlignment.CENTER));
            table.addHeaderCell(headerCell("Particulars", fontBold, TextAlignment.CENTER));
            table.addHeaderCell(headerCell("Debit", fontBold, TextAlignment.CENTER));
            table.addHeaderCell(headerCell("Credit", fontBold, TextAlignment.CENTER));
            table.addHeaderCell(headerCell("Balance", fontBold, TextAlignment.CENTER));
            table.addHeaderCell(headerCell("Init.\nBr", fontBold, TextAlignment.CENTER));

            // Opening Balance Row
            table.addCell(dataCell("", fontRom, TextAlignment.CENTER));
            table.addCell(dataCell("", fontRom, TextAlignment.CENTER));
            table.addCell(dataCell("OPENING BALANCE", fontBold, TextAlignment.LEFT));
            table.addCell(dataCell("", fontRom, TextAlignment.CENTER));
            table.addCell(dataCell("", fontRom, TextAlignment.CENTER));
            table.addCell(dataCell(formatAmount(openingBal), fontBold, TextAlignment.RIGHT));
            table.addCell(dataCell("", fontRom, TextAlignment.CENTER));
        }

        // Transactions
        for (Transaction tx : txs) {
            String txDate = formatAxisDate(tx.valueDate());
            String chq    = tx.refNo() != null && tx.refNo().length() <= 6 ? tx.refNo() : "";
            String desc   = wrapParticulars(tx.details());

            String debitStr  = tx.debit()  != null ? formatAmount(tx.debit())  : "";
            String creditStr = tx.credit() != null ? formatAmount(tx.credit()) : "";
            String balStr    = TemplateUtils.formatCurrency(tx.balance());

            table.addCell(dataCell(txDate, fontRom, TextAlignment.CENTER));
            table.addCell(dataCell(chq, fontRom, TextAlignment.CENTER));
            table.addCell(dataCell(desc, fontRom, TextAlignment.LEFT));
            table.addCell(dataCell(debitStr, fontRom, TextAlignment.RIGHT));
            table.addCell(dataCell(creditStr, fontRom, TextAlignment.RIGHT));
            table.addCell(dataCell(balStr, fontRom, TextAlignment.RIGHT));
            table.addCell(dataCell(branchCode, fontRom, TextAlignment.CENTER));
        }

        // If last page: Append TRANSACTION TOTAL and CLOSING BALANCE summary rows
        if (isLastPage) {
            // Row 1: TRANSACTION TOTAL
            table.addCell(dataCell("", fontRom, TextAlignment.CENTER));
            table.addCell(dataCell("", fontRom, TextAlignment.CENTER));
            table.addCell(dataCell("TRANSACTION TOTAL", fontBold, TextAlignment.LEFT));
            table.addCell(dataCell(formatAmount(totalDebit), fontRom, TextAlignment.RIGHT));
            table.addCell(dataCell(formatAmount(totalCredit), fontRom, TextAlignment.RIGHT));
            table.addCell(dataCell("", fontRom, TextAlignment.RIGHT));
            table.addCell(dataCell("", fontRom, TextAlignment.CENTER));

            // Row 2: CLOSING BALANCE
            table.addCell(dataCell("", fontRom, TextAlignment.CENTER));
            table.addCell(dataCell("", fontRom, TextAlignment.CENTER));
            table.addCell(dataCell("CLOSING BALANCE", fontBold, TextAlignment.LEFT));
            table.addCell(dataCell("", fontRom, TextAlignment.RIGHT));
            table.addCell(dataCell("", fontRom, TextAlignment.RIGHT));
            table.addCell(dataCell(formatAmount(closingBal), fontRom, TextAlignment.RIGHT));
            table.addCell(dataCell("", fontRom, TextAlignment.CENTER));
        }

        return table;
    }

    private Cell headerCell(String text, PdfFont font, TextAlignment align) {
        Cell cell = new Cell()
                .setBorder(Border.NO_BORDER)
                .setPadding(2.0f)
                .setPaddingTop(4.0f)
                .setPaddingBottom(4.0f)
                .setTextAlignment(align)
                .setVerticalAlignment(VerticalAlignment.MIDDLE);

        cell.add(new Paragraph(text)
                .setFont(font)
                .setFontSize(9.0f)
                .setFontColor(COLOR_BLACK)
                .setMultipliedLeading(0.95f)
                .setMargin(0));

        cell.setNextRenderer(new CustomBorderCellRenderer(cell, 0.5f, COLOR_BLACK, true, true, true, true));
        return cell;
    }

    private Cell dataCell(String text, PdfFont font, TextAlignment align) {
        Cell cell = new Cell()
                .setBorder(Border.NO_BORDER)
                .setPadding(2.0f)
                .setPaddingTop(3.0f)
                .setPaddingBottom(3.0f)
                .setTextAlignment(align)
                .setVerticalAlignment(VerticalAlignment.MIDDLE);

        cell.add(new Paragraph(text)
                .setFont(font)
                .setFontSize(9.0f)
                .setFontColor(COLOR_BLACK)
                .setMultipliedLeading(1.05f)
                .setMargin(0));

        cell.setNextRenderer(new CustomBorderCellRenderer(cell, 0.5f, COLOR_BLACK, true, true, true, true));
        return cell;
    }

    private Paragraph buildClosingNotes(PdfFont fontRom) {
        return new Paragraph(
                "Unless the constituent notifies the bank immediately of any discrepancy found by him/her in this statement of Account, it will be taken that\n"
                + "he/she has found the account correct.\n"
                + "The closing balance as shown/displayed includes not only the credit balance and / or overdraft limit, but also funds which are under clearing. It\n"
                + "excludes the amount marked as lien, if any. Hence the closing balance displayed may not be the effective available balance. For any further\n"
                + "clarifications, please contact the Branch.\n"
                + "We would like to reiterate that, as a policy, Axis Bank never asks you to share, disclose, or revalidate your login Id, password or debit card\n"
                + "number through emails OR phone call. Further, we would like to reiterate that Axis Bank shall not be liable for any losses arising from\n"
                + "you sharing/disclosing of your login id, password and debit card number to anyone. Please co-operate by forwarding all such suspicious/spam\n"
                + "emails, if received by you, to customer.service@axis.bank.in\n"
                + "With effect from 1st August 2016, the replacement charges for Debit card and ATM card applicable on Current accounts have been revised. To\n"
                + "know more about the applicable charges, please visit www.axis.bank.in\n"
                + "Deposit Insurance and Credit Guarantee Corporation (DICGC) insurance cover is applicable in all Banks' deposits, such as savings, current,\n"
                + "fixed, recurring etc* up to maximum amount of Rs 5 Lakh including principal & interest both* (* for exceptions and details please refer\n"
                + "www.dicgc.org.in )")
                .setFont(fontRom)
                .setFontSize(8.0f)
                .setMultipliedLeading(1.15f)
                .setMarginTop(12.0f);
    }

    private Paragraph buildLegendsPage(BranchDetails branch, PdfFont fontRom, PdfFont fontBold) {
        String regOffice = "REGISTERED OFFICE - AXIS BANK LTD,TRISHUL,Opp. Samartheswar Temple, Near Law Garden, Ellisbridge, Ahmedabad . 380006.";
        String branchAddr = "BRANCH ADDRESS - AXIS BANK LTD, "
                + (branch.branchAddress() != null ? branch.branchAddress() : "UPPER GROUND FLOOR PATEL COMPLEX, VILLAGE ARANDIYA ASHTA SHAJAPUR ROAD, TEHSIL SHUJALPUR, 465333, SHUJALPUR, MADHYA PRADESH, INDIA")
                + ", TEL:" + (branch.branchPhone() != null ? branch.branchPhone() : "7400187511") + " FAX:";

        Paragraph p = new Paragraph();
        p.setFont(fontRom).setFontSize(8.5f).setMultipliedLeading(1.2f).setMarginTop(10.0f);

        p.add(new Paragraph("In compliance with regulatory guidelines, the non-CTS cheque books attached to the accounts would be destroyed in banks core banking\nSystem. Thus, Non CTS cheques will not be valid for CASH, Clearing and Transfer transactions\nTo ensure you never miss any critical communication from us, it is important that your latest / correct mobile number and email ID are updated\nin our records. Kindly visit your nearest Axis Bank Loan Centre /Branch / Agri area office for updating your latest / correct mobile number and\nemail ID in our records. You can also update your email ID using Internet Banking & Mobile Banking App, open\n"
                + regOffice + "\n" + branchAddr).setMarginBottom(16.0f));

        p.add(new Paragraph("Legends :").setFont(fontBold).setFontSize(9.0f).setMarginBottom(4.0f));
        p.add(new Paragraph(
                "ICONN-Transaction trough Internet Banking\n"
                + "VMT-ICON-Visa Money Transfer through Internet Banking\n"
                + "AUTOSWEEP-Transfer to linked fixed deposit\n"
                + "REV SWEEP-Interest on Linked fixed Deposit\n"
                + "SWEEP TRF-Transfer from Linked Fixed Deposit / Account\n"
                + "VMT-Visa Money Transfer through ATM\n"
                + "CWDR-Cash Withdrawal through ATM\n"
                + "PUR-POS purchase\n"
                + "TIP/ SCG-Surcharge on usage of debit card at pumps/railway ticket purchase or hotel tips\n"
                + "RATE.DIFF-Difference in rates on usage of card internationally\n"
                + "CLG-Cheque Clearing Transaction\n"
                + "EDC-Credit transaction through EDC Machine\n"
                + "SETU -Seamless electronic fund transfer through AXIS Bank\n"
                + "Int.pd-Interest paid to customer\n"
                + "Int.Coll-Interest collected from the customer\n\n"
                + "This is a system generated output and requires no signature.\n\n\n").setMarginBottom(20.0f));

        Paragraph endP = new Paragraph("++++ End of Statement ++++")
                .setFont(fontBold)
                .setFontSize(10.0f)
                .setTextAlignment(TextAlignment.CENTER);
        p.add(endP);

        return p;
    }

    private String wrapParticulars(String raw) {
        if (raw == null || raw.isBlank()) return "";
        if (raw.length() <= 34) return raw;
        StringBuilder sb = new StringBuilder();
        int cur = 0;
        while (cur < raw.length()) {
            int next = Math.min(cur + 32, raw.length());
            if (sb.length() > 0) sb.append("\n");
            sb.append(raw, cur, next);
            cur = next;
        }
        return sb.toString();
    }

    private String formatAxisDate(String rawDate) {
        if (rawDate == null || rawDate.isBlank()) return "01-05-2026";
        String s = rawDate.trim();
        String[] parts = s.split("[-/ ]");
        if (parts.length == 3) {
            if (parts[0].length() == 4) {
                return String.format("%02d-%02d-%s", Integer.parseInt(parts[2]), Integer.parseInt(parts[1]), parts[0]);
            } else if (parts[2].length() == 4) {
                return String.format("%02d-%02d-%s", Integer.parseInt(parts[0]), parseMonthNum(parts[1]), parts[2]);
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

    private String formatAmount(Double val) {
        if (val == null) return "";
        return String.format("%.2f", val);
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
