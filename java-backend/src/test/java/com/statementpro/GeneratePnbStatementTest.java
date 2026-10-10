package com.statementpro;

import com.statementpro.engine.TransactionEngine;
import com.statementpro.model.*;
import com.statementpro.pdf.PdfPipelineService;
import org.junit.jupiter.api.Test;

import java.io.FileOutputStream;
import java.time.Instant;
import java.util.List;

public class GeneratePnbStatementTest {

    @Test
    public void generatePnbStatement() throws Exception {
        CustomerDetails customer = new CustomerDetails(
                "RAMESH JI",
                "ramesh.ji@gmail.com",
                "GRAM PALKHANDA POST KAREDI MATAJI UJJAIN MADHYA PRADESH",
                "6592001700122650",
                "88962943492",
                "15/06/2018",
                "RAMESH",
                "SHAJAPUR",
                "466038"
        );

        BranchDetails branch = new BranchDetails(
                "SHAJAPUR",
                "AJAY SHARE TAKTEO SHAJAPUR 466038",
                "0659200",
                "bo6592@pnb.co.in",
                "07364-222038",
                "PUNB0659200",
                "465024505",
                "CKYCR40057100381924",
                "SHAJAPUR",
                "466038"
        );

        AccountInfo account = new AccountInfo(90000.0, 2.70, "INR", "Active", "SAVINGS BANK ACCOUNT");

        StatementSettings settings = new StatementSettings(
                "PNB",
                "1 Year",
                "custom",
                "2025-07-24",
                "2026-07-23",
                "Custom",
                45,
                "Normal",
                "Personal",
                "auto",
                "TECH MAHINDRA LTD",
                55000.00,
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
                "stmt_pnb_" + System.currentTimeMillis(),
                createdAt, customer, branch, account, settings, txs, closing, totalCredits, totalDebits, drCount, crCount);

        byte[] pdfBytes = PdfPipelineService.generate(record, null);

        String outputPath = "c:/Users/alkvi/OneDrive/Desktop/bank-statement-generator/bank-statement-generator/Pnb_Generated_Statement.pdf";
        try (FileOutputStream fos = new FileOutputStream(outputPath)) {
            fos.write(pdfBytes);
        }

        System.out.println("PNB_PDF_GENERATED: " + outputPath + " | Bytes=" + pdfBytes.length + " | TxCount=" + txs.size());
    }
}
