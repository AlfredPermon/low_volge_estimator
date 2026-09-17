import sys

# Try pypdf first, fallback to PyPDF2
try:
    from pypdf import PdfReader
    reader = PdfReader(r"C:\Users\jose.perez\Downloads\CMUPAEP 090626 SUM E INST VIDEOVIGILANCIA AREA HOSPITALIZACION REV1.pdf")
    print(f"Total pages: {len(reader.pages)}")
    for i, page in enumerate(reader.pages):
        text = page.extract_text()
        if text:
            print(f"\n=== PAGE {i+1} ===")
            print(text)
except Exception as e:
    print(f"Error: {e}")
    # Try PyPDF2
    try:
        import PyPDF2
        with open(r"C:\Users\jose.perez\Downloads\CMUPAEP 090626 SUM E INST VIDEOVIGILANCIA AREA HOSPITALIZACION REV1.pdf", "rb") as f:
            reader = PyPDF2.PdfReader(f)
            print(f"Total pages: {len(reader.pages)}")
            for i, page in enumerate(reader.pages):
                text = page.extract_text()
                if text:
                    print(f"\n=== PAGE {i+1} ===")
                    print(text)
    except Exception as e2:
        print(f"PyPDF2 also failed: {e2}")
