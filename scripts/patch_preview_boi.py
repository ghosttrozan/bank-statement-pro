path = r'bank-statement-generator\frontend\src\components\StatementPreview.tsx'
with open(path, 'r', encoding='utf-8') as f:
    code = f.read()

# 1. Add formatBoiTxnDate and formatBoiHeaderDate
helper_funcs = '''function formatBoiTxnDate(dateStr: string): string {
  if (!dateStr) return '';
  const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const parts = dateStr.split(/[-/]/);
  if (parts.length === 3) {
    let day = 0, month = 0, year = 0;
    if (parts[0].length === 4) {
      year = parseInt(parts[0], 10);
      month = parseInt(parts[1], 10) - 1;
      day = parseInt(parts[2], 10);
    } else {
      day = parseInt(parts[0], 10);
      month = parseInt(parts[1], 10) - 1;
      year = parseInt(parts[2], 10);
    }
    if (!isNaN(day) && !isNaN(month) && !isNaN(year) && month >= 0 && month < 12) {
      const d = day.toString().padStart(2, '0');
      const m = MONTHS[month];
      return `${d}-${m}-${year}`;
    }
  }
  return dateStr;
}

function formatBoiHeaderDate(dateStr: string): string {
  if (!dateStr) return '';
  const parts = dateStr.split(/[-/]/);
  if (parts.length === 3) {
    let day = 0, month = 0, year = 0;
    if (parts[0].length === 4) {
      year = parseInt(parts[0], 10);
      month = parseInt(parts[1], 10);
      day = parseInt(parts[2], 10);
    } else {
      day = parseInt(parts[0], 10);
      month = parseInt(parts[1], 10);
      year = parseInt(parts[2], 10);
    }
    if (!isNaN(day) && !isNaN(month) && !isNaN(year)) {
      return `${day.toString().padStart(2, '0')}-${month.toString().padStart(2, '0')}-${year}`;
    }
  }
  return dateStr;
}
'''

target_helper_anchor = 'function formatAddress4Lines'
code = code.replace(target_helper_anchor, helper_funcs + '\n' + target_helper_anchor)

# 2. Update chunk limit for BOI
code = code.replace(
    "settings.bankStyle === 'BOI'\n        ? chunkTransactionsForA4(transactions, 18, 38)",
    "settings.bankStyle === 'BOI'\n        ? chunkTransactionsForA4(transactions, 24, 35)"
)

# 3. Replace BOI Header in StatementPreview
old_boi_header_start = "/* BOI DESIGN THEME */"
old_boi_header_end = ") : settings.bankStyle === 'PNB' ? ("

idx_start = code.find(old_boi_header_start)
idx_end = code.find(old_boi_header_end)

if idx_start != -1 and idx_end != -1:
    new_boi_header = """/* BOI DESIGN THEME */
                    <div className="w-full" style={{ fontFamily: '"Times New Roman", Times, serif', color: '#000000', padding: '0 21.92mm', paddingTop: '10px' }}>
                      {isFirst ? (
                        <div>
                          {/* Top "dummy statement" in small letters */}
                          <div style={{ fontSize: '8pt', color: '#000000', marginBottom: '8px', textAlign: 'left' }}>
                            dummy statement
                          </div>

                          {/* Centered BOI Logo 50x50 */}
                          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '4px' }}>
                            <img
                              src="/logos/boi_logo.png"
                              alt="Bank of India"
                              style={{ width: '50px', height: '50px', objectFit: 'contain' }}
                            />
                          </div>

                          {/* Report Generation Date Right Aligned */}
                          <div style={{ textAlign: 'right', fontSize: '9pt', color: '#000000', marginRight: '24px', marginBottom: '8px' }}>
                            Report Generation Date : {formatBoiHeaderDate(new Date().toISOString().split('T')[0])}
                          </div>

                          {/* Banner: Left-aligned at 90.3pt (~12%) */}
                          <div style={{ fontSize: '10pt', color: '#000000', marginLeft: '28px', marginBottom: '22px', lineHeight: 1.45 }}>
                            <div>THE MPASSBOOK STATEMENT IS GENERATED FOR SELECTED DATE RANGE BETWEEN</div>
                            <div>{formatBoiHeaderDate(transactions[0]?.valueDate || '2022-10-22')} TO {formatBoiHeaderDate(transactions[transactions.length - 1]?.valueDate || '2023-04-20')}.</div>
                          </div>

                          {/* Customer Details Header */}
                          <div style={{ fontSize: '10pt', color: '#000000', marginBottom: '4px' }}>
                            &nbsp;CUSTOMER DETAILS
                          </div>

                          {/* Customer Details 2-box grid */}
                          <div style={{ display: 'flex', width: '100%', marginBottom: '20px' }}>
                            <div style={{ width: '50%', border: '0.5px solid #000', padding: '4px 6px', fontSize: '9pt', lineHeight: 1.45 }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2px' }}>
                                <span>Customer ID</span>
                                <span>{customerDetails.cifNumber || '138157654'}</span>
                              </div>
                              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '2px' }}>
                                <span>Account No</span>
                                <span>{customerDetails.accountNumber || '902610110005760'}</span>
                              </div>
                              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                <span>Name of Customer</span>
                                <span style={{ textAlign: 'right' }}>{(customerDetails.accountHolderName || 'ARVIND S/O  NARBAT SINGH').toUpperCase()}</span>
                              </div>
                            </div>
                            <div style={{ width: '50%', border: '0.5px solid #000', borderLeft: 'none', padding: '4px 8px', fontSize: '9pt', lineHeight: 1.45 }}>
                              <div>Address of Customer</div>
                              <div>{customerDetails.address || '2229/2 RAMNAGAR TEH ICHHAWAR DIST SEHORE'}</div>
                              <div>{(customerDetails.city || 'MP ICHHAWAR MADHYA PRADESH') + ' INDIA ' + (customerDetails.pinCode || '466115')}</div>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div style={{ height: '10px' }}></div>
                      )}
                    </div>
                  """
    code = code[:idx_start] + new_boi_header + code[idx_end:]
    print("Replaced BOI Header successfully")
else:
    print("Could not find BOI Header block:", idx_start, idx_end)

# 4. Replace BOI Table in StatementPreview
old_boi_table_start = "/* ─── BOI TABLE ─────────────────────────────────────────── */"
old_boi_table_end = ") : settings.bankStyle === 'PNB' ? ("

idx_t_start = code.find(old_boi_table_start)
idx_t_end = code.find(old_boi_table_end)

if idx_t_start != -1 and idx_t_end != -1:
    new_boi_table = """/* ─── BOI TABLE ─────────────────────────────────────────── */
                        <div style={{ fontFamily: '"Times New Roman", Times, serif', width: '100%', padding: '0 21.92mm' }}>
                          <table style={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed' }}>
                            <colgroup>
                              <col style={{ width: '12.5%' }} />
                              <col style={{ width: '14.3%' }} />
                              <col style={{ width: '37.5%' }} />
                              <col style={{ width: '10.7%' }} />
                              <col style={{ width: '10.7%' }} />
                              <col style={{ width: '14.3%' }} />
                            </colgroup>
                            {isFirst && (
                              <thead>
                                <tr style={{ height: '24px', backgroundColor: '#fff' }}>
                                  <th style={{ border: '0.5px solid #000', padding: '2px', textAlign: 'center', fontSize: '10pt', fontWeight: 'normal', lineHeight: 1.1 }}>
                                    Transaction<br />Date
                                  </th>
                                  <th style={{ border: '0.5px solid #000', padding: '2px', textAlign: 'center', fontSize: '10pt', fontWeight: 'normal' }}>Instrument Id</th>
                                  <th style={{ border: '0.5px solid #000', padding: '2px', textAlign: 'center', fontSize: '10pt', fontWeight: 'normal' }}>Narration</th>
                                  <th style={{ border: '0.5px solid #000', padding: '2px', textAlign: 'center', fontSize: '10pt', fontWeight: 'normal' }}>Debit</th>
                                  <th style={{ border: '0.5px solid #000', padding: '2px', textAlign: 'center', fontSize: '10pt', fontWeight: 'normal' }}>Credit</th>
                                  <th style={{ border: '0.5px solid #000', padding: '2px', textAlign: 'center', fontSize: '10pt', fontWeight: 'normal' }}>Balance</th>
                                </tr>
                              </thead>
                            )}
                            <tbody>
                              {chunkTransactions.map((tx) => (
                                <tr key={tx.id} style={{ height: tx.details && tx.details.length > 28 ? '22px' : '13px' }}>
                                  <td style={{ border: '0.5px solid #000', padding: '2px 4px', fontSize: '9pt', textAlign: 'left', verticalAlign: 'top', whiteSpace: 'nowrap' }}>
                                    {formatBoiTxnDate(tx.valueDate)}
                                  </td>
                                  <td style={{ border: '0.5px solid #000', padding: '2px 4px', fontSize: '9pt', textAlign: 'left', verticalAlign: 'top' }}>
                                    {tx.refNo && !tx.refNo.match(/^\\d{12}$/) ? tx.refNo : ''}
                                  </td>
                                  <td style={{ border: '0.5px solid #000', padding: '2px 4px', fontSize: '9pt', textAlign: 'left', verticalAlign: 'top', wordBreak: 'break-word', lineHeight: 1.1 }}>
                                    {tx.details}
                                  </td>
                                  <td style={{ border: '0.5px solid #000', padding: '2px 4px', fontSize: '9pt', textAlign: 'right', verticalAlign: 'top', whiteSpace: 'nowrap' }}>
                                    {tx.debit && tx.debit > 0 ? tx.debit.toFixed(2) : '-'}
                                  </td>
                                  <td style={{ border: '0.5px solid #000', padding: '2px 4px', fontSize: '9pt', textAlign: 'right', verticalAlign: 'top', whiteSpace: 'nowrap' }}>
                                    {tx.credit && tx.credit > 0 ? tx.credit.toFixed(2) : '-'}
                                  </td>
                                  <td style={{ border: '0.5px solid #000', padding: '2px 4px', fontSize: '9pt', textAlign: 'right', verticalAlign: 'top', whiteSpace: 'nowrap' }}>
                                    {tx.balance.toFixed(2)}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                          {isLast && (
                            <div style={{ marginTop: '20px', fontSize: '10pt', color: '#000000', lineHeight: 1.6 }}>
                              <div>Effective available balance as on {(() => {
                                const d = new Date();
                                const dd = String(d.getDate()).padStart(2, '0');
                                const mm = String(d.getMonth() + 1).padStart(2, '0');
                                const yyyy = d.getFullYear();
                                const hh = String(d.getHours()).padStart(2, '0');
                                const min = String(d.getMinutes()).padStart(2, '0');
                                const ss = String(d.getSeconds()).padStart(2, '0');
                                return `${dd}-${mm}-${yyyy} ${hh}:${min}:${ss}`;
                              })()} is INR {closingBalance.toFixed(2)}</div>
                              <div style={{ marginTop: '8px' }}>**This is a computer generated statement and does not require a signature.</div>
                            </div>
                          )}
                        </div>
                      """
    code = code[:idx_t_start] + new_boi_table + code[idx_t_end:]
    print("Replaced BOI Table successfully")
else:
    print("Could not find BOI Table block:", idx_t_start, idx_t_end)

with open(path, 'w', encoding='utf-8') as f:
    f.write(code)
print("Updated StatementPreview.tsx successfully")

