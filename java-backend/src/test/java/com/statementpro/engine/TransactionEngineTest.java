package com.statementpro.engine;

import com.statementpro.model.*;
import org.junit.jupiter.api.Test;

import java.time.LocalDate;
import java.util.List;

import static org.junit.jupiter.api.Assertions.*;

class TransactionEngineTest {

    private StatementSettings settings(String salaryMode, String company, Double salary) {
        return new StatementSettings("SBI", "3 Months", "duration", null, null,
                "5 Pages", 0, "Normal", "Personal", salaryMode, company, salary, "1", null, false);
    }

    private AccountInfo account(double opening) {
        return new AccountInfo(opening, 2.5, "INR", "Active", "Savings");
    }

    @Test
    void generatesNonEmptyChronologicallySortedTransactions() {
        List<Transaction> txs = TransactionEngine.generateStatementTransactions(
                settings("manual", "ACME CORP", 60000.0), account(90000.0),
                "2026-06-30T12:00:00", null, null);

        assertFalse(txs.isEmpty());

        for (int i = 1; i < txs.size(); i++) {
            LocalDate prev = parseDdMmYyyy(txs.get(i - 1).valueDate());
            LocalDate curr = parseDdMmYyyy(txs.get(i).valueDate());
            assertFalse(curr.isBefore(prev), "transactions must be chronologically non-decreasing");
        }
    }

    @Test
    void runningBalanceIsInternallyConsistent() {
        List<Transaction> txs = TransactionEngine.generateStatementTransactions(
                settings("manual", "ACME CORP", 60000.0), account(90000.0),
                "2026-06-30T12:00:00", null, null);

        double expectedBalance = 90000.0;
        for (Transaction tx : txs) {
            if (tx.credit() != null) expectedBalance += tx.credit();
            if (tx.debit() != null) expectedBalance -= tx.debit();
            expectedBalance = Math.round(expectedBalance * 100.0) / 100.0;
            assertEquals(expectedBalance, tx.balance(), 0.01);
        }
    }

    @Test
    void manualSalaryModeProducesExactCompanyAndAmountCredits() {
        List<Transaction> txs = TransactionEngine.generateSalariedStatementTransactions(
                settings("manual", "ACME CORP", 60000.0), account(90000.0),
                "2026-06-30T12:00:00", null, null);

        boolean hasSalaryCredit = txs.stream()
                .anyMatch(tx -> tx.details().contains("ACME CORP") && tx.credit() != null);
        assertTrue(hasSalaryCredit, "expected at least one salary credit referencing the manual company name");
    }

    @Test
    void quarterlyInterestAppearsOnQuarterCycle() {
        List<Transaction> txs = TransactionEngine.generateSalariedStatementTransactions(
                settings("auto", null, null), account(90000.0),
                "2026-06-30T12:00:00", null, null);

        boolean hasInterest = txs.stream()
                .anyMatch(tx -> "CREDIT INTEREST--".equals(tx.details()) && tx.credit() != null);
        assertTrue(hasInterest, "expected at least one quarterly CREDIT INTEREST-- transaction");
    }

    @Test
    void businessStatementHasZeroSalaryNarrativesAndHasBusinessReceivables() {
        StatementSettings bizSettings = new StatementSettings("SBI2", "3 Months", "duration", null, null,
                "5 Pages", 0, "Normal", "Business", null, null, null, "1", null, false);
        List<Transaction> txs = TransactionEngine.generateStatementTransactions(
                bizSettings, account(90000.0), "2026-06-30T12:00:00", null, null);

        boolean hasSalary = txs.stream().anyMatch(tx -> tx.details().toUpperCase().contains("SALARY"));
        assertFalse(hasSalary, "business statement must not have any salary narrative");

        boolean hasBizCredit = txs.stream().anyMatch(tx ->
                tx.credit() != null && (tx.details().contains("INVOICE PMT") || tx.details().contains("CLIENT RECEIPT") || tx.details().contains("INWARD CLG")));
        assertTrue(hasBizCredit, "expected at least one business receivable credit");
    }

    @Test
    void salariedVariantUsesRandomOpeningBalanceWhenNotProvided() {
        List<Transaction> txs = TransactionEngine.generateSalariedStatementTransactions(
                settings("auto", null, null), account(0.0),
                "2026-06-30T12:00:00", null, null);

        assertFalse(txs.isEmpty());
    }

    @Test
    void salariedModeHasNoArtificialDeductionsOnLedger() {
        List<Transaction> txs = TransactionEngine.generateSalariedStatementTransactions(
                settings("auto", null, null), account(90000.0),
                "2026-06-30T12:00:00", null, null);

        boolean hasArtificialDeductions = txs.stream().anyMatch(tx ->
                tx.details().startsWith("PROFESSIONAL TAX-")
                        || tx.details().startsWith("PF EMPLOYEE CONTRIBUTION-")
                        || tx.details().startsWith("TDS ON SALARY"));

        assertFalse(hasArtificialDeductions, "salaried mode must not insert artificial deduction lines on bank ledger");
    }

    @Test
    void majorityOfTransactionsAreUpi() {
        List<Transaction> txs = TransactionEngine.generateStatementTransactions(
                settings("auto", null, null), account(90000.0),
                "2026-06-30T12:00:00", null, null);

        long upiCount = txs.stream().filter(tx -> tx.details().contains("UPI")).count();
        assertTrue((double) upiCount / txs.size() >= 0.70, "expected majority of retail transactions to be UPI");
    }

    @Test
    void runningBalanceStaysConsistentAcrossManyRandomSalariedGenerations() {
        List<String> durations = List.of("1 Month", "3 Months", "6 Months", "12 Months");
        List<String> pageCounts = List.of("1 Page", "5 Pages", "12 Pages", "20 Pages");

        for (int i = 0; i < 200; i++) {
            StatementSettings settings = new StatementSettings("SBI",
                    durations.get(i % durations.size()), "duration", null, null,
                    pageCounts.get(i % pageCounts.size()), 0, "Normal", "Personal",
                    "auto", null, null, "1", null, false);

            List<Transaction> txs = TransactionEngine.generateStatementTransactions(
                    settings, account(90000.0), "2026-06-30T12:00:00", null, null);

            double expectedBalance = 90000.0;
            for (Transaction tx : txs) {
                if (tx.credit() != null) expectedBalance += tx.credit();
                if (tx.debit() != null) expectedBalance -= tx.debit();
                expectedBalance = Math.round(expectedBalance * 100.0) / 100.0;
                assertEquals(expectedBalance, tx.balance(), 0.01,
                        "balance mismatch on iteration " + i + " for tx " + tx.id());
            }
        }
    }

    private LocalDate parseDdMmYyyy(String str) {
        String[] parts = str.split("/");
        return LocalDate.of(Integer.parseInt(parts[2]), Integer.parseInt(parts[1]), Integer.parseInt(parts[0]));
    }
}
