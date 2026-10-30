file_path = r'C:\Users\alkvi\OneDrive\Desktop\bank-statement-generator\bank-statement-generator\frontend\src\components\StatementPreview.tsx'

with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Update Continuation Header
old_cont_marker = '/* PAGE 2+ KOTAK CONTINUATION HEADER */'
end_cont_marker = '{/* STATEMENT TRANSACTIONS LIST TABLE */}'

new_cont = '''/* PAGE 2+ KOTAK CONTINUATION HEADER */
                        <div style={{
                          padding: '12px 36px 8px 36px',
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'flex-start',
                          fontFamily: '"Source Sans 3", Arial, sans-serif',
                          lineHeight: '1.35',
                        }}>
                          <div style={{ fontWeight: 400, fontSize: '9px', color: '#000000', marginBottom: '2px' }}>
                            {customerDetails.accountHolderName?.toUpperCase() || 'JITENDRA SAPRAY'}
                          </div>
                          <div style={{ fontSize: '9px' }}>
                            <span style={{ color: '#9FA1A4' }}>Account No. </span>
                            <span style={{ fontWeight: 600, color: '#000000' }}>{customerDetails.accountNumber || '6145810535'}</span>
                          </div>
                          <div style={{ fontSize: '9px' }}>
                            <span style={{ color: '#9FA1A4' }}>Account Statement </span>
                            <span style={{ fontWeight: 600, color: '#000000' }}>
                              {formatKotakDate(transactions[0]?.valueDate)} - {formatKotakDate(transactions[transactions.length - 1]?.valueDate)}
                            </span>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  '''

c_start = content.find(old_cont_marker)
c_end = content.find(end_cont_marker)
if c_start != -1 and c_end != -1:
    content = content[:c_start] + new_cont + content[c_end:]
    print('Continuation header replaced!')

# 2. Update Kotak Table
old_tbl_marker = '/* ─── KOTAK TABLE ──────────────────── */'
end_tbl_marker = '{/* DYNAMIC LAST PAGE SUMMARY SUMMARY & SIGNATURE (FOR SBI/KOTAK) */}'

new_tbl = '''/* ─── KOTAK TABLE ──────────────────── */
                        <div style={{ fontFamily: '"Source Sans 3", Arial, sans-serif' }}>
                          {/* ── Title Bar ── */}
                          <div style={{
                            backgroundColor: '#ED1C24',
                            height: '25px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            boxSizing: 'border-box',
                            fontFamily: '"Source Sans 3", Arial, sans-serif',
                          }}>
                            <span style={{
                              color: '#ffffff',
                              fontSize: '12px',
                              fontWeight: 400,
                              textAlign: 'center',
                            }}>
                              Savings Account Transactions
                            </span>
                          </div>

                          {/* ── Table ── */}
                          <table className="w-full border-collapse" style={{ fontFamily: '"Source Sans 3", Arial, sans-serif', border: 'none' }}>
                            <thead>
                              <tr style={{
                                backgroundColor: '#9FA1A4',
                                height: '25px',
                                userSelect: 'none',
                              }}>
                                <th style={{ width: '6.0%', padding: '0 4px', textAlign: 'center', verticalAlign: 'middle', borderRight: '0.75px solid #ffffff', color: '#ffffff', fontSize: '9px', fontWeight: 400 }}>#</th>
                                <th style={{ width: '9.5%', padding: '0 4px', textAlign: 'left', verticalAlign: 'middle', borderRight: '0.75px solid #ffffff', color: '#ffffff', fontSize: '9px', fontWeight: 400 }}>Date</th>
                                <th style={{ width: '30.0%', padding: '0 6px', textAlign: 'left', verticalAlign: 'middle', borderRight: '0.75px solid #ffffff', color: '#ffffff', fontSize: '9px', fontWeight: 400 }}>Description</th>
                                <th style={{ width: '15.5%', padding: '0 4px', textAlign: 'left', verticalAlign: 'middle', borderRight: '0.75px solid #ffffff', color: '#ffffff', fontSize: '9px', fontWeight: 400 }}>Chq/Ref. No.</th>
                                <th style={{ width: '13.0%', padding: '0 4px', textAlign: 'right', verticalAlign: 'middle', borderRight: '0.75px solid #ffffff', color: '#ffffff', fontSize: '9px', fontWeight: 400 }}>Withdrawal (Dr.)</th>
                                <th style={{ width: '13.0%', padding: '0 4px', textAlign: 'right', verticalAlign: 'middle', borderRight: '0.75px solid #ffffff', color: '#ffffff', fontSize: '9px', fontWeight: 400 }}>Deposit (Cr.)</th>
                                <th style={{ width: '13.0%', padding: '0 4px', textAlign: 'right', verticalAlign: 'middle', color: '#ffffff', fontSize: '9px', fontWeight: 400 }}>Balance</th>
                              </tr>
                            </thead>
                            <tbody style={{ fontSize: '7.7px', color: '#000000' }}>
                              {isFirst && (
                                <tr style={{ background: '#ffffff', height: '14px', borderBottom: '0.5px solid #9FA1A4' }}>
                                  <td style={{ padding: '2px 4px', textAlign: 'center' }}>-</td>
                                  <td style={{ padding: '2px 4px', textAlign: 'left' }}>-</td>
                                  <td style={{ padding: '2px 6px', textAlign: 'left' }}>Opening Balance</td>
                                  <td style={{ padding: '2px 4px', textAlign: 'left' }}>-</td>
                                  <td style={{ padding: '2px 4px', textAlign: 'right' }}>-</td>
                                  <td style={{ padding: '2px 4px', textAlign: 'right' }}>-</td>
                                  <td style={{ padding: '2px 4px', textAlign: 'right' }}>{accountInfo.openingBalance.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                                </tr>
                              )}
                              {chunkTransactions.map((tx) => {
                                const serialNo = transactions.indexOf(tx) + 1;
                                return (
                                  <tr key={tx.id} style={{ background: '#ffffff', borderBottom: '0.5px solid #9FA1A4' }}>
                                    <td style={{ padding: '4px 4px', textAlign: 'center', width: '6.0%', verticalAlign: 'top' }}>{serialNo}</td>
                                    <td style={{ padding: '4px 4px', textAlign: 'left', whiteSpace: 'nowrap', width: '9.5%', verticalAlign: 'top' }}>{formatKotakDate(tx.valueDate)}</td>
                                    <td style={{ padding: '4px 6px', textAlign: 'left', lineHeight: 1.25, width: '30.0%', wordBreak: 'break-word', verticalAlign: 'top' }}>{tx.details}</td>
                                    <td style={{ padding: '4px 4px', textAlign: 'left', width: '15.5%', wordBreak: 'break-word', verticalAlign: 'top' }}>{tx.refNo || '-'}</td>
                                    <td style={{ padding: '4px 4px', textAlign: 'right', width: '13.0%', verticalAlign: 'top' }}>{tx.debit ? tx.debit.toLocaleString('en-IN', { minimumFractionDigits: 2 }) : ''}</td>
                                    <td style={{ padding: '4px 4px', textAlign: 'right', width: '13.0%', verticalAlign: 'top' }}>{tx.credit ? tx.credit.toLocaleString('en-IN', { minimumFractionDigits: 2 }) : ''}</td>
                                    <td style={{ padding: '4px 4px', textAlign: 'right', width: '13.0%', verticalAlign: 'top' }}>{tx.balance.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  )}

                </div>

                '''

t_start = content.find(old_tbl_marker)
t_end = content.find(end_tbl_marker)
if t_start != -1 and t_end != -1:
    content = content[:t_start] + new_tbl + content[t_end:]
    print('Table replaced!')

# 3. Update Kotak Summary
old_sum_marker = "isLast && settings.bankStyle === 'Kotak'"
sum_start = content.find(old_sum_marker)

new_sum = """isLast && settings.bankStyle === 'Kotak' && (
                    <div style={{ margin: '20px 36px', fontFamily: '"Source Sans 3", Arial, sans-serif' }}>
                      {/* Summary Banner */}
                      <div style={{ backgroundColor: '#ED1C24', height: '25px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ffffff', fontSize: '12px' }}>
                        Account Summary
                      </div>
                      <table style={{ width: '100%', borderCollapse: 'collapse', border: 'none' }}>
                        <thead>
                          <tr style={{ backgroundColor: '#9FA1A4', color: '#ffffff', height: '33px', fontSize: '9px' }}>
                            <th style={{ width: '45%', padding: '0 12px', textAlign: 'left', borderRight: '0.75px solid #ffffff' }}>Particulars</th>
                            <th style={{ width: '27.5%', padding: '0 12px', textAlign: 'center', borderRight: '0.75px solid #ffffff' }}>Opening Balance</th>
                            <th style={{ width: '27.5%', padding: '0 12px', textAlign: 'center' }}>Closing Balance</th>
                          </tr>
                        </thead>
                        <tbody style={{ fontSize: '7.7px', color: '#000000' }}>
                          <tr style={{ height: '25px', borderBottom: '0.5px solid #9FA1A4' }}>
                            <td style={{ padding: '0 12px' }}>Savings Account (SA):</td>
                            <td style={{ padding: '0 12px', textAlign: 'center' }}>{accountInfo.openingBalance.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                            <td style={{ padding: '0 12px', textAlign: 'center' }}>{closingBalance.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                          </tr>
                        </tbody>
                      </table>

                      {/* End of Statement */}
                      <div style={{ marginTop: '24px', textAlign: 'center', color: '#000000', fontSize: '9.1px', lineHeight: '1.6' }}>
                        <div style={{ fontSize: '12px', fontWeight: 600, marginBottom: '6px' }}>End of Statement</div>
                        <div>Any discrepancy in the statement should be brought to the notice of Kotak Mahindra Bank Ltd. within</div>
                        <div>one month from the date of receipt of the statement.</div>
                        <div>This is a system generated report and does not require signature and stamp.</div>
                      </div>

                      {/* Hero Banner */}
                      <div style={{ marginTop: '20px', width: '100%' }}>
                        <img src="/images/kotak/kotak_hero_banner.jpeg" alt="Hausla hai toh ho jayega" style={{ width: '100%', height: 'auto', display: 'block' }} />
                      </div>

                      {/* Assistance Section */}
                      <div style={{ marginTop: '20px' }}>
                        <div style={{ backgroundColor: '#ED1C24', height: '25px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ffffff', fontSize: '12px' }}>
                          For assistance, reach out to us at:
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr 1fr', padding: '12px 0', borderBottom: '0.5px solid #9FA1A4' }}>
                          <div style={{ textAlign: 'center', padding: '0 8px', borderRight: '0.5px solid #9FA1A4' }}>
                            <img src="/images/kotak/kotak_phone_icon.png" alt="Phone" style={{ width: '21px', height: '21px', margin: '0 auto 4px auto' }} />
                            <div style={{ fontSize: '9.1px', fontWeight: 600 }}>Contact Us</div>
                            <div style={{ fontSize: '9.1px' }}>1800 4100</div>
                            <div style={{ fontSize: '9.1px' }}>(Toll-free number)</div>
                          </div>
                          <div style={{ textAlign: 'center', padding: '0 8px', borderRight: '0.5px solid #9FA1A4' }}>
                            <img src="/images/kotak/kotak_branch_icon.png" alt="Branch" style={{ width: '21px', height: '21px', margin: '0 auto 4px auto' }} />
                            <div style={{ fontSize: '9px', fontWeight: 600 }}>Branch Address</div>
                            <div style={{ fontSize: '9px' }}>{branchDetails.branchAddress || '85 -Rang Mahal Sir Seth Hukum Chand Marg, Cloth Market Itwariya'}</div>
                            <div style={{ fontSize: '9px' }}>{branchDetails.city ? branchDetails.city + ', Indore-452002' : 'Bazar,Indore, Indore-452002, Madhya Pradesh, India'}</div>
                          </div>
                          <div style={{ textAlign: 'center', padding: '0 8px' }}>
                            <img src="/images/kotak/kotak_mobile_icon.png" alt="Mobile" style={{ width: '21px', height: '21px', margin: '0 auto 4px auto' }} />
                            <div style={{ fontSize: '9px', fontWeight: 600 }}>Branch Phone Number</div>
                            <div style={{ fontSize: '9px' }}>{branchDetails.branchPhone || '9522204785'}</div>
                          </div>
                        </div>
                      </div>

                      {/* Remember Box */}
                      <div style={{
                        marginTop: '16px',
                        backgroundColor: '#EAECED',
                        borderRadius: '6px',
                        padding: '12px 16px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                      }}>
                        <div>
                          <div style={{ color: '#ED1C24', fontSize: '12px', fontWeight: 600, marginBottom: '2px' }}>Remember!</div>
                          <div style={{ color: '#000000', fontSize: '12px', lineHeight: '1.4' }}>
                            Never share personal/sensitive information like PIN, CVV, OTP<br />
                            or passwords with anyone.
                          </div>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', borderLeft: '0.5px solid #9FA1A4', paddingLeft: '14px' }}>
                          <img src="/images/kotak/kotak_qr.jpeg" alt="QR" style={{ width: '45px', height: '45px' }} />
                          <div style={{ fontSize: '10px', color: '#000000', lineHeight: '1.2' }}>
                            Scan for<br />more safe<br />banking tips
                          </div>
                        </div>
                      </div>

                      {/* Corporate Footer */}
                      <div style={{ marginTop: '16px', paddingTop: '10px', borderTop: '0.5px solid #9FA1A4', textAlign: 'center', fontSize: '8.5px', color: '#000000', lineHeight: '1.5' }}>
                        <div>Kotak Mahindra Bank Ltd. | CIN: L65110MH1985PLC038137</div>
                        <div>Registered Office: 27 BKC, C 27, G Block, Bandra Kurla Complex, Bandra (E), Mumbai - 400 051. www.kotak.bank.in</div>
                      </div>
                    </div>
                  )}"""

if sum_start != -1:
    # find closing of that block
    sum_end = content.find('{settings.bankStyle === \'SBI\' ? (', sum_start)
    if sum_end != -1:
        # replace up to sum_end
        content = content[:sum_start] + new_sum + '\n\n                </div>\n\n                ' + content[sum_end:]
        print('Summary replaced!')

# 4. Page Footer
old_footer = 'Page no. {pageNum}'
f_idx = content.find(old_footer)
if f_idx != -1:
    old_f_block = '''{settings.bankStyle === 'SBI' ? (
                  <div style={{ textAlign: 'center', fontFamily: 'sans-serif', fontSize: '11px', fontWeight: 400, color: '#4b5563', paddingBottom: '10px', userSelect: 'none' }}>
                    Page no. {pageNum}
                  </div>
                ) : settings.bankStyle === 'PNB' ? (
                  <div style={{ textAlign: 'right', fontFamily: 'sans-serif', fontSize: '10px', fontWeight: 400, color: '#000000', paddingRight: '10mm', paddingBottom: '10px', userSelect: 'none' }}>
                    Page No - {pageNum}
                  </div>
                ) : (
                  <div></div>
                )}'''
    new_f_block = '''{settings.bankStyle === 'SBI' ? (
                  <div style={{ textAlign: 'center', fontFamily: 'sans-serif', fontSize: '11px', fontWeight: 400, color: '#4b5563', paddingBottom: '10px', userSelect: 'none' }}>
                    Page no. {pageNum}
                  </div>
                ) : settings.bankStyle === 'PNB' ? (
                  <div style={{ textAlign: 'right', fontFamily: 'sans-serif', fontSize: '10px', fontWeight: 400, color: '#000000', paddingRight: '10mm', paddingBottom: '10px', userSelect: 'none' }}>
                    Page No - {pageNum}
                  </div>
                ) : settings.bankStyle === 'Kotak' ? (
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '0 36px 12px 36px',
                    fontFamily: '"Source Sans 3", Arial, sans-serif',
                    fontSize: '9.6px',
                    color: '#9FA1A4',
                    userSelect: 'none',
                  }}>
                    <span>Statement Generated on {new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}, {new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}</span>
                    <span style={{ fontSize: '10px' }}>Page {pageNum} of {chunkedTransactions.length}</span>
                  </div>
                ) : (
                  <div></div>
                )}'''
    if old_f_block in content:
        content = content.replace(old_f_block, new_f_block)
        print('Footer replaced!')

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(content)
print('StatementPreview.tsx fully updated!')

