package com.statementpro.pdf;

import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertInstanceOf;

class PdfTemplateFactoryTest {

    @Test
    void sbiStylesUseCorrectTemplates() {
        assertInstanceOf(SbiV1Template.class, PdfTemplateFactory.forBankStyle("SBI"));
        assertInstanceOf(SbiV1Template.class, PdfTemplateFactory.forBankStyle("SBIV1"));
        assertInstanceOf(Sbi2Template.class, PdfTemplateFactory.forBankStyle("SBI2"));
    }

    @Test
    void otherStylesUseStandardTemplate() {
        assertInstanceOf(StandardBankTemplate.class, PdfTemplateFactory.forBankStyle("BOI"));
        assertInstanceOf(PnbTemplate.class, PdfTemplateFactory.forBankStyle("PNB"));
    }
}
