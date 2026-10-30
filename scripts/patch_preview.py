with open(r'c:\Users\alkvi\OneDrive\Desktop\bank-statement-generator\bank-statement-generator\frontend\src\components\StatementPreview.tsx', 'r', encoding='utf-8') as f:
    text = f.read()

# 1. Update formatKotakDate
old_fn = """function formatKotakDate(dateStr: string): string {
  if (!dateStr) return '';
  const parts = dateStr.split(/[-/]/);
  if (parts.length === 3) {
    const day = parts[0].padStart(2, '0');
    const month = parts[1].padStart(2, '0');
    const year = parts[2];
    return `${day}/${month}/${year}`;
  }
  return dateStr;
}"""

new_fn = """function formatKotakDate(dateStr: string): string {
  if (!dateStr) return '';
  const parts = dateStr.split(/[-/]/);
  if (parts.length === 3) {
    if (parts[0].length === 4) {
      return `${parts[2].padStart(2, '0')}/${parts[1].padStart(2, '0')}/${parts[0]}`;
    }
    const day = parts[0].padStart(2, '0');
    const month = parts[1].padStart(2, '0');
    const year = parts[2];
    return `${day}/${month}/${year}`;
  }
  return dateStr;
}"""

# Normalize CRLF for matching
normalized_text = text.replace('\r\n', '\n')
if old_fn in normalized_text:
    normalized_text = normalized_text.replace(old_fn, new_fn)
    print("Replaced formatKotakDate successfully!")
else:
    print("Could not find old formatKotakDate!")

with open(r'c:\Users\alkvi\OneDrive\Desktop\bank-statement-generator\bank-statement-generator\frontend\src\components\StatementPreview.tsx', 'w', encoding='utf-8') as f:
    f.write(normalized_text)

