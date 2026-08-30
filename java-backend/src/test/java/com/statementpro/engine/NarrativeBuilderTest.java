package com.statementpro.engine;

import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertTrue;

class NarrativeBuilderTest {

    @Test
    void upiNarrativeContainsDirectionMarkerForCredit() {
        boolean anyContainsMarker = false;
        for (int i = 0; i < 20; i++) {
            if (NarrativeBuilder.buildUpiNarrative(true, "SBI", null).contains("CR")) {
                anyContainsMarker = true;
                break;
            }
        }
        assertTrue(anyContainsMarker);
    }

    @Test
    void upiNarrativeContainsDirectionMarkerForDebit() {
        boolean anyContainsMarker = false;
        for (int i = 0; i < 20; i++) {
            if (NarrativeBuilder.buildUpiNarrative(false, "SBI", null).contains("DR")) {
                anyContainsMarker = true;
                break;
            }
        }
        assertTrue(anyContainsMarker);
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
