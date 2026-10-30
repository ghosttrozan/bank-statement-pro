import fitz
import json

doc = fitz.open(r"C:\Users\alkvi\OneDrive\Documents\Verified Statements\Kotak_Statement_VCRCII5720.pdf")
p = doc[0]
p_json = json.loads(p.get_text("json"))
for b in p_json.get("blocks", []):
    if b.get("type") == 0:
        for l in b.get("lines", []):
            line_str = " ".join([s["text"] for s in l.get("spans", [])]).strip()
            span0 = l["spans"][0]
            if span0["bbox"][1] > 800:
                print(f"y={span0['bbox'][1]:5.1f} x={span0['bbox'][0]:5.1f} : {line_str}")

