package com.statementpro;

import com.statementpro.engine.TransactionEngine;
import com.statementpro.model.*;
import com.statementpro.pdf.PdfPipelineService;
import org.junit.jupiter.api.Test;

import java.io.FileOutputStream;
import java.time.Instant;
import java.util.List;

public class GenerateNehaSharmaStatementTest {

    @Test
    public void generateNehaSharmaStatement() throws Exception {
        // Customer Details with 11-digit Account Number (NO leading zeros: 45356528941)
        CustomerDetails customer = new CustomerDetails(
                "Ms. NEHA SHARMA",
                "neha.sharma@gmail.com",
                "D/O: RATANLAL SHARMA DEEPLA KHEDI ASHTA NAZAR GANJ SEHORE MADHYA PRADESH",
                "45356528941",
                "92487330553",
                "15/06/2018",
                "No",
                "SEHORE",
                "466001"
        );

        // Branch Details directly from passbook
        BranchDetails branch = new BranchDetails(
                "ASHTA NAZAR GANJ",
                "NAZAR GANJ, ASHTA, SEHORE",
                "317",
                "sbi.00317@sbi.co.in",
                "8989793482",
                "SBIN0000317",
                "466002002",
                "CKYCR22035635104",
                "SEHORE",
                "466001"
        );

        AccountInfo account = new AccountInfo(40998.12, 2.50, "INR", "Active", "REGULAR SAVINGS BANK ACCOUNT");

        StatementSettings settings = new StatementSettings(
                "SBI2",
                "6 Months",
                "custom",
                "2026-02-01",
                "2026-08-29",
                "Custom",
                198,
                "Normal",
                "Personal",
                "manual",
                "TATA ELXSI LIMITED",
                76500.00,
                "1",
                null,
                false
        );

        String createdAt = Instant.now().toString();
        List<Transaction> txs = TransactionEngine.generateStatementTransactions(
                settings, account, createdAt, customer, branch);

        double totalDebits = txs.stream().filter(t -> t.debit() != null).mapToDouble(Transaction::debit).sum();
        double totalCredits = txs.stream().filter(t -> t.credit() != null).mapToDouble(Transaction::credit).sum();
        int drCount = (int) txs.stream().filter(t -> t.debit() != null).count();
        int crCount = (int) txs.stream().filter(t -> t.credit() != null).count();
        double closing = txs.isEmpty() ? account.openingBalance() : txs.get(txs.size() - 1).balance();

        StatementRecord record = new StatementRecord(
                "stmt_neha_unpadded_" + System.currentTimeMillis(),
                createdAt, customer, branch, account, settings, txs, closing, totalCredits, totalDebits, drCount, crCount);

        byte[] pdfBytes = PdfPipelineService.generate(record, null);

        long ts = System.currentTimeMillis();
        String randStr = java.util.UUID.randomUUID().toString().replace("-", "").substring(0, 16);
        String sbiFileName = ts + randStr + ".pdf";

        String outputPath = "c:/Users/alkvi/OneDrive/Desktop/bank-statement-generator/" + sbiFileName;
        try (FileOutputStream fos = new FileOutputStream(outputPath)) {
            fos.write(pdfBytes);
        }

        try (FileOutputStream fos = new FileOutputStream("c:/Users/alkvi/OneDrive/Desktop/bank-statement-generator/neha_sharma_11digit_acc.pdf")) {
            fos.write(pdfBytes);
        }

        System.out.println("NEHA_SHARMA_11DIGIT_PDF_GENERATED: " + outputPath + " | TxCount=" + txs.size() + " | Bytes=" + pdfBytes.length);
        System.out.println("SBI_FILENAME: " + sbiFileName);
    }
}
