package com.statementpro;

import com.itextpdf.io.font.constants.StandardFonts;
import com.itextpdf.kernel.font.PdfFontFactory;
import com.itextpdf.kernel.pdf.PdfDocument;
import com.itextpdf.kernel.pdf.PdfWriter;
import com.itextpdf.layout.Document;
import com.itextpdf.layout.element.Div;
import com.itextpdf.layout.element.Paragraph;
import org.junit.jupiter.api.Test;

public class DossierTest {

    private Paragraph dossierLine(String label, String value) {
        float targetX = 106.0f;
        float labelWidth = 0f;
        try {
            labelWidth = PdfFontFactory.createFont(StandardFonts.HELVETICA).getWidth(label, 9.0f);
        } catch (Exception ignored) {}
        float needed = Math.max(0, targetX - labelWidth);
        int spaces = Math.max(1, Math.round(needed / 2.5f));
        String text = label + " ".repeat(spaces) + ": " + (value == null ? "" : value);
        return new Paragraph(text)
                .setFontSize(9.0f)
                .setMultipliedLeading(1.15f)
                .setMarginTop(0.5f)
                .setMarginBottom(0.5f);
    }

    @Test
    public void testDossierLayout() throws Exception {
        PdfDocument pdf = new PdfDocument(new PdfWriter("target/test_dossier.pdf"));
        Document doc = new Document(pdf);
        doc.setMargins(36, 36, 36, 36);

        Div dossier = new Div();
        dossier.add(dossierLine("Account Name", "Rahul Kumar Sharma"));
        dossier.add(dossierLine("Date", "1 Oct 2026"));
        dossier.add(dossierLine("Account Number", "00000020482649871"));
        doc.add(dossier);

        doc.close();
    }
}
