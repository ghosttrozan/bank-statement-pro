import fitz

doc = fitz.open(r"C:\Users\alkvi\OneDrive\Documents\Verified Statements\Kotak_Statement_VCRCII5720.pdf")
p = doc[0]
drawings = p.get_drawings()

print(f"Page 1 has {len(drawings)} drawings")
table_drawings = [d for d in drawings if d["rect"].y0 >= 330.0]
print(f"Table area drawings: {len(table_drawings)}")

# Print unique fills and strokes
fills = set()
strokes = set()
for d in table_drawings:
    if d.get("fill"):
        fills.add(tuple(round(c, 3) for c in d["fill"]))
    if d.get("color"):
        strokes.add((tuple(round(c, 3) for c in d["color"]), d.get("width")))

print("Unique Fills in table area:", fills)
print("Unique Strokes in table area:", strokes)

# Let's inspect rows on page 1
print("\n--- Rows on Page 1 ---")
for i, d in enumerate(table_drawings[:40]):
    r = d["rect"]
    f = [round(c, 3) for c in d.get("fill")] if d.get("fill") else None
    s = [round(c, 3) for c in d.get("color")] if d.get("color") else None
    print(f"  [{i}] rect=({r.x0:.2f}, {r.y0:.2f}, {r.x1:.2f}, {r.y1:.2f}) w={r.width:.2f} h={r.height:.2f} fill={f} stroke={s}")

