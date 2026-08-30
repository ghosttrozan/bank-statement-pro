package com.statementpro.signing;

import org.bouncycastle.asn1.x500.X500Name;
import org.bouncycastle.cert.X509CertificateHolder;
import org.bouncycastle.cert.X509v3CertificateBuilder;
import org.bouncycastle.cert.jcajce.JcaX509CertificateConverter;
import org.bouncycastle.cert.jcajce.JcaX509v3CertificateBuilder;
import org.bouncycastle.jce.provider.BouncyCastleProvider;
import org.bouncycastle.operator.ContentSigner;
import org.bouncycastle.operator.jcajce.JcaContentSignerBuilder;

import java.math.BigInteger;
import java.security.KeyPair;
import java.security.KeyPairGenerator;
import java.security.PrivateKey;
import java.security.Security;
import java.security.cert.X509Certificate;
import java.util.Date;
import java.util.concurrent.TimeUnit;

/** Generates one self-signed RSA-2048 certificate per process, cached for reuse. */
public final class SelfSignedCertificate {

    public record CertPair(X509Certificate certificate, PrivateKey privateKey) {}

    private static volatile CertPair cached;

    private SelfSignedCertificate() {}

    public static synchronized CertPair getOrCreate() throws Exception {
        if (cached != null) return cached;

        if (Security.getProvider("BC") == null) {
            Security.addProvider(new BouncyCastleProvider());
        }

        KeyPairGenerator keyGen = KeyPairGenerator.getInstance("RSA");
        keyGen.initialize(2048);
        KeyPair keyPair = keyGen.generateKeyPair();

        X500Name subject = new X500Name("CN=State Bank of India Corporate Signer, O=State Bank of India, "
                + "OU=SBI Internet Banking Portal, C=IN");

        Date notBefore = new Date();
        Date notAfter = new Date(notBefore.getTime() + TimeUnit.DAYS.toMillis(3650));
        BigInteger serial = BigInteger.valueOf(System.currentTimeMillis());

        X509v3CertificateBuilder certBuilder = new JcaX509v3CertificateBuilder(
                subject, serial, notBefore, notAfter, subject, keyPair.getPublic());

        ContentSigner signer = new JcaContentSignerBuilder("SHA256withRSA").build(keyPair.getPrivate());
        X509CertificateHolder certHolder = certBuilder.build(signer);
        X509Certificate certificate = new JcaX509CertificateConverter().setProvider("BC").getCertificate(certHolder);

        cached = new CertPair(certificate, keyPair.getPrivate());
        return cached;
    }
}
