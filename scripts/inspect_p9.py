import fitz

doc = fitz.open(r"C:\Users\alkvi\Downloads\2004202320223100_882046.pdf")
p9 = doc[8]
print("=== PAGE 9 TEXT ===")
for b in p9.get_text("blocks"):
    print(f"B [{b[0]:.1f}, {b[1]:.1f}, {b[2]:.1f}, {b[3]:.1f}]: {repr(b[4].strip())}")

print("=== PAGE 9 DRAWINGS ===")
drawings = p9.get_drawings()
print("Total drawings on P9:", len(drawings))
for d in drawings:
    print(f"D rect={[round(x, 1) for x in d['rect']]} color={d.get('color')} fill={d.get('fill')}")

