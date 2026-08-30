package com.statementpro.pdf;

import com.itextpdf.io.image.ImageDataFactory;
import com.itextpdf.kernel.geom.PageSize;
import com.itextpdf.kernel.pdf.PdfDocument;
import com.itextpdf.kernel.pdf.PdfWriter;
import com.itextpdf.kernel.pdf.WriterProperties;
import com.itextpdf.layout.Document;
import com.itextpdf.layout.borders.SolidBorder;
import com.itextpdf.layout.element.Cell;
import com.itextpdf.layout.element.Image;
import com.itextpdf.layout.element.Paragraph;
import com.itextpdf.layout.element.Table;
import com.itextpdf.layout.properties.TextAlignment;
import com.statementpro.model.StatementRecord;
import com.statementpro.model.Transaction;

import java.io.ByteArrayOutputStream;
import java.io.InputStream;
import java.util.List;

public class Sbi2Template implements StatementTemplate {

    private static final String[] MONTHS = {"Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"};
    private static final float LINE_HEIGHT_PT = 13.5f;

    // Fixed Column Widths totaling exactly 523pt (A4 width 595pt - 36pt left margin - 36pt right margin)
    private static final float[] COLUMN_WIDTHS = new float[]{55f, 55f, 134f, 78f, 63f, 63f, 75f};

    @Override
    public byte[] render(StatementRecord record) throws java.io.IOException {
        return render(record, null);
    }

    public byte[] render(StatementRecord record, WriterProperties writerProperties) throws java.io.IOException {
        ByteArrayOutputStream out = new ByteArrayOutputStream();
        PdfWriter writer = writerProperties != null ? new PdfWriter(out, writerProperties) : new PdfWriter(out);
        try (PdfDocument pdfDoc = new PdfDocument(writer);
             Document doc = new Document(pdfDoc, PageSize.A4)) {

            // Exact 36pt margins: Left=36pt, Right=36pt, Top=36pt, Bottom=20pt -> Width = 523pt
            doc.setMargins(36f, 36f, 20f, 36f);

            pdfDoc.getDocumentInfo()
                    .setAuthor("State Bank of India")
                    .setCreator("SBI Internet Banking System")
                    .setTitle("State Bank of India - Account Statement");

            List<Transaction> transactions = record.transactions();
            String accountNumber = formatSbiAccountNumber(record.customerDetails().accountNumber());
            String startDateStr = transactions.isEmpty() ? "1 Feb 2026" : formatSbiDate(transactions.get(0).valueDate());
            String endDateStr = transactions.isEmpty() ? "26 Aug 2026" : formatSbiDate(transactions.get(transactions.size() - 1).valueDate());

            // 1. Top SBI Logo (Clean cyan emblem + SBI text, no Account Summary, 181.5 x 54 pt)
            Image logo = loadLogo();
            if (logo != null) {
                doc.add(logo);
            }

            // 2. Account Information Dossier
            doc.add(buildDossier(record, accountNumber, startDateStr, endDateStr));

            // 3. Statement Title (Helvetica 12pt, regular/left-aligned)
            doc.add(new Paragraph("Account Statement from " + startDateStr + " to " + endDateStr)
                    .setFontSize(12.0f)
                    .setFixedLeading(LINE_HEIGHT_PT)
                    .setMarginTop(28f)
                    .setMarginBottom(16f));

            // 4. Continuous Ledger Table (Flows naturally across all pages, repeating header automatically)
            doc.add(buildContinuousLedgerTable(transactions));

            // 5. Footer Disclaimer (Flows naturally immediately after the final table row)
            doc.add(new Paragraph("Please do not share your ATM, Debit/Credit card number, PIN "
                    + "(Personal Identification Number) and OTP (One Time Password) with anyone over "
                    + "mail, SMS, phone call or any other media. Bank never asks for such information.")
                    .setFontSize(8.5f).setMarginTop(12f));
            doc.add(new Paragraph("**This is a computer generated statement and does not require a signature.")
                    .setFontSize(8.5f).setMarginTop(4f));
        }
        return out.toByteArray();
    }

    private Image loadLogo() {
        try (InputStream in = getClass().getResourceAsStream("/logos/sbi2-logo.png")) {
            if (in == null) return null;
            byte[] logoBytes = in.readAllBytes();
            Image logo = new Image(ImageDataFactory.create(logoBytes));
            // Exact reference specifications: Width ≈ 181.5 pt, Height ≈ 54 pt
            logo.setWidth(181.5f);
            logo.setHeight(54.0f);
            logo.setMarginBottom(3.8f);
            return logo;
        } catch (Exception e) {
            return null;
        }
    }

    private Table buildDossier(StatementRecord record, String accountNumber, String startDateStr, String endDateStr) {
        Table table = new Table(new float[]{135f, 388f}).setWidth(523f);
        table.setFontSize(9.0f);
        table.setMarginBottom(0f);

        addDossierRow(table, "Account Name", ": " + (record.customerDetails().accountHolderName() != null ? record.customerDetails().accountHolderName() : ""));
        
        String addr = (record.customerDetails().address() != null ? record.customerDetails().address().replaceAll("[\\r\\n]+", " ").trim() : "");
        addDossierAddressRow(table, "Address", ": " + addr);

        addDossierRow(table, "Date", ": " + endDateStr);
        addDossierRow(table, "Account Number", ": " + accountNumber);
        addDossierRow(table, "Account Description", ": " + (record.accountInfo().accountType() != null && !record.accountInfo().accountType().isBlank() ? record.accountInfo().accountType().toUpperCase() : "REGULAR SAVINGS BANK ACCOUNT"));
        addDossierRow(table, "Branch", ": " + (record.branchDetails().branchName() != null ? record.branchDetails().branchName() : ""));
        addDossierRow(table, "Drawing Power", ": 0.00");
        addDossierRow(table, "Interest Rate(% p.a.)", ": " + record.accountInfo().interestRate());
        addDossierRow(table, "MOD Balance", ": 0.00");
        addDossierRow(table, "CIF No.", ": " + (record.customerDetails().cifNumber() != null ? record.customerDetails().cifNumber() : ""));
        addDossierRow(table, "CKYCR Number", ": " + maskCkycr(record.branchDetails().ckycrNumber()));
        addDossierRow(table, "IFS Code", ":" + (record.branchDetails().ifscCode() != null ? record.branchDetails().ifscCode() : ""));
        addDossierSpanRow(table, "(Indian Financial System)");
        addDossierRow(table, "MICR Code", ": " + (record.branchDetails().micrCode() != null ? record.branchDetails().micrCode() : ""));
        addDossierSpanRow(table, "(Magnetic Ink Character Recognition)");
        addDossierRow(table, "Nomination Registered", ": " + (isNominationRegistered(record.customerDetails().nomineeName()) ? "Yes" : "No"));
        addDossierRow(table, "Balance as on " + startDateStr, ": " + TemplateUtils.formatCurrency(record.accountInfo().openingBalance()));

        return table;
    }

    private void addDossierAddressRow(Table table, String label, String valueWithColon) {
        Paragraph p1 = new Paragraph(label == null ? "" : label)
                .setFontSize(9.0f)
                .setFixedLeading(LINE_HEIGHT_PT)
                .setMargin(0);
        
        // Single line address followed by 3 blank lines
        String cleanAddr = (valueWithColon != null ? valueWithColon : "") + "\n\n\n";
        Paragraph p2 = new Paragraph(cleanAddr)
                .setFontSize(9.0f)
                .setFixedLeading(LINE_HEIGHT_PT)
                .setMargin(0);

        table.addCell(new Cell().add(p1).setBorder(null).setPadding(0).setMargin(0));
        table.addCell(new Cell().add(p2).setBorder(null).setPadding(0).setMargin(0));
    }

    private void addDossierRow(Table table, String label, String valueWithColon) {
        Paragraph p1 = new Paragraph(label == null ? "" : label)
                .setFontSize(9.0f)
                .setFixedLeading(LINE_HEIGHT_PT)
                .setMargin(0);
        Paragraph p2 = new Paragraph(valueWithColon == null ? "" : valueWithColon)
                .setFontSize(9.0f)
                .setFixedLeading(LINE_HEIGHT_PT)
                .setMargin(0);

        table.addCell(new Cell().add(p1).setBorder(null).setPadding(0).setMargin(0));
        table.addCell(new Cell().add(p2).setBorder(null).setPadding(0).setMargin(0));
    }

    private void addDossierSpanRow(Table table, String note) {
        Paragraph p = new Paragraph(note)
                .setFontSize(7.5f)
                .setFixedLeading(LINE_HEIGHT_PT)
                .setMargin(0);
        table.addCell(new Cell(1, 2).add(p).setBorder(null).setPadding(0).setMargin(0));
    }

    private String maskCkycr(String ckycr) {
        String digits = (ckycr == null ? "35104" : ckycr).replaceAll("\\D", "");
        String last5 = digits.length() >= 5 ? digits.substring(digits.length() - 5) : "35104";
        return "XXXXXXXXXX" + last5;
    }

    private boolean isNominationRegistered(String nomineeName) {
        return nomineeName != null && !nomineeName.isBlank() && !nomineeName.toLowerCase().contains("no");
    }

    private Table buildContinuousLedgerTable(List<Transaction> transactions) {
        Table table = new Table(COLUMN_WIDTHS);
        table.setFontSize(9.0f);

        // Header cells repeated on every page
        for (String header : new String[]{"Txn Date", "Value\nDate", "Description", "Ref No./\nCheque\nNo.", "Debit", "Credit", "Balance"}) {
            table.addHeaderCell(new Cell().add(new Paragraph(header).setFontSize(10.0f).setBold().setMultipliedLeading(1.05f))
                    .setBorder(new SolidBorder(0.5f)).setPaddingLeft(1.5f).setPaddingRight(1.5f).setPaddingTop(2.0f).setPaddingBottom(2.0f));
        }

        // All rows added continuously so iText handles natural pagination
        for (Transaction tx : transactions) {
            String description = buildDescription(tx);
            String refLine = buildRefLine(tx);

            table.addCell(sbi2Cell(formatSbiDate(tx.valueDate())));
            table.addCell(sbi2Cell(formatSbiDate(tx.postDate())));
            table.addCell(sbi2Cell(description));
            table.addCell(sbi2Cell(refLine));
            table.addCell(sbi2CellRight(tx.debit() != null ? TemplateUtils.formatCurrency(tx.debit()) : ""));
            table.addCell(sbi2CellRight(tx.credit() != null ? TemplateUtils.formatCurrency(tx.credit()) : ""));
            table.addCell(sbi2CellRight(TemplateUtils.formatCurrency(tx.balance())));
        }
        return table;
    }

    private String buildDescription(Transaction tx) {
        boolean isCredit = tx.credit() != null;
        if (isCredit && tx.details().contains("INTEREST")) {
            return "CREDIT INTEREST--";
        }
        if (isCredit) {
            return "BY TRANSFER-\n" + tx.details();
        }
        String cleanDetails = tx.details().startsWith("TO TRANSFER-") ? tx.details().substring("TO TRANSFER-".length()) : tx.details();
        return "TO TRANSFER-\n" + cleanDetails;
    }

    private String buildRefLine(Transaction tx) {
        if (tx.credit() != null && tx.details().contains("INTEREST")) {
            return "";
        }
        String rNum = tx.refNo() != null && !tx.refNo().isBlank() ? tx.refNo() : "1234567890123";
        if (tx.credit() != null) {
            return "TRANSFER\nFROM\n" + rNum;
        } else {
            return "TRANSFER TO\n" + rNum;
        }
    }

    private Cell sbi2Cell(String text) {
        return new Cell().add(new Paragraph(text == null ? "" : text).setFontSize(9.0f).setMultipliedLeading(1.15f))
                .setBorder(new SolidBorder(0.5f)).setPaddingLeft(1.5f).setPaddingRight(1.5f).setPaddingTop(2.0f).setPaddingBottom(2.0f);
    }

    private Cell sbi2CellRight(String text) {
        return sbi2Cell(text).setTextAlignment(TextAlignment.RIGHT);
    }

    private String formatSbiDate(String dateStr) {
        if (dateStr == null || dateStr.isBlank()) return "";
        if (dateStr.matches(".*[a-zA-Z].*")) return dateStr;

        String[] parts = dateStr.split("[-/]");
        if (parts.length == 3) {
            int day, month, year;
            try {
                if (parts[0].length() == 4) {
                    year = Integer.parseInt(parts[0]);
                    month = Integer.parseInt(parts[1]) - 1;
                    day = Integer.parseInt(parts[2]);
                } else {
                    day = Integer.parseInt(parts[0]);
                    month = Integer.parseInt(parts[1]) - 1;
                    year = Integer.parseInt(parts[2]);
                }
                if (month >= 0 && month < 12) {
                    return String.format("%d %s %04d", day, MONTHS[month], year);
                }
            } catch (NumberFormatException ignored) {}
        }
        return dateStr;
    }

    private String formatSbiAccountNumber(String accNo) {
        String raw = (accNo == null || accNo.isBlank() ? "00000045012800409" : accNo).trim();
        if (raw.length() < 17 && raw.matches("\\d+")) {
            return "0".repeat(17 - raw.length()) + raw;
        }
        return raw;
    }
}
