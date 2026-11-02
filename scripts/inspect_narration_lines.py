import fitz

doc = fitz.open(r"C:\Users\alkvi\Downloads\2004202320223100_882046.pdf")
p1 = doc[0]

td = p1.get_text("dict")
for b in td["blocks"]:
    if "lines" in b:
        for l in b["lines"]:
            spans_txt = "".join([s["text"] for s in l["spans"]])
            if "UPI/" in spans_txt or "NEFT/" in spans_txt or "IMPS/" in spans_txt:
                bbox = l["bbox"]
                if bbox[0] > 180 and bbox[2] < 370:
                    print(f"bbox={[round(v, 1) for v in bbox]} text={repr(spans_txt)}")

