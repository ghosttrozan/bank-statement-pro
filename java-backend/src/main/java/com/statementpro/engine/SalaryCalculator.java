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
                String cmsRef = "CMS" + RandomUtils.randRange(1000, 9999) + RandomUtils.randRange(100000, 999999);
                if (variant == 1) {
                    yield "BY TRANSFER-NEFT*SBIN0007458*" + cmsRef + "*" + companyName + "*Salary-";
                } else if (variant == 2) {
                    yield "BY TRANSFER-CMS/" + cmsRef + "/" + companyName + "/SALARY FOR " + monthStr;
                } else {
                    yield "BY TRANSFER-NEFT*IN" + neftRef.substring(1) + "*" + companyName + "*Salary-";
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
        String company = settings.companyName() != null && !settings.companyName().isBlank()
                ? settings.companyName().trim().toUpperCase()
                : RandomUtils.pick(SALARY_COMPANIES);

        double amount = settings.monthlySalary() != null && settings.monthlySalary() > 0
                ? settings.monthlySalary()
                : getRandomSalaryAmount();

        return new SalaryInfo(company, amount);
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

    private static final double PF_RATE = 0.06;
    private static final double PF_CAP = 4200.0;
    private static final double PROFESSIONAL_TAX = 200.0;
    private static final double DEDUCTION_FLOOR = 20000.0;
    private static final double TDS_THRESHOLD = 70000.0;
    private static final double TDS_RATE = 0.05;

    public static SalaryDeductions computeDeductions(double netSalary) {
        if (netSalary < DEDUCTION_FLOOR) {
            return new SalaryDeductions(0.0, 0.0, 0.0);
        }
        double pf = round2(Math.min(netSalary * PF_RATE, PF_CAP));
        double tds = netSalary > TDS_THRESHOLD ? round2(netSalary * TDS_RATE) : 0.0;
        return new SalaryDeductions(PROFESSIONAL_TAX, pf, tds);
    }

    public static double applyRaise(double baseSalary, int monthIndex, int raiseMonth, double raiseFactor) {
        if (raiseMonth < 0 || monthIndex < raiseMonth) {
            return baseSalary;
        }
        return Math.round(baseSalary * raiseFactor / 10.0) * 10.0;
    }

    public static double applyMonthlyVariance(double amount, boolean isManual) {
        if (isManual) {
            return amount;
        }
        int roll = RandomUtils.randRange(0, 99);
        if (roll < 12) {
            return round2(amount + RandomUtils.randRange(500, 2500));
        }
        if (roll < 22) {
            return round2(amount - RandomUtils.randRange(300, 1800));
        }
        return round2(amount);
    }

    public static double applyBonus(double amount, int monthIndex, int bonusMonth, double bonusAmount) {
        return monthIndex == bonusMonth ? round2(amount + bonusAmount) : amount;
    }

    public static int pickRaiseMonth(int numMonths) {
        return numMonths >= 6 ? RandomUtils.randRange(2, numMonths - 1) : -1;
    }

    public static int pickBonusMonth(int numMonths) {
        return numMonths >= 4 ? RandomUtils.randRange(0, numMonths - 1) : -1;
    }

    public static double pickRaiseFactor() {
        return 1.0 + RandomUtils.randRange(5, 12) / 100.0;
    }

    public static double pickBonusAmount() {
        return RandomUtils.pick(List.of(3000.0, 5000.0, 6500.0, 8000.0, 10000.0));
    }

    public static String monthAbbrev(int monthValue) {
        return MONTH_NAMES[monthValue - 1];
    }

    private static double round2(double value) {
        return Math.round(value * 100.0) / 100.0;
    }
}
