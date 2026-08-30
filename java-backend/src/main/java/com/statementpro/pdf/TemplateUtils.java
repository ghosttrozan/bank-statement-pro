package com.statementpro.pdf;

import com.statementpro.model.Transaction;

import java.util.ArrayList;
import java.util.List;

public final class TemplateUtils {

    private TemplateUtils() {}

    public static List<List<Transaction>> chunkTransactions(List<Transaction> transactions, int firstPageSize, int nextPageSize) {
        List<List<Transaction>> pages = new ArrayList<>();
        if (transactions == null || transactions.isEmpty()) {
            pages.add(List.of());
            return pages;
        }
        pages.add(new ArrayList<>(transactions.subList(0, Math.min(firstPageSize, transactions.size()))));
        int idx = firstPageSize;
        while (idx < transactions.size()) {
            int end = Math.min(idx + nextPageSize, transactions.size());
            pages.add(new ArrayList<>(transactions.subList(idx, end)));
            idx += nextPageSize;
        }
        return pages;
    }

    public static String formatCurrency(Double val) {
        if (val == null) return "";
        double absVal = Math.abs(val);
        long integerPart = (long) Math.floor(absVal);
        long fractionalPart = Math.round((absVal - integerPart) * 100);
        if (fractionalPart == 100) {
            integerPart += 1;
            fractionalPart = 0;
        }
        String intStr = Long.toString(integerPart);
        StringBuilder sb = new StringBuilder();
        if (intStr.length() <= 3) {
            sb.append(intStr);
        } else {
            String last3 = intStr.substring(intStr.length() - 3);
            String rest = intStr.substring(0, intStr.length() - 3);
            StringBuilder restSb = new StringBuilder();
            for (int i = 0; i < rest.length(); i++) {
                if (i > 0 && (rest.length() - i) % 2 == 0) {
                    restSb.append(',');
                }
                restSb.append(rest.charAt(i));
            }
            sb.append(restSb).append(',').append(last3);
        }
        if (val < 0) {
            sb.insert(0, '-');
        }
        sb.append('.').append(String.format("%02d", fractionalPart));
        return sb.toString();
    }

    public static String formatAddress4Lines(String address) {
        if (address == null || address.isEmpty()) return "";
        List<String> parts = new ArrayList<>();
        for (String part : address.split("[\n,]+")) {
            String trimmed = part.trim();
            if (!trimmed.isEmpty()) parts.add(trimmed);
        }
        if (parts.isEmpty()) return "";
        if (parts.size() <= 4) return String.join("\n", parts);
        return String.join("\n", parts.get(0), parts.get(1), parts.get(2),
                String.join(", ", parts.subList(3, parts.size())));
    }
}
