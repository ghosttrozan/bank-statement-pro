import fitz

doc = fitz.open(r"C:\Users\alkvi\Downloads\2004202320223100_882046.pdf")
p1 = doc[0]

print("=== DRAWINGS IN Y [145, 235] ===")
for i, d in enumerate(p1.get_drawings()):
    r = d["rect"]
    if 145 <= r.y0 <= 235 or 145 <= r.y1 <= 235:
        print(f"D{i}: rect={r}, color={d.get('color')}, fill={d.get('fill')}, width={d.get('width')}, items={d['items']}")

