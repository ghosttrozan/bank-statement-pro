package com.statementpro.pdf;

public final class PdfTemplateFactory {

    private PdfTemplateFactory() {}

    public static StatementTemplate forBankStyle(String bankStyle) {
        if ("SBI2".equalsIgnoreCase(bankStyle)) {
            return new Sbi2Template();
        }
        if ("BOB".equalsIgnoreCase(bankStyle) || "BANK OF BARODA".equalsIgnoreCase(bankStyle)) {
            return new BobTemplate();
        }
        if ("AXIS".equalsIgnoreCase(bankStyle) || "AXIS BANK".equalsIgnoreCase(bankStyle)) {
            return new AxisTemplate();
        }
        if ("PNB".equalsIgnoreCase(bankStyle) || "PUNJAB NATIONAL BANK".equalsIgnoreCase(bankStyle)) {
            return new PnbTemplate();
        }
        if ("INDUSIND".equalsIgnoreCase(bankStyle) || "INDUSIND BANK".equalsIgnoreCase(bankStyle) || "INDIE".equalsIgnoreCase(bankStyle)) {
            return new IndusindTemplate();
        }
        if ("KOTAK".equalsIgnoreCase(bankStyle) || "KOTAK MAHINDRA BANK".equalsIgnoreCase(bankStyle) || "KOTAK MAHINDRA".equalsIgnoreCase(bankStyle)) {
            return new KotakTemplate();
        }
        return new StandardBankTemplate();
    }
}
