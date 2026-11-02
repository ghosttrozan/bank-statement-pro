import fitz

doc = fitz.open(r"C:\Users\alkvi\Downloads\2004202320223100_882046.pdf")
p1 = doc[0]

# Search for 'Do' operator in content stream
for stream in p1.get_contents():
    txt = doc.xref_stream(stream).decode("latin-1")
    lines = txt.splitlines()
    for i, line in enumerate(lines):
        if "Do" in line:
            print("Around Do:")
            for j in range(max(0, i-5), min(len(lines), i+3)):
                print(f"  {lines[j]}")

