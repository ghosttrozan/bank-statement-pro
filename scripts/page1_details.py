import fitz
import json

doc = fitz.open(r"C:\Users\alkvi\OneDrive\Documents\Verified Statements\Kotak_Statement_VCRCII5720.pdf")
p = doc[0]
p_json = json.loads(p.get_text("json"))
print("--- ALL TEXT ON PAGE 1 ORDERED BY Y ---")
lines = []
for b in p_json.get("blocks", []):
    if b.get("type") == 0:
        for l in b.get("lines", []):
            line_str = " ".join([s["text"] for s in l.get("spans", [])]).strip()
            span0 = l["spans"][0]
            lines.append((span0["bbox"][1], span0["bbox"][0], line_str, span0))

lines.sort(key=lambda x: (x[0], x[1]))
for y, x, s, sp in lines:
    print(f"y={y:5.1f} x={x:5.1f} sz={sp['size']:4.1f} font={sp['font']:<14} : {s}")

