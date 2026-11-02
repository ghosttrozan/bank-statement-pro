import fitz

doc = fitz.open(r"C:\Users\alkvi\Downloads\2004202320223100_882046.pdf")
p1 = doc[0]

print("=== PAGE 1 SPANS WITH BASELINE (first 40) ===")
td = p1.get_text("dict")
count = 0
for b in td["blocks"]:
    if "lines" in b:
        for l in b["lines"]:
            for s in l["spans"]:
                if count < 40:
                    origin = s.get("origin", (None, None))
                    print(f"text={repr(s['text']):<35} font={s['font']} size={s['size']:<4.1f} bbox={[round(v,2) for v in s['bbox']]} origin={[round(v,2) for v in origin]}")
                    count += 1

print("\n=== PAGE 1 DRAWINGS DETAILED ===")
drawings = p1.get_drawings()
for i, d in enumerate(drawings[:20]):
    print(f"D{i}: rect={[round(v,2) for v in d['rect']]} color={d.get('color')} fill={d.get('fill')} width={d.get('width')} items={d['items']}")
