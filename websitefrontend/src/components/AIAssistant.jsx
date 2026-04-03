import React, { useState, useEffect, useRef } from 'react';
import styled, { keyframes, css } from 'styled-components';
import { 
  MessageSquare, X, Send, Sparkles, Database, 
  History, Info, ChevronRight, FileText, ExternalLink, Image as ImageIcon
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const BACKEND_URL = "http://localhost:8001";

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

const AIAssistant = ({ userEmail, activeGroupId, activeGroupLabel, isOpen, onOpen, onClose }) => {
  const [mode, setMode] = useState(activeGroupId ? 'individual' : 'global');
  const [query, setQuery] = useState('');
  const [messages, setMessages] = useState([
    { 
      role: 'ai', 
      content: `Hello! I meed to analyze your context for **${activeGroupLabel || 'the entire history'}**. How can I help?`,
      sources: [],
      attachments: []
    }
  ]);
  const [loading, setLoading] = useState(false);
  const chatEndRef = useRef(null);

  useEffect(() => {
    if (activeGroupId) setMode('individual');
  }, [activeGroupId]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async () => {
    if (!query.trim() || loading) return;
    const userMsg = { role: 'user', content: query };
    setMessages(prev => [...prev, userMsg]);
    setQuery('');
    setLoading(true);

    try {
      const response = await fetch(`${BACKEND_URL}/reports/memory/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: query,
          user_email: userEmail,
          group_id: mode === 'individual' ? activeGroupId : null,
          group_label: mode === 'individual' ? activeGroupLabel : null
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
    <>
      <AnimatePresence>
        {!isOpen && (
          <ToggleButton
            as={motion.button}
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            onClick={onOpen}
          >
            <Sparkles size={24} />
            <span>AI Assistant</span>
          </ToggleButton>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isOpen && (
          <Overlay 
            as={motion.div}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          >
            <ModalContainer
              as={motion.div}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              onClick={(e) => e.stopPropagation()}
            >
              <Header>
                <HLeft>
                  <Sparkles color="#F07B11" size={20} />
                  <HTitle>SevaSetu AI Command Center</HTitle>
                </HLeft>
                <HRight>
                  <CloseBtn onClick={onClose}><X size={24} /></CloseBtn>
                </HRight>
              </Header>

              <ModeToggle>
                <ModeBtn $active={mode === 'global'} onClick={() => setMode('global')}>
                  <History size={16} /> Global Intelligence
                </ModeBtn>
                <ModeBtn $active={mode === 'individual'} disabled={!activeGroupId} onClick={() => setMode('individual')}>
                  <Database size={16} /> {activeGroupId ? `Issue: ${activeGroupLabel}` : 'Focus Mode'}
                </ModeBtn>
              </ModeToggle>

              <ChatWindow>
                {messages.map((msg, idx) => (
                  <MsgRow key={idx} $isUser={msg.role === 'user'}>
                    <MsgContent $isUser={msg.role === 'user'}>
                      {msg.role === 'user' ? (
                        <div style={{ fontWeight: '500' }}>{msg.content}</div>
                      ) : (
                        <MarkdownRenderer text={msg.content} />
                      )}

                      {/* Evidence & Attachments Gallery */}
                      {msg.attachments?.length > 0 && (
                        <EvidenceGallery>
                          <GalleryTitle>Physical Evidence & Documents</GalleryTitle>
                          <GalleryGrid>
                            {msg.attachments.map((att, i) => (
                              <AttachmentCard 
                                key={i} 
                                onClick={() => window.open(att.url, '_blank')}
                                title={`Linked to Report ${att.report_id.substring(0, 8)}`}
                              >
                                {att.mime?.startsWith('image/') ? (
                                  <ImagePreview src={att.url} alt="Evidence" />
                                ) : (
                                  <FileIconWrapper>
                                    <FileText size={24} color="#F07B11" />
                                    <span style={{ fontSize: '0.65rem', fontWeight: '800' }}>DOC</span>
                                  </FileIconWrapper>
                                )}
                                <AttachmentInfo>
                                  <span className="name">{att.name.substring(0, 15)}...</span>
                                  <span className="type">{att.mime?.split('/')[1] || 'pdf'}</span>
                                </AttachmentInfo>
                              </AttachmentCard>
                            ))}
                          </GalleryGrid>
                        </EvidenceGallery>
                      )}

                      {msg.sources?.length > 0 && (
                        <SourceSection>
                          <SourceLabel><Database size={12} /> Sources Found ({msg.sources.length})</SourceLabel>
                          <SourceGrid>
                            {msg.sources.map((src, i) => (
                              <SourceCard key={i} onClick={() => window.open(`/report/${msg.report_ids[i]}`, '_blank')}>
                                <FileText size={12} color="#F07B11" />
                                <SourceText>{src.substring(0, 45)}...</SourceText>
                                <ExternalLink size={12} />
                              </SourceCard>
                            ))}
                          </SourceGrid>
                        </SourceSection>
                      )}
                    </MsgContent>
                  </MsgRow>
                ))}
                {loading && (
                  <MsgRow>
                    <LoadingBubble><Dot /><Dot /><Dot /></LoadingBubble>
                  </MsgRow>
                )}
                <div ref={chatEndRef} />
              </ChatWindow>

              <InputArea>
                <InputWrapper>
                  <ChatInput 
                    placeholder="Ask about your community history..."
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleSend()}
                  />
                  <SendBtn onClick={handleSend} disabled={loading || !query.trim()}>
                    <Send size={20} />
                  </SendBtn>
                </InputWrapper>
              </InputArea>
            </ModalContainer>
          </Overlay>
        )}
      </AnimatePresence>
    </>
  );
};

/* ── Styles ── */

const Overlay = styled.div`
  position: fixed;
  top: 0; left: 0; right: 0; bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  z-index: 9999;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
`;

const ModalContainer = styled.div`
  width: 100%;
  max-width: 900px;
  height: 85vh;
  background: white;
  border-radius: 32px;
  display: flex;
  flex-direction: column;
  box-shadow: 0 50px 100px rgba(0, 0, 0, 0.4);
  overflow: hidden;
  position: relative;
`;

const Header = styled.div`
  padding: 25px 40px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  border-bottom: 1px solid rgba(0,0,0,0.05);
`;

const HLeft = styled.div`display: flex; align-items: center; gap: 15px;`;
const HRight = styled.div`display: flex; align-items: center; gap: 10px;`;
const HTitle = styled.h3`
  font-family: 'Outfit', sans-serif; 
  font-size: 1.3rem; 
  font-weight: 900;
  color: #1a1a1a; 
  margin: 0;
`;

const CloseBtn = styled.button`
  background: rgba(0,0,0,0.04); 
  border: none; 
  color: #666; 
  width: 40px; height: 40px; border-radius: 50%;
  display: flex; align-items: center; justify-content: center;
  cursor: pointer; transition: all 0.2s;
  &:hover { background: #fee2e2; color: #ef4444; }
`;

const ToggleButton = styled.button`
  position: fixed; bottom: 30px; right: 30px;
  background: linear-gradient(135deg, #F07B11, #e06c09);
  color: white; border: none; border-radius: 50px;
  padding: 14px 28px; display: flex; align-items: center; gap: 10px;
  font-weight: 800; font-family: 'Outfit';
  box-shadow: 0 10px 25px rgba(240, 123, 17, 0.3);
  cursor: pointer; z-index: 1000;
  transition: all 0.3s;
  &:hover { transform: translateY(-3px) scale(1.05); }
`;

const ModeToggle = styled.div`
  display: flex; padding: 12px 20px; gap: 10px; background: #f8fafc;
`;

const ModeBtn = styled.button`
  flex: 1; padding: 10px; border: none; border-radius: 12px;
  font-size: 0.8rem; font-weight: 800; cursor: pointer;
  display: flex; align-items: center; justify-content: center; gap: 8px;
  transition: all 0.2s;
  background: ${p => p.$active ? 'white' : 'transparent'};
  color: ${p => p.$active ? '#F07B11' : '#64748b'};
  box-shadow: ${p => p.$active ? '0 4px 12px rgba(0,0,0,0.05)' : 'none'};
  &:disabled { opacity: 0.4; cursor: not-allowed; }
`;

const ChatWindow = styled.div`
  flex: 1; overflow-y: auto; padding: 30px 40px;
  display: flex; flex-direction: column; gap: 20px;
  background: #fff;
`;

const MsgRow = styled.div`
  display: flex; justify-content: ${p => p.$isUser ? 'flex-end' : 'flex-start'};
`;

const MsgContent = styled.div`
  max-width: 85%; padding: 14px 20px; border-radius: 20px;
  font-size: 0.95rem; line-height: 1.6;
  ${p => p.$isUser ? css`
    background: #1e293b; color: white; border-bottom-right-radius: 4px;
  ` : css`
    background: #f8fafc; color: #334155; border-bottom-left-radius: 4px;
    border: 1px solid #e2e8f0;
  `}
`;

const EvidenceGallery = styled.div`
  margin: 15px 0; padding-bottom: 5px;
`;

const GalleryTitle = styled.div`
  font-size: 0.72rem; color: #F07B11; font-weight: 900;
  text-transform: uppercase; margin-bottom: 12px;
  display: flex; align-items: center; gap: 8px; font-family: 'Outfit';
  letter-spacing: 0.5px;
`;

const GalleryGrid = styled.div`
  display: grid; grid-template-columns: repeat(auto-fill, minmax(140px, 1fr)); gap: 10px;
`;

const AttachmentCard = styled.div`
  background: white; border: 1px solid #e2e8f0; border-radius: 12px;
  overflow: hidden; cursor: pointer; transition: all 0.3s;
  display: flex; flex-direction: column;
  &:hover { border-color: #F07B11; transform: translateY(-3px); box-shadow: 0 10px 20px rgba(0,0,0,0.05); }
`;

const ImagePreview = styled.img`
  width: 100%; height: 80px; object-fit: cover; background: #f1f5f9;
`;

const FileIconWrapper = styled.div`
  width: 100%; height: 80px; background: #fff7ed;
  display: flex; flex-direction: column; align-items: center; justify-content: center;
  gap: 5px;
`;

const AttachmentInfo = styled.div`
  padding: 8px 10px; display: flex; flex-direction: column; gap: 2px;
  .name { font-size: 0.7rem; font-weight: 700; color: #1e293b; }
  .type { font-size: 0.6rem; color: #94a3b8; text-transform: uppercase; font-weight: 900; }
`;

const InputArea = styled.div`
  padding: 30px 40px 40px; background: white;
  border-top: 1px solid rgba(0,0,0,0.05);
`;

const InputWrapper = styled.div`
  display: flex; gap: 15px; background: #f8fafc;
  padding: 10px 10px 10px 25px; border-radius: 20px;
  border: 1px solid #e2e8f0; transition: all 0.3s;
  &:focus-within { background: white; border-color: #F07B11; box-shadow: 0 10px 30px rgba(240,123,17,0.1); }
`;

const ChatInput = styled.input`
  flex: 1; border: none; background: transparent; padding: 12px 0;
  font-size: 1rem; outline: none; color: #1e293b;
`;

const SendBtn = styled.button`
  width: 50px; height: 50px;
  background: linear-gradient(135deg, #F07B11, #e06c09);
  color: white; border: none; border-radius: 15px;
  display: flex; align-items: center; justify-content: center;
  cursor: pointer; transition: all 0.3s;
  &:disabled { background: #e2e8f0; cursor: not-allowed; }
  &:hover:not(:disabled) { transform: scale(1.05); }
`;

const SourceSection = styled.div`
  margin-top: 20px; padding-top: 15px; border-top: 1px dashed rgba(0,0,0,0.06);
`;

const SourceLabel = styled.div`
  font-size: 0.72rem; color: #64748b; font-weight: 900;
  text-transform: uppercase; margin-bottom: 12px;
  display: flex; align-items: center; gap: 8px; font-family: 'Outfit';
`;

const SourceGrid = styled.div`
  display: grid; grid-template-columns: 1fr 1fr; gap: 10px;
`;

const SourceCard = styled.div`
  display: flex; align-items: center; gap: 10px; padding: 10px;
  background: white; border: 1px solid #e2e8f0; border-radius: 12px;
  cursor: pointer; transition: all 0.2s;
  &:hover { border-color: #F07B11; background: #fff9f4; }
`;

const SourceText = styled.span`
  font-size: 0.75rem; color: #64748b; flex: 1;
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
`;

const LoadingBubble = styled.div`display: flex; gap: 6px; padding: 12px;`;
const bounce = keyframes`0%, 100% { transform: translateY(0); } 50% { transform: translateY(-5px); }`;
const Dot = styled.div`
  width: 6px; height: 6px; background: #cbd5e1; border-radius: 50%;
  animation: ${bounce} 0.6s infinite alternate;
  &:nth-child(2) { animation-delay: 0.2s; }
  &:nth-child(3) { animation-delay: 0.4s; }
`;

export default AIAssistant;
