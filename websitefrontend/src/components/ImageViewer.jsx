import React, { useEffect, useCallback } from 'react';
import styled, { keyframes } from 'styled-components';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, ZoomIn, ZoomOut, Maximize, 
  RotateCcw, Download, Move
} from 'lucide-react';
import { 
  TransformWrapper, 
  TransformComponent, 
  useControls 
} from 'react-zoom-pan-pinch';

/* ── Custom Controls Component ── */
const Controls = ({ src }) => {
  const { zoomIn, zoomOut, resetTransform } = useControls();

  const handleDownload = (e) => {
    e.stopPropagation();
    const link = document.createElement('a');
    link.href = src;
    link.download = 'sevasetu-evidence.jpg';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <Toolbar
      initial={{ y: 20, opacity: 0, x: '-50%' }}
      animate={{ y: 0, opacity: 1, x: '-50%' }}
      transition={{ delay: 0.2 }}
    >
      <ControlButton $color="#3DA9FC" onClick={(e) => { e.stopPropagation(); zoomIn(0.4, 300); }} title="Zoom In (+)">
        <ZoomIn size={20} />
      </ControlButton>
      <ControlButton $color="#F07B11" onClick={(e) => { e.stopPropagation(); zoomOut(0.4, 300); }} title="Zoom Out (-)">
        <ZoomOut size={20} />
      </ControlButton>
      <Divider />
      <ControlButton $color="#10B981" onClick={(e) => { e.stopPropagation(); resetTransform(); }} title="Reset Zoom">
        <RotateCcw size={20} />
      </ControlButton>
      <ControlButton $color="#7C3AED" onClick={handleDownload} title="Download">
        <Download size={20} />
      </ControlButton>
    </Toolbar>
  );
};

const spin = keyframes`from{transform:rotate(0)}to{transform:rotate(360deg)}`;
const Loader = styled.div`
  width: 40px; height: 40px; border: 3px solid #E2E8F0;
  border-top-color: #F07B11; border-radius: 50%;
  animation: ${spin} 0.8s linear infinite;
  position: absolute; top: 50%; left: 50%; margin: -20px;
`;

/* ── Main Component ── */
const ImageViewer = ({ src, onClose }) => {
  const [loading, setLoading] = React.useState(true);
  
  // Prevent background scrolling
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = 'unset'; };
  }, []);

  if (!src) return null;

  return (
    <AnimatePresence>
      <Overlay
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
      >
        <CloseZone onClick={(e) => e.stopPropagation()}>
          <CloseButton onClick={onClose} title="Close (Esc)">
            <X size={24} />
          </CloseButton>
        </CloseZone>

        <ViewerContainer onClick={(e) => e.stopPropagation()}>
          <TransformWrapper
            initialScale={1}
            centerOnInit={true}
            minScale={0.1}
            maxScale={12}
            limitToBounds={false}
            wheel={{ step: 0.05, smoothStep: 0.005 }} // Granular wheel zoom
            doubleClick={{ mode: 'zoomIn', step: 0.5 }}
            alignmentAnimation={{ size: 20, velocity: 20, duration: 300, easing: 'easeOutBack' }}
            velocityAnimation={{ sensitivity: 1, duration: 400, easing: 'easeOutQuart' }}
            zoomIn={{ step: 0.3 }} // Smoother button steps
            zoomOut={{ step: 0.3 }}
          >
            {({ zoomIn, zoomOut, resetTransform }) => {
              // Add Keyboard Support Inside Wrapper to access context
              // eslint-disable-next-line react-hooks/rules-of-hooks
              useEffect(() => {
                const handleKeyDown = (e) => {
                  if (e.key === 'Escape') onClose();
                  if (e.key === '+' || e.key === '=') zoomIn(0.4, 300);
                  if (e.key === '-' || e.key === '_') zoomOut(0.4, 300);
                };
                window.addEventListener('keydown', handleKeyDown);
                return () => window.removeEventListener('keydown', handleKeyDown);
              }, [zoomIn, zoomOut]);

              return (
                <>
                  {loading && <Loader />}
                  <TransformComponent 
                    wrapperStyle={{ width: '100vw', height: '100vh' }}
                    contentStyle={{ minHeight: '100vh', minWidth: '100vw', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                  >
                    <motion.img
                      src={src}
                      alt="Evidence Preview"
                      onLoad={() => setLoading(false)}
                      initial={{ scale: 0.8, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                      style={{ 
                        maxHeight: '90vh', 
                        maxWidth: '90vw', 
                        objectFit: 'contain',
                        borderRadius: '12px',
                        boxShadow: '0 30px 60px rgba(0,0,0,0.12)',
                        display: loading ? 'none' : 'block',
                        cursor: 'grab'
                      }}
                    />
                  </TransformComponent>
                  <Controls src={src} />
                </>
              );
            }}
          </TransformWrapper>
        </ViewerContainer>

        <Hint
          initial={{ opacity: 0, y: -20, x: '-50%' }}
          animate={{ opacity: 1, y: 0, x: '-50%' }}
          transition={{ delay: 0.5, type: 'spring', damping: 20 }}
        >
          <Move size={14} /> Drag to pan • Pinch / Scroll to zoom • Esc to close
        </Hint>
      </Overlay>
    </AnimatePresence>
  );
};

/* ── Styled Components ── */
const Overlay = styled(motion.div)`
  position: fixed;
  top: 0; left: 0; width: 100vw; height: 100vh;
  background: rgba(255, 255, 255, 0.92);
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
  z-index: 1000;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: zoom-out;
`;

const ViewerContainer = styled.div`
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: default;
`;

// ImgWrapper removed for better library compatibility

const CloseZone = styled.div`
  position: absolute;
  top: 40px;
  right: 40px;
  z-index: 1010;
`;

const CloseButton = styled.button`
  width: 52px;
  height: 52px;
  border-radius: 16px;
  background: white;
  border: 1px solid rgba(0,0,0,0.05);
  color: #EF4444; 
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  box-shadow: 0 8px 25px rgba(0,0,0,0.06);
  transition: all 0.25s cubic-bezier(0.34, 1.56, 0.64, 1);
  &:hover {
    transform: rotate(90deg) scale(1.1);
    background: #FEF2F2;
    border-color: #EF444430;
  }
`;

const Toolbar = styled(motion.div)`
  position: fixed;
  bottom: 40px;
  left: 50%;
  transform: translateX(-50%) !important;
  background: white;
  padding: 10px;
  border-radius: 24px;
  display: flex;
  align-items: center;
  gap: 10px;
  box-shadow: 0 15px 40px rgba(0,0,0,0.08);
  border: 1px solid rgba(0,0,0,0.04);
  z-index: 1010;
`;

const ControlButton = styled.button`
  width: 48px;
  height: 48px;
  border-radius: 16px;
  background: ${p => p.$color}08;
  border: 2px solid ${p => p.$color}20;
  color: ${p => p.$color};
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  
  &:hover {
    background: ${p => p.$color};
    color: white;
    transform: translateY(-3px);
    box-shadow: 0 8px 20px ${p => p.$color}40;
    border-color: transparent;
  }
  
  &:active { transform: translateY(0); }
`;

const Divider = styled.div`
  width: 1px;
  height: 28px;
  background: #E2E8F0;
  margin: 0 4px;
`;

const Hint = styled(motion.div)`
  position: absolute;
  top: 40px;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  align-items: center;
  gap: 8px;
  background: white;
  padding: 10px 20px;
  border-radius: 30px;
  font-size: 0.88rem;
  font-weight: 700;
  color: #475569;
  box-shadow: 0 4px 15px rgba(0,0,0,0.03);
  pointer-events: none;
  border: 1px solid rgba(0,0,0,0.02);
`;

export default ImageViewer;
