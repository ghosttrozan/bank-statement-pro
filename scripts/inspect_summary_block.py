with open(r'c:\Users\alkvi\OneDrive\Desktop\bank-statement-generator\bank-statement-generator\frontend\src\components\StatementPreview.tsx', 'r', encoding='utf-8') as f:
    code = f.read()

target = "isLast && settings.bankStyle === 'Kotak'"
idx = code.find(target)
if idx != -1:
    print(code[idx-30:idx+1200])

