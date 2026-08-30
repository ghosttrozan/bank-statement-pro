package com.statementpro.model;

public record CustomerDetails(
        String accountHolderName,
        String email,
        String address,
        String accountNumber,
        String cifNumber,
        String accountOpenDate,
        String nomineeName,
        String city,
        String pinCode
) {}
