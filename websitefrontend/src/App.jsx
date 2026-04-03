import React, { useState, createContext } from 'react';
import { Routes, Route, useNavigate, Navigate } from 'react-router-dom';
import styled, { keyframes } from 'styled-components';
import Loader from './components/Loader';
import Card from './components/Card';
import WhyChooseUs from './components/WhyChooseUs';
import AuthPage from './components/AuthPage';
import Dashboard from './components/Dashboard';
import ReportPage from './components/ReportPage';
import AIChatPage from './components/AIChatPage';

// ── Auth Context ──────────────────────────────────────
export const AuthContext = createContext(null);

// ── Navbar Component ──────────────────────────────────
const Navbar = ({ user, onSignOut }) => {
  const navigate = useNavigate();
  return (
    <NavWrapper>
      <LogoBox onClick={() => navigate('/')}>
        <LogoIcon>🌉</LogoIcon>
        <LogoText>Seva<LogoAccent>Setu</LogoAccent></LogoText>
      </LogoBox>
      <NavRight>
        {user ? (
          <>
            <NavAvatar src={user.photoURL} alt={user.displayName} />
            <NavButton onClick={() => navigate('/dashboard')}>Dashboard</NavButton>
            <NavButtonOutline onClick={onSignOut}>Sign Out</NavButtonOutline>
          </>
        ) : (
          <NavButton onClick={() => navigate('/auth')}>Sign In</NavButton>
        )}
      </NavRight>
    </NavWrapper>
  );
};

// ── Landing Page Component ────────────────────────────
const LandingPage = () => {
  const navigate = useNavigate();

  return (
    <>
      <GlobalBackground />
      <GridPattern />
      <Blob />

      <HeroSection>
        <LeftPanel>
          <Badge>Community Service Platform</Badge>
          <ProjectName>
            Seva<br/>
            <span>Setu</span>
          </ProjectName>
          <OneLiner>
            Bridge the gap between citizens and civic action. Monitor your inbox for survey emails and transform them into AI-powered structured reports — automatically.
          </OneLiner>
          <ActionButton onClick={() => navigate('/auth')}>Get Started</ActionButton>
        </LeftPanel>

        <RightPanel>
          <RightContentBox>
            <Tagline>AI-Powered Surveys</Tagline>
            <LoaderWrapper>
              <Loader />
            </LoaderWrapper>
            <Pedestal />
          </RightContentBox>
        </RightPanel>
      </HeroSection>

      <FeaturesSectionContainer id="features">
        <FeaturesHeading>Our <span>Features</span></FeaturesHeading>
        <FeaturesSubHeading>
          From email inbox to structured civic reports — powered by AI, designed for communities.
        </FeaturesSubHeading>
        <Card />
      </FeaturesSectionContainer>

      <WhyChooseUs />

      <Footer>
        <FooterContent>
          <FooterLogo>🌉 Seva<span>Setu</span></FooterLogo>
          <FooterText>Bridging communities with intelligent civic engagement.</FooterText>
          <FooterCopyright>© 2026 SevaSetu. All rights reserved.</FooterCopyright>
        </FooterContent>
      </Footer>
    </>
  );
};

// ── Protected Route ───────────────────────────────────
const ProtectedRoute = ({ user, children }) => {
  if (!user) return <Navigate to="/auth" replace />;
  return children;
};

// ── App ───────────────────────────────────────────────
function App() {
  const [user, setUser] = useState(() => {
    try {
      const saved = localStorage.getItem('sevasetu_user');
      return saved ? JSON.parse(saved) : null;
    } catch { return null; }
  });
  const [userRole, setUserRole] = useState(() => localStorage.getItem('sevasetu_role') || null);
  const [accessToken, setAccessToken] = useState(() => localStorage.getItem('sevasetu_token') || null);

  // Auto-save to localStorage whenever auth state changes
  React.useEffect(() => {
    if (user && accessToken) {
      localStorage.setItem('sevasetu_user', JSON.stringify(user));
      localStorage.setItem('sevasetu_role', userRole || '');
      localStorage.setItem('sevasetu_token', accessToken);
    }
  }, [user, userRole, accessToken]);

  const handleSignOut = () => {
    setUser(null);
    setUserRole(null);
    setAccessToken(null);
    localStorage.removeItem('sevasetu_user');
    localStorage.removeItem('sevasetu_role');
    localStorage.removeItem('sevasetu_token');
    localStorage.removeItem(`cache_${user?.email}_reports`);
  };

  return (
    <AuthContext.Provider value={{ user, setUser, userRole, setUserRole, accessToken, setAccessToken }}>
      <MainWrapper>
        <Navbar user={user} onSignOut={handleSignOut} />
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/auth" element={
            user ? <Navigate to="/dashboard" replace /> : <AuthPage />
          } />
          <Route path="/dashboard" element={
            <ProtectedRoute user={user}>
              <Dashboard />
            </ProtectedRoute>
          } />
          <Route path="/report/:id" element={<ReportPage />} />
          <Route path="/ai-assistant" element={
            <ProtectedRoute user={user}>
              <AIChatPage />
            </ProtectedRoute>
          } />
        </Routes>
      </MainWrapper>
    </AuthContext.Provider>
  );
}

// ── Styled Components ─────────────────────────────────
const MainWrapper = styled.div`
  display: flex;
  flex-direction: column;
  width: 100%;
  overflow-x: hidden;
  background-color: #F5F5F5;
  position: relative;
  min-height: 100vh;
`;

// ── Navbar Styles ─────────────────────────────────────
const NavWrapper = styled.nav`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 6%;
  position: sticky;
  top: 0;
  z-index: 100;
  background: rgba(245, 245, 245, 0.85);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border-bottom: 1px solid rgba(240, 123, 17, 0.08);
`;

const LogoBox = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
  cursor: pointer;
  transition: transform 0.2s;
  &:hover { transform: scale(1.03); }
`;

const LogoIcon = styled.span`
  font-size: 1.8rem;
`;

const LogoText = styled.span`
  font-family: 'Outfit', sans-serif;
  font-size: 1.6rem;
  font-weight: 800;
  color: #1a1a1a;
  letter-spacing: -1px;
`;

const LogoAccent = styled.span`
  background: linear-gradient(135deg, #F07B11 0%, #ff9838 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
`;

const NavRight = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
`;

const NavButton = styled.button`
  padding: 10px 24px;
  background: linear-gradient(135deg, #F07B11 0%, #e06c09 100%);
  color: white;
  border: none;
  border-radius: 25px;
  font-size: 0.95rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s;
  font-family: 'Inter', sans-serif;
  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 8px 20px rgba(240, 123, 17, 0.35);
  }
`;

const NavButtonOutline = styled.button`
  padding: 9px 22px;
  background: transparent;
  color: #F07B11;
  border: 2px solid rgba(240, 123, 17, 0.3);
  border-radius: 25px;
  font-size: 0.95rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s;
  font-family: 'Inter', sans-serif;
  &:hover {
    background: rgba(240, 123, 17, 0.08);
    border-color: #F07B11;
  }
`;

const NavAvatar = styled.img`
  width: 36px;
  height: 36px;
  border-radius: 50%;
  border: 2px solid rgba(240, 123, 17, 0.3);
  object-fit: cover;
`;

// ── Hero Section ──────────────────────────────────────
const HeroSection = styled.div`
  display: flex;
  min-height: auto;
  padding: 80px 0 40px 0;
  width: 100%;
  color: #333;
  margin: 0;
  font-family: 'Inter', sans-serif;
  position: relative;
  @media (max-width: 960px) {
    flex-direction: column;
    overflow-y: auto;
    padding: 60px 0 20px 0;
  }
`;

const GlobalBackground = styled.div`
  position: absolute;
  top: 0; left: 0; width: 100%; height: 100%;
  pointer-events: none;
  z-index: 0;
  background: 
    radial-gradient(circle at 10% 20%, rgba(240, 123, 17, 0.04), transparent 35%),
    radial-gradient(circle at 90% 40%, rgba(240, 123, 17, 0.08), transparent 45%),
    linear-gradient(135deg, transparent 0%, rgba(240, 123, 17, 0.02) 100%);
`;

const Blob = styled.div`
  position: absolute;
  top: -10%; right: -10%;
  width: 70vw; height: 70vw;
  background: radial-gradient(circle, rgba(240,123,17,0.06) 0%, rgba(240,123,17,0) 70%);
  border-radius: 50%;
  filter: blur(100px);
  z-index: 0;
`;

const GridPattern = styled.div`
  position: absolute;
  top: 0; left: 0; right: 0; bottom: 0;
  background-image: 
    linear-gradient(to right, rgba(240, 123, 17, 0.08) 1px, transparent 1px),
    linear-gradient(to bottom, rgba(240, 123, 17, 0.08) 1px, transparent 1px);
  background-size: 40px 40px;
  z-index: 0;
  pointer-events: none;
`;

const LeftPanel = styled.div`
  flex: 0.4;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: flex-start;
  padding: 0 2% 0 8%;
  z-index: 2;
  @media (max-width: 960px) {
    flex: 1;
    padding: 15% 5% 5% 5%;
    align-items: center;
    text-align: center;
  }
`;

const Badge = styled.div`
  display: inline-flex;
  align-items: center;
  padding: 8px 16px;
  background: rgba(240, 123, 17, 0.08);
  color: #F07B11;
  border-radius: 30px;
  font-weight: 700;
  font-size: 0.85rem;
  letter-spacing: 1.5px;
  text-transform: uppercase;
  margin-bottom: 24px;
  box-shadow: 0 4px 15px rgba(240, 123, 17, 0.05);
  border: 1px solid rgba(240, 123, 17, 0.15);
  backdrop-filter: blur(5px);
`;

const ProjectName = styled.h1`
  font-size: clamp(3.5rem, 5vw, 6rem);
  font-weight: 900;
  color: #1a1a1a;
  margin-bottom: 24px;
  line-height: 1.05;
  letter-spacing: -2px;
  font-family: 'Outfit', sans-serif;
  span {
    background: linear-gradient(135deg, #F07B11 0%, #ff9838 100%);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    display: block;
    padding-bottom: 5px;
  }
`;

const OneLiner = styled.p`
  font-size: clamp(1.1rem, 1.5vw, 1.35rem);
  color: #555;
  max-width: 90%;
  line-height: 1.6;
  font-weight: 400;
  @media (max-width: 960px) { max-width: 100%; }
`;

const ActionButton = styled.button`
  margin-top: 40px;
  padding: 16px 36px;
  background: linear-gradient(135deg, #F07B11 0%, #e06c09 100%);
  color: white;
  border: none;
  border-radius: 30px;
  font-size: 1.1rem;
  font-weight: 600;
  cursor: pointer;
  box-shadow: 0 10px 25px rgba(240, 123, 17, 0.3);
  transition: all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1);
  font-family: 'Inter', sans-serif;
  &:hover {
    transform: translateY(-3px);
    box-shadow: 0 15px 35px rgba(240, 123, 17, 0.4);
  }
`;

const RightPanel = styled.div`
  flex: 0.6;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  position: relative;
  z-index: 2;
  @media (max-width: 960px) { flex: 1; min-height: 70vh; padding: 2rem 0; }
`;

const floatAnim = keyframes`
  0% { transform: translateY(0px); }
  50% { transform: translateY(-8px); }
  100% { transform: translateY(0px); }
`;

const glow = keyframes`
  0% { text-shadow: 0 0 10px rgba(240,123,17,0.3); }
  50% { text-shadow: 0 0 25px rgba(240,123,17,0.6); }
  100% { text-shadow: 0 0 10px rgba(240,123,17,0.3); }
`;

const RightContentBox = styled.div`
  background: rgba(255, 255, 255, 0.3);
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
  border: 1px solid rgba(255, 255, 255, 0.6);
  border-radius: 32px;
  padding: 60px 80px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.04), inset 0 0 0 1px rgba(255, 255, 255, 0.8);
  position: relative;
  animation: ${floatAnim} 6s ease-in-out infinite;
  @media (max-width: 480px) { padding: 40px 30px; }
`;

const Tagline = styled.h2`
  font-size: 1.25rem;
  font-weight: 700;
  color: #F07B11;
  margin-bottom: 20px;
  text-align: center;
  letter-spacing: 3px;
  text-transform: uppercase;
  animation: ${glow} 3s ease-in-out infinite;
  z-index: 10;
  font-family: 'Outfit', sans-serif;
`;

const Pedestal = styled.div`
  position: absolute;
  bottom: 40px;
  width: 250px;
  height: 40px;
  background: radial-gradient(ellipse at center, rgba(240,123,17,0.15) 0%, rgba(245,245,245,0) 70%);
  border-radius: 50%;
  filter: blur(8px);
  z-index: 1;
`;

const LoaderWrapper = styled.div`
  position: relative;
  z-index: 2;
  margin-top: 10px;
`;

const FeaturesSectionContainer = styled.div`
  width: 100%;
  padding: 40px 0 20px 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  background-color: transparent;
  position: relative;
  z-index: 5;
`;

const FeaturesHeading = styled.h2`
  font-size: clamp(2.5rem, 4vw, 4rem);
  font-weight: 800;
  color: #1a1a1a;
  margin-bottom: 10px;
  text-align: center;
  letter-spacing: -1px;
  z-index: 10;
  font-family: 'Outfit', sans-serif;
  span { color: #F07B11; }
`;

const FeaturesSubHeading = styled.p`
  color: #555;
  font-size: 1.15rem;
  max-width: 600px;
  text-align: center;
  margin-bottom: 15px;
  line-height: 1.6;
  z-index: 10;
`;

// ── Footer ────────────────────────────────────────────
const Footer = styled.footer`
  width: 100%;
  padding: 60px 0 40px 0;
  background: #1a1a1a;
  position: relative;
  z-index: 5;
`;

const FooterContent = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
`;

const FooterLogo = styled.div`
  font-family: 'Outfit', sans-serif;
  font-size: 1.8rem;
  font-weight: 800;
  color: white;
  span { color: #F07B11; }
`;

const FooterText = styled.p`
  color: rgba(255,255,255,0.5);
  font-size: 1rem;
  text-align: center;
`;

const FooterCopyright = styled.p`
  color: rgba(255,255,255,0.3);
  font-size: 0.85rem;
  margin-top: 10px;
`;

export default App;
