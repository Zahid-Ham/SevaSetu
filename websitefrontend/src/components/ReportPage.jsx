import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import styled, { keyframes } from 'styled-components';
import { 
  BarChart2, FileText, Sparkles, MapPin, 
  AlertTriangle, ArrowLeft, Target, ShieldAlert,
  Clock, Activity, Users, ActivitySquare, X, Image, Eye, Download, PlayCircle, Music, Wind, Zap,
  Search, Clipboard, Database, CheckCircle
} from 'lucide-react';
import { motion } from 'framer-motion';
import ImageViewer from './ImageViewer';
import DocumentViewer from './DocumentViewer';

const BACKEND_URL = 'http://localhost:8001';

/* ── Helpers ── */
const getSeverityColor = (score) => {
  if (score >= 8) return { bg: '#FEF2F2', border: '#DC2626', text: '#DC2626', shadow: 'rgba(220, 38, 38, 0.25)' };
  if (score >= 5) return { bg: '#FFFBEB', border: '#D97706', text: '#D97706', shadow: 'rgba(217, 119, 6, 0.25)' };
  return { bg: '#ECFDF5', border: '#059669', text: '#059669', shadow: 'rgba(5, 150, 105, 0.25)' };
};

const getUrgencyColor = (level) => {
  const l = (level || '').toLowerCase();
  if (l.includes('immediate') || l.includes('critical') || l.includes('high')) 
    return { bg: '#FEF2F2', border: '#DC2626', text: '#DC2626', shadow: 'rgba(220, 38, 38, 0.25)' };
  if (l.includes('moderate') || l.includes('medium')) 
    return { bg: '#FFFBEB', border: '#D97706', text: '#D97706', shadow: 'rgba(217, 119, 6, 0.25)' };
  return { bg: '#ECFDF5', border: '#059669', text: '#059669', shadow: 'rgba(5, 150, 105, 0.25)' };
};

const getCategoryColor = () => {
    return { bg: '#EEF2FF', border: '#4F46E5', text: '#4F46E5', shadow: '#A5B4FC'};
}

const TAG_COLORS = [
  { bg: '#EFF6FF', border: '#BFDBFE', text: '#1D4ED8' }, // Blue
  { bg: '#FEF2F2', border: '#FECACA', text: '#B91C1C' }, // Red
  { bg: '#ECFDF5', border: '#A7F3D0', text: '#059669' }, // Emerald
  { bg: '#FFFBEB', border: '#FDE68A', text: '#D97706' }, // Amber
  { bg: '#FAF5FF', border: '#E9D5FF', text: '#7E22CE' }, // Purple
  { bg: '#FDF2F8', border: '#FBCFE8', text: '#BE185D' }, // Pink
  { bg: '#F0FDF4', border: '#BBF7D0', text: '#15803D' }, // Green
  { bg: '#FFF7ED', border: '#FED7AA', text: '#ea580c' }, // Orange
];

const getTimelineStatus = (text) => {
  const t = text.toLowerCase();
  if (t.includes('completed') || t.includes('done')) return 'completed';
  if (t.includes('ongoing') || t.includes('progress') || t.includes('active')) return 'ongoing';
  return 'upcoming';
};
const getPhaseTheme = (text) => {
  const t = text.toLowerCase();
  if (t.includes('phase 1')) return { color: '#3B82F6', bg: '#EFF6FF', border: '#DBEAFE', icon: <Search size={14} /> };
  if (t.includes('phase 2')) return { color: '#EAB308', bg: '#FEF9C3', border: '#FEF08A', icon: <Clipboard size={14} /> };
  if (t.includes('phase 3')) return { color: '#F97316', bg: '#FFEDD5', border: '#FED7AA', icon: <Database size={14} /> };
  if (t.includes('phase 4')) return { color: '#22C55E', bg: '#DCFCE7', border: '#BBF7D0', icon: <Activity size={14} /> };
  if (t.includes('phase 5')) return { color: '#EF4444', bg: '#FEF2F2', border: '#FECACA', icon: <CheckCircle size={14} /> };
  return { color: '#6366F1', bg: '#EEF2FF', border: '#E0E7FF', icon: <Zap size={14} /> };
};

/* ── Markdown Component ── */
const MarkdownText = ({ text, hideIntro = false, formatStatus = false }) => {
  if (!text) return null;
  try {
  
  let lines = text.split('\n').filter(l => l.trim() !== '');

  // Strip huge introductory paragraph if requested
  if (hideIntro && lines.length > 0 && !lines[0].trim().startsWith('* ') && !lines[0].trim().startsWith('- ') && !/^\d+\.\s/.test(lines[0].trim())) {
    lines.shift();
  }

  const formatText = (str) => {
    const parts = str.split(/(\*\*.*?\*\*)/g);
    return parts.map((part, i) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        return <strong key={i} style={{ color: '#111827', fontWeight: 600 }}>{part.slice(2, -2)}</strong>;
      }
      return <span key={i}>{part}</span>;
    });
  };

  let elements = [];
  let inList = false;
  let listItems = [];

  lines.forEach((line, index) => {
    const trimmed = line.trim();

    // Auto-format "Current Status:" paragraph into bullets
    if (formatStatus && trimmed.replace(/\*\*/g, '').startsWith('Current Status:')) {
      if (inList) {
        elements.push(<ListContainer key={`ul-${index}`}>{[...listItems]}</ListContainer>);
        listItems = [];
        inList = false;
      }
      
      const statusText = trimmed.replace(/\*\*/g, '').replace('Current Status:', '').trim();
      const statusPoints = statusText.split('. ')
        .filter(s => s.trim().length > 4)
        .map(s => s + (s.endsWith('.') ? '' : '.'));
        
      elements.push(<Paragraph key={`status-heading-${index}`}><strong>Current Status:</strong></Paragraph>);
      
      const statusItems = statusPoints.map((pt, idx) => (
        <ListItem key={`status-pt-${idx}`}>
          <Bullet /><span>{formatText(pt)}</span>
        </ListItem>
      ));
      
      elements.push(<ListContainer key={`status-list-${index}`}>{statusItems}</ListContainer>);
      return;
    }

    const isBullet = trimmed.startsWith('* ') || trimmed.startsWith('- ') || /^\d+\.\s/.test(trimmed);
    
    let content = trimmed;
    if (trimmed.startsWith('* ') || trimmed.startsWith('- ')) content = trimmed.substring(2);
    else if (/^\d+\.\s/.test(trimmed)) content = trimmed.replace(/^\d+\.\s/, '');

    if (isBullet) {
      if (!inList) inList = true;
      listItems.push(
        <ListItem key={`li-${index}`}>
          <Bullet />
          <span>{formatText(content)}</span>
        </ListItem>
      );
    } else {
      if (inList) {
        elements.push(<ListContainer key={`ul-${index}`}>{[...listItems]}</ListContainer>);
        listItems = [];
        inList = false;
      }
      if (!/^\*\*[a-zA-Z\s]+:\*\*$/.test(trimmed)) {
        elements.push(<Paragraph key={`p-${index}`}>{formatText(content)}</Paragraph>);
      }
    }
  });

  if (inList && listItems.length > 0) {
    elements.push(<ListContainer key="ul-end">{listItems}</ListContainer>);
  }

  return <MdWrapper>{elements}</MdWrapper>;
  } catch (err) {
    return <MdWrapper><Paragraph style={{color:'#EF4444'}}>Could not render content.</Paragraph></MdWrapper>;
  }
};

/* ── Evidence Finding Bullet Item ── */
const EvidenceFindingItem = ({ text, index, type = 'visual' }) => {
  let status = 'CONFIRMED';
  let cleanText = text;

  // Visual Statuses
  if (text.startsWith('[CRITICAL]')) { status = 'CRITICAL'; cleanText = text.replace('[CRITICAL]', '').trim(); }
  else if (text.startsWith('[RISK]')) { status = 'RISK'; cleanText = text.replace('[RISK]', '').trim(); }
  else if (text.startsWith('[CONFIRMED]')) { status = 'CONFIRMED'; cleanText = text.replace('[CONFIRMED]', '').trim(); }
  
  // Documentary Statuses
  else if (text.startsWith('[OFFICIAL]')) { status = 'OFFICIAL'; cleanText = text.replace('[OFFICIAL]', '').trim(); }
  else if (text.startsWith('[TECHNICAL]')) { status = 'TECHNICAL'; cleanText = text.replace('[TECHNICAL]', '').trim(); }
  else if (text.startsWith('[TIMELINE]')) { status = 'TIMELINE'; cleanText = text.replace('[TIMELINE]', '').trim(); }
  
  // Video Statuses
  else if (text.startsWith('[ACTION]')) { status = 'ACTION'; cleanText = text.replace('[ACTION]', '').trim(); }
  else if (text.startsWith('[ENVIRONMENT]')) { status = 'ENVIRONMENT'; cleanText = text.replace('[ENVIRONMENT]', '').trim(); }
  else if (text.startsWith('[SOUND]')) { status = 'SOUND'; cleanText = text.replace('[SOUND]', '').trim(); }
  else if (text.startsWith('[MISMATCH]')) { status = 'MISMATCH'; cleanText = text.replace('[MISMATCH]', '').trim(); }

  const config = {
    CRITICAL: { icon: <ShieldAlert size={18} />, color: '#EF4444', bg: '#FEF2F2' },
    RISK: { icon: <AlertTriangle size={18} />, color: '#F59E0B', bg: '#FFFBEB' },
    CONFIRMED: { icon: <Target size={18} />, color: '#10B981', bg: '#F0FDF4' },
    OFFICIAL: { icon: <ShieldAlert size={18} />, color: '#4F46E5', bg: '#EEF2FF' },
    TECHNICAL: { icon: <FileText size={18} />, color: '#3B82F6', bg: '#EFF6FF' },
    TIMELINE: { icon: <Clock size={18} />, color: '#8B5CF6', bg: '#F5F3FF' },
    ACTION: { icon: <Zap size={18} />, color: '#F59E0B', bg: '#FFFBEB' },
    ENVIRONMENT: { icon: <Wind size={18} />, color: '#3B82F6', bg: '#EFF6FF' },
    SOUND: { icon: <Music size={18} />, color: '#0F172A', bg: '#F1F5F9' },
    MISMATCH: { icon: <AlertTriangle size={18} />, color: '#EF4444', bg: '#FEF2F2' }
  }[status] || { icon: <Sparkles size={18} />, color: '#64748B', bg: '#F8FAFC' };

  return (
    <FindingCard
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: 0.1 * index }}
      $color={config.color}
      $bg={config.bg}
    >
      <FindingIcon $color={config.color}>
        {config.icon}
      </FindingIcon>
      <FindingText>{cleanText}</FindingText>
    </FindingCard>
  );
};

/* ── Main Component ── */
const ReportPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeModal, setActiveModal] = useState(null);
  const [selectedImage, setSelectedImage] = useState(null);
  const [selectedDoc, setSelectedDoc] = useState(null);

  useEffect(() => {
    const fetchReport = async () => {
      // 1. Try to hydrate from local cache (speed boost)
      try {
        const cached = localStorage.getItem(`temp_report_${id}`);
        if (cached) {
          setReport(JSON.parse(cached));
          setLoading(false);
        }
      } catch (e) { console.warn("Cache load error", e); }

      // 2. Fetch/Refresh from server
      try {
        const res = await fetch(`http://127.0.0.1:8001/emails/report/${id}`);
        if (!res.ok) throw new Error('Report not found');
        const data = await res.json();
        setReport(data.report);
      } catch (err) { 
        if (!report) setError(err.message); 
      } finally { 
        setLoading(false); 
      }
    };
    fetchReport();
  }, [id]);

  if (loading) return <PageWrapper><LoadingBox><BigSpin /><LoadingText>Loading Report...</LoadingText></LoadingBox></PageWrapper>;
  if (error || !report) return <PageWrapper><ErrorBox><h2>Report Not Found</h2><BackButton onClick={() => navigate('/dashboard')}><ArrowLeft size={18} /> Back to Dashboard</BackButton></ErrorBox></PageWrapper>;

  const sevColors = getSeverityColor(report.severity_score);
  const urgColors = getUrgencyColor(report.urgency_level);

  return (
    <PageWrapper>
      <Container>
        {/* Navigation & Title */}
        <PageHeader>
          <BackButton onClick={() => window.close()}><ArrowLeft size={16} /> Close Tab</BackButton>
          <TitleRow>
            <PageTitle>
              {report.is_collective ? <BarChart2 size={26} color="#4F46E5" /> : <FileText size={26} color="#059669" />}
              {report.email_subject || (report.is_collective ? 'Collective Report' : 'Generated Report')}
            </PageTitle>
            {report.email_count > 1 && <Badge>{report.email_count} emails analyzed</Badge>}
          </TitleRow>
        </PageHeader>
        
        {/* Top KPIs (3D Effect Row) */}
        <GridTop>
          <KPICard 
            $bg={sevColors.bg} $border={sevColors.border} $shadow={sevColors.shadow}
            onClick={() => setActiveModal({ title: 'Severity Context', text: report.severity_reason, icon: <AlertTriangle color={sevColors.text} /> })}
          >
            <KPICardHeader>
              <CardTitle $color={sevColors.text}><AlertTriangle size={18}/> Severity</CardTitle>
            </KPICardHeader>
            <MetricBlock className="kpi-pop">
              <ScoreCircle $color={sevColors.text}>
                {report.severity_score || 'N/A'}<span>/10</span>
              </ScoreCircle>
              <HoverPromptBlock>
                <div className="trigger-text">View Context ➔</div>
              </HoverPromptBlock>
            </MetricBlock>
          </KPICard>

          <KPICard 
            $bg={urgColors.bg} $border={urgColors.border} $shadow={urgColors.shadow}
            onClick={() => setActiveModal({ title: 'Urgency Context', text: 'Immediate action prioritization', icon: <Clock color={urgColors.text} /> })}
          >
            <KPICardHeader>
              <CardTitle $color={urgColors.text}><Clock size={18}/> Urgency</CardTitle>
            </KPICardHeader>
            <MetricBlock className="kpi-pop">
              <MetricValue $color={urgColors.text} style={{marginTop: '10px'}}>{report.urgency_level || 'N/A'}</MetricValue>
              <MetricContextLine>Immediate action prioritization</MetricContextLine>
            </MetricBlock>
          </KPICard>

          <KPICard 
            $bg="#EEF2FF" $border="#4F46E5" $shadow="rgba(79, 70, 229, 0.25)"
            onClick={() => setActiveModal({ title: 'Classification Context', text: `${report.primary_category} / ${report.sub_category}`, icon: <Activity color="#4F46E5" /> })}
          >
            <KPICardHeader>
              <CardTitle $color="#4F46E5"><Activity size={18}/> Classification</CardTitle>
            </KPICardHeader>
            <MetricBlock className="kpi-pop">
              <Pill $primary style={{marginTop: '10px', fontSize: '1.4rem', padding: '8px 18px', borderRadius: '12px'}}>
                {report.primary_category || 'N/A'}
              </Pill>
              <MetricContextLine style={{marginTop:'12px', fontSize: '1.05rem'}}>{report.sub_category}</MetricContextLine>
            </MetricBlock>
          </KPICard>
        </GridTop>

        <GridMain>
          {/* Left Column (Primary Info) */}
          <LeftColumn>
            <Card $accent="#4F46E5" $bg="linear-gradient(135deg, #FFFFFF 0%, #FAFAFF 100%)">
              <CardHeader>
                <CardTitle $color="#4F46E5"><Target size={18}/> Executive Summary</CardTitle>
              </CardHeader>
              <MarkdownText text={report.executive_summary} />
            </Card>

            <Card $accent="#10B981" $bg="linear-gradient(135deg, #FFFFFF 0%, #F6FDF9 100%)">
              <CardHeader>
                <CardTitle $color="#10B981"><Sparkles size={18}/> Recommended Actions</CardTitle>
              </CardHeader>
              <MarkdownText text={report.ai_recommended_actions} />
            </Card>

            <Card $accent="#F59E0B">
              <CardHeader>
                <CardTitle $color="#F59E0B"><Users size={18}/> Population Context</CardTitle>
              </CardHeader>
              <HighlightBox>
                <HighlightHeader>
                  <Users size={20} color="#F59E0B" />
                  <strong>Affected Population Summary</strong>
                </HighlightHeader>
                <HighlightContent>
                  <PopItem>
                    <span className="label">Overview</span>
                    <span className="value">{report.population_affected || 'N/A'}</span>
                  </PopItem>
                  {report.vulnerable_group && (
                    <PopItem $highlight>
                      <span className="label">Vulnerable Focus</span>
                      <span className="value">{report.vulnerable_group}</span>
                    </PopItem>
                  )}
                </HighlightContent>
              </HighlightBox>
            </Card>

            <Card $accent="#6366F1" $bg="linear-gradient(135deg, #FFFFFF 0%, #F5F7FF 100%)">
              <CardHeader>
                <CardTitle $color="#6366F1"><Zap size={18}/> Key Problem Observations</CardTitle>
              </CardHeader>
              <MarkdownText text={report.description} formatStatus />
            </Card>

            {/* Evidence & Attachments Section */}
            {/* 📸 Photos & Visual Insights */}
            {((report.attachments && report.attachments.some(a => a.mime_type?.startsWith('image/'))) || report.evidence_insights?.visual_proof?.length > 0) && (
              <Card $accent="#10B981" $bg="white" style={{ marginBottom: '24px' }}>
                <CardHeader>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                    <CardTitle $color="#10B981"><Image size={20}/> Visual Proof & Observations</CardTitle>
                    <Badge style={{ background: '#F0FDF4', border: '1px solid #DCFCE7', color: '#10B981' }}>Photo Analysis</Badge>
                  </div>
                </CardHeader>
                
                {report.attachments && report.attachments.filter(a => a.mime_type?.startsWith('image/')).length > 0 && (
                  <EvidenceGrid>
                    {report.attachments.filter(a => a.mime_type?.startsWith('image/')).map((att, i) => (
                      <PremiumEvidenceCard 
                        key={i} 
                        onClick={() => setSelectedImage(att.url)}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.1 * i }}
                        $borderColor={['#10B981', '#34D399', '#059669'][i % 3]}
                      >
                        <ImageLabel>Photo {i + 1}</ImageLabel>
                        <img src={att.url} alt={att.filename} />
                        <EvidenceHoverOverlay>
                          <Eye size={24} />
                          <span>View Full Photo</span>
                        </EvidenceHoverOverlay>
                      </PremiumEvidenceCard>
                    ))}
                  </EvidenceGrid>
                )}

                {report.evidence_insights?.visual_proof?.length > 0 && (
                  <FindingsSection style={{ marginTop: '24px', borderTop: '1px dashed #E2E8F0' }}>
                    <FindingsTitle>
                      <Sparkles size={18} color="#10B981" />
                      Key Visual Findings
                    </FindingsTitle>
                    <FindingsList>
                      {report.evidence_insights.visual_proof.map((finding, idx) => (
                        <EvidenceFindingItem key={`vis-${idx}`} text={finding} index={idx} type="visual" />
                      ))}
                    </FindingsList>
                  </FindingsSection>
                )}
              </Card>
            )}

            {/* 🎥 Videos & Action Analysis */}
            {((report.attachments && report.attachments.some(a => a.mime_type?.startsWith('video/'))) || report.evidence_insights?.video_evidence?.length > 0) && (
              <Card $accent="#4F46E5" $bg="white" style={{ marginBottom: '24px' }}>
                <CardHeader>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                    <CardTitle $color="#4F46E5"><PlayCircle size={20}/> Video Analysis & Clips</CardTitle>
                    <Badge style={{ background: '#EEF2FF', border: '1px solid #E0E7FF', color: '#4F46E5' }}>Motion Insights</Badge>
                  </div>
                </CardHeader>
                
                {report.attachments && report.attachments.filter(a => a.mime_type?.startsWith('video/')).length > 0 && (
                  <EvidenceGrid>
                    {report.attachments.filter(a => a.mime_type?.startsWith('video/')).map((att, i) => (
                      <PremiumEvidenceCard 
                        key={i} 
                        onClick={() => setSelectedDoc({ url: att.url, filename: att.filename })}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.1 * i }}
                        $borderColor="#4F46E5"
                      >
                        <ImageLabel>Video Clip {i + 1}</ImageLabel>
                        <div style={{ width: '100%', height: '100%', background: '#0F172A', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <PlayCircle size={48} color="white" opacity={0.8} />
                        </div>
                        <EvidenceHoverOverlay>
                          <PlayCircle size={24} />
                          <span>Play Video</span>
                        </EvidenceHoverOverlay>
                      </PremiumEvidenceCard>
                    ))}
                  </EvidenceGrid>
                )}

                {report.evidence_insights?.video_evidence?.length > 0 && (
                  <FindingsSection style={{ marginTop: '24px', borderTop: '1px dashed #E2E8F0' }}>
                    <FindingsTitle>
                      <Zap size={18} color="#4F46E5" />
                      Video Key Details
                    </FindingsTitle>
                    <FindingsList>
                      {report.evidence_insights.video_evidence.map((finding, idx) => (
                        <EvidenceFindingItem key={`vid-${idx}`} text={finding} index={idx} type="video" />
                      ))}
                    </FindingsList>
                  </FindingsSection>
                )}
              </Card>
            )}

            {/* 📄 Documents & Official Proof */}
            {((report.attachments && report.attachments.some(a => !a.mime_type?.startsWith('image/') && !a.mime_type?.startsWith('video/'))) || report.evidence_insights?.documentary_evidence?.length > 0) && (
              <Card $accent="#3B82F6" $bg="white">
                <CardHeader>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                    <CardTitle $color="#3B82F6"><FileText size={20}/> Documentary Evidence</CardTitle>
                    <Badge style={{ background: '#EFF6FF', border: '1px solid #DBEAFE', color: '#3B82F6' }}>Official Records</Badge>
                  </div>
                </CardHeader>
                
                {report.attachments && report.attachments.filter(a => !a.mime_type?.startsWith('image/') && !a.mime_type?.startsWith('video/')).length > 0 && (
                  <FileList style={{ marginBottom: '24px' }}>
                    {report.attachments.filter(a => !a.mime_type?.startsWith('image/') && !a.mime_type?.startsWith('video/')).map((att, i) => (
                      <FileItem 
                        key={i} 
                        onClick={() => setSelectedDoc({ url: att.url, filename: att.filename })}
                      >
                        <FileText size={18} color="#3B82F6" />
                        <FileContent>
                          <FileName>{att.filename}</FileName>
                          <FileMeta>{att.mime_type || 'Unknown Type'}</FileMeta>
                        </FileContent>
                        <Download size={16} color="#94A3B8" />
                      </FileItem>
                    ))}
                  </FileList>
                )}

                {report.evidence_insights?.documentary_evidence?.length > 0 && (
                  <FindingsSection style={{ borderTop: '1px dashed #E2E8F0', paddingTop: '20px' }}>
                    <FindingsTitle>
                      <ShieldAlert size={18} color="#3B82F6" />
                      Official Insights
                    </FindingsTitle>
                    <FindingsList>
                      {report.evidence_insights.documentary_evidence.map((finding, idx) => (
                        <EvidenceFindingItem key={`doc-${idx}`} text={finding} index={idx} type="document" />
                      ))}
                    </FindingsList>
                  </FindingsSection>
                )}
              </Card>
            )}

          </LeftColumn>

          {/* Right Column (Meta & Timeline) */}
          <RightColumn>
            <Card $accent="#3B82F6" $bg="linear-gradient(135deg, #FFFFFF 0%, #F5F9FF 100%)">
              <CardHeader>
                <CardTitle $color="#3B82F6"><MapPin size={18}/> Logistics</CardTitle>
              </CardHeader>
              <MetaList>
                <MetaItem><span>Location:</span> <b>{report.precise_location || 'N/A'}</b></MetaItem>
                <MetaItem><span>Community Sentiment:</span> <b>{report.sentiment || 'N/A'}</b></MetaItem>
                {report.govt_scheme_applicable && <MetaItem><span>Govt Scheme:</span> <b>{report.govt_scheme_applicable}</b></MetaItem>}
              </MetaList>
            </Card>

            {report.key_complaints?.length > 0 && (
              <Card $accent="#8B5CF6">
                <CardHeader>
                  <CardTitle $color="#8B5CF6"><ShieldAlert size={18}/> Key Issues</CardTitle>
                </CardHeader>
                <TagCloud>
                  {report.key_complaints.map((tag, i) => {
                    const c = TAG_COLORS[i % TAG_COLORS.length];
                    return (
                      <Tag key={i} $c={c}>{tag}</Tag>
                    );
                  })}
                </TagCloud>
              </Card>
            )}

            {report.expected_resolution_timeline?.length > 0 && (
              <Card $accent="rgba(245, 158, 11, 0.4)" style={{ 
                background: '#FFFFFF', 
                border: '1px solid rgba(245, 158, 11, 0.08)',
                boxShadow: '0 20px 40px -15px rgba(0,0,0,0.03), 0 0 15px rgba(245, 158, 11, 0.05)'
              }}>
                <CardHeader>
                  <CardTitle $color="#0F172A" style={{ letterSpacing: '0.08em', fontWeight: 800 }}>
                    <div style={{ padding: '6px', background: '#FFF7ED', borderRadius: '8px', display: 'flex' }}>
                       <ActivitySquare size={18} color="#F59E0B"/> 
                    </div>
                    Expected Timeline
                  </CardTitle>
                </CardHeader>
                <Stepper style={{ marginTop: '10px' }}>
                  <motion.div 
                    initial={{ height: 0 }}
                    animate={{ height: 'calc(100% - 30px)' }}
                    transition={{ duration: 1.5, ease: "easeInOut" }}
                    style={{ 
                      position: 'absolute', 
                      left: '7px', 
                      top: '24px', 
                      width: '2px', 
                      background: 'rgba(226, 232, 240, 0.8)',
                      zIndex: 1
                    }} 
                  />
                  {report.expected_resolution_timeline.map((stepText, idx) => {
                    const theme = getPhaseTheme(stepText);
                    return (
                      <Step key={idx} as={motion.div}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.1 * idx, duration: 0.4 }}
                        style={{ paddingBottom: '32px' }}
                      >
                        <ModernNode $color={theme.color} style={{ zIndex: 10 }}>
                          <InnerCircle $color={theme.color} as={motion.div}
                            initial={{ scale: 0.5 }}
                            animate={{ scale: 1 }}
                            transition={{ 
                              duration: 0.5, 
                              delay: 0.1 * idx + 0.3, 
                              repeat: 1, 
                              repeatType: "reverse" 
                            }}
                          />
                        </ModernNode>
                        <StepContent>
                          <PhaseBlock $theme={theme} as={motion.div}
                            whileHover={{ scale: 1.01, translateX: 6 }}
                            transition={{ type: "spring", stiffness: 400, damping: 25 }}
                          >
                            <PhaseHeader>
                              <div className="icon" style={{ background: theme.color + '20' }}>
                                {React.cloneElement(theme.icon, { color: theme.color })}
                              </div>
                              <MarkdownText text={stepText} />
                            </PhaseHeader>
                          </PhaseBlock>
                        </StepContent>
                      </Step>
                    );
                  })}
                </Stepper>
              </Card>
            )}

          </RightColumn>
        </GridMain>

      </Container>

      {/* Reasoning Pop-up Modal */}
      {activeModal && (
        <ModalOverlay onClick={() => setActiveModal(null)}>
          <ModalContent onClick={e => e.stopPropagation()}>
            <ModalCloseButton onClick={() => setActiveModal(null)}><X size={18}/></ModalCloseButton>
            <ModalTitle>{activeModal.icon} {activeModal.title}</ModalTitle>
            <ModalText>{activeModal.text}</ModalText>
          </ModalContent>
        </ModalOverlay>
      )}
      
      {selectedImage && (
        <ImageViewer src={selectedImage} onClose={() => setSelectedImage(null)} />
      )}
      
      {selectedDoc && (
        <DocumentViewer 
          src={selectedDoc.url} 
          filename={selectedDoc.filename} 
          onClose={() => setSelectedDoc(null)} 
        />
      )}

    </PageWrapper>
  );
};

/* ── Typography & Components ── */
const MdWrapper = styled.div`
  font-size: 0.95rem;
  color: #374151;
`;
const Paragraph = styled.p`
  margin-bottom: 12px;
  line-height: 1.6;
`;
const ListContainer = styled.ul`
  margin: 12px 0;
  display: flex;
  flex-direction: column;
  gap: 12px;
`;
const ListItem = styled.li`
  display: flex;
  align-items: flex-start;
  gap: 12px;
  line-height: 1.6;
  padding: 6px 10px;
  background: rgba(255, 255, 255, 0.5);
  border-radius: 8px;
  transition: all 0.2s;
  &:hover { background: rgba(99, 102, 241, 0.05); transform: translateX(4px); }
`;
const Bullet = styled.div`
  width: 8px;
  height: 8px;
  border-radius: 2px;
  background: linear-gradient(135deg, #10B981 0%, #059669 100%);
  margin-top: 6px;
  flex-shrink: 0;
  transform: rotate(45deg);
  box-shadow: 0 2px 5px rgba(16, 185, 129, 0.3);
`;

/* ── Evidence Components ── */
const EvidenceAnalysisBox = styled.div`
  background: rgba(59, 130, 246, 0.04);
  border: 1px solid rgba(59, 130, 246, 0.1);
  border-left: 4px solid #3B82F6;
  padding: 16px;
  border-radius: 8px;
  margin-bottom: 20px;
  & strong { display: flex; align-items: center; gap: 8px; font-weight: 700; color: #1E3A8A; margin-bottom: 8px; }
`;

const FileList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
`;

const FileItem = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  background: white;
  border: 1px solid rgba(0,0,0,0.05);
  border-radius: 10px;
  cursor: pointer;
  transition: all 0.2s;
  &:hover { background: #F8FAFC; border-color: #3B82F6; }
`;

const FileContent = styled.div`flex: 1; min-width: 0;`;
const FileName = styled.div`font-weight: 600; font-size: 0.9rem; color: #1E293B; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;`;
const FileMeta = styled.div`font-size: 0.75rem; color: #64748B;`;

/* ── New Premium Evidence Styles ── */
const PremiumEvidenceCard = styled(motion.div)`
  position: relative;
  border-radius: 16px;
  overflow: hidden;
  height: 220px;
  background: white;
  border: 4px solid ${p => p.$borderColor};
  box-shadow: 0 10px 30px -10px rgba(0,0,0,0.1);
  cursor: pointer;
  
  & img { 
    width: 100%; 
    height: 100%; 
    object-fit: cover;
    transition: transform 0.4s ease;
  }
  
  &:hover img {
    transform: scale(1.1) rotate(1deg);
  }

  &:hover {
    transform: translateY(-8px) !important;
    box-shadow: 0 20px 40px -15px rgba(0,0,0,0.15);
  }
`;

const ImageLabel = styled.div`
  position: absolute;
  top: 12px;
  left: 12px;
  background: white;
  padding: 4px 12px;
  border-radius: 10px;
  font-size: 0.75rem;
  font-weight: 800;
  color: #1e293b;
  z-index: 2;
  box-shadow: 0 4px 10px rgba(0,0,0,0.1);
  text-transform: uppercase;
  letter-spacing: 0.05em;
`;

const EvidenceHoverOverlay = styled.div`
  position: absolute;
  inset: 0;
  background: rgba(0, 0, 0, 0.4);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  color: white;
  gap: 8px;
  opacity: 0;
  transition: opacity 0.3s ease;
  z-index: 3;
  
  ${PremiumEvidenceCard}:hover & {
    opacity: 1;
  }
  
  span { font-weight: 700; font-size: 0.9rem; }
`;

const FindingsSection = styled.div`
  margin-top: 32px;
  padding-top: 24px;
  border-top: 1px dashed #E2E8F0;
`;

const FindingsTitle = styled.h4`
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 1.1rem;
  font-weight: 800;
  color: #1e293b;
  margin-bottom: 20px;
  font-family: 'Outfit', sans-serif;
`;

const FindingsList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 12px;
`;

const FindingCard = styled(motion.div)`
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 16px 20px;
  background: ${p => p.$bg};
  border-left: 5px solid ${p => p.$color};
  border-radius: 12px;
  box-shadow: 0 4px 12px rgba(0,0,0,0.03);
  transition: transform 0.2s ease;
  
  &:hover {
    transform: translateX(6px);
  }
`;

const FindingIcon = styled.div`
  color: ${p => p.$color};
  display: flex;
  align-items: center;
  justify-content: center;
  background: white;
  width: 36px;
  height: 36px;
  border-radius: 10px;
  box-shadow: 0 4px 8px rgba(0,0,0,0.05);
  flex-shrink: 0;
`;

const FindingText = styled.div`
  font-size: 0.95rem;
  font-weight: 600;
  color: #334155;
  line-height: 1.5;
`;

const EvidenceGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
  gap: 20px;
  margin-bottom: 20px;
`;

/* ── Animations ── */
const fadeIn = keyframes`from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}`;
const spin = keyframes`to{transform:rotate(360deg)}`;

/* ── Layout & Wrapper ── */
const PageWrapper = styled.div`
  min-height: 100vh;
  background-color: #FFF7ED; /* Lightest Orange */
  padding: 40px 5%;
  font-family: 'Inter', sans-serif;
`;
const Container = styled.div`
  max-width: 1200px;
  margin: 0 auto;
`;

/* ── Loaders ── */
const LoadingBox = styled.div`display:flex;flex-direction:column;align-items:center;justify-content:center;height:60vh;`;
const BigSpin = styled.div`width:40px;height:40px;border:3px solid #E2E8F0;border-top-color:#4F46E5;border-radius:50%;animation:${spin} 0.8s linear infinite;`;
const LoadingText = styled.h3`margin-top:16px;color:#475569;font-family:'Outfit',sans-serif;`;
const ErrorBox = styled(LoadingBox)`color:#EF4444;`;

/* ── Header ── */
const PageHeader = styled.div`
  margin-bottom: 24px;
  animation: ${fadeIn} 0.5s ease-out backwards;
`;
const BackButton = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  background: transparent;
  color: #64748B;
  border: none;
  font-weight: 600;
  font-size: 0.9rem;
  cursor: pointer;
  padding: 0;
  margin-bottom: 16px;
  transition: all 0.2s ease;
  &:hover { color: #0F172A; transform: translateX(-4px); }
`;
const TitleRow = styled.div`
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 12px;
`;
const PageTitle = styled.h1`
  font-family: 'Outfit', sans-serif;
  font-size: 1.8rem;
  font-weight: 800;
  color: #0F172A;
  display: flex;
  align-items: center;
  gap: 12px;
  margin: 0;
`;
const Badge = styled.span`
  background: linear-gradient(135deg, #EEF2FF 0%, #E0E7FF 100%);
  color: #4F46E5;
  padding: 6px 14px;
  border-radius: 20px;
  font-size: 0.85rem;
  font-weight: 700;
  border: 1px solid rgba(79, 70, 229, 0.1);
  box-shadow: 0 2px 4px rgba(79, 70, 229, 0.05);
`;

/* ── Grids ── */
const GridTop = styled.div`
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 20px;
  margin-bottom: 24px;
  perspective: 1000px; /* Essential for 3D card tilt */
  animation: ${fadeIn} 0.6s ease-out backwards 0.1s;
  @media (max-width: 800px) { grid-template-columns: 1fr; }
`;
const GridMain = styled.div`
  display: grid;
  grid-template-columns: 2fr 1fr;
  gap: 24px;
  animation: ${fadeIn} 0.7s ease-out backwards 0.2s;
  @media (max-width: 960px) { grid-template-columns: 1fr; }
`;
const LeftColumn = styled.div`display:flex;flex-direction:column;gap:20px;`;
const RightColumn = styled.div`display:flex;flex-direction:column;gap:20px;`;

/* ── 3D KPI Cards ── */
const KPICard = styled.div`
  background-color: ${p => p.$bg || '#FFFFFF'};
  border-radius: 20px;
  position: relative;
  border: 3px solid ${p => p.$border || '#000'};
  box-shadow: 10px 10px 0 ${p => p.$shadow || 'rgba(0, 0, 0, 0.1)'};
  overflow: hidden;
  padding: 24px;
  transition: transform 0.5s cubic-bezier(0.23, 1, 0.32, 1), box-shadow 0.5s cubic-bezier(0.23, 1, 0.32, 1);
  transform-style: preserve-3d;
  cursor: pointer;

  &:hover {
    transform: translateZ(20px) rotateX(5deg) rotateY(-5deg);
    box-shadow: 20px 20px 0 ${p => p.$shadow || 'rgba(0, 0, 0, 0.2)'};
  }

  &::before {
    content: "";
    position: absolute;
    top: -50%;
    left: -50%;
    width: 200%;
    height: 200%;
    background: linear-gradient(
      to bottom right,
      rgba(255, 255, 255, 0.4),
      rgba(255, 255, 255, 0) 80%
    );
    transform: rotate(-30deg);
    pointer-events: none;
  }

  * {
    transition: transform 0.3s ease-out;
  }
  
  &:hover .kpi-pop {
    transform: translateZ(30px);
  }

  &:hover .trigger-text {
    opacity: 1;
    transform: translateX(4px);
  }
`;
const KPICardHeader = styled.div`
  margin-bottom: 20px;
  border-bottom: 1px solid rgba(0,0,0,0.05);
  padding-bottom: 12px;
`;
const ScoreCircle = styled.div`
  width: 74px;
  height: 74px;
  border-radius: 50%;
  border: 4px solid ${p => p.$color};
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 2.1rem;
  font-weight: 900;
  font-family: 'Outfit', sans-serif;
  color: ${p => p.$color};
  background: #FFFFFF;
  box-shadow: 0 4px 10px rgba(0,0,0,0.08);
  margin-bottom: 12px;
  
  span {
    font-size: 0.95rem;
    color: #9CA3AF;
  }
`;
const MetricContextLine = styled.p`
  font-size: 0.9rem;
  font-weight: 500;
  color: #4B5563;
  margin-top: 10px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  width: 100%;
  position: relative;
`;
const HoverPromptBlock = styled.div`
  margin-top: 10px;
  .trigger-text {
    font-size: 0.9rem;
    color: #6366F1;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    opacity: 0.6;
    transition: all 0.2s ease;
  }
`;

/* ── Modal Pop-up ── */
const ModalOverlay = styled.div`
  position: fixed;
  top: 0; left: 0; right: 0; bottom: 0;
  background: rgba(15, 23, 42, 0.5);
  backdrop-filter: blur(4px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  animation: ${fadeIn} 0.2s ease-out;
`;
const ModalContent = styled.div`
  background: white;
  width: 90%;
  max-width: 500px;
  border-radius: 20px;
  padding: 30px;
  box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
  position: relative;
  border: 1px solid #E2E8F0;
`;
const ModalTitle = styled.h3`
  font-family: 'Outfit', sans-serif;
  font-size: 1.4rem;
  color: #0F172A;
  margin-top: 0;
  margin-bottom: 16px;
  display: flex;
  align-items: center;
  gap: 10px;
`;
const ModalText = styled.p`
  font-size: 1.05rem;
  line-height: 1.6;
  color: #334155;
`;
const ModalCloseButton = styled.button`
  position: absolute;
  top: 20px;
  right: 20px;
  background: #F1F5F9;
  border: none;
  border-radius: 50%;
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  color: #64748B;
  transition: all 0.2s;
  &:hover { background: #E2E8F0; color: #0F172A; transform: scale(1.1); }
`;

/* ── Cards ── */
const Card = styled.div`
  background: ${p => p.$bg || '#FFFFFF'};
  border: 1px solid ${p => p.$accent ? `${p.$accent}40` : p.$border || 'rgba(226, 232, 240, 0.8)'};
  border-radius: 16px;
  padding: 24px;
  box-shadow: 0 4px 15px rgba(0,0,0,0.02), ${p => p.$accent ? `0 0 15px ${p.$accent}15` : '0 2px 4px rgba(0,0,0,0.02)'};
  transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
  overflow: hidden;
  
  &:hover {
    transform: translateY(-4px);
    box-shadow: 0 12px 25px rgba(0,0,0,0.04), ${p => p.$accent ? `0 0 20px ${p.$accent}30` : '0 5px 10px rgba(0,0,0,0.02)'};
    border-color: ${p => p.$accent ? `${p.$accent}80` : p.$border || 'rgba(203, 213, 225, 1)'};
  }
`;
const CardHeader = styled.div`
  margin-bottom: 16px;
`;
const CardTitle = styled.h3`
  font-family: 'Outfit', sans-serif;
  font-size: 1rem;
  font-weight: 700;
  color: ${p => p.$color || '#475569'};
  text-transform: uppercase;
  letter-spacing: 0.05em;
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 0;
`;

/* ── KPI Blocks ── */
const MetricBlock = styled.div``;
const MetricValue = styled.div`
  font-size: 2.2rem;
  font-weight: 800;
  font-family: 'Outfit', sans-serif;
  color: ${p => p.$color || '#111827'};
  line-height: 1.2;
`;
const MetricContext = styled.p`
  font-size: 0.85rem;
  color: #6B7280;
  margin-top: 4px;
`;
const Pill = styled.span`
  display: inline-block;
  background: ${p => p.$primary ? '#EEF2FF' : '#F1F5F9'};
  color: ${p => p.$primary ? '#4F46E5' : '#475569'};
  padding: 6px 14px;
  border-radius: 8px;
  font-weight: 600;
  font-size: 0.9rem;
`;

/* ── Meta & Lists ── */
const HighlightBox = styled.div`
  background: linear-gradient(135deg, #F8FAFC 0%, #F1F5F9 100%);
  border: 1px solid #E2E8F0;
  padding: 18px;
  border-radius: 12px;
  margin-bottom: 24px;
`;
const HighlightHeader = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 16px;
  strong { color: #0F172A; font-size: 1.05rem; letter-spacing: 0.02em; }
`;
const HighlightContent = styled.div`
  display: flex;
  flex-direction: column;
  gap: 14px;
`;
const PopItem = styled.div`
  display: flex;
  flex-direction: column;
  background: ${p => p.$highlight ? '#FFFBEB' : 'transparent'};
  border-left: ${p => p.$highlight ? '3px solid #F59E0B' : 'none'};
  padding: ${p => p.$highlight ? '12px 16px' : '0 4px'};
  border-radius: ${p => p.$highlight ? '0 8px 8px 0' : '0'};
  
  .label { 
    font-size: 0.8rem; 
    color: ${p => p.$highlight ? '#D97706' : '#64748B'}; 
    text-transform: uppercase; 
    font-weight: 800; 
    margin-bottom: 6px; 
    letter-spacing: 0.05em;
  }
  .value { 
    font-size: 0.95rem; 
    color: #334155; 
    line-height: 1.5; 
    font-weight: 500;
  }
`;

const MetaList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 16px;
`;
const MetaItem = styled.div`
  display: flex;
  flex-direction: column;
  font-size: 0.95rem;
  background: #FFFFFF;
  padding: 14px 16px;
  border-radius: 8px;
  border: 1px solid #BFDBFE;  /* Blue-200 */
  border-left: 4px solid #3B82F6; /* Blue-500 accent */
  box-shadow: 0 2px 4px rgba(59, 130, 246, 0.05);
  transition: all 0.2s ease;
  
  &:hover { 
    border-color: #93C5FD; 
    transform: translateX(4px);
    box-shadow: 0 6px 12px -2px rgba(59, 130, 246, 0.15);
  }
  
  span { 
    color: #3B82F6; 
    font-size: 0.8rem; 
    margin-bottom: 6px; 
    text-transform: uppercase; 
    font-weight: 800; 
    letter-spacing: 0.05em; 
  }
  
  b { 
    color: #0F172A; 
    font-size: 1.05rem; 
  }
`;
const TagCloud = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
`;
const Tag = styled.div`
  background: ${p => p.$c ? p.$c.bg : '#F8FAFC'};
  border: 1px solid ${p => p.$c ? p.$c.border : '#E2E8F0'};
  color: ${p => p.$c ? p.$c.text : '#334155'};
  padding: 8px 14px;
  border-radius: 8px;
  font-size: 0.88rem;
  font-weight: 600;
  box-shadow: 0 1px 2px rgba(0,0,0,0.02);
  transition: all 0.2s ease;
  
  &:hover { 
    transform: translateY(-2px) scale(1.02); 
    box-shadow: 0 4px 8px rgba(0,0,0,0.04); 
    border-color: ${p => p.$c ? p.$c.text : '#CBD5E1'}; 
  }
`;

/* ── Timeline Components ── */
const ModernNode = styled.div`
  width: 16px;
  height: 16px;
  border-radius: 50%;
  border: 4px solid white;
  background: white;
  box-shadow: 0 0 0 1px rgba(0,0,0,0.05), 0 4px 10px -2px ${p => p.$color}30;
  margin-top: 4px;
  position: relative;
  z-index: 2;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.3s;
  
  &:hover {
    transform: scale(1.2);
    box-shadow: 0 0 15px ${p => p.$color}40;
  }
`;

const InnerCircle = styled.div`
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: ${p => p.$color};
`;

const PhaseBlock = styled.div`
  background: ${p => p.$theme.bg}40;
  border: 1px solid ${p => p.$theme.border};
  border-radius: 12px;
  padding: 16px 20px;
  transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
  box-shadow: 0 2px 5px rgba(0,0,0,0.02);
  
  &:hover {
    background: ${p => p.$theme.bg}80;
    border-color: ${p => p.$theme.color};
    box-shadow: 0 8px 20px -8px ${p => p.$theme.color}30;
  }
`;

const PhaseHeader = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  
  .icon {
    width: 28px;
    height: 28px;
    border-radius: 8px;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
  }

  & strong {
    color: #1E293B;
    font-size: 0.95rem;
    display: block;
  }
  
  span {
    color: #64748B;
    font-size: 0.82rem;
    font-weight: 500;
  }
`;

const Stepper = styled.div`
  position: relative;
  display: flex;
  flex-direction: column;
`;

const Step = styled.div`
  position: relative;
  display: flex;
  gap: 16px;
  padding-bottom: 24px;
  &:last-child { padding-bottom: 0; }
`;

const StepContent = styled.div`
  flex: 1;
  padding-top: 2px;
`;

export default ReportPage;
