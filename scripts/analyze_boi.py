import fitz
import os
import json

doc = fitz.open(r"C:\Users\alkvi\Downloads\2004202320223100_882046.pdf")
print("=== METADATA ===")
print(json.dumps(doc.metadata, indent=2))

out_dir = r"bank-statement-generator\scripts\boi_assets"
os.makedirs(out_dir, exist_ok=True)

print(f"Total pages: {len(doc)}")

# 1. Images
img_count = 0
for pno in range(len(doc)):
    page = doc[pno]
    for img_idx, img in enumerate(page.get_images(full=True)):
        xref = img[0]
        base_img = doc.extract_image(xref)
        img_bytes = base_img["image"]
        img_ext = base_img["ext"]
        img_path = os.path.join(out_dir, f"img_p{pno+1}_{img_idx}.{img_ext}")
        with open(img_path, "wb") as f:
            f.write(img_bytes)
        print(f"Image Page {pno+1}: {img_path}, format={img_ext}, size={len(img_bytes)}B, w={base_img['width']}, h={base_img['height']}")
        img_count += 1

# 2. Page 1 text blocks
print("\n=== PAGE 1 TEXT BLOCKS ===")
p1 = doc[0]
for b_idx, b in enumerate(p1.get_text("blocks")):
    # b: (x0, y0, x1, y1, text, block_no, block_type)
    if b[6] == 0: # text
        print(f"B{b_idx} [{b[0]:.1f}, {b[1]:.1f}, {b[2]:.1f}, {b[3]:.1f}]: {repr(b[4].strip())}")

# 3. Page 2 text blocks
print("\n=== PAGE 2 TEXT BLOCKS (First 10) ===")
p2 = doc[1]
for b_idx, b in enumerate(p2.get_text("blocks")[:10]):
    if b[6] == 0:
        print(f"B{b_idx} [{b[0]:.1f}, {b[1]:.1f}, {b[2]:.1f}, {b[3]:.1f}]: {repr(b[4].strip())}")

# 4. Drawings on Page 1 & Page 2
print("\n=== DRAWINGS PAGE 1 ===")
drawings_p1 = p1.get_drawings()
print(f"Total drawings on P1: {len(drawings_p1)}")
for d_idx, d in enumerate(drawings_p1[:15]):
    print(f"D{d_idx} rect={d['rect']}, color={d.get('color')}, fill={d.get('fill')}, width={d.get('width')}")

print("\n=== DRAWINGS PAGE 2 ===")
drawings_p2 = p2.get_drawings()
print(f"Total drawings on P2: {len(drawings_p2)}")
for d_idx, d in enumerate(drawings_p2[:15]):
    print(f"D{d_idx} rect={d['rect']}, color={d.get('color')}, fill={d.get('fill')}, width={d.get('width')}")

