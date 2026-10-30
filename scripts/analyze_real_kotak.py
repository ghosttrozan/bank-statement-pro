import fitz
import json
import os

doc = fitz.open(r"C:\Users\alkvi\OneDrive\Documents\Verified Statements\Kotak_Statement_VCRCII5720.pdf")

out_dir = r"C:\Users\alkvi\.gemini\antigravity\brain\87ddefb5-19c9-4ad6-8c4a-5fff82dd2975"

# Extract images
for idx, img in enumerate(doc[0].get_images()):
    xref = img[0]
    base = doc.extract_image(xref)
    ext = base["ext"]
    img_name = f"kotak_extracted_{idx}_{xref}.{ext}"
    img_path = os.path.join(out_dir, img_name)
    with open(img_path, "wb") as f:
        f.write(base["image"])
    print(f"Extracted image {idx}: {img_name}, size: {base['width']}x{base['height']}")

for page_idx in range(min(2, len(doc))):
    page = doc[page_idx]
    print(f"\n==================== PAGE {page_idx+1} ====================")
    text_json = json.loads(page.get_text("json"))
    fonts_seen = set()
    for block in text_json.get("blocks", []):
        if block.get("type") == 0:
            for line in block.get("lines", []):
                for span in line.get("spans", []):
                    fonts_seen.add((span["font"], round(span["size"], 2), hex(span["color"]), span.get("flags")))
                    t = span["text"].strip()
                    if t:
                        print(f"  bbox=({span['bbox'][0]:.1f}, {span['bbox'][1]:.1f}, {span['bbox'][2]:.1f}, {span['bbox'][3]:.1f}) font={span['font']} sz={span['size']:.1f} col={hex(span['color'])} : {repr(t)}")

    print(f"\n--- FONTS ON PAGE {page_idx+1} ---")
    for f in sorted(fonts_seen):
        print(f"  Font: {f[0]}, Size: {f[1]}, Color: {f[2]}, Flags: {f[3]}")
