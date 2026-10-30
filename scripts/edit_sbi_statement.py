import fitz, sys, os

# Input and output paths
INPUT_PDF = r'C:\Users\alkvi\OneDrive\Documents\Verified Statements\1-sbi.pdf'
OUTPUT_PDF = r'C:\Users\alkvi\OneDrive\Documents\Verified Statements\1-sbi_edited.pdf'

# Replacement mapping (original -> new)
replacements = {
    'Mrs. Anitabai ambaram gurjar': 'SHARDABAI RADHASHYAM BANJARA',
    'S/O: PAPPU LAL GRAM GULKHEDI SHYAMPUR SEHORE MADHYA PRADESH': 'W/O RADHASHYAM BANJARA, LADON, DIST-AGAR',
    '00000036009463215': '36456419391',
    '89206398799': '89558162625',
    'SBIN0030186': 'SBIN0030069',
    # optional additional fields – add as needed
}

# Open the source PDF
doc = fitz.open(INPUT_PDF)

for page_num, page in enumerate(doc, start=1):
    text = page.get_text()
    for old, new in replacements.items():
        if old in text:
            # Find all occurrences of the old text
            areas = page.search_for(old)
            for rect in areas:
                # Redact / hide the old text
                page.add_redact_annot(rect, fill=(1,1,1))
            # Apply redactions now (removes the old text)
            if areas:
                page.apply_redactions()
                # Insert the new text at the first occurrence location
                # Slightly adjust Y to keep baseline alignment
                rect = areas[0]
                # Use the same font size approximation (12 pts) – you can tune
                page.insert_textbox(rect, new, fontname='helv', fontsize=10, color=(0,0,0))

# Save edited PDF
doc.save(OUTPUT_PDF, garbage=4, deflate=True)
print(f'Edited PDF saved to {OUTPUT_PDF}')

