import fitz
import json

doc = fitz.open(r"C:\Users\alkvi\OneDrive\Documents\Verified Statements\Kotak_Statement_VCRCII5720.pdf")

for page_idx in range(len(doc)):
    page = doc[page_idx]
    text = page.get_text("text").splitlines()
    print(f"=== PAGE {page_idx+1} (lines: {len(text)}) ===")
    first_few = [l.strip() for l in text[:6] if l.strip()]
    last_few = [l.strip() for l in text[-6:] if l.strip()]
    print("  First lines:", first_few)
    print("  Last lines:", last_few)

