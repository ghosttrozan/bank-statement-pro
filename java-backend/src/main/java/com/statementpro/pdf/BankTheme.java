package com.statementpro.pdf;

public record BankTheme(String primaryColorHex, String headerTitle, String bankTagline) {

    public static BankTheme forStyle(String bankStyle) {
        if (bankStyle == null) {
            return new BankTheme("#005DAA", "STATE BANK OF INDIA", "ACCOUNT STATEMENT");
        }
        return switch (bankStyle) {
            case "BOI" -> new BankTheme("#E21A22", "BANK OF INDIA", "STATEMENT OF ACCOUNT");
            case "Kotak" -> new BankTheme("#ED1C24", "KOTAK MAHINDRA BANK", "ACCOUNT LEDGER STATEMENT");
            case "PNB" -> new BankTheme("#A21D21", "PUNJAB NATIONAL BANK", "ACCOUNT STATEMENT");
            default -> new BankTheme("#005DAA", "STATE BANK OF INDIA", "ACCOUNT STATEMENT");
        };
    }
}
