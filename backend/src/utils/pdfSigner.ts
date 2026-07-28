import forge from 'node-forge';

export interface SignOptions {
  reason?: string;
  location?: string;
  contactInfo?: string;
  signerName?: string;
}

// Cached Certificate & Private Key pair for performance
let cachedCertPair: { cert: forge.pki.Certificate; privateKey: forge.pki.PrivateKey } | null = null;

function getSbiCertPair() {
  if (cachedCertPair) return cachedCertPair;

  const keys = forge.pki.rsa.generateKeyPair(2048);
  const cert = forge.pki.createCertificate();
  cert.publicKey = keys.publicKey;
  cert.serialNumber = '01' + Math.floor(Math.random() * 1000000000).toString(16);
  cert.validity.notBefore = new Date();
  cert.validity.notAfter = new Date();
  cert.validity.notAfter.setFullYear(cert.validity.notBefore.getFullYear() + 10);

  const attrs = [
    { name: 'commonName', value: 'State Bank of India Corporate Signer' },
    { name: 'countryName', value: 'IN' },
    { name: 'organizationName', value: 'State Bank of India' },
    { name: 'organizationalUnitName', value: 'SBI Internet Banking Portal' }
  ];
  cert.setSubject(attrs);
  cert.setIssuer(attrs);

  // Extensions for Digital Signature usage
  cert.setExtensions([
    {
      name: 'basicConstraints',
      cA: false
    },
    {
      name: 'keyUsage',
      digitalSignature: true,
      nonRepudiation: true,
      keyEncipherment: true,
      dataEncipherment: true
    },
    {
      name: 'extKeyUsage',
      serverAuth: true,
      clientAuth: true,
      codeSigning: true,
      emailProtection: true
    }
  ]);

  cert.sign(keys.privateKey, forge.md.sha256.create());

  cachedCertPair = { cert, privateKey: keys.privateKey };
  return cachedCertPair;
}

/**
 * Creates a PKCS#7 detached digital signature for given buffer data using node-forge
 */
function createPkcs7Signature(dataBuffer: Buffer, cert: forge.pki.Certificate, privateKey: forge.pki.PrivateKey): string {
  const p7 = forge.pkcs7.createSignedData();
  p7.content = forge.util.createBuffer(dataBuffer.toString('binary'));
  p7.addCertificate(cert);
  p7.addSigner({
    key: privateKey as any,
    certificate: cert,
    digestAlgorithm: forge.pki.oids.sha256,
    authenticatedAttributes: [
      {
        type: forge.pki.oids.contentType,
        value: forge.pki.oids.data
      },
      {
        type: forge.pki.oids.messageDigest
      },
      {
        type: forge.pki.oids.signingTime,
        value: new Date() as any
      }
    ]
  });

  p7.sign({ detached: true });
  const rawBytes = forge.asn1.toDer(p7.toAsn1()).getBytes();
  return forge.util.bytesToHex(rawBytes).toUpperCase();
}

/**
 * Sign a PDF Buffer with an embedded PKCS#7 Digital Signature
 */
export async function signPdfBuffer(pdfBuffer: Buffer, options: SignOptions = {}): Promise<Buffer> {
  try {
    const { cert, privateKey } = getSbiCertPair();
    const reason = options.reason || 'Official Account Statement Digital Signature';
    const location = options.location || 'State Bank of India';

    // 8192 hex chars placeholder = 4096 bytes PKCS7 signature space
    const signatureHexLength = 8192;
    const hexPlaceholder = '0'.repeat(signatureHexLength);

    const dateStr = new Date().toISOString().replace(/[-:]/g, '').split('.')[0] + '+05\'30\'';

    // Construct Signature Dictionary object
    const sigDictObj = `
9999 0 obj
<<
  /Type /Sig
  /Filter /Adobe.PPKLite
  /SubFilter /adbe.pkcs7.detached
  /ByteRange [0 0000000000 0000000000 0000000000]
  /Contents <${hexPlaceholder}>
  /Reason (${reason})
  /Location (${location})
  /M (D:${dateStr})
>>
endobj
`;

    const pdfString = pdfBuffer.toString('binary');
    const eofIndex = pdfString.lastIndexOf('%%EOF');

    if (eofIndex === -1) {
      // Return original buffer if EOF not found
      return pdfBuffer;
    }

    // Append signature dictionary before EOF
    const preEof = pdfBuffer.slice(0, eofIndex);
    const postEof = pdfBuffer.slice(eofIndex);

    const sigBuffer = Buffer.from(sigDictObj, 'binary');
    let combined = Buffer.concat([preEof, sigBuffer, postEof]);

    // Locate byte positions of /ByteRange and /Contents <placeholder>
    const combinedStr = combined.toString('binary');
    const byteRangePos = combinedStr.indexOf('/ByteRange [0 0000000000 0000000000 0000000000]');
    const contentsPos = combinedStr.indexOf(`/Contents <${hexPlaceholder}>`);

    if (byteRangePos === -1 || contentsPos === -1) {
      return pdfBuffer;
    }

    const hexStart = contentsPos + '/Contents <'.length;
    const hexEnd = hexStart + signatureHexLength;

    const b1 = 0;
    const l1 = hexStart - 1; // Includes '<'
    const b2 = hexEnd + 1; // Starts after '>'
    const l2 = combined.length - b2;

    const byteRangeStr = `/ByteRange [${b1} ${l1.toString().padStart(10, '0')} ${b2.toString().padStart(10, '0')} ${l2.toString().padStart(10, '0')}]`;

    // Overwrite /ByteRange string
    combined.write(byteRangeStr, byteRangePos, 'binary');

    // Extract the two byte ranges to compute detached PKCS#7 hash
    const range1 = combined.slice(b1, l1);
    const range2 = combined.slice(b2, b2 + l2);
    const dataToSign = Buffer.concat([range1, range2]);

    // Generate PKCS7 signature
    const signatureHex = createPkcs7Signature(dataToSign, cert, privateKey);
    const paddedHex = signatureHex.padEnd(signatureHexLength, '0').slice(0, signatureHexLength);

    // Overwrite /Contents placeholder with actual PKCS7 signature
    combined.write(paddedHex, hexStart, 'binary');

    return combined;
  } catch (err) {
    console.error('[signPdfBuffer] Error signing PDF:', err);
    return pdfBuffer;
  }
}
