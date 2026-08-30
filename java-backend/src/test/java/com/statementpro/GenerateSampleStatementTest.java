package com.statementpro;

import com.statementpro.engine.TransactionEngine;
import com.statementpro.model.*;
import com.statementpro.pdf.PdfPipelineService;
import org.junit.jupiter.api.Test;

import java.io.FileOutputStream;
import java.time.Instant;
import java.util.List;

public class GenerateSampleStatementTest {

    @Test
    public void generateTestPdf() throws Exception {
        CustomerDetails customer = new CustomerDetails(
                "Mr. INDAR PURI", "indar.puri@gmail.com",
                "S/O: JAGAH SINGH HOUSE NO 87 BHOJPUR AWANTIPUR BADODIYA SEHORE MADHYA PRADESH",
                "00000045012800409", "9092384822622", "15/06/2018", "No", "SEHORE", "466001");

        BranchDetails branch = new BranchDetails(
                "317", "BHOJPUR BRANCH, SEHORE",
                "00317", "sbi.00317@sbi.co.in", "07562-238491", "SBIN0000317", "466002002",
                "CKYCR9928172648", "SEHORE", "466001");

        AccountInfo account = new AccountInfo(40498.12, 2.50, "INR", "Active", "REGULAR SAVINGS BANK ACCOUNT");

        StatementSettings settings = new StatementSettings(
                "SBI2", "3 Months", "duration", null, null,
                "3 Pages", 0, "Normal", "Personal", "manual",
                "TATA STEEL LIMITED", 95631.00, "1", null, false);

        String createdAt = Instant.now().toString();
        List<Transaction> txs = TransactionEngine.generateStatementTransactions(
                settings, account, createdAt, customer, branch);

        double totalDebits = txs.stream().filter(t -> t.debit() != null).mapToDouble(Transaction::debit).sum();
        double totalCredits = txs.stream().filter(t -> t.credit() != null).mapToDouble(Transaction::credit).sum();
        int drCount = (int) txs.stream().filter(t -> t.debit() != null).count();
        int crCount = (int) txs.stream().filter(t -> t.credit() != null).count();
        double closing = txs.isEmpty() ? account.openingBalance() : txs.get(txs.size() - 1).balance();

        StatementRecord record = new StatementRecord(
                "stmt_" + System.currentTimeMillis(),
                createdAt, customer, branch, account, settings, txs, closing, totalCredits, totalDebits, drCount, crCount);

        byte[] pdfBytes = PdfPipelineService.generate(record, null);

        String outputPath = "c:/Users/alkvi/OneDrive/Desktop/bank-statement-generator/bank-statement-generator/test_sbi_statement.pdf";
        try (FileOutputStream fos = new FileOutputStream(outputPath)) {
            fos.write(pdfBytes);
        }

        int pagesCount;
        try (com.itextpdf.kernel.pdf.PdfReader reader = new com.itextpdf.kernel.pdf.PdfReader(outputPath);
             com.itextpdf.kernel.pdf.PdfDocument pdfDoc = new com.itextpdf.kernel.pdf.PdfDocument(reader)) {
            pagesCount = pdfDoc.getNumberOfPages();
        }
        System.out.println("GENERATION_SUCCESS: " + outputPath + " | TxCount=" + txs.size() + " | Pages=" + pagesCount + " | Bytes=" + pdfBytes.length);
    }
}