package com.statementpro.engine;

import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertTrue;

class AmountGeneratorTest {

    @Test
    void merchantDebitProducesNonEmptyDetailAndPositiveAmount() {
        for (int i = 0; i < 200; i++) {
            DetailAndAmount result = AmountGenerator.getMerchantDebit("SBI");
            assertFalse(result.detail().isEmpty());
            assertTrue(result.amount() > 0);
        }
    }

    @Test
    void microP2pDebitStaysUnder500() {
        for (int i = 0; i < 200; i++) {
            double amount = AmountGenerator.getP2pDebitAmount(true);
            assertTrue(amount >= 12 && amount < 496, "amount was " + amount);
        }
    }

    @Test
    void nonMicroP2pDebitStaysInHigherBand() {
        for (int i = 0; i < 200; i++) {
            double amount = AmountGenerator.getP2pDebitAmount(false);
            assertTrue(amount >= 510 && amount < 4801, "amount was " + amount);
        }
    }

    @Test
    void continuousCreditAmountNeverExceeds8500() {
        for (int i = 0; i < 500; i++) {
            double amount = AmountGenerator.getContinuousCreditAmount();
            assertTrue(amount >= 120 && amount <= 8501, "amount was " + amount);
        }
    }

    @Test
    void refundAmountStaysWithinRange() {
        for (int i = 0; i < 200; i++) {
            double amount = AmountGenerator.getRefundAmount();
            assertTrue(amount >= 85 && amount < 951, "amount was " + amount);
        }
    }
}
