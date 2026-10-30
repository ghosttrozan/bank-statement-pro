import fitz
import json

doc = fitz.open(r"C:\Users\alkvi\OneDrive\Documents\Verified Statements\Kotak_Statement_VCRCII5720.pdf")

print("PDF Page rect:", doc[0].rect)

for pno in [0, 1, 7]:
    p = doc[pno]
    print(f"\n====================== PAGE {pno+1} DETAILED DUMP ======================")
    # Print all drawings sorted by y0, x0
    drawings = p.get_drawings()
    print(f"Total drawings: {len(drawings)}")
    for i, d in enumerate(drawings):
        r = d["rect"]
        f = [round(c, 3) for c in d["fill"]] if d.get("fill") else None
        s = [round(c, 3) for c in d["color"]] if d.get("color") else None
        # Only print non-white-background or structural drawings
        if r.width == 595.5 and r.height == 842.25:
            continue
        print(f"  D[{i}] rect=({r.x0:.2f}, {r.y0:.2f}, {r.x1:.2f}, {r.y1:.2f}) w={r.width:.2f} h={r.height:.2f} fill={f} stroke={s} width={d.get('width')}")

    # Print all text lines sorted by y
    pj = json.loads(p.get_text("json"))
    text_items = []
    for b in pj.get("blocks", []):
        if b.get("type") == 0:
            for l in b.get("lines", []):
                for sp in l.get("spans", []):
                    text_items.append((sp["bbox"][1], sp["bbox"][0], sp["bbox"], sp["font"], sp["size"], hex(sp["color"]), sp["text"]))
    text_items.sort(key=lambda x: (round(x[0], 1), round(x[1], 1)))
    print(f"Total text spans: {len(text_items)}")
    for y, x, bbox, font, sz, col, txt in text_items[:50]:
        print(f"  T: y={y:6.2f} x={x:6.2f} bbox=({bbox[0]:.1f},{bbox[1]:.1f},{bbox[2]:.1f},{bbox[3]:.1f}) font={font:<14} sz={sz:4.1f} col={col} : {repr(txt)}")
    if len(text_items) > 50:
        print(f"  ... and {len(text_items)-50} more spans ...")
        for y, x, bbox, font, sz, col, txt in text_items[-15:]:
            print(f"  T-end: y={y:6.2f} x={x:6.2f} bbox=({bbox[0]:.1f},{bbox[1]:.1f},{bbox[2]:.1f},{bbox[3]:.1f}) font={font:<14} sz={sz:4.1f} col={col} : {repr(txt)}")

