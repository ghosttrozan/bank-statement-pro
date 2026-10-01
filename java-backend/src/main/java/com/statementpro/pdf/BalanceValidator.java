package com.statementpro.pdf;

import com.statementpro.model.Transaction;

import java.util.ArrayList;
import java.util.List;
import java.util.logging.Logger;

/**
 * Validates that the running balance in a transaction list is arithmetically
 * consistent with each debit/credit operation.
 *
 * WHY THIS EXISTS (table: "Balances"):
 * Previously the code could silently produce PDFs where the printed balance
 * did not match the running total — 6 mismatches were observed in test PDFs.
 * This class detects every mismatch and logs it so the caller can decide how
 * to surface the problem, rather than silently masking it.
 *
 * Rule: balance[n] = balance[n-1] + credit[n] − debit[n]  (to 2 decimal places).
 * For generated statements the balance is always computed in TransactionEngine,
 * so this validator serves as a post-generation sanity check.
 * For imported statements it reports divergence without "repairing" the data.
 */
public final class BalanceValidator {

    private static final Logger LOG = Logger.getLogger(BalanceValidator.class.getName());

    private BalanceValidator() {}

    public record ValidationResult(
            int mismatchCount,
            List<String> details,
            boolean passed
    ) {}

    /**
     * Validates the running balance chain.
     *
     * @param transactions  ordered list of transactions (earliest first)
     * @param openingBalance  the balance BEFORE the first transaction
     * @return a {@link ValidationResult} describing any discrepancies found
     */
    public static ValidationResult validate(List<Transaction> transactions, double openingBalance) {
        List<String> details = new ArrayList<>();
        double running = round2(openingBalance);
        int mismatches = 0;

        for (int i = 0; i < transactions.size(); i++) {
            Transaction tx = transactions.get(i);

            if (tx.credit() != null) running = round2(running + tx.credit());
            if (tx.debit()  != null) running = round2(running - tx.debit());

            double printed = round2(tx.balance());

            if (Math.abs(running - printed) > 0.01) {
                mismatches++;
                String msg = String.format(
                        "Row %d [%s]: expected balance %.2f, printed %.2f (diff %.2f) — txn: %s",
                        i + 1, tx.valueDate(), running, printed, printed - running,
                        tx.details() != null ? tx.details().replace("\n", " ") : "");
                details.add(msg);
                LOG.warning("[BalanceValidator] " + msg);

                // Sync running balance to the printed value to avoid cascade mismatches
                // This does NOT modify the transaction data — it just resets the validator's
                // internal accumulator so subsequent rows are compared to their own context.
                running = printed;
            }
        }

        if (mismatches == 0) {
            LOG.info("[BalanceValidator] All " + transactions.size() + " balance checks passed.");
        } else {
            LOG.warning("[BalanceValidator] " + mismatches + " mismatch(es) in " +
                        transactions.size() + " transactions.");
        }

        return new ValidationResult(mismatches, details, mismatches == 0);
    }

    private static double round2(double v) {
        return Math.round(v * 100.0) / 100.0;
    }
}
