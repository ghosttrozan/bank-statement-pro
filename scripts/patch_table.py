with open(r'c:\Users\alkvi\OneDrive\Desktop\bank-statement-generator\bank-statement-generator\frontend\src\components\StatementPreview.tsx', 'r', encoding='utf-8') as f:
    code = f.read()

start_marker = "/* ─── KOTAK TABLE"
end_marker = "{/* DYNAMIC LAST PAGE SUMMARY SUMMARY & SIGNATURE (FOR SBI/KOTAK) */}"

start_idx = code.find(start_marker)
end_idx = code.find(end_marker)

print("start_idx:", start_idx, "end_idx:", end_idx)

new_table = """/* ─── KOTAK TABLE ──────────────────── */
                        <div style={{ fontFamily: 'Arial, Helvetica, sans-serif' }}>
                          {/* ── Title Bar ── */}
                          <div style={{
                            backgroundColor: '#ED1C24',
                            height: '30px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            boxSizing: 'border-box',
                            fontFamily: 'Arial, Helvetica, sans-serif',
                          }}>
                            <span style={{
                              color: '#ffffff',
                              fontSize: '13.5px',
                              fontWeight: 400,
                              fontFamily: 'Arial, Helvetica, sans-serif',
                              textAlign: 'center',
                            }}>
                              Savings Account Transactions
                            </span>
                          </div>

                          {/* ── Table ── */}
                          <table className="w-full border-collapse" style={{ fontFamily: 'Arial, Helvetica, sans-serif', border: 'none' }}>
                            <thead>
                              <tr style={{
                                backgroundColor: '#A8A8A8',
                                height: '31.5px',
                                userSelect: 'none',
                              }}>
                                <th style={{
                                  width: '6.0%',
                                  padding: '0 4px',
                                  textAlign: 'center',
                                  verticalAlign: 'middle',
                                  borderRight: '0.75px solid #ffffff',
                                  color: '#ffffff',
                                  fontSize: '9.8px',
                                  fontWeight: 400,
                                }}>#</th>
                                <th style={{
                                  width: '12.0%',
                                  padding: '0 6px',
                                  textAlign: 'left',
                                  verticalAlign: 'middle',
                                  borderRight: '0.75px solid #ffffff',
                                  color: '#ffffff',
                                  fontSize: '9.8px',
                                  fontWeight: 400,
                                }}>Date</th>
                                <th style={{
                                  width: '35.0%',
                                  padding: '0 8px',
                                  textAlign: 'left',
                                  verticalAlign: 'middle',
                                  borderRight: '0.75px solid #ffffff',
                                  color: '#ffffff',
                                  fontSize: '9.8px',
                                  fontWeight: 400,
                                }}>Description</th>
                                <th style={{
                                  width: '17.0%',
                                  padding: '0 6px',
                                  textAlign: 'left',
                                  verticalAlign: 'middle',
                                  borderRight: '0.75px solid #ffffff',
                                  color: '#ffffff',
                                  fontSize: '9.8px',
                                  fontWeight: 400,
                                }}>Chq/Ref. No.</th>
                                <th style={{
                                  width: '10.0%',
                                  padding: '0 4px',
                                  textAlign: 'right',
                                  verticalAlign: 'middle',
                                  borderRight: '0.75px solid #ffffff',
                                  color: '#ffffff',
                                  fontSize: '9.8px',
                                  fontWeight: 400,
                                }}>
                                  <div>Withdrawal</div>
                                  <div>(Dr.)</div>
                                </th>
                                <th style={{
                                  width: '10.0%',
                                  padding: '0 4px',
                                  textAlign: 'right',
                                  verticalAlign: 'middle',
                                  borderRight: '0.75px solid #ffffff',
                                  color: '#ffffff',
                                  fontSize: '9.8px',
                                  fontWeight: 400,
                                }}>
                                  <div>Deposit</div>
                                  <div>(Cr.)</div>
                                </th>
                                <th style={{
                                  width: '10.0%',
                                  padding: '0 4px',
                                  textAlign: 'right',
                                  verticalAlign: 'middle',
                                  color: '#ffffff',
                                  fontSize: '9.8px',
                                  fontWeight: 400,
                                }}>Balance</th>
                              </tr>
                            </thead>
                            <tbody style={{ fontSize: '10px', color: '#111827' }}>
                              {/* Brought forward row for subsequent pages */}
                              {!isFirst && (
                                <tr style={{ background: '#ffffff', height: '24px' }}>
                                  <td style={{ padding: '4px 6px', textAlign: 'center', borderBottom: '0.75px solid #d1d5db' }}></td>
                                  <td style={{ padding: '4px 6px', textAlign: 'left', whiteSpace: 'nowrap', borderBottom: '0.75px solid #d1d5db' }}>{formatKotakDate(chunkTransactions[0]?.valueDate)}</td>
                                  <td style={{ padding: '4px 8px', fontWeight: 400, color: '#111827', borderBottom: '0.75px solid #d1d5db' }} colSpan={2}>Balance brought forward from page {pageIndex}</td>
                                  <td style={{ padding: '4px 6px', textAlign: 'right', borderBottom: '0.75px solid #d1d5db' }}></td>
                                  <td style={{ padding: '4px 6px', textAlign: 'right', borderBottom: '0.75px solid #d1d5db' }}></td>
                                  <td style={{ padding: '4px 6px', textAlign: 'right', borderBottom: '0.75px solid #d1d5db' }}>{broughtForwardVal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                                </tr>
                              )}
                              {chunkTransactions.map((tx) => {
                                const serialNo = transactions.indexOf(tx) + 1;
                                return (
                                  <tr key={tx.id} style={{ background: '#ffffff' }}>
                                    <td style={{ padding: '5px 4px', textAlign: 'center', color: '#111827', width: '6.0%', borderBottom: '0.75px solid #d1d5db', verticalAlign: 'middle' }}>{serialNo}</td>
                                    <td style={{ padding: '5px 6px', textAlign: 'left', whiteSpace: 'nowrap', color: '#111827', width: '12.0%', borderBottom: '0.75px solid #d1d5db', verticalAlign: 'middle' }}>{formatKotakDate(tx.valueDate)}</td>
                                    <td style={{ padding: '5px 8px', textAlign: 'left', lineHeight: 1.25, color: '#111827', width: '35.0%', wordBreak: 'break-word', borderBottom: '0.75px solid #d1d5db', verticalAlign: 'middle' }}>
                                      {tx.details.toUpperCase()}
                                    </td>
                                    <td style={{ padding: '5px 6px', textAlign: 'left', color: '#111827', width: '17.0%', wordBreak: 'break-word', borderBottom: '0.75px solid #d1d5db', verticalAlign: 'middle' }}>{tx.refNo || ''}</td>
                                    <td style={{ padding: '5px 4px', textAlign: 'right', color: '#111827', width: '10.0%', borderBottom: '0.75px solid #d1d5db', verticalAlign: 'middle' }}>
                                      {tx.debit ? tx.debit.toLocaleString('en-IN', { minimumFractionDigits: 2 }) : ''}
                                    </td>
                                    <td style={{ padding: '5px 4px', textAlign: 'right', color: '#111827', width: '10.0%', borderBottom: '0.75px solid #d1d5db', verticalAlign: 'middle' }}>
                                      {tx.credit ? tx.credit.toLocaleString('en-IN', { minimumFractionDigits: 2 }) : ''}
                                    </td>
                                    <td style={{ padding: '5px 4px', textAlign: 'right', color: '#111827', width: '10.0%', borderBottom: '0.75px solid #d1d5db', verticalAlign: 'middle' }}>
                                      {tx.balance.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                                    </td>
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

                """

code = code[:start_idx] + new_table + code[end_idx:]

with open(r'c:\Users\alkvi\OneDrive\Desktop\bank-statement-generator\bank-statement-generator\frontend\src\components\StatementPreview.tsx', 'w', encoding='utf-8') as f:
    f.write(code)

print("Updated Kotak table successfully!")

