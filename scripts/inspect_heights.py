import fitz

doc = fitz.open(r"C:\Users\alkvi\Downloads\2004202320223100_882046.pdf")
p3 = doc[2]
drawings = p3.get_drawings()
# Find all row boxes in column 0 (Transaction Date, x0 ~ 62.15)
col0_boxes = [d["rect"] for d in drawings if abs(d["rect"].x0 - 62.15) < 1.0]
col0_boxes = sorted(col0_boxes, key=lambda r: r.y0)

print(f"Col0 boxes on Page 3 (total {len(col0_boxes)}):")
for b in col0_boxes:
    # get text inside this box
    txt = p3.get_text("text", clip=b).strip()
    print(f"  y0={b.y0:.1f}, y1={b.y1:.1f}, h={b.height:.1f} -> {repr(txt)}")

