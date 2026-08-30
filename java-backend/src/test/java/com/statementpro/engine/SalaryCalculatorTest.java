package com.statementpro.engine;

import com.statementpro.model.StatementSettings;
import org.junit.jupiter.api.Test;

import java.time.LocalDate;
import java.time.DayOfWeek;
import java.util.List;

import static org.junit.jupiter.api.Assertions.*;

class SalaryCalculatorTest {

    private StatementSettings baseSettings(String salaryMode, String company, Double salary, String salaryDay) {
        return new StatementSettings("SBI", "3 Months", "duration", null, null,
                "5 Pages", 0, "Normal", "Personal", salaryMode, company, salary, salaryDay, null, false);
    }

    @Test
    void manualModeReturnsExactCompanyAndAmount() {
        SalaryInfo info = SalaryCalculator.getSalaryInfo(baseSettings("manual", "acme corp", 65000.0, "1"));
        assertEquals("ACME CORP", info.company());
        assertEquals(65000.0, info.amount());
    }

    @Test
    void autoModePicksFromKnownCompanyList() {
        SalaryInfo info = SalaryCalculator.getSalaryInfo(baseSettings("auto", null, null, "1"));
        assertNotNull(info.company());
        assertTrue(info.amount() >= 38000);
    }

    @Test
    void salaryDateNeverLandsOnSunday() {
        for (int month = 0; month < 12; month++) {
            LocalDate date = SalaryCalculator.getSalaryDateForMonth(2026, month, baseSettings("auto", null, null, "1"));
            assertNotEquals(DayOfWeek.SUNDAY, date.getDayOfWeek());
        }
    }

    @Test
    void lastDaySalaryModeUsesLastWorkingDayOfMonth() {
        LocalDate date = SalaryCalculator.getSalaryDateForMonth(2026, 3, baseSettings("auto", null, null, "last_day"));
        assertEquals(4, date.getMonthValue());
        assertTrue(date.getDayOfMonth() >= 27);
    }

    @Test
    void salaryNeftNarrativeContainsCompanyName() {
        String narrative = SalaryCalculator.buildSalaryNeftNarrative("SBI", "ACME CORP", LocalDate.of(2026, 4, 1));
        assertTrue(narrative.contains("ACME CORP"));
    }

    @Test
    void kotakIntNarrativeIsFixedString() {
        assertEquals("INT PAID ON SB ACCOUNT",
                SalaryCalculator.buildSBIntNarrative("123", "01-01-2026", "31-03-2026", "Kotak"));
    }

    @Test
    void defaultIntNarrativeIncludesAccountAndPeriod() {
        String narrative = SalaryCalculator.buildSBIntNarrative("123", "01-01-2026", "31-03-2026", "SBI");
        assertEquals("123:SBInt.Pd:01-01-2026 to 31-03-2026", narrative);
    }

    // --- Deductions ---

    @Test
    void computeDeductions_returnsZeroBelowFloor() {
        SalaryDeductions d = SalaryCalculator.computeDeductions(15000.0);
        assertEquals(0.0, d.professionalTax());
        assertEquals(0.0, d.pfEmployeeContribution());
        assertEquals(0.0, d.tds());
    }

    @Test
    void computeDeductions_flatProfessionalTaxAboveFloor() {
        SalaryDeductions d = SalaryCalculator.computeDeductions(50000.0);
        assertEquals(200.0, d.professionalTax());
    }

    @Test
    void computeDeductions_pfIsSixPercentBelowCap() {
        SalaryDeductions d = SalaryCalculator.computeDeductions(50000.0);
        assertEquals(3000.0, d.pfEmployeeContribution(), 0.01);
    }

    @Test
    void computeDeductions_pfCapsAtMaxAmount() {
        SalaryDeductions d = SalaryCalculator.computeDeductions(200000.0);
        assertEquals(4200.0, d.pfEmployeeContribution(), 0.01);
    }

    @Test
    void computeDeductions_tdsZeroAtOrBelowThreshold() {
        SalaryDeductions d = SalaryCalculator.computeDeductions(70000.0);
        assertEquals(0.0, d.tds());
    }

    @Test
    void computeDeductions_tdsIsFivePercentAboveThreshold() {
        SalaryDeductions d = SalaryCalculator.computeDeductions(80000.0);
        assertEquals(4000.0, d.tds(), 0.01);
    }

    @Test
    void deductions_totalSumsAllThreeComponents() {
        SalaryDeductions d = SalaryCalculator.computeDeductions(80000.0);
        assertEquals(d.professionalTax() + d.pfEmployeeContribution() + d.tds(), d.total(), 0.01);
    }

    // --- Raise ---

    @Test
    void applyRaise_noRaiseWhenRaiseMonthNegative() {
        assertEquals(60000.0, SalaryCalculator.applyRaise(60000.0, 5, -1, 1.10));
    }

    @Test
    void applyRaise_baseUnchangedBeforeRaiseMonth() {
        assertEquals(60000.0, SalaryCalculator.applyRaise(60000.0, 2, 4, 1.10));
    }

    @Test
    void applyRaise_appliesFactorFromRaiseMonthOnward() {
        double raised = SalaryCalculator.applyRaise(60000.0, 4, 4, 1.10);
        assertEquals(66000.0, raised, 0.01);
    }

    // --- Monthly variance ---

    @Test
    void applyMonthlyVariance_manualModeAlwaysReturnsInputUnchanged() {
        for (int i = 0; i < 50; i++) {
            assertEquals(60000.0, SalaryCalculator.applyMonthlyVariance(60000.0, true));
        }
    }

    @Test
    void applyMonthlyVariance_autoModeStaysWithinPlausibleBounds() {
        for (int i = 0; i < 500; i++) {
            double result = SalaryCalculator.applyMonthlyVariance(60000.0, false);
            assertTrue(result >= 60000.0 - 1800 && result <= 60000.0 + 2500,
                    "variance out of plausible bounds: " + result);
        }
    }

    // --- Bonus ---

    @Test
    void applyBonus_addsBonusOnlyOnBonusMonth() {
        assertEquals(65000.0, SalaryCalculator.applyBonus(60000.0, 3, 3, 5000.0), 0.01);
    }

    @Test
    void applyBonus_noChangeOnOtherMonths() {
        assertEquals(60000.0, SalaryCalculator.applyBonus(60000.0, 2, 3, 5000.0), 0.01);
    }

    // --- Random pickers ---

    @Test
    void pickRaiseMonth_returnsNegativeOneBelowSixMonths() {
        assertEquals(-1, SalaryCalculator.pickRaiseMonth(5));
    }

    @Test
    void pickRaiseMonth_returnsWithinRangeForLongerPeriods() {
        for (int i = 0; i < 100; i++) {
            int month = SalaryCalculator.pickRaiseMonth(12);
            assertTrue(month >= 2 && month <= 11, "raise month out of range: " + month);
        }
    }

    @Test
    void pickBonusMonth_returnsNegativeOneBelowFourMonths() {
        assertEquals(-1, SalaryCalculator.pickBonusMonth(3));
    }

    @Test
    void pickBonusMonth_returnsWithinRangeForLongerPeriods() {
        for (int i = 0; i < 100; i++) {
            int month = SalaryCalculator.pickBonusMonth(10);
            assertTrue(month >= 0 && month <= 9, "bonus month out of range: " + month);
        }
    }

    @Test
    void pickRaiseFactor_returnsBetweenFivePercentAndTwelvePercent() {
        for (int i = 0; i < 100; i++) {
            double factor = SalaryCalculator.pickRaiseFactor();
            assertTrue(factor >= 1.05 && factor <= 1.12, "raise factor out of range: " + factor);
        }
    }

    @Test
    void pickBonusAmount_returnsOneOfKnownAmounts() {
        List<Double> known = List.of(3000.0, 5000.0, 6500.0, 8000.0, 10000.0);
        for (int i = 0; i < 50; i++) {
            assertTrue(known.contains(SalaryCalculator.pickBonusAmount()));
        }
    }

    // --- Month abbreviation ---

    @Test
    void monthAbbrev_returnsThreeLetterCode() {
        assertEquals("APR", SalaryCalculator.monthAbbrev(4));
        assertEquals("JAN", SalaryCalculator.monthAbbrev(1));
    }
}
