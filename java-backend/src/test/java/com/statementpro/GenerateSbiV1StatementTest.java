package com.statementpro;

import com.statementpro.engine.TransactionEngine;
import com.statementpro.model.*;
import com.statementpro.pdf.PdfPipelineService;
import org.junit.jupiter.api.Test;

import java.io.FileOutputStream;
import java.time.Instant;
import java.util.List;

public class GenerateSbiV1StatementTest {

    @Test
    public void generateSbiV1Statement() throws Exception {
        CustomerDetails customer = new CustomerDetails(
                "SUDHIR KUMAR SHARMA",
                "sudhir.sharma@sparktech.co.in",
                "B-402, Block 4, Prestige Whispering Palms,\nWhitefield, Bangalore, Karnataka - 560066",
                "30521458920",
                "85962145321",
                "09-05-2022",
                "MEENAKSHI SHARMA (WIFE)",
                "Bangalore",
                "560066"
        );

        BranchDetails branch = new BranchDetails(
                "GOVINDPURA, BHOPAL",
                "INDUSTRIAL AREA GOVINDPURA, BHOPAL, MADHYA\nPRADESH - 462023",
                "01916",
                "SBI.01916@SBI.CO.IN",
                "+91-755-2586241",
                "SBIN0001916",
                "462002015",
                "50046100545797",
                "BHOPAL",
                "462023"
        );

        AccountInfo account = new AccountInfo(90000.0, 2.50, "INR", "Active", "SAVINGS");

        StatementSettings settings = new StatementSettings(
                "SBI",
                "6 Months",
                "custom",
                "2026-01-01",
                "2026-10-27",
                "Custom",
                30,
                "Normal",
                "Personal",
                "auto",
                "AMAZON DEVELOPMENT CENTRE INDIA",
                20700.00,
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
                "stmt_sbi_v1_" + System.currentTimeMillis(),
                createdAt, customer, branch, account, settings, txs, closing, totalCredits, totalDebits, drCount, crCount);

        byte[] pdfBytes = PdfPipelineService.generate(record, null);

        String outputPath = "c:/Users/alkvi/OneDrive/Desktop/bank-statement-generator/bank-statement-generator/SbiV1_Generated_Statement.pdf";
        try (FileOutputStream fos = new FileOutputStream(outputPath)) {
            fos.write(pdfBytes);
        }

        System.out.println("SBIV1_PDF_GENERATED: " + outputPath + " | Bytes=" + pdfBytes.length + " | TxCount=" + txs.size());
    }
}
