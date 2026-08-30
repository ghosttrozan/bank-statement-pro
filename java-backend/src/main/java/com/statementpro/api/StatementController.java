package com.statementpro.api;

import com.statementpro.engine.TransactionEngine;
import com.statementpro.model.StatementRecord;
import com.statementpro.model.Transaction;
import com.statementpro.pdf.PdfPipelineService;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
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
            List<Transaction> transactions;

            if (request.transactions() != null && !request.transactions().isEmpty()) {
                transactions = request.transactions();
            } else {
                boolean isSalaried = !"Business".equalsIgnoreCase(request.settings().profile())
                        && (request.settings().salaryMode() != null
                        || request.settings().monthlySalary() != null
                        || "Personal".equalsIgnoreCase(request.settings().profile()));

                transactions = isSalaried
                        ? TransactionEngine.generateSalariedStatementTransactions(
                                request.settings(), request.accountInfo(), createdAt,
                                request.customerDetails(), request.branchDetails())
                        : TransactionEngine.generateStatementTransactions(
                                request.settings(), request.accountInfo(), createdAt,
                                request.customerDetails(), request.branchDetails());
            }

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

    @PostMapping(value = "/api/statements/download", produces = MediaType.APPLICATION_PDF_VALUE)
    public ResponseEntity<?> download(@RequestBody GenerateStatementRequest request) {
        if (request == null || request.customerDetails() == null || request.branchDetails() == null
                || request.accountInfo() == null || request.settings() == null) {
            return ResponseEntity.badRequest().body(Map.of(
                    "message", "customerDetails, branchDetails, accountInfo, and settings are required."));
        }

        try {
            String createdAt = Instant.now().toString();
            List<Transaction> transactions;

            if (request.transactions() != null && !request.transactions().isEmpty()) {
                transactions = request.transactions();
            } else {
                boolean isSalaried = !"Business".equalsIgnoreCase(request.settings().profile())
                        && (request.settings().salaryMode() != null
                        || request.settings().monthlySalary() != null
                        || "Personal".equalsIgnoreCase(request.settings().profile()));

                transactions = isSalaried
                        ? TransactionEngine.generateSalariedStatementTransactions(
                                request.settings(), request.accountInfo(), createdAt,
                                request.customerDetails(), request.branchDetails())
                        : TransactionEngine.generateStatementTransactions(
                                request.settings(), request.accountInfo(), createdAt,
                                request.customerDetails(), request.branchDetails());
            }

            double totalDebits = transactions.stream().filter(t -> t.debit() != null).mapToDouble(Transaction::debit).sum();
            double totalCredits = transactions.stream().filter(t -> t.credit() != null).mapToDouble(Transaction::credit).sum();
            int drCount = (int) transactions.stream().filter(t -> t.debit() != null).count();
            int crCount = (int) transactions.stream().filter(t -> t.credit() != null).count();
            double closingBalance = transactions.isEmpty()
                    ? request.accountInfo().openingBalance()
                    : transactions.get(transactions.size() - 1).balance();

            String statementId = "stmt_" + System.currentTimeMillis() + "_" + UUID.randomUUID().toString().substring(0, 6);
            StatementRecord record = new StatementRecord(
                    statementId,
                    createdAt, request.customerDetails(), request.branchDetails(), request.accountInfo(),
                    request.settings(), transactions, closingBalance, totalCredits, totalDebits, drCount, crCount);

            String password = Boolean.TRUE.equals(request.settings().enablePdfPassword())
                    ? request.settings().pdfPassword() : null;
            byte[] pdfBytes = PdfPipelineService.generate(record, password);

            String bankStyle = request.settings().bankStyle() != null ? request.settings().bankStyle() : "Bank";
            String randCode = UUID.randomUUID().toString().substring(0, 6).toUpperCase();
            String filename = bankStyle + "_Statement_" + randCode + ".pdf";

            return ResponseEntity.ok()
                    .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + filename + "\"")
                    .header(HttpHeaders.CONTENT_TYPE, MediaType.APPLICATION_PDF_VALUE)
                    .header("X-Statement-ID", statementId)
                    .header("X-Transactions-Count", String.valueOf(transactions.size()))
                    .body(pdfBytes);
        } catch (Exception e) {
            return ResponseEntity.internalServerError().body(Map.of(
                    "message", "Statement PDF download failed", "error", e.getMessage() != null ? e.getMessage() : "Unknown error"));
        }
    }
}
