import { useState, useEffect, useRef } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, Cell, AreaChart, Area, PieChart, Pie } from 'recharts';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import './Dashboard.css';
import BudgetCalculator from './BudgetCalculator';
import TripSplitter from './TripSplitter';

export interface Expense {
  id: string;
  name: string;
  amount: number;
}

interface DashboardProps {
  onLogout: () => void;
}

export default function Dashboard({ onLogout }: DashboardProps) {
  const [activeTab, setActiveTab] = useState<'overview' | 'budget' | 'analytics' | 'trips' | 'settings'>('overview');

  // Real data state
  const [totalBudget, setTotalBudget] = useState<string>('');
  const [monthlyBudgets, setMonthlyBudgets] = useState<Record<string, number>>({});
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [splitwiseTrips, setSplitwiseTrips] = useState<any[]>([]);

  // User profile state from Auth
  const [userName, setUserName] = useState<string>(() => localStorage.getItem('userName') || 'Creator');
  const [userEmail, setUserEmail] = useState<string>(() => localStorage.getItem('userEmail') || 'creator@aura.com');
  const [userAvatar, setUserAvatar] = useState<string>(() => localStorage.getItem('userAvatar') || '');
  
  // Month Selection State
  const currentMonthStr = new Date().toLocaleString('default', { month: 'short', year: 'numeric' });
  const [selectedMonth, setSelectedMonth] = useState<string>(currentMonthStr);

  // Active Search State
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const searchContainerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetch('http://localhost:5000/api/budget')
      .then(res => res.json())
      .then(data => {
        setMonthlyBudgets(data.monthlyBudgets || {});
        setTotalBudget(data.totalBudget ? data.totalBudget.toString() : '');
        setExpenses(data.expenses || []);
      })
      .catch(err => console.error('Failed to fetch data:', err));

    fetch('http://localhost:5000/api/splitwise')
      .then(res => res.json())
      .then(data => setSplitwiseTrips(data || []))
      .catch(err => console.error('Failed to fetch splitwise trips:', err));
  }, []);

  // Global Hotkey: ⌘K or Ctrl+K and Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && (e.key === 'k' || e.key === 'K')) {
        e.preventDefault();
        setIsSearchOpen(true);
        if (searchInputRef.current) {
          searchInputRef.current.focus();
          searchInputRef.current.select();
        }
      } else if (e.key === 'Escape') {
        setIsSearchOpen(false);
        if (searchInputRef.current) {
          searchInputRef.current.blur();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (searchContainerRef.current && !searchContainerRef.current.contains(e.target as Node)) {
        setIsSearchOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const allTripExpenses = splitwiseTrips.flatMap(t => (t.expenses || []).map((exp: any) => ({ ...exp, tripName: t.name, tripId: t.id })));
  
  // Filter expenses based on selected month
  const filteredExpenses = expenses.filter(e => {
    const ts = parseInt(e.id);
    if (isNaN(ts)) return true;
    return new Date(ts).toLocaleString('default', { month: 'short', year: 'numeric' }) === selectedMonth;
  });
  
  const filteredTripExpenses = allTripExpenses.filter(e => {
    const ts = parseInt(e.id);
    if (isNaN(ts)) return true;
    return new Date(ts).toLocaleString('default', { month: 'short', year: 'numeric' }) === selectedMonth;
  });

  // Calculate the active budget for the selected month
  const activeBudget = monthlyBudgets[selectedMonth] !== undefined ? monthlyBudgets[selectedMonth].toString() : totalBudget;

  const handleBudgetChange = (val: string) => {
    setTotalBudget(val);
    setMonthlyBudgets({ ...monthlyBudgets, [selectedMonth]: parseFloat(val) || 0 });
  };

  // Search filter matches
  const q = searchQuery.toLowerCase().trim();

  const matchedExpenses = q
    ? expenses.filter(e => e.name.toLowerCase().includes(q) || e.amount.toString().includes(q))
    : [];

  const matchedTrips = q
    ? splitwiseTrips.filter(t => 
        t.name.toLowerCase().includes(q) || 
        (t.members && t.members.some((m: string) => m.toLowerCase().includes(q)))
      )
    : [];

  const matchedTripExpenses = q
    ? allTripExpenses.filter(e => 
        (e.description && e.description.toLowerCase().includes(q)) || 
        (e.paidBy && e.paidBy.toLowerCase().includes(q)) ||
        (e.amount && e.amount.toString().includes(q))
      )
    : [];

  const navItems = [
    { title: 'Executive Overview', tab: 'overview' as const, keywords: 'overview summary kpi executive stats revenue dashboard chart', icon: '📊', subtitle: 'Main analytics & financial KPIs' },
    { title: 'Transaction Intel', tab: 'budget' as const, keywords: 'budget transaction expenses intel money calculator spend tracker limit', icon: '💳', subtitle: 'Manage expenses & set limits' },
    { title: 'Anomaly Hub', tab: 'analytics' as const, keywords: 'analytics anomaly hub security risk fraud alerts trends spendings', icon: '🛡️', subtitle: 'Deep financial anomaly detection' },
    { title: 'Trip Analysis', tab: 'trips' as const, keywords: 'trips splitwise group expenses travel settle bill split share', icon: '✈️', subtitle: 'Split group trip costs seamlessly' },
    { title: 'Settings & Profile', tab: 'settings' as const, keywords: 'settings profile account email name preferences avatar security', icon: '⚙️', subtitle: 'Account preferences & personal info' },
  ];

  const matchedNav = q
    ? navItems.filter(n => n.title.toLowerCase().includes(q) || n.keywords.includes(q))
    : [];

  const totalResultsCount = matchedExpenses.length + matchedTrips.length + matchedTripExpenses.length + matchedNav.length;

  const handleSelectNav = (tab: 'overview' | 'budget' | 'analytics' | 'trips' | 'settings') => {
    setActiveTab(tab);
    setIsSearchOpen(false);
    setIsMobileSidebarOpen(false);
    setSearchQuery('');
  };

  return (
    <div className="dashboard-container">
      {/* Mobile Sidebar Backdrop Overlay */}
      {isMobileSidebarOpen && (
        <div 
          className="sidebar-backdrop" 
          onClick={() => setIsMobileSidebarOpen(false)}
        />
      )}

      <aside className={`sidebar ${isMobileSidebarOpen ? 'sidebar-mobile-open' : ''}`}>
        <div style={{ padding: '2rem 2rem 0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <button onClick={onLogout} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'var(--secondary)', fontSize: '0.85rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1.5px', background: 'transparent', border: 'none', cursor: 'pointer', padding: 0, transition: 'color 0.2s' }} onMouseEnter={(e) => e.currentTarget.style.color = 'white'} onMouseLeave={(e) => e.currentTarget.style.color = 'var(--secondary)'}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ marginLeft: '0px' }}><path d="M19 12H5M12 19l-7-7 7-7" /></svg>
            Home
          </button>
          
          {/* Close button inside mobile sidebar */}
          <button 
            className="mobile-sidebar-close-btn"
            onClick={() => setIsMobileSidebarOpen(false)}
            aria-label="Close menu"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>

        <div className="sidebar-brand" onClick={() => { onLogout(); setIsMobileSidebarOpen(false); }} title="Go back to home" style={{ cursor: 'pointer', padding: '1.5rem 2rem', display: 'flex', alignItems: 'center', gap: '1rem', borderBottom: '1px solid rgba(255,255,255,0.05)', marginBottom: '1.5rem', transition: 'opacity 0.2s' }}>
          <div style={{ width: '40px', height: '40px', borderRadius: '12px', background: 'linear-gradient(135deg, var(--secondary), #d4af37)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 15px rgba(184, 156, 93, 0.3)' }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
            </svg>
          </div>
          <span className="logo-text" style={{ fontSize: '1.85rem', fontWeight: 800, color: 'white', letterSpacing: '-0.5px', background: 'none', WebkitTextFillColor: 'white' }}>Aura.</span>
        </div>

        <nav className="sidebar-nav" style={{ padding: '0 1rem' }}>
          <div className="nav-group-label" style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: 'rgba(255,255,255,0.4)', fontWeight: 700, letterSpacing: '1.5px', marginBottom: '1rem', paddingLeft: '1rem' }}>Menu</div>

          <a href="#" className={`sidebar-link ${activeTab === 'overview' ? 'active' : ''}`} onClick={(e) => { e.preventDefault(); setActiveTab('overview'); setIsMobileSidebarOpen(false); }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7"></rect><rect x="14" y="3" width="7" height="7"></rect><rect x="14" y="14" width="7" height="7"></rect><rect x="3" y="14" width="7" height="7"></rect></svg>
            <span>Executive Overview</span>
          </a>
          <a href="#" className={`sidebar-link ${activeTab === 'budget' ? 'active' : ''}`} onClick={(e) => { e.preventDefault(); setActiveTab('budget'); setIsMobileSidebarOpen(false); }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 12h-4l-3 9L9 3l-3 9H2" /></svg>
            <span>Transaction Intel</span>
          </a>
          <a href="#" className={`sidebar-link ${activeTab === 'analytics' ? 'active' : ''}`} onClick={(e) => { e.preventDefault(); setActiveTab('analytics'); setIsMobileSidebarOpen(false); }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="20" x2="18" y2="10" /><line x1="12" y1="20" x2="12" y2="4" /><line x1="6" y1="20" x2="6" y2="14" /></svg>
            <span>Anomaly Hub</span>
          </a>
          <a href="#" className={`sidebar-link ${activeTab === 'trips' ? 'active' : ''}`} onClick={(e) => { e.preventDefault(); setActiveTab('trips'); setIsMobileSidebarOpen(false); }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>
            <span>Trip Analysis</span>
          </a>
          <a href="#" className={`sidebar-link ${activeTab === 'settings' ? 'active' : ''}`} onClick={(e) => { e.preventDefault(); setActiveTab('settings'); setIsMobileSidebarOpen(false); }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" /></svg>
            <span>Settings</span>
          </a>
          <a href="#" className="sidebar-link" onClick={() => setIsMobileSidebarOpen(false)}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"></path><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>
            <span>Support</span>
          </a>
        </nav>

        <div className="sidebar-footer" style={{ marginTop: 'auto', padding: '2rem', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
          <div className="storage-card" style={{ background: 'rgba(255, 255, 255, 0.05)', padding: '1.25rem', borderRadius: '16px', marginBottom: '1.5rem', border: '1px solid rgba(255, 255, 255, 0.08)', boxShadow: '0 4px 15px rgba(0,0,0,0.1)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.75rem', fontSize: '0.9rem', fontWeight: 800 }}>
              <span style={{ color: 'rgba(255, 255, 255, 0.9)' }}>Local Storage</span>
              <span style={{ color: 'rgba(255, 255, 255, 0.9)' }}>24%</span>
            </div>
            <div style={{ width: '100%', height: '5px', background: 'rgba(255, 255, 255, 0.1)', borderRadius: '100px', overflow: 'hidden' }}>
              <div style={{ width: '24%', height: '100%', background: 'linear-gradient(90deg, #A88746, #D4AF37)', borderRadius: '100px' }}></div>
            </div>
          </div>

          <button className="btn-logout modern-logout" onClick={onLogout}>
            <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><polyline points="16 17 21 12 16 7" /><line x1="21" y1="12" x2="9" y2="12" /></svg>
            <span>Sign Out</span>
          </button>
        </div>
      </aside>
      <main className="dashboard-main">
        <header className="dashboard-header">
          {/* Mobile Sidebar Hamburger Toggle */}
          <button 
            className="mobile-dashboard-toggle"
            onClick={() => setIsMobileSidebarOpen(!isMobileSidebarOpen)}
            aria-label="Open sidebar menu"
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="3" y1="12" x2="21" y2="12"></line>
              <line x1="3" y1="6" x2="21" y2="6"></line>
              <line x1="3" y1="18" x2="21" y2="18"></line>
            </svg>
          </button>

          {/* Active Global Search Bar */}
          <div ref={searchContainerRef} className="search-container-wrapper">
            <div 
              className={`search-bar ${isSearchOpen ? 'search-bar-active' : ''}`} 
              onClick={() => {
                setIsSearchOpen(true);
                searchInputRef.current?.focus();
              }}
              style={{ 
                display: 'flex', 
                alignItems: 'center', 
                background: 'var(--surface)', 
                padding: '0.6rem 1.25rem', 
                borderRadius: '12px', 
                width: '100%', 
                border: '1px solid var(--border)', 
                boxShadow: '0 2px 10px rgba(0,0,0,0.02)', 
                transition: 'all 0.2s ease', 
                cursor: 'text',
                boxSizing: 'border-box'
              }}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="11" cy="11" r="8" />
                <path d="M21 21l-4.35-4.35" />
              </svg>
              <input 
                ref={searchInputRef}
                id="dashboard-global-search"
                type="text" 
                placeholder="Search transactions, budgets..." 
                value={searchQuery}
                onFocus={() => setIsSearchOpen(true)}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setIsSearchOpen(true);
                }}
                style={{ 
                  background: 'transparent', 
                  border: 'none', 
                  outline: 'none', 
                  marginLeft: '0.75rem', 
                  width: '100%', 
                  color: 'var(--text-main)', 
                  fontSize: '0.95rem', 
                  fontFamily: 'inherit' 
                }} 
              />
              {searchQuery ? (
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    setSearchQuery('');
                    searchInputRef.current?.focus();
                  }}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: 'var(--text-muted)',
                    cursor: 'pointer',
                    padding: '2px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                  title="Clear search"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                </button>
              ) : (
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px', background: 'var(--bg-color)', padding: '0.2rem 0.5rem', borderRadius: '6px', border: '1px solid var(--border)', color: 'var(--text-muted)', fontSize: '0.75rem', fontWeight: 600 }}>
                  <span>⌘</span><span>K</span>
                </div>
              )}
            </div>

            {/* Dropdown Results Menu */}
            {isSearchOpen && (
              <div className="search-dropdown-menu">
                {q ? (
                  totalResultsCount > 0 ? (
                    <div>
                      {/* Matching Pages */}
                      {matchedNav.length > 0 && (
                        <div>
                          <div className="search-section-title">
                            <span>Navigation ({matchedNav.length})</span>
                          </div>
                          {matchedNav.map(item => (
                            <div 
                              key={item.tab} 
                              className="search-result-item"
                              onClick={() => handleSelectNav(item.tab)}
                            >
                              <div className="search-item-icon" style={{ background: 'rgba(16, 185, 129, 0.1)' }}>
                                {item.icon}
                              </div>
                              <div>
                                <div className="search-item-title">{item.title}</div>
                                <div className="search-item-subtitle">{item.subtitle}</div>
                              </div>
                              <span className="search-badge search-badge-page">Page</span>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Matching Personal Expenses */}
                      {matchedExpenses.length > 0 && (
                        <div>
                          <div className="search-section-title" style={{ marginTop: matchedNav.length > 0 ? '0.5rem' : '0' }}>
                            <span>Personal Expenses ({matchedExpenses.length})</span>
                          </div>
                          {matchedExpenses.map(exp => (
                            <div 
                              key={exp.id} 
                              className="search-result-item"
                              onClick={() => handleSelectNav('budget')}
                            >
                              <div className="search-item-icon" style={{ background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444' }}>
                                💳
                              </div>
                              <div>
                                <div className="search-item-title">{exp.name}</div>
                                <div className="search-item-subtitle">Personal Budget • ₹{exp.amount.toLocaleString()}</div>
                              </div>
                              <span className="search-badge search-badge-expense">₹{exp.amount.toLocaleString()}</span>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Matching Splitwise Trips */}
                      {matchedTrips.length > 0 && (
                        <div>
                          <div className="search-section-title" style={{ marginTop: '0.5rem' }}>
                            <span>Trips ({matchedTrips.length})</span>
                          </div>
                          {matchedTrips.map(trip => (
                            <div 
                              key={trip.id} 
                              className="search-result-item"
                              onClick={() => handleSelectNav('trips')}
                            >
                              <div className="search-item-icon" style={{ background: 'rgba(99, 102, 241, 0.1)' }}>
                                ✈️
                              </div>
                              <div>
                                <div className="search-item-title">{trip.name}</div>
                                <div className="search-item-subtitle">
                                  {trip.members?.length || 0} Members ({trip.members?.join(', ') || 'No members'})
                                </div>
                              </div>
                              <span className="search-badge search-badge-trip">
                                {trip.isSettled ? 'Settled' : 'Active'}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Matching Trip Expenses */}
                      {matchedTripExpenses.length > 0 && (
                        <div>
                          <div className="search-section-title" style={{ marginTop: '0.5rem' }}>
                            <span>Trip Expenses ({matchedTripExpenses.length})</span>
                          </div>
                          {matchedTripExpenses.map((exp, idx) => (
                            <div 
                              key={exp.id || idx} 
                              className="search-result-item"
                              onClick={() => handleSelectNav('trips')}
                            >
                              <div className="search-item-icon" style={{ background: 'rgba(184, 156, 93, 0.15)' }}>
                                🏷️
                              </div>
                              <div>
                                <div className="search-item-title">{exp.description}</div>
                                <div className="search-item-subtitle">Trip: {exp.tripName} • Paid by {exp.paidBy}</div>
                              </div>
                              <span className="search-badge search-badge-expense">₹{exp.amount?.toLocaleString()}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ) : (
                    <div style={{ padding: '2rem 1.5rem', textAlign: 'center' }}>
                      <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 0.75rem', fontSize: '1.2rem' }}>
                        🔍
                      </div>
                      <div style={{ fontSize: '0.95rem', fontWeight: 600, color: 'var(--text-main)', marginBottom: '0.25rem' }}>
                        No results found for "{searchQuery}"
                      </div>
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                        Try searching for a transaction name, trip, member, or module.
                      </div>
                    </div>
                  )
                ) : (
                  /* Default Quick Links when search query is empty */
                  <div>
                    <div className="search-section-title">
                      <span>Quick Navigation</span>
                    </div>
                    {navItems.map(item => (
                      <div 
                        key={item.tab} 
                        className="search-result-item"
                        onClick={() => handleSelectNav(item.tab)}
                      >
                        <div className="search-item-icon" style={{ background: 'rgba(184, 156, 93, 0.1)' }}>
                          {item.icon}
                        </div>
                        <div>
                          <div className="search-item-title">{item.title}</div>
                          <div className="search-item-subtitle">{item.subtitle}</div>
                        </div>
                        <span className="search-badge search-badge-page">Jump to</span>
                      </div>
                    ))}

                    <div className="search-section-title" style={{ marginTop: '0.75rem', borderTop: '1px solid var(--border)', paddingTop: '0.75rem' }}>
                      <span>Quick Actions</span>
                    </div>
                    <div 
                      className="search-result-item"
                      onClick={() => handleSelectNav('budget')}
                    >
                      <div className="search-item-icon" style={{ background: 'rgba(245, 158, 11, 0.1)' }}>
                        ➕
                      </div>
                      <div>
                        <div className="search-item-title">Add New Expense</div>
                        <div className="search-item-subtitle">Record a personal purchase or bill</div>
                      </div>
                      <span className="search-badge search-badge-action">Action</span>
                    </div>
                    <div 
                      className="search-result-item"
                      onClick={() => handleSelectNav('trips')}
                    >
                      <div className="search-item-icon" style={{ background: 'rgba(99, 102, 241, 0.1)' }}>
                        🗺️
                      </div>
                      <div>
                        <div className="search-item-title">Create Splitwise Trip</div>
                        <div className="search-item-subtitle">Create a group and split shared costs</div>
                      </div>
                      <span className="search-badge search-badge-action">Action</span>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
          
          <div className="month-selector" style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginLeft: '2rem', marginRight: 'auto' }}>
            <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-muted)' }}>Period:</span>
            <select 
              value={selectedMonth} 
              onChange={(e) => setSelectedMonth(e.target.value)}
              style={{ padding: '0.5rem 1rem', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text-main)', fontWeight: 700, fontSize: '0.95rem', cursor: 'pointer', outline: 'none' }}
            >
              {[0, 1, 2, 3, 4, 5].map(i => {
                const d = new Date();
                d.setMonth(d.getMonth() - i);
                const mStr = d.toLocaleString('default', { month: 'short', year: 'numeric' });
                return <option key={mStr} value={mStr}>{mStr}</option>;
              })}
            </select>
          </div>

          <div className="header-right" style={{ display: 'flex', alignItems: 'center', gap: '2rem' }}>
            <button className="icon-btn" style={{ position: 'relative', color: 'var(--text-muted)', transition: 'color 0.3s' }}>
              <svg width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" /><path d="M13.73 21a2 2 0 0 1-3.46 0" /></svg>
              <span style={{ position: 'absolute', top: '-2px', right: '0px', width: '10px', height: '10px', background: '#ef4444', borderRadius: '50%', border: '2px solid var(--surface)' }}></span>
            </button>
            <div className="user-profile" onClick={() => setActiveTab('settings')} title="View Settings & Profile" style={{ display: 'flex', alignItems: 'center', gap: '1rem', cursor: 'pointer', paddingLeft: '2rem', borderLeft: '1px solid var(--border)' }}>
              <div style={{ textAlign: 'right', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                <span style={{ fontSize: '0.95rem', fontWeight: 600, color: 'var(--text-main)', lineHeight: '1.2' }}>{userName}</span>
                <span style={{ fontSize: '0.75rem', color: 'var(--secondary)', fontWeight: 600 }}>Pro Plan</span>
              </div>
              <div className="avatar" style={{ width: '42px', height: '42px', boxShadow: '0 4px 10px rgba(99, 102, 241, 0.3)', borderRadius: '50%', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(135deg, var(--primary), var(--secondary))', color: 'white', fontWeight: 700 }}>
                {userAvatar ? (
                  <img src={userAvatar} alt={userName} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : (
                  userName.charAt(0).toUpperCase()
                )}
              </div>
            </div>
          </div>
        </header>

        {activeTab === 'overview' && <ExecutiveOverview totalBudget={activeBudget} expenses={filteredExpenses} tripExpenses={filteredTripExpenses} monthlyBudgets={monthlyBudgets} onNavigate={setActiveTab} />}
        {activeTab === 'budget' && (
          <BudgetCalculator
            totalBudget={activeBudget}
            setTotalBudget={handleBudgetChange}
            expenses={filteredExpenses}
            setExpenses={setExpenses}
            selectedMonth={selectedMonth}
          />
        )}
        {activeTab === 'analytics' && <AnalyticsView totalBudget={activeBudget} expenses={filteredExpenses} tripExpenses={filteredTripExpenses} />}
        {activeTab === 'trips' && <TripSplitter splitwiseTrips={splitwiseTrips} setSplitwiseTrips={setSplitwiseTrips} />}
        {activeTab === 'settings' && (
          <SettingsView
            userName={userName}
            setUserName={setUserName}
            userEmail={userEmail}
            setUserEmail={setUserEmail}
            userAvatar={userAvatar}
            setUserAvatar={setUserAvatar}
          />
        )}
      </main>
    </div>
  );
}

interface AnalyticsProps {
  totalBudget: string;
  expenses: Expense[];
  tripExpenses: any[];
}

function AnalyticsView({ totalBudget, expenses, tripExpenses }: AnalyticsProps) {
  const [viewType, setViewType] = useState<'personal' | 'trips'>('personal');

  const budgetNum = parseFloat(totalBudget) || 0;
  const totalPersonalExpenses = expenses.reduce((acc, curr) => acc + curr.amount, 0);
  const totalTripExpenses = tripExpenses.reduce((acc, curr) => acc + curr.amount, 0);
  const netSavings = budgetNum - totalPersonalExpenses - totalTripExpenses;

  const activeExpenses = viewType === 'personal' ? expenses : tripExpenses;


  return (
    <div className="analytics-view" style={{ animation: 'fadeIn 0.5s ease-out' }}>
      <div className="dashboard-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))' }}>
        <div className="dashboard-card stat-card glass-card">
          <div className="stat-header">
            <div className="stat-icon icon-blue">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="6" width="20" height="12" rx="2" /><path d="M12 12h.01" /><path d="M17 12h.01" /><path d="M7 12h.01" /></svg>
            </div>
            <h3>Total Budget</h3>
          </div>
          <div className="stat-value">₹{budgetNum.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
          <div className="stat-trend">Monthly limit</div>
        </div>

        <div className="dashboard-card stat-card glass-card">
          <div className="stat-header">
            <div className="stat-icon icon-secondary">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 12h-4l-3 9L9 3l-3 9H2" /></svg>
            </div>
            <h3>Total Personal Expenses</h3>
          </div>
          <div className="stat-value" style={{ color: totalPersonalExpenses > budgetNum ? '#ef4444' : 'inherit' }}>₹{totalPersonalExpenses.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
          <div className="stat-trend" style={{ color: totalPersonalExpenses > budgetNum ? '#ef4444' : 'var(--text-muted)' }}>
            {budgetNum > 0 ? ((totalPersonalExpenses / budgetNum) * 100).toFixed(1) : 0}% of budget
          </div>
        </div>

        <div className="dashboard-card stat-card glass-card">
          <div className="stat-header">
            <div className="stat-icon icon-secondary" style={{ background: 'rgba(184, 156, 93, 0.1)', color: 'var(--secondary)' }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>
            </div>
            <h3>Total Trip Expenses</h3>
          </div>
          <div className="stat-value">₹{totalTripExpenses.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
          <div className="stat-trend">Across all trips</div>
        </div>

        <div className="dashboard-card stat-card primary-gradient">
          <div className="stat-header">
            <div className="stat-icon icon-white">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" /></svg>
            </div>
            <h3 style={{ color: 'rgba(255,255,255,0.9)' }}>Net Remaining</h3>
          </div>
          <div className="stat-value" style={{ color: '#ffffff' }}>₹{netSavings.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
          <div className="stat-trend" style={{ color: 'rgba(255,255,255,0.8)' }}>
            {netSavings >= 0 ? 'On track' : 'Over budget'}
          </div>
        </div>
      </div>

      <div className="dashboard-content-area" style={{ display: 'block', marginTop: '2rem' }}>
        <div className="dashboard-card main-chart glass-card">
          <div className="analytics-header-controls" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
            <h3 style={{ fontSize: '1.25rem', margin: 0 }}>Expense Breakdown</h3>
            <div style={{ display: 'flex', gap: '0.5rem', background: 'var(--bg-color)', padding: '0.25rem', borderRadius: '10px', border: '1px solid var(--border)' }}>
              <button
                onClick={() => setViewType('personal')}
                style={{ padding: '0.5rem 1rem', borderRadius: '8px', border: 'none', background: viewType === 'personal' ? 'var(--surface)' : 'transparent', color: viewType === 'personal' ? 'var(--text-main)' : 'var(--text-muted)', fontWeight: 600, cursor: 'pointer', boxShadow: viewType === 'personal' ? 'var(--shadow-sm)' : 'none' }}
              >
                Personal
              </button>
              <button
                onClick={() => setViewType('trips')}
                style={{ padding: '0.5rem 1rem', borderRadius: '8px', border: 'none', background: viewType === 'trips' ? 'var(--surface)' : 'transparent', color: viewType === 'trips' ? 'var(--text-main)' : 'var(--text-muted)', fontWeight: 600, cursor: 'pointer', boxShadow: viewType === 'trips' ? 'var(--shadow-sm)' : 'none' }}
              >
                Splitwise Trips (₹{totalTripExpenses.toLocaleString()})
              </button>
            </div>
          </div>

          <div className="chart-placeholder" style={{ paddingBottom: '0.5rem', height: '350px', borderBottom: 'none' }}>
            {activeExpenses.length === 0 && budgetNum === 0 ? (
              <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: '1rem' }}>
                <svg width="48" height="48" fill="none" stroke="var(--border)" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><path d="M12 8v4l3 3" /></svg>
                <p style={{ color: 'var(--text-muted)' }}>No expense data to analyze yet.</p>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={[
                    ...activeExpenses.map(exp => ({ name: ((exp.name || exp.description) as string) || 'Unknown', amount: exp.amount })),
                    ...(viewType === 'personal' && netSavings > 0 ? [{ name: 'Remaining Budget', amount: netSavings }] : [])
                  ]}
                  margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                >
                  <defs>
                    <linearGradient id="colorAmount" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="var(--primary)" stopOpacity={0.9} />
                      <stop offset="95%" stopColor="var(--primary)" stopOpacity={0.2} />
                    </linearGradient>
                    <linearGradient id="colorAmountHover" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="var(--secondary)" stopOpacity={0.9} />
                      <stop offset="95%" stopColor="var(--secondary)" stopOpacity={0.3} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" opacity={0.5} />
                  <XAxis
                    dataKey="name"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: 'var(--text-muted)', fontSize: 12, fontWeight: 600 }}
                    dy={10}
                  />
                  <YAxis
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: 'var(--text-muted)', fontSize: 12, fontWeight: 500 }}
                    tickFormatter={(value) => `₹${value.toLocaleString()}`}
                    dx={-10}
                  />
                  <RechartsTooltip
                    cursor={{ fill: 'rgba(99, 102, 241, 0.05)' }}
                    content={({ active, payload, label }) => {
                      if (active && payload && payload.length) {
                        return (
                          <div className="custom-tooltip glass-card" style={{ padding: '12px 16px', borderRadius: '12px', border: '1px solid var(--border)', background: 'var(--surface)' }}>
                            <p style={{ margin: '0 0 4px 0', fontWeight: 600, color: 'var(--text-muted)', fontSize: '0.85rem' }}>{label}</p>
                            <p style={{ margin: 0, fontWeight: 700, color: 'var(--text-main)', fontSize: '1.25rem' }}>
                              ₹{Number(payload[0].value).toLocaleString()}
                            </p>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Bar
                    dataKey="amount"
                    radius={[8, 8, 0, 0]}
                    barSize={60}
                    animationDuration={1500}
                    animationEasing="ease-out"
                  >
                    {activeExpenses.map((_, index) => (
                      <Cell key={`cell-${index}`} fill="url(#colorAmount)" className="recharts-bar-cell" />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

interface SettingsViewProps {
  userName: string;
  setUserName: (name: string) => void;
  userEmail: string;
  setUserEmail: (email: string) => void;
  userAvatar: string;
  setUserAvatar: (avatar: string) => void;
}

function SettingsView({ userName, setUserName, userEmail, setUserEmail, userAvatar }: SettingsViewProps) {
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);
  const [currency, setCurrency] = useState('INR');
  const [editName, setEditName] = useState(userName);
  const [editEmail, setEditEmail] = useState(userEmail);
  const [saveSuccess, setSaveSuccess] = useState(false);

  useEffect(() => {
    fetch('http://localhost:5000/api/settings')
      .then(res => res.json())
      .then(data => {
        setIsDarkMode(data.theme === 'dark');
        setNotificationsEnabled(!!data.notifications);
        setCurrency(data.currency || 'INR');
      })
      .catch(err => console.error('Failed to fetch settings:', err));
  }, []);

  const handleProfileSave = (e: React.FormEvent) => {
    e.preventDefault();
    setUserName(editName);
    setUserEmail(editEmail);
    localStorage.setItem('userName', editName);
    localStorage.setItem('userEmail', editEmail);
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 3000);
  };

  const updateSetting = (key: string, value: any) => {
    fetch('http://localhost:5000/api/settings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ [key]: value })
    }).catch(err => console.error('Failed to update setting:', err));
  };

  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.setAttribute('data-theme', 'dark');
    } else {
      document.documentElement.removeAttribute('data-theme');
    }
  }, [isDarkMode]);

  return (
    <div style={{ animation: 'fadeIn 0.5s ease-out' }}>
      <div style={{ marginBottom: '2.5rem' }}>
        <h2 style={{ margin: 0, fontSize: '2rem', letterSpacing: '-0.5px', color: 'var(--text-main)' }}>Settings</h2>
        <p style={{ color: 'var(--text-muted)', marginTop: '0.5rem', fontSize: '1.05rem' }}>Manage your account preferences and application settings.</p>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem', maxWidth: '800px' }}>
        {/* Profile Settings */}
        <div className="dashboard-card glass-card settings-card">
          <h3 style={{ margin: '0 0 1.5rem 0', fontSize: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <svg width="20" height="20" fill="none" stroke="var(--primary)" strokeWidth="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></svg>
            Profile Information
          </h3>
          <div style={{ display: 'flex', alignItems: 'center', gap: '2rem', marginBottom: '2rem' }}>
            <div style={{ width: '80px', height: '80px', borderRadius: '50%', background: 'linear-gradient(135deg, var(--primary), var(--secondary))', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '2rem', fontWeight: 700, overflow: 'hidden', boxShadow: '0 8px 20px rgba(99, 102, 241, 0.3)' }}>
              {userAvatar ? (
                <img src={userAvatar} alt={editName} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              ) : (
                editName.charAt(0).toUpperCase()
              )}
            </div>
            <div>
              <div style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-main)' }}>{editName}</div>
              <div style={{ fontSize: '0.9rem', color: 'var(--text-muted)' }}>{editEmail}</div>
            </div>
          </div>
          <form onSubmit={handleProfileSave}>
            <div className="settings-form-grid">
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <label style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-muted)' }}>Display Name</label>
                <input type="text" value={editName} onChange={(e) => setEditName(e.target.value)} style={{ padding: '0.8rem 1rem', borderRadius: '10px', border: '1px solid var(--border)', background: 'var(--bg-color)', color: 'var(--text-main)', outline: 'none', fontSize: '1rem' }} required />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <label style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-muted)' }}>Email Address</label>
                <input type="email" value={editEmail} onChange={(e) => setEditEmail(e.target.value)} style={{ padding: '0.8rem 1rem', borderRadius: '10px', border: '1px solid var(--border)', background: 'var(--bg-color)', color: 'var(--text-main)', outline: 'none', fontSize: '1rem' }} required />
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginTop: '2rem' }}>
              <button type="submit" style={{ padding: '0.8rem 1.5rem', background: 'var(--secondary)', color: '#0A192F', border: 'none', borderRadius: '10px', fontWeight: 700, cursor: 'pointer', boxShadow: '0 4px 12px rgba(184, 156, 93, 0.3)' }}>
                Save Changes
              </button>
              {saveSuccess && <span style={{ color: '#10B981', fontWeight: 600, fontSize: '0.9rem' }}>✓ Changes saved successfully!</span>}
            </div>
          </form>
        </div>

        {/* Preferences */}
        <div className="dashboard-card glass-card settings-card">
          <h3 style={{ margin: '0 0 1.5rem 0', fontSize: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <svg width="20" height="20" fill="none" stroke="var(--primary)" strokeWidth="2"><path d="M12 20.94c1.5 0 2.75 1.06 4 1.06 3 0 6-8 6-12.22A4.91 4.91 0 0 0 17 5c-2.22 0-4 1.44-5 2-1-.56-2.78-2-5-2a4.9 4.9 0 0 0-5 4.78C2 14 5 22 8 22c1.25 0 2.5-1.06 4-1.06Z" /><path d="M10 2c1 .5 2 2 2 5" /></svg>
            Preferences
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '1.5rem', borderBottom: '1px solid var(--border)' }}>
              <div>
                <h4 style={{ margin: '0 0 0.25rem 0', color: 'var(--text-main)' }}>Currency</h4>
                <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-muted)' }}>Default currency used for budgets and splits.</p>
              </div>
              <select
                value={currency}
                onChange={(e) => {
                  setCurrency(e.target.value);
                  updateSetting('currency', e.target.value);
                }}
                style={{ padding: '0.6rem 1rem', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text-main)', outline: 'none', cursor: 'pointer', fontWeight: 600 }}
              >
                <option value="INR">₹ INR</option>
                <option value="USD">$ USD</option>
                <option value="EUR">€ EUR</option>
              </select>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '1.5rem', borderBottom: '1px solid var(--border)' }}>
              <div>
                <h4 style={{ margin: '0 0 0.25rem 0', color: 'var(--text-main)' }}>Dark Mode</h4>
                <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-muted)' }}>Toggle the application theme.</p>
              </div>
              <label style={{ position: 'relative', display: 'inline-block', width: '48px', height: '26px' }}>
                <input type="checkbox" checked={isDarkMode} onChange={(e) => {
                  setIsDarkMode(e.target.checked);
                  updateSetting('theme', e.target.checked ? 'dark' : 'light');
                }} style={{ opacity: 0, width: 0, height: 0 }} />
                <span style={{ position: 'absolute', cursor: 'pointer', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: isDarkMode ? 'var(--primary)' : 'var(--border)', transition: '0.4s', borderRadius: '34px' }}>
                  <span style={{ position: 'absolute', content: '""', height: '18px', width: '18px', left: isDarkMode ? '26px' : '4px', bottom: '4px', backgroundColor: 'white', transition: '0.4s', borderRadius: '50%', boxShadow: '0 2px 4px rgba(0,0,0,0.2)' }}></span>
                </span>
              </label>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h4 style={{ margin: '0 0 0.25rem 0', color: 'var(--text-main)' }}>Email Notifications</h4>
                <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-muted)' }}>Receive updates about trip splits and budgets.</p>
              </div>
              <label style={{ position: 'relative', display: 'inline-block', width: '48px', height: '26px' }}>
                <input type="checkbox" checked={notificationsEnabled} onChange={(e) => {
                  setNotificationsEnabled(e.target.checked);
                  updateSetting('notifications', e.target.checked);
                }} style={{ opacity: 0, width: 0, height: 0 }} />
                <span style={{ position: 'absolute', cursor: 'pointer', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: notificationsEnabled ? 'var(--primary)' : 'var(--border)', transition: '0.4s', borderRadius: '34px' }}>
                  <span style={{ position: 'absolute', content: '""', height: '18px', width: '18px', left: notificationsEnabled ? '26px' : '4px', bottom: '4px', backgroundColor: 'white', transition: '0.4s', borderRadius: '50%', boxShadow: '0 2px 4px rgba(0,0,0,0.2)' }}></span>
                </span>
              </label>
            </div>
          </div>
        </div>

        {/* Danger Zone */}
        <div className="dashboard-card glass-card settings-card" style={{ border: '1px solid rgba(239, 68, 68, 0.2)' }}>
          <h3 style={{ margin: '0 0 1.5rem 0', fontSize: '1.25rem', color: '#ef4444', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" /><line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" /></svg>
            Danger Zone
          </h3>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <h4 style={{ margin: '0 0 0.25rem 0', color: 'var(--text-main)' }}>Clear Data</h4>
              <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-muted)' }}>Permanently erase all your budget and splitwise history.</p>
            </div>
            <button
              onClick={() => {
                if (window.confirm("Are you sure you want to permanently erase all your data? This action cannot be undone.")) {
                  fetch('http://localhost:5000/api/clear', { method: 'DELETE' })
                    .then(res => res.json())
                    .then(() => {
                      alert("All data has been cleared from the database!");
                      window.location.reload();
                    })
                    .catch(err => console.error("Failed to clear data:", err));
                }
              }}
              style={{ padding: '0.75rem 1.5rem', background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', border: '1px solid rgba(239, 68, 68, 0.2)', borderRadius: '10px', fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s' }} onMouseEnter={e => e.currentTarget.style.background = 'rgba(239, 68, 68, 0.2)'} onMouseLeave={e => e.currentTarget.style.background = 'rgba(239, 68, 68, 0.1)'}>
              Clear All Data
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}

interface ExecutiveOverviewProps {
  totalBudget: string;
  expenses: Expense[];
  tripExpenses: any[];
  monthlyBudgets?: Record<string, number>;
  onNavigate?: (tab: 'overview' | 'budget' | 'analytics' | 'trips' | 'settings') => void;
}

function ExecutiveOverview({ totalBudget, expenses, tripExpenses, monthlyBudgets = {}, onNavigate }: ExecutiveOverviewProps) {
  const budgetNum = parseFloat(totalBudget) || 0;
  const totalPersonalExpenses = expenses.reduce((acc, curr) => acc + curr.amount, 0);
  const totalTripExpenses = tripExpenses.reduce((acc, curr) => acc + curr.amount, 0);
  const totalOutflow = totalPersonalExpenses + totalTripExpenses;

  const allExpenses = [...expenses, ...tripExpenses].sort((a, b) => b.amount - a.amount);
  const anomalies = allExpenses.filter(e => e.amount > 5000 || (budgetNum > 0 && e.amount > budgetNum * 0.3));

  const topExpenditures = allExpenses.slice(0, 4);

  const allocationData = [];
  if (topExpenditures.length > 0) {
    let topSum = 0;
    topExpenditures.slice(0, 3).forEach(e => {
      allocationData.push({ name: e.name || e.description || 'Unknown', value: e.amount });
      topSum += e.amount;
    });
    if (totalOutflow > topSum) {
      allocationData.push({ name: 'Other', value: totalOutflow - topSum });
    }
  } else {
    allocationData.push({ name: 'No Data', value: 1 });
  }

  const monthlyData: Record<string, { Inflow: number, Outflow: number }> = {};
  const currentMonth = new Date().toLocaleString('default', { month: 'short' });
  monthlyData[currentMonth] = { Inflow: budgetNum, Outflow: 0 };

  allExpenses.forEach(e => {
    const ts = parseInt(e.id);
    let monthName = currentMonth;
    if (!isNaN(ts) && ts > 1000000000000) {
      monthName = new Date(ts).toLocaleString('default', { month: 'short' });
    }
    if (!monthlyData[monthName]) {
      monthlyData[monthName] = { Inflow: 0, Outflow: 0 };
    }
    monthlyData[monthName].Outflow += e.amount;
  });

  const months = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date();
    d.setMonth(d.getMonth() - i);
    months.push(d.toLocaleString('default', { month: 'short' }));
  }
  const cashflowData = months.map(m => ({
    name: m,
    Inflow: monthlyBudgets[m] || budgetNum, // Plot the actual historical budget for that month
    Outflow: monthlyData[m]?.Outflow || 0 
  }));

  const COLORS = ['#D4AF37', '#6366F1', '#10B981', '#F59E0B', '#EC4899'];

  const handleExportPDF = () => {
    const doc = new jsPDF();

    // Header
    doc.setFontSize(22);
    doc.setTextColor(15, 32, 67);
    doc.text('Aura Financial Report', 14, 22);

    // Sub-header
    doc.setFontSize(11);
    doc.setTextColor(100, 116, 139);
    doc.text(`Generated on: ${new Date().toLocaleDateString()}`, 14, 30);

    // Summary Section
    doc.setFontSize(14);
    doc.setTextColor(15, 23, 42);
    doc.text('Overview', 14, 45);

    doc.setFontSize(12);
    doc.text(`Total Budget: Rs. ${budgetNum.toLocaleString(undefined, { minimumFractionDigits: 2 })}`, 14, 55);
    doc.text(`Total Expenses: Rs. ${totalOutflow.toLocaleString(undefined, { minimumFractionDigits: 2 })}`, 14, 63);
    const netSavings = budgetNum - totalOutflow;
    doc.text(`Remaining Balance: Rs. ${netSavings.toLocaleString(undefined, { minimumFractionDigits: 2 })}`, 14, 71);

    // Table
    const tableData = allExpenses.map(e => [
      new Date(parseInt(e.id) || Date.now()).toLocaleDateString(),
      e.name || e.description || 'Unknown',
      e.description ? 'Splitwise Trip' : 'Personal',
      `Rs. ${e.amount.toLocaleString(undefined, { minimumFractionDigits: 2 })}`
    ]);

    autoTable(doc, {
      startY: 85,
      head: [['Date', 'Description', 'Category', 'Amount']],
      body: tableData,
      theme: 'striped',
      headStyles: { fillColor: [15, 32, 67] },
      styles: { fontSize: 10 }
    });

    // Use Vanilla JS to trigger the download to ensure the filename is respected
    const safeFilename = 'aura-financial-report.pdf';
    const pdfBlob = doc.output('blob');
    const blobUrl = URL.createObjectURL(pdfBlob);

    const downloadLink = document.createElement('a');
    downloadLink.href = blobUrl;
    downloadLink.download = safeFilename;
    document.body.appendChild(downloadLink);
    downloadLink.click();

    // Cleanup
    document.body.removeChild(downloadLink);
    URL.revokeObjectURL(blobUrl);
  };

  return (
    <div className="executive-overview" style={{ animation: 'fadeIn 0.5s ease-out' }}>
      <div className="eo-header">
        <div>
          <h2>Executive Dashboard</h2>
          <p>Fiscal overview and anomaly detection for current period.</p>
        </div>
        <div className="eo-header-actions">
          <button className="btn-secondary" onClick={handleExportPDF}><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg> Export</button>
          <button className="btn-secondary"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg> {currentMonth} {new Date().getFullYear()}</button>
        </div>
      </div>

      <div className="kpi-grid">
        <div className="kpi-card" style={{ cursor: 'pointer', transition: 'transform 0.2s' }} onClick={() => onNavigate && onNavigate('budget')} onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-2px)'} onMouseLeave={e => e.currentTarget.style.transform = 'translateY(0)'}>
          <div className="kpi-top">
            <span className="kpi-label">TOTAL OUTFLOW</span>
            <div style={{ padding: '8px', background: 'rgba(99, 102, 241, 0.1)', borderRadius: '10px', color: '#6366f1', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>
            </div>
          </div>
          <div className="kpi-value">₹{totalOutflow.toLocaleString()}</div>
          <div className="kpi-trend trend-down">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 18 13.5 8.5 8.5 13.5 1 6"></polyline><polyline points="17 18 23 18 23 12"></polyline></svg>
            Active expenses
          </div>
        </div>

        <div className="kpi-card" style={{ cursor: 'pointer', transition: 'transform 0.2s' }} onClick={() => onNavigate && onNavigate('budget')} onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-2px)'} onMouseLeave={e => e.currentTarget.style.transform = 'translateY(0)'}>
          <div className="kpi-top">
            <span className="kpi-label">TOTAL BUDGET</span>
            <div style={{ padding: '8px', background: 'rgba(16, 185, 129, 0.1)', borderRadius: '10px', color: '#10B981', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="6" width="20" height="12" rx="2" /><path d="M12 12h.01" /><path d="M17 12h.01" /><path d="M7 12h.01" /></svg>
            </div>
          </div>
          <div className="kpi-value">₹{budgetNum.toLocaleString()}</div>
          <div className="kpi-trend trend-up">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"></polyline><polyline points="17 6 23 6 23 12"></polyline></svg>
            Current allocated
          </div>
        </div>

        <div className="kpi-card" style={{ cursor: 'pointer', transition: 'transform 0.2s' }} onClick={() => onNavigate && onNavigate('analytics')} onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-2px)'} onMouseLeave={e => e.currentTarget.style.transform = 'translateY(0)'}>
          <div className="kpi-top">
            <span className="kpi-label">ANOMALIES DETECTED</span>
            <div style={{ padding: '8px', background: 'rgba(239, 68, 68, 0.1)', borderRadius: '10px', color: '#ef4444', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" /><line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" /></svg>
            </div>
          </div>
          <div className="kpi-value">{anomalies.length}</div>
          <div className="kpi-trend trend-up" style={{ color: anomalies.length > 0 ? '#ef4444' : '#10B981' }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"></polyline><polyline points="17 6 23 6 23 12"></polyline></svg>
            {anomalies.length > 0 ? 'Action needed' : 'All clear'}
          </div>
        </div>

        <div className="kpi-card" style={{ cursor: 'pointer', transition: 'transform 0.2s' }} onClick={() => onNavigate && onNavigate('analytics')} onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-2px)'} onMouseLeave={e => e.currentTarget.style.transform = 'translateY(0)'}>
          <div className="kpi-top">
            <span className="kpi-label">RISK SCORE</span>
            <div style={{ padding: '8px', background: 'rgba(245, 158, 11, 0.1)', borderRadius: '10px', color: '#F59E0B', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><line x1="12" y1="16" x2="12" y2="12" /><line x1="12" y1="8" x2="12.01" y2="8" /></svg>
            </div>
          </div>
          <div className="kpi-value">{anomalies.length > 2 ? 'High' : anomalies.length > 0 ? 'Medium' : 'Low'}</div>
          <div className="kpi-progress">
            <div className="progress-bar" style={{
              width: anomalies.length > 2 ? '80%' : anomalies.length > 0 ? '50%' : '25%',
              background: anomalies.length > 2 ? '#ef4444' : anomalies.length > 0 ? '#FBBF24' : '#10B981'
            }}></div>
          </div>
        </div>
      </div>

      <div className="eo-main-layout">
        <div className="eo-left-col">
          <div className="eo-card chart-card">
            <div className="card-header">
              <h3>Monthly Cashflow Trends</h3>
              <div className="chart-legend">
                <span className="legend-item"><span className="dot dot-inflow"></span>Budget</span>
                <span className="legend-item"><span className="dot dot-outflow"></span>Expenses</span>
              </div>
            </div>
            <div className="chart-wrapper" style={{ width: '100%', height: '250px', minHeight: 0, minWidth: 0 }}>
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={cashflowData} margin={{ top: 10, right: 0, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorOutflow" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#64748B' }} />
                  <YAxis axisLine={false} tickLine={false} tickFormatter={(v) => `₹${v}`} tick={{ fontSize: 12, fill: '#64748B' }} />
                  <RechartsTooltip formatter={(value) => `₹${value}`} cursor={{ stroke: 'rgba(99, 102, 241, 0.2)', strokeWidth: 2 }} />
                  
                  {/* Budget Line - Dashed Emerald Green limit */}
                  <Area type="monotone" dataKey="Inflow" stroke="#10B981" strokeWidth={2} strokeDasharray="5 5" fill="none" name="Budget" />
                  
                  {/* Expense Line - Solid Indigo Area showing actual expenses */}
                  <Area type="monotone" dataKey="Outflow" stroke="#6366f1" strokeWidth={3} fill="url(#colorOutflow)" name="Expenses" activeDot={{ r: 6, fill: '#6366f1', stroke: '#fff', strokeWidth: 2 }} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="eo-split-row">
            <div className="eo-card">
              <div className="card-header">
                <h3>Allocation by Category</h3>
              </div>
              <div className="donut-wrapper" style={{ width: '100%', height: '200px', minHeight: 0, minWidth: 0, position: 'relative' }}>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={allocationData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={80}
                      paddingAngle={2}
                      dataKey="value"
                      stroke="none"
                    >
                      {allocationData.map((_, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <RechartsTooltip formatter={(value) => `₹${value}`} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="donut-center">
                  <span className="donut-label">TOP EXPENSE</span>
                  <span className="donut-value" style={{ fontSize: '1rem' }}>{allocationData[0]?.name.substring(0, 10)}</span>
                </div>
              </div>
            </div>

            <div className="eo-card">
              <div className="card-header">
                <h3>Top Expenditures</h3>
              </div>
              <div className="expenditure-list">
                {topExpenditures.length > 0 ? topExpenditures.map(exp => (
                  <div className="expenditure-item" key={exp.id}>
                    <div className="exp-left">
                      <span className="exp-name">{exp.name || exp.description || 'Unknown'}</span>
                      <span className="exp-cat">{exp.description ? 'SPLITWISE' : 'PERSONAL'}</span>
                    </div>
                    <div className="exp-amount">₹{exp.amount.toLocaleString()}</div>
                  </div>
                )) : (
                  <div style={{ color: '#64748B', fontSize: '0.9rem', textAlign: 'center', padding: '2rem 0' }}>No expenses recorded yet.</div>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="eo-right-col">
          <div className="eo-card full-height anomalies-card">
            <div className="card-header border-bottom">
              <h3 className="anomaly-title"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" /><line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" /></svg> ML Anomalies</h3>
              <a href="#" className="view-all">VIEW ALL</a>
            </div>

            <div className="anomalies-list">
              {anomalies.length > 0 ? anomalies.slice(0, 3).map(anom => (
                <div className="anomaly-item high-risk" key={anom.id}>
                  <div className="anom-header">
                    <span className="badge high">HIGH RISK</span>
                    <span className="conf">ML Conf: 94%</span>
                    <span className="time">{new Date(parseInt(anom.id) || Date.now()).toLocaleDateString()}</span>
                  </div>
                  <h4 className="anom-name">Unusual Transaction Size</h4>
                  <p className="anom-desc">Expense "{anom.name || anom.description}" exceeds normal patterns.</p>
                  <div className="anom-footer">
                    <span className="anom-id">TRX-{anom.id.slice(-4)}</span>
                    <span className="anom-val high-text">₹{anom.amount.toLocaleString()}</span>
                  </div>
                </div>
              )) : (
                <div style={{ padding: '2rem', textAlign: 'center', color: '#64748B', fontSize: '0.9rem' }}>
                  <svg width="32" height="32" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.5, marginBottom: '1rem' }}><circle cx="12" cy="12" r="10" /><path d="M8 14s1.5 2 4 2 4-2 4-2" /><line x1="9" y1="9" x2="9.01" y2="9" /><line x1="15" y1="9" x2="15.01" y2="9" /></svg>
                  <p>No anomalous transactions detected in current period.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
