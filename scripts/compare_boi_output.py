import fitz
import json

doc_gen = fitz.open("boi_generated_test.pdf")
doc_ref = fitz.open(r"C:\Users\alkvi\Downloads\2004202320223100_882046.pdf")

print("=== GENERATED METADATA ===")
print(json.dumps(doc_gen.metadata, indent=2))
print("Page count:", len(doc_gen))

p1_gen = doc_gen[0]
p1_ref = doc_ref[0]

print("\n=== GENERATED PAGE 1 SPANS ===")
for b in p1_gen.get_text("dict")["blocks"]:
    if "lines" in b:
        for l in b["lines"]:
            for s in l["spans"]:
                if s["bbox"][1] < 270:
                    print(f"y0={s['bbox'][1]:.1f}, x0={s['bbox'][0]:.1f}, size={s['size']}, font={s['font']}, text={repr(s['text'])}")

print("\n=== REFERENCE PAGE 1 SPANS (for comparison) ===")
for b in p1_ref.get_text("dict")["blocks"]:
    if "lines" in b:
        for l in b["lines"]:
            for s in l["spans"]:
                if s["bbox"][1] < 270 and s["text"].strip():
                    print(f"y0={s['bbox'][1]:.1f}, x0={s['bbox'][0]:.1f}, size={s['size']}, font={s['font']}, text={repr(s['text'])}")

print("\n=== GENERATED LAST PAGE TEXT ===")
p_last_gen = doc_gen[-1]
for b in p_last_gen.get_text("blocks"):
    if "Effective" in b[4] or "signature" in b[4]:
        print(f"y0={b[1]:.1f}, x0={b[0]:.1f}, text={repr(b[4].strip())}")

print("\n=== REFERENCE LAST PAGE TEXT ===")
p_last_ref = doc_ref[-1]
for b in p_last_ref.get_text("blocks"):
    if "Effective" in b[4] or "signature" in b[4]:
        print(f"y0={b[1]:.1f}, x0={b[0]:.1f}, text={repr(b[4].strip())}")

