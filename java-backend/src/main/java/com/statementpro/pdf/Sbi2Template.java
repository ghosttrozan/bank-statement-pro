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
import com.itextpdf.kernel.pdf.extgstate.PdfExtGState;
import com.itextpdf.layout.Document;
import com.itextpdf.layout.element.AreaBreak;
import com.itextpdf.layout.element.Cell;
import com.itextpdf.layout.element.Div;
import com.itextpdf.layout.element.Image;
import com.itextpdf.layout.element.Paragraph;
import com.itextpdf.layout.element.Table;
import com.itextpdf.layout.properties.AreaBreakType;
import com.itextpdf.layout.properties.TextAlignment;
import com.itextpdf.layout.properties.UnitValue;
import com.itextpdf.layout.properties.VerticalAlignment;
import com.statementpro.model.StatementRecord;
import com.statementpro.model.Transaction;

import java.io.ByteArrayOutputStream;
import java.io.InputStream;
import java.util.ArrayList;
import java.util.List;

public class Sbi2Template implements StatementTemplate {

    private static final String[] MONTHS = {"Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"};

    /**
     * Pre-built data for one transaction row: formatted strings + estimated height.
     * Computed once during Phase 1 so they are not recomputed during rendering.
     */
    private record TxRowData(
            Transaction tx,
            String txnDate,
            String valueDate,
            String description,
            String refLine,
            float  estimatedHeight
    ) {}

    @Override
    public byte[] render(StatementRecord record) throws java.io.IOException {
        return render(record, null);
    }

    public byte[] render(StatementRecord record, WriterProperties writerProperties) throws java.io.IOException {
        ByteArrayOutputStream out = new ByteArrayOutputStream();
        PdfWriter writer = writerProperties != null ? new PdfWriter(out, writerProperties) : new PdfWriter(out);

        // immediateFlush=false: keeps page objects in memory during rendering
        try (PdfDocument pdfDoc = new PdfDocument(writer);
             Document doc = new Document(pdfDoc, PageSize.A4, false)) {

            doc.setMargins(SbiLayout.MARGIN, SbiLayout.MARGIN, SbiLayout.MARGIN, SbiLayout.MARGIN);

            List<Transaction> transactions = record.transactions();
            String accountNumber = formatSbiAccountNumber(record.customerDetails().accountNumber());
            String startDateStr  = transactions.isEmpty() ? "1 Feb 2026"
                    : formatSbiDateHeader(transactions.get(0).valueDate());
            String endDateStr    = transactions.isEmpty() ? "26 Aug 2026"
                    : formatSbiDateHeader(transactions.get(transactions.size() - 1).valueDate());

            // ── Phase 1: Build row data (pre-format text + estimate heights) ────────
            List<TxRowData> rowDataList = buildRowDataList(transactions);

            // ── Phase 2: Split into pages based on height budgets ────────────────────
            List<List<TxRowData>> pages = splitIntoPages(rowDataList);

            // ── Phase 3: Render each page with its own table ─────────────────────────
            Image logo = loadLogo();

            for (int pageIdx = 0; pageIdx < pages.size(); pageIdx++) {
                boolean isFirstPage = pageIdx == 0;
                boolean isLastPage  = pageIdx == pages.size() - 1;

                if (!isFirstPage) {
                    doc.add(new AreaBreak(AreaBreakType.NEXT_PAGE));
                }

                if (isFirstPage) {
                    if (logo != null) doc.add(logo);
                    doc.add(buildDossier(record, accountNumber, startDateStr, endDateStr));
                    doc.add(new Paragraph("Account Statement from " + startDateStr + " to " + endDateStr)
                            .setFontSize(12.0f).setMarginTop(38f).setMarginBottom(27f));
                }

                // Each page gets its own Table with a full header row (natural repeated-header pattern)
                doc.add(buildPageTable(pages.get(pageIdx)));

                if (isLastPage) {
                    doc.add(new Paragraph(
                            "Please do not share your ATM, Debit/Credit card number, PIN "
                            + "(Personal Identification Number) and OTP (One Time Password) with anyone over "
                            + "mail, SMS, phone call or any other media. "
                            + "Bank never asks for such information.")
                            .setFontSize(9.0f).setMarginTop(16f).setMultipliedLeading(1.2f));
                    doc.add(new Paragraph(
                            "**This is a computer generated statement and does not require a signature.")
                            .setFontSize(9.0f).setMarginTop(8f));
                }
            }
        }
        return out.toByteArray();
    }

    // ── Phase 1 ───────────────────────────────────────────────────────────────────

    /**
     * Pre-formats all transaction strings and estimates each row's height.
     * Throws {@link IllegalStateException} if a single row exceeds
     * {@link SbiLayout#MAX_SINGLE_ROW_HEIGHT} — fonts are never silently shrunk.
     */
    private List<TxRowData> buildRowDataList(List<Transaction> transactions) {
        List<TxRowData> result = new ArrayList<>(transactions.size());
        for (Transaction tx : transactions) {
            String txnDate     = formatSbiDate(tx.valueDate());
            String valueDate   = formatSbiDate(tx.postDate());
            String description = buildDescription(tx);
            String refLine     = buildRefLine(tx);

            RowHeightEstimator.Measurement m =
                    RowHeightEstimator.measure(txnDate, valueDate, description, refLine);

            if (m.oversized()) {
                throw new IllegalStateException(
                    "Transaction row exceeds MAX_SINGLE_ROW_HEIGHT (" +
                    SbiLayout.MAX_SINGLE_ROW_HEIGHT + " pt). Estimated: " +
                    String.format("%.1f", m.estimatedHeight()) + " pt. " +
                    "Date=" + tx.valueDate() + ", Desc=" +
                    description.replace("\n", " ").substring(0, Math.min(60, description.length())));
            }
            result.add(new TxRowData(tx, txnDate, valueDate, description, refLine, m.estimatedHeight()));
        }
        return result;
    }

    // ── Phase 2 ───────────────────────────────────────────────────────────────────

    /**
     * Splits row data into per-page buckets:
     * - First page holds exactly 12 rows (or balanced if total < 18)
     * - Continuation pages hold around 25 rows, filling the vertical printable height cleanly.
     */
    private List<List<TxRowData>> splitIntoPages(List<TxRowData> rows) {
        List<List<TxRowData>> pages = new ArrayList<>();
        if (rows == null || rows.isEmpty()) {
            pages.add(new ArrayList<>());
            return pages;
        }

        float pageHeight   = SbiLayout.PAGE_HEIGHT;
        float bottomMargin = SbiLayout.MARGIN;
        float topMargin    = SbiLayout.MARGIN;
        float footerHeight = SbiLayout.FOOTER_RESERVED_HEIGHT;

        int totalRows = rows.size();
        int idx = 0;

        // Page 1: target 11 rows (matching authentic SBI reference) within height budget
        int p1Target;
        if (totalRows <= SbiLayout.FIRST_PAGE_TARGET_ROWS) {
            p1Target = totalRows;
        } else if (totalRows < 18) {
            p1Target = totalRows / 2 + (totalRows % 2);
        } else {
            p1Target = SbiLayout.FIRST_PAGE_TARGET_ROWS;
        }

        List<TxRowData> page1 = new ArrayList<>(p1Target);
        float p1Budget = SbiLayout.FIRST_PAGE_ROW_BUDGET;
        float page1Height = 0f;
        while (idx < totalRows && page1.size() < p1Target) {
            TxRowData r = rows.get(idx);
            if (!page1.isEmpty() && (page1Height + r.estimatedHeight() > p1Budget)) {
                break;
            }
            page1.add(r);
            page1Height += r.estimatedHeight();
            idx++;
        }
        pages.add(page1);

        // Continuation pages: target around 25 rows per page, bounded by physical page height
        float maxContBudget = SbiLayout.CONTINUATION_ROW_BUDGET;

        while (idx < totalRows) {
            List<TxRowData> contPage = new ArrayList<>();
            float pageRowHeight = 0f;

            while (idx < totalRows) {
                TxRowData row = rows.get(idx);
                boolean isLastRow = (idx == totalRows - 1);
                float reservedAtBottom = isLastRow ? footerHeight : 0f;
                float maxAllowed = maxContBudget - reservedAtBottom;

                if (!contPage.isEmpty() && (pageRowHeight + row.estimatedHeight() > maxAllowed)) {
                    break;
                }

                contPage.add(row);
                pageRowHeight += row.estimatedHeight();
                idx++;

                if (contPage.size() >= SbiLayout.CONTINUATION_TARGET_ROWS && (totalRows - idx) >= 12) {
                    break;
                }
            }

            pages.add(contPage);
        }

        // Rebalance trailing page if needed so last page is not a tiny fragment (< 6 rows)
        if (pages.size() >= 3) {
            List<TxRowData> last = pages.get(pages.size() - 1);
            List<TxRowData> pen  = pages.get(pages.size() - 2);
            while (last.size() < 6 && pen.size() > 14) {
                last.add(0, pen.remove(pen.size() - 1));
            }
        }

        return pages;
    }

    // ── Phase 3a: per-page table ──────────────────────────────────────────────────

    /**
     * Builds a complete iText Table for one page with single GridTableRenderer.
     * All boundaries are drawn exactly once with zero duplicate segments.
     */
    private Table buildPageTable(List<TxRowData> rows) {
        Table table = new Table(UnitValue.createPointArray(SbiLayout.LEDGER_COLS)).useAllAvailableWidth();
        table.setFixedLayout();
        table.setFontSize(SbiLayout.FONT_CELL);
        table.setSkipFirstHeader(false);

        // Header row (drawTop=true, drawBottom=true, drawRight=true, drawLeft only on col 0)
        table.addHeaderCell(headerCell("Txn Date",            TextAlignment.LEFT,  true));
        table.addHeaderCell(headerCell("Value\nDate",         TextAlignment.LEFT,  false));
        table.addHeaderCell(headerCell("Description",         TextAlignment.LEFT, SbiLayout.FONT_CELL, false));
        table.addHeaderCell(headerCell("Ref No./Cheque\nNo.", TextAlignment.LEFT,  false));
        table.addHeaderCell(headerCell("Debit",               TextAlignment.RIGHT, false));
        table.addHeaderCell(headerCell("Credit",              TextAlignment.RIGHT, false));
        table.addHeaderCell(headerCell("Balance",             TextAlignment.RIGHT, false));

        // Data rows (drawTop=false, drawBottom=true, drawRight=true, drawLeft only on col 0)
        for (TxRowData row : rows) {
            table.addCell(sbi2DateCell(row.txnDate(),        TextAlignment.LEFT,  true));
            table.addCell(sbi2DateCell(row.valueDate(),      TextAlignment.LEFT,  false));
            table.addCell(sbi2Cell(row.description(),        TextAlignment.LEFT,  false));
            table.addCell(sbi2Cell(row.refLine(),            TextAlignment.LEFT,  false));
            table.addCell(sbi2AmountCell(row.tx().debit(),   TextAlignment.RIGHT, false));
            table.addCell(sbi2AmountCell(row.tx().credit(),  TextAlignment.RIGHT, false));
            table.addCell(sbi2AmountCell(row.tx().balance(), TextAlignment.RIGHT, false));
        }
        return table;
    }

    private Image loadLogo() {
        try (InputStream in = getClass().getResourceAsStream("/logos/sbi2-logo.png")) {
            if (in == null) return null;
            byte[] logoBytes = in.readAllBytes();
            Image logo = new Image(ImageDataFactory.create(logoBytes));
            logo.setWidth(181.5f);
            logo.setHeight(54.0f);
            logo.setMarginBottom(6f);
            return logo;
        } catch (Exception e) {
            return null;
        }
    }

    private Div buildDossier(StatementRecord record, String accountNumber, String startDateStr, String endDateStr) {
        Div dossier = new Div();
        dossier.setMarginBottom(0);

        dossier.add(dossierLine("Account Name", record.customerDetails().accountHolderName() != null ? record.customerDetails().accountHolderName() : ""));
        dossier.add(dossierAddressLine(record.customerDetails().address()));
        dossier.add(dossierLine("Date", endDateStr));
        dossier.add(dossierLine("Account Number", accountNumber));
        dossier.add(dossierLine("Account Description", record.accountInfo().accountType() != null && !record.accountInfo().accountType().isBlank()
                ? record.accountInfo().accountType().toUpperCase()
                : "REGULAR SAVINGS BANK ACCOUNT"));
        dossier.add(dossierLine("Branch", record.branchDetails().branchName() != null ? record.branchDetails().branchName() : "317"));
        dossier.add(dossierLine("Drawing Power", "0.00"));
        dossier.add(dossierLine("Interest Rate(% p.a.)", String.valueOf(record.accountInfo().interestRate())));
        dossier.add(dossierLine("MOD Balance", "0.00"));
        dossier.add(dossierLine("CIF No.", record.customerDetails().cifNumber() != null ? record.customerDetails().cifNumber() : ""));
        dossier.add(dossierLine("CKYCR Number", maskCkycr(record.branchDetails().ckycrNumber())));
        dossier.add(dossierLine("IFS Code", record.branchDetails().ifscCode() != null ? record.branchDetails().ifscCode() : "SBIN0000317"));
        dossier.add(new Paragraph("(Indian Financial System)").setFontSize(SbiLayout.FONT_DOSSIER).setMultipliedLeading(1.15f).setMargin(0).setMarginTop(1.0f).setMarginBottom(1.0f));
        dossier.add(dossierLine("MICR Code", record.branchDetails().micrCode() != null ? record.branchDetails().micrCode() : "466002002"));
        dossier.add(new Paragraph("(Magnetic Ink Character Recognition)").setFontSize(SbiLayout.FONT_DOSSIER).setMultipliedLeading(1.15f).setMargin(0).setMarginTop(1.0f).setMarginBottom(1.0f));
        dossier.add(dossierLine("Nomination Registered", isNominationRegistered(record.customerDetails().nomineeName()) ? "No" : "No"));
        dossier.add(dossierLine("Balance as on " + startDateStr, TemplateUtils.formatCurrency(record.accountInfo().openingBalance())));

        return dossier;
    }

    private Paragraph dossierLine(String label, String value) {
        float targetX = 106.0f;
        float labelWidth = 0f;
        try {
            labelWidth = PdfFontFactory.createFont(StandardFonts.HELVETICA).getWidth(label, SbiLayout.FONT_DOSSIER);
        } catch (Exception ignored) {}
        float needed = Math.max(0, targetX - labelWidth);
        int spaces = Math.max(1, Math.round(needed / 2.5f));
        String text = label + " ".repeat(spaces) + ": " + (value == null ? "" : value);
        return new Paragraph(text)
                .setFontSize(SbiLayout.FONT_DOSSIER)
                .setMultipliedLeading(1.15f)
                .setMargin(0)
                .setMarginTop(1.0f)
                .setMarginBottom(1.0f);
    }

    private Paragraph dossierAddressLine(String address) {
        String cleanAddress = (address != null ? address : "").replaceAll("[\\r\\n]+", " ").replaceAll("\\s+", " ").trim();
        float targetX = 106.0f;
        float labelWidth = 0f;
        try {
            labelWidth = PdfFontFactory.createFont(StandardFonts.HELVETICA).getWidth("Address", SbiLayout.FONT_DOSSIER);
        } catch (Exception ignored) {}
        float needed = Math.max(0, targetX - labelWidth);
        int spaces = Math.max(1, Math.round(needed / 2.5f));

        String prefix = "Address" + " ".repeat(spaces) + ": ";
        float prefixWidth = 0f;
        try {
            prefixWidth = PdfFontFactory.createFont(StandardFonts.HELVETICA).getWidth(prefix, SbiLayout.FONT_DOSSIER);
        } catch (Exception ignored) {}

        float maxValWidth = SbiLayout.USABLE_WIDTH - prefixWidth;
        float hScale = 1.0f;
        try {
            float textWidth = PdfFontFactory.createFont(StandardFonts.HELVETICA).getWidth(cleanAddress, SbiLayout.FONT_DOSSIER);
            if (textWidth > maxValWidth) {
                hScale = (maxValWidth / textWidth) * 0.98f;
            }
        } catch (Exception ignored) {}

        if (hScale < 1.0f) {
            String full = prefix + cleanAddress;
            return new Paragraph(new com.itextpdf.layout.element.Text(full).setHorizontalScaling(hScale))
                    .setFontSize(SbiLayout.FONT_DOSSIER)
                    .setMultipliedLeading(1.15f)
                    .setMargin(0)
                    .setMarginTop(1.0f)
                    .setMarginBottom(1.0f);
        } else {
            return new Paragraph(prefix + cleanAddress)
                    .setFontSize(SbiLayout.FONT_DOSSIER)
                    .setMultipliedLeading(1.15f)
                    .setMargin(0)
                    .setMarginTop(1.0f)
                    .setMarginBottom(1.0f);
        }
    }

    private String maskCkycr(String ckycr) {
        String digits = (ckycr == null ? "1234" : ckycr).replaceAll("\\D", "");
        String last4 = digits.length() >= 4 ? digits.substring(digits.length() - 4) : "35104";
        return "XXXXXXXXXX" + last4;
    }

    private boolean isNominationRegistered(String nomineeName) {
        return nomineeName != null && !nomineeName.isBlank() && !nomineeName.toLowerCase().contains("no");
    }

    // ── Kept for internal reference — actual rendering now uses buildPageTable(List<TxRowData>) ─
    // This method is intentionally removed; callers now go through the 4-phase render() pipeline.
    // buildPageTable() is the new name for per-page table construction.

    private Cell headerCell(String text, TextAlignment alignment, boolean drawLeft) {
        return headerCell(text, alignment, SbiLayout.FONT_CELL, drawLeft);
    }

    private Cell headerCell(String text, TextAlignment alignment, float fontSize, boolean drawLeft) {
        Paragraph p = new Paragraph(text).setFontSize(fontSize).setMultipliedLeading(0.95f);
        try {
            p.setFont(PdfFontFactory.createFont(StandardFonts.HELVETICA_BOLD));
        } catch (Exception ignored) {}
        Cell c = new Cell()
                .add(p)
                .setBorder(null)
                .setVerticalAlignment(VerticalAlignment.TOP)
                .setPadding(SbiLayout.CELL_PADDING)
                .setPaddingTop(SbiLayout.HEADER_PADDING_TOP)
                .setPaddingBottom(SbiLayout.HEADER_PADDING_BOT)
                .setTextAlignment(alignment);
        // Header row draws: top=true, bottom=true, right=true, left=drawLeft
        c.setNextRenderer(new CustomBorderCellRenderer(c, SbiLayout.BORDER_WIDTH, new DeviceRgb(0, 0, 0),
                true, true, true, drawLeft));
        return c;
    }

    private String buildDescription(Transaction tx) {
        boolean isCredit = tx.credit() != null;
        String details = tx.details() != null ? tx.details() : "";
        if (isCredit && details.contains("INTEREST")) {
            return "CREDIT INTEREST--";
        }
        if (details.startsWith("ATM") || details.startsWith("POS") || details.startsWith("NETC")) {
            return cleanDescription(details);
        }

        String prefix = isCredit ? "BY TRANSFER-\n" : "TO TRANSFER-\n";
        String clean = details;
        if (clean.startsWith("BY TRANSFER-") || clean.startsWith("TO TRANSFER-")) {
            clean = clean.substring(12).trim();
        } else if (clean.startsWith("BY TRANSFER -") || clean.startsWith("TO TRANSFER -")) {
            clean = clean.substring(13).trim();
        } else if (clean.startsWith("BY TRANSFER") || clean.startsWith("TO TRANSFER")) {
            clean = clean.substring(11).trim();
        }

        return prefix + cleanDescription(clean);
    }

    /**
     * Clean description wrapping matching authentic SBI statement (Image 1):
     * Never splits whole English words like 'CONSULTANCY'.
     * Keeps words together, breaking at spaces or natural banking punctuation (/, *, @, -)
     * so that each segment fits within the 138 pt description column (~24 chars).
     */
    private String cleanDescription(String str) {
        if (str == null || str.isBlank()) return "";
        final int maxLen = 24;
        StringBuilder result = new StringBuilder();

        for (String line : str.split("\n", -1)) {
            if (result.length() > 0) result.append("\n");
            if (line.length() <= maxLen) {
                result.append(line);
                continue;
            }

            StringBuilder cur = new StringBuilder();
            String[] words = line.split(" ");
            for (String w : words) {
                if (w.length() <= maxLen) {
                    if (cur.length() == 0) {
                        cur.append(w);
                    } else if (cur.length() + 1 + w.length() <= maxLen) {
                        cur.append(" ").append(w);
                    } else {
                        result.append(cur).append("\n");
                        cur.setLength(0);
                        cur.append(w);
                    }
                } else {
                    String token = w;
                    while (token.length() > maxLen) {
                        int bp = -1;
                        for (int p = Math.min(maxLen, token.length() - 1); p > 0; p--) {
                            char ch = token.charAt(p);
                            if (ch == '/' || ch == '*' || ch == '@' || ch == '-') {
                                bp = p + 1;
                                break;
                            }
                        }
                        if (bp == -1) bp = maxLen;
                        if (cur.length() > 0) {
                            result.append(cur).append("\n");
                            cur.setLength(0);
                        }
                        result.append(token, 0, bp).append("\n");
                        token = token.substring(bp);
                    }
                    if (!token.isEmpty()) {
                        cur.append(token);
                    }
                }
            }
            if (cur.length() > 0) {
                result.append(cur);
            }
        }
        return result.toString();
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

    private Cell sbi2DateCell(String text, TextAlignment alignment, boolean drawLeft) {
        Cell c = new Cell()
                .setBorder(null)
                .setVerticalAlignment(VerticalAlignment.TOP)
                .setPadding(1.0f)
                .setPaddingLeft(1.2f)
                .setPaddingRight(0.8f)
                .setTextAlignment(alignment);
        if (text != null && !text.isEmpty()) {
            c.add(new Paragraph(text).setFontSize(SbiLayout.FONT_CELL).setMultipliedLeading(1.05f));
        }
        // Data rows draw: top=false (shared with previous row bottom), bottom=true, right=true, left=drawLeft
        c.setNextRenderer(new CustomBorderCellRenderer(c, SbiLayout.BORDER_WIDTH, new DeviceRgb(0, 0, 0),
                false, true, true, drawLeft));
        return c;
    }

    private Cell sbi2Cell(String text, TextAlignment alignment, boolean drawLeft) {
        Cell c = new Cell()
                .setBorder(null)
                .setVerticalAlignment(VerticalAlignment.TOP)
                .setPadding(1.2f)
                .setPaddingLeft(SbiLayout.CELL_PADDING_LEFT)
                .setPaddingRight(SbiLayout.CELL_PADDING_LEFT)
                .setTextAlignment(alignment);
        if (text != null && !text.isEmpty()) {
            c.add(new Paragraph(text).setFontSize(SbiLayout.FONT_CELL).setMultipliedLeading(0.82f));
        }
        c.setNextRenderer(new CustomBorderCellRenderer(c, SbiLayout.BORDER_WIDTH, new DeviceRgb(0, 0, 0),
                false, true, true, drawLeft));
        return c;
    }

    /**
     * Amount cell — accepts a raw Double (not pre-formatted String) so that:
     *   - null  → cell is geometrically preserved but NO text operation is emitted
     *   - value → formatted amount is drawn
     */
    private Cell sbi2AmountCell(Double amount, TextAlignment alignment, boolean drawLeft) {
        Cell c = new Cell()
                .setBorder(null)
                .setVerticalAlignment(VerticalAlignment.TOP)
                .setPadding(SbiLayout.CELL_PADDING)
                .setPaddingLeft(SbiLayout.CELL_PADDING_LEFT)
                .setPaddingRight(SbiLayout.CELL_PADDING_RIGHT)
                .setTextAlignment(alignment);
        if (amount != null) {
            c.add(new Paragraph(TemplateUtils.formatCurrency(amount)).setFontSize(SbiLayout.FONT_CELL).setMultipliedLeading(1.05f));
        }
        c.setNextRenderer(new CustomBorderCellRenderer(c, SbiLayout.BORDER_WIDTH, new DeviceRgb(0, 0, 0),
                false, true, true, drawLeft));
        return c;
    }

    private String formatSbiDateHeader(String dateStr) {
        if (dateStr == null || dateStr.isBlank()) return "";
        return formatSbiDate(dateStr).trim();
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
                    return String.format("%d %s %04d ", day, MONTHS[month], year);
                }
            } catch (Exception ignored) {}
        }
        return raw + " ";
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
