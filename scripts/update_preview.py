import os

file_path = r'C:\Users\alkvi\OneDrive\Desktop\bank-statement-generator\bank-statement-generator\frontend\src\components\StatementPreview.tsx'

with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

# Replace Header (isFirst ? ...)
old_header_start = '/* FIRST PAGE COMPLETE KOTAK HEADER */'
old_header_end = '/* PAGE 2+ KOTAK CONTINUATION HEADER */'

new_header = '''/* FIRST PAGE COMPLETE KOTAK HEADER */
                        <div style={{ fontFamily: '"Source Sans 3", Arial, sans-serif' }}>
                          {/* Top banner image */}
                          <div style={{ width: '100%', marginBottom: '16px' }}>
                            <img
                              src="/images/kotak/kotak_header.jpeg"
                              alt="Kotak Mahindra Bank"
                              style={{ width: '100%', height: 'auto', display: 'block' }}
                            />
                          </div>

                          {/* Statement title & period */}
                          <div style={{ padding: '0 36px 0 36px' }}>
                            <div style={{ fontSize: '25px', fontWeight: 600, color: '#000000', lineHeight: 1.1 }}>
                              Account Statement
                            </div>
                            <div style={{ fontSize: '11px', color: '#000000', marginTop: '4px' }}>
                              {formatKotakDate(transactions[0]?.valueDate) || '01 Oct 2026'} - {formatKotakDate(transactions[transactions.length - 1]?.valueDate) || '21 Oct 2026'}
                            </div>
                            {/* Mandatory requirement: dummy statement on first page */}
                            <div style={{ fontSize: '7px', color: '#dc2626', marginTop: '2px', fontWeight: 500 }}>
                              dummy statement
                            </div>
                          </div>

                          {/* Two-column: Customer & Account info */}
                          <div style={{
                            display: 'grid',
                            gridTemplateColumns: '1.2fr 1fr',
                            gap: '20px',
                            padding: '16px 38px 12px 38px',
                          }}>
                            {/* Left: Customer Info */}
                            <div>
                              <div style={{ fontSize: '14px', fontWeight: 600, color: '#000000', marginBottom: '2px' }}>
                                {customerDetails.accountHolderName || 'Jitendra Sapray'}
                              </div>
                              <div style={{ fontSize: '11px', color: '#9FA1A4', marginBottom: '14px' }}>
                                CRN xxxxxx{customerDetails.cifNumber?.slice(-3) || customerDetails.accountNumber?.slice(-3) || '815'}
                              </div>
                              <div style={{
                                fontSize: '9px',
                                color: '#000000',
                                lineHeight: '1.5',
                                whiteSpace: 'pre-line',
                                marginBottom: '14px',
                                maxWidth: '240px',
                              }}>
                                {customerDetails.address || '379 Rukhmani Nagar\\nChota Bangarda Road\\nIndore\\nIndore - 452005\\nMadhya Pradesh - India'}
                              </div>

                              {/* MICR & IFSC */}
                              <div style={{
                                fontSize: '9px',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '14px',
                              }}>
                                <div>
                                  <span style={{ color: '#9FA1A4' }}>MICR </span>
                                  <span style={{ color: '#000000', fontWeight: 600 }}>{branchDetails.micrCode || '452485007'}</span>
                                </div>
                                <div>
                                  <span style={{ color: '#9FA1A4' }}>IFSC Code </span>
                                  <span style={{ color: '#000000', fontWeight: 600 }}>{branchDetails.ifscCode || 'KKBK0005942'}</span>
                                </div>
                              </div>
                            </div>

                            {/* Right: Account Info */}
                            <div style={{
                              fontSize: '9px',
                              lineHeight: '1.75',
                              paddingLeft: '10px',
                            }}>
                              <div>
                                <span style={{ color: '#9FA1A4' }}>Account No. </span>
                                <strong style={{ color: '#000000', fontWeight: 600 }}>{customerDetails.accountNumber || '6145810535'}</strong>
                              </div>
                              <div>
                                <span style={{ color: '#9FA1A4' }}>Account Type </span>
                                <strong style={{ color: '#000000', fontWeight: 600 }}>{accountInfo.accountType || 'Savings'}</strong>
                              </div>
                              <div>
                                <span style={{ color: '#9FA1A4' }}>Branch </span>
                                <strong style={{ color: '#000000', fontWeight: 600 }}>{branchDetails.branchName || 'Indore -Cloth Market'}</strong>
                              </div>
                              <div>
                                <span style={{ color: '#9FA1A4' }}>Account Status </span>
                                <strong style={{ color: '#000000', fontWeight: 600 }}>Active</strong>
                              </div>
                              <div>
                                <span style={{ color: '#9FA1A4' }}>Nominee Registered </span>
                                <strong style={{ color: '#000000', fontWeight: 600 }}>No</strong>
                              </div>
                              <div>
                                <span style={{ color: '#9FA1A4' }}>Currency </span>
                                <strong style={{ color: '#000000', fontWeight: 600 }}>INDIAN RUPEE</strong>
                              </div>
                            </div>
                          </div>
                        </div>
                      ) : (
                        '''

idx1 = content.find(old_header_start)
idx2 = content.find(old_header_end)
if idx1 != -1 and idx2 != -1:
    content = content[:idx1] + new_header + content[idx2:]
    print('Header updated successfully!')
else:
    print('Could not find header markers:', idx1, idx2)

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(content)

