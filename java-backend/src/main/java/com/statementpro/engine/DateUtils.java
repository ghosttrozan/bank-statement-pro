package com.statementpro.engine;

import com.statementpro.model.StatementSettings;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.OffsetDateTime;
import java.time.format.DateTimeFormatter;

public final class DateUtils {

    private DateUtils() {}

    public static int getDurationDays(String duration) {
        if (duration == null) return 180;
        return switch (duration) {
            case "1 Month" -> 30;
            case "2 Months" -> 60;
            case "3 Months" -> 90;
            case "6 Months" -> 180;
            case "12 Months" -> 365;
            default -> 180;
        };
    }

    public static int getPageToTxCount(String pageCount, int customVal) {
        if (pageCount == null) return 125;
        return switch (pageCount) {
            case "1 Page" -> 12;
            case "2 Pages" -> 28;
            case "3 Pages" -> 48;
            case "5 Pages" -> 88;
            case "6 Pages" -> 125;
            case "8 Pages" -> 175;
            case "10 Pages" -> 220;
            case "12 Pages" -> 270;
            case "15 Pages" -> 330;
            case "20 Pages" -> 450;
            case "30 Pages" -> 680;
            case "Custom" -> Math.max(5, Math.min(2000, customVal));
            default -> 125;
        };
    }

    public static String formatDate(LocalDate date) {
        return date.format(DateTimeFormatter.ofPattern("dd/MM/yyyy"));
    }

    public static String isoToIndianFormat(String isoStr) {
        if (isoStr == null || isoStr.isEmpty()) return "";
        String[] parts = isoStr.split("-");
        if (parts.length != 3) return isoStr;
        return parts[2] + "-" + parts[1] + "-" + parts[0];
    }

    public static DateRange getDateRange(StatementSettings settings, String localTime) {
        if ("custom".equals(settings.generationMode()) && settings.fromDate() != null && settings.toDate() != null) {
            LocalDateTime start = LocalDate.parse(settings.fromDate()).atStartOfDay();
            LocalDateTime end = LocalDate.parse(settings.toDate()).atTime(23, 59, 59, 999_000_000);
            return new DateRange(start, end);
        }

        LocalDateTime current;
        if (localTime != null && !localTime.isBlank()) {
            try {
                if (localTime.endsWith("Z") || (localTime.length() > 19 && (localTime.contains("+") || localTime.substring(19).contains("-")))) {
                    current = OffsetDateTime.parse(localTime).toLocalDateTime();
                } else if (localTime.length() == 10) {
                    current = LocalDate.parse(localTime).atStartOfDay();
                } else {
                    current = LocalDateTime.parse(localTime);
                }
            } catch (Exception e) {
                current = LocalDateTime.now();
            }
        } else {
            current = LocalDateTime.now();
        }

        LocalDateTime end = current.toLocalDate().atTime(23, 59, 59, 999_000_000);
        int durationDays = getDurationDays(settings.duration());
        LocalDateTime start = end.toLocalDate().minusDays(durationDays).atStartOfDay();

        return new DateRange(start, end);
    }
}
