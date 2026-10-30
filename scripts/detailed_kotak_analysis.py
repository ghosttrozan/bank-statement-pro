import fitz
import json

doc = fitz.open(r"C:\Users\alkvi\OneDrive\Documents\Verified Statements\Kotak_Statement_VCRCII5720.pdf")

print("Total pages:", len(doc))

# Let's inspect page 1, page 2, and the last page (page 8)
for p_idx in [0, 1, 7]:
    p = doc[p_idx]
    print(f"\n############################################################")
    print(f"PAGE {p_idx + 1} (rect: {p.rect})")
    print(f"############################################################")
    
    # 1. Images
    print("--- IMAGES ---")
    for img in p.get_image_info(xrefs=True):
        print(f"  bbox={img['bbox']}, size=({img['width']}x{img['height']}), xref={img['xref']}")
        
    # 2. Drawings / Lines
    print("--- DRAWINGS (lines, borders, backgrounds) ---")
    drawings = p.get_drawings()
    # Group drawings or filter interesting ones
    bg_rects = []
    lines = []
    for d in drawings:
        rect = d["rect"]
        fill = d.get("fill")
        stroke = d.get("color")
        w = d.get("width")
        items = d.get("items")
        if fill is not None:
            bg_rects.append((rect, fill))
        if stroke is not None:
            lines.append((rect, stroke, w, items))
            
    print(f"Total bg fills: {len(bg_rects)}, Total stroked lines/borders: {len(lines)}")
    print("Sample BG Fills:")
    for r, f in bg_rects[:15]:
        print(f"  rect=({r.x0:.1f}, {r.y0:.1f}, {r.x1:.1f}, {r.y1:.1f}) fill={[round(c, 3) for c in f]}")
        
    print("Sample Lines / Strokes:")
    for r, s, w, items in lines[:15]:
        print(f"  rect=({r.x0:.1f}, {r.y0:.1f}, {r.x1:.1f}, {r.y1:.1f}) stroke={[round(c, 3) for c in s]} width={w}")

    # 3. Text spans
    print("--- TEXT BLOCKS / LINES ---")
    p_json = json.loads(p.get_text("json"))
    for b in p_json.get("blocks", []):
        if b.get("type") == 0:
            for l in b.get("lines", []):
                line_str = " ".join([s["text"] for s in l.get("spans", [])]).strip()
                span0 = l["spans"][0]
                print(f"  y={span0['bbox'][1]:.1f} x={span0['bbox'][0]:.1f} font={span0['font']} sz={span0['size']:.1f} color={hex(span0['color'])} :: {line_str}")

