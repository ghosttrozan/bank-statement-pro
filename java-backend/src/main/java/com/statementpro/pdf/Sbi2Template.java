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

    @Override
    public byte[] render(StatementRecord record) throws java.io.IOException {
        return render(record, null);
    }

    public byte[] render(StatementRecord record, WriterProperties writerProperties) throws java.io.IOException {
        ByteArrayOutputStream out = new ByteArrayOutputStream();
        PdfWriter writer = writerProperties != null ? new PdfWriter(out, writerProperties) : new PdfWriter(out);
        try (PdfDocument pdfDoc = new PdfDocument(writer);
             Document doc = new Document(pdfDoc, PageSize.A4)) {

            // Exact 36pt (0.5 inch) margins matching authentic SBI core statement
            doc.setMargins(36, 36, 36, 36);

            pdfDoc.getDocumentInfo()
                    .setAuthor("State Bank of India")
                    .setCreator("SBI Internet Banking System")
                    .setTitle("State Bank of India - Account Statement");

            List<Transaction> transactions = record.transactions();
            List<List<Transaction>> pages = TemplateUtils.chunkTransactions(transactions, 8, 22);
            int totalPages = pages.size();

            String accountNumber = formatSbiAccountNumber(record.customerDetails().accountNumber());
            String startDateStr = transactions.isEmpty() ? "1 Feb 2026" : formatSbiDateHeader(transactions.get(0).valueDate());
            String endDateStr = transactions.isEmpty() ? "26 Aug 2026" : formatSbiDateHeader(transactions.get(transactions.size() - 1).valueDate());

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
                            .setFontSize(12.0f).setMarginTop(20f).setMarginBottom(10f));
                }

                doc.add(buildLedgerTable(pages.get(pageIdx)));

                if (isLastPage) {
                    doc.add(new Paragraph("Please do not share your ATM, Debit/Credit card number, PIN "
                            + "(Personal Identification Number) and OTP (One Time Password) with anyone over "
                            + "mail, SMS, phone call or any other media. Bank never asks for such information.")
                            .setFontSize(9.0f).setMarginTop(16f).setMultipliedLeading(1.2f));
                    doc.add(new Paragraph("**This is a computer generated statement and does not require a signature.")
                            .setFontSize(9.0f).setMarginTop(8f));
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
            logo.setWidth(173.0f);
            logo.setHeight(54.0f);
            logo.setMarginBottom(2f);
            return logo;
        } catch (Exception e) {
            return null;
        }
    }

    private Table buildDossier(StatementRecord record, String accountNumber, String startDateStr, String endDateStr) {
        Table table = new Table(UnitValue.createPointArray(new float[]{124f, 4f, 395f})).useAllAvailableWidth();
        table.setFontSize(9.0f);
        table.setMarginBottom(0);

        addDossierRow(table, "Account Name", record.customerDetails().accountHolderName() != null ? record.customerDetails().accountHolderName() : "");
        addAddressRow(table, record.customerDetails().address());
        addDossierRow(table, "Date", endDateStr);
        addDossierRow(table, "Account Number", accountNumber);
        addDossierRow(table, "Account Description", record.accountInfo().accountType() != null && !record.accountInfo().accountType().isBlank()
                ? record.accountInfo().accountType().toUpperCase()
                : "REGULAR SAVINGS BANK ACCOUNT");
        addDossierRow(table, "Branch", record.branchDetails().branchName() != null ? record.branchDetails().branchName() : "317");
        addDossierRow(table, "Drawing Power", "0.00");
        addDossierRow(table, "Interest Rate(% p.a.)", String.valueOf(record.accountInfo().interestRate()));
        addDossierRow(table, "MOD Balance", "0.00");
        addDossierRow(table, "CIF No.", record.customerDetails().cifNumber() != null ? record.customerDetails().cifNumber() : "");
        addDossierRow(table, "CKYCR Number", maskCkycr(record.branchDetails().ckycrNumber()));
        addDossierRow(table, "IFS Code", record.branchDetails().ifscCode() != null ? record.branchDetails().ifscCode() : "SBIN0000317");
        addDossierSpanRow(table, "(Indian Financial System)");
        addDossierRow(table, "MICR Code", record.branchDetails().micrCode() != null ? record.branchDetails().micrCode() : "466002002");
        addDossierSpanRow(table, "(Magnetic Ink Character Recognition)");
        addDossierRow(table, "Nomination Registered", isNominationRegistered(record.customerDetails().nomineeName()) ? "No" : "No");
        addDossierRow(table, "Balance as on " + startDateStr.replace(" ", "\u00A0"), TemplateUtils.formatCurrency(record.accountInfo().openingBalance()));

        return table;
    }

    private void addDossierRow(Table table, String label, String value) {
        table.addCell(new Cell().add(new Paragraph(label == null ? "" : label).setFontSize(9.0f).setMultipliedLeading(1.25f)).setBorder(null).setPadding(0.5f));
        table.addCell(new Cell().add(new Paragraph(":").setFontSize(9.0f).setMultipliedLeading(1.25f)).setBorder(null).setPadding(0.5f));
        table.addCell(new Cell().add(new Paragraph(value == null ? "" : value).setFontSize(9.0f).setMultipliedLeading(1.25f)).setBorder(null).setPadding(0.5f).setPaddingLeft(0.5f));
    }

    private void addAddressRow(Table table, String address) {
        String cleanAddress = (address != null ? address : "").replaceAll("[\\r\\n]+", " ").replaceAll("\\s+", " ").trim();
        table.addCell(new Cell().add(new Paragraph("Address").setFontSize(9.0f).setMultipliedLeading(1.25f)).setBorder(null).setPadding(0.5f));
        table.addCell(new Cell().add(new Paragraph(":").setFontSize(9.0f).setMultipliedLeading(1.25f)).setBorder(null).setPadding(0.5f));
        table.addCell(new Cell().add(new Paragraph(cleanAddress + "\n\n\n\n").setFontSize(9.0f).setMultipliedLeading(1.25f)).setBorder(null).setPadding(0.5f).setPaddingLeft(0.5f));
    }

    private void addDossierSpanRow(Table table, String note) {
        table.addCell(new Cell(1, 3).add(new Paragraph(note).setFontSize(9.0f).setMultipliedLeading(1.1f)).setBorder(null).setPadding(0).setPaddingLeft(0.5f));
    }

    private String maskCkycr(String ckycr) {
        String digits = (ckycr == null ? "1234" : ckycr).replaceAll("\\D", "");
        String last4 = digits.length() >= 4 ? digits.substring(digits.length() - 4) : "35104";
        return "XXXXXXXXXX" + last4;
    }

    private boolean isNominationRegistered(String nomineeName) {
        return nomineeName != null && !nomineeName.isBlank() && !nomineeName.toLowerCase().contains("no");
    }

    private Table buildLedgerTable(List<Transaction> pageTxs) {
        // Column widths Total 523pt:
        // Txn Date (70pt), Value Date (56pt), Description (118pt), Ref No (78pt), Debit (67pt), Credit (67pt), Balance (67pt)
        Table table = new Table(UnitValue.createPointArray(new float[]{70f, 56f, 118f, 78f, 67f, 67f, 67f})).useAllAvailableWidth();
        table.setFontSize(9.0f);

        table.addHeaderCell(headerCell("Txn Date", TextAlignment.LEFT));
        table.addHeaderCell(headerCell("Value\nDate", TextAlignment.LEFT));
        table.addHeaderCell(headerCell("Description", TextAlignment.LEFT, 10.0f));
        table.addHeaderCell(headerCell("Ref\u00A0No./Cheque\nNo.", TextAlignment.LEFT));
        table.addHeaderCell(headerCell("Debit", TextAlignment.RIGHT));
        table.addHeaderCell(headerCell("Credit", TextAlignment.RIGHT));
        table.addHeaderCell(headerCell("Balance", TextAlignment.RIGHT));

        for (Transaction tx : pageTxs) {
            String description = buildDescription(tx);
            String refLine = buildRefLine(tx);

            table.addCell(sbi2DateCell(formatSbiDate(tx.valueDate()), TextAlignment.LEFT));
            table.addCell(sbi2DateCell(formatSbiDate(tx.postDate()), TextAlignment.LEFT));
            table.addCell(sbi2Cell(description, TextAlignment.LEFT));
            table.addCell(sbi2Cell(refLine, TextAlignment.LEFT));
            table.addCell(sbi2AmountCell(tx.debit() != null ? TemplateUtils.formatCurrency(tx.debit()) : "", TextAlignment.RIGHT));
            table.addCell(sbi2AmountCell(tx.credit() != null ? TemplateUtils.formatCurrency(tx.credit()) : "", TextAlignment.RIGHT));
            table.addCell(sbi2AmountCell(TemplateUtils.formatCurrency(tx.balance()), TextAlignment.RIGHT));
        }
        return table;
    }

    private Cell headerCell(String text, TextAlignment alignment) {
        return headerCell(text, alignment, 10.0f);
    }

    private Cell headerCell(String text, TextAlignment alignment, float fontSize) {
        com.itextpdf.layout.element.Text t = new com.itextpdf.layout.element.Text(text)
                .setFontSize(fontSize)
                .setBold()
                .setStrokeWidth(0.25f)
                .setTextRenderingMode(com.itextpdf.kernel.pdf.canvas.PdfCanvasConstants.TextRenderingMode.FILL_STROKE);

        return new Cell().add(new Paragraph().add(t).setMultipliedLeading(0.92f))
                .setBorder(new SolidBorder(0.5f))
                .setPadding(1.0f)
                .setPaddingTop(5.0f)
                .setPaddingBottom(2.0f)
                .setTextAlignment(alignment);
    }

    private String buildDescription(Transaction tx) {
        boolean isCredit = tx.credit() != null;
        String details = tx.details() != null ? tx.details() : "";
        if (isCredit && details.contains("INTEREST")) {
            return "CREDIT INTEREST--";
        }
        if (details.startsWith("ATM") || details.startsWith("POS") || details.startsWith("NETC")) {
            return insertBreakPoints(details);
        }

        String prefix = isCredit ? "BY\u00A0TRANSFER-\n" : "TO\u00A0TRANSFER-\n";
        String clean = details;
        if (clean.startsWith("BY TRANSFER-") || clean.startsWith("TO TRANSFER-")) {
            clean = clean.substring(12).trim();
        } else if (clean.startsWith("BY TRANSFER -") || clean.startsWith("TO TRANSFER -")) {
            clean = clean.substring(13).trim();
        } else if (clean.startsWith("BY TRANSFER") || clean.startsWith("TO TRANSFER")) {
            clean = clean.substring(11).trim();
        }

        return prefix + insertBreakPoints(clean);
    }

    private String insertBreakPoints(String str) {
        if (str == null) return "";
        StringBuilder sb = new StringBuilder();
        int lineLength = 0;
        int consecutive = 0;
        for (int i = 0; i < str.length(); i++) {
            char c = str.charAt(i);
            if (c == '\n') {
                sb.append(c);
                lineLength = 0;
                consecutive = 0;
                continue;
            }

            if (lineLength >= 24) {
                sb.append('\n');
                lineLength = 0;
                consecutive = 0;
                if (Character.isWhitespace(c)) {
                    continue;
                }
            }

            sb.append(c);
            lineLength++;

            if (c == '/' || c == '*' || c == '-' || c == '@' || c == '.' || c == '_' || c == ':') {
                sb.append('\u200B');
                consecutive = 0;
            } else if (Character.isWhitespace(c)) {
                consecutive = 0;
            } else {
                consecutive++;
                if (consecutive >= 7) {
                    sb.append('\u200B');
                    consecutive = 0;
                }
            }
        }
        return sb.toString();
    }

    private String buildRefLine(Transaction tx) {
        if (tx.credit() != null && tx.details() != null && tx.details().contains("INTEREST")) {
            return "";
        }
        String rNum = tx.refNo() != null && !tx.refNo().isBlank() ? tx.refNo() : "2567877902099";
        if (rNum.length() < 13 && rNum.matches("\\d+")) {
            rNum = rNum + "1234567890123".substring(0, 13 - rNum.length());
        }
        String d = tx.details() != null ? tx.details() : "";
        if (d.startsWith("ATM") || d.startsWith("POS") || d.startsWith("NETC")) {
            return rNum;
        }
        if (tx.credit() != null) {
            return "TRANSFER\nFROM\n" + rNum;
        } else {
            return "TRANSFER TO\n" + rNum;
        }
    }

    private Cell sbi2DateCell(String text, TextAlignment alignment) {
        return new Cell().add(new Paragraph(text == null ? "" : text).setFontSize(9.0f).setMultipliedLeading(1.05f))
                .setBorder(new SolidBorder(0.5f))
                .setPadding(1.5f)
                .setPaddingLeft(2.0f)
                .setPaddingRight(1.5f)
                .setTextAlignment(alignment);
    }

    private Cell sbi2Cell(String text, TextAlignment alignment) {
        return new Cell().add(new Paragraph(text == null ? "" : text).setFontSize(9.0f).setMultipliedLeading(0.82f))
                .setBorder(new SolidBorder(0.5f))
                .setPadding(1.2f)
                .setPaddingLeft(2.0f)
                .setPaddingRight(2.0f)
                .setTextAlignment(alignment);
    }

    private Cell sbi2AmountCell(String text, TextAlignment alignment) {
        return new Cell().add(new Paragraph(text == null ? "" : text).setFontSize(9.0f).setMultipliedLeading(1.05f))
                .setBorder(new SolidBorder(0.5f))
                .setPadding(1.5f)
                .setPaddingLeft(2.0f)
                .setPaddingRight(3.0f)
                .setTextAlignment(alignment);
    }

    private String formatSbiDateHeader(String dateStr) {
        if (dateStr == null || dateStr.isBlank()) return "";
        String formatted = formatSbiDate(dateStr);
        return formatted.replace("\n", " ").replace("\u00A0", " ");
    }

    private String formatSbiDate(String dateStr) {
        if (dateStr == null || dateStr.isBlank()) return "";
        String raw = dateStr.trim();

        String[] parts = raw.split("[-/ ]");
        if (parts.length == 3) {
            int day, month, year;
            try {
                if (parts[0].length() == 4) {
                    year = Integer.parseInt(parts[0]);
                    month = Integer.parseInt(parts[1]) - 1;
                    day = Integer.parseInt(parts[2]);
                } else if (parts[1].matches(".*[a-zA-Z].*")) {
                    day = Integer.parseInt(parts[0]);
                    month = findMonthIndex(parts[1]);
                    year = Integer.parseInt(parts[2]);
                } else {
                    day = Integer.parseInt(parts[0]);
                    month = Integer.parseInt(parts[1]) - 1;
                    year = Integer.parseInt(parts[2]);
                }
                if (month >= 0 && month < 12) {
                    if (day >= 10) {
                        return String.format("%d\u00A0%s\n%04d", day, MONTHS[month], year);
                    } else {
                        return String.format("%d\u00A0%s\u00A0%04d", day, MONTHS[month], year);
                    }
                }
            } catch (Exception ignored) {}
        }
        return raw;
    }

    private int findMonthIndex(String m) {
        for (int i = 0; i < MONTHS.length; i++) {
            if (MONTHS[i].equalsIgnoreCase(m) || m.toLowerCase().startsWith(MONTHS[i].toLowerCase())) {
                return i;
            }
        }
        return 0;
    }

    private String formatSbiAccountNumber(String accNo) {
        String raw = (accNo == null || accNo.isBlank() ? "30521458920" : accNo).trim();
        if (raw.length() < 17 && raw.matches("\\d+")) {
            return "0".repeat(17 - raw.length()) + raw;
        }
        return raw;
    }
}
