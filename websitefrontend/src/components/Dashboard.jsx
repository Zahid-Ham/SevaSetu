import React, { useState, useContext, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import styled, { keyframes, css } from 'styled-components';
import { AuthContext } from '../App';
import { 
  BarChart2, FileText, Sparkles, Inbox, MapPin, 
  AlertTriangle, Mail, Calendar, Settings, FileSearch
} from 'lucide-react';

const BACKEND_URL = 'http://localhost:8001';

const MarkdownText = ({ text }) => {
  if (!text) return 'N/A';
  
  // Format line by replacing **text** with <strong>text</strong>
  const formatText = (str) => {
    const parts = str.split(/(\*\*.*?\*\*)/g);
    return parts.map((part, i) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        return <strong key={i} style={{ color: '#1a1a1a' }}>{part.slice(2, -2)}</strong>;
      }
      return <span key={i}>{part}</span>;
    });
  };

  const lines = text.split('\n').filter(l => l.trim() !== '');
  let elements = [];
  let inList = false;
  let listItems = [];

  lines.forEach((line, index) => {
    const trimmed = line.trim();
    const isBullet = trimmed.startsWith('* ') || trimmed.startsWith('- ') || /^\d+\.\s/.test(trimmed);
    
    // Strip bullet symbol if present to just format the text
    let content = trimmed;
    if (trimmed.startsWith('* ') || trimmed.startsWith('- ')) content = trimmed.substring(2);
    else if (/^\d+\.\s/.test(trimmed)) content = trimmed.replace(/^\d+\.\s/, '');

    if (isBullet) {
      if (!inList) inList = true;
      listItems.push(<li key={`li-${index}`} style={{ marginBottom: '8px', lineHeight: '1.6' }}>{formatText(content)}</li>);
    } else {
      if (inList) {
        elements.push(<ul key={`ul-${index}`} style={{ paddingLeft: '24px', margin: '12px 0' }}>{[...listItems]}</ul>);
        listItems = [];
        inList = false;
      }
      
      // Filter out redundant headers like "**Timeline:**" if we already show the Section header
      if (!/^\*\*[a-zA-Z\s]+:\*\*$/.test(trimmed)) {
        elements.push(<p key={`p-${index}`} style={{ marginBottom: '12px', lineHeight: '1.6' }}>{formatText(content)}</p>);
      }
    }
  });

  if (inList && listItems.length > 0) {
    elements.push(<ul key="ul-end" style={{ paddingLeft: '24px', margin: '12px 0' }}>{listItems}</ul>);
  }

  return <div>{elements}</div>;
};

const Dashboard = () => {
  const { user, userRole, accessToken, setUser, setUserRole, setAccessToken } = useContext(AuthContext);
  const navigate = useNavigate();

  const [surveyGroups, setSurveyGroups] = useState([]);
  const [fieldGroups, setFieldGroups] = useState([]);
  const [scanning, setScanning] = useState(false);
  const [totalCount, setTotalCount] = useState(0);
  const [surveyCount, setSurveyCount] = useState(0);
  const [fieldCount, setFieldCount] = useState(0);
  const [allEmailsCount, setAllEmailsCount] = useState(0);
  const [lastCheckTime, setLastCheckTime] = useState(() => {
    const saved = localStorage.getItem(`cache_${user?.email}_last_scan_ts`);
    return saved ? parseInt(saved) : null;
  });
  const [nextCheckIn, setNextCheckIn] = useState(60);

  const [report, setReport] = useState(null);
  const [reportSource, setReportSource] = useState('');
  const [generatingReport, setGeneratingReport] = useState(false);

  const [reports, setReports] = useState([]);
  const [activeTab, setActiveTab] = useState('emails');
  const [activeCategory, setActiveCategory] = useState('survey');
  const [error, setError] = useState('');

  // Monitoring (Loaded from localStorage)
  const [isMonitoring, setIsMonitoring] = useState(() => {
    return localStorage.getItem(`monitor_${user?.email}`) === 'true';
  });
  const [lastChecked, setLastChecked] = useState(null);
  const [toast, setToast] = useState(null);

  // Settings
  const [allowedSenders, setAllowedSenders] = useState([]);
  const [newSender, setNewSender] = useState('');
  const [settingsLoading, setSettingsLoading] = useState(false);
  const [settingsSaved, setSettingsSaved] = useState(false);

  useEffect(() => { 
    if (accessToken && user?.email) {
      // 1. Load from cache instantly
      try {
        const cachedReports = localStorage.getItem(`cache_${user.email}_reports`);
        if (cachedReports) setReports(JSON.parse(cachedReports));

        const cachedSurvey = localStorage.getItem(`cache_${user.email}_surveyGroups`);
        if (cachedSurvey) setSurveyGroups(JSON.parse(cachedSurvey));

        const cachedField = localStorage.getItem(`cache_${user.email}_fieldGroups`);
        if (cachedField) setFieldGroups(JSON.parse(cachedField));

        const countsStr = localStorage.getItem(`cache_${user.email}_counts`);
        if (countsStr) {
          const counts = JSON.parse(countsStr);
          setTotalCount(counts.totalCount || 0);
          setSurveyCount(counts.surveyCount || 0);
          setFieldCount(counts.fieldCount || 0);
          setAllEmailsCount(counts.allEmailsCount || 0);
        }
      } catch (e) { console.warn("Cache load error", e); }

      // 2. Refresh data silently
      fetchReports(); 
      fetchSettings(); 
      scanEmails(true); // Initial silent scan to refresh data
    }
  }, [accessToken, user?.email]);

  // Save monitoring state
  useEffect(() => {
    if (user?.email) {
      localStorage.setItem(`monitor_${user.email}`, isMonitoring);
    }
  }, [isMonitoring, user?.email]);

  // Monitoring loop (Option A: Client-side polling)
  useEffect(() => {
    let interval;
    let countdown;
    
    if (isMonitoring && accessToken && user?.email) {
      // Run immediately when started/resumed
      scanEmails(true); 
      setNextCheckIn(60);
      
      interval = setInterval(() => {
        scanEmails(true);
        setNextCheckIn(60);
      }, 60000); // 60 seconds
      
      countdown = setInterval(() => {
        setNextCheckIn(prev => (prev > 0 ? prev - 1 : 60));
      }, 1000);
    }
    return () => {
      clearInterval(interval);
      clearInterval(countdown);
    };
  }, [isMonitoring, accessToken, user?.email]);

  const showToast = (message, type = 'info') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 5000);
  };

  const fetchSettings = async () => {
    if (!user?.email) return;
    try {
      const res = await fetch(`${BACKEND_URL}/emails/settings?user_email=${user?.email}`);
      if (res.ok) { const d = await res.json(); setAllowedSenders(d.settings?.allowed_senders || []); }
    } catch (e) { console.warn('Settings fetch failed:', e); }
  };

  const saveSettings = async () => {
    if (!user?.email) return;
    setSettingsLoading(true);
    try {
      const res = await fetch(`${BACKEND_URL}/emails/settings`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_email: user?.email, allowed_senders: allowedSenders }),
      });
      if (res.ok) { setSettingsSaved(true); setTimeout(() => setSettingsSaved(false), 3000); }
    } catch (e) { console.error(e); }
    finally { setSettingsLoading(false); }
  };

  const addSender = () => {
    const email = newSender.trim().toLowerCase();
    if (email && email.includes('@') && !allowedSenders.includes(email)) {
      setAllowedSenders([...allowedSenders, email]); setNewSender('');
    }
  };

  const removeSender = (email) => setAllowedSenders(allowedSenders.filter(s => s !== email));

  const fetchReports = async () => {
    if (!user?.email) return;
    try {
      const res = await fetch(`${BACKEND_URL}/reports?user_email=${user?.email}`, {
        headers: { 'Authorization': `Bearer ${accessToken}` }
      });
      if (res.ok) { 
        const d = await res.json(); 
        setReports(d.reports || []); 
        localStorage.setItem(`cache_${user.email}_reports`, JSON.stringify(d.reports || []));
      }
    } catch (e) { console.warn(e); }
  };

  const scanEmails = async (silent = false) => {
    if (!user?.email) return;
    if (!silent) setScanning(true);
    setError('');
    try {
      const url = new URL(`${BACKEND_URL}/emails/scan`);
      url.searchParams.append('user_email', user?.email);
      if (lastCheckTime) {
        // Pass Unix timestamp in seconds
        url.searchParams.append('last_scan_time', Math.floor(lastCheckTime / 1000));
      }

      const res = await fetch(url.toString(), {
        headers: { 'Authorization': `Bearer ${accessToken}` }
      });
      
      if (res.status === 401) {
        if (!silent) alert('Your session has expired. Please sign in again.');
        handleSignOut();
        return;
      }
      if (!res.ok) throw new Error('Scan failed');
      
      const data = await res.json();
      
      // Calculate total number of emails across all groups
      const totalEmailsInScan = [
        ...(data.survey_reports || []), 
        ...(data.field_reports || [])
      ].reduce((acc, g) => acc + (g.email_count || 0), 0);
      
      // If new emails found during silent scan, notify user (Suppress on initial run)
      if (silent && lastChecked && totalEmailsInScan > allEmailsCount) {
        const diff = totalEmailsInScan - allEmailsCount;
        showToast(`🆕 ${diff} new email(s) found and updated!`, 'success');
      }

      setSurveyGroups(data.survey_reports || []);
      setFieldGroups(data.field_reports || []);
      setTotalCount(data.total_count || 0);
      setSurveyCount(data.survey_count || 0);
      setFieldCount(data.field_count || 0);
      setAllEmailsCount(totalEmailsInScan);
      
      if (user?.email) {
        localStorage.setItem(`cache_${user.email}_surveyGroups`, JSON.stringify(data.survey_reports || []));
        localStorage.setItem(`cache_${user.email}_fieldGroups`, JSON.stringify(data.field_reports || []));
        localStorage.setItem(`cache_${user.email}_counts`, JSON.stringify({
          totalCount: data.total_count || 0,
          surveyCount: data.survey_count || 0,
          fieldCount: data.field_count || 0,
          allEmailsCount: totalEmailsInScan
        }));
      }
      
      setLastChecked(new Date().toLocaleTimeString());
      const now = Date.now();
      setLastCheckTime(now);
      if (user?.email) {
        localStorage.setItem(`cache_${user.email}_last_scan_ts`, now.toString());
      }

      if (data.total_count === 0 && !silent) setError('No matching emails found in the past 7 days.');
    } catch (e) {
      if (!silent) setError('Failed to scan emails. Check backend and Gmail API.'); 
      console.error(e);
    } finally { 
      if (!silent) setScanning(false); 
    }
  };

  const generateSingleReport = async (email) => {
    // Open a blank tab immediately and write a loading UI
    const newWindow = window.open('', '_blank');
    if (newWindow) {
      newWindow.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>Generating SevaSetu Report</title>
          <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600&family=Outfit:wght@700;900&display=swap" rel="stylesheet">
          <style>
            body { 
              margin: 0; padding: 0; 
              background-color: #F5F5F5; 
              display: flex; align-items: center; justify-content: center; 
              height: 100vh; overflow: hidden; 
              font-family: 'Inter', sans-serif;
            }
            .card {
              background: white; 
              padding: 60px 80px; 
              border-radius: 32px; 
              box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.05);
              text-align: center;
              max-width: 500px;
              width: 90%;
              border: 1px solid rgba(0,0,0,0.02);
              position: relative;
            }
            .logo {
              font-family: 'Outfit', sans-serif;
              font-size: 1.5rem;
              font-weight: 800;
              margin-bottom: 40px;
              color: #1a1a1a;
            }
            .logo span { color: #F07B11; }
            
            .loader-container {
              position: relative;
              width: 100px;
              height: 100px;
              margin: 0 auto 30px;
            }
            .ring {
              position: absolute;
              width: 100%;
              height: 100%;
              border: 4px solid transparent;
              border-radius: 50%;
              animation: spin var(--d) linear infinite;
            }
            .ring-1 { border-top-color: #F07B11; --d: 1.5s; }
            .ring-2 { border-right-color: #3DA9FC; --d: 1s; scale: 0.8; }
            .ring-3 { border-bottom-color: #10B981; --d: 0.8s; scale: 0.6; }
            
            @keyframes spin { to { transform: rotate(360deg); } }

            h2 { font-family: 'Outfit', sans-serif; color: #1a1a1a; margin: 0 0 10px 0; font-size: 1.8rem; }
            #status-text { color: #666; font-size: 1.05rem; height: 1.5em; transition: all 0.5s; }
            .badge {
              display: inline-block;
              background: rgba(240, 123, 17, 0.08);
              color: #F07B11;
              padding: 4px 12px;
              border-radius: 20px;
              font-weight: 700;
              font-size: 0.75rem;
              letter-spacing: 1px;
              text-transform: uppercase;
              margin-bottom: 15px;
            }
          </style>
        </head>
        <body>
          <div class="card">
            <div class="logo">🌉 Seva<span>Setu</span></div>
            <div class="loader-container">
              <div class="ring ring-1"></div>
              <div class="ring ring-2"></div>
              <div class="ring ring-3"></div>
            </div>
            <div class="badge">AI Engine v1</div>
            <h2>Analyzing Intelligence</h2>
            <p id="status-text">Starting analysis engine...</p>
          </div>

          <script>
            const statuses = [
              "Extracting email evidence...",
              "Uploading attachments to Cloudinary...",
              "Analyzing report context...",
              "Consulting with Gemini AI...",
              "Reviewing severity and urgency scores...",
              "Synthesizing community sentiment...",
              "Finalizing your civic report...",
              "Almost ready, hang tight..."
            ];
            let i = 0;
            const textEl = document.getElementById('status-text');
            setInterval(() => {
              i = (i + 1) % statuses.length;
              textEl.style.opacity = 0;
              setTimeout(() => {
                textEl.innerText = statuses[i];
                textEl.style.opacity = 1;
              }, 500);
            }, 2500);
          </script>
        </body>
        </html>
      `);
    }
    
    setGeneratingReport(true); setError('');
    try {
      const res = await fetch(`${BACKEND_URL}/emails/report`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${accessToken}` },
        body: JSON.stringify({ email_id: email.id, user_email: user?.email }),
      });
      if (!res.ok) throw new Error('Failed');
      const data = await res.json();
      
      // Redirect the new tab to the generated report
      if (newWindow) newWindow.location.href = `${window.location.origin}/report/${data.report.id}`;
      fetchReports();
    } catch (e) { 
      if (newWindow) newWindow.close();
      setError('Failed to generate report.'); 
      console.error(e); 
    }
    finally { setGeneratingReport(false); }
  };

  const generateCollectiveReport = async (group) => {
    // Open a blank tab immediately and write a loading UI
    const newWindow = window.open('', '_blank');
    if (newWindow) {
      newWindow.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>Generating Collective Report</title>
          <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600&family=Outfit:wght@700;900&display=swap" rel="stylesheet">
          <style>
            body { 
              margin: 0; padding: 0; 
              background-color: #F5F5F5; 
              display: flex; align-items: center; justify-content: center; 
              height: 100vh; overflow: hidden; 
              font-family: 'Inter', sans-serif;
            }
            .card {
              background: white; 
              padding: 60px 80px; 
              border-radius: 32px; 
              box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.05);
              text-align: center;
              max-width: 500px;
              width: 90%;
              border: 1px solid rgba(0,0,0,0.02);
              position: relative;
            }
            .logo {
              font-family: 'Outfit', sans-serif;
              font-size: 1.5rem;
              font-weight: 800;
              margin-bottom: 40px;
              color: #1a1a1a;
            }
            .logo span { color: #7C3AED; }
            
            .loader-container {
              position: relative;
              width: 100px;
              height: 100px;
              margin: 0 auto 30px;
            }
            .ring {
              position: absolute;
              width: 100%;
              height: 100%;
              border: 4px solid transparent;
              border-radius: 50%;
              animation: spin var(--d) linear infinite;
            }
            .ring-1 { border-top-color: #7C3AED; --d: 1.5s; }
            .ring-2 { border-right-color: #3DA9FC; --d: 1s; scale: 0.8; }
            .ring-3 { border-bottom-color: #F07B11; --d: 0.8s; scale: 0.6; }
            
            @keyframes spin { to { transform: rotate(360deg); } }

            h2 { font-family: 'Outfit', sans-serif; color: #1a1a1a; margin: 0 0 10px 0; font-size: 1.8rem; }
            #status-text { color: #666; font-size: 1.05rem; height: 1.5em; transition: all 0.5s; }
            .badge {
              display: inline-block;
              background: rgba(124, 58, 237, 0.08);
              color: #7C3AED;
              padding: 4px 12px;
              border-radius: 20px;
              font-weight: 700;
              font-size: 0.75rem;
              letter-spacing: 1px;
              text-transform: uppercase;
              margin-bottom: 15px;
            }
          </style>
        </head>
        <body>
          <div class="card">
            <div class="logo">🌉 Seva<span>Setu</span></div>
            <div class="loader-container">
              <div class="ring ring-1"></div>
              <div class="ring ring-2"></div>
              <div class="ring ring-3"></div>
            </div>
            <div class="badge">Collective AI Engine</div>
            <h2>Collective Intelligence</h2>
            <p id="status-text">Grouping ${group.emails.length} emails...</p>
          </div>

          <script>
            const statuses = [
              "Aggregating data from ${group.emails.length} reports...",
              "Cross-referencing evidence files...",
              "Consulting Collective Gemini Engine...",
              "Building comprehensive civic timeline...",
              "Reviewing population impact across group...",
              "Identifying common governance gaps...",
              "Finalizing your collective insight...",
              "Almost ready, hang tight..."
            ];
            let i = 0;
            const textEl = document.getElementById('status-text');
            setInterval(() => {
              i = (i + 1) % statuses.length;
              textEl.style.opacity = 0;
              setTimeout(() => {
                textEl.innerText = statuses[i];
                textEl.style.opacity = 1;
              }, 500);
            }, 3000);
          </script>
        </body>
        </html>
      `);
    }
    
    const emailIds = group.emails.map(e => e.id);
    setGeneratingReport(true); setError('');
    try {
      const res = await fetch(`${BACKEND_URL}/emails/collective-report`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${accessToken}` },
        body: JSON.stringify({ email_ids: emailIds, user_email: user?.email, group_label: group.label }),
      });
      if (!res.ok) throw new Error('Failed');
      const data = await res.json();
      
      // Redirect the new tab to the generated report
      if (newWindow) newWindow.location.href = `${window.location.origin}/report/${data.report.id}`;
      fetchReports();
    } catch (e) { 
      if (newWindow) newWindow.close();
      setError('Failed to generate collective report.'); 
      console.error(e); 
    }
    finally { setGeneratingReport(false); }
  };

  const handleSignOut = () => { 
    setUser(null); 
    setUserRole(null); 
    setAccessToken(null); 
    localStorage.removeItem('sevasetu_user');
    localStorage.removeItem('sevasetu_role');
    localStorage.removeItem('sevasetu_token');
    localStorage.removeItem(`cache_${user?.email}_reports`);
    localStorage.removeItem(`cache_${user?.email}_surveyGroups`);
    localStorage.removeItem(`cache_${user?.email}_fieldGroups`);
    localStorage.removeItem(`cache_${user?.email}_counts`);
    navigate('/'); 
  };

  const roleConfig = { citizen: { color: '#F07B11', icon: '🏛️' }, volunteer: { color: '#3DA9FC', icon: '🤝' }, supervisor: { color: '#7C3AED', icon: '📋' } };
  const badge = roleConfig[userRole] || roleConfig.citizen;
  const currentGroups = activeCategory === 'survey' ? surveyGroups : fieldGroups;

  return (
    <DashWrapper>
      <DashBg />

      {/* Profile */}
      <ProfileBar>
        <PLeft>
          <Avatar src={user?.photoURL} alt="" />
          <PInfo>
            <PName>{user?.displayName}</PName>
            <PEmail>{user?.email}</PEmail>
          </PInfo>
          <RolePill $c={badge.color}>{badge.icon} {userRole?.charAt(0).toUpperCase() + userRole?.slice(1)}</RolePill>
        </PLeft>
        <SignOutBtn onClick={handleSignOut}>Sign Out</SignOutBtn>
      </ProfileBar>

      {/* Tabs */}
      <TabRow>
        <Tab $on={activeTab === 'emails'} onClick={() => setActiveTab('emails')}>📧 Email Scanner</Tab>
        <Tab $on={activeTab === 'reports'} onClick={() => setActiveTab('reports')}>📊 Reports ({reports.length})</Tab>
        <Tab $on={activeTab === 'settings'} onClick={() => setActiveTab('settings')}>⚙️ Settings</Tab>
        
        <MonitorStrip>
          <MonitorStatus $active={isMonitoring}>
            <PulseDot $active={isMonitoring} />
            {isMonitoring 
              ? `Auto-Check in ${nextCheckIn}s` 
              : 'Auto-Monitor Paused'}
            {lastChecked && isMonitoring && <MutedSub> (Last: {lastChecked})</MutedSub>}
          </MonitorStatus>
          <MonitorBtn onClick={() => setIsMonitoring(!isMonitoring)} $active={isMonitoring}>
            {isMonitoring ? 'Disable Live Mode' : 'Enable Live Mode'}
          </MonitorBtn>
        </MonitorStrip>
      </TabRow>

      {/* Toast Notification */}
      {toast && (
        <Toast $type={toast.type}>
          <Sparkles size={18} />
          {toast.message}
        </Toast>
      )}

      {/* ────── SETTINGS ────── */}
      {activeTab === 'settings' && (
        <Section>
          <Card>
            <CardTitle>📧 Allowed Senders</CardTitle>
            <CardDesc>Only emails from these addresses will be scanned. Leave empty to scan all.</CardDesc>
            <AddRow>
              <Input type="email" placeholder="email@example.com" value={newSender}
                onChange={e => setNewSender(e.target.value)} onKeyDown={e => e.key === 'Enter' && addSender()} />
              <OrangeBtn onClick={addSender}>+ Add</OrangeBtn>
            </AddRow>
            {allowedSenders.length > 0 ? (
              <ChipRow>{allowedSenders.map((s, i) => (
                <Chip key={i}><span>{s}</span><XBtn onClick={() => removeSender(s)}>✕</XBtn></Chip>
              ))}</ChipRow>
            ) : <Muted>No senders — all senders will be scanned</Muted>}
            <GreenBtn onClick={saveSettings} disabled={settingsLoading}>
              {settingsLoading ? 'Saving...' : settingsSaved ? '✓ Saved!' : 'Save Settings'}
            </GreenBtn>

            <Divider />
            <CardTitle>🧠 AI-Powered Detection</CardTitle>
            <CardDesc>
              We've replaced manual keyword matching with intelligent AI filtering. SevaSetu now reads your unread emails and automatically ignores spam, newsletters, and personal emails, isolating only valid NGO/Community reports based on meaning, not just words.
            </CardDesc>

            <Divider />
            <CardTitle>📁 Two Classification Categories</CardTitle>
            <CatRow>
              <CatItem $c="#F07B11"><CatDot $c="#F07B11" /> Survey Reports</CatItem>
              <CatItem $c="#3DA9FC"><CatDot $c="#3DA9FC" /> Field Reports</CatItem>
            </CatRow>
          </Card>
        </Section>
      )}

      {/* ────── EMAIL SCANNER ────── */}
      {activeTab === 'emails' && (
        <Section>
          {/* Scan Header */}
          <ScanBox>
            <ScanTitle>Survey & Field Report Scanner</ScanTitle>
            <ScanDesc>
              Scans past <Hi>7 days</Hi>
              {allowedSenders.length > 0 && <> from <Hi>{allowedSenders.length} sender{allowedSenders.length > 1 ? 's' : ''}</Hi></>}
              {' '}→ keyword match → classify → group by issue
            </ScanDesc>
            <ScanBtn onClick={scanEmails} disabled={scanning}>
              {scanning ? <><Spin /> Scanning...</> : '🔍 Scan My Emails'}
            </ScanBtn>
          </ScanBox>

          {error && <Err>{error}</Err>}

          {/* Category Switcher */}
          {totalCount > 0 && (
            <CatSwitcher>
              <CatTab $on={activeCategory === 'survey'} $c="#F07B11" onClick={() => setActiveCategory('survey')}>
                📋 Survey Reports ({surveyCount})
              </CatTab>
              <CatTab $on={activeCategory === 'field'} $c="#3DA9FC" onClick={() => setActiveCategory('field')}>
                🗺️ Field Reports ({fieldCount})
              </CatTab>
            </CatSwitcher>
          )}

          {/* Grouped Email List */}
          {currentGroups.length > 0 && (
            <GroupsList>
              {currentGroups.map((group) => (
                <GroupCard key={group.group_id}>
                  <GroupHead>
                    <GroupLeft>
                      {group.is_thread && <ThreadBadge>🔗 {group.email_count} related</ThreadBadge>}
                      <GroupTitle>{group.label}</GroupTitle>
                    </GroupLeft>
                    {group.is_thread && (
                      <CollectiveBtn onClick={() => generateCollectiveReport(group)}>
                        📊 Collective Report
                      </CollectiveBtn>
                    )}
                  </GroupHead>

                  <EmailTimeline>
                    {group.emails.map((email, idx) => (
                      <TimelineEmail key={email.id}>
                        <TimelineBar>
                          <Dot $first={idx === 0} $last={idx === group.emails.length - 1} />
                          {idx < group.emails.length - 1 && <Line />}
                        </TimelineBar>
                        <EmailBody>
                          <EmailTop>
                            <EmailSubject>{email.subject}</EmailSubject>
                            <SingleBtn onClick={(e) => { e.stopPropagation(); generateSingleReport(email); }}>
                              Report →
                            </SingleBtn>
                          </EmailTop>
                          <EmailMeta>
                            <span>{email.from}</span><Sep>•</Sep><span>{email.date}</span>
                            {email.has_attachments && <AttachTag>📎</AttachTag>}
                          </EmailMeta>
                          <EmailSnippet>{email.snippet}</EmailSnippet>
                        </EmailBody>
                      </TimelineEmail>
                    ))}
                  </EmailTimeline>
                </GroupCard>
              ))}
            </GroupsList>
          )}

          {totalCount > 0 && currentGroups.length === 0 && (
            <EmptyBox>
              <EmptyIcon>{activeCategory === 'survey' ? '📋' : '🗺️'}</EmptyIcon>
              <EmptyTitle>No {activeCategory === 'survey' ? 'survey' : 'field'} reports found</EmptyTitle>
              <EmptyDesc>Try switching to the other category</EmptyDesc>
            </EmptyBox>
          )}

          {/* Report Viewer */}
          {(generatingReport || report) && (
            <ReportPane>
              <RPHeader>
                <RPTitle>
                  {report?.is_collective ? <><BarChart2 size={24} color="#7C3AED" /> Collective Report</> : <><FileText size={24} color="#059669" /> Generated Report</>}
                  {report?.email_count > 1 && <RPBadge>{report.email_count} emails analyzed</RPBadge>}
                </RPTitle>
                {reportSource && <RPSrc>{reportSource}</RPSrc>}
              </RPHeader>

              {generatingReport ? (
                <Loading><BigSpin /><LText>AI analyzing{report?.is_collective ? ' all emails' : ''}...</LText><LSub>Extracting data & generating report</LSub></Loading>
              ) : report && (
                <RGrid>
                  <RCell $full><RLabel>Executive Summary</RLabel><RVal><MarkdownText text={report.executive_summary} /></RVal></RCell>
                  <RCell><RLabel>Category</RLabel><RVal><CatBadge>{report.primary_category || 'N/A'}</CatBadge>{report.sub_category && <SubCat>{report.sub_category}</SubCat>}</RVal></RCell>
                  <RCell><RLabel>Severity</RLabel><Severity $s={report.severity_score}>{report.severity_score || 'N/A'}/10</Severity><RSub>{report.severity_reason}</RSub></RCell>
                  <RCell><RLabel>Urgency</RLabel><Urgency $l={report.urgency_level}>{report.urgency_level || 'N/A'}</Urgency></RCell>
                  <RCell><RLabel>Population</RLabel><RVal $big>{report.population_affected || 'N/A'}</RVal><RSub>Vulnerable: {report.vulnerable_group || 'N/A'}</RSub></RCell>
                  <RCell><RLabel>Location</RLabel><RVal>{report.precise_location || 'N/A'}</RVal></RCell>
                  <RCell><RLabel>Sentiment</RLabel><RVal>{report.sentiment || 'N/A'}</RVal></RCell>
                  <RCell $full><RLabel>Description</RLabel><RVal><MarkdownText text={report.description} /></RVal></RCell>
                  <RCell $full><RLabel><Sparkles size={16} /> AI Actions</RLabel><RVal><MarkdownText text={report.ai_recommended_actions} /></RVal></RCell>
                  {report.expected_resolution_timeline?.length > 0 && (
                    <RCell $full><RLabel>Timeline</RLabel><TList>{report.expected_resolution_timeline.map((p, i) => <TItem key={i}><TDot />{p}</TItem>)}</TList></RCell>
                  )}
                  {report.key_complaints?.length > 0 && (
                    <RCell $full><RLabel>Key Issues</RLabel><Tags>{report.key_complaints.map((t, i) => <TagItem key={i}>{t}</TagItem>)}</Tags></RCell>
                  )}
                  {report.govt_scheme_applicable && (
                    <RCell $full><RLabel>Govt Scheme</RLabel><RVal>{report.govt_scheme_applicable}</RVal></RCell>
                  )}
                </RGrid>
              )}
            </ReportPane>
          )}
        </Section>
      )}

      {/* ────── REPORTS HISTORY ────── */}
      {activeTab === 'reports' && (
        <Section>
          {reports.length === 0 ? (
            <EmptyBox>
              <EmptyIcon><Inbox size={48} color="#ccc" /></EmptyIcon>
              <EmptyTitle>No reports yet</EmptyTitle>
              <EmptyDesc>Scan & generate your first report!</EmptyDesc>
            </EmptyBox>
          ) : (
            <RList>
              {reports.map((r, i) => (
                <RListCard key={i} onClick={() => {
                  try { localStorage.setItem(`temp_report_${r.id}`, JSON.stringify(r)); } catch(e){}
                  window.open(`${window.location.origin}/report/${r.id}`, '_blank');
                }}>
                  <RListBadge>
                    {r.is_collective ? <BarChart2 size={16} /> : <FileText size={16} />} 
                    <CatBadge>{r.primary_category || 'Report'}</CatBadge>
                  </RListBadge>
                  <RListInfo>
                    <RListTitle>{r.executive_summary || 'Survey Report'}</RListTitle>
                    <RListMeta>
                      {r.precise_location && <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><MapPin size={14}/> {r.precise_location}</span>}
                      {r.severity_score && <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><AlertTriangle size={14}/> {r.severity_score}/10</span>}
                      {r.email_count > 1 && <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><Mail size={14}/> {r.email_count} emails</span>}
                      {r.created_at && <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><Calendar size={14}/> {new Date(r.created_at).toLocaleDateString()}</span>}
                    </RListMeta>
                  </RListInfo>
                  <ViewLink>View →</ViewLink>
                </RListCard>
              ))}
            </RList>
          )}
        </Section>
      )}
    </DashWrapper>
  );
};

/* ── Animations ── */
const fadeIn = keyframes`from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:translateY(0)}`;
const spin = keyframes`to{transform:rotate(360deg)}`;
const pulse = keyframes`0%,100%{opacity:.5}50%{opacity:1}`;

const Toast = styled.div`
  position: fixed;
  bottom: 30px;
  right: 30px;
  background: ${p => p.$type === 'success' ? '#059669' : '#1e293b'};
  color: white;
  padding: 16px 24px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  gap: 12px;
  box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1);
  z-index: 2000;
  animation: ${fadeIn} 0.3s ease-out;
`;

/* ── Core Layout ── */
const DashWrapper = styled.div`flex:1;padding:28px 5%;position:relative;animation:${fadeIn} .5s ease-out;`;
const DashBg = styled.div`position:fixed;inset:0;pointer-events:none;background:radial-gradient(circle at 10% 20%,rgba(240,123,17,.03),transparent 40%),radial-gradient(circle at 90% 80%,rgba(61,169,252,.03),transparent 40%);z-index:-1;`;
const Section = styled.div`animation:${fadeIn} .4s ease-out;`;

/* ── Profile ── */
const ProfileBar = styled.div`display:flex;align-items:center;justify-content:space-between;padding:20px 28px;background:rgba(255,255,255,.6);backdrop-filter:blur(20px);border:1px solid rgba(255,255,255,.8);border-radius:18px;margin-bottom:20px;box-shadow:0 4px 20px rgba(0,0,0,.04);@media(max-width:700px){flex-direction:column;gap:14px;}`;
const PLeft = styled.div`display:flex;align-items:center;gap:14px;@media(max-width:700px){flex-direction:column;}`;
const Avatar = styled.img`width:48px;height:48px;border-radius:50%;border:3px solid rgba(240,123,17,.2);object-fit:cover;`;
const PInfo = styled.div``;
const PName = styled.h2`font-family:'Outfit',sans-serif;font-size:1.2rem;font-weight:700;color:#1a1a1a;margin:0;`;
const PEmail = styled.p`font-size:.85rem;color:#888;margin:2px 0 0;`;
const RolePill = styled.div`padding:5px 14px;border-radius:18px;font-size:.82rem;font-weight:600;color:${p=>p.$c};background:${p=>p.$c}12;border:1px solid ${p=>p.$c}30;`;
const SignOutBtn = styled.button`padding:9px 20px;background:transparent;color:#999;border:1.5px solid rgba(0,0,0,.1);border-radius:11px;font-size:.88rem;font-weight:600;cursor:pointer;transition:all .3s;font-family:'Inter',sans-serif;&:hover{color:#dc2626;border-color:#dc2626;}`;

/* ── Tabs ── */
const TabRow = styled.div`
  display: flex;
  gap: 15px;
  margin-bottom: 30px;
  align-items: center;
  flex-wrap: wrap;
`;
const Tab = styled.button`padding:11px 22px;border:none;border-radius:13px;font-size:.92rem;font-weight:600;cursor:pointer;transition:all .3s;font-family:'Inter',sans-serif;background:${p=>p.$on?'linear-gradient(135deg,#F07B11,#e06c09)':'rgba(0,0,0,.04)'};color:${p=>p.$on?'white':'#666'};box-shadow:${p=>p.$on?'0 4px 14px rgba(240,123,17,.3)':'none'};`;

const MonitorStrip = styled.div`
  margin-left: auto;
  display: flex;
  align-items: center;
  gap: 15px;
  @media (max-width: 800px) { margin-left: 0; width: 100%; margin-top: 10px; }
`;

const MonitorStatus = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 0.85rem;
  font-weight: 600;
  color: ${p => p.$active ? '#059669' : '#64748B'};
`;

const MutedSub = styled.span`
  color: #94A3B8;
  font-weight: 400;
  font-size: 0.75rem;
`;

const PulseKeyframes = keyframes`
  0% { transform: scale(1); opacity: 1; }
  50% { transform: scale(1.5); opacity: 0.5; }
  100% { transform: scale(1); opacity: 1; }
`;

const PulseDot = styled.div`
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: ${p => p.$active ? '#10B981' : '#9CA3AF'};
  animation: ${p => p.$active ? css`${PulseKeyframes} 2s infinite ease-in-out` : 'none'};
`;

const MonitorBtn = styled.button`
  background: ${p => p.$active ? '#FEF2F2' : '#EFF6FF'};
  color: ${p => p.$active ? '#DC2626' : '#2563EB'};
  border: 1px solid ${p => p.$active ? '#FECACA' : '#BFDBFE'};
  padding: 6px 12px;
  border-radius: 8px;
  font-size: 0.8rem;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.2s;
  &:hover { opacity: 0.8; transform: translateY(-1px); }
`;

/* ── Settings ── */
const Card = styled.div`background:rgba(255,255,255,.6);backdrop-filter:blur(16px);border:1px solid rgba(255,255,255,.7);border-radius:22px;padding:36px;box-shadow:0 4px 20px rgba(0,0,0,.04);`;
const CardTitle = styled.h3`font-family:'Outfit',sans-serif;font-size:1.25rem;font-weight:700;color:#1a1a1a;margin:0 0 6px;`;
const CardDesc = styled.p`color:#888;font-size:.88rem;margin-bottom:18px;line-height:1.5;`;
const AddRow = styled.div`display:flex;gap:10px;margin-bottom:14px;@media(max-width:600px){flex-direction:column;}`;
const Input = styled.input`flex:1;padding:12px 16px;border:2px solid rgba(0,0,0,.06);border-radius:11px;font-size:.92rem;font-family:'Inter',sans-serif;outline:none;background:rgba(255,255,255,.8);transition:border .3s;&:focus{border-color:rgba(240,123,17,.4);}`;
const OrangeBtn = styled.button`padding:12px 22px;background:linear-gradient(135deg,#F07B11,#e06c09);color:white;border:none;border-radius:11px;font-weight:600;cursor:pointer;font-family:'Inter',sans-serif;transition:all .3s;&:hover{transform:translateY(-1px);}`;
const GreenBtn = styled.button`padding:12px 28px;background:${p=>p.disabled?'rgba(0,0,0,.08)':'linear-gradient(135deg,#059669,#047857)'};color:${p=>p.disabled?'#999':'white'};border:none;border-radius:11px;font-weight:600;cursor:pointer;font-family:'Inter',sans-serif;transition:all .3s;margin-top:8px;&:hover:not(:disabled){transform:translateY(-1px);}`;
const ChipRow = styled.div`display:flex;flex-wrap:wrap;gap:8px;margin-bottom:18px;`;
const Chip = styled.div`display:flex;align-items:center;gap:8px;padding:7px 14px;background:rgba(240,123,17,.06);border:1px solid rgba(240,123,17,.15);border-radius:9px;font-size:.88rem;color:#333;`;
const XBtn = styled.button`background:none;border:none;color:#dc2626;cursor:pointer;font-size:.78rem;font-weight:700;opacity:.6;&:hover{opacity:1;}`;
const Muted = styled.p`color:#bbb;font-size:.88rem;font-style:italic;margin-bottom:18px;`;
const Divider = styled.hr`border:none;border-top:1px solid rgba(0,0,0,.06);margin:28px 0;`;
const KWChip = styled.span`padding:5px 12px;background:rgba(240,123,17,.06);border:1px solid rgba(240,123,17,.12);border-radius:7px;font-size:.82rem;font-weight:500;color:#F07B11;`;
const CatRow = styled.div`display:flex;gap:20px;flex-wrap:wrap;`;
const CatItem = styled.div`display:flex;align-items:center;gap:8px;font-size:.95rem;color:${p=>p.$c};font-weight:600;`;
const CatDot = styled.div`width:12px;height:12px;border-radius:50%;background:${p=>p.$c};`;

/* ── Scanner ── */
const ScanBox = styled.div`text-align:center;padding:36px 20px;background:rgba(255,255,255,.5);backdrop-filter:blur(16px);border:1px solid rgba(255,255,255,.7);border-radius:22px;margin-bottom:20px;`;
const ScanTitle = styled.h2`font-family:'Outfit',sans-serif;font-size:1.7rem;font-weight:800;color:#1a1a1a;margin-bottom:6px;`;
const ScanDesc = styled.p`color:#777;font-size:.95rem;margin-bottom:22px;`;
const Hi = styled.span`background:rgba(240,123,17,.1);color:#F07B11;padding:2px 9px;border-radius:5px;font-weight:600;`;
const ScanBtn = styled.button`padding:13px 34px;background:linear-gradient(135deg,#F07B11,#e06c09);color:white;border:none;border-radius:13px;font-size:1.02rem;font-weight:600;cursor:pointer;display:inline-flex;align-items:center;gap:10px;transition:all .3s;font-family:'Inter',sans-serif;box-shadow:0 6px 20px rgba(240,123,17,.3);&:hover:not(:disabled){transform:translateY(-2px);box-shadow:0 10px 28px rgba(240,123,17,.4);}&:disabled{opacity:.7;cursor:wait;}`;
const Spin = styled.div`width:18px;height:18px;border:2.5px solid rgba(255,255,255,.3);border-top-color:white;border-radius:50%;animation:${spin} .6s linear infinite;`;
const BigSpin = styled.div`width:46px;height:46px;border:4px solid rgba(240,123,17,.15);border-top-color:#F07B11;border-radius:50%;animation:${spin} .8s linear infinite;`;
const Err = styled.div`background:rgba(239,68,68,.06);border:1px solid rgba(239,68,68,.15);color:#dc2626;padding:12px 18px;border-radius:12px;font-size:.88rem;text-align:center;margin-bottom:18px;`;

/* ── Category Switcher ── */
const CatSwitcher = styled.div`display:flex;gap:10px;margin-bottom:20px;`;
const CatTab = styled.button`flex:1;padding:14px 20px;border:2px solid ${p=>p.$on?p.$c:'rgba(0,0,0,.06)'};border-radius:14px;background:${p=>p.$on?p.$c+'12':'rgba(255,255,255,.5)'};color:${p=>p.$on?p.$c:'#888'};font-size:1rem;font-weight:700;cursor:pointer;transition:all .3s;font-family:'Outfit',sans-serif;&:hover{border-color:${p=>p.$c};}`;

/* ── Groups ── */
const GroupsList = styled.div`display:flex;flex-direction:column;gap:16px;margin-bottom:28px;`;
const GroupCard = styled.div`background:rgba(255,255,255,.55);backdrop-filter:blur(14px);border:1px solid rgba(255,255,255,.7);border-radius:18px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,.03);`;
const GroupHead = styled.div`display:flex;align-items:center;justify-content:space-between;padding:16px 22px;border-bottom:1px solid rgba(0,0,0,.04);flex-wrap:wrap;gap:10px;`;
const GroupLeft = styled.div`display:flex;align-items:center;gap:10px;flex:1;min-width:0;`;
const ThreadBadge = styled.span`padding:4px 12px;background:rgba(124,58,237,.08);color:#7C3AED;border-radius:8px;font-size:.78rem;font-weight:700;white-space:nowrap;`;
const GroupTitle = styled.h4`font-family:'Outfit',sans-serif;font-size:1rem;font-weight:700;color:#1a1a1a;margin:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;`;
const CollectiveBtn = styled.button`padding:8px 18px;background:linear-gradient(135deg,#7C3AED,#6d28d9);color:white;border:none;border-radius:10px;font-size:.82rem;font-weight:600;cursor:pointer;transition:all .3s;font-family:'Inter',sans-serif;white-space:nowrap;&:hover{transform:translateY(-1px);box-shadow:0 4px 14px rgba(124,58,237,.3);}`;

/* ── Timeline ── */
const EmailTimeline = styled.div`padding:0 22px 14px;`;
const TimelineEmail = styled.div`display:flex;gap:14px;`;
const TimelineBar = styled.div`display:flex;flex-direction:column;align-items:center;padding-top:18px;width:20px;flex-shrink:0;`;
const Dot = styled.div`width:10px;height:10px;border-radius:50%;background:${p=>p.$first?'#F07B11':p.$last?'#059669':'#ddd'};flex-shrink:0;z-index:1;`;
const Line = styled.div`width:2px;flex:1;background:rgba(0,0,0,.08);margin:2px 0;`;
const EmailBody = styled.div`flex:1;padding:14px 0;border-bottom:1px solid rgba(0,0,0,.03);min-width:0;`;
const EmailTop = styled.div`display:flex;justify-content:space-between;align-items:flex-start;gap:12px;`;
const EmailSubject = styled.h5`font-family:'Outfit',sans-serif;font-size:.95rem;font-weight:700;color:#1a1a1a;margin:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;flex:1;`;
const SingleBtn = styled.button`padding:5px 14px;background:rgba(240,123,17,.08);color:#F07B11;border:none;border-radius:8px;font-size:.78rem;font-weight:600;cursor:pointer;transition:all .2s;white-space:nowrap;font-family:'Inter',sans-serif;&:hover{background:#F07B11;color:white;}`;
const EmailMeta = styled.div`display:flex;align-items:center;gap:6px;font-size:.78rem;color:#999;margin:4px 0;flex-wrap:wrap;`;
const Sep = styled.span`color:#ddd;`;
const AttachTag = styled.span`background:rgba(240,123,17,.08);color:#F07B11;padding:1px 6px;border-radius:4px;font-weight:600;font-size:.72rem;`;
const EmailSnippet = styled.p`font-size:.82rem;color:#777;margin:4px 0 0;line-height:1.4;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;`;

/* ── Report Viewer ── */
const ReportPane = styled.div`margin-top:28px;animation:${fadeIn} .5s ease-out;`;
const RPHeader = styled.div`margin-bottom:18px;`;
const RPTitle = styled.h2`font-family:'Outfit',sans-serif;font-size:1.5rem;font-weight:800;color:#1a1a1a;margin:0 0 4px;display:flex;align-items:center;gap:10px;flex-wrap:wrap;`;
const RPBadge = styled.span`padding:3px 12px;background:rgba(124,58,237,.08);color:#7C3AED;border-radius:8px;font-size:.78rem;font-weight:600;`;
const RPSrc = styled.p`font-size:.88rem;color:#888;`;
const Loading = styled.div`display:flex;flex-direction:column;align-items:center;padding:56px 20px;background:rgba(255,255,255,.5);border-radius:18px;border:1px solid rgba(255,255,255,.7);`;
const LText = styled.p`font-family:'Outfit',sans-serif;font-size:1.15rem;font-weight:600;color:#1a1a1a;margin-top:18px;`;
const LSub = styled.p`font-size:.88rem;color:#999;animation:${pulse} 2s ease-in-out infinite;`;
const RGrid = styled.div`display:grid;grid-template-columns:repeat(3,1fr);gap:14px;@media(max-width:900px){grid-template-columns:repeat(2,1fr);}@media(max-width:600px){grid-template-columns:1fr;}`;
const RCell = styled.div`background:rgba(255,255,255,.6);backdrop-filter:blur(12px);border:1px solid rgba(0,0,0,.08);border-radius:14px;padding:18px;grid-column:${p=>p.$full?'1 / -1':'auto'};box-shadow:0 2px 10px rgba(0,0,0,.02);`;
const RLabel = styled.h4`font-family:'Outfit',sans-serif;font-size:.82rem;font-weight:700;color:#999;text-transform:uppercase;letter-spacing:.8px;margin:0 0 8px;`;
const RVal = styled.div`font-size:${p=>p.$big?'1.8rem':'1rem'};font-weight:${p=>p.$big?'800':'500'};color:#1a1a1a;line-height:1.6;white-space:${p=>p.$pre?'pre-wrap':'normal'};`;
const RSub = styled.p`font-size:.82rem;color:#888;margin-top:6px;`;
const CatBadge = styled.span`display:inline-block;padding:5px 12px;background:rgba(240,123,17,.1);color:#F07B11;border-radius:7px;font-weight:700;font-size:.85rem;`;
const SubCat = styled.span`display:block;font-size:.82rem;color:#888;margin-top:5px;`;
const Severity = styled.div`font-size:2rem;font-weight:900;font-family:'Outfit',sans-serif;color:${p=>{const s=p.$s;if(s>=8)return'#dc2626';if(s>=5)return'#f59e0b';return'#059669';}};`;
const Urgency = styled.div`display:inline-block;padding:7px 16px;border-radius:9px;font-weight:700;font-size:.95rem;background:${p=>{const l=p.$l?.toLowerCase();if(l==='immediate'||l==='critical')return'rgba(220,38,38,.1)';if(l==='moderate')return'rgba(245,158,11,.1)';return'rgba(5,150,105,.1)';}};color:${p=>{const l=p.$l?.toLowerCase();if(l==='immediate'||l==='critical')return'#dc2626';if(l==='moderate')return'#f59e0b';return'#059669';}};`;
const TList = styled.div`display:flex;flex-direction:column;gap:10px;`;
const TItem = styled.div`display:flex;align-items:center;gap:10px;font-size:.92rem;color:#444;`;
const TDot = styled.div`width:9px;height:9px;border-radius:50%;background:#F07B11;flex-shrink:0;`;
const Tags = styled.div`display:flex;flex-wrap:wrap;gap:7px;`;
const TagItem = styled.span`padding:5px 12px;background:rgba(0,0,0,.04);border-radius:7px;font-size:.82rem;font-weight:500;color:#555;`;

/* ── Empty/History ── */
const EmptyBox = styled.div`display:flex;flex-direction:column;align-items:center;padding:70px 20px;text-align:center;`;
const EmptyIcon = styled.div`font-size:3.5rem;margin-bottom:14px;`;
const EmptyTitle = styled.h3`font-family:'Outfit',sans-serif;font-size:1.4rem;font-weight:700;color:#1a1a1a;margin-bottom:6px;`;
const EmptyDesc = styled.p`color:#888;font-size:.95rem;`;
const RList = styled.div`display:flex;flex-direction:column;gap:10px;`;
const RListCard = styled.div`display:flex;align-items:center;gap:14px;padding:18px 22px;background:rgba(255,255,255,.6);backdrop-filter:blur(12px);border:1px solid rgba(255,255,255,.7);border-radius:14px;cursor:pointer;transition:all .3s;&:hover{transform:translateY(-2px);box-shadow:0 6px 20px rgba(0,0,0,.05);}@media(max-width:700px){flex-direction:column;text-align:center;}`;
const RListBadge = styled.div`display:flex;align-items:center;gap:6px;`;
const RListInfo = styled.div`flex:1;min-width:0;`;
const RListTitle = styled.h4`font-family:'Outfit',sans-serif;font-size:.95rem;font-weight:700;color:#1a1a1a;margin:0 0 4px;`;
const RListMeta = styled.div`display:flex;gap:14px;font-size:.78rem;color:#999;flex-wrap:wrap;`;
const ViewLink = styled.div`padding:7px 14px;color:#F07B11;font-weight:600;font-size:.82rem;`;

export default Dashboard;
