from typing import List, Optional
from app.config.firebase_config import db # type: ignore
from firebase_admin import firestore # type: ignore
from app.services.ai_service import ai_manager
from app.services.translation_service import translator
import qrcode # type: ignore
from io import BytesIO
from reportlab.pdfgen import canvas # type: ignore
from reportlab.lib.pagesizes import A4, landscape # type: ignore
from reportlab.lib import colors # type: ignore
from reportlab.lib.units import inch
import cloudinary # type: ignore
import cloudinary.uploader # type: ignore
import json
import uuid
import os
from datetime import datetime
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.lib.utils import ImageReader
from reportlab.platypus import Paragraph
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle

# Register Hindi Font (Using Nirmala UI from Windows as it's standard)
# If running on Linux/Production, you'd provide the .ttf file in the assets folder
# Paths
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PROJECT_ROOT = os.path.dirname(os.path.dirname(BASE_DIR))
FONT_REGULAR = os.path.join(BASE_DIR, "assets", "NotoSansDevanagari-Regular.ttf")
FONT_BOLD = os.path.join(BASE_DIR, "assets", "NotoSansDevanagari-Bold.ttf")
# Frontend logo path (reaching out of backend to frontend)
LOGO_PATH = os.path.join(PROJECT_ROOT, "frontend", "src", "assets", "images", "logo.png")

# Register Fonts
try:
    if os.path.exists(FONT_REGULAR):
        pdfmetrics.registerFont(TTFont('NotoSansDevanagari', FONT_REGULAR))
        pdfmetrics.registerFont(TTFont('NotoSansDevanagari-Bold', FONT_BOLD))
        HINDI_FONT = 'NotoSansDevanagari'
        HINDI_FONT_BOLD = 'NotoSansDevanagari-Bold'
        print(f"[Cert Service] Successfully registered Hindi fonts from {FONT_REGULAR}")
    else:
        print(f"[Cert Service] Hindi font files NOT FOUND at {FONT_REGULAR}")
        HINDI_FONT = 'Helvetica'
        HINDI_FONT_BOLD = 'Helvetica-Bold'
except Exception as e:
    print(f"[Cert Service] Font registration failed: {e}")
    HINDI_FONT = 'Helvetica'
    HINDI_FONT_BOLD = 'Helvetica-Bold'

# Badge Definitions
BADGE_DEFS = {
    "first_step": {"label": {"en": "First Step", "hi": "पहला कदम"}, "icon": "🌱", "description": {"en": "Submitted your first report.", "hi": "अपनी पहली रिपोर्ट जमा की।"}},
    "water_guardian": {"label": {"en": "Water Guardian", "hi": "जल संरक्षक"}, "icon": "💧", "description": {"en": "Submitted 5 water-related reports.", "hi": "पानी से संबंधित 5 रिपोर्ट जमा कीं।"}},
    "health_hero": {"label": {"en": "Health Hero", "hi": "स्वास्थ्य नायक"}, "icon": "🏥", "description": {"en": "Submitted 5 health-related reports.", "hi": "स्वास्थ्य से संबंधित 5 रिपोर्ट जमा कीं।"}},
    "field_scout": {"label": {"en": "Field Scout", "hi": "क्षेत्र स्काउट"}, "icon": "🗺️", "description": {"en": "Submitted 10 reports with location data.", "hi": "स्थान डेटा के साथ 10 रिपोर्ट जमा कीं।"}},
    "speed_responder": {"label": {"en": "Speed Responder", "hi": "त्वरित प्रतिक्रिया"}, "icon": "⚡", "description": {"en": "Completed a task within 1 hour.", "hi": "1 घंटे के भीतर एक कार्य पूरा किया।"}},
    "team_player": {"label": {"en": "Team Player", "hi": "टीम खिलाड़ी"}, "icon": "🤝", "description": {"en": "Participated in a group event.", "hi": "एक समूह कार्यक्रम में भाग लिया।"}},
    "community_lion": {"label": {"en": "Community Lion", "hi": "सामुदायिक शेर"}, "icon": "🦁", "description": {"en": "Earned all three certificate tiers.", "hi": "तीनों प्रमाणपत्र स्तर प्राप्त किए।"}},
}

# Certificate Tiers
CERT_TIERS = {
    "bronze": {"label": {"en": "Community Helper", "hi": "सामुदायिक सहायक"}, "threshold": 5, "color": "#CD7F32"},
    "silver": {"label": {"en": "Active Contributor", "hi": "सक्रिय योगदानकर्ता"}, "threshold": 15, "color": "#A8A9AD"},
    "gold": {"label": {"en": "Impact Champion", "hi": "प्रभाव चैंपियन"}, "threshold": 30, "color": "#FFD700"},
}

def get_volunteer_stats(volunteer_id: str):
    """
    Aggregates reports and tasks for a volunteer.
    """
    # Count reports
    reports_ref = db.collection("community_reports")
    reports = list(reports_ref.where("volunteer_id", "==", volunteer_id).stream())
    
    # Count tasks
    tasks_ref = db.collection("tasks")
    tasks = list(tasks_ref.where("assigned_to", "==", volunteer_id).where("status", "==", "COMPLETED").stream())
    
    # Get categories for badges
    categories = [r.to_dict().get("primary_category", "") for r in reports]
    
    return {
        "report_count": len(reports),
        "task_count": len(tasks),
        "categories": categories,
        "raw_reports": [r.to_dict() for r in reports],
        "raw_tasks": [t.to_dict() for t in tasks]
    }

async def check_and_award_badges(volunteer_id: str):
    """
    Checks thresholds and awards badges.
    """
    stats = get_volunteer_stats(volunteer_id)
    badges_ref = db.collection("volunteer_badges").document(volunteer_id)
    existing_badges_doc = badges_ref.get()
    existing_badges = existing_badges_doc.to_dict().get("badges", []) if existing_badges_doc.exists else []
    
    new_badges = []
    
    # 1. First Step
    if stats["report_count"] >= 1 and "first_step" not in existing_badges:
        new_badges.append("first_step")
        
    # 2. Water Guardian (5 water reports)
    water_reports = [c for c in stats["categories"] if "Water" in str(c)]
    if len(water_reports) >= 5 and "water_guardian" not in existing_badges:
        new_badges.append("water_guardian")
        
    # 3. Health Hero (5 health reports)
    health_reports = [c for c in stats["categories"] if "Health" in str(c)]
    if len(health_reports) >= 5 and "health_hero" not in existing_badges:
        new_badges.append("health_hero")
        
    # 4. Field Scout (10 reports with GPS)
    if stats["report_count"] >= 10 and "field_scout" not in existing_badges:
        new_badges.append("field_scout")
        
    # 5. Speed Responder
    # Logic: Check if any task was completed within 1 hour of creation
    for task in stats["raw_tasks"]:
        try:
            created = task.get("created_at")
            completed = task.get("completed_at")
            if created and completed:
                # Firestore timestamps or ISO strings
                diff = (completed - created).total_seconds() if hasattr(completed, 'total_seconds') else 3601
                if diff <= 3600:
                    if "speed_responder" not in existing_badges:
                        new_badges.append("speed_responder")
                        break
        except:
            continue

    if new_badges:
        updated_badges = list(set(existing_badges + new_badges))
        badges_ref.set({"badges": updated_badges, "last_updated": firestore.SERVER_TIMESTAMP}, merge=True)
        print(f"[Cert Service] Awarded badges to {volunteer_id}: {new_badges}")
        return new_badges
    return []

async def check_and_issue_certificates(volunteer_id: str):
    """
    Checks thresholds and issues certificates.
    """
    stats = get_volunteer_stats(volunteer_id)
    certs_ref = db.collection("certificates")
    existing_certs = list(certs_ref.where("volunteer_id", "==", volunteer_id).stream())
    earned_tiers = [c.to_dict().get("tier") for c in existing_certs]
    
    newly_issued = []
    
    for tier, config in CERT_TIERS.items():
        if tier not in earned_tiers and stats["report_count"] >= config["threshold"]:
            # Issue certificate
            cert_id = await issue_certificate(volunteer_id, tier, stats)
            newly_issued.append(cert_id)
            
    # Check for Community Lion badge (all 3 tiers)
    if len(earned_tiers) + len(newly_issued) >= 3:
        badges_ref = db.collection("volunteer_badges").document(volunteer_id)
        existing_badges_doc = badges_ref.get()
        existing_badges = existing_badges_doc.to_dict().get("badges", []) if existing_badges_doc.exists else []
        if "community_lion" not in existing_badges:
            badges_ref.set({"badges": existing_badges + ["community_lion"], "last_updated": firestore.SERVER_TIMESTAMP}, merge=True)
            
    return newly_issued

async def get_gemini_certificate_description(volunteer_name: str, stats: dict, tier: str) -> dict:
    """
    Generates a prestigious, unique bilingual description for the certificate using AI with fallback.
    """
    tier_label = CERT_TIERS[tier]["label"]["en"]
    system_prompt = "You are a professional certificate writer for SevaSetu, an Indian social impact organization."
    prompt = f"""
    Generate a highly prestigious and unique certificate description for:
    Volunteer: {volunteer_name}
    Tier: {tier_label}
    Impact: {stats['report_count']} reports, {stats['task_count']} tasks in {', '.join(list(set(stats['categories']))[:3])}.
    
    The description must be 3-4 inspiring sentences. Avoid generic templates.
    Return ONLY a JSON object: {{"en": "...", "hi": "..."}}
    Ensure Hindi is formal (Shuddh Hindi) and prestigious.
    """
    
    try:
        response_text = await ai_manager.generate_text(prompt, system_instruction=system_prompt)
        if "{" in response_text:
            json_str = response_text[response_text.find("{"):response_text.rfind("}")+1]
            return json.loads(json_str)
    except Exception as e:
        print(f"[Cert Service] AI generation failed: {e}")

    # Robust Fallback
    en_desc = f"{volunteer_name} has demonstrated exceptional commitment to social service, contributing significantly through {stats['report_count']} detailed field reports and {stats['task_count']} community missions. This certificate recognizes their profound impact on the SevaSetu ecosystem and their tireless dedication to public welfare."
    hi_desc = await translator.translate(en_desc)
    return {"en": en_desc, "hi": hi_desc}

async def issue_certificate(volunteer_id: str, tier: str, stats: dict, cert_id: Optional[str] = None):
    """
    Core function to generate PDF, upload to Cloudinary, and save to Firestore.
    """
    # Get user info
    user_doc = db.collection("users").document(volunteer_id).get()
    user_data = user_doc.to_dict() if user_doc.exists else {}
    volunteer_name = user_data.get("name", "Volunteer")
    ngo_name = user_data.get("ngo_name", "SevaSetu Partner NGO")
    
    # 1. Get/Translate Name with Persistance
    raw_name = user_data.get("name", "Volunteer")
    
    volunteer_name_en = "Volunteer"
    volunteer_name_hi = "स्वयंसेवक"

    if isinstance(raw_name, dict):
        volunteer_name_en = raw_name.get("en", "Volunteer")
        volunteer_name_hi = raw_name.get("hi", volunteer_name_en)
    else:
        # It's a string, translate and persist
        volunteer_name_en = str(raw_name)
        # Use our robust translator (Gemini/Groq fallback)
        volunteer_name_hi = await translator.translate(volunteer_name_en)
        
        # Persist back to user document for future use
        try:
            db.collection("users").document(volunteer_id).update({
                "name": {
                    "en": volunteer_name_en,
                    "hi": volunteer_name_hi
                }
            })
            print(f"[Cert Service] Persisted bilingual name for {volunteer_id}")
        except Exception as e:
            print(f"[Cert Service] Failed to persist name: {e}")

    # Generate Description
    description = await get_gemini_certificate_description(volunteer_name_en, stats, tier)
    
    # 2. Generate PDFs for both languages
    if not cert_id:
        cert_no = f"SEVA-{datetime.now().year}-{uuid.uuid4().hex[:5].upper()}"
    else:
        # Use existing cert no if possible, or extract from cert_id
        cert_no = cert_id
    
    # Generate English Version
    pdf_bytes_en = generate_certificate_pdf_bytes(volunteer_name_en, ngo_name, tier, cert_no, description, lang="en")
    
    # Generate Hindi Version
    pdf_bytes_hi = generate_certificate_pdf_bytes(volunteer_name_hi, ngo_name, tier, cert_no, description, lang="hi")
    
    # 3. Upload both to Cloudinary
    def upload_to_cloudinary(pdf_bytes, suffix):
        upload_res = cloudinary.uploader.upload(
            pdf_bytes,
            resource_type="raw",
            folder="sevasetu/certificates",
            public_id=f"{cert_no}_{suffix}",
            format="pdf",
            invalidate=True # Clear CDN cache
        )
        p_id = upload_res.get("public_id")
        return f"/chat/serve-file?public_id={p_id}&r_type=raw"

    pdf_url_en = upload_to_cloudinary(pdf_bytes_en, "en")
    pdf_url_hi = upload_to_cloudinary(pdf_bytes_hi, "hi")
    
    # 4. Save to Firestore
    cert_data = {
        "id": cert_no,
        "volunteer_id": volunteer_id,
        "volunteer_name": volunteer_name_en,
        "volunteer_name_hi": volunteer_name_hi,
        "ngo_name": ngo_name,
        "tier": tier,
        "tier_label": CERT_TIERS[tier]["label"],
        "issue_date": datetime.now().strftime("%Y-%m-%d"),
        "description": description,
        "pdf_url": pdf_url_en, 
        "pdf_url_en": pdf_url_en,
        "pdf_url_hi": pdf_url_hi,
        "status": "active",
        "trigger_type": "auto",
        "stats": stats # Full stats for regeneration
    }
    db.collection("certificates").document(cert_no).set(cert_data)
    return cert_no

async def regenerate_certificate_logic(cert_id: str):
    """
    Force regenerates an existing certificate with the latest design/logic.
    """
    cert_doc = db.collection("certificates").document(cert_id).get()
    if not cert_doc.exists:
        return None
    
    data = cert_doc.to_dict()
    volunteer_id = data.get("volunteer_id")
    tier = data.get("tier")
    # Recover stats from the doc
    stats = data.get("stats")
    if not stats:
        # Fallback if old cert doesn't have stats
        stats = {
            "report_count": data.get("stats_snapshot", {}).get("reports", 0),
            "task_count": data.get("stats_snapshot", {}).get("tasks", 0),
            "categories": ["General"]
        }
    
    return await issue_certificate(volunteer_id, tier, stats, cert_id=cert_id)

def draw_ashoka_chakra(p, x, y, size, opacity=0.15):
    """Draws a simplified Ashoka Chakra using ReportLab primitives."""
    p.saveState()
    p.setStrokeColor(colors.navy)
    p.setLineWidth(size * 0.04)
    p.setStrokeAlpha(opacity)
    
    # Outer circle
    radius = size / 2
    p.circle(x, y, radius, stroke=1, fill=0)
    
    # Inner circle
    p.setStrokeAlpha(opacity * 1.5)
    p.setFillColor(colors.navy)
    p.circle(x, y, size * 0.03, stroke=0, fill=1)
    
    # Spokes (24)
    p.setLineWidth(size * 0.015)
    for i in range(24):
        import math
        angle = (i * 15) * (math.pi / 180)
        x_end = x + radius * math.cos(angle)
        y_end = y + radius * math.sin(angle)
        p.line(x, y, x_end, y_end)
        
    p.restoreState()

def draw_premium_border(p, width, height, tier_color):
    """Draws a multi-layered Indian themed border."""
    # Outer Saffron/Green thin lines
    p.setStrokeColor(colors.HexColor("#FF9933")) # Saffron
    p.setLineWidth(3)
    p.rect(0.1*inch, 0.1*inch, width - 0.2*inch, height - 0.2*inch)
    
    p.setStrokeColor(colors.HexColor("#138808")) # Green
    p.setLineWidth(3)
    p.rect(0.15*inch, 0.15*inch, width - 0.3*inch, height - 0.3*inch)
    
    # Main Tier Color Thick Border
    p.setStrokeColor(tier_color)
    p.setLineWidth(6)
    p.rect(0.3*inch, 0.3*inch, width - 0.6*inch, height - 0.6*inch)

def draw_tricolor_background(p, width, height):
    """Draws a very light tricolor blend in the background."""
    p.saveState()
    # Saffron top
    p.setFillColor(colors.HexColor("#FF9933"))
    p.setFillAlpha(0.12) # Richer
    p.rect(0, height * 0.7, width, height * 0.3, stroke=0, fill=1)
    
    # Green bottom
    p.setFillColor(colors.HexColor("#138808"))
    p.setFillAlpha(0.12) # Richer
    p.rect(0, 0, width, height * 0.3, stroke=0, fill=1)
    
    # White middle
    p.setFillColor(colors.white)
    p.setFillAlpha(0.05)
    p.rect(0, height * 0.3, width, height * 0.4, stroke=0, fill=1)
    p.restoreState()

def generate_certificate_pdf_bytes(name, ngo, tier, cert_no, description, lang="en"):
    """
    Generates a premium professional certificate with Indian aesthetic.
    """
    buffer = BytesIO()
    p = canvas.Canvas(buffer, pagesize=landscape(A4))
    width, height = landscape(A4)
    
    # 1. Background Elements
    draw_tricolor_background(p, width, height)
    draw_ashoka_chakra(p, width/2, height/2, 400, opacity=0.1) # Richer
    
    # 2. Premium Border
    tier_color = colors.HexColor(CERT_TIERS[tier]["color"])
    draw_premium_border(p, width, height, tier_color)
    
    # 3. Logo (Drawn on top)
    if os.path.exists(LOGO_PATH):
        try:
            # Larger, centered logo
            logo_size = 1.5 * inch
            p.drawImage(ImageReader(LOGO_PATH), width/2 - logo_size/2, height - 1.8*inch, width=logo_size, height=logo_size, mask='auto')
        except Exception as e:
            print(f"[Cert Service] Logo drawing failed: {e}")
    else:
        print(f"[Cert Service] Logo NOT FOUND at {LOGO_PATH}")

    # 4. Content Logic
    is_hi = lang == "hi"
    font_main = HINDI_FONT_BOLD if is_hi else "Times-Bold"
    font_body = HINDI_FONT if is_hi else "Times-Roman"
    
    # Header
    p.setFillColor(colors.black)
    p.setFont(font_main, 38 if not is_hi else 34)
    title = "प्रमाण पत्र" if is_hi else "CERTIFICATE OF RECOGNITION"
    p.drawCentredString(width/2, height - 2.1*inch, title)
    
    p.setFont(font_main, 20 if not is_hi else 18)
    p.setFillColor(tier_color)
    tier_label = CERT_TIERS[tier]["label"][lang].upper()
    p.drawCentredString(width/2, height - 2.4*inch, tier_label)
    
    p.setFillColor(colors.black)
    p.setFont(font_body, 16)
    awarded_text = "यह गौरवपूर्वक प्रदान किया जाता है" if is_hi else "This is proudly awarded to"
    p.drawCentredString(width/2, height - 2.8*inch, awarded_text)
    
    # Volunteer Name
    name_to_draw = name if is_hi else name.upper()
    name_style = ParagraphStyle(
        'NameStyle',
        fontName=font_main,
        fontSize=54 if not is_hi else 48,
        textColor=colors.black,
        alignment=1, # Center
    )
    name_para = Paragraph(name_to_draw, name_style)
    w, h = name_para.wrap(width - 2*inch, 1*inch)
    name_para.drawOn(p, width/2 - w/2, height - 3.8*inch)
    
    # Description (with Paragraph for perfect wrapping and better RTL/Complex script support)
    desc_style = ParagraphStyle(
        'DescStyle',
        fontName=font_body,
        fontSize=16,
        textColor=colors.black,
        alignment=1, # Center
        leading=20,
    )
    desc_para = Paragraph(description[lang], desc_style)
    w, h = desc_para.wrap(width - 3*inch, 2*inch)
    desc_para.drawOn(p, width/2 - w/2, height - 4.2*inch - h)

    # Footer - Adjusted positions to prevent overlap
    p.setFont(font_body, 10)
    footer_y = 1.3*inch
    p.drawString(2.8*inch, footer_y, f"{'जारीकर्ता' if is_hi else 'Issued by'}: {ngo}")
    p.drawCentredString(width/2 + 0.5*inch, footer_y, f"{'दिनांक' if is_hi else 'Date'}: {datetime.now().strftime('%d %b %Y')}")
    p.drawRightString(width - 1.2*inch, footer_y, f"Cert No: {cert_no}")
    
    # Signature Section
    p.setStrokeColor(colors.black)
    p.setLineWidth(1)
    p.line(width - 2.5*inch, 0.8*inch, width - 1.2*inch, 0.8*inch)
    p.drawRightString(width - 1.2*inch, 0.65*inch, "Authorized Signatory" if lang == "en" else "अधिकृत हस्ताक्षरकर्ता")

    # QR Code
    qr_url = f"https://sevasetu.app/verify/{cert_no}"
    qr = qrcode.QRCode(version=1, box_size=8, border=1)
    qr.add_data(qr_url)
    qr.make(fit=True)
    img = qr.make_image(fill_color="black", back_color="white")
    
    qr_buffer = BytesIO()
    img.save(qr_buffer, format='PNG')
    qr_buffer.seek(0)
    
    qr_x = 0.6 * inch
    qr_y = 0.5 * inch
    qr_size = 2.1 * inch
    p.drawImage(ImageReader(qr_buffer), qr_x, qr_y, width=qr_size, height=qr_size)
    p.setFont(font_body, 10)
    p.drawCentredString(qr_x + qr_size/2, qr_y - 0.2*inch, "सत्यापन के लिए स्कैन करें" if is_hi else "Scan to Verify Authenticity")
    
    p.showPage()
    p.save()
    
    buffer.seek(0)
    return buffer.getvalue()
