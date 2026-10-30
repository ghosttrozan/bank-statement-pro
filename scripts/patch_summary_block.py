with open(r'c:\Users\alkvi\OneDrive\Desktop\bank-statement-generator\bank-statement-generator\frontend\src\components\StatementPreview.tsx', 'r', encoding='utf-8') as f:
    code = f.read()

old_summary_start = "{isLast && settings.bankStyle === 'Kotak' && ("
old_summary_end = "/* Kotak / BOI bottom bar */"

start_idx = code.find(old_summary_start)
end_idx = code.find(old_summary_end)

print("start_idx:", start_idx, "end_idx:", end_idx)

new_summary = """{isLast && settings.bankStyle === 'Kotak' && (
                    <div style={{ margin: '40px 30.75px 40px 30.75px', fontFamily: 'Arial, Helvetica, sans-serif' }}>
                      {/* Kotak Summary Table */}
                      <div style={{ border: '0.75px solid #d1d5db', overflow: 'hidden' }}>
                        <div style={{ background: '#ED1C24', color: '#ffffff', height: '27.75px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '10.5px', fontWeight: 'normal', textAlign: 'center' }}>
                          Account Summary
                        </div>
                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '9.8px', textAlign: 'left', border: 'none' }}>
                          <thead>
                            <tr style={{ background: '#A8A8A8', color: '#ffffff', fontWeight: 'bold', height: '27px', userSelect: 'none' }}>
                              <th style={{ width: '50%', padding: '0 12px', textAlign: 'left', verticalAlign: 'middle', border: 'none', borderRight: '0.75px solid #ffffff' }}>Particulars</th>
                              <th style={{ width: '25%', padding: '0 12px', textAlign: 'right', verticalAlign: 'middle', border: 'none', borderRight: '0.75px solid #ffffff' }}>Opening Balance</th>
                              <th style={{ width: '25%', padding: '0 12px', textAlign: 'right', verticalAlign: 'middle', border: 'none' }}>Closing Balance</th>
                            </tr>
                          </thead>
                          <tbody>
                            <tr style={{ background: '#ffffff', height: '27px', color: '#111827', borderBottom: '0.75px solid #d1d5db' }}>
                              <td style={{ padding: '0 12px', textAlign: 'left', verticalAlign: 'middle', border: 'none' }}>Savings Account (SA):</td>
                              <td style={{ padding: '0 12px', textAlign: 'right', verticalAlign: 'middle', border: 'none' }}>{accountInfo.openingBalance.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                              <td style={{ padding: '0 12px', textAlign: 'right', verticalAlign: 'middle', border: 'none' }}>{closingBalance.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
                            </tr>
                          </tbody>
                        </table>
                      </div>

                      {/* Disclaimer */}
                      <div style={{ marginTop: '40px', fontFamily: 'Arial, Helvetica, sans-serif', textAlign: 'center', color: '#111827', fontSize: '8.2px', lineHeight: '1.55', userSelect: 'none', width: '100%' }}>
                        <div style={{ fontSize: '10.5px', marginBottom: '12px', color: '#000000', fontWeight: 'normal' }}>End of Statement</div>
                        <div>Any discrepancy in the statement should be brought to the notice of Kotak Mahindra Bank Ltd. within</div>
                        <div style={{ marginBottom: '8px' }}>one month from the date of receipt of the statement.</div>
                        <div>This is a system generated report and does not require signature and stamp.</div>
                      </div>
                    </div>
                  )}

                </div>

                """

code = code[:start_idx] + new_summary + code[end_idx:]

with open(r'c:\Users\alkvi\OneDrive\Desktop\bank-statement-generator\bank-statement-generator\frontend\src\components\StatementPreview.tsx', 'w', encoding='utf-8') as f:
    f.write(code)

print("Updated summary block successfully!")

