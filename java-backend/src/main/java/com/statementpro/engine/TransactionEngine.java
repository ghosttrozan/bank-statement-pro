package com.statementpro.engine;

import com.statementpro.model.*;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.time.temporal.ChronoUnit;
import java.util.*;
import java.util.function.Function;

public final class TransactionEngine {

    private TransactionEngine() {}

    private record WeightedTemplate(Function<String, DetailAndAmount> detailAndAmount, int weight) implements Weighted {
        public int weight() { return weight; }
    }

    public static List<Transaction> generateStatementTransactions(
            StatementSettings settings, AccountInfo info, String localTime,
            CustomerDetails customer, BranchDetails branch) {

        StatementSettings businessSettings = settings.withProfile("Business");
        AccountInfo businessInfo = (info.openingBalance() > 0 && info.openingBalance() != 90000.00)
                ? info
                : new AccountInfo(90000.00, info.interestRate(), info.currency(), info.accountStatus(), info.accountType());

        return generateRawSalariedTransactions(businessSettings, businessInfo, localTime, customer, branch);
    }

    public static List<Transaction> generateSalariedStatementTransactions(
            StatementSettings settings, AccountInfo info, String localTime,
            CustomerDetails customer, BranchDetails branch) {

        StatementSettings salariedSettings = settings.withProfile("Personal");
        double opening = (info.openingBalance() <= 0 || info.openingBalance() == 90000.00)
                ? RandomUtils.pick(List.of(1)) * 0 + com.statementpro.engine.RandomUtils.randRange(1, 1) * 0 + getRandomOpeningBalance()
                : info.openingBalance();
        AccountInfo salariedInfo = new AccountInfo(opening, info.interestRate(), info.currency(), info.accountStatus(), info.accountType());

        return generateRawSalariedTransactions(salariedSettings, salariedInfo, localTime, customer, branch);
    }

    private static double getRandomOpeningBalance() {
        int baseThousand = RandomUtils.pick(List.of(47, 53, 68, 72, 87, 91, 104, 118, 132, 145));
        int oddHundreds = RandomUtils.randRange(1, 9) * 100 + RandomUtils.randRange(1, 9) * 10 + RandomUtils.randRange(1, 9);
        double paise = RandomUtils.randomPaise();
        return baseThousand * 1000 + oddHundreds + paise;
    }

    private static String generateRefNo(String bankStyle) {
        StringBuilder sb = new StringBuilder(12);
        for (int i = 0; i < 12; i++) sb.append(RandomUtils.randRange(0, 9));
        String digits = sb.toString();
        return "IndusInd".equals(bankStyle) ? "S" + digits.substring(0, 8) : digits;
    }

    private static List<Transaction> generateRawSalariedTransactions(
            StatementSettings settings, AccountInfo info, String localTime,
            CustomerDetails customer, BranchDetails branch) {

        DateRange range = DateUtils.getDateRange(settings, localTime);
        LocalDate startDay = range.start().toLocalDate();
        LocalDate endDay = range.end().toLocalDate();
        String bankStyle = settings.bankStyle();
        SalaryInfo salaryInfo = SalaryCalculator.getSalaryInfo(settings);
        GeoInfo geoInfo = GeoUtils.detectPrimaryCity(customer, branch);

        record MonthRange(LocalDate start, LocalDate end) {}
        List<MonthRange> monthsList = new ArrayList<>();
        LocalDate mCurr = startDay.withDayOfMonth(1);
        while (!mCurr.isAfter(endDay)) {
            LocalDate mStart = mCurr.withDayOfMonth(1);
            LocalDate mEnd = mCurr.withDayOfMonth(mCurr.lengthOfMonth());
            LocalDate actualStart = mStart.isBefore(startDay) ? startDay : mStart;
            LocalDate actualEnd = mEnd.isAfter(endDay) ? endDay : mEnd;
            if (!actualStart.isAfter(actualEnd)) {
                monthsList.add(new MonthRange(actualStart, actualEnd));
            }
            mCurr = mCurr.plusMonths(1);
        }

        int numMonths = Math.max(1, monthsList.size());
        // Natural target: 24 to 27 transactions per month (matching Neha Sharma's ~25.7/mo)
        int defaultPerMonth = RandomUtils.randRange(24, 27);
        int targetTxCount = ("Custom".equals(settings.pageCount()) && settings.customTransactionsCount() > 0)
                ? settings.customTransactionsCount()
                : (numMonths * defaultPerMonth);

        int initialOpeningBal = (int) (info.openingBalance() > 0 ? info.openingBalance() : 90000.00);
        double initialOpening = info.openingBalance() > 0 ? info.openingBalance() : 90000.00;
        double[] runningBal = { Math.round(initialOpening * 100.0) / 100.0 };

        int basePerMonth = Math.max(3, targetTxCount / numMonths);
        int[] remainingTxs = { targetTxCount - (basePerMonth * numMonths) };

        List<Transaction> totalTxs = new ArrayList<>();

        List<WeightedTemplate> debitTemplates = List.of(
                new WeightedTemplate(style -> AmountGenerator.getMerchantDebit(style), 40),
                new WeightedTemplate(style -> {
                    boolean isMicro = RandomUtils.randRange(0, 99) < 65;
                    return new DetailAndAmount(NarrativeBuilder.buildUpiNarrative(false, style, null), AmountGenerator.getP2pDebitAmount(isMicro));
                }, 28),
                new WeightedTemplate(style -> {
                    int cardLast4 = RandomUtils.randRange(1000, 9999);
                    String loc = RandomUtils.pick(geoInfo.posLocations());
                    double amt = Math.round((RandomUtils.randRange(350, 3200) + RandomUtils.randomPaise()) * 100.0) / 100.0;
                    return new DetailAndAmount("POS 451239******" + cardLast4 + " " + loc, amt);
                }, 8),
                new WeightedTemplate(style -> {
                    String atmLoc = RandomUtils.pick(geoInfo.atmLocations());
                    int atmId = RandomUtils.randRange(1000, 9999);
                    String detail = "Kotak".equals(style)
                            ? "ATM WDL-CARD " + atmId + "-" + atmLoc
                            : "TO ATM WD-ATM CARD-" + atmId + " " + atmLoc;
                    return new DetailAndAmount(detail, RandomUtils.pick(List.of(500.0, 1000.0, 1500.0, 2000.0, 3000.0, 5000.0, 10000.0)));
                }, 12),
                new WeightedTemplate(style -> {
                    int option = RandomUtils.randRange(1, 2);
                    return switch (option) {
                        case 1 -> new DetailAndAmount("NETC FASTAG RECHARGE - ICICI BANK", RandomUtils.pick(List.of(300.0, 500.0, 1000.0, 1500.0)));
                        default -> new DetailAndAmount("UPI/DR/AIRTEL BROADBAND/AIRP/airtel.bill@airtel/Paymen", RandomUtils.pick(List.of(799.00, 943.00, 1179.00, 1499.00)));
                    };
                }, 6),
                new WeightedTemplate(style -> {
                    int option = RandomUtils.randRange(1, 4);
                    return switch (option) {
                        case 1 -> new DetailAndAmount("ACH DR-NETFLIX ENTERTAINMENT/" + RandomUtils.randRange(100000, 999999), RandomUtils.pick(List.of(199.00, 499.00, 649.00)));
                        case 2 -> new DetailAndAmount("ACH DR-NIPPON INDIA MF SIP/" + RandomUtils.randRange(100000, 999999), RandomUtils.pick(List.of(1000.00, 2500.00, 5000.00)));
                        case 3 -> new DetailAndAmount("ACH DR-BAJAJ FINANCE EMI/" + RandomUtils.randRange(10000000, 99999999), RandomUtils.pick(List.of(2480.00, 3450.00, 4890.00)));
                        default -> new DetailAndAmount("ACH DR-HDB FINANCIAL SERVICES/" + RandomUtils.randRange(100000, 999999), RandomUtils.pick(List.of(3200.00, 5400.00, 6250.00)));
                    };
                }, 6)
        );

        List<WeightedTemplate> creditTemplates = List.of(
                new WeightedTemplate(style -> new DetailAndAmount(
                        NarrativeBuilder.buildUpiNarrative(true, style, null), AmountGenerator.getContinuousCreditAmount()), 60),
                new WeightedTemplate(style -> new DetailAndAmount(
                        RandomUtils.pick(List.of(
                                "UPI/REFUND/SWIGGY/REF" + RandomUtils.randRange(100000, 999999) + "/CREDIT",
                                "UPI/FAILED TXN REVERSAL/" + RandomUtils.genRef(),
                                "UPI/REFUND/ZOMATO/REF" + RandomUtils.randRange(100000, 999999) + "/CREDIT",
                                "UPI/REFUND/BLINKIT/REF" + RandomUtils.randRange(100000, 999999) + "/CREDIT")),
                        AmountGenerator.getRefundAmount()), 28),
                new WeightedTemplate(style -> new DetailAndAmount(
                        NarrativeBuilder.buildUpiNarrative(true, style, null),
                        Math.round((RandomUtils.randRange(500, 2500) + RandomUtils.randomPaise()) * 100.0) / 100.0), 12)
        );

        for (int idx = 0; idx < monthsList.size(); idx++) {
            MonthRange mRange = monthsList.get(idx);
            int countForThisMonth = basePerMonth;
            if (remainingTxs[0] > 0) {
                countForThisMonth += 1;
                remainingTxs[0] -= 1;
            }

            int totalDays = (int) Math.max(1, ChronoUnit.DAYS.between(mRange.start(), mRange.end()) + 1);
            int[] dailyAllocation = new int[totalDays];
            Set<Integer> restDayIndices = new HashSet<>();

            if (idx == monthsList.size() / 2) {
                int blockStart = RandomUtils.randRange(10, Math.max(10, totalDays - 6));
                for (int b = 0; b < 4; b++) restDayIndices.add(blockStart + b);
            }

            int restAttempts = 0;
            while (restDayIndices.size() < 7 && restAttempts < 100) {
                restAttempts++;
                int rDay = RandomUtils.randRange(0, totalDays - 1);
                restDayIndices.add(rDay);
                if (rDay + 1 < totalDays && restDayIndices.size() < 7 && RandomUtils.randRange(0, 99) < 60) {
                    restDayIndices.add(rDay + 1);
                }
            }

            List<Integer> activeDays = new ArrayList<>();
            for (int d = 0; d < totalDays; d++) {
                if (!restDayIndices.contains(d)) {
                    dailyAllocation[d] = 1;
                    activeDays.add(d);
                }
            }

            int unassigned = Math.max(0, countForThisMonth - activeDays.size());
            int attempts = 0;
            while (unassigned > 0 && attempts < 1000 && !activeDays.isEmpty()) {
                attempts++;
                int randomDay = RandomUtils.pick(activeDays);
                // Cap daily transactions strictly at 2 (matches Neha Sharma: 87 days 1 txn, 8 days 2 txns)
                if (dailyAllocation[randomDay] < 2) {
                    dailyAllocation[randomDay]++;
                    unassigned--;
                }
            }

            List<Integer> availableHours = new ArrayList<>(List.of(9, 11, 13, 15, 17, 19, 20, 21));

            // Monthly recurring anchors (guaranteed 1 electricity bill & 1 mobile recharge per month)
            boolean electricityBilled = false;
            boolean mobileRecharged = false;

            for (int dayOffset = 0; dayOffset < totalDays; dayOffset++) {
                int dayTxCount = dailyAllocation[dayOffset];
                if (dayTxCount == 0) continue;

                LocalDate txDate = mRange.start().plusDays(dayOffset);
                if (txDate.isAfter(mRange.end())) txDate = mRange.end();

                List<Integer> shuffledHours = new ArrayList<>(availableHours);
                Collections.shuffle(shuffledHours);
                List<Integer> dayHours = new ArrayList<>(shuffledHours.subList(0, Math.min(dayTxCount, shuffledHours.size())));
                Collections.sort(dayHours);

                for (int k = 0; k < dayTxCount; k++) {
                    int hour = k < dayHours.size() ? dayHours.get(k) : RandomUtils.randRange(9, 21);
                    LocalDateTime txTime = txDate.atTime(LocalTime.of(hour, RandomUtils.randRange(0, 59), RandomUtils.randRange(0, 59)));

                    boolean isCredit;
                    DetailAndAmount picked;

                    // Anchor 1: Guaranteed Electricity bill between 3rd and 8th of month
                    if (!electricityBilled && txDate.getDayOfMonth() >= 3 && txDate.getDayOfMonth() <= 8) {
                        isCredit = false;
                        double amt = Math.round((RandomUtils.randRange(1850, 3200) + RandomUtils.randomPaise()) * 100.0) / 100.0;
                        picked = new DetailAndAmount("BBPS/ELECTRICITY BILL PAY/TATA POWER", amt);
                        electricityBilled = true;
                    }
                    // Anchor 2: Guaranteed Mobile Recharge between 19th and 26th of month
                    else if (!mobileRecharged && txDate.getDayOfMonth() >= 19 && txDate.getDayOfMonth() <= 26) {
                        isCredit = false;
                        double amt = RandomUtils.pick(List.of(299.00, 349.00, 666.00, 719.00));
                        picked = new DetailAndAmount("UPI/DR/JIO RECHARGE/PAYTM/jio.recharge@paytm/Paymen", amt);
                        mobileRecharged = true;
                    } else {
                        // Natural 36% credit probability matching Neha Sharma (total credits ~37-38%)
                        isCredit = RandomUtils.randRange(0, 99) < 36;
                        WeightedTemplate tmpl = RandomUtils.weightedPick(isCredit ? creditTemplates : debitTemplates);
                        picked = tmpl.detailAndAmount().apply(bankStyle);
                    }

                    double amount = Math.round(picked.amount() * 100.0) / 100.0;

                    if (isCredit) {
                        runningBal[0] += amount;
                    } else {
                        if (runningBal[0] - amount < 200) {
                            runningBal[0] = Math.max(500, runningBal[0]);
                        }
                        runningBal[0] -= amount;
                    }
                    runningBal[0] = Math.round(runningBal[0] * 100.0) / 100.0;
                    String dateStr = DateUtils.formatDate(txTime.toLocalDate());

                    totalTxs.add(new Transaction(
                            "tx_" + idx + "_" + dayOffset + "_" + k + "_" + txTime.toEpochSecond(java.time.ZoneOffset.UTC),
                            dateStr, dateStr, picked.detail(), generateRefNo(bankStyle),
                            isCredit ? null : amount, isCredit ? amount : null, runningBal[0]));
                }
            }
        }

        boolean isManualSalary = "manual".equalsIgnoreCase(settings.salaryMode())
                || (settings.monthlySalary() != null && settings.monthlySalary() > 0)
                || (settings.companyName() != null && !settings.companyName().isBlank());
        LocalDate salaryMonthDate = startDay.withDayOfMonth(1);
        int monthIndex = 0;
        while (!salaryMonthDate.isAfter(endDay)) {
            int year = salaryMonthDate.getYear();
            int month = salaryMonthDate.getMonthValue() - 1;
            LocalDate salaryDate = SalaryCalculator.getSalaryDateForMonth(year, month, settings);
            LocalDateTime salaryDateTime = salaryDate.atStartOfDay();

            if (salaryDate.isBefore(startDay)) {
                salaryDateTime = startDay.plusDays(1).atTime(9, 30);
            }
            if (salaryDate.isAfter(endDay)) {
                salaryDateTime = endDay.minusDays(1).atTime(10, 15);
            }
            LocalDate finalSalaryDate = salaryDateTime.toLocalDate();

            if (!finalSalaryDate.isBefore(startDay) && !finalSalaryDate.isAfter(endDay)) {
                String dateStr = DateUtils.formatDate(finalSalaryDate);
                String narrative = SalaryCalculator.buildSalaryNeftNarrative(bankStyle, salaryInfo.company(), finalSalaryDate);

                double salaryCreditAmount = salaryInfo.amount();
                if (!isManualSalary) {
                    salaryCreditAmount = SalaryCalculator.applyMonthlyVariance(salaryCreditAmount, false);
                }

                totalTxs.add(new Transaction("tx_sal_" + finalSalaryDate + "_" + monthIndex,
                        dateStr, dateStr, narrative, generateRefNo(bankStyle), null, salaryCreditAmount, 0));
            }
            salaryMonthDate = salaryMonthDate.plusMonths(1);
            monthIndex++;
        }

        boolean isSbi = "SBI".equalsIgnoreCase(bankStyle) || "SBI2".equalsIgnoreCase(bankStyle);
        int[] interestMonths = { 3, 6, 9, 12 };
        int startYear = startDay.getYear();
        int endYear = endDay.getYear();

        for (int y = startYear; y <= endYear; y++) {
            for (int im : interestMonths) {
                int day = 25;
                LocalDate iDate = LocalDate.of(y, im, day);
                if (iDate.getDayOfWeek() == java.time.DayOfWeek.SUNDAY) {
                    iDate = iDate.plusDays(1);
                }
                if (!iDate.isBefore(startDay) && !iDate.isAfter(endDay)) {
                    double interestAmount = Math.round((RandomUtils.randRange(180, 1450) + RandomUtils.randomPaise()) * 100.0) / 100.0;
                    String dateStr = DateUtils.formatDate(iDate);
                    LocalDate periodFromDate = iDate.minusMonths(3).plusDays(1);
                    LocalDate periodToDate = iDate;
                    String periodFrom = DateUtils.formatDate(periodFromDate);
                    String periodTo = DateUtils.formatDate(periodToDate);

                    String intNarrative = SalaryCalculator.buildSBIntNarrative("996018210007421", periodFrom, periodTo, bankStyle);
                    String intRef = isSbi ? "" : generateRefNo(bankStyle);

                    totalTxs.add(new Transaction("tx_interest_" + iDate, dateStr, dateStr,
                            intNarrative, intRef, null, interestAmount, 0));
                }
            }
        }

        totalTxs.sort((a, b) -> {
            long diff = parseDateStrMillis(a.valueDate()) - parseDateStrMillis(b.valueDate());
            if (diff != 0) return Long.compare(diff, 0);
            if (a.credit() != null && b.credit() == null) return -1;
            if (a.credit() == null && b.credit() != null) return 1;
            return 0;
        });

        List<Transaction> result = new ArrayList<>();
        double bal = Math.round(initialOpening * 100.0) / 100.0;
        final double minFloor = 500.00; // Strictly ensure balance NEVER drops below ₹500 (and NEVER negative!)

        for (Transaction tx : totalTxs) {
            if (tx.credit() != null) {
                bal += tx.credit();
                bal = Math.round(bal * 100.0) / 100.0;
                result.add(tx.withBalance(bal));
            } else if (tx.debit() != null) {
                double debitAmt = tx.debit();
                if (bal - debitAmt < minFloor) {
                    double maxAllowed = bal - minFloor;
                    if (maxAllowed > 45.00) {
                        // Safely scale down debit so balance stays above minFloor
                        double newDebit = Math.max(15.00, Math.floor(maxAllowed * (RandomUtils.randRange(45, 80) / 100.0) * 100.0) / 100.0);
                        bal -= newDebit;
                        bal = Math.round(bal * 100.0) / 100.0;
                        result.add(new Transaction(tx.id(), tx.valueDate(), tx.postDate(), tx.details(), tx.refNo(), newDebit, null, bal));
                    } else {
                        // Balance at/near floor: simulate natural inward UPI credit from friend/family to replenish funds
                        double creditAmt = Math.round((RandomUtils.randRange(1200, 3500) + RandomUtils.randomPaise()) * 100.0) / 100.0;
                        String creditNarrative = NarrativeBuilder.buildUpiNarrative(true, bankStyle, null);
                        bal += creditAmt;
                        bal = Math.round(bal * 100.0) / 100.0;
                        result.add(new Transaction(tx.id(), tx.valueDate(), tx.postDate(), creditNarrative, tx.refNo(), null, creditAmt, bal));
                    }
                } else {
                    bal -= debitAmt;
                    bal = Math.round(bal * 100.0) / 100.0;
                    result.add(tx.withBalance(bal));
                }
            }
        }
        return result;
    }

    private static long parseDateStrMillis(String str) {
        if (str == null || str.isEmpty()) return 0;
        String[] parts = str.split("[-/]");
        if (parts.length < 3) return 0;
        try {
            int day = Integer.parseInt(parts[0]);
            int month = Integer.parseInt(parts[1]);
            int year = Integer.parseInt(parts[2]);
            return LocalDate.of(year, month, day).toEpochDay();
        } catch (Exception e) {
            return 0;
        }
    }
}
