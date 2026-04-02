import React, { useState, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import styled, { keyframes } from 'styled-components';
import { signInWithPopup, GoogleAuthProvider } from 'firebase/auth';
import { auth, googleProvider } from '../firebase';
import { AuthContext } from '../App';

const roles = [
  {
    id: 'citizen',
    icon: '🏛️',
    title: 'Citizen',
    desc: 'Report community issues, submit survey responses, and track their resolution in real-time.',
    color: '#F07B11',
    gradient: 'linear-gradient(135deg, rgba(240,123,17,0.08) 0%, rgba(240,123,17,0.02) 100%)',
  },
  {
    id: 'volunteer',
    icon: '🤝',
    title: 'Volunteer',
    desc: 'Respond to community issues on the ground, conduct field surveys, and submit reports.',
    color: '#3DA9FC',
    gradient: 'linear-gradient(135deg, rgba(61,169,252,0.08) 0%, rgba(61,169,252,0.02) 100%)',
  },
  {
    id: 'supervisor',
    icon: '📋',
    title: 'Supervisor',
    desc: 'Oversee all operations, review AI-generated reports, and manage volunteer assignments.',
    color: '#7C3AED',
    gradient: 'linear-gradient(135deg, rgba(124,58,237,0.08) 0%, rgba(124,58,237,0.02) 100%)',
  }
];

const AuthPage = () => {
  const [selectedRole, setSelectedRole] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const { setUser, setUserRole, setAccessToken } = useContext(AuthContext);

  const handleGoogleSignIn = async () => {
    if (!selectedRole) {
      setError('Please select a role first');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const result = await signInWithPopup(auth, googleProvider);
      
      // Get the OAuth access token using the proper Firebase SDK method
      const credential = GoogleAuthProvider.credentialFromResult(result);
      const token = credential?.accessToken || null;
      
      const userData = {
        uid: result.user.uid,
        displayName: result.user.displayName,
        email: result.user.email,
        photoURL: result.user.photoURL,
        role: selectedRole,
      };

      setUser(userData);
      setUserRole(selectedRole);
      setAccessToken(token);

      // Register user with backend
      try {
        const idToken = await result.user.getIdToken();
        await fetch('http://localhost:8001/auth/google', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            id_token: idToken,
            role: selectedRole,
            access_token: token,
          }),
        });
      } catch (backendErr) {
        console.warn('Backend registration skipped (server may be offline):', backendErr);
      }

      navigate('/dashboard');
    } catch (err) {
      console.error('Sign-in error:', err);
      if (err.code === 'auth/popup-closed-by-user') {
        setError('Sign-in popup was closed. Please try again.');
      } else if (err.code === 'auth/unauthorized-domain') {
        setError('This domain is not authorized. Add localhost to Firebase Auth authorized domains.');
      } else {
        setError(`Sign-in failed: ${err.code || err.message}`);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthWrapper>
      <AuthBackground />
      <AuthGridPattern />
      
      <AuthContainer>
        <AuthHeader>
          <AuthTitle>Join <span>SevaSetu</span></AuthTitle>
          <AuthSubtitle>Select your role to get started</AuthSubtitle>
        </AuthHeader>

        <RolesGrid>
          {roles.map((role) => (
            <RoleCard
              key={role.id}
              $selected={selectedRole === role.id}
              $accentColor={role.color}
              $gradient={role.gradient}
              onClick={() => { setSelectedRole(role.id); setError(''); }}
            >
              <RoleCheckmark $visible={selectedRole === role.id} $color={role.color}>✓</RoleCheckmark>
              <RoleIcon>{role.icon}</RoleIcon>
              <RoleTitle $color={role.color}>{role.title}</RoleTitle>
              <RoleDesc>{role.desc}</RoleDesc>
            </RoleCard>
          ))}
        </RolesGrid>

        {error && <ErrorMessage>{error}</ErrorMessage>}

        <GoogleButton
          onClick={handleGoogleSignIn}
          disabled={loading || !selectedRole}
          $active={!!selectedRole}
        >
          {loading ? (
            <ButtonSpinner />
          ) : (
            <>
              <GoogleIcon viewBox="0 0 24 24">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
              </GoogleIcon>
              Sign in with Google
            </>
          )}
        </GoogleButton>

        <AuthFooter>
          {selectedRole && (
            <SelectedRoleBadge $color={roles.find(r => r.id === selectedRole)?.color}>
              Signing in as <strong>{selectedRole.charAt(0).toUpperCase() + selectedRole.slice(1)}</strong>
            </SelectedRoleBadge>
          )}
        </AuthFooter>
      </AuthContainer>
    </AuthWrapper>
  );
};

// ── Animations ────────────────────────────────────────
const fadeIn = keyframes`
  from { opacity: 0; transform: translateY(20px); }
  to { opacity: 1; transform: translateY(0); }
`;

const spin = keyframes`
  to { transform: rotate(360deg); }
`;

const pulseGlow = keyframes`
  0%, 100% { box-shadow: 0 0 0 0 rgba(240, 123, 17, 0); }
  50% { box-shadow: 0 0 0 8px rgba(240, 123, 17, 0.1); }
`;

// ── Styled Components ─────────────────────────────────
const AuthWrapper = styled.div`
  flex: 1;
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 40px 20px;
  position: relative;
  min-height: calc(100vh - 70px);
`;

const AuthBackground = styled.div`
  position: absolute;
  top: 0; left: 0; width: 100%; height: 100%;
  pointer-events: none;
  background: 
    radial-gradient(circle at 20% 30%, rgba(240, 123, 17, 0.06), transparent 40%),
    radial-gradient(circle at 80% 70%, rgba(124, 58, 237, 0.04), transparent 40%),
    radial-gradient(circle at 50% 50%, rgba(61, 169, 252, 0.03), transparent 50%);
`;

const AuthGridPattern = styled.div`
  position: absolute;
  top: 0; left: 0; right: 0; bottom: 0;
  background-image: 
    linear-gradient(to right, rgba(240, 123, 17, 0.05) 1px, transparent 1px),
    linear-gradient(to bottom, rgba(240, 123, 17, 0.05) 1px, transparent 1px);
  background-size: 40px 40px;
  pointer-events: none;
`;

const AuthContainer = styled.div`
  background: rgba(255, 255, 255, 0.6);
  backdrop-filter: blur(24px);
  -webkit-backdrop-filter: blur(24px);
  border: 1px solid rgba(255, 255, 255, 0.8);
  border-radius: 32px;
  padding: 50px 50px 40px;
  max-width: 800px;
  width: 100%;
  box-shadow: 0 25px 80px rgba(0, 0, 0, 0.06);
  position: relative;
  z-index: 2;
  animation: ${fadeIn} 0.6s ease-out;

  @media (max-width: 600px) {
    padding: 30px 20px;
    border-radius: 24px;
  }
`;

const AuthHeader = styled.div`
  text-align: center;
  margin-bottom: 40px;
`;

const AuthTitle = styled.h1`
  font-family: 'Outfit', sans-serif;
  font-size: 2.8rem;
  font-weight: 900;
  color: #1a1a1a;
  letter-spacing: -1.5px;
  margin-bottom: 8px;
  span {
    background: linear-gradient(135deg, #F07B11 0%, #ff9838 100%);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
  }
`;

const AuthSubtitle = styled.p`
  color: #777;
  font-size: 1.1rem;
  font-weight: 400;
`;

const RolesGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 18px;
  margin-bottom: 36px;

  @media (max-width: 700px) {
    grid-template-columns: 1fr;
    gap: 14px;
  }
`;

const RoleCard = styled.div`
  position: relative;
  padding: 30px 20px 24px;
  border-radius: 20px;
  cursor: pointer;
  text-align: center;
  transition: all 0.35s cubic-bezier(0.25, 0.8, 0.25, 1);
  background: ${p => p.$selected ? p.$gradient : 'rgba(255,255,255,0.5)'};
  border: 2px solid ${p => p.$selected ? p.$accentColor : 'rgba(0,0,0,0.06)'};
  box-shadow: ${p => p.$selected 
    ? `0 8px 30px ${p.$accentColor}20` 
    : '0 2px 8px rgba(0,0,0,0.03)'};
  transform: ${p => p.$selected ? 'translateY(-4px)' : 'translateY(0)'};

  &:hover {
    border-color: ${p => p.$accentColor}80;
    transform: translateY(-4px);
    box-shadow: 0 8px 25px ${p => p.$accentColor}15;
  }
`;

const RoleCheckmark = styled.div`
  position: absolute;
  top: 12px;
  right: 12px;
  width: 26px;
  height: 26px;
  border-radius: 50%;
  background: ${p => p.$color};
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.8rem;
  font-weight: 700;
  opacity: ${p => p.$visible ? 1 : 0};
  transform: scale(${p => p.$visible ? 1 : 0.5});
  transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
`;

const RoleIcon = styled.div`
  font-size: 2.8rem;
  margin-bottom: 12px;
`;

const RoleTitle = styled.h3`
  font-family: 'Outfit', sans-serif;
  font-size: 1.3rem;
  font-weight: 700;
  color: ${p => p.$color};
  margin-bottom: 8px;
`;

const RoleDesc = styled.p`
  font-size: 0.88rem;
  color: #666;
  line-height: 1.5;
`;

const GoogleButton = styled.button`
  width: 100%;
  padding: 16px 24px;
  border: none;
  border-radius: 16px;
  font-size: 1.1rem;
  font-weight: 600;
  font-family: 'Inter', sans-serif;
  cursor: ${p => p.$active ? 'pointer' : 'not-allowed'};
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  transition: all 0.3s;
  background: ${p => p.$active 
    ? 'linear-gradient(135deg, #1a1a1a 0%, #333 100%)' 
    : 'rgba(0,0,0,0.08)'};
  color: ${p => p.$active ? 'white' : '#999'};
  box-shadow: ${p => p.$active ? '0 8px 25px rgba(0,0,0,0.2)' : 'none'};

  &:hover:not(:disabled) {
    transform: translateY(-2px);
    box-shadow: 0 12px 35px rgba(0,0,0,0.25);
  }

  &:disabled {
    cursor: not-allowed;
  }
`;

const GoogleIcon = styled.svg`
  width: 22px;
  height: 22px;
`;

const ButtonSpinner = styled.div`
  width: 22px;
  height: 22px;
  border: 3px solid rgba(255,255,255,0.3);
  border-top-color: white;
  border-radius: 50%;
  animation: ${spin} 0.6s linear infinite;
`;

const ErrorMessage = styled.div`
  background: rgba(239, 68, 68, 0.08);
  border: 1px solid rgba(239, 68, 68, 0.2);
  color: #dc2626;
  padding: 12px 16px;
  border-radius: 12px;
  font-size: 0.9rem;
  text-align: center;
  margin-bottom: 20px;
  animation: ${fadeIn} 0.3s ease-out;
`;

const AuthFooter = styled.div`
  display: flex;
  justify-content: center;
  margin-top: 20px;
`;

const SelectedRoleBadge = styled.div`
  padding: 8px 18px;
  border-radius: 20px;
  font-size: 0.85rem;
  color: ${p => p.$color};
  background: ${p => p.$color}10;
  border: 1px solid ${p => p.$color}30;
  animation: ${pulseGlow} 2s ease-in-out infinite;
`;

export default AuthPage;
