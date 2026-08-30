package com.statementpro.engine;

import com.statementpro.model.StatementSettings;

import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.YearMonth;
import java.util.List;

public final class SalaryCalculator {

    private SalaryCalculator() {}

    private static final String[] MONTH_NAMES = {
            "JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"
    };

    private static final List<String> SALARY_COMPANIES = List.of(
            "TATA STEEL LIMITED", "TATA CONSULTANCY SERVICES LTD", "INFOSYS LIMITED",
            "WIPRO LIMITED", "HCL TECHNOLOGIES LTD", "TECH MAHINDRA LTD",
            "COGNIZANT TECHNOLOGY SOLUTIONS", "ACCENTURE SOLUTIONS PVT LTD",
            "AMAZON DEVELOPMENT CENTRE", "RELIANCE INDUSTRIES LTD", "ITC LIMITED");

    public static String buildSalaryNeftNarrative(String bankStyle, String companyName, LocalDate date) {
        String neftRef = "N" + RandomUtils.randRange(20, 25) + RandomUtils.randRange(100, 999) + randomDigits(9);
        String monthStr = MONTH_NAMES[date.getMonthValue() - 1];
        int yearStr = date.getYear();
        int variant = RandomUtils.randRange(1, 3);

        return switch (bankStyle) {
            case "BOI" -> variant == 1
                    ? "NEFT/ICIC" + neftRef + "/CR/" + companyName + " SALARY CREDIT"
                    : "NEFT/UTIB" + neftRef + "/CR/" + companyName + " SALARY FOR " + monthStr + " " + yearStr;
            case "PNB" -> "NEFT/PUNB" + neftRef + "/CR/" + companyName + " SALARY FOR " + monthStr + " " + yearStr;
            case "Kotak" -> variant == 1
                    ? "NEFT CR-KKBK" + neftRef + "-" + companyName + "-SALARY"
                    : "CMS CR-" + companyName + "-SALARY PAYROLL-" + neftRef.substring(0, Math.min(10, neftRef.length()));
            default -> {
                if (variant == 1) {
                    yield "BY TRANSFER-NEFT*" + neftRef + "*" + companyName + "*SALARY CREDIT";
                } else if (variant == 2) {
                    yield "BY TRANSFER-CMS/" + neftRef + "/" + companyName + "/SALARY FOR " + monthStr;
                } else {
                    yield "BY TRANSFER-NEFT*IN" + neftRef.substring(1) + "*" + companyName + "*SALARY CREDIT";
                }
            }
        };
    }

    public static String buildSOLNarrative() {
        List<java.util.function.Supplier<String>> ipRanges = List.of(
                () -> "106.202." + RandomUtils.randRange(1, 254) + "." + RandomUtils.randRange(1, 254),
                () -> "110.227." + RandomUtils.randRange(1, 254) + "." + RandomUtils.randRange(1, 254),
                () -> "223.181." + RandomUtils.randRange(1, 254) + "." + RandomUtils.randRange(1, 254),
                () -> "27.59." + RandomUtils.randRange(1, 254) + "." + RandomUtils.randRange(1, 254));
        String txnId = randomDigits(12);
        String ip = RandomUtils.pick(ipRanges).get();
        return txnId + "//SOL/" + ip;
    }

    public static SalaryInfo getSalaryInfo(StatementSettings settings) {
        if ("manual".equals(settings.salaryMode()) && settings.companyName() != null
                && settings.monthlySalary() != null && settings.monthlySalary() > 0) {
            return new SalaryInfo(settings.companyName().trim().toUpperCase(), Math.round(settings.monthlySalary()));
        }
        return new SalaryInfo(RandomUtils.pick(SALARY_COMPANIES), getRandomSalaryAmount());
    }

    private static double getRandomSalaryAmount() {
        int raw = RandomUtils.randRange(38000, 145000);
        return Math.round(raw / 100.0) * 100 + RandomUtils.pick(List.of(0, 250, 450, 650, 800));
    }

    private static int getSalaryDayOfMonth(StatementSettings settings) {
        if (settings.salaryDay() == null) return 1;
        if ("last_day".equals(settings.salaryDay())) return 0;
        try {
            int num = Integer.parseInt(settings.salaryDay());
            if (num >= 1 && num <= 31) return num;
        } catch (NumberFormatException ignored) {
            // falls through to default
        }
        return 1;
    }

    private static LocalDate adjustSalaryDate(LocalDate date) {
        return date.getDayOfWeek() == DayOfWeek.SUNDAY ? date.minusDays(1) : date;
    }

    private static LocalDate getLastWorkingDay(int year, int month) {
        LocalDate lastDay = YearMonth.of(year, month + 1).atEndOfMonth();
        return adjustSalaryDate(lastDay);
    }

    public static LocalDate getSalaryDateForMonth(int year, int month, StatementSettings settings) {
        int targetDay = getSalaryDayOfMonth(settings);
        if (targetDay == 0) {
            return getLastWorkingDay(year, month);
        }
        int daysInMonth = YearMonth.of(year, month + 1).lengthOfMonth();
        int actualDay = Math.min(targetDay, daysInMonth);
        return adjustSalaryDate(LocalDate.of(year, month + 1, actualDay));
    }

    public static String buildSBIntNarrative(String accountNumber, String fromDate, String toDate, String bankStyle) {
        if ("Kotak".equals(bankStyle) || "IndusInd".equals(bankStyle)) {
            return "INT PAID ON SB ACCOUNT";
        }
        return accountNumber + ":SBInt.Pd:" + fromDate + " to " + toDate;
    }

    private static String randomDigits(int length) {
        StringBuilder sb = new StringBuilder(length);
        for (int i = 0; i < length; i++) sb.append(RandomUtils.randRange(0, 9));
        return sb.toString();
    }
}
