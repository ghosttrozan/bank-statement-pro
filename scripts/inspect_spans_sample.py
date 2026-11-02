import fitz

doc = fitz.open(r"C:\Users\alkvi\Downloads\2004202320223100_882046.pdf")
p1 = doc[0]

# Inspect spans in y range 267 to 350
td = p1.get_text("dict")
for b in td["blocks"]:
    if "lines" in b:
        for l in b["lines"]:
            for s in l["spans"]:
                if 267 <= s["bbox"][1] <= 335:
                    print(f"y0={s['bbox'][1]:.1f}, x0={s['bbox'][0]:.1f}, x1={s['bbox'][2]:.1f}, text={repr(s['text'])}")

