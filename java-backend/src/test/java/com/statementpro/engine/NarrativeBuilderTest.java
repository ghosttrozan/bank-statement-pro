package com.statementpro.engine;

import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertTrue;

class NarrativeBuilderTest {

    @Test
    void upiNarrativeContainsDirectionMarkerForCredit() {
        String narrative = NarrativeBuilder.buildUpiNarrative(true, "SBI", null);
        assertTrue(narrative.contains("CR"));
    }

    @Test
    void upiNarrativeContainsDirectionMarkerForDebit() {
        String narrative = NarrativeBuilder.buildUpiNarrative(false, "SBI", null);
        assertTrue(narrative.contains("DR"));
    }

    @Test
    void boiStyleUsesSolFormat() {
        String narrative = NarrativeBuilder.buildUpiNarrative(true, "BOI", null);
        assertTrue(narrative.startsWith("UPI/"));
        assertTrue(narrative.endsWith("/CR"));
    }

    @Test
    void merchantNarrativeIncludesMerchantHandle() {
        MerchantInfo merchant = MerchantData.MERCHANTS.get(0);
        String narrative = NarrativeBuilder.buildUpiNarrativeForMerchant(merchant, false, "Kotak");
        assertTrue(narrative.contains(merchant.handle()));
    }
}
