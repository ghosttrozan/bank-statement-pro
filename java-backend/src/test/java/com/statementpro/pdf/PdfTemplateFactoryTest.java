package com.statementpro.pdf;

import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertInstanceOf;

class PdfTemplateFactoryTest {

    @Test
    void sbi2StyleUsesSbi2Template() {
        assertInstanceOf(Sbi2Template.class, PdfTemplateFactory.forBankStyle("SBI2"));
    }

    @Test
    void otherStylesUseStandardTemplate() {
        assertInstanceOf(StandardBankTemplate.class, PdfTemplateFactory.forBankStyle("SBI"));
        assertInstanceOf(StandardBankTemplate.class, PdfTemplateFactory.forBankStyle("BOI"));
        assertInstanceOf(StandardBankTemplate.class, PdfTemplateFactory.forBankStyle("Kotak"));
        assertInstanceOf(StandardBankTemplate.class, PdfTemplateFactory.forBankStyle("PNB"));
    }
}
