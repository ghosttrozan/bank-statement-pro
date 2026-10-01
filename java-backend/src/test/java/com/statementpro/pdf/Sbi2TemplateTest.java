package com.statementpro.pdf;

import com.statementpro.engine.TransactionEngine;
import com.statementpro.model.*;
import com.itextpdf.kernel.pdf.PdfDocument;
import com.itextpdf.kernel.pdf.PdfReader;
import com.itextpdf.kernel.pdf.canvas.parser.PdfTextExtractor;
import com.itextpdf.kernel.pdf.canvas.parser.listener.LocationTextExtractionStrategy;
import org.junit.jupiter.api.Test;

import java.io.ByteArrayInputStream;
import java.util.ArrayList;
import java.util.List;

import static org.junit.jupiter.api.Assertions.*;

class Sbi2TemplateTest {

    private StatementRecord sampleRecord() {
        CustomerDetails customer = new CustomerDetails("Test User", "t@test.com", "MG Road, Bangalore",
                "1234567890", "CIF001", "2020-01-01", "None", null, null);
        BranchDetails branch = new BranchDetails("Bangalore Main", "MG Road", "0001",
                "b@bank.com", "0000000000", "SBIN0000001", "560002001", "CKYCR1234567890", null, null);
        AccountInfo account = new AccountInfo(90000.0, 2.5, "INR", "Active", "Savings");
        StatementSettings settings = new StatementSettings("SBI2", "1 Month", "duration", null, null,
                "2 Pages", 0, "Normal", "Personal", "manual", "ACME CORP", 60000.0, "1", null, false);

        List<Transaction> txs = TransactionEngine.generateStatementTransactions(
                settings, account, "2026-06-30T12:00:00", customer, branch);
        double closing = txs.isEmpty() ? account.openingBalance() : txs.get(txs.size() - 1).balance();

        return new StatementRecord("stmt_test", "2026-06-30T12:00:00", customer, branch, account, settings,
                txs, closing, 0, 0, 0, 0);
    }

    @Test
    void rendersValidPdfWithAccountNumberOnFirstPage() throws Exception {
        Sbi2Template template = new Sbi2Template();
        byte[] pdfBytes = template.render(sampleRecord());

        assertTrue(pdfBytes.length > 0);
        try (PdfDocument doc = new PdfDocument(new PdfReader(new ByteArrayInputStream(pdfBytes)))) {
            assertTrue(doc.getNumberOfPages() >= 1);
            String text = PdfTextExtractor.getTextFromPage(doc.getPage(1));
            assertTrue(text.contains("00000001234567890"), "expected zero-padded 17-digit account number, found: " + text);
        }
    }

    @Test
    void multiPageStatementHasNoTinyOverflowPages() throws Exception {
        CustomerDetails customer = new CustomerDetails("Test User", "t@test.com", "MG Road, Bangalore",
                "1234567890", "CIF001", "2020-01-01", "None", null, null);
        BranchDetails branch = new BranchDetails("Bangalore Main", "MG Road", "0001",
                "b@bank.com", "0000000000", "SBIN0000001", "560002001", "CKYCR1234567890", null, null);
        AccountInfo account = new AccountInfo(90000.0, 2.5, "INR", "Active", "Savings");
        StatementSettings settings = new StatementSettings("SBI2", "6 Months", "duration", null, null,
                "12 Pages", 0, "Normal", "Personal", "manual", "ACME CORP", 60000.0, "1", null, false);

        List<Transaction> txs = TransactionEngine.generateStatementTransactions(
                settings, account, "2026-06-30T12:00:00", customer, branch);
        double closing = txs.isEmpty() ? account.openingBalance() : txs.get(txs.size() - 1).balance();
        StatementRecord record = new StatementRecord("stmt_multipage", "2026-06-30T12:00:00", customer, branch,
                account, settings, txs, closing, 0, 0, 0, 0);

        Sbi2Template template = new Sbi2Template();
        byte[] pdfBytes = template.render(record);

        try (PdfDocument doc = new PdfDocument(new PdfReader(new ByteArrayInputStream(pdfBytes)))) {
            int totalPages = doc.getNumberOfPages();
            assertTrue(totalPages > 1, "expected a multi-page statement for this transaction volume");

            List<String> pageTexts = new ArrayList<>();
            for (int p = 1; p <= totalPages; p++) {
                pageTexts.add(PdfTextExtractor.getTextFromPage(doc.getPage(p), new LocationTextExtractionStrategy()));
            }

            int[] rowsPerPage = new int[totalPages];
            for (Transaction tx : txs) {
                if (tx.details() != null && tx.details().contains("INTEREST")) {
                    continue;
                }
                String rNum = refFingerprint(tx.refNo());
                int matchedPage = -1;
                int matchCount = 0;
                for (int p = 0; p < totalPages; p++) {
                    if (pageTexts.get(p).contains(rNum)) {
                        matchCount++;
                        matchedPage = p;
                    }
                }
                assertEquals(1, matchCount, "transaction ref " + rNum + " should appear on exactly one page");
                rowsPerPage[matchedPage]++;
            }

            // The table's true last page (highest-indexed page with any transaction rows) is
            // allowed to be small -- it simply holds whatever remainder of transactions is left,
            // same as the last page of any paginated table. Trailing pages after it may be the
            // disclaimer footer spilling over and legitimately have zero rows. The actual bug
            // this guards against is a page BEFORE the true last one ending up nearly empty
            // because a fixed-size chunk didn't fit and spilled 1-2 rows onto an extra page.
            int lastTxPage = -1;
            for (int p = totalPages - 1; p >= 0; p--) {
                if (rowsPerPage[p] > 0) {
                    lastTxPage = p;
                    break;
                }
            }
            for (int p = 0; p < lastTxPage; p++) {
                assertTrue(rowsPerPage[p] > 5,
                        "page " + (p + 1) + " looks like a tiny overflow fragment (" + rowsPerPage[p]
                                + " rows) even though it isn't the table's last page");
            }
        }
    }

    // Mirrors the ref-number padding Sbi2Template.buildRefLine() applies, so this fingerprint
    // matches exactly what's rendered in the PDF's Ref No./Cheque No. column.
    private String refFingerprint(String refNo) {
        String rNum = (refNo != null && !refNo.isBlank()) ? refNo : "2567877902099";
        if (rNum.length() < 13 && rNum.matches("\\d+")) {
            rNum = rNum + "1234567890123".substring(0, 13 - rNum.length());
        }
        return rNum;
    }
}
