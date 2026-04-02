import React, { useEffect } from 'react';
import styled from 'styled-components';
import { motion, AnimatePresence } from 'framer-motion';
import { X, FileText, Download, ExternalLink } from 'lucide-react';

/* Version 2.1 (Pure Native Engine + Public Access Fix) */
console.log("[Viewer] Initializing Version 2.1...");

/* ── Styled Components (Defined FIRST to avoid ReferenceErrors) ── */

const Overlay = styled(motion.div)`
  position: fixed;
  inset: 0;
  background: rgba(15, 23, 42, 0.85);
  backdrop-filter: blur(8px);
  z-index: 2000;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
`;

const Container = styled(motion.div)`
  width: 100%;
  max-width: 1200px;
  height: 90vh;
  background: white;
  border-radius: 20px;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5);
`;

const Header = styled.div`
  padding: 16px 24px;
  background: white;
  border-bottom: 1px solid #E2E8F0;
  display: flex;
  align-items: center;
  justify-content: space-between;
  z-index: 10;
`;

const TitleBlock = styled.div`
  display: flex;
  align-items: center;
  gap: 16px;
`;

const FileIconWrapper = styled.div`
  width: 44px;
  height: 44px;
  background: #F0F9FF;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
`;

const FileInfo = styled.div`
  display: flex;
  flex-direction: column;
`;

const FileName = styled.h3`
  margin: 0;
  font-size: 1.1rem;
  font-weight: 800;
  color: #0F172A;
  font-family: 'Outfit', sans-serif;
`;

const FileMeta = styled.span`
  font-size: 0.8rem;
  font-weight: 600;
  color: #64748B;
  text-transform: uppercase;
  letter-spacing: 0.025em;
`;

const Actions = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
`;

const DownloadLink = styled.a`
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 16px;
  background: #3B82F6;
  color: white;
  text-decoration: none;
  font-size: 0.85rem;
  font-weight: 700;
  border-radius: 10px;
  transition: all 0.2s;
  
  &:hover { 
    background: #2563EB;
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(37, 99, 235, 0.2);
  }

  @media (max-width: 640px) {
    span { display: none; }
    padding: 8px;
  }
`;

const ActionButton = styled.a`
  width: 42px;
  height: 42px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #64748B;
  background: #F1F5F9;
  border-radius: 12px;
  transition: all 0.2s;
  &:hover { background: #E2E8F0; color: #0F172A; }
`;

const CloseButton = styled.button`
  width: 42px;
  height: 42px;
  background: #F1F5F9;
  border: none;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  color: #64748B;
  transition: all 0.2s;
  &:hover { background: #FEE2E2; color: #EF4444; transform: rotate(90deg); }
`;

const ViewerBody = styled.div`
  flex: 1;
  background: #F8FAFC;
  position: relative;
  display: flex;
  flex-direction: column;
`;

const Iframe = styled.iframe`
  width: 100%;
  height: 100%;
  border: none;
`;

const PDFEmbed = styled.embed`
  width: 100%;
  height: 100%;
`;

const VideoPlayer = styled.video`
  width: 100%;
  max-height: 100%;
  background: black;
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.3);
`;

const FallbackContainer = styled.div`
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 20px;
  color: #64748B;
  padding: 40px;
  text-align: center;
  
  p { font-weight: 600; margin: 0; }
`;

const BigButton = styled.a`
  padding: 12px 24px;
  background: #0F172A;
  color: white;
  text-decoration: none;
  font-weight: 700;
  border-radius: 12px;
  transition: all 0.2s;
  &:hover { transform: scale(1.05); background: #1E293B; }
`;

const Footer = styled.div`
  padding: 12px 24px;
  background: white;
  border-top: 1px solid #E2E8F0;
  display: flex;
  justify-content: center;
`;

const Hint = styled.div`
  font-size: 0.85rem;
  font-weight: 600;
  color: #94A3B8;
  letter-spacing: 0.01em;
`;


/* ── Main Component ── */

const DocumentViewer = ({ src, filename, onClose }) => {
  if (!src) return null;

  const isWordDoc = filename?.toLowerCase().endsWith('.doc') || filename?.toLowerCase().endsWith('.docx');
  const isPdf = filename?.toLowerCase().endsWith('.pdf');
  const isVideo = filename?.toLowerCase().endsWith('.mp4') || filename?.toLowerCase().endsWith('.mov') || filename?.toLowerCase().endsWith('.webm');
  
  const isRawCloudinary = src?.includes('/raw/upload/');
  
  // Choose the best viewer strategy
  // 1. Word docs ALWAYS use Google Viewer
  // 2. Cloudinary 'raw' files MUST use Google Viewer to prevent forced download
  // 3. Regular PDFs use native <embed> (fastest)
  const useGoogleViewer = isWordDoc || isRawCloudinary;
  const viewerUrl = useGoogleViewer 
    ? `https://docs.google.com/viewer?url=${encodeURIComponent(src)}&embedded=true`
    : src;

  return (
    <AnimatePresence>
      <Overlay
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
      >
        <Container
          initial={{ scale: 0.9, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.9, opacity: 0, y: 20 }}
          onClick={(e) => e.stopPropagation()}
        >
          <Header>
            <TitleBlock>
              <FileIconWrapper>
                <FileText size={20} color="#3DA9FC" />
              </FileIconWrapper>
              <FileInfo>
                <FileName>{filename || 'Document Preview'}</FileName>
                <FileMeta>
                  {isWordDoc ? 'Microsoft Word Document' : isPdf ? 'PDF Document' : isVideo ? 'Video Evidence' : 'File'}
                </FileMeta>
              </FileInfo>
            </TitleBlock>

            <Actions>
              <DownloadLink 
                href={src} 
                download={filename}
                title="Download Original"
              >
                <Download size={20} />
                <span>Save</span>
              </DownloadLink>
              <ActionButton 
                href={src} 
                target="_blank" 
                rel="noopener noreferrer"
                title="Open in Full Page"
              >
                <ExternalLink size={20} />
              </ActionButton>
              <CloseButton onClick={onClose} title="Close Viewer">
                <X size={24} />
              </CloseButton>
            </Actions>
          </Header>

          <ViewerBody>
            {isPdf && !useGoogleViewer ? (
              <PDFEmbed 
                src={`${src}#toolbar=1&navpanes=1&scrollbar=1`} 
                type="application/pdf"
              />
            ) : isVideo ? (
              <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px', background: '#0F172A' }}>
                <VideoPlayer 
                  src={src} 
                  controls 
                  autoPlay 
                  playsInline
                />
              </div>
            ) : (
              <Iframe 
                src={viewerUrl} 
                title="Document Viewer"
                frameBorder="0"
                allowFullScreen
              />
            )}
            
            {/* If the viewer fails, this hint appears in the footer anyway */}
          </ViewerBody>

          <Footer>
            <Hint>
              {isPdf && !useGoogleViewer ? 'Use the built-in controls to zoom, print, or download' : 'Google Docs Viewer Preview'}
            </Hint>
          </Footer>
        </Container>
      </Overlay>
    </AnimatePresence>
  );
};

export default DocumentViewer;
