package com.statementpro.engine;

import com.statementpro.model.StatementSettings;
import org.junit.jupiter.api.Test;

import java.time.LocalDate;
import java.time.DayOfWeek;

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
}
