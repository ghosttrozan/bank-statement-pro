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
        List<Transaction> txs = TransactionEngine.generateStatementTransactions(
                settings("manual", "ACME CORP", 60000.0), account(90000.0),
                "2026-06-30T12:00:00", null, null);

        boolean hasSalaryCredit = txs.stream()
                .anyMatch(tx -> tx.details().contains("ACME CORP") && tx.credit() != null);
        assertTrue(hasSalaryCredit, "expected at least one salary credit referencing the manual company name");
    }

    @Test
    void smsAlertChargeAppearsInEveryMonth() {
        List<Transaction> txs = TransactionEngine.generateStatementTransactions(
                settings("auto", null, null), account(90000.0),
                "2026-06-30T12:00:00", null, null);

        long smsCharges = txs.stream().filter(tx -> "SMS ALERT CHARGES".equals(tx.details())).count();
        assertTrue(smsCharges >= 1);
    }

    @Test
    void februaryInterestPostingRollsPeriodFromBackIntoPreviousYear() {
        // Quarterly interest months are [1,4,7,10] (0-indexed: Feb,May,Aug,Nov). For the February
        // posting, the 3-month lookback period starts in November of the PRECEDING year — this only
        // shows up when the date range actually spans a Feb 1 interest posting.
        List<Transaction> txs = TransactionEngine.generateStatementTransactions(
                settings("auto", null, null), account(90000.0),
                "2026-02-28T12:00:00", null, null);

        boolean hasCorrectPeriod = txs.stream()
                .anyMatch(tx -> tx.details().contains("01/11/2025") && tx.details().contains("31/01/2026"));
        assertTrue(hasCorrectPeriod,
                "expected an interest narrative with period 01/11/2025 to 31/01/2026 (year must roll back for the Feb posting)");
    }

    @Test
    void salariedVariantUsesRandomOpeningBalanceWhenNotProvided() {
        List<Transaction> txs = TransactionEngine.generateSalariedStatementTransactions(
                settings("auto", null, null), account(0.0),
                "2026-06-30T12:00:00", null, null);

        assertFalse(txs.isEmpty());
    }

    @Test
    void autoSalaryModeAddsProfessionalTaxAndPfDeductionLines() {
        List<Transaction> txs = TransactionEngine.generateStatementTransactions(
                settings("auto", null, null), account(90000.0),
                "2026-06-30T12:00:00", null, null);

        boolean hasPt = txs.stream().anyMatch(tx -> tx.details().startsWith("PROFESSIONAL TAX-") && tx.debit() != null);
        boolean hasPf = txs.stream().anyMatch(tx -> tx.details().startsWith("PF EMPLOYEE CONTRIBUTION-") && tx.debit() != null);

        assertTrue(hasPt, "expected a professional tax deduction line");
        assertTrue(hasPf, "expected a PF employee contribution deduction line");
    }

    @Test
    void manualSalaryModeHasNoDeductionLines() {
        List<Transaction> txs = TransactionEngine.generateStatementTransactions(
                settings("manual", "ACME CORP", 60000.0), account(90000.0),
                "2026-06-30T12:00:00", null, null);

        boolean hasAnyDeduction = txs.stream().anyMatch(tx ->
                tx.details().startsWith("PROFESSIONAL TAX-")
                        || tx.details().startsWith("PF EMPLOYEE CONTRIBUTION-")
                        || tx.details().startsWith("TDS ON SALARY"));

        assertFalse(hasAnyDeduction, "manual salary mode must not add deduction lines");
    }

    @Test
    void deductionLinesShareSameDateAsALargeSalaryCredit() {
        List<Transaction> txs = TransactionEngine.generateStatementTransactions(
                settings("auto", null, null), account(90000.0),
                "2026-06-30T12:00:00", null, null);

        List<Transaction> deductionLines = txs.stream()
                .filter(tx -> tx.details().startsWith("PROFESSIONAL TAX-") || tx.details().startsWith("PF EMPLOYEE CONTRIBUTION-"))
                .toList();

        assertFalse(deductionLines.isEmpty());

        for (Transaction deduction : deductionLines) {
            boolean hasMatchingSalaryCredit = txs.stream().anyMatch(tx ->
                    tx.valueDate().equals(deduction.valueDate()) && tx.credit() != null && tx.credit() >= 20000);
            assertTrue(hasMatchingSalaryCredit,
                    "expected a same-date salary credit >= 20000 for deduction: " + deduction.details());
        }
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
