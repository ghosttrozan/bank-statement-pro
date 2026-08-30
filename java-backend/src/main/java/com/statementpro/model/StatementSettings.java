package com.statementpro.model;

public record StatementSettings(
        String bankStyle,
        String duration,
        String generationMode,
        String fromDate,
        String toDate,
        String pageCount,
        int customTransactionsCount,
        String transactionMode,
        String profile,
        String salaryMode,
        String companyName,
        Double monthlySalary,
        String salaryDay,
        String pdfPassword,
        Boolean enablePdfPassword
) {
    public StatementSettings withProfile(String newProfile) {
        return new StatementSettings(bankStyle, duration, generationMode, fromDate, toDate,
                pageCount, customTransactionsCount, transactionMode, newProfile, salaryMode,
                companyName, monthlySalary, salaryDay, pdfPassword, enablePdfPassword);
    }
}
