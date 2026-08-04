import { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer, Cell } from 'recharts';
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
  const [activeTab, setActiveTab] = useState<'budget' | 'analytics' | 'trips' | 'settings'>('budget');
  
  // Real data state
  const [totalBudget, setTotalBudget] = useState<string>('');
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [splitwiseTrips, setSplitwiseTrips] = useState<any[]>([]);

  useEffect(() => {
    fetch('http://localhost:5000/api/budget')
      .then(res => res.json())
      .then(data => {
        setTotalBudget(data.totalBudget ? data.totalBudget.toString() : '');
        setExpenses(data.expenses || []);
      })
      .catch(err => console.error('Failed to fetch data:', err));

    fetch('http://localhost:5000/api/splitwise')
      .then(res => res.json())
      .then(data => setSplitwiseTrips(data || []))
      .catch(err => console.error('Failed to fetch splitwise trips:', err));
  }, []);

  const allTripExpenses = splitwiseTrips.flatMap(t => t.expenses || []);

  return (
    <div className="dashboard-container">
      <aside className="sidebar">
        <div style={{ padding: '2rem 2rem 0', display: 'flex' }}>
          <button onClick={onLogout} style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'var(--secondary)', fontSize: '0.85rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '1.5px', background: 'transparent', border: 'none', cursor: 'pointer', padding: 0, transition: 'color 0.2s' }} onMouseEnter={(e) => e.currentTarget.style.color = 'white'} onMouseLeave={(e) => e.currentTarget.style.color = 'var(--secondary)'}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ marginLeft: '-5px' }}><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
            Home
          </button>
        </div>
        
        <div className="sidebar-brand" onClick={onLogout} title="Go back to home" style={{ cursor: 'pointer', padding: '1.5rem 2rem', display: 'flex', alignItems: 'center', gap: '1rem', borderBottom: '1px solid rgba(255,255,255,0.05)', marginBottom: '1.5rem', transition: 'opacity 0.2s' }}>
          <div style={{ width: '40px', height: '40px', borderRadius: '12px', background: 'linear-gradient(135deg, var(--secondary), #d4af37)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 15px rgba(184, 156, 93, 0.3)' }}>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--primary)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
            </svg>
          </div>
          <span className="logo-text" style={{ fontSize: '1.85rem', fontWeight: 800, color: 'white', letterSpacing: '-0.5px', background: 'none', WebkitTextFillColor: 'white' }}>Aura.</span>
        </div>
        
        <nav className="sidebar-nav" style={{ padding: '0 1.25rem' }}>
          <div className="nav-group-label" style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: 'rgba(255,255,255,0.4)', fontWeight: 700, letterSpacing: '1.5px', marginBottom: '1rem', paddingLeft: '0.75rem' }}>Menu</div>
          
          <a href="#" className={`sidebar-link ${activeTab === 'budget' ? 'active' : ''}`} onClick={(e) => { e.preventDefault(); setActiveTab('budget'); }}>
            <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg>
            <span>Budget Planner</span>
          </a>
          <a href="#" className={`sidebar-link ${activeTab === 'analytics' ? 'active' : ''}`} onClick={(e) => { e.preventDefault(); setActiveTab('analytics'); }}>
            <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>
            <span>Analytics</span>
          </a>
          <a href="#" className={`sidebar-link ${activeTab === 'trips' ? 'active' : ''}`} onClick={(e) => { e.preventDefault(); setActiveTab('trips'); }}>
            <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>
            <span>Trips & Splits</span>
          </a>
          <a href="#" className="sidebar-link">
            <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>
            <span>Settings</span>
          </a>
        </nav>
        
        <div className="sidebar-footer" style={{ marginTop: 'auto', padding: '2rem', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
          <div className="storage-card" style={{ background: 'var(--bg-color)', padding: '1rem', borderRadius: '12px', marginBottom: '1.5rem', border: '1px solid var(--border)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem', fontSize: '0.85rem', fontWeight: 600 }}>
              <span style={{ color: 'var(--text-main)' }}>Local Storage</span>
              <span style={{ color: 'var(--primary)' }}>24%</span>
            </div>
            <div style={{ width: '100%', height: '6px', background: 'var(--surface)', borderRadius: '100px', overflow: 'hidden', border: '1px solid var(--border)' }}>
              <div style={{ width: '24%', height: '100%', background: 'linear-gradient(90deg, var(--primary), var(--secondary))', borderRadius: '100px' }}></div>
            </div>
          </div>
          
          <button className="btn-logout modern-logout" onClick={onLogout}>
            <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
            <span>Sign Out</span>
          </button>
        </div>
      </aside>
      <main className="dashboard-main">
        <header className="dashboard-header" style={{ 
          background: 'var(--surface)', 
          padding: '1rem 1.5rem', 
          borderRadius: '16px', 
          boxShadow: 'var(--shadow-sm)', 
          marginBottom: '2rem',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          border: '1px solid var(--border)'
        }}>
          <div className="search-bar" style={{ display: 'flex', alignItems: 'center', background: 'var(--surface)', padding: '0.6rem 1.25rem', borderRadius: '12px', width: '380px', border: '1px solid var(--border)', boxShadow: '0 2px 10px rgba(0,0,0,0.02)', transition: 'all 0.2s ease', cursor: 'text' }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--text-muted)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/></svg>
            <input type="text" placeholder="Search transactions, budgets..." style={{ background: 'transparent', border: 'none', outline: 'none', marginLeft: '0.75rem', width: '100%', color: 'var(--text-main)', fontSize: '0.95rem', fontFamily: 'inherit' }} />
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px', background: 'var(--bg-color)', padding: '0.2rem 0.5rem', borderRadius: '6px', border: '1px solid var(--border)', color: 'var(--text-muted)', fontSize: '0.75rem', fontWeight: 600 }}>
              <span>⌘</span><span>K</span>
            </div>
          </div>
          
          <div className="header-right" style={{ display: 'flex', alignItems: 'center', gap: '2rem' }}>
            <button className="icon-btn" style={{ position: 'relative', color: 'var(--text-muted)', transition: 'color 0.3s' }}>
              <svg width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>
              <span style={{ position: 'absolute', top: '-2px', right: '0px', width: '10px', height: '10px', background: '#ef4444', borderRadius: '50%', border: '2px solid var(--surface)' }}></span>
            </button>
            <div className="user-profile" style={{ display: 'flex', alignItems: 'center', gap: '1rem', cursor: 'pointer', paddingLeft: '2rem', borderLeft: '1px solid var(--border)' }}>
              <div style={{ textAlign: 'right', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                <span style={{ fontSize: '0.95rem', fontWeight: 600, color: 'var(--text-main)', lineHeight: '1.2' }}>Creator</span>
                <span style={{ fontSize: '0.75rem', color: 'var(--primary)', fontWeight: 500 }}>Pro Plan</span>
              </div>
              <div className="avatar" style={{ width: '42px', height: '42px', boxShadow: '0 4px 10px rgba(99, 102, 241, 0.3)' }}>C</div>
            </div>
          </div>
        </header>
        
        {activeTab === 'budget' && (
          <BudgetCalculator 
            totalBudget={totalBudget} 
            setTotalBudget={setTotalBudget} 
            expenses={expenses} 
            setExpenses={setExpenses} 
          />
        )}
        {activeTab === 'analytics' && <AnalyticsView totalBudget={totalBudget} expenses={expenses} tripExpenses={allTripExpenses} />}
        {activeTab === 'trips' && <TripSplitter splitwiseTrips={splitwiseTrips} setSplitwiseTrips={setSplitwiseTrips} />}
        {activeTab === 'settings' && <SettingsView />}
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
              <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="6" width="20" height="12" rx="2"/><path d="M12 12h.01"/><path d="M17 12h.01"/><path d="M7 12h.01"/></svg>
            </div>
            <h3>Total Budget</h3>
          </div>
          <div className="stat-value">₹{budgetNum.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
          <div className="stat-trend">Monthly limit</div>
        </div>

        <div className="dashboard-card stat-card glass-card">
          <div className="stat-header">
            <div className="stat-icon icon-secondary">
              <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg>
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
              <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>
            </div>
            <h3>Total Trip Expenses</h3>
          </div>
          <div className="stat-value">₹{totalTripExpenses.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
          <div className="stat-trend">Across all trips</div>
        </div>

        <div className="dashboard-card stat-card primary-gradient">
          <div className="stat-header">
            <div className="stat-icon icon-white">
              <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
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
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
            <h3 style={{ fontSize: '1.25rem', margin: 0 }}>Expense Breakdown</h3>
            <div style={{ display: 'flex', gap: '0.5rem', background: 'var(--bg-color)', padding: '0.25rem', borderRadius: '10px', border: '1px solid var(--border)' }}>
              <button 
                onClick={() => setViewType('personal')}
                style={{ padding: '0.5rem 1rem', borderRadius: '8px', border: 'none', background: viewType === 'personal' ? 'var(--surface)' : 'transparent', color: viewType === 'personal' ? 'var(--primary)' : 'var(--text-muted)', fontWeight: 600, cursor: 'pointer', boxShadow: viewType === 'personal' ? 'var(--shadow-sm)' : 'none' }}
              >
                Personal
              </button>
              <button 
                onClick={() => setViewType('trips')}
                style={{ padding: '0.5rem 1rem', borderRadius: '8px', border: 'none', background: viewType === 'trips' ? 'var(--surface)' : 'transparent', color: viewType === 'trips' ? 'var(--primary)' : 'var(--text-muted)', fontWeight: 600, cursor: 'pointer', boxShadow: viewType === 'trips' ? 'var(--shadow-sm)' : 'none' }}
              >
                Splitwise Trips (₹{totalTripExpenses.toLocaleString()})
              </button>
            </div>
          </div>
          
          <div className="chart-placeholder" style={{ paddingBottom: '0.5rem', height: '350px', borderBottom: 'none' }}>
            {activeExpenses.length === 0 && budgetNum === 0 ? (
               <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: '1rem' }}>
                 <svg width="48" height="48" fill="none" stroke="var(--border)" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 8v4l3 3"/></svg>
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
                      <stop offset="5%" stopColor="var(--primary)" stopOpacity={0.9}/>
                      <stop offset="95%" stopColor="var(--primary)" stopOpacity={0.2}/>
                    </linearGradient>
                    <linearGradient id="colorAmountHover" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="var(--secondary)" stopOpacity={0.9}/>
                      <stop offset="95%" stopColor="var(--secondary)" stopOpacity={0.3}/>
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

function SettingsView() {
  const [isDarkMode, setIsDarkMode] = useState(() => {
    return localStorage.getItem('theme') === 'dark';
  });
  const [notificationsEnabled, setNotificationsEnabled] = useState(() => {
    return localStorage.getItem('notifications') === 'true';
  });

  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.setAttribute('data-theme', 'dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.removeAttribute('data-theme');
      localStorage.setItem('theme', 'light');
    }
  }, [isDarkMode]);

  useEffect(() => {
    localStorage.setItem('notifications', notificationsEnabled.toString());
  }, [notificationsEnabled]);

  return (
    <div style={{ animation: 'fadeIn 0.5s ease-out' }}>
      <div style={{ marginBottom: '2.5rem' }}>
        <h2 style={{ margin: 0, fontSize: '2rem', letterSpacing: '-0.5px', color: 'var(--text-main)' }}>Settings</h2>
        <p style={{ color: 'var(--text-muted)', marginTop: '0.5rem', fontSize: '1.05rem' }}>Manage your account preferences and application settings.</p>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem', maxWidth: '800px' }}>
        {/* Profile Settings */}
        <div className="dashboard-card glass-card" style={{ padding: '2.5rem' }}>
          <h3 style={{ margin: '0 0 1.5rem 0', fontSize: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <svg width="20" height="20" fill="none" stroke="var(--primary)" strokeWidth="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
            Profile Information
          </h3>
          <div style={{ display: 'flex', alignItems: 'center', gap: '2rem', marginBottom: '2rem' }}>
            <div style={{ width: '80px', height: '80px', borderRadius: '50%', background: 'linear-gradient(135deg, var(--primary), var(--secondary))', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '2rem', fontWeight: 700, boxShadow: '0 8px 20px rgba(99, 102, 241, 0.3)' }}>
              C
            </div>
            <div>
              <button style={{ padding: '0.6rem 1.2rem', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '8px', color: 'var(--text-main)', fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s' }} onMouseEnter={e => e.currentTarget.style.background = 'rgba(0,0,0,0.02)'} onMouseLeave={e => e.currentTarget.style.background = 'var(--surface)'}>
                Change Avatar
              </button>
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <label style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-muted)' }}>Display Name</label>
              <input type="text" defaultValue="Creator" style={{ padding: '0.8rem 1rem', borderRadius: '10px', border: '1px solid var(--border)', background: 'var(--bg-color)', color: 'var(--text-main)', outline: 'none', fontSize: '1rem' }} />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <label style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-muted)' }}>Email Address</label>
              <input type="email" defaultValue="creator@aura.com" style={{ padding: '0.8rem 1rem', borderRadius: '10px', border: '1px solid var(--border)', background: 'var(--bg-color)', color: 'var(--text-main)', outline: 'none', fontSize: '1rem' }} />
            </div>
          </div>
          <button style={{ marginTop: '2rem', padding: '0.8rem 1.5rem', background: 'var(--primary)', color: 'white', border: 'none', borderRadius: '10px', fontWeight: 600, cursor: 'pointer', boxShadow: '0 4px 12px rgba(99, 102, 241, 0.3)' }}>
            Save Changes
          </button>
        </div>

        {/* Preferences */}
        <div className="dashboard-card glass-card" style={{ padding: '2.5rem' }}>
          <h3 style={{ margin: '0 0 1.5rem 0', fontSize: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <svg width="20" height="20" fill="none" stroke="var(--primary)" strokeWidth="2"><path d="M12 20.94c1.5 0 2.75 1.06 4 1.06 3 0 6-8 6-12.22A4.91 4.91 0 0 0 17 5c-2.22 0-4 1.44-5 2-1-.56-2.78-2-5-2a4.9 4.9 0 0 0-5 4.78C2 14 5 22 8 22c1.25 0 2.5-1.06 4-1.06Z"/><path d="M10 2c1 .5 2 2 2 5"/></svg>
            Preferences
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: '1.5rem', borderBottom: '1px solid var(--border)' }}>
              <div>
                <h4 style={{ margin: '0 0 0.25rem 0', color: 'var(--text-main)' }}>Currency</h4>
                <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-muted)' }}>Default currency used for budgets and splits.</p>
              </div>
              <select style={{ padding: '0.6rem 1rem', borderRadius: '8px', border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text-main)', outline: 'none', cursor: 'pointer', fontWeight: 600 }}>
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
                <input type="checkbox" checked={isDarkMode} onChange={(e) => setIsDarkMode(e.target.checked)} style={{ opacity: 0, width: 0, height: 0 }} />
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
                <input type="checkbox" checked={notificationsEnabled} onChange={(e) => setNotificationsEnabled(e.target.checked)} style={{ opacity: 0, width: 0, height: 0 }} />
                <span style={{ position: 'absolute', cursor: 'pointer', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: notificationsEnabled ? 'var(--primary)' : 'var(--border)', transition: '0.4s', borderRadius: '34px' }}>
                  <span style={{ position: 'absolute', content: '""', height: '18px', width: '18px', left: notificationsEnabled ? '26px' : '4px', bottom: '4px', backgroundColor: 'white', transition: '0.4s', borderRadius: '50%', boxShadow: '0 2px 4px rgba(0,0,0,0.2)' }}></span>
                </span>
              </label>
            </div>
          </div>
        </div>

        {/* Danger Zone */}
        <div className="dashboard-card glass-card" style={{ padding: '2.5rem', border: '1px solid rgba(239, 68, 68, 0.2)' }}>
          <h3 style={{ margin: '0 0 1.5rem 0', fontSize: '1.25rem', color: '#ef4444', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>
            Danger Zone
          </h3>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <h4 style={{ margin: '0 0 0.25rem 0', color: 'var(--text-main)' }}>Clear Data</h4>
              <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-muted)' }}>Permanently erase all your budget and splitwise history.</p>
            </div>
            <button style={{ padding: '0.75rem 1.5rem', background: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', border: '1px solid rgba(239, 68, 68, 0.2)', borderRadius: '10px', fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s' }} onMouseEnter={e => e.currentTarget.style.background = 'rgba(239, 68, 68, 0.2)'} onMouseLeave={e => e.currentTarget.style.background = 'rgba(239, 68, 68, 0.1)'}>
              Clear All Data
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
