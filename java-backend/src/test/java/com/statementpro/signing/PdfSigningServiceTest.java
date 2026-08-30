package com.statementpro.signing;

import com.itextpdf.kernel.pdf.PdfDocument;
import com.itextpdf.kernel.pdf.PdfReader;
import com.itextpdf.kernel.pdf.PdfWriter;
import com.itextpdf.layout.Document;
import com.itextpdf.layout.element.Paragraph;
import com.itextpdf.signatures.SignatureUtil;
import org.junit.jupiter.api.Test;

import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.util.List;

import static org.junit.jupiter.api.Assertions.*;

class PdfSigningServiceTest {

    private byte[] buildSamplePdf() throws Exception {
        ByteArrayOutputStream out = new ByteArrayOutputStream();
        try (PdfDocument pdfDoc = new PdfDocument(new PdfWriter(out));
             Document doc = new Document(pdfDoc)) {
            doc.add(new Paragraph("Sample statement content"));
        }
        return out.toByteArray();
    }

    @Test
    void signedPdfContainsASignatureField() throws Exception {
        byte[] unsigned = buildSamplePdf();
        byte[] signed = PdfSigningService.sign(unsigned,
                new SignOptions("Official Account Statement Digital Signature", "State Bank of India", "SBI Corporate Internet Banking"),
                null);

        assertTrue(signed.length > unsigned.length);
        try (PdfDocument doc = new PdfDocument(new PdfReader(new ByteArrayInputStream(signed)))) {
            SignatureUtil sigUtil = new SignatureUtil(doc);
            List<String> names = sigUtil.getSignatureNames();
            assertFalse(names.isEmpty(), "expected at least one signature field");
        }
    }
}
