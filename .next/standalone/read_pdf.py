import pdfplumber
import sys
import json

pdf_path = r"C:\Users\jose.perez\Downloads\CMUPAEP 090626 SUM E INST VIDEOVIGILANCIA AREA HOSPITALIZACION REV1.pdf"

def extract_text(pdf_path):
    """Extract all text from PDF"""
    all_text = []
    with pdfplumber.open(pdf_path) as pdf:
        print(f"Total pages: {len(pdf.pages)}")
        for i, page in enumerate(pdf.pages):
            text = page.extract_text()
            if text:
                all_text.append(f"\n=== PAGE {i+1} ===\n{text}")
    return "\n".join(all_text)

if __name__ == "__main__":
    text = extract_text(pdf_path)
    print(text[:50000])  # Print first 50k chars to see content
