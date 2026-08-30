package com.statementpro.signing;

import com.itextpdf.kernel.pdf.PdfReader;
import com.itextpdf.kernel.pdf.ReaderProperties;
import com.itextpdf.kernel.pdf.StampingProperties;
import com.itextpdf.signatures.*;

import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.security.cert.Certificate;

public final class PdfSigningService {

    private PdfSigningService() {}

    public static byte[] sign(byte[] pdfBytes, SignOptions options, String openPassword) throws Exception {
        SelfSignedCertificate.CertPair certPair = SelfSignedCertificate.getOrCreate();
        Certificate[] chain = { certPair.certificate() };

        ReaderProperties readerProperties = new ReaderProperties();
        if (openPassword != null && !openPassword.isBlank()) {
            readerProperties.setPassword(openPassword.getBytes());
        }

        ByteArrayOutputStream signedOut = new ByteArrayOutputStream();
        PdfReader reader = new PdfReader(new ByteArrayInputStream(pdfBytes), readerProperties);
        PdfSigner signer = new PdfSigner(reader, signedOut, new StampingProperties());

        PdfSignatureAppearance appearance = signer.getSignatureAppearance();
        if (options != null) {
            if (options.reason() != null) appearance.setReason(options.reason());
            if (options.location() != null) appearance.setLocation(options.location());
            if (options.signerName() != null) appearance.setSignatureCreator(options.signerName());
        }

        IExternalSignature pks = new PrivateKeySignature(certPair.privateKey(), "SHA-256", "BC");
        BouncyCastleDigest digest = new BouncyCastleDigest();

        signer.signDetached(digest, pks, chain, null, null, null, 0, PdfSigner.CryptoStandard.CMS);
        return signedOut.toByteArray();
    }
}
