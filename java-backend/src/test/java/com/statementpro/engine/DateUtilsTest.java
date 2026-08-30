package com.statementpro.engine;

import com.statementpro.model.StatementSettings;
import org.junit.jupiter.api.Test;
import java.time.LocalDate;

import static org.junit.jupiter.api.Assertions.assertEquals;

class DateUtilsTest {

    @Test
    void durationMapsToExpectedDays() {
        assertEquals(30, DateUtils.getDurationDays("1 Month"));
        assertEquals(90, DateUtils.getDurationDays("3 Months"));
        assertEquals(365, DateUtils.getDurationDays("12 Months"));
        assertEquals(180, DateUtils.getDurationDays("unknown"));
    }

    @Test
    void pageCountMapsToExpectedTxCount() {
        assertEquals(12, DateUtils.getPageToTxCount("1 Page", 20));
        assertEquals(310, DateUtils.getPageToTxCount("20 Pages", 20));
        assertEquals(20, DateUtils.getPageToTxCount("Custom", 20));
        assertEquals(5, DateUtils.getPageToTxCount("Custom", 1));
        assertEquals(2000, DateUtils.getPageToTxCount("Custom", 9999));
    }

    @Test
    void formatDateProducesDdMmYyyy() {
        assertEquals("05/04/2026", DateUtils.formatDate(LocalDate.of(2026, 4, 5)));
    }

    @Test
    void customDateRangeUsesFromAndToDates() {
        StatementSettings settings = new StatementSettings(
                "SBI", "3 Months", "custom", "2026-01-01", "2026-01-31",
                "5 Pages", 0, "Normal", "Personal", "auto",
                null, null, "1", null, false);

        DateRange range = DateUtils.getDateRange(settings, null);
        assertEquals(LocalDate.of(2026, 1, 1), range.start().toLocalDate());
        assertEquals(LocalDate.of(2026, 1, 31), range.end().toLocalDate());
    }
}
