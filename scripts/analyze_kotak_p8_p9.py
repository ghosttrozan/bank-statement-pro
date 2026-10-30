import fitz, json, sys
sys.stdout.reconfigure(encoding='utf-8')

doc = fitz.open(r'C:\Users\alkvi\Downloads\AccountStatement_01-Oct-2026_21-Oct-2026.pdf')

def analyze_page(p_idx):
    p = doc[p_idx]
    print(f'=== PAGE {p_idx+1} ===')
    for img_info in p.get_image_info():
        bb = [round(x, 2) for x in img_info['bbox']]
        print('Image bbox:', bb)
    
    drawings = p.get_drawings()
    print(f'Total drawings/rectangles: {len(drawings)}')
    for d in drawings:
        r = d.get('rect')
        fill = d.get('fill')
        color = d.get('color')
        if fill or color:
            print(f'Drawing: {r} fill={fill} stroke={color}')

    blocks = p.get_text('dict')['blocks']
    for b in blocks:
        if b.get('type') == 0:
            for line in b.get('lines', []):
                for span in line.get('spans', []):
                    txt = span['text'].strip()
                    if txt:
                        bb = [round(x, 2) for x in span['bbox']]
                        f_name = span['font']
                        sz = round(span['size'], 1)
                        c = hex(span['color'])
                        print(f'[{txt}] bbox={bb} font={f_name} sz={sz} c={c}')

print('--- PAGE 8 ---')
analyze_page(7)

print('\n--- PAGE 9 ---')
analyze_page(8)

