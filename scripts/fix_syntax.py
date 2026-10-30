with open(r'c:\Users\alkvi\OneDrive\Desktop\bank-statement-generator\bank-statement-generator\frontend\src\components\StatementPreview.tsx', 'r', encoding='utf-8') as f:
    code = f.read()

# Fix 1:
code = code.replace("/* STATEMENT TRANSACTIONS LIST TABLE */}", "{/* STATEMENT TRANSACTIONS LIST TABLE */}")

# Fix 2:
bad_part = """                /* Kotak / BOI bottom bar */
                  // <div style={{ marginTop: '6px' }}>
                  //   <div className='text-gray-600' style={{
                  //     fontSize: '8.5px',
                  //     fontFamily: 'Arial, Helvetica, sans-serif',
                  //     padding: '5px 10mm',
                  //     display: 'flex',
                  //     alignItems: 'center',
                  //     justifyContent: 'space-between',
                  //     userSelect: 'none',
                  //   }}>
                  //     <span className='text-gray-600' style={{ fontStyle: 'italic', fontSize: '12px', letterSpacing: '-0.3px' }}>Statement Generated on {formattedDateNow()}</span>
                  //     {/* <span style={{ opacity: 0.85 }}>This is a system-generated statement. | Kotak Mahindra Bank Ltd.</span> */}
                  //     <span className='text-gray-600' style={{ background: 'rgba(255,255,255,0.15)', padding: '1px 8px', borderRadius: '3px', fontSize: '12px' }}>Page {pageNum} of {allPages.length}</span>
                  //   </div>
                  // </div>
                  <div></div>
                )}"""

good_part = """                {settings.bankStyle === 'SBI' ? (
                  <div style={{ textAlign: 'center', fontFamily: 'sans-serif', fontSize: '11px', fontWeight: 400, color: '#4b5563', paddingBottom: '10px', userSelect: 'none' }}>
                    Page no. {pageNum}
                  </div>
                ) : settings.bankStyle === 'PNB' ? (
                  <div style={{ textAlign: 'right', fontFamily: 'sans-serif', fontSize: '10px', fontWeight: 400, color: '#000000', paddingRight: '10mm', paddingBottom: '10px', userSelect: 'none' }}>
                    Page No - {pageNum}
                  </div>
                ) : (
                  <div></div>
                )}"""

code = code.replace(bad_part, good_part)

with open(r'c:\Users\alkvi\OneDrive\Desktop\bank-statement-generator\bank-statement-generator\frontend\src\components\StatementPreview.tsx', 'w', encoding='utf-8') as f:
    f.write(code)

print("Applied fixes!")

