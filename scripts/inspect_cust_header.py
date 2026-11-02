import fitz
import json

doc = fitz.open(r"C:\Users\alkvi\Downloads\2004202320223100_882046.pdf")
p1 = doc[0]

print("=== P1 DRAWINGS DETAILED ===")
for i in range(15):
    d = p1.get_drawings()[i]
    print(f"D{i}:")
    print(f"  rect: {d['rect']}")
    print(f"  color: {d.get('color')}, fill: {d.get('fill')}, width: {d.get('width')}, dashes: {d.get('dashes')}")
    print(f"  items: {d['items']}")

print("\n=== P1 SPANS AROUND CUSTOMER DETAILS (y 140 to 240) ===")
td = p1.get_text("dict")
for b in td["blocks"]:
    if "lines" in b:
        for l in b["lines"]:
            for s in l["spans"]:
                if 140 <= s["bbox"][1] <= 245:
                    print(f"  y0={s['bbox'][1]:.1f}, x0={s['bbox'][0]:.1f}, size={s['size']}, font={s['font']}, text={repr(s['text'])}")

print("\n=== P1 TABLE HEADER SPANS (y 240 to 270) ===")
for b in td["blocks"]:
    if "lines" in b:
        for l in b["lines"]:
            for s in l["spans"]:
                if 240 <= s["bbox"][1] <= 270:
                    print(f"  y0={s['bbox'][1]:.1f}, x0={s['bbox'][0]:.1f}, size={s['size']}, font={s['font']}, text={repr(s['text'])}")

