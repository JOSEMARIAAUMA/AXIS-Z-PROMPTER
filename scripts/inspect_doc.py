from docx import Document

doc = Document("1000 PROMPTS PRODUCTIVIDAD_HUBSPOT.docx")
for i, p in enumerate(doc.paragraphs[:50]):
    text = p.text.strip()
    if not text: continue
    
    # Check for bold text or headings
    is_bold = any(run.bold for run in p.runs)
    style = p.style.name
    
    print(f"[{i:3}] Style: {style:15} Bold: {str(is_bold):5} Text: {text[:100]}...")
