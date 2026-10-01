package com.statementpro;

import com.statementpro.engine.TransactionEngine;
import com.statementpro.model.*;
import com.statementpro.pdf.PdfPipelineService;
import com.itextpdf.kernel.pdf.PdfDocument;
import com.itextpdf.kernel.pdf.PdfReader;
import org.junit.jupiter.api.Test;

import java.io.ByteArrayInputStream;
import java.util.List;

public class ScratchFindFloorTest {

    private CustomerDetails customer() {
        return new CustomerDetails("Mr. INDAR PURI", "indar.puri@gmail.com",
                "S/O: JAGAH SINGH HOUSE NO 87 BHOJPUR AWANTIPUR BADODIYA SEHORE MADHYA PRADESH",
                "00000045012800409", "9092384822622", "15/06/2018", "No", "SEHORE", "466001");
    }

    private BranchDetails branch() {
        return new BranchDetails("317", "BHOJPUR BRANCH, SEHORE", "00317", "sbi.00317@sbi.co.in",
                "07562-238491", "SBIN0000317", "466002002", "CKYCR9928172648", "SEHORE", "466001");
    }

    private void tryPageCount(String pageCount, String salaryMode) throws Exception {
        AccountInfo account = new AccountInfo(40498.12, 2.50, "INR", "Active", "REGULAR SAVINGS BANK ACCOUNT");
        StatementSettings settings = new StatementSettings("SBI2", "3 Months", "duration", null, null,
                pageCount, 0, "Normal", "Personal", salaryMode,
                "manual".equals(salaryMode) ? "TATA STEEL LIMITED" : null,
                "manual".equals(salaryMode) ? 95631.00 : null, "1", null, false);

        List<Transaction> txs = TransactionEngine.generateStatementTransactions(
                settings, account, "2026-06-30T12:00:00", customer(), branch());

        double totalDebits = txs.stream().filter(t -> t.debit() != null).mapToDouble(Transaction::debit).sum();
        double totalCredits = txs.stream().filter(t -> t.credit() != null).mapToDouble(Transaction::credit).sum();
        int drCount = (int) txs.stream().filter(t -> t.debit() != null).count();
        int crCount = (int) txs.stream().filter(t -> t.credit() != null).count();
        double closing = txs.isEmpty() ? account.openingBalance() : txs.get(txs.size() - 1).balance();

        StatementRecord record = new StatementRecord("stmt_floor", "2026-06-30T12:00:00",
                customer(), branch(), account, settings, txs, closing, totalCredits, totalDebits, drCount, crCount);

        byte[] pdfBytes = PdfPipelineService.generate(record, null);
        int pageCountResult;
        try (PdfReader reader = new PdfReader(new ByteArrayInputStream(pdfBytes));
             PdfDocument pdfDoc = new PdfDocument(reader)) {
            pageCountResult = pdfDoc.getNumberOfPages();
        }
        System.out.println("pageCount=" + pageCount + " salaryMode=" + salaryMode + " -> txCount=" + txs.size() + " -> PDF pages=" + pageCountResult);
    }

    @Test
    public void findFloor() throws Exception {
        for (String pc : List.of("5 Pages", "10 Pages", "12 Pages", "15 Pages", "20 Pages")) {
            tryPageCount(pc, "manual");
            tryPageCount(pc, "auto");
        }
    }
}
