import { useState } from 'react';
import { AreaChart, Area, ResponsiveContainer } from 'recharts';
import './Login.css';

interface LoginProps {
  onLogin: () => void;
  onBack: () => void;
}

interface UserAccount {
  name: string;
  email: string;
  password?: string;
  avatar?: string;
  provider: 'email' | 'google';
}

const getRegisteredUsers = (): UserAccount[] => {
  try {
    const raw = localStorage.getItem('aura_users');
    if (raw) return JSON.parse(raw);
  } catch (err) {
    console.error('Failed to parse registered users:', err);
  }
  return [];
};

const saveRegisteredUser = (user: UserAccount) => {
  const users = getRegisteredUsers();
  const existingIdx = users.findIndex(u => u.email.toLowerCase() === user.email.toLowerCase());
  if (existingIdx >= 0) {
    users[existingIdx] = { ...users[existingIdx], ...user };
  } else {
    users.push(user);
  }
  localStorage.setItem('aura_users', JSON.stringify(users));
};

export default function Login({ onLogin, onBack }: LoginProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [error, setError] = useState('');

  // Google Sign-In Dialog State
  const [showGoogleDialog, setShowGoogleDialog] = useState(false);
  const [googleEmail, setGoogleEmail] = useState('');
  const [googleName, setGoogleName] = useState('');
  const [signingIn, setSigningIn] = useState(false);

  // Load previous Google accounts from this browser session
  const previousGoogleUsers = getRegisteredUsers().filter(u => u.provider === 'google');

  const handleSelectSavedGoogleAccount = (acc: UserAccount) => {
    setSigningIn(true);
    setTimeout(() => {
      localStorage.setItem('userName', acc.name);
      localStorage.setItem('userEmail', acc.email);
      if (acc.avatar) {
        localStorage.setItem('userAvatar', acc.avatar);
      } else {
        localStorage.removeItem('userAvatar');
      }
      localStorage.setItem('authProvider', 'google');
      setShowGoogleDialog(false);
      setSigningIn(false);
      onLogin();
    }, 500);
  };

  const handleGoogleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!googleEmail.trim()) return;

    const trimmedEmail = googleEmail.trim();
    const derivedName = googleName.trim() || trimmedEmail.split('@')[0];

    setSigningIn(true);
    setTimeout(() => {
      const newUser: UserAccount = {
        name: derivedName,
        email: trimmedEmail,
        provider: 'google'
      };
      saveRegisteredUser(newUser);

      localStorage.setItem('userName', derivedName);
      localStorage.setItem('userEmail', trimmedEmail);
      localStorage.removeItem('userAvatar');
      localStorage.setItem('authProvider', 'google');

      setShowGoogleDialog(false);
      setSigningIn(false);
      onLogin();
    }, 500);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const trimmedEmail = email.trim().toLowerCase();
    const trimmedPass = password.trim();

    if (isSignUp) {
      const trimmedName = name.trim();
      if (!trimmedName || !trimmedEmail || !trimmedPass) {
        setError('Please fill in all fields.');
        return;
      }

      const users = getRegisteredUsers();
      const userExists = users.some(u => u.email.toLowerCase() === trimmedEmail && u.provider === 'email');
      if (userExists) {
        setError('An account with this email already exists. Please sign in.');
        return;
      }

      const newUser: UserAccount = {
        name: trimmedName,
        email: trimmedEmail,
        password: trimmedPass,
        provider: 'email'
      };
      saveRegisteredUser(newUser);

      localStorage.setItem('userName', trimmedName);
      localStorage.setItem('userEmail', trimmedEmail);
      localStorage.setItem('authProvider', 'email');
      
      setIsSignUp(false);
      setPassword('');
      alert('Account registered successfully! Please sign in with your credentials.');
    } else {
      if (!trimmedEmail || !trimmedPass) {
        setError('Please enter your email and password.');
        return;
      }

      const users = getRegisteredUsers();
      const matchedUser = users.find(u => u.email.toLowerCase() === trimmedEmail && u.provider === 'email');

      if (matchedUser && matchedUser.password === trimmedPass) {
        localStorage.setItem('userName', matchedUser.name);
        localStorage.setItem('userEmail', matchedUser.email);
        localStorage.setItem('authProvider', 'email');
        onLogin();
      } else {
        // Check single stored fallback if any
        const singleEmail = localStorage.getItem('userEmail');
        const singlePass = localStorage.getItem('userPass');
        const singleName = localStorage.getItem('userName') || 'User';

        if (singleEmail && singlePass && singleEmail.toLowerCase() === trimmedEmail && singlePass === trimmedPass) {
          localStorage.setItem('userName', singleName);
          localStorage.setItem('userEmail', singleEmail);
          localStorage.setItem('authProvider', 'email');
          onLogin();
        } else {
          setError('Invalid email or password. Please verify your credentials or create a new account.');
        }
      }
    }
  };

  return (
    <div className="login-split-container" style={{ animation: 'fadeIn 0.5s ease-out' }}>
      {/* Left Side - Form */}
      <div className="login-left">
        <button className="back-btn-split" onClick={onBack}>
          <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="19" y1="12" x2="5" y2="12" />
            <polyline points="12 19 5 12 12 5" />
          </svg>
          Back to Home
        </button>

        <div className="login-form-wrapper">
          <div className="login-header">
            <div className="logo-container" style={{ justifyContent: 'flex-start', marginBottom: '2.5rem' }}>
              <svg className="logo-icon" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" fill="currentColor" />
              </svg>
              <span className="logo-text">Aura.</span>
            </div>
            <h2>{isSignUp ? 'Create an account' : 'Welcome back'}</h2>
            <p>{isSignUp ? 'Please enter your details to sign up.' : 'Please enter your details to sign in.'}</p>
            {error && (
              <div style={{ marginTop: '1rem', padding: '0.75rem 1rem', background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', borderRadius: '10px', fontSize: '0.875rem', border: '1px solid rgba(239, 68, 68, 0.2)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
                <span>{error}</span>
              </div>
            )}
          </div>

          <form onSubmit={handleSubmit} className="login-form">
            {isSignUp && (
              <div className="form-group">
                <label>Full Name</label>
                <input 
                  type="text" 
                  placeholder="Enter your full name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </div>
            )}
            <div className="form-group">
              <label>Email</label>
              <input 
                type="email" 
                placeholder="Enter your email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div className="form-group">
              <label>Password</label>
              <input 
                type="password" 
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
            {!isSignUp && (
              <div className="form-options">
                <label className="checkbox-container">
                  <input type="checkbox" defaultChecked />
                  <span className="checkmark"></span>
                  Remember me
                </label>
                <a href="#" className="forgot-password" onClick={(e) => { e.preventDefault(); alert("Password reset instructions have been sent to your email."); }}>Forgot password?</a>
              </div>
            )}
            
            <button type="submit" className="btn-primary btn-glow login-btn">
              {isSignUp ? 'Sign up' : 'Sign in'}
            </button>
            
            <div className="divider" style={{ display: 'flex', alignItems: 'center', margin: '1.25rem 0 0.5rem', color: 'var(--text-muted)', fontSize: '0.85rem', fontWeight: 500 }}>
              <div style={{ flex: 1, height: '1px', background: 'var(--border)' }}></div>
              <span style={{ padding: '0 1rem' }}>Or continue with</span>
              <div style={{ flex: 1, height: '1px', background: 'var(--border)' }}></div>
            </div>
            
            <div className="social-login" style={{ margin: 0 }}>
              <button 
                type="button" 
                className="btn-social" 
                onClick={() => {
                  setError('');
                  setShowGoogleDialog(true);
                }}
              >
                <svg width="20" height="20" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
                <span>Continue with Google</span>
              </button>
            </div>
          </form>
          
          <p className="signup-prompt">
            {isSignUp ? 'Already have an account?' : "Don't have an account?"}{' '}
            <a href="#" onClick={(e) => { e.preventDefault(); setIsSignUp(!isSignUp); setError(''); }}>
              {isSignUp ? 'Sign in' : 'Sign up'}
            </a>
          </p>
        </div>
      </div>

      {/* Right Side - Visual */}
      <div className="login-right">
        <div className="login-right-content">
          <div className="feature-showcase">
            <div className="showcase-icon">
              <svg width="36" height="36" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
              </svg>
            </div>
            <h3>Master your finances with Aura.</h3>
            <p>Join thousands of creators and teams taking control of their money. Experience intelligent insights, seamless trip splitting, and a dashboard designed for clarity.</p>
          </div>
          
          <div className="login-graph-container" style={{ width: '100%', background: 'rgba(255,255,255,0.05)', borderRadius: '16px', padding: '1.5rem', border: '1px solid rgba(255,255,255,0.1)', backdropFilter: 'blur(10px)', boxShadow: '0 10px 30px rgba(0,0,0,0.1)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <div style={{ display: 'flex', flexDirection: 'column' }}>
                <span style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.6)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '1px' }}>Portfolio Growth</span>
                <span style={{ fontSize: '1.75rem', fontWeight: 800, color: 'white' }}>₹84,250</span>
              </div>
              <div style={{ background: 'rgba(74, 222, 128, 0.2)', color: '#4ade80', padding: '0.25rem 0.75rem', borderRadius: '100px', fontSize: '0.9rem', fontWeight: 700, border: '1px solid rgba(74, 222, 128, 0.3)' }}>
                +24.5%
              </div>
            </div>
            <div style={{ width: '100%', height: '120px' }}>
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={[
                  { name: 'Jan', value: 4000 },
                  { name: 'Feb', value: 3000 },
                  { name: 'Mar', value: 5500 },
                  { name: 'Apr', value: 4500 },
                  { name: 'May', value: 7000 },
                  { name: 'Jun', value: 6500 },
                  { name: 'Jul', value: 8500 }
                ]}>
                  <defs>
                    <linearGradient id="colorLoginGraph" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#B89C5D" stopOpacity={0.8}/>
                      <stop offset="95%" stopColor="#B89C5D" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <Area type="monotone" dataKey="value" stroke="#B89C5D" strokeWidth={3} fillOpacity={1} fill="url(#colorLoginGraph)" animationDuration={2000} animationEasing="ease-out" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </div>

      {/* Google Authentication Dialog */}
      {showGoogleDialog && (
        <div 
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0, 0, 0, 0.65)',
            backdropFilter: 'blur(6px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            padding: '1.5rem',
            animation: 'fadeIn 0.2s ease-out'
          }}
          onClick={() => !signingIn && setShowGoogleDialog(false)}
        >
          <div 
            style={{
              background: '#ffffff',
              borderRadius: '24px',
              maxWidth: '440px',
              width: '100%',
              padding: '2.5rem 2rem',
              boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)',
              position: 'relative',
              color: '#202124',
              fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Google Header */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: '1.75rem' }}>
              <svg width="40" height="40" viewBox="0 0 24 24" style={{ marginBottom: '1rem' }}>
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              <h3 style={{ margin: 0, fontSize: '1.45rem', fontWeight: 600, color: '#202124' }}>
                Sign in with Google
              </h3>
              <p style={{ margin: '0.4rem 0 0', fontSize: '0.925rem', color: '#5f6368' }}>
                to continue to <strong style={{ color: '#1a73e8' }}>Aura</strong>
              </p>
            </div>

            {/* Loading state */}
            {signingIn ? (
              <div style={{ textAlign: 'center', padding: '2rem 0' }}>
                <div style={{
                  width: '42px',
                  height: '42px',
                  border: '3px solid #e8eaed',
                  borderTopColor: '#1a73e8',
                  borderRadius: '50%',
                  margin: '0 auto 1.5rem',
                  animation: 'spin 0.8s linear infinite'
                }} />
                <div style={{ fontSize: '1rem', fontWeight: 600, color: '#202124' }}>
                  Signing in with Google...
                </div>
              </div>
            ) : (
              <div>
                {/* Previously logged in accounts from this device */}
                {previousGoogleUsers.length > 0 && (
                  <div style={{ marginBottom: '1.5rem', borderBottom: '1px solid #dadce0', paddingBottom: '1rem' }}>
                    <div style={{ fontSize: '0.8rem', fontWeight: 600, color: '#5f6368', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '0.75rem', textAlign: 'left' }}>
                      Saved Accounts
                    </div>
                    {previousGoogleUsers.map((acc, idx) => (
                      <div
                        key={idx}
                        onClick={() => handleSelectSavedGoogleAccount(acc)}
                        style={{
                          padding: '0.75rem 1rem',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.85rem',
                          cursor: 'pointer',
                          borderRadius: '12px',
                          transition: 'background 0.15s'
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.background = '#f8f9fa'}
                        onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                      >
                        <div style={{
                          width: '36px',
                          height: '36px',
                          borderRadius: '50%',
                          background: '#1a73e8',
                          color: '#fff',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontWeight: 600,
                          fontSize: '1rem',
                          flexShrink: 0
                        }}>
                          {acc.name.charAt(0).toUpperCase()}
                        </div>
                        <div style={{ flex: 1, minWidth: 0, textAlign: 'left' }}>
                          <div style={{ fontSize: '0.925rem', fontWeight: 600, color: '#202124' }}>{acc.name}</div>
                          <div style={{ fontSize: '0.8rem', color: '#5f6368' }}>{acc.email}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Google Email Input Form */}
                <form onSubmit={handleGoogleSubmit} style={{ textAlign: 'left' }}>
                  <div style={{ marginBottom: '1.25rem' }}>
                    <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#202124', marginBottom: '0.4rem' }}>
                      Google Email Address
                    </label>
                    <input
                      type="email"
                      placeholder="Enter your google email"
                      value={googleEmail}
                      onChange={(e) => setGoogleEmail(e.target.value)}
                      autoFocus
                      required
                      style={{
                        width: '100%',
                        padding: '0.85rem 1rem',
                        borderRadius: '8px',
                        border: '1px solid #dadce0',
                        fontSize: '1rem',
                        outline: 'none',
                        color: '#202124',
                        background: '#fff',
                        boxSizing: 'border-box'
                      }}
                    />
                  </div>

                  <div style={{ marginBottom: '1.75rem' }}>
                    <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: '#202124', marginBottom: '0.4rem' }}>
                      Your Name
                    </label>
                    <input
                      type="text"
                      placeholder="Enter your name"
                      value={googleName}
                      onChange={(e) => setGoogleName(e.target.value)}
                      style={{
                        width: '100%',
                        padding: '0.85rem 1rem',
                        borderRadius: '8px',
                        border: '1px solid #dadce0',
                        fontSize: '1rem',
                        outline: 'none',
                        color: '#202124',
                        background: '#fff',
                        boxSizing: 'border-box'
                      }}
                    />
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <button
                      type="button"
                      onClick={() => setShowGoogleDialog(false)}
                      style={{
                        background: 'transparent',
                        border: 'none',
                        color: '#5f6368',
                        fontWeight: 600,
                        cursor: 'pointer',
                        fontSize: '0.9rem',
                        padding: '0.5rem 0'
                      }}
                    >
                      Cancel
                    </button>

                    <button
                      type="submit"
                      disabled={!googleEmail.trim()}
                      style={{
                        background: '#1a73e8',
                        color: '#ffffff',
                        border: 'none',
                        borderRadius: '8px',
                        padding: '0.75rem 1.5rem',
                        fontWeight: 600,
                        cursor: googleEmail.trim() ? 'pointer' : 'not-allowed',
                        opacity: googleEmail.trim() ? 1 : 0.6,
                        fontSize: '0.95rem'
                      }}
                    >
                      Sign In
                    </button>
                  </div>
                </form>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
