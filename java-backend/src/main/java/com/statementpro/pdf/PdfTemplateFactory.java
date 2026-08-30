package com.statementpro.pdf;

public final class PdfTemplateFactory {

    private PdfTemplateFactory() {}

    public static StatementTemplate forBankStyle(String bankStyle) {
        if ("SBI2".equalsIgnoreCase(bankStyle)) {
            return new Sbi2Template();
        }
        return new StandardBankTemplate();
    }
}
