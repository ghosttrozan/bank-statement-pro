import fitz
import json

doc = fitz.open(r"C:\Users\alkvi\OneDrive\Documents\Verified Statements\Kotak_Statement_VCRCII5720.pdf")

for p_num in range(1, 7):
    p = doc[p_num]
    text = p.get_text("text").splitlines()
    print(f"\n--- Page {p_num+1} Top & Bottom ---")
    for t in text[:10]:
        if "forward" in t.lower() or "brought" in t.lower() or "carried" in t.lower():
            print("  Top match:", t)
    for t in text[-15:]:
        if "forward" in t.lower() or "brought" in t.lower() or "carried" in t.lower():
            print("  Bottom match:", t)

