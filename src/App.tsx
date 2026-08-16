import { useEffect, useState } from 'react';
import './App.css';
import Dashboard from './Dashboard';
import Login from './Login';
import Solution from './Solution/Solution';

function App() {
  const [currentView, setCurrentView] = useState<'landing' | 'dashboard' | 'login' | 'solution'>('landing');
  const [scrolled, setScrolled] = useState(false);
  const [authLoading, setAuthLoading] = useState(false);
  const [authStatusMessage, setAuthStatusMessage] = useState('Signing in with Google...');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Handle Google OAuth Redirect Callback (#access_token=... or ?demo_google_auth=true)
  useEffect(() => {
    const hash = window.location.hash;
    const search = window.location.search;

    if (hash && (hash.includes('access_token=') || hash.includes('id_token='))) {
      const params = new URLSearchParams(hash.substring(1));
      const accessToken = params.get('access_token');
      
      if (accessToken) {
        setAuthLoading(true);
        setAuthStatusMessage('Retrieving your Google account profile...');

        fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
          headers: { Authorization: `Bearer ${accessToken}` },
        })
          .then((res) => {
            if (!res.ok) throw new Error('Failed to fetch Google profile');
            return res.json();
          })
          .then((userInfo) => {
            localStorage.setItem('userEmail', userInfo.email || 'user@gmail.com');
            localStorage.setItem('userName', userInfo.name || 'Google User');
            if (userInfo.picture) {
              localStorage.setItem('userAvatar', userInfo.picture);
            }
            localStorage.setItem('authProvider', 'google');

            // Clean the URL hash cleanly
            window.history.replaceState(null, '', window.location.pathname);
            setCurrentView('dashboard');
          })
          .catch((err) => {
            console.error('Google profile fetch error:', err);
            alert('Google authentication succeeded, but failed to retrieve user profile.');
            window.history.replaceState(null, '', window.location.pathname);
            setCurrentView('dashboard');
          })
          .finally(() => {
            setAuthLoading(false);
          });
      }
    } else if (hash && hash.includes('error=')) {
      const params = new URLSearchParams(hash.substring(1));
      const errorReason = params.get('error') || 'OAuth access denied';
      console.error('Google OAuth error:', errorReason);
      window.history.replaceState(null, '', window.location.pathname);
      alert(`Google Sign-In returned an error: ${errorReason}`);
    } else if (search && search.includes('demo_google_auth=true')) {
      setAuthLoading(true);
      setAuthStatusMessage('Processing Google authentication redirect...');

      const timer = setTimeout(() => {
        const storedName = localStorage.getItem('userName') || 'Google User';
        const storedEmail = localStorage.getItem('userEmail') || 'user@gmail.com';

        localStorage.setItem('userName', storedName);
        localStorage.setItem('userEmail', storedEmail);
        localStorage.setItem('authProvider', 'google');

        window.history.replaceState(null, '', window.location.pathname);
        setAuthLoading(false);
        setCurrentView('dashboard');
      }, 700);

      return () => clearTimeout(timer);
    }
  }, []);

  if (authLoading) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'var(--bg-color)',
        color: 'var(--text-main)',
        gap: '1.5rem'
      }}>
        <div style={{
          width: '54px',
          height: '54px',
          border: '4px solid rgba(184, 156, 93, 0.2)',
          borderTopColor: 'var(--primary)',
          borderRadius: '50%',
          animation: 'spin 0.8s linear infinite'
        }} />
        <div style={{ textAlign: 'center' }}>
          <h3 style={{ margin: '0 0 0.5rem 0', fontSize: '1.25rem' }}>{authStatusMessage}</h3>
          <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '0.9rem' }}>Redirecting to your dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="app-container">
      {/* Background decoration */}
      <div className="bg-blobs">
        <div className="blob blob-1"></div>
        <div className="blob blob-2"></div>
      </div>

      {currentView === 'dashboard' ? (
        <Dashboard onLogout={() => setCurrentView('landing')} />
      ) : currentView === 'login' ? (
        <Login onLogin={() => setCurrentView('dashboard')} onBack={() => setCurrentView('landing')} />
      ) : (
        <>
          {/* Premium Header */}
          <header className={`header ${scrolled ? 'header-scrolled' : ''}`}>
            <div className="header-inner">
              <div className="logo-container" onClick={() => { setCurrentView('landing'); setMobileMenuOpen(false); }} style={{ cursor: 'pointer' }}>
                <svg className="logo-icon" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" fill="currentColor"/>
                </svg>
                <span className="logo-text">Aura.</span>
              </div>
              <nav className="nav-links">
                <a href="#" onClick={(e) => { e.preventDefault(); setCurrentView('landing'); }} className="nav-item">Features</a>
                <a href="#" onClick={(e) => { e.preventDefault(); setCurrentView('solution'); }} className="nav-item">
                  Solutions
                  <span className="nav-badge">New</span>
                </a>
                <a href="#" className="nav-item">Resources</a>
                <a href="#" className="nav-item">Pricing</a>
              </nav>
              <div className="header-actions">
                <a href="#" className="login-link" onClick={(e) => { e.preventDefault(); setCurrentView('login'); }}>Log in</a>
                <button className="btn-primary btn-sm btn-glow" onClick={() => setCurrentView('dashboard')}>
                  Go to App <span aria-hidden="true" style={{ marginLeft: '0.25rem' }}>→</span>
                </button>
              </div>

              {/* Mobile Hamburger Button */}
              <button 
                className="mobile-menu-btn" 
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                aria-label="Toggle Menu"
              >
                {mobileMenuOpen ? (
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="18" y1="6" x2="6" y2="18"></line>
                    <line x1="6" y1="6" x2="18" y2="18"></line>
                  </svg>
                ) : (
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="3" y1="12" x2="21" y2="12"></line>
                    <line x1="3" y1="6" x2="21" y2="6"></line>
                    <line x1="3" y1="18" x2="21" y2="18"></line>
                  </svg>
                )}
              </button>
            </div>

            {/* Mobile Dropdown Menu Drawer */}
            {mobileMenuOpen && (
              <div className="mobile-nav-drawer">
                <a href="#" onClick={(e) => { e.preventDefault(); setCurrentView('landing'); setMobileMenuOpen(false); }} className="mobile-nav-item">
                  Features
                </a>
                <a href="#" onClick={(e) => { e.preventDefault(); setCurrentView('solution'); setMobileMenuOpen(false); }} className="mobile-nav-item">
                  Solutions <span className="nav-badge">New</span>
                </a>
                <a href="#" onClick={(e) => { e.preventDefault(); setMobileMenuOpen(false); }} className="mobile-nav-item">
                  Resources
                </a>
                <a href="#" onClick={(e) => { e.preventDefault(); setMobileMenuOpen(false); }} className="mobile-nav-item">
                  Pricing
                </a>
                <div className="mobile-nav-divider"></div>
                <div className="mobile-nav-actions">
                  <a href="#" className="mobile-login-link" onClick={(e) => { e.preventDefault(); setCurrentView('login'); setMobileMenuOpen(false); }}>
                    Log in
                  </a>
                  <button className="btn-primary" style={{ width: '100%', padding: '0.85rem' }} onClick={() => { setCurrentView('dashboard'); setMobileMenuOpen(false); }}>
                    Go to App →
                  </button>
                </div>
              </div>
            )}
          </header>
          <main>
            {currentView === 'solution' ? (
              <Solution />
            ) : (
              <>
                {/* Hero Section */}
                <section className="hero">
                  <div className="hero-content">
                    <div className="pill">✨ Introducing Aura 2.0</div>
                    <h1>Design that speaks to the future.</h1>
                    <p>
                      Elevate your digital presence with a premium, sleek, and high-performance 
                      platform. We bring your boldest ideas to life with stunning aesthetics.
                    </p>
                    <div className="hero-buttons">
                      <button className="btn-primary" onClick={() => setCurrentView('dashboard')}>Start Free Trial</button>
                      <button className="btn-secondary">View Showcase</button>
                    </div>
                  </div>
                  <div className="hero-image">
                    <img src="/hero_image.png" alt="Hero 3D abstract illustration" />
                  </div>
                </section>

                {/* Features Section */}
                <section id="features" className="features">
                  <h2>Why Choose Aura?</h2>
                  <div className="feature-grid">
                    <div className="feature-card">
                      <div className="feature-icon">
                        <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/></svg>
                      </div>
                      <h3>Premium Design</h3>
                      <p>Experience world-class aesthetics with soft gradients, modern typography, and glassmorphism elements tailored to wow your users.</p>
                    </div>
                    <div className="feature-card">
                      <div className="feature-icon">
                        <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
                      </div>
                      <h3>Lightning Fast</h3>
                      <p>Optimized for peak performance. Our platform ensures instant load times and smooth micro-animations that breathe life into the UI.</p>
                    </div>
                    <div className="feature-card">
                      <div className="feature-icon">
                        <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></svg>
                      </div>
                      <h3>Highly Scalable</h3>
                      <p>Built on modern technologies like React and Vite, giving you the foundation you need to scale your application globally.</p>
                    </div>
                  </div>
                </section>
              </>
            )}
          </main>

          {/* Premium Footer */}
          <footer className="footer">
            <div className="footer-content">
              <div className="footer-brand">
                <div className="logo-container">
                  <svg className="logo-icon" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" fill="currentColor"/>
                  </svg>
                  <span className="logo-text">Aura.</span>
                </div>
                <p>Empowering creators to build stunning digital experiences with state-of-the-art aesthetics and unmatched performance.</p>
              </div>
              <div className="footer-links">
                <div className="link-group">
                  <h4>Product</h4>
                  <a href="#">Features</a>
                  <a href="#">Integrations</a>
                  <a href="#">Pricing</a>
                  <a href="#">Changelog</a>
                </div>
                <div className="link-group">
                  <h4>Company</h4>
                  <a href="#">About Us</a>
                  <a href="#">Careers</a>
                  <a href="#">Blog</a>
                  <a href="#">Contact</a>
                </div>
                <div className="link-group">
                  <h4>Legal</h4>
                  <a href="#">Privacy Policy</a>
                  <a href="#">Terms of Service</a>
                  <a href="#">Cookie Policy</a>
                </div>
              </div>
            </div>
            <div className="footer-bottom">
              <p>&copy; {new Date().getFullYear()} Aura Inc. All rights reserved.</p>
              <div className="social-links">
                <a href="#" aria-label="Twitter">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 4s-.7 2.1-2 3.4c1.6 10-9.4 17.3-18 11.6 2.2.1 4.4-.6 6-2C3 15.5.5 9.6 3 5c2.2 2.6 5.6 4.1 9 4-.9-4.2 4-6.6 7-3.8 1.1 0 3-1.2 3-1.2z"></path></svg>
                </a>
                <a href="#" aria-label="GitHub">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.87a3.37 3.37 0 0 0-.94-2.61c3.14-.35 6.44-1.54 6.44-7A5.44 5.44 0 0 0 20 4.77 5.07 5.07 0 0 0 19.91 1S18.73.65 16 2.48a13.38 13.38 0 0 0-7 0C6.27.65 5.09 1 5.09 1A5.07 5.07 0 0 0 5 4.77a5.44 5.44 0 0 0-1.5 3.78c0 5.42 3.3 6.61 6.44 7A3.37 3.37 0 0 0 9 18.13V22"></path></svg>
                </a>
              </div>
            </div>
          </footer>
        </>
      )}
    </div>
  );
}

export default App;
