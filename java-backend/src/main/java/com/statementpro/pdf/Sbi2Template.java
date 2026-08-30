package com.statementpro.pdf;

import com.itextpdf.io.image.ImageDataFactory;
import com.itextpdf.kernel.geom.PageSize;
import com.itextpdf.kernel.pdf.PdfDocument;
import com.itextpdf.kernel.pdf.PdfWriter;
import com.itextpdf.kernel.pdf.WriterProperties;
import com.itextpdf.layout.Document;
import com.itextpdf.layout.borders.SolidBorder;
import com.itextpdf.layout.element.AreaBreak;
import com.itextpdf.layout.element.Cell;
import com.itextpdf.layout.element.Image;
import com.itextpdf.layout.element.Paragraph;
import com.itextpdf.layout.element.Table;
import com.itextpdf.layout.properties.TextAlignment;
import com.itextpdf.layout.properties.UnitValue;
import com.statementpro.model.StatementRecord;
import com.statementpro.model.Transaction;

import java.io.ByteArrayOutputStream;
import java.io.InputStream;
import java.util.List;

public class Sbi2Template implements StatementTemplate {

    private static final String[] MONTHS = {"Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"};
    private static final float LINE_HEIGHT_PT = 13.5f;

    @Override
    public byte[] render(StatementRecord record) throws java.io.IOException {
        return render(record, null);
    }

    public byte[] render(StatementRecord record, WriterProperties writerProperties) throws java.io.IOException {
        ByteArrayOutputStream out = new ByteArrayOutputStream();
        PdfWriter writer = writerProperties != null ? new PdfWriter(out, writerProperties) : new PdfWriter(out);
        try (PdfDocument pdfDoc = new PdfDocument(writer);
             Document doc = new Document(pdfDoc, PageSize.A4)) {

            // Exact 36pt margins: Left=36pt, Right=36pt, Top=36pt -> Content Width = 523pt
            doc.setMargins(36f, 36f, 20f, 36f);

            pdfDoc.getDocumentInfo()
                    .setAuthor("State Bank of India")
                    .setCreator("SBI Internet Banking System")
                    .setTitle("State Bank of India - Account Statement");

            List<Transaction> transactions = record.transactions();
            List<List<Transaction>> pages = TemplateUtils.chunkTransactions(transactions, 8, 22);
            int totalPages = pages.size();

            String accountNumber = formatSbiAccountNumber(record.customerDetails().accountNumber());
            String startDateStr = transactions.isEmpty() ? "1 Apr 2026" : formatSbiDate(transactions.get(0).valueDate());
            String endDateStr = transactions.isEmpty() ? "30 Apr 2026" : formatSbiDate(transactions.get(transactions.size() - 1).valueDate());

            for (int pageIdx = 0; pageIdx < totalPages; pageIdx++) {
                boolean isFirstPage = pageIdx == 0;
                boolean isLastPage = pageIdx == totalPages - 1;

                if (isFirstPage) {
                    Image logo = loadLogo();
                    if (logo != null) {
                        doc.add(logo);
                    }
                    doc.add(buildDossier(record, accountNumber, startDateStr, endDateStr));
                    doc.add(new Paragraph("Account Statement from " + startDateStr + " to " + endDateStr)
                            .setBold()
                            .setFontSize(9.4f)
                            .setFixedLeading(LINE_HEIGHT_PT)
                            .setMarginTop(12f)
                            .setMarginBottom(17.4f));
                }

                doc.add(buildLedgerTable(pages.get(pageIdx)));

                if (isLastPage) {
                    doc.add(new Paragraph("Please do not share your ATM, Debit/Credit card number, PIN "
                            + "(Personal Identification Number) and OTP (One Time Password) with anyone over "
                            + "mail, SMS, phone call or any other media. Bank never asks for such information.")
                            .setFontSize(8.5f).setMarginTop(12));
                    doc.add(new Paragraph("**This is a computer generated statement and does not require a signature.")
                            .setFontSize(8.5f).setMarginTop(4));
                }
                if (!isLastPage) {
                    doc.add(new AreaBreak());
                }
            }
        }
        return out.toByteArray();
    }

    private Image loadLogo() {
        try (InputStream in = getClass().getResourceAsStream("/logos/sbi2-logo.png")) {
            if (in == null) return null;
            byte[] logoBytes = in.readAllBytes();
            Image logo = new Image(ImageDataFactory.create(logoBytes));
            // Exact height 54pt, bottom margin 3.8pt -> table starts at Y = 36 + 54 + 3.8 = 93.8pt
            logo.setHeight(54.0f);
            logo.setMarginBottom(3.8f);
            return logo;
        } catch (Exception e) {
            return null;
        }
    }

    private Table buildDossier(StatementRecord record, String accountNumber, String startDateStr, String endDateStr) {
        Table table = new Table(UnitValue.createPercentArray(new float[]{28, 2, 70})).useAllAvailableWidth();
        table.setFontSize(9.4f);
        table.setMarginBottom(0f);

        addDossierRow(table, "Account Name", ": " + (record.customerDetails().accountHolderName() != null ? record.customerDetails().accountHolderName() : ""));
        addDossierRow(table, "Address", ": " + (record.customerDetails().address() != null ? record.customerDetails().address().trim() : ""));
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

    private void addDossierRow(Table table, String label, String valueWithColon) {
        Paragraph p1 = new Paragraph(label == null ? "" : label)
                .setFontSize(9.4f)
                .setFixedLeading(LINE_HEIGHT_PT)
                .setMargin(0);
        Paragraph p2 = new Paragraph(valueWithColon == null ? "" : valueWithColon)
                .setFontSize(9.4f)
                .setFixedLeading(LINE_HEIGHT_PT)
                .setMargin(0);

        table.addCell(new Cell().add(p1).setBorder(null).setPadding(0).setMargin(0));
        table.addCell(new Cell(1, 2).add(p2).setBorder(null).setPadding(0).setMargin(0));
    }

    private void addDossierSpanRow(Table table, String note) {
        Paragraph p = new Paragraph(note)
                .setFontSize(7.5f)
                .setFixedLeading(LINE_HEIGHT_PT)
                .setMargin(0);
        table.addCell(new Cell(1, 3).add(p).setBorder(null).setPadding(0).setMargin(0));
    }

    private String maskCkycr(String ckycr) {
        String digits = (ckycr == null ? "1234" : ckycr).replaceAll("\\D", "");
        String last4 = digits.length() >= 4 ? digits.substring(digits.length() - 4) : "1234";
        return "XXXXXXXXXXX" + last4;
    }

    private boolean isNominationRegistered(String nomineeName) {
        return nomineeName != null && !nomineeName.isBlank() && !nomineeName.toLowerCase().contains("no");
    }

    private Table buildLedgerTable(List<Transaction> pageTxs) {
        Table table = new Table(UnitValue.createPercentArray(new float[]{10, 10, 32, 18, 10, 10, 10})).useAllAvailableWidth();
        table.setFontSize(8.0f);

        for (String header : new String[]{"Txn Date", "Value\nDate", "Description", "Ref No./Cheque\nNo.", "Debit", "Credit", "Balance"}) {
            table.addHeaderCell(new Cell().add(new Paragraph(header).setFontSize(8.0f).setBold().setMultipliedLeading(1.1f))
                    .setBorder(new SolidBorder(0.5f)).setPadding(2.5f));
        }

        for (Transaction tx : pageTxs) {
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
        return new Cell().add(new Paragraph(text == null ? "" : text).setMultipliedLeading(1.15f))
                .setBorder(new SolidBorder(0.5f)).setPadding(2.0f);
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
        String raw = (accNo == null || accNo.isBlank() ? "30521458920" : accNo).trim();
        if (raw.length() < 17 && raw.matches("\\d+")) {
            return "0".repeat(17 - raw.length()) + raw;
        }
        return raw;
    }
}
