package com.statementpro.model;

import java.util.List;

public record StatementRecord(
        String id,
        String createdAt,
        CustomerDetails customerDetails,
        BranchDetails branchDetails,
        AccountInfo accountInfo,
        StatementSettings settings,
        List<Transaction> transactions,
        double closingBalance,
        double totalCredits,
        double totalDebits,
        int drCount,
        int crCount
) {}
