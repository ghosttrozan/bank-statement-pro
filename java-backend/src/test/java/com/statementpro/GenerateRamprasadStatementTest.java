package com.statementpro;

import com.statementpro.engine.TransactionEngine;
import com.statementpro.model.*;
import com.statementpro.pdf.PdfPipelineService;
import org.junit.jupiter.api.Test;

import java.io.FileOutputStream;
import java.time.Instant;
import java.util.List;

public class GenerateRamprasadStatementTest {

    @Test
    public void generateRamprasadHarlalStatement() throws Exception {
        CustomerDetails customer = new CustomerDetails(
                "Mr. RAMPRASAD HARLAL PRAJAPAT",
                "ramprasad.prajapat@gmail.com",
                "S/O: HARLAL 379 KANKARIYA PAL INDORE KANKARIAPAL B.O MADHYA PRADESH 453551",
                "00000020352973366",
                "88962943492",
                "15/06/2018",
                "No",
                "INDORE",
                "453551"
        );

        BranchDetails branch = new BranchDetails(
                "GAUTAMPURA",
                "GAUTAMPURA INDORE",
                "17106",
                "sbi.17106@sbi.co.in",
                "0731-289456",
                "SBIN0017106",
                "453002501",
                "CKYCR22035635104",
                "INDORE",
                "453551"
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
                "stmt_ramprasad_" + System.currentTimeMillis(),
                createdAt, customer, branch, account, settings, txs, closing, totalCredits, totalDebits, drCount, crCount);

        byte[] pdfBytes = PdfPipelineService.generate(record, null);

        long ts = System.currentTimeMillis();
        String randStr = java.util.UUID.randomUUID().toString().replace("-", "").substring(0, 16);
        String sbiFileName = ts + randStr + ".pdf";

        String outputPath = "c:/Users/alkvi/OneDrive/Desktop/bank-statement-generator/" + sbiFileName;
        try (FileOutputStream fos = new FileOutputStream(outputPath)) {
            fos.write(pdfBytes);
        }

        try (FileOutputStream fos = new FileOutputStream("c:/Users/alkvi/OneDrive/Desktop/bank-statement-generator/ramprasad_harlal_statement.pdf")) {
            fos.write(pdfBytes);
        }

        System.out.println("RAMPRASAD_PDF_GENERATED: " + outputPath + " | Bytes=" + pdfBytes.length);
        System.out.println("SBI_FILENAME: " + sbiFileName);
    }
}
