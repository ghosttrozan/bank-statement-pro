package com.statementpro.pdf;

import com.itextpdf.kernel.colors.DeviceRgb;
import com.itextpdf.kernel.geom.PageSize;
import com.itextpdf.kernel.pdf.PdfDocument;
import com.itextpdf.kernel.pdf.PdfWriter;
import com.itextpdf.kernel.pdf.WriterProperties;
import com.itextpdf.layout.Document;
import com.itextpdf.layout.borders.SolidBorder;
import com.itextpdf.layout.element.AreaBreak;
import com.itextpdf.layout.element.Cell;
import com.itextpdf.layout.element.Paragraph;
import com.itextpdf.layout.element.Table;
import com.itextpdf.layout.properties.TextAlignment;
import com.itextpdf.layout.properties.UnitValue;
import com.statementpro.model.StatementRecord;
import com.statementpro.model.Transaction;

import java.awt.Color;
import java.io.ByteArrayOutputStream;
import java.util.List;

public class StandardBankTemplate implements StatementTemplate {

    @Override
    public byte[] render(StatementRecord record) throws java.io.IOException {
        return render(record, null);
    }

    public byte[] render(StatementRecord record, WriterProperties writerProperties) throws java.io.IOException {
        BankTheme theme = BankTheme.forStyle(record.settings().bankStyle());
        DeviceRgb primaryColor = hexToRgb(theme.primaryColorHex());

        ByteArrayOutputStream out = new ByteArrayOutputStream();
        PdfWriter writer = writerProperties != null ? new PdfWriter(out, writerProperties) : new PdfWriter(out);
        try (PdfDocument pdfDoc = new PdfDocument(writer);
             Document doc = new Document(pdfDoc, PageSize.A4)) {

            pdfDoc.getDocumentInfo()
                    .setAuthor(theme.headerTitle())
                    .setCreator(theme.headerTitle() + " Automated Core Banking System")
                    .setTitle(theme.headerTitle() + " - Statement");

            List<List<Transaction>> pages = TemplateUtils.chunkTransactions(record.transactions(), 8, 20);
            int totalPages = pages.size();

            for (int pageIdx = 0; pageIdx < totalPages; pageIdx++) {
                boolean isFirstPage = pageIdx == 0;
                boolean isLastPage = pageIdx == totalPages - 1;

                doc.add(buildHeader(theme, primaryColor, pageIdx + 1, totalPages));
                if (isFirstPage) {
                    doc.add(buildCustomerDossier(record, primaryColor));
                }
                doc.add(buildTransactionsTable(pages.get(pageIdx), primaryColor));
                if (isLastPage) {
                    doc.add(buildSummaryFooter(record, primaryColor));
                }
                if (!isLastPage) {
                    doc.add(new AreaBreak());
                }
            }
        }
        return out.toByteArray();
    }

    private Table buildHeader(BankTheme theme, DeviceRgb primaryColor, int pageNum, int totalPages) {
        Table header = new Table(UnitValue.createPercentArray(new float[]{3, 1})).useAllAvailableWidth();
        Cell titleCell = new Cell().add(new Paragraph(theme.headerTitle()).setBold().setFontSize(16).setFontColor(primaryColor))
                .add(new Paragraph(theme.bankTagline()).setFontSize(9))
                .setBorder(null);
        Cell pageCell = new Cell().add(new Paragraph("Page " + pageNum + " of " + totalPages).setFontSize(8))
                .setTextAlignment(TextAlignment.RIGHT).setBorder(null);
        header.addCell(titleCell);
        header.addCell(pageCell);
        return header;
    }

    private Table buildCustomerDossier(StatementRecord record, DeviceRgb primaryColor) {
        Table dossier = new Table(UnitValue.createPercentArray(new float[]{1, 1})).useAllAvailableWidth();
        dossier.addCell(infoCell("Name", record.customerDetails().accountHolderName(), primaryColor));
        dossier.addCell(infoCell("Branch", record.branchDetails().branchName(), primaryColor));
        dossier.addCell(infoCell("Account No", record.customerDetails().accountNumber(), primaryColor));
        dossier.addCell(infoCell("IFSC Code", record.branchDetails().ifscCode(), primaryColor));
        dossier.addCell(infoCell("CIF No", record.customerDetails().cifNumber(), primaryColor));
        dossier.addCell(infoCell("Opening Balance", "Rs " + TemplateUtils.formatCurrency(record.accountInfo().openingBalance()), primaryColor));
        return dossier;
    }

    private Cell infoCell(String label, String value, DeviceRgb primaryColor) {
        return new Cell().add(new Paragraph(label + ": " + (value == null ? "N/A" : value)).setFontSize(9)).setBorder(null);
    }

    private Table buildTransactionsTable(List<Transaction> pageTxs, DeviceRgb primaryColor) {
        Table table = new Table(UnitValue.createPercentArray(new float[]{12, 44, 14, 10, 10, 10})).useAllAvailableWidth();
        for (String colHeader : new String[]{"Txn Date", "Transaction Details", "Ref / Chq No", "Debit (Dr)", "Credit (Cr)", "Balance"}) {
            table.addHeaderCell(new Cell().add(new Paragraph(colHeader).setFontSize(9).setBold())
                    .setBackgroundColor(primaryColor).setFontColor(new DeviceRgb(255, 255, 255)));
        }
        for (Transaction tx : pageTxs) {
            table.addCell(cell(tx.valueDate()));
            table.addCell(cell(tx.details()));
            table.addCell(cell(tx.refNo() == null ? "-" : tx.refNo()));
            table.addCell(cellRight(tx.debit() != null ? TemplateUtils.formatCurrency(tx.debit()) : ""));
            table.addCell(cellRight(tx.credit() != null ? TemplateUtils.formatCurrency(tx.credit()) : ""));
            table.addCell(cellRight(TemplateUtils.formatCurrency(tx.balance())));
        }
        return table;
    }

    private Cell cell(String text) {
        return new Cell().add(new Paragraph(text == null ? "" : text).setFontSize(8))
                .setBorder(new SolidBorder(new DeviceRgb(226, 232, 240), 0.5f));
    }

    private Cell cellRight(String text) {
        return cell(text).setTextAlignment(TextAlignment.RIGHT);
    }

    private Table buildSummaryFooter(StatementRecord record, DeviceRgb primaryColor) {
        Table summary = new Table(UnitValue.createPercentArray(new float[]{1, 1, 1, 1})).useAllAvailableWidth();
        summary.addCell(summaryCell("Total Debits (" + record.drCount() + ")", TemplateUtils.formatCurrency(record.totalDebits())));
        summary.addCell(summaryCell("Total Credits (" + record.crCount() + ")", TemplateUtils.formatCurrency(record.totalCredits())));
        summary.addCell(summaryCell("Opening Balance", TemplateUtils.formatCurrency(record.accountInfo().openingBalance())));
        summary.addCell(summaryCell("Closing Balance", TemplateUtils.formatCurrency(record.closingBalance())));
        return summary;
    }

    private Cell summaryCell(String label, String value) {
        return new Cell().add(new Paragraph(label).setFontSize(8))
                .add(new Paragraph("Rs " + value).setBold().setFontSize(11)).setBorder(null);
    }

    private DeviceRgb hexToRgb(String hex) {
        Color c = Color.decode(hex);
        return new DeviceRgb(c.getRed(), c.getGreen(), c.getBlue());
    }
}
