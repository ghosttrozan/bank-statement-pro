import fitz
import json

doc = fitz.open(r"C:\Users\alkvi\Downloads\2004202320223100_882046.pdf")

print("=== FONT LIST ===")
for pno in range(len(doc)):
    page = doc[pno]
    fonts = page.get_fonts()
    if fonts:
        print(f"Page {pno+1} fonts:", fonts)

print("\n=== PAGE 1 DETAILED SPANS ===")
p1 = doc[0]
text_instances = p1.get_text("words")
# Or get text dictionary with spans
text_dict = p1.get_text("dict")
for block in text_dict["blocks"]:
    if "lines" in block:
        for line in block["lines"]:
            for span in line["spans"]:
                print(f"P1 Span: bbox={[round(x, 1) for x in span['bbox']]} font={span['font']} size={round(span['size'], 1)} color=#{span['color']:06x} text={repr(span['text'])}")

print("\n=== PAGE 2 DETAILED SPANS (First 15 spans) ===")
p2 = doc[1]
text_dict_p2 = p2.get_text("dict")
count = 0
for block in text_dict_p2["blocks"]:
    if "lines" in block:
        for line in block["lines"]:
            for span in line["spans"]:
                if count < 25:
                    print(f"P2 Span: bbox={[round(x, 1) for x in span['bbox']]} font={span['font']} size={round(span['size'], 1)} color=#{span['color']:06x} text={repr(span['text'])}")
                    count += 1

print("\n=== PAGE 9 (LAST PAGE) DETAILS ===")
p_last = doc[-1]
text_dict_last = p_last.get_text("dict")
for block in text_dict_last["blocks"]:
    if "lines" in block:
        for line in block["lines"]:
            for span in line["spans"]:
                print(f"Last Page Span: bbox={[round(x, 1) for x in span['bbox']]} font={span['font']} size={round(span['size'], 1)} color=#{span['color']:06x} text={repr(span['text'])}")

print("\n=== PAGE 1 RECTS & LINES ===")
drawings_p1 = p1.get_drawings()
for i, d in enumerate(drawings_p1):
    # show rect, type of items
    items_summary = [it[0] for it in d["items"]]
    print(f"D{i}: rect={[round(x, 1) for x in d['rect']]} color={d.get('color')} fill={d.get('fill')} width={d.get('width')} items={items_summary}")

