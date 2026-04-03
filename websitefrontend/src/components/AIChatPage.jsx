import React, { useState, useEffect, useRef, useContext } from 'react';
import styled, { keyframes, css } from 'styled-components';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { 
  MessageSquare, X, Send, Sparkles, Database, 
  History, Info, ChevronRight, FileText, ExternalLink, Image as ImageIcon,
  ArrowLeft, Layout
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { AuthContext } from '../App';

const BACKEND_URL = "http://localhost:8001";

// ── Markdown Logic ────────────────────────────────────
const MarkdownRenderer = ({ text }) => {
  if (!text) return null;
  const formatLine = (str) => {
    const parts = str.split(/(\*\*.*?\*\*)/g);
    return parts.map((part, i) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        return <strong key={i} style={{ color: '#1a1a1a', fontWeight: '800' }}>{part.slice(2, -2)}</strong>;
      }
      return <span key={i}>{part}</span>;
    });
  };

  const lines = text.split('\n');
  let elements = [];
  let currentList = [];

  lines.forEach((line, index) => {
    const trimmed = line.trim();
    if (!trimmed) {
      if (currentList.length > 0) {
        elements.push(<ul key={`ul-${index}`} style={{ paddingLeft: '20px', marginBottom: '15px', listStyleType: 'disc' }}>{currentList}</ul>);
        currentList = [];
      }
      return;
    }

    const isBullet = trimmed.startsWith('* ') || trimmed.startsWith('- ');
    const isHeading = trimmed.startsWith('### ');

    if (isHeading) {
      if (currentList.length > 0) {
        elements.push(<ul key={`ul-pre-${index}`} style={{ paddingLeft: '20px', marginBottom: '15px' }}>{currentList}</ul>);
        currentList = [];
      }
      elements.push(<h4 key={`h-${index}`} style={{ margin: '18px 0 10px', fontSize: '1rem', color: '#F07B11', fontWeight: '800', fontFamily: 'Outfit' }}>{formatLine(trimmed.replace('### ', ''))}</h4>);
    } else if (isBullet) {
      currentList.push(<li key={`li-${index}`} style={{ marginBottom: '6px', fontSize: '0.9rem', color: '#444' }}>{formatLine(trimmed.substring(2))}</li>);
    } else {
      if (currentList.length > 0) {
        elements.push(<ul key={`ul-post-${index}`} style={{ paddingLeft: '20px', marginBottom: '15px' }}>{currentList}</ul>);
        currentList = [];
      }
      elements.push(<p key={`p-${index}`} style={{ marginBottom: '12px', fontSize: '0.92rem', color: '#334155' }}>{formatLine(trimmed)}</p>);
    }
  });

  if (currentList.length > 0) {
    elements.push(<ul key="ul-end" style={{ paddingLeft: '20px', marginBottom: '15px' }}>{currentList}</ul>);
  }

  return <div style={{ lineHeight: '1.6' }}>{elements}</div>;
};

// ── Main Page Component ──────────────────────────────
const AIChatPage = () => {
  const { user } = useContext(AuthContext);
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const urlGroupId = searchParams.get('groupId');
  const urlGroupLabel = searchParams.get('groupLabel');

  const [mode, setMode] = useState(urlGroupId ? 'individual' : 'global');
  
  // Effective Context values based on Mode
  const effectiveGroupId = mode === 'global' ? 'global' : (urlGroupId || 'global');
  const effectiveGroupLabel = mode === 'global' ? 'System-wide Analysis' : (urlGroupLabel || 'Targeted Analysis');

  const [query, setQuery] = useState('');
  const [messages, setMessages] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [activeSessionId, setActiveSessionId] = useState(null);
  const [loading, setLoading] = useState(false);
  const chatEndRef = useRef(null);

  const STORAGE_KEY = 'sevasetu_ai_history';

  // 1. Initial Load: Get history and setup active session
  useEffect(() => {
    const raw = localStorage.getItem(STORAGE_KEY);
    const history = raw ? JSON.parse(raw) : {};
    const contextSessions = history[effectiveGroupId] || [];
    
    setSessions(contextSessions);
    
    if (contextSessions.length > 0) {
      // Load most recent session
      const latest = contextSessions[0];
      setActiveSessionId(latest.id);
      setMessages(latest.messages);
    } else {
      createNewSession();
    }
  }, [effectiveGroupId]);

  // 2. Persist active messages whenever they change
  useEffect(() => {
    if (!activeSessionId) return;
    
    const raw = localStorage.getItem(STORAGE_KEY);
    const history = raw ? JSON.parse(raw) : {};
    
    const updatedSessions = sessions.map(s => 
      s.id === activeSessionId ? { ...s, messages, lastUpdated: new Date().toISOString() } : s
    );
    
    history[effectiveGroupId] = updatedSessions;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(history));
    
  }, [messages, activeSessionId]);

  const createNewSession = () => {
    const newSession = {
      id: Date.now(),
      label: `New Analysis - ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`,
      messages: [
        { 
          role: 'ai', 
          content: `Welcome to the **Global Command Center**. I am analyzing **all community data, issues, and reports**. How can I help you today?`,
          sources: [],
          attachments: []
        }
      ],
      lastUpdated: new Date().toISOString()
    };
    
    if (mode === 'individual') {
      newSession.messages[0].content = `Welcome to your new analysis session for **${effectiveGroupLabel}**. I'm ready to investigate this specific context.`;
    }
    
    setSessions(prev => [newSession, ...prev]);
    setActiveSessionId(newSession.id);
    setMessages(newSession.messages);
  };

  const switchSession = (id) => {
    const target = sessions.find(s => s.id === id);
    if (target) {
      setActiveSessionId(id);
      setMessages(target.messages);
    }
  };

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async () => {
    if (!query.trim() || loading) return;
    const userMsg = { role: 'user', content: query };
    setQuery('');
    setLoading(true);

    // If this is the second message in a "New Analysis", update its label with the query
    if (messages.length === 1) {
      setSessions(prev => prev.map(s => 
        s.id === activeSessionId ? { ...s, label: query.substring(0, 30) + '...' } : s
      ));
    }

    setMessages(prev => [...prev, userMsg]);

    try {
      const response = await fetch(`${BACKEND_URL}/reports/memory/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: query,
          user_email: user?.email,
          group_id: mode === 'individual' ? urlGroupId : null,
          group_label: mode === 'individual' ? urlGroupLabel : null
        })
      });
      const data = await response.json();
      setMessages(prev => [...prev, { 
        role: 'ai', 
        content: data.answer || "I couldn't process that request.",
        sources: data.sources || [],
        report_ids: data.report_ids || [],
        attachments: data.attachments || []
      }]);
    } catch (err) {
      setMessages(prev => [...prev, { role: 'ai', content: "Error connecting to AI service. Please try again." }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <PageWrapper
      as={motion.div}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
    >
      <SideNav>
        <LogoBox onClick={() => navigate('/dashboard')}>
          <Sparkles color="#F07B11" size={24} />
          <LogoText>Seva<span>Setu</span></LogoText>
        </LogoBox>
        
        <NavGroup>
          <NavLabel>SESSION CONTEXT</NavLabel>
          <ContextCard $active={true}>
            {mode === 'global' ? <Database size={18} /> : <Layout size={18} />}
            <div className="info">
              <span className="title">{mode === 'individual' ? 'Targeted Analysis' : 'Global Intelligence'}</span>
              <span className="desc">{effectiveGroupLabel}</span>
            </div>
          </ContextCard>
        </NavGroup>

        <NavGroup>
          <NavLabel>ACTIONS</NavLabel>
          <NewChatBtn onClick={createNewSession}>
            <Sparkles size={16} /> New Analysis Session
          </NewChatBtn>
          {mode === 'individual' ? (
            <QuickBtn onClick={() => setMode('global')}>
              <History size={18} /> Switch to Global Context
            </QuickBtn>
          ) : (
            <QuickBtn disabled={!urlGroupId} onClick={() => setMode('individual')}>
              <Layout size={18} /> Return to Group Context
            </QuickBtn>
          )}
        </NavGroup>

        <NavGroup style={{ flex: 1, overflow: 'hidden' }}>
          <NavLabel>PAST INVESTIGATIONS</NavLabel>
          <HistoryScroll>
            <AnimatePresence>
              {sessions.map(s => (
                <HistoryItem 
                  key={s.id} 
                  $active={s.id === activeSessionId}
                  onClick={() => switchSession(s.id)}
                  as={motion.div}
                  initial={{ x: -20, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  exit={{ x: -20, opacity: 0 }}
                >
                  <MessageSquare size={14} />
                  <div className="h-info">
                    <span className="h-label">{s.label}</span>
                    <span className="h-time">{new Date(s.lastUpdated).toLocaleDateString()}</span>
                  </div>
                </HistoryItem>
              ))}
            </AnimatePresence>
          </HistoryScroll>
        </NavGroup>

        <FooterBack onClick={() => navigate('/dashboard')}>
          <ArrowLeft size={18} /> Back to Dashboard
        </FooterBack>
      </SideNav>

      <MainStage>
        <ChatHeader>
          <HTitle>AI Command Center</HTitle>
          <HBadge>{mode === 'individual' ? effectiveGroupLabel : 'Global Mode'}</HBadge>
        </ChatHeader>

        <ChatContentContainer>
          {messages.map((msg, idx) => (
            <MessageRow key={idx} $isUser={msg.role === 'user'}>
              <MsgBubble $isUser={msg.role === 'user'}>
                {msg.role === 'user' ? (
                  <div style={{ fontWeight: '500' }}>{msg.content}</div>
                ) : (
                  <MarkdownRenderer text={msg.content} />
                )}

                {/* Evidence Gallery */}
                {msg.attachments?.length > 0 && (
                  <EvidenceSection>
                    <GalleryTitle>Verified Evidence & Documents</GalleryTitle>
                    <GalleryGrid>
                      {msg.attachments.map((att, i) => (
                        <EvidenceCard 
                          key={i} 
                          onClick={() => window.open(att.url, '_blank')}
                        >
                          {att.mime?.startsWith('image/') ? (
                            <ImgThumb src={att.url} alt="Evidence" />
                          ) : (
                            <FileIconBox>
                              <FileText size={24} color="#F07B11" />
                              <span style={{ fontSize: '0.6rem', fontWeight: '900' }}>DOC</span>
                            </FileIconBox>
                          )}
                          <CardLabel>
                            <span className="n">{att.name.substring(0, 15)}...</span>
                            <span className="t">{att.mime?.split('/')[1] || 'pdf'}</span>
                          </CardLabel>
                        </EvidenceCard>
                      ))}
                    </GalleryGrid>
                  </EvidenceSection>
                )}

                {msg.sources?.length > 0 && (
                  <SourceList>
                    <SourceHeader><Database size={12} /> Sources Found ({msg.sources.length})</SourceHeader>
                    <SourceGrid>
                      {msg.sources.map((src, i) => (
                        <SourceCard key={i} onClick={() => window.open(`/report/${msg.report_ids[i]}`, '_blank')}>
                          <FileText size={12} color="#F07B11" />
                          <span className="stext">{src.substring(0, 50)}...</span>
                          <ExternalLink size={12} />
                        </SourceCard>
                      ))}
                    </SourceGrid>
                  </SourceList>
                )}
              </MsgBubble>
            </MessageRow>
          ))}
          {loading && (
            <MessageRow>
              <LoadingBubble><Dot /><Dot /><Dot /></LoadingBubble>
            </MessageRow>
          )}
          <div ref={chatEndRef} />
        </ChatContentContainer>

        <PromptArea>
          <PromptWrapper>
            <StyledInput 
              placeholder="Ask anything about reports, history, or actionable next steps..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSend()}
            />
            <SendIconButton onClick={handleSend} disabled={loading || !query.trim()}>
              <Send size={20} />
            </SendIconButton>
          </PromptWrapper>
        </PromptArea>
      </MainStage>
    </PageWrapper>
  );
};

/* ── Styled Components ───────────────────────────────── */

const PageWrapper = styled.div`
  display: flex;
  height: 100vh;
  width: 100vw;
  background: #f8fafc;
  overflow: hidden;
`;

const SideNav = styled.div`
  width: 320px;
  background: white;
  border-right: 1px solid #e2e8f0;
  display: flex;
  flex-direction: column;
  padding: 30px;
  @media (max-width: 800px) { display: none; }
`;

const LogoBox = styled.div`
  display: flex; align-items: center; gap: 12px;
  cursor: pointer; margin-bottom: 50px;
  &:hover { transform: scale(1.02); }
  transition: all 0.2s;
`;

const LogoText = styled.h1`
  font-family: 'Outfit', sans-serif; font-size: 1.5rem; font-weight: 800;
  color: #1a1a1a; margin: 0; span { color: #F07B11; }
`;

const NavGroup = styled.div`margin-bottom: 40px; display: flex; flex-direction: column; gap: 10px;`;
const NavLabel = styled.span`font-size: 0.72rem; color: #94a3b8; font-weight: 900; letter-spacing: 1px;`;

const ContextCard = styled.div`
  padding: 15px; border-radius: 16px; 
  background: ${p => p.$active ? '#fff7ed' : '#f1f5f9'};
  border: 1px solid ${p => p.$active ? '#F07B11' : 'transparent'};
  display: flex; gap: 12px;
  .info { display: flex; flex-direction: column; }
  .title { font-size: 0.85rem; font-weight: 800; color: ${p => p.$active ? '#F07B11' : '#1e293b'}; }
  .desc { font-size: 0.75rem; color: #64748b; }
`;

const QuickBtn = styled.button`
  width: 100%; border: none; padding: 12px 15px; border-radius: 12px;
  display: flex; align-items: center; gap: 10px; font-size: 0.85rem;
  font-weight: 600; cursor: pointer; transition: all 0.2s;
  background: ${p => p.$active ? '#F07B11' : 'transparent'};
  color: ${p => p.$active ? 'white' : '#64748b'};
  &:hover:not(:disabled) { background: ${p => p.$active ? '#F07B11' : '#f1f5f9'}; }
  &:disabled { opacity: 0.4; cursor: not-allowed; }
`;

const NewChatBtn = styled.button`
  width: 100%; border: 1px dashed #F07B11; padding: 12px 15px; border-radius: 12px;
  display: flex; align-items: center; justify-content: center; gap: 8px; font-size: 0.85rem;
  font-weight: 800; cursor: pointer; transition: all 0.2s;
  background: #fff7ed; color: #F07B11;
  &:hover { background: #F07B11; color: white; border-style: solid; box-shadow: 0 4px 12px rgba(240,123,17,0.2); }
`;

const HistoryScroll = styled.div`
  flex: 1; overflow-y: auto; padding-right: 5px;
  display: flex; flex-direction: column; gap: 8px;
  &::-webkit-scrollbar { width: 4px; }
  &::-webkit-scrollbar-track { background: transparent; }
  &::-webkit-scrollbar-thumb { background: #e2e8f0; border-radius: 10px; }
`;

const HistoryItem = styled.div`
  padding: 12px; border-radius: 12px; cursor: pointer; transition: all 0.2s;
  display: flex; align-items: flex-start; gap: 10px;
  background: ${p => p.$active ? '#f8fafc' : 'transparent'};
  border: 1px solid ${p => p.$active ? '#e2e8f0' : 'transparent'};
  &:hover { background: #f8fafc; border-color: #e2e8f0; }
  .h-info { display: flex; flex-direction: column; flex: 1; overflow: hidden; }
  .h-label { font-size: 0.8rem; font-weight: 700; color: #334155; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .h-time { font-size: 0.65rem; color: #94a3b8; margin-top: 2px; }
`;

const FooterBack = styled.button`
  margin-top: 20px; padding: 15px; border: 1px solid #e2e8f0; border-radius: 12px;
  background: white; color: #64748b; font-weight: 600; font-size: 0.85rem;
  display: flex; align-items: center; gap: 10px; cursor: pointer;
  &:hover { border-color: #F07B11; color: #F07B11; }
`;

const MainStage = styled.div`
  flex: 1; display: flex; flex-direction: column; background: white;
  position: relative;
`;

const ChatHeader = styled.div`
  padding: 25px 50px; border-bottom: 1px solid #f1f5f9;
  display: flex; align-items: center; justify-content: space-between;
`;

const HTitle = styled.h2`font-family: 'Outfit'; font-weight: 900; font-size: 1.4rem; color: #1e293b;`;
const HBadge = styled.span`padding: 6px 15px; background: #fff7ed; color: #F07B11; border-radius: 50px; font-weight: 800; font-size: 0.75rem;`;

const ChatContentContainer = styled.div`
  flex: 1; overflow-y: auto; padding: 40px 10%;
  display: flex; flex-direction: column; gap: 25px;
`;

const MessageRow = styled.div`display: flex; justify-content: ${p => p.$isUser ? 'flex-end' : 'flex-start'};`;
const MsgBubble = styled.div`
  max-width: 80%; padding: 25px; border-radius: 24px;
  font-size: 1rem; line-height: 1.7;
  ${p => p.$isUser ? css`background: #1e293b; color: white; border-bottom-right-radius: 4px;` 
  : css`background: #f8fafc; color: #334155; border: 1px solid #e2e8f0; border-bottom-left-radius: 4px;`}
`;

const EvidenceSection = styled.div`margin-top: 25px; padding-top: 20px; border-top: 2px dashed #e2e8f0;`;
const GalleryTitle = styled.div`font-size: 0.72rem; color: #F07B11; font-weight: 900; text-transform: uppercase; margin-bottom: 15px; letter-spacing: 1px;`;
const GalleryGrid = styled.div`display: grid; grid-template-columns: repeat(auto-fill, minmax(160px, 1fr)); gap: 12px;`;

const EvidenceCard = styled.div`
  border-radius: 16px; border: 1px solid #e2e8f0; background: white; overflow: hidden; cursor: pointer; transition: all 0.2s;
  &:hover { border-color: #F07B11; transform: translateY(-3px); }
`;
const ImgThumb = styled.img`width: 100%; height: 100px; object-fit: cover;`;
const FileIconBox = styled.div`width: 100%; height: 100px; background: #fff7ed; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 8px;`;
const CardLabel = styled.div`padding: 10px; display: flex; flex-direction: column; .n { font-size: 0.7rem; font-weight: 800; } .t { font-size: 0.6rem; color: #94a3b8; text-transform: uppercase; }`;

const SourceList = styled.div`margin-top: 25px;`;
const SourceHeader = styled.div`font-size: 0.72rem; color: #64748b; font-weight: 900; margin-bottom: 12px;`;
const SourceGrid = styled.div`display: grid; grid-template-columns: 1fr 1fr; gap: 10px;`;
const SourceCard = styled.div`
  padding: 12px; background: white; border: 1px solid #e2e8f0; border-radius: 12px;
  display: flex; align-items: center; gap: 10px; cursor: pointer;
  .stext { font-size: 0.75rem; flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  &:hover { border-color: #F07B11; background: #fff9f4; }
`;

const PromptArea = styled.div`padding: 40px 10%; border-top: 1px solid #f1f5f9;`;
const PromptWrapper = styled.div`
  display: flex; gap: 15px; background: #f8fafc; padding: 12px 12px 12px 30px; 
  border-radius: 20px; border: 1px solid #e2e8f0;
  &:focus-within { border-color: #F07B11; background: white; box-shadow: 0 10px 30px rgba(240,123,17,0.1); }
`;
const StyledInput = styled.input`flex: 1; border: none; background: transparent; font-size: 1rem; outline: none;`;
const SendIconButton = styled.button`
  width: 55px; height: 55px; background: #F07B11; color: white; border: none; border-radius: 14px;
  display: flex; align-items: center; justify-content: center; cursor: pointer;
  &:disabled { opacity: 0.4; }
`;

const LoadingBubble = styled.div`display: flex; gap: 6px; padding: 10px;`;
const b = keyframes`0%, 100% { transform: translateY(0); } 50% { transform: translateY(-5px); }`;
const Dot = styled.div`width: 7px; height: 7px; background: #cbd5e1; border-radius: 50%; animation: ${b} 0.6s infinite alternate; &:nth-child(2) { animation-delay: 0.2s; } &:nth-child(3) { animation-delay: 0.4s; }`;

export default AIChatPage;
