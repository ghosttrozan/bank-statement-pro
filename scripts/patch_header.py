with open(r'c:\Users\alkvi\OneDrive\Desktop\bank-statement-generator\bank-statement-generator\frontend\src\components\StatementPreview.tsx', 'r', encoding='utf-8') as f:
    code = f.read()

# Let's inspect the target header in StatementPreview
header_target_start = "/* KOTAK MAHINDRA DESIGN THEME */"
header_target_end = "/* STATEMENT TRANSACTIONS LIST TABLE */"

start_idx = code.find(header_target_start)
end_idx = code.find(header_target_end)

if start_idx != -1 and end_idx != -1:
    print("Found header block:", start_idx, end_idx)
    new_header = """/* KOTAK MAHINDRA DESIGN THEME */
                    <div>
                      {isFirst ? (
                        /* FIRST PAGE COMPLETE KOTAK HEADER */
                        <div style={{ fontFamily: 'Arial, Helvetica, sans-serif' }}>
                          {/* Top logos */}
                          <div style={{
                            padding: '4px 28.5px 0 28.5px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            boxSizing: 'border-box',
                            width: '100%',
                          }}>
                            <div>
                              <img
                                src="/kotak-logo1.png"
                                alt="Kotak Mahindra Bank"
                                style={{
                                  width: '187.5px',
                                  height: '75px',
                                  objectFit: 'contain',
                                  display: 'block',
                                }}
                              />
                            </div>
                            <div>
                              <img
                                src="/kotak-logo2.png"
                                alt="Kotak 811"
                                style={{
                                  width: '187.5px',
                                  height: '64.5px',
                                  objectFit: 'contain',
                                  display: 'block',
                                }}
                              />
                            </div>
                          </div>

                          {/* Statement title & period */}
                          <div style={{
                            padding: '12px 51px 0 51px',
                            display: 'flex',
                            flexDirection: 'column',
                          }}>
                            <span style={{ fontSize: '22.5px', fontWeight: 700, color: '#111827', lineHeight: 1.1 }}>
                              Account Statement
                            </span>
                            <span style={{ fontSize: '7.1px', color: '#374151', marginTop: '4px' }}>
                              {formatKotakDate(transactions[0]?.valueDate) || '31/01/2026'} - {formatKotakDate(transactions[transactions.length - 1]?.valueDate) || '29/07/2026'}
                            </span>
                            {/* Mandatory requirement: dummy statement on first page */}
                            <span style={{ fontSize: '7px', color: '#dc2626', marginTop: '2px', fontWeight: 500 }}>
                              dummy statement
                            </span>
                          </div>

                          {/* Two-column: Customer & Account info */}
                          <div style={{
                            display: 'grid',
                            gridTemplateColumns: '1.2fr 1fr',
                            gap: '0px',
                            padding: '24px 51px 0 51px',
                          }}>
                            {/* Left: Customer Info */}
                            <div>
                              <div style={{ fontSize: '11.2px', fontWeight: 700, color: '#111827', marginBottom: '3px' }}>
                                {customerDetails.accountHolderName?.toUpperCase()}
                              </div>
                              <div style={{ fontSize: '8.2px', color: '#4B5563', marginBottom: '22px' }}>
                                CRN xxxxxx{customerDetails.cifNumber?.slice(-3) || customerDetails.accountNumber?.slice(-3) || '321'}
                              </div>
                              <div style={{
                                fontSize: '9px',
                                color: '#101828',
                                lineHeight: 1.45,
                                whiteSpace: 'pre-line',
                                marginBottom: '18px',
                                maxWidth: '220px',
                              }}>
                                {customerDetails.address}
                              </div>

                              {/* MICR & IFSC */}
                              <div style={{
                                fontSize: '9px',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '20px',
                              }}>
                                <div>
                                  <span style={{ color: '#A8A8A8' }}>MICR Code </span>
                                  <span style={{ color: '#111827', fontWeight: 500 }}>{branchDetails.micrCode || '462485002'}</span>
                                </div>
                                <div>
                                  <span style={{ color: '#A8A8A8' }}>IFSC Code </span>
                                  <span style={{ color: '#111827', fontWeight: 500 }}>{branchDetails.ifscCode || 'KKBK0001590'}</span>
                                </div>
                              </div>
                            </div>

                            {/* Right: Account Info */}
                            <div style={{
                              fontSize: '11.2px',
                              color: '#A2A2A2',
                              lineHeight: 1.55,
                              paddingLeft: '20px',
                            }}>
                              <div>
                                Account No.&nbsp; <strong style={{ color: '#111111', fontSize: '10.5px' }}>{customerDetails.accountNumber}</strong>
                              </div>
                              <div>
                                Account Type&nbsp; <strong style={{ color: '#111111', fontSize: '10.5px' }}>{accountInfo.accountType || 'Savings'}</strong>
                              </div>
                              <div>
                                Branch&nbsp; <strong style={{ color: '#111111', fontSize: '9px' }}>{branchDetails.branchName?.toUpperCase() || 'BHOPAL MAIN BRANCH'}</strong>
                              </div>
                              <div style={{ marginBottom: '14px' }}>
                                Branch Phone Number&nbsp; <strong style={{ color: '#111111', fontSize: '10.5px' }}>{branchDetails.branchPhone || '9713063909'}</strong>
                              </div>
                              <div>
                                Account Status&nbsp; <strong style={{ color: '#111111', fontSize: '10.5px' }}>Active</strong>
                              </div>
                              <div style={{ marginBottom: '12px' }}>
                                Nominee Registered&nbsp; <strong style={{ color: '#111111', fontSize: '10.5px' }}>Yes</strong>
                              </div>
                              <div>
                                Currency&nbsp; <strong style={{ color: '#111111', fontSize: '9px' }}>INDIAN RUPEE</strong>
                              </div>
                            </div>
                          </div>

                          {/* Light divider line */}
                          <div style={{ margin: '8px 28.5px 12px 28.5px', borderBottom: '0.75px solid #E5E7EB' }} />
                        </div>
                      ) : (
                        /* PAGE 2+ KOTAK CONTINUATION HEADER */
                        <div style={{
                          padding: '12px 28.5px 8px 28.5px',
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'flex-start',
                          fontFamily: 'Arial, Helvetica, sans-serif',
                          lineHeight: '1.35',
                        }}>
                          <div style={{ fontWeight: 400, fontSize: '12px', textTransform: 'uppercase', marginBottom: '2px', color: '#111827' }}>
                            {customerDetails.accountHolderName}
                          </div>
                          <div style={{ fontSize: '9.8px', color: '#111827' }}>
                            <span style={{ color: '#8c8c8c' }}>Account No. </span>
                            <span style={{ fontWeight: 700 }}>{customerDetails.accountNumber}</span>
                          </div>
                          <div style={{ fontSize: '9.8px', color: '#111827' }}>
                            <span style={{ color: '#8c8c8c' }}>Account Statement </span>
                            <span style={{ fontWeight: 700 }}>
                              {formatKotakDate(transactions[0]?.valueDate)} - {formatKotakDate(transactions[transactions.length - 1]?.valueDate)}
                            </span>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  """
    code = code[:start_idx] + new_header + code[end_idx:]
    with open(r'c:\Users\alkvi\OneDrive\Desktop\bank-statement-generator\bank-statement-generator\frontend\src\components\StatementPreview.tsx', 'w', encoding='utf-8') as f:
        f.write(code)
    print("Updated Kotak header successfully!")
else:
    print("Could not find markers!")

