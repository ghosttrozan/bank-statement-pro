package com.statementpro;

import com.statementpro.engine.TransactionEngine;
import com.statementpro.model.*;
import com.statementpro.pdf.PdfPipelineService;
import org.junit.jupiter.api.Test;

import java.io.FileOutputStream;
import java.time.Instant;
import java.util.List;

public class GenerateIndusindStatementTest {

    @Test
    public void generateIndusindStatement() throws Exception {
        CustomerDetails customer = new CustomerDetails(
                "SUNIL",
                "sunil@gmail.com",
                "HOUSE NO 108 MMG ROAD",
                "100296834836",
                "6XXXX602",
                "01/01/2020",
                "SUNIL",
                "INDORE",
                "452010"
        );

        BranchDetails branch = new BranchDetails(
                "INDORE VIJAY NAGAR",
                "VIJAY NAGAR INDORE MADHYA PRADESH 452010",
                "001325",
                "reachus@indusind.com",
                "1860-267-7777",
                "INDB0001325",
                "452234002",
                "CKYCR123456789",
                "INDORE",
                "452010"
        );

        AccountInfo account = new AccountInfo(96017.0, 3.00, "INR", "Active", "INDUS CLASSIC");

        StatementSettings settings = new StatementSettings(
                "INDUSIND",
                "6 Months",
                "custom",
                "2026-02-01",
                "2026-09-08",
                "Custom",
                30,
                "Normal",
                "Personal",
                "auto",
                "TATA ELXSI LIMITED",
                90000.00,
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
                "stmt_indusind_" + System.currentTimeMillis(),
                createdAt, customer, branch, account, settings, txs, closing, totalCredits, totalDebits, drCount, crCount);

        byte[] pdfBytes = PdfPipelineService.generate(record, null);

        String outputPath = "c:/Users/alkvi/OneDrive/Desktop/bank-statement-generator/bank-statement-generator/Indusind_Generated_Statement.pdf";
        try (FileOutputStream fos = new FileOutputStream(outputPath)) {
            fos.write(pdfBytes);
        }

        System.out.println("INDUSIND_PDF_GENERATED: " + outputPath + " | Bytes=" + pdfBytes.length + " | TxCount=" + txs.size());
    }
}
