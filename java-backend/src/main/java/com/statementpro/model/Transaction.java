package com.statementpro.model;

public record Transaction(
        String id,
        String valueDate,
        String postDate,
        String details,
        String refNo,
        Double debit,
        Double credit,
        double balance
) {
    public Transaction withBalance(double newBalance) {
        return new Transaction(id, valueDate, postDate, details, refNo, debit, credit, newBalance);
    }
}
