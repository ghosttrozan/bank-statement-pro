package com.statementpro.api;

import com.statementpro.engine.TransactionEngine;
import com.statementpro.model.StatementRecord;
import com.statementpro.model.Transaction;
import com.statementpro.pdf.PdfPipelineService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RestController;

import java.time.Instant;
import java.util.Base64;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@CrossOrigin(origins = "*")
public class StatementController {

    @PostMapping("/api/statements/generate")
    public ResponseEntity<?> generate(@RequestBody GenerateStatementRequest request) {
        if (request == null || request.customerDetails() == null || request.branchDetails() == null
                || request.accountInfo() == null || request.settings() == null) {
            return ResponseEntity.badRequest().body(Map.of(
                    "message", "customerDetails, branchDetails, accountInfo, and settings are required."));
        }

        try {
            String createdAt = Instant.now().toString();
            List<Transaction> transactions = TransactionEngine.generateStatementTransactions(
                    request.settings(), request.accountInfo(), createdAt,
                    request.customerDetails(), request.branchDetails());

            double totalDebits = transactions.stream().filter(t -> t.debit() != null).mapToDouble(Transaction::debit).sum();
            double totalCredits = transactions.stream().filter(t -> t.credit() != null).mapToDouble(Transaction::credit).sum();
            int drCount = (int) transactions.stream().filter(t -> t.debit() != null).count();
            int crCount = (int) transactions.stream().filter(t -> t.credit() != null).count();
            double closingBalance = transactions.isEmpty()
                    ? request.accountInfo().openingBalance()
                    : transactions.get(transactions.size() - 1).balance();

            StatementRecord record = new StatementRecord(
                    "stmt_" + System.currentTimeMillis() + "_" + UUID.randomUUID().toString().substring(0, 6),
                    createdAt, request.customerDetails(), request.branchDetails(), request.accountInfo(),
                    request.settings(), transactions, closingBalance, totalCredits, totalDebits, drCount, crCount);

            String password = Boolean.TRUE.equals(request.settings().enablePdfPassword())
                    ? request.settings().pdfPassword() : null;
            byte[] pdfBytes = PdfPipelineService.generate(record, password);
            String pdfBase64 = Base64.getEncoder().encodeToString(pdfBytes);

            return ResponseEntity.ok(new GenerateStatementResponse(record, pdfBase64));
        } catch (Exception e) {
            return ResponseEntity.internalServerError().body(Map.of(
                    "message", "Statement generation failed", "error", e.getMessage() != null ? e.getMessage() : "Unknown error"));
        }
    }
}
