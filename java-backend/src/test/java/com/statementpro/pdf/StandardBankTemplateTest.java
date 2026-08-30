package com.statementpro.pdf;

import com.statementpro.engine.TransactionEngine;
import com.statementpro.model.*;
import com.itextpdf.kernel.pdf.PdfDocument;
import com.itextpdf.kernel.pdf.PdfReader;
import com.itextpdf.kernel.pdf.canvas.parser.PdfTextExtractor;
import org.junit.jupiter.api.Test;

import java.io.ByteArrayInputStream;
import java.util.List;

import static org.junit.jupiter.api.Assertions.*;

class StandardBankTemplateTest {

    private StatementRecord sampleRecord(String bankStyle) {
        CustomerDetails customer = new CustomerDetails("Test User", "t@test.com", "MG Road, Bangalore",
                "1234567890", "CIF001", "2020-01-01", "None", null, null);
        BranchDetails branch = new BranchDetails("Bangalore Main", "MG Road", "0001",
                "b@bank.com", "0000000000", "SBIN0000001", "560002001", "CKYCR1", null, null);
        AccountInfo account = new AccountInfo(90000.0, 2.5, "INR", "Active", "Savings");
        StatementSettings settings = new StatementSettings(bankStyle, "1 Month", "duration", null, null,
                "2 Pages", 0, "Normal", "Personal", "manual", "ACME CORP", 60000.0, "1", null, false);

        List<Transaction> txs = TransactionEngine.generateStatementTransactions(
                settings, account, "2026-06-30T12:00:00", customer, branch);

        double credits = txs.stream().filter(t -> t.credit() != null).mapToDouble(Transaction::credit).sum();
        double debits = txs.stream().filter(t -> t.debit() != null).mapToDouble(Transaction::debit).sum();
        int crCount = (int) txs.stream().filter(t -> t.credit() != null).count();
        int drCount = (int) txs.stream().filter(t -> t.debit() != null).count();
        double closing = txs.isEmpty() ? account.openingBalance() : txs.get(txs.size() - 1).balance();

        return new StatementRecord("stmt_test", "2026-06-30T12:00:00", customer, branch, account, settings,
                txs, closing, credits, debits, drCount, crCount);
    }

    @Test
    void rendersValidPdfWithBankTitleOnFirstPage() throws Exception {
        StandardBankTemplate template = new StandardBankTemplate();
        byte[] pdfBytes = template.render(sampleRecord("BOI"));

        assertTrue(pdfBytes.length > 0);
        try (PdfDocument doc = new PdfDocument(new PdfReader(new ByteArrayInputStream(pdfBytes)))) {
            assertTrue(doc.getNumberOfPages() >= 1);
            String firstPageText = PdfTextExtractor.getTextFromPage(doc.getPage(1));
            assertTrue(firstPageText.contains("BANK OF INDIA"));
        }
    }
}
