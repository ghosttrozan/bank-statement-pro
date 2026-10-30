import fitz
import json

real_doc = fitz.open(r"C:\Users\alkvi\OneDrive\Documents\Verified Statements\Kotak_Statement_VCRCII5720.pdf")
gen_doc = fitz.open(r"c:\Users\alkvi\OneDrive\Desktop\bank-statement-generator\bank-statement-generator\Kotak_Generated_Statement.pdf")

def inspect_table(p, name):
    print(f"\n=== {name} Table Area ===")
    pj = json.loads(p.get_text("json"))
    items = []
    for b in pj.get("blocks", []):
        if b.get("type") == 0:
            for l in b.get("lines", []):
                for sp in l.get("spans", []):
                    if sp["bbox"][1] >= 330:
                        items.append((sp["bbox"][1], sp["bbox"][0], sp["font"], sp["size"], hex(sp["color"]), sp["text"]))
    items.sort(key=lambda x: (round(x[0], 1), round(x[1], 1)))
    for s in items[:30]:
        print(f"  y={s[0]:6.1f} x={s[1]:6.1f} font={s[2]:<12} sz={s[3]:4.1f} col={s[4]} : {repr(s[5])}")

inspect_table(real_doc[0], "REAL P1")
inspect_table(gen_doc[0], "GEN P1")

