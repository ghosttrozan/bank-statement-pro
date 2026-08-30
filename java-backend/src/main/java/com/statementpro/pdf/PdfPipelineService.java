package com.statementpro.pdf;

import com.itextpdf.kernel.pdf.EncryptionConstants;
import com.itextpdf.kernel.pdf.WriterProperties;
import com.statementpro.model.StatementRecord;
import com.statementpro.signing.PdfSigningService;
import com.statementpro.signing.SignOptions;

public final class PdfPipelineService {

    private PdfPipelineService() {}

    public static byte[] generate(StatementRecord record, String password) throws Exception {
        return generate(record, password, false);
    }

    public static byte[] generate(StatementRecord record, String password, boolean signPdf) throws Exception {
        String bankStyle = record.settings() != null ? record.settings().bankStyle() : "SBI";
        StatementTemplate template = PdfTemplateFactory.forBankStyle(bankStyle);

        WriterProperties writerProperties = null;
        boolean hasPassword = password != null && !password.isBlank();
        if (hasPassword) {
            byte[] passBytes = password.getBytes();
            writerProperties = new WriterProperties().setStandardEncryption(
                    passBytes, passBytes,
                    EncryptionConstants.ALLOW_PRINTING | EncryptionConstants.ALLOW_COPY | EncryptionConstants.ALLOW_MODIFY_ANNOTATIONS,
                    EncryptionConstants.ENCRYPTION_AES_256);
        }

        byte[] rendered = template.render(record, writerProperties);

        if (!signPdf) {
            return rendered;
        }

        String bankName = switch (bankStyle != null ? bankStyle : "SBI") {
            case "BOI" -> "Bank of India";
            case "Kotak" -> "Kotak Mahindra Bank";
            case "PNB" -> "Punjab National Bank";
            default -> "State Bank of India";
        };
        SignOptions signOptions = new SignOptions(
                bankName + " Official Account Statement Digital Signature",
                bankName,
                bankName + " Corporate Internet Banking");

        return PdfSigningService.sign(rendered, signOptions, hasPassword ? password : null);
    }
}
