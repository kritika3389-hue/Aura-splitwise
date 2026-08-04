import { useState } from 'react';
import { AreaChart, Area, ResponsiveContainer } from 'recharts';
import { signInWithPopup } from 'firebase/auth';
import { auth, googleProvider } from './firebase';
import './Login.css';

interface LoginProps {
  onLogin: () => void;
  onBack: () => void;
}

export default function Login({ onLogin, onBack }: LoginProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (isSignUp) {
      if (!name || !email || !password) {
        setError('Please fill in all fields.');
        return;
      }
      localStorage.setItem('userEmail', email);
      localStorage.setItem('userPass', password);
      localStorage.setItem('userName', name);
      setIsSignUp(false);
      setPassword('');
      alert('Account created successfully! Please sign in to continue.');
    } else {
      if (!email || !password) {
        setError('Please fill in all fields.');
        return;
      }
      const savedEmail = localStorage.getItem('userEmail');
      const savedPass = localStorage.getItem('userPass');
      
      if (savedEmail && savedPass) {
        if (email === savedEmail && password === savedPass) {
          onLogin();
        } else {
          setError('Invalid email or password.');
        }
      } else {
        // Fallback or demo login
        if (email === 'creator@aura.com' && password === 'password123') {
          onLogin();
        } else {
          setError('Invalid email or password. (Hint: sign up first or use creator@aura.com / password123)');
        }
      }
    }
  };

  const handleGoogleAuth = async () => {
    try {
      // Trigger the real Google Auth popup!
      const result = await signInWithPopup(auth, googleProvider);
      
      // Successfully authenticated with Google!
      const user = result.user;
      localStorage.setItem('userEmail', user.email || '');
      localStorage.setItem('userName', user.displayName || 'Google User');
      
      onLogin(); // Proceed to dashboard
    } catch (err: any) {
      console.error("Google Auth Error:", err);
      if (err.code === 'auth/invalid-api-key' || err.code === 'auth/unauthorized-domain') {
        alert("Please set up your Firebase Config in firebase.ts to test the real Google Auth!");
      } else {
        alert("Failed to authenticate with Google: " + err.message);
      }
    }
  };

  return (
    <div className="login-split-container" style={{ animation: 'fadeIn 0.5s ease-out' }}>
      
      {/* Left Side - Form */}
      <div className="login-left">
        <button className="back-btn-split" onClick={onBack}>
          <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></svg>
          Back to Home
        </button>

        <div className="login-form-wrapper">
          <div className="login-header">
            <div className="logo-container" style={{ justifyContent: 'flex-start', marginBottom: '2.5rem' }}>
              <svg className="logo-icon" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" fill="currentColor"/>
              </svg>
              <span className="logo-text">Aura.</span>
            </div>
            <h2>{isSignUp ? 'Create an account' : 'Welcome back'}</h2>
            <p>{isSignUp ? 'Please enter your details to sign up.' : 'Please enter your details to sign in.'}</p>
            {error && <div style={{ marginTop: '1rem', padding: '0.75rem', background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', borderRadius: '8px', fontSize: '0.85rem', border: '1px solid rgba(239, 68, 68, 0.2)' }}>{error}</div>}
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
                  <input type="checkbox" />
                  <span className="checkmark"></span>
                  Remember me
                </label>
                <a href="#" className="forgot-password">Forgot password?</a>
              </div>
            )}
            
            <button type="submit" className="btn-primary btn-glow login-btn">
              {isSignUp ? 'Sign up' : 'Sign in'}
            </button>
            
            <div className="divider" style={{ display: 'flex', alignItems: 'center', margin: '1.5rem 0 0.5rem', color: 'var(--text-muted)', fontSize: '0.85rem', fontWeight: 500 }}>
              <div style={{ flex: 1, height: '1px', background: 'var(--border)' }}></div>
              <span style={{ padding: '0 1rem' }}>Or continue with</span>
              <div style={{ flex: 1, height: '1px', background: 'var(--border)' }}></div>
            </div>
            <div className="social-login" style={{ margin: 0 }}>
              <button type="button" className="btn-social" onClick={handleGoogleAuth}>
                <svg width="20" height="20" viewBox="0 0 24 24"><path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/><path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
                {isSignUp ? 'Sign up with Google' : 'Sign in with Google'}
              </button>
            </div>
          </form>
          
          <p className="signup-prompt">
            {isSignUp ? 'Already have an account?' : "Don't have an account?"} 
            <a href="#" onClick={(e) => { e.preventDefault(); setIsSignUp(!isSignUp); }}>
              {isSignUp ? ' Sign in' : ' Sign up'}
            </a>
          </p>
        </div>
      </div>

      {/* Right Side - Visual */}
      <div className="login-right">
        <div className="login-right-content">
          <div className="feature-showcase">
            <div className="showcase-icon">
              <svg width="36" height="36" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
            </div>
            <h3>Master your finances with Aura.</h3>
            <p>Join thousands of users taking control of their money. Experience intelligent insights, seamless trip splitting, and a dashboard designed for clarity.</p>
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

    </div>
  );
}
