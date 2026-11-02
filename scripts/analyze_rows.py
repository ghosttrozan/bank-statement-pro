import fitz

doc = fitz.open(r"C:\Users\alkvi\Downloads\2004202320223100_882046.pdf")
for pno in range(len(doc)):
    page = doc[pno]
    drawings = page.get_drawings()
    # table rects are those where width > 40
    table_drawings = [d for d in drawings if round(d["rect"].width, 1) in [58.8, 67.2, 176.5, 50.4, 50.5]]
    y_starts = sorted(list(set([round(d["rect"].y0, 1) for d in table_drawings])))
    diffs = [round(y_starts[i+1] - y_starts[i], 1) for i in range(len(y_starts)-1)]
    print(f"Page {pno+1}: {len(y_starts)} table rows/cells, Y range: {y_starts[0] if y_starts else None} to {round(max([d['rect'].y1 for d in table_drawings]), 1) if table_drawings else None}, diffs: {set(diffs)}")

