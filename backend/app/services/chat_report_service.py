from reportlab.lib import colors
from reportlab.lib.pagesizes import letter
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, PageBreak
from io import BytesIO
from datetime import datetime

def generate_chat_report_pdf(analysis: dict, event_name: str, room_id: str) -> bytes:
    """
    Renders the structured analysis into a professional-looking PDF report.
    Uses Paragraph-in-Table wrapping to prevent overflow.
    """
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
        fontSize=26,
        textColor=PRIMARY_GREEN,
        spaceAfter=10,
        alignment=0 # Left
    )
    
    subtitle_style = ParagraphStyle(
        'SubtitleStyle',
        parent=styles['Normal'],
        fontSize=12,
        textColor=GRAY_TEXT,
        spaceAfter=25
    )

    section_style = ParagraphStyle(
        'SectionStyle',
        parent=styles['Heading2'],
        fontSize=15,
        textColor=DARK_BLUE,
        spaceBefore=15,
        spaceAfter=8,
        borderPadding=5,
        borderWidth=0,
        borderStyle=None
    )
    
    body_style = ParagraphStyle(
        'BodyStyle',
        parent=styles['Normal'],
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
        fontName='Helvetica-Bold',
        textColor=DARK_BLUE
    )
    
    # Build content
    elements = []
    
    # ── Header ──
    elements.append(Paragraph("SevaSetu Strategic Audit", title_style))
    elements.append(Paragraph(f"Mission Analysis: {event_name or 'General Support'} | ID: {room_id}", subtitle_style))
    elements.append(Paragraph(f"Report Generated: {datetime.now().strftime('%B %d, %Y - %H:%M')}", body_style))
    elements.append(Spacer(1, 15))
    
    # ── Horizontal Rule ──
    elements.append(Table([['']], colWidths=[500], style=[
        ('LINEBELOW', (0,0), (-1,-1), 1.5, PRIMARY_GREEN),
        ('BOTTOMPADDING', (0,0), (-1,-1), 0),
    ]))
    elements.append(Spacer(1, 15))

    # ── Mission Executive Summary ──
    elements.append(Paragraph("MISSION EXECUTIVE SUMMARY", section_style))
    # Remove markdown bolding for PDF compatibility
    summary_clean = analysis.get("executive_summary", "").replace("**", "")
    elements.append(Paragraph(summary_clean, body_style))
    elements.append(Spacer(1, 10))
    
    # ── Strategic Mission Alignment ──
    elements.append(Paragraph("STRATEGIC MISSION ALIGNMENT", section_style))
    alignment_clean = analysis.get("mission_context", "Neutral alignment.").replace("**", "")
    elements.append(Paragraph(alignment_clean, body_style))
    elements.append(Spacer(1, 10))

    # ── Visual Insights & Attachments ──
    visual_insights = analysis.get("visual_insights", [])
    if visual_insights:
        elements.append(Paragraph("VISUAL INSIGHTS & ATTACHMENTS", section_style))
        for item in visual_insights:
            # Wrap description in Paragraph for auto-wrapping
            content = f"<font color='#10B981'><b>{item.get('name')}</b></font> ({item.get('type')}): {item.get('summary')}"
            elements.append(Paragraph(content, body_style))
            elements.append(Spacer(1, 4))
        elements.append(Spacer(1, 10))
        
    # ── Volunteer Readiness ──
    readiness = analysis.get("volunteer_readiness", {})
    if readiness:
        status = readiness.get("status", "Unknown")
        status_color = "#10B981" if status == "Ready" else "#F59E0B"
        if status == "Not Ready": status_color = "#EF4444"
        
        elements.append(Paragraph("VOLUNTEER READINESS ASSESSMENT", section_style))
        readiness_content = f"<b>STATUS:</b> <font color='{status_color}'>{status}</font><br/><b>Reasoning:</b> {readiness.get('reasoning', 'N/A')}"
        elements.append(Paragraph(readiness_content, body_style))
        elements.append(Spacer(1, 12))

    # ── Action Items ──
    elements.append(Paragraph("REQUIRED MISSION ACTION ITEMS", section_style))
    actions = analysis.get("action_items", [])
    if actions:
        for action in actions:
            elements.append(Paragraph(f"<font color='#10B981'>■</font> {action}", body_style))
            elements.append(Spacer(1, 3))
    else:
        elements.append(Paragraph("No immediate actions required.", body_style))
    elements.append(Spacer(1, 15))

    # ── Communication Metrics Table ──
    elements.append(Paragraph("PROFESSIONAL COMMUNICATION METRICS", section_style))
    sentiment = analysis.get("sentiment_breakdown", {})
    quality = analysis.get("quality_score", "N/A")
    
    # We wrap cell content in Paragraphs to force wrapping within the table
    metrics_data = [
        [Paragraph("Metric Attribute", table_label_style), Paragraph("Strategic Analysis", table_label_style)],
        [Paragraph("Overall Tone", body_style), Paragraph(sentiment.get("overall", "Neutral"), body_style)],
        [Paragraph("Volunteer Engagement", body_style), Paragraph(sentiment.get("volunteer", "Eager"), body_style)],
        [Paragraph("Supervisor Direction", body_style), Paragraph(sentiment.get("supervisor", "Clear"), body_style)],
        [Paragraph("Mission Clarity Score", body_style), Paragraph(f"<b>{quality}/10</b>", body_style)]
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
