import { useState } from 'react';
import './TripSplitter.css';

interface TripExpense {
  id: string;
  description: string;
  amount: number;
  paidBy: string;
  date?: string;
}

export interface SplitwiseTrip {
  id: string;
  name: string;
  date?: string;
  createdAt?: string;
  members: string[];
  expenses: TripExpense[];
  isSettled?: boolean;
  historicalTotal?: number;
}

interface TripSplitterProps {
  splitwiseTrips: SplitwiseTrip[];
  setSplitwiseTrips: (t: SplitwiseTrip[]) => void;
  initialTripId?: string | null;
  currentUser?: string;
}

export const formatTripDate = (trip: SplitwiseTrip): string => {
  if (trip.date) return trip.date;
  if (trip.createdAt) {
    return new Date(trip.createdAt).toLocaleDateString('en-US', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  }
  const timestamp = Number(trip.id);
  if (!isNaN(timestamp) && timestamp > 1000000000000) {
    return new Date(timestamp).toLocaleDateString('en-US', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  }
  return new Date().toLocaleDateString('en-US', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
};

export default function TripSplitter({ splitwiseTrips, setSplitwiseTrips, initialTripId, currentUser }: TripSplitterProps) {
  const [activeTripId, setActiveTripId] = useState<string | null>(initialTripId || null);
  const [newTripName, setNewTripName] = useState('');
  
  // Format default today as YYYY-MM-DD for date input
  const todayStr = new Date().toISOString().split('T')[0];
  const [newTripDate, setNewTripDate] = useState(todayStr);

  const [isMembersExpanded, setIsMembersExpanded] = useState(window.innerWidth > 900);

  const activeTrip = splitwiseTrips.find(t => t.id === activeTripId);
  const members = Array.from(new Set(activeTrip?.members || []));
  const expenses = activeTrip?.expenses || [];

  const [newMember, setNewMember] = useState('');
  const [desc, setDesc] = useState('');
  const [amount, setAmount] = useState('');
  const [paidBy, setPaidBy] = useState('');
  
  const [editingExpenseId, setEditingExpenseId] = useState<string | null>(null);
  const [editAmount, setEditAmount] = useState<string>('');

  const [editingSettlementFrom, setEditingSettlementFrom] = useState<string | null>(null);
  const [editingSettlementTo, setEditingSettlementTo] = useState<string | null>(null);
  const [settlementAmount, setSettlementAmount] = useState<string>('');

  const handleCreateTrip = async () => {
    if (!newTripName.trim()) return;
    
    // Format chosen date
    let formattedDate = '';
    if (newTripDate) {
      const parts = newTripDate.split('-');
      if (parts.length === 3) {
        const d = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
        formattedDate = d.toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' });
      }
    }

    try {
      const res = await fetch('http://localhost:5000/api/splitwise', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          name: newTripName.trim(),
          date: formattedDate || new Date().toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' })
        })
      });
      if (res.ok) {
        const newTrip = await res.json();
        
        // Add creator immediately if known
        if (currentUser) {
          try {
            await fetch(`http://localhost:5000/api/splitwise/${newTrip.id}/members`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ members: [currentUser] })
            });
            newTrip.members = [currentUser];
          } catch (e) {
            console.error('Failed to add creator as member', e);
          }
        }
        
        setSplitwiseTrips([...splitwiseTrips, newTrip]);
        setActiveTripId(newTrip.id);
        setNewTripName('');
        setNewTripDate(todayStr);
      } else {
        alert('Failed to create trip. Please ensure the backend server is running and connected to the database.');
      }
    } catch (err) {
      console.error('Failed to create trip:', err);
      alert('Could not connect to the backend server (http://localhost:5000). Please ensure it is running.');
    }
  };

  const handleAddMember = async () => {
    if (newMember.trim() && !members.includes(newMember.trim()) && activeTripId) {
      const updatedMembers = [...members, newMember.trim()];
      try {
        await fetch(`http://localhost:5000/api/splitwise/${activeTripId}/members`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ members: updatedMembers })
        });
        const updatedTrips = splitwiseTrips.map(t => t.id === activeTripId ? { ...t, members: updatedMembers } : t);
        setSplitwiseTrips(updatedTrips);
        if (updatedMembers.length === 1) setPaidBy(updatedMembers[0]);
        setNewMember('');
      } catch (err) {
        console.error('Failed to add member:', err);
      }
    }
  };

  const handleAddExpense = async () => {
    if (desc.trim() && amount && paidBy && activeTripId) {
      try {
        const res = await fetch(`http://localhost:5000/api/splitwise/${activeTripId}/expenses`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ description: desc, amount: parseFloat(amount), paidBy, addedBy: currentUser })
        });
        if (res.ok) {
          const { newExpense, historicalTotal } = await res.json();
          const updatedTrips = splitwiseTrips.map(t => t.id === activeTripId ? { 
            ...t, 
            expenses: [...t.expenses, newExpense],
            historicalTotal
          } : t);
          setSplitwiseTrips(updatedTrips);
          setDesc('');
          setAmount('');
        }
      } catch (err) {
        console.error('Failed to add trip expense:', err);
      }
    }
  };

  const removeExpense = async (id: string) => {
    if (!activeTripId) return;
    try {
      const res = await fetch(`http://localhost:5000/api/splitwise/${activeTripId}/expenses/${id}`, {
        method: 'DELETE'
      });
      if (res.ok) {
        const { historicalTotal } = await res.json();
        const updatedTrips = splitwiseTrips.map(t => t.id === activeTripId ? { 
          ...t, 
          expenses: t.expenses.filter(e => e.id !== id),
          historicalTotal 
        } : t);
        setSplitwiseTrips(updatedTrips);
      }
    } catch (err) {
      console.error('Failed to delete trip expense:', err);
    }
  };

  const handleEditExpense = (exp: TripExpense) => {
    setEditingExpenseId(exp.id);
    setEditAmount(exp.amount.toString());
  };

  const saveEditedAmount = async (id: string) => {
    if (!editAmount || isNaN(Number(editAmount)) || !activeTripId) return;
    try {
      const exp = activeTrip?.expenses.find(e => e.id === id);
      const res = await fetch(`http://localhost:5000/api/splitwise/${activeTripId}/expenses/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount: parseFloat(editAmount), editedBy: currentUser, description: exp?.description })
      });
      if (res.ok) {
        const { updatedExp, historicalTotal } = await res.json();
        const updatedTrips = splitwiseTrips.map(t => 
          t.id === activeTripId ? { 
            ...t, 
            expenses: t.expenses.map(e => e.id === id ? { ...e, amount: updatedExp.amount } : e),
            historicalTotal
          } : t
        );
        setSplitwiseTrips(updatedTrips);
        setEditingExpenseId(null);
      }
    } catch (err) {
      console.error('Failed to update trip expense:', err);
    }
  };

  const handleRecordPayment = async (from: string, to: string, amount: number) => {
    if (!activeTripId || amount <= 0 || isNaN(amount)) return;
    try {
      const res = await fetch(`http://localhost:5000/api/splitwise/${activeTripId}/expenses`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          description: `➡️ Payment to ${to}`,
          amount,
          paidBy: from
        })
      });
      if (res.ok) {
        const { newExpense, historicalTotal } = await res.json();
        const updatedTrips = splitwiseTrips.map(t => 
          t.id === activeTripId ? { 
            ...t, 
            expenses: [newExpense, ...t.expenses],
            historicalTotal 
          } : t
        );
        setSplitwiseTrips(updatedTrips);
        setEditingSettlementFrom(null);
        setEditingSettlementTo(null);
      }
    } catch (err) {
      console.error('Failed to record payment:', err);
    }
  };

  const handleSettleTrip = async () => {
    if (!activeTripId) return;
    try {
      const res = await fetch(`http://localhost:5000/api/splitwise/${activeTripId}/settle`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isSettled: true })
      });
      if (res.ok) {
        const updatedTrips = splitwiseTrips.map(t => t.id === activeTripId ? { ...t, isSettled: true } : t);
        setSplitwiseTrips(updatedTrips);
      }
    } catch (err) {
      console.error('Failed to settle trip:', err);
    }
  };

  const handleReopenTrip = async () => {
    if (!activeTripId) return;
    try {
      const res = await fetch(`http://localhost:5000/api/splitwise/${activeTripId}/settle`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isSettled: false })
      });
      if (res.ok) {
        const updatedTrips = splitwiseTrips.map(t => t.id === activeTripId ? { ...t, isSettled: false } : t);
        setSplitwiseTrips(updatedTrips);
      }
    } catch (err) {
      console.error('Failed to reopen trip:', err);
    }
  };

  if (!activeTrip) {
    return (
      <div className="trip-splitter" style={{ animation: 'fadeIn 0.5s ease-out' }}>
        <div style={{ marginBottom: '2.5rem' }}>
          <h2 style={{ margin: 0, fontSize: '2rem', letterSpacing: '-0.5px', color: 'var(--text-main)' }}>Your Trips</h2>
          <p style={{ color: 'var(--text-muted)', marginTop: '0.5rem', fontSize: '1.05rem' }}>Select a trip or create a new one to start splitting expenses.</p>
        </div>

        <div className="dashboard-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '2rem' }}>
          
          <div className="dashboard-card glass-card" style={{ padding: '2rem', display: 'flex', flexDirection: 'column', gap: '1rem', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: 'rgba(99,102,241,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--primary)', marginBottom: '0.25rem' }}>
              <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 5v14M5 12h14"/></svg>
            </div>
            <h3 style={{ margin: 0 }}>Create New Trip</h3>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', width: '100%', marginTop: '0.5rem' }}>
              <input 
                type="text" 
                className="ts-input" 
                placeholder="Trip name (e.g. Goa 2026)" 
                value={newTripName} 
                onChange={(e) => setNewTripName(e.target.value)} 
                onKeyDown={(e) => e.key === 'Enter' && handleCreateTrip()}
              />
              
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <input 
                  type="date" 
                  className="ts-input" 
                  value={newTripDate} 
                  onChange={(e) => setNewTripDate(e.target.value)} 
                  title="Trip Creation Date"
                  style={{ flex: 1, color: 'var(--text-main)' }}
                />
                <button 
                  className="ts-btn-primary" 
                  onClick={handleCreateTrip}
                  disabled={!newTripName.trim()}
                  style={{ 
                    opacity: !newTripName.trim() ? 0.5 : 1, 
                    cursor: !newTripName.trim() ? 'not-allowed' : 'pointer' 
                  }}
                >
                  Create
                </button>
              </div>
            </div>
          </div>

          {splitwiseTrips.map(trip => {
            const currentExpensesTotal = trip.expenses.reduce((a, b) => a + b.amount, 0);
            const tripTotal = trip.historicalTotal !== undefined ? Math.max(trip.historicalTotal, currentExpensesTotal) : currentExpensesTotal;
            const tripFormattedDate = formatTripDate(trip);

            return (
              <div 
                key={trip.id} 
                className="dashboard-card stat-card glass-card" 
                style={{ padding: '2rem', cursor: 'pointer', transition: 'transform 0.2s', border: '1px solid var(--border)', position: 'relative' }}
                onClick={() => setActiveTripId(trip.id)}
                onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-4px)'}
                onMouseLeave={(e) => e.currentTarget.style.transform = 'none'}
              >
                {trip.isSettled && (
                  <div style={{ position: 'absolute', top: '1rem', right: '1rem', background: 'rgba(74, 222, 128, 0.1)', color: '#4ade80', padding: '0.25rem 0.75rem', borderRadius: '12px', fontSize: '0.75rem', fontWeight: 700, border: '1px solid rgba(74, 222, 128, 0.2)' }}>
                    Settled
                  </div>
                )}
                
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem', marginTop: trip.isSettled ? '0.5rem' : '0' }}>
                  <h3 style={{ margin: 0, fontSize: '1.25rem' }}>{trip.name}</h3>
                  {!trip.isSettled && (
                    <div style={{ background: 'var(--surface)', padding: '0.25rem 0.75rem', borderRadius: '12px', fontSize: '0.8rem', fontWeight: 600, color: 'var(--primary)' }}>
                      {trip.members.length} Members
                    </div>
                  )}
                </div>

                {/* Date Display Badge */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '1.25rem' }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
                  <span>{tripFormattedDate}</span>
                </div>

                <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--text-main)', marginBottom: '0.5rem' }}>
                  ₹{tripTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </div>
                <div style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                  {trip.expenses.length} expenses
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  // Calculate balances
  const balances: Record<string, number> = {};
  members.forEach(m => balances[m] = 0);
  
  let currentSharedExpensesTotal = 0;

  expenses.forEach(exp => {
    const isPayment = exp.description?.startsWith('➡️ Payment to ');
    if (isPayment) {
      const recipient = exp.description.replace('➡️ Payment to ', '');
      if (balances[exp.paidBy] !== undefined) balances[exp.paidBy] += exp.amount;
      if (balances[recipient] !== undefined) balances[recipient] -= exp.amount;
    } else {
      if (balances[exp.paidBy] !== undefined) balances[exp.paidBy] += exp.amount;
      currentSharedExpensesTotal += exp.amount;
    }
  });

  const totalSpent = activeTrip.historicalTotal !== undefined ? Math.max(activeTrip.historicalTotal, currentSharedExpensesTotal) : currentSharedExpensesTotal;
  const perPersonShare = members.length > 0 ? currentSharedExpensesTotal / members.length : 0;

  if (!activeTrip.isSettled) {
    members.forEach(m => {
      balances[m] -= perPersonShare;
    });
  } else {
    members.forEach(m => {
      balances[m] = 0;
    });
  }

  // Calculate debt simplification (who owes who)
  const settlementTransactions: {from: string, to: string, amount: number}[] = [];
  if (!activeTrip.isSettled) {
    const debtors: {member: string, amount: number}[] = [];
    const creditors: {member: string, amount: number}[] = [];

    for (const [member, balance] of Object.entries(balances)) {
      if (balance < -0.01) {
        debtors.push({ member, amount: -balance });
      } else if (balance > 0.01) {
        creditors.push({ member, amount: balance });
      }
    }

    debtors.sort((a, b) => b.amount - a.amount);
    creditors.sort((a, b) => b.amount - a.amount);

    let d = 0;
    let c = 0;
    while (d < debtors.length && c < creditors.length) {
      const debtor = debtors[d];
      const creditor = creditors[c];
      
      const amount = Math.min(debtor.amount, creditor.amount);
      
      if (amount > 0.01) {
        settlementTransactions.push({
          from: debtor.member,
          to: creditor.member,
          amount: amount
        });
      }

      debtor.amount -= amount;
      creditor.amount -= amount;

      if (debtor.amount < 0.01) d++;
      if (creditor.amount < 0.01) c++;
    }
  }

  const activeTripFormattedDate = formatTripDate(activeTrip);

  return (
    <div className="trip-splitter" style={{ animation: 'fadeIn 0.5s ease-out' }}>
      <div className="ts-active-header">
        <div>
          <button 
            onClick={() => setActiveTripId(null)}
            style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: 0, marginBottom: '1rem', fontWeight: 600 }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginLeft: '-5px' }}><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
            Back to Trips
          </button>
          
          <div className="ts-active-header-title-row">
            <h2 style={{ margin: 0, fontSize: '2rem', letterSpacing: '-0.5px', color: 'var(--text-main)' }}>{activeTrip.name}</h2>
            <div style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.45rem',
              background: 'rgba(99, 102, 241, 0.1)',
              color: 'var(--primary)',
              border: '1px solid rgba(99, 102, 241, 0.25)',
              padding: '0.35rem 0.85rem',
              borderRadius: '100px',
              fontSize: '0.85rem',
              fontWeight: 600
            }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
              <span>Created on {activeTripFormattedDate}</span>
            </div>
            
            <button 
              onClick={() => {
                const url = `${window.location.origin}/?invite=${activeTrip.id}`;
                navigator.clipboard.writeText(url);
                alert('Invite link copied to clipboard!');
              }}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.45rem',
                background: 'var(--surface)',
                color: 'var(--text-main)',
                border: '1px solid var(--border)',
                padding: '0.35rem 0.85rem',
                borderRadius: '100px',
                fontSize: '0.85rem',
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'all 0.2s'
              }}
              onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'var(--primary)'; e.currentTarget.style.color = 'var(--primary)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.color = 'var(--text-main)'; }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"></path><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"></path></svg>
              <span>Copy Invite Link</span>
            </button>
          </div>

          <p style={{ color: 'var(--text-muted)', marginTop: '0.5rem', fontSize: '1.05rem' }}>Manage members and expenses for this trip.</p>
        </div>
        {activeTrip.isSettled ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
            <div style={{ background: 'rgba(74, 222, 128, 0.1)', color: '#4ade80', padding: '0.75rem 1.5rem', borderRadius: '12px', fontWeight: 600, border: '1px solid rgba(74, 222, 128, 0.2)' }}>
              ✓ Trip Settled
            </div>
            <button onClick={handleReopenTrip} style={{ background: 'transparent', border: '1px solid var(--border)', color: 'var(--text-muted)', padding: '0.75rem 1.5rem', borderRadius: '12px', fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s' }} onMouseEnter={(e) => { e.currentTarget.style.color = 'white'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.2)'; }} onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--text-muted)'; e.currentTarget.style.borderColor = 'var(--border)'; }}>
              Reopen
            </button>
          </div>
        ) : (
          <button className="ts-btn-primary" onClick={handleSettleTrip} style={{ background: '#10b981' }}>
            Mark as Settled
          </button>
        )}
      </div>

      <div className="ts-detail-grid">
        
        {/* Left Column: Inputs */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          
          <div className="dashboard-card glass-card" style={{ padding: '2rem' }}>
            <div 
              style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', cursor: window.innerWidth <= 900 ? 'pointer' : 'default' }}
              onClick={() => {
                if (window.innerWidth <= 900) setIsMembersExpanded(!isMembersExpanded);
              }}
            >
              <h3 style={{ margin: 0, fontSize: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span style={{ width: '28px', height: '28px', background: 'rgba(99,102,241,0.1)', color: 'var(--primary)', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.9rem' }}>1</span>
                Group Members
              </h3>
              <div style={{ display: window.innerWidth <= 900 ? 'block' : 'none' }}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ transform: isMembersExpanded ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.3s' }}>
                  <polyline points="6 9 12 15 18 9"></polyline>
                </svg>
              </div>
            </div>
            
            {isMembersExpanded && (
              <div style={{ animation: 'fadeIn 0.3s ease-out' }}>
                <div className="ts-member-input-row" style={{ marginBottom: '1.5rem' }}>
                  <input 
                    type="text" 
                    className="ts-input" 
                    placeholder="Enter name (e.g. Alice)" 
                    value={newMember} 
                    onChange={(e) => setNewMember(e.target.value)} 
                    onKeyDown={(e) => e.key === 'Enter' && handleAddMember()}
                    disabled={activeTrip.isSettled}
                  />
                  <button className="ts-btn-primary" onClick={handleAddMember} disabled={activeTrip.isSettled}>Add</button>
                </div>
                
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem' }}>
                  {members.map(m => (
                    <div key={m} className="ts-member-pill">
                      <div className="ts-avatar">{m.charAt(0).toUpperCase()}</div>
                      <span style={{ paddingRight: '0.5rem' }}>{m}</span>
                    </div>
                  ))}
                  {members.length === 0 && <span style={{ color: 'var(--text-muted)' }}>No members yet</span>}
                </div>
              </div>
            )}
          </div>

          <div className="dashboard-card glass-card" style={{ padding: '2rem' }}>
            <h3 style={{ marginBottom: '1.5rem', fontSize: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span style={{ width: '28px', height: '28px', background: 'rgba(99,102,241,0.1)', color: 'var(--primary)', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.9rem' }}>2</span>
              Add Expense
            </h3>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <input type="text" className="ts-input" placeholder="What was it for? (e.g. Dinner, Taxi)" value={desc} onChange={(e)=>setDesc(e.target.value)} disabled={activeTrip.isSettled} />
              
              <div className="ts-expense-row">
                <div style={{ position: 'relative', flex: 1 }}>
                  <span style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', fontWeight: 500 }}>₹</span>
                  <input type="number" className="ts-input" placeholder="0.00" value={amount} onChange={(e)=>setAmount(e.target.value)} style={{ paddingLeft: '2rem' }} disabled={activeTrip.isSettled} />
                </div>
                
                <select className="ts-input ts-select" value={paidBy} onChange={(e)=>setPaidBy(e.target.value)} style={{ flex: 1 }} disabled={activeTrip.isSettled}>
                  <option value="" disabled>Paid By</option>
                  {members.map(m => <option key={m} value={m}>{m}</option>)}
                </select>
              </div>
              
              <button className="ts-btn-primary" onClick={handleAddExpense} style={{ width: '100%', marginTop: '0.5rem' }} disabled={activeTrip.isSettled}>
                <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                Split Expense
              </button>
            </div>
          </div>

        </div>

        {/* Right Column: Results */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          
          <div className="dashboard-card primary-gradient" style={{ padding: '2.5rem' }}>
            <h3 style={{ color: 'white', marginBottom: '2rem', fontSize: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <svg width="24" height="24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="6" width="20" height="12" rx="2"/><path d="M12 12h.01"/><path d="M17 12h.01"/><path d="M7 12h.01"/></svg>
              Settlement Summary
            </h3>
            
            <div style={{ background: 'rgba(0,0,0,0.15)', borderRadius: '16px', padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem', backdropFilter: 'blur(10px)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', color: 'rgba(255,255,255,0.9)', borderBottom: '1px solid rgba(255,255,255,0.2)', paddingBottom: '1rem', marginBottom: '0.5rem' }}>
                <span style={{ fontSize: '1.1rem' }}>Total Trip Cost</span>
                <span style={{ fontSize: '1.5rem', fontWeight: 800, color: 'white' }}>₹{totalSpent.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
              </div>
              
              {members.length > 0 ? members.map(m => {
                const bal = balances[m];
                const isOwed = bal > 0.01;
                const isOwe = bal < -0.01;
                let text = "Settled up";
                let color = "rgba(255,255,255,0.6)";
                if (isOwed) { text = `Gets back ₹${Math.abs(bal).toFixed(2)}`; color = "#4ade80"; }
                if (isOwe) { text = `Owes ₹${Math.abs(bal).toFixed(2)}`; color = "#fca5a5"; }
                
                return (
                  <div key={m} className="ts-settlement-item">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                      <div className="ts-avatar" style={{ width: '32px', height: '32px', fontSize: '1rem', background: 'rgba(255,255,255,0.2)' }}>{m.charAt(0).toUpperCase()}</div>
                      <span style={{ color: 'white', fontWeight: 600, fontSize: '1.05rem' }}>{m}</span>
                    </div>
                    <span style={{ color, fontSize: '0.95rem', fontWeight: 700 }}>{text}</span>
                  </div>
                );
              }) : (
                <span style={{ color: 'rgba(255,255,255,0.7)', textAlign: 'center', padding: '1rem' }}>Add members to see split</span>
              )}
              
              {settlementTransactions.length > 0 && (
                <div style={{ marginTop: '1rem', borderTop: '1px solid rgba(255,255,255,0.2)', paddingTop: '1.5rem' }}>
                  <h4 style={{ color: 'rgba(255,255,255,0.9)', margin: '0 0 1rem 0', fontSize: '1.05rem' }}>How to settle up</h4>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    {settlementTransactions.map((tx, idx) => (
                      <div key={idx} className="ts-settle-row">
                        <span style={{ color: '#fca5a5', fontWeight: 600 }}>{tx.from}</span>
                        <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.85rem' }}>pays</span>
                        <span style={{ color: '#4ade80', fontWeight: 600 }}>{tx.to}</span>
                        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center' }}>
                          {editingSettlementFrom === tx.from && editingSettlementTo === tx.to ? (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                              <span style={{ color: 'rgba(255,255,255,0.7)' }}>₹</span>
                              <input 
                                type="number" 
                                value={settlementAmount} 
                                onChange={(e) => setSettlementAmount(e.target.value)}
                                style={{ width: '70px', padding: '0.2rem 0.4rem', borderRadius: '4px', border: '1px solid rgba(255,255,255,0.3)', outline: 'none', background: 'transparent', color: 'white', fontSize: '0.9rem' }}
                                autoFocus
                              />
                              <button onClick={() => handleRecordPayment(tx.from, tx.to, parseFloat(settlementAmount))} style={{ background: 'var(--primary)', border: 'none', color: 'white', padding: '0.2rem 0.5rem', borderRadius: '4px', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 600 }}>Save</button>
                              <button onClick={() => { setEditingSettlementFrom(null); setEditingSettlementTo(null); }} style={{ background: 'transparent', border: 'none', color: '#fca5a5', cursor: 'pointer', padding: 0 }}>
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12"/></svg>
                              </button>
                            </div>
                          ) : (
                            <span 
                              style={{ color: 'white', fontWeight: 700, cursor: 'pointer', borderBottom: '1px dashed rgba(255,255,255,0.4)' }}
                              title="Click to record a partial payment"
                              onClick={() => {
                                setEditingSettlementFrom(tx.from);
                                setEditingSettlementTo(tx.to);
                                setSettlementAmount(tx.amount.toString());
                              }}
                            >
                              ₹{tx.amount.toFixed(2)}
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="dashboard-card glass-card" style={{ padding: '2rem' }}>
            <h3 style={{ marginBottom: '1.5rem', fontSize: '1.25rem' }}>Recent Shared Expenses</h3>
            {expenses.length === 0 ? (
               <p style={{ color: 'var(--text-muted)', fontSize: '0.95rem', textAlign: 'center', padding: '2rem 0' }}>No shared expenses yet. Add one to see the split!</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {expenses.map(exp => (
                  <div key={exp.id} className="ts-recent-expense-item" onMouseEnter={(e) => e.currentTarget.style.transform = 'translateX(4px)'} onMouseLeave={(e) => e.currentTarget.style.transform = 'none'}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                      <div style={{ width: '40px', height: '40px', background: 'rgba(99,102,241,0.1)', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--primary)' }}>
                        <svg width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
                      </div>
                      <div>
                        <div style={{ fontWeight: 600, color: 'var(--text-main)', fontSize: '1.05rem', marginBottom: '0.2rem' }}>{exp.description}</div>
                        <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Paid by <span style={{ color: 'var(--primary)', fontWeight: 600 }}>{exp.paidBy}</span></div>
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                      {editingExpenseId === exp.id ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <span style={{ color: 'var(--text-muted)' }}>₹</span>
                          <input 
                            type="number" 
                            value={editAmount} 
                            onChange={(e) => setEditAmount(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && saveEditedAmount(exp.id)}
                            style={{ width: '80px', padding: '0.35rem 0.5rem', borderRadius: '6px', border: '1px solid var(--primary)', outline: 'none', fontSize: '0.9rem' }}
                            autoFocus
                          />
                          <button onClick={() => saveEditedAmount(exp.id)} style={{ background: 'var(--primary)', color: 'white', border: 'none', borderRadius: '6px', padding: '0.4rem 0.75rem', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 600 }}>Save</button>
                          <button onClick={() => setEditingExpenseId(null)} style={{ background: 'transparent', color: 'var(--text-muted)', border: 'none', cursor: 'pointer', fontSize: '0.8rem' }}>Cancel</button>
                        </div>
                      ) : (
                        <>
                          <span style={{ fontWeight: 800, color: 'var(--text-main)', fontSize: '1.1rem' }}>₹{exp.amount.toLocaleString()}</span>
                          {!activeTrip.isSettled && (
                            <button onClick={() => handleEditExpense(exp)} style={{ background: 'transparent', border: 'none', color: 'var(--primary)', cursor: 'pointer', padding: '0.5rem', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'background 0.2s' }} onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(99, 102, 241, 0.1)'} onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'} title="Edit Amount">
                              <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/></svg>
                            </button>
                          )}
                        </>
                      )}
                      {!activeTrip.isSettled && (
                        <button onClick={() => removeExpense(exp.id)} style={{ background: 'transparent', border: 'none', color: '#ef4444', cursor: 'pointer', padding: '0.5rem', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'background 0.2s' }} onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(239, 68, 68, 0.1)'} onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'} title="Delete">
                          <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6L6 18M6 6l12 12"/></svg>
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>
      </div>
    </div>
  );
}
