import fitz, json, sys
sys.stdout.reconfigure(encoding='utf-8')

doc = fitz.open(r'C:\Users\alkvi\Downloads\AccountStatement_01-Oct-2026_21-Oct-2026.pdf')

def get_page_summary(pno):
    p = doc[pno]
    res = {'page': pno + 1, 'images': [], 'rects': [], 'lines': []}
    for info in p.get_image_info():
        res['images'].append({'bbox': [round(x, 2) for x in info['bbox']]})
    for d in p.get_drawings():
        r = d.get('rect')
        fill = d.get('fill')
        stroke = d.get('color')
        res['rects'].append({
            'rect': [round(x, 2) for x in r],
            'fill': [round(c, 3) for c in fill] if fill else None,
            'stroke': [round(c, 3) for c in stroke] if stroke else None
        })
    blocks = p.get_text('dict')['blocks']
    for b in blocks:
        if b.get('type') == 0:
            for l in b.get('lines', []):
                for s in l.get('spans', []):
                    t = s['text'].strip()
                    if t:
                        res['lines'].append({
                            'text': t,
                            'bbox': [round(x, 2) for x in s['bbox']],
                            'font': s['font'],
                            'size': round(s['size'], 2),
                            'color': hex(s['color'])
                        })
    return res

with open(r'C:\Users\alkvi\.gemini\antigravity\brain\87ddefb5-19c9-4ad6-8c4a-5fff82dd2975\page_summary.json', 'w', encoding='utf-8') as f:
    json.dump([get_page_summary(0), get_page_summary(1), get_page_summary(7), get_page_summary(8)], f, indent=2)

print('Dumped pages 1, 2, 8, 9 successfully!')

