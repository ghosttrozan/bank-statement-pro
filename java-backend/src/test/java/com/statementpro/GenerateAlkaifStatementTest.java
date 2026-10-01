package com.statementpro;

import com.statementpro.engine.TransactionEngine;
import com.statementpro.model.*;
import com.statementpro.pdf.PdfPipelineService;
import org.junit.jupiter.api.Test;

import java.io.FileOutputStream;
import java.time.Instant;
import java.util.List;

public class GenerateAlkaifStatementTest {

    @Test
    public void generateAlkaifStatement() throws Exception {
        CustomerDetails customer = new CustomerDetails(
                "Mr. ALKAIF",
                "alkaif@gmail.com",
                "HOUSE NO 142 AZAD ROAD INDORE MADHYA PRADESH 452001",
                "00000038912456781",
                "89241567823",
                "10/04/2019",
                "No",
                "INDORE",
                "452001"
        );

        BranchDetails branch = new BranchDetails(
                "INDORE MAIN",
                "MAIN BRANCH, INDORE",
                "317",
                "sbi.00317@sbi.co.in",
                "0731-222444",
                "SBIN0000317",
                "466002002",
                "CKYCR22035635104",
                "INDORE",
                "452001"
        );

        AccountInfo account = new AccountInfo(40498.12, 2.50, "INR", "Active", "REGULAR SAVINGS BANK ACCOUNT");

        StatementSettings settings = new StatementSettings(
                "SBI2",
                "6 Months",
                "custom",
                "2026-02-01",
                "2026-08-26",
                "Custom",
                179,
                "Normal",
                "Personal",
                "manual",
                "TATA CONSULTANCY SERVICES",
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
                "stmt_alkaif_" + System.currentTimeMillis(),
                createdAt, customer, branch, account, settings, txs, closing, totalCredits, totalDebits, drCount, crCount);

        byte[] pdfBytes = PdfPipelineService.generate(record, null);

        long ts = System.currentTimeMillis();
        String randStr = java.util.UUID.randomUUID().toString().replace("-", "").substring(0, 16);
        String sbiFileName = ts + randStr + ".pdf";

        String outputPath = "c:/Users/alkvi/OneDrive/Desktop/bank-statement-generator/" + sbiFileName;
        try (FileOutputStream fos = new FileOutputStream(outputPath)) {
            fos.write(pdfBytes);
        }

        try (FileOutputStream fos = new FileOutputStream("c:/Users/alkvi/OneDrive/Desktop/bank-statement-generator/alkaif_java_statement.pdf")) {
            fos.write(pdfBytes);
        }

        System.out.println("ALKAIF_JAVA_PDF_GENERATED: " + outputPath + " | TxCount=" + txs.size() + " | Bytes=" + pdfBytes.length);
        System.out.println("SBI_FILENAME: " + sbiFileName);
    }
}
