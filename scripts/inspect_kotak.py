import fitz
import os

def inspect_pdf(path, name):
    if not os.path.exists(path):
        print(f"File not found: {path}")
        return
    doc = fitz.open(path)
    print(f"=== {name}: {path} ===")
    print("Pages:", len(doc))
    for p_num in range(min(2, len(doc))):
        page = doc[p_num]
        print(f"--- Page {p_num+1} (w={page.rect.width}, h={page.rect.height}) ---")
        imgs = page.get_images()
        print(f"Images: {len(imgs)}")
        for img in imgs:
            xref = img[0]
            base_image = doc.extract_image(xref)
            print(f"  Image xref={xref}, ext={base_image['ext']}, w={base_image['width']}, h={base_image['height']}")
        
        blocks = page.get_text("blocks")
        print(f"Text blocks count: {len(blocks)}")
        for b in blocks[:15]:
            print(f"  bbox=({b[0]:.1f}, {b[1]:.1f}, {b[2]:.1f}, {b[3]:.1f}) text={repr(b[4][:80])}")

inspect_pdf(r"C:\Users\alkvi\OneDrive\Documents\Verified Statements\Kotak_Statement_VCRCII5720.pdf", "REAL")
print("\n" + "="*50 + "\n")
inspect_pdf(r"c:\Users\alkvi\OneDrive\Desktop\bank-statement-generator\bank-statement-generator\Kotak_Generated_Statement.pdf", "GENERATED")

