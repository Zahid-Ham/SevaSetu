from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
import os
from reportlab.lib import colors
from reportlab.lib.pagesizes import letter
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, PageBreak
from io import BytesIO
from datetime import datetime
# Register a font that supports Devanagari (Hindi)
# Nirmala UI is a standard Windows font that supports Devanagari
try:
    hindi_font_path = "C:/Windows/Fonts/Nirmala.ttc"
    if os.path.exists(hindi_font_path):
        pdfmetrics.registerFont(TTFont('HindiFont', hindi_font_path))
        HINDI_FONT_AVAILABLE = True
    else:
        HINDI_FONT_AVAILABLE = False
except Exception as e:
    print(f"Warning: Could not register Hindi font: {e}")
    HINDI_FONT_AVAILABLE = False

def generate_chat_report_pdf(analysis: dict, event_name: str, room_id: str, lang: str = "en") -> bytes:
    """
    Renders the structured analysis into a professional-looking PDF report.
    Uses Paragraph-in-Table wrapping to prevent overflow.
    """
    def get_val(item, l=lang):
        if isinstance(item, dict):
            return item.get(l, item.get("en", ""))
        return str(item) if item is not None else ""

    # PDF Localization Dictionary
    pdf_labels = {
        "en": {
            "title": "SevaSetu Strategic Audit",
            "analysis_of": "Mission Analysis:",
            "id": "ID:",
            "generated_on": "Report Generated:",
            "exec_summary": "MISSION EXECUTIVE SUMMARY",
            "alignment": "STRATEGIC MISSION ALIGNMENT",
            "visuals": "VISUAL INSIGHTS & ATTACHMENTS",
            "readiness": "VOLUNTEER READINESS ASSESSMENT",
            "status": "STATUS:",
            "reasoning": "Reasoning:",
            "actions": "REQUIRED MISSION ACTION ITEMS",
            "no_actions": "No immediate actions required.",
            "metrics": "PROFESSIONAL COMMUNICATION METRICS",
            "attr": "Metric Attribute",
            "strat_analysis": "Strategic Analysis",
            "tone": "Overall Tone",
            "engagement": "Volunteer Engagement",
            "direction": "Supervisor Direction",
            "clarity": "Mission Clarity Score",
            "ready": "Ready",
            "not_ready": "Not Ready",
            "needs_clarification": "Needs Clarification",
            "neutral": "Neutral",
            "eager": "Eager",
            "clear": "Clear"
        },
        "hi": {
            "title": "SevaSetu रणनीतिक ऑडिट",
            "analysis_of": "मिशन विश्लेषण:",
            "id": "आईडी:",
            "generated_on": "रिपोर्ट जनरेट की गई:",
            "exec_summary": "मिशन कार्यकारी सारांश",
            "alignment": "रणनीतिक मिशन तालमेल",
            "visuals": "दृश्य अंतर्दृष्टि और अनुलग्नक",
            "readiness": "स्वयंसेवक तत्परता मूल्यांकन",
            "status": "स्थिति:",
            "reasoning": "तर्क:",
            "actions": "आवश्यक मिशन कार्रवाई आइटम",
            "no_actions": "कोई तत्काल कार्रवाई आवश्यक नहीं है।",
            "metrics": "पेशेवर संचार मेट्रिक्स",
            "attr": "मेट्रिक विशेषता",
            "strat_analysis": "रणनीतिक विश्लेषण",
            "tone": "कुल स्वर",
            "engagement": "स्वयंसेवक जुड़ाव",
            "direction": "पर्यवेक्षक दिशा",
            "clarity": "मिशन स्पष्टता स्कोर",
            "ready": "तैयार",
            "not_ready": "तैयार नहीं",
            "needs_clarification": "स्पष्टीकरण की आवश्यकता",
            "neutral": "तटस्थ",
            "eager": "उत्सुक",
            "clear": "स्पष्ट"
        }
    }
    
    L = pdf_labels.get(lang, pdf_labels["en"])
    font_name = 'HindiFont' if lang == 'hi' and HINDI_FONT_AVAILABLE else 'Helvetica'
    bold_font_name = 'HindiFont' if lang == 'hi' and HINDI_FONT_AVAILABLE else 'Helvetica-Bold'

    buffer = BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=letter, 
                        rightMargin=50, leftMargin=50, 
                        topMargin=50, bottomMargin=50)
    
    styles = getSampleStyleSheet()
    
    # Define primary brand colors
    PRIMARY_GREEN = colors.HexColor("#10B981")
    DARK_BLUE = colors.HexColor("#1E293B")
    GRAY_TEXT = colors.HexColor("#475569")
    LIGHT_BG = colors.HexColor("#F8FAFC")
    BORDER_COLOR = colors.HexColor("#E2E8F0")

    # Custom styles
    title_style = ParagraphStyle(
        'TitleStyle',
        parent=styles['Heading1'],
        fontName=bold_font_name,
        fontSize=24,
        textColor=PRIMARY_GREEN,
        spaceAfter=10,
        alignment=0 # Left
    )
    
    subtitle_style = ParagraphStyle(
        'SubtitleStyle',
        parent=styles['Normal'],
        fontName=font_name,
        fontSize=11,
        textColor=GRAY_TEXT,
        spaceAfter=25
    )

    section_style = ParagraphStyle(
        'SectionStyle',
        parent=styles['Heading2'],
        fontName=bold_font_name,
        fontSize=14,
        textColor=DARK_BLUE,
        spaceBefore=15,
        spaceAfter=8
    )
    
    body_style = ParagraphStyle(
        'BodyStyle',
        parent=styles['Normal'],
        fontName=font_name,
        fontSize=10,
        leading=14,
        textColor=GRAY_TEXT,
        alignment=4 # Justified
    )

    # Header-focused body style (for table left column)
    table_label_style = ParagraphStyle(
        'TableLabel',
        parent=body_style,
        fontSize=10,
        fontName=bold_font_name,
        textColor=DARK_BLUE
    )
    
    # Build content
    elements = []
    
    # ── Header ──
    elements.append(Paragraph(L["title"], title_style))
    elements.append(Paragraph(f"{L['analysis_of']} {event_name or 'General Support'} | {L['id']} {room_id}", subtitle_style))
    elements.append(Paragraph(f"{L['generated_on']} {datetime.now().strftime('%B %d, %Y - %H:%M')}", body_style))
    elements.append(Spacer(1, 15))
    
    # ── Horizontal Rule ──
    elements.append(Table([['']], colWidths=[500], style=[
        ('LINEBELOW', (0,0), (-1,-1), 1.5, PRIMARY_GREEN),
        ('BOTTOMPADDING', (0,0), (-1,-1), 0),
    ]))
    elements.append(Spacer(1, 15))

    # ── Mission Executive Summary ──
    elements.append(Paragraph(L["exec_summary"], section_style))
    # Remove markdown bolding for PDF compatibility
    summary_clean = get_val(analysis.get("executive_summary", "")).replace("**", "")
    elements.append(Paragraph(summary_clean, body_style))
    elements.append(Spacer(1, 10))
    
    # ── Strategic Mission Alignment ──
    elements.append(Paragraph(L["alignment"], section_style))
    alignment_clean = get_val(analysis.get("mission_context", "Neutral alignment.")).replace("**", "")
    elements.append(Paragraph(alignment_clean, body_style))
    elements.append(Spacer(1, 10))

    # ── Visual Insights & Attachments ──
    visual_insights = analysis.get("visual_insights", [])
    if visual_insights:
        elements.append(Paragraph(L["visuals"], section_style))
        for item in visual_insights:
            # Wrap description in Paragraph for auto-wrapping
            summary_txt = get_val(item.get('summary', ''))
            content = f"<font color='#10B981'><b>{item.get('name')}</b></font> ({item.get('type')}): {summary_txt}"
            elements.append(Paragraph(content, body_style))
            elements.append(Spacer(1, 4))
        elements.append(Spacer(1, 10))
        
    # ── Volunteer Readiness ──
    readiness = analysis.get("volunteer_readiness", {})
    if readiness:
        status_val = get_val(readiness.get("status", "Unknown"))
        # Map status to localized labels
        en_status = readiness.get("status", {}).get("en", status_val) if isinstance(readiness.get("status"), dict) else status_val
        localized_status = L.get(en_status.lower().replace(" ", "_"), status_val)
        
        status_color = "#10B981" if en_status == "Ready" else "#F59E0B"
        if en_status == "Not Ready": status_color = "#EF4444"
        
        elements.append(Paragraph(L["readiness"], section_style))
        readiness_content = f"<b>{L['status']}</b> <font color='{status_color}'>{localized_status}</font><br/><b>{L['reasoning']}</b> {get_val(readiness.get('reasoning', 'N/A'))}"
        elements.append(Paragraph(readiness_content, body_style))
        elements.append(Spacer(1, 12))

    # ── Action Items ──
    elements.append(Paragraph(L["actions"], section_style))
    actions = analysis.get("action_items", [])
    if actions:
        for action in actions:
            elements.append(Paragraph(f"<font color='#10B981'>■</font> {get_val(action)}", body_style))
            elements.append(Spacer(1, 3))
    else:
        elements.append(Paragraph(L["no_actions"], body_style))
    elements.append(Spacer(1, 15))

    # ── Communication Metrics Table ──
    elements.append(Paragraph(L["metrics"], section_style))
    sentiment = analysis.get("sentiment_breakdown", {})
    quality = analysis.get("quality_score", "N/A")
    
    # We wrap cell content in Paragraphs to force wrapping within the table
    metrics_data = [
        [Paragraph(L["attr"], table_label_style), Paragraph(L["strat_analysis"], table_label_style)],
        [Paragraph(L["tone"], body_style), Paragraph(get_val(sentiment.get("overall", L["neutral"])), body_style)],
        [Paragraph(L["engagement"], body_style), Paragraph(get_val(sentiment.get("volunteer", L["eager"])), body_style)],
        [Paragraph(L["direction"], body_style), Paragraph(get_val(sentiment.get("supervisor", L["clear"])), body_style)],
        [Paragraph(L["clarity"], body_style), Paragraph(f"<b>{quality}/10</b>", body_style)]
    ]
    
    # colWidths sum should be around 450-500
    t_metrics = Table(metrics_data, colWidths=[150, 350])
    t_metrics.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), LIGHT_BG),
        ('TEXTCOLOR', (0,0), (-1,0), DARK_BLUE),
        ('ALIGN', (0,0), (-1,-1), 'LEFT'),
        ('VALIGN', (0,0), (-1,-1), 'TOP'),
        ('GRID', (0,0), (-1,-1), 0.5, BORDER_COLOR),
        ('BOTTOMPADDING', (0,0), (-1,-1), 10),
        ('TOPPADDING', (0,0), (-1,-1), 10),
        ('LEFTPADDING', (0,0), (-1,-1), 12),
        ('RIGHTPADDING', (0,0), (-1,-1), 12),
    ]))
    elements.append(t_metrics)
    
    # ── Build ──
    doc.build(elements)
    
    pdf_bytes = buffer.getvalue()
    buffer.close()
    return pdf_bytes
bytes
