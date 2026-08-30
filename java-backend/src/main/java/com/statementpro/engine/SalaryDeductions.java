package com.statementpro.engine;

public record SalaryDeductions(double professionalTax, double pfEmployeeContribution, double tds) {
    public double total() {
        return Math.round((professionalTax + pfEmployeeContribution + tds) * 100.0) / 100.0;
    }
}
