package com.statementpro.model;

public record BranchDetails(
        String branchName,
        String branchAddress,
        String branchCode,
        String branchEmail,
        String branchPhone,
        String ifscCode,
        String micrCode,
        String ckycrNumber,
        String city,
        String pinCode
) {}
