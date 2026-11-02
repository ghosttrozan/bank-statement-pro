import fitz

doc = fitz.open(r"C:\Users\alkvi\Downloads\2004202320223100_882046.pdf")

for pno in [0, 1, 2, 7, 8]:
    page = doc[pno]
    drawings = page.get_drawings()
    y_coords = sorted(list(set([round(d["rect"].y0, 1) for d in drawings] + [round(d["rect"].y1, 1) for d in drawings])))
    x_coords = sorted(list(set([round(d["rect"].x0, 1) for d in drawings] + [round(d["rect"].x1, 1) for d in drawings])))
    print(f"=== PAGE {pno+1} ===")
    print(f"X coords: {x_coords}")
    print(f"Y min: {min(y_coords) if y_coords else None}, Y max: {max(y_coords) if y_coords else None}")
    print(f"Y steps (first 10): {y_coords[:10]}")
    print(f"Y steps (last 10): {y_coords[-10:]}")
    print(f"Total row divisions: {len(y_coords)}")

