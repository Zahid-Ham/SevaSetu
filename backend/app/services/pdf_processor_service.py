import fitz  # PyMuPDF
import io
from typing import List

def convert_pdf_to_images(pdf_bytes: bytes, max_pages: int = 10) -> List[bytes]:
    """
    Converts individual PDF pages into PNG images (bytes).
    Limited to max_pages to optimize for Gemini's context window.
    """
    try:
        print(f"[PDF Processor] Converting PDF ({len(pdf_bytes)} bytes) to images...")
        doc = fitz.open(stream=pdf_bytes, filetype="pdf")
        image_list = []
        
        # Process up to max_pages or total pages, whichever is smaller
        num_pages = min(doc.page_count, max_pages)
        
        for page_num in range(num_pages):
            page = doc.load_page(page_num)
            
            # Use 200 DPI for a good balance between readability and size
            pix = page.get_pixmap(matrix=fitz.Matrix(2, 2))
            
            # Save to bytes
            img_bytes = pix.tobytes("png")
            image_list.append(img_bytes)
            
        doc.close()
        print(f"[PDF Processor] SUCCESS. Generated {len(image_list)} images from {num_pages} pages.")
        return image_list
        
    except Exception as e:
        print(f"!!! [PDF Processor ERROR] {e}")
        return []
