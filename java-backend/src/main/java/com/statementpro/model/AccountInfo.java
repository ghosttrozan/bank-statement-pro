package com.statementpro.model;

public record AccountInfo(
        double openingBalance,
        double interestRate,
        String currency,
        String accountStatus,
        String accountType
) {}
