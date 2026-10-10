package com.statementpro;

import com.statementpro.engine.TransactionEngine;
import com.statementpro.model.*;
import com.statementpro.pdf.PdfPipelineService;
import org.junit.jupiter.api.Test;

import java.io.FileOutputStream;
import java.time.Instant;
import java.util.List;

public class GenerateKotakStatementTest {

    @Test
    public void generateKotakStatement() throws Exception {
        CustomerDetails customer = new CustomerDetails(
                "Mishi Hasan",
                "mishi.hasan@gmail.com",
                "01,Housing Board Near Police C",
                "2113956953",
                "xxxxxx175",
                "01/01/2021",
                "Mishi",
                "Bhopal",
                "462038"
        );

        BranchDetails branch = new BranchDetails(
                "Bhopal - Hamedia Road",
                "Hamedia Road Bhopal Madhya Pradesh 462038",
                "5891",
                "service@kotak.com",
                "1860-266-2666",
                "KKBK0005891",
                "462485007",
                "CKYCR987654321",
                "Bhopal",
                "462038"
        );

        AccountInfo account = new AccountInfo(50000.0, 3.50, "INR", "Active", "Savings");

        StatementSettings settings = new StatementSettings(
                "KOTAK",
                "6 Months",
                "custom",
                "2026-02-01",
                "2026-08-12",
                "Custom",
                60,
                "Normal",
                "Personal",
                "auto",
                "HCL TECHNOLOGIES",
                65000.00,
                "5",
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
                "stmt_kotak_" + System.currentTimeMillis(),
                createdAt, customer, branch, account, settings, txs, closing, totalCredits, totalDebits, drCount, crCount);

        byte[] pdfBytes = PdfPipelineService.generate(record, null);

        String outputPath = "c:/Users/alkvi/OneDrive/Desktop/bank-statement-generator/bank-statement-generator/Kotak_Generated_Statement.pdf";
        try (FileOutputStream fos = new FileOutputStream(outputPath)) {
            fos.write(pdfBytes);
        }

        System.out.println("KOTAK_PDF_GENERATED: " + outputPath + " | Bytes=" + pdfBytes.length + " | TxCount=" + txs.size());
    }
}
