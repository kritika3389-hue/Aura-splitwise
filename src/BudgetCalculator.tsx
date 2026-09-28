import { useState } from 'react';
import './BudgetCalculator.css';
import type { Expense } from './Dashboard';

interface BudgetCalculatorProps {
  totalBudget: string;
  setTotalBudget: (val: string) => void;
  expenses: Expense[];
  setExpenses: (val: Expense[]) => void;
  selectedMonth?: string;
}

export default function BudgetCalculator({ totalBudget, setTotalBudget, expenses, setExpenses, selectedMonth }: BudgetCalculatorProps) {
  const [expenseName, setExpenseName] = useState<string>('');
  const [expenseAmount, setExpenseAmount] = useState<string>('');

  const budgetNum = parseFloat(totalBudget) || 0;
  const totalExpenses = expenses.reduce((acc, curr) => acc + curr.amount, 0);
  const remainingBudget = budgetNum - totalExpenses;
  const percentUsed = budgetNum > 0 ? Math.min((totalExpenses / budgetNum) * 100, 100) : 0;

  const handleAddExpense = async () => {
    if (expenseName && expenseAmount) {
      try {
        const res = await fetch('http://localhost:5000/api/expenses', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: expenseName, amount: parseFloat(expenseAmount) || 0 })
        });
        if (res.ok) {
          const newExpense = await res.json();
          setExpenses([...expenses, newExpense]);
          setExpenseName('');
          setExpenseAmount('');
        }
      } catch (err) {
        console.error('Failed to add expense:', err);
      }
    }
  };

  const handleBudgetBlur = async () => {
    try {
      await fetch('http://localhost:5000/api/budget', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ totalBudget: parseFloat(totalBudget) || 0, month: selectedMonth })
      });
    } catch (err) {
      console.error('Failed to update budget:', err);
    }
  };

  const handleDeleteExpense = async (id: string) => {
    try {
      const res = await fetch(`http://localhost:5000/api/expenses/${id}`, {
        method: 'DELETE'
      });
      if (res.ok) {
        setExpenses(expenses.filter(e => e.id !== id));
      }
    } catch (err) {
      console.error('Failed to delete expense:', err);
    }
  };

  return (
    <section className="calculator-section">
      <div className="calculator-card">
        <div className="calc-inputs">
          <div className="input-group">
            <label>Total Budget for {selectedMonth || 'Current Month'}</label>
            <div className="input-wrapper">
              <span className="currency-symbol">₹</span>
              <input 
                type="number" 
                value={totalBudget} 
                onChange={(e) => setTotalBudget(e.target.value)} 
                onBlur={handleBudgetBlur}
                placeholder="0.00"
              />
            </div>
          </div>

          <div className="input-group" style={{ marginTop: '1rem' }}>
            <label>Add New Expense</label>
            <div className="expense-input-row">
              <input 
                type="text" 
                value={expenseName} 
                onChange={(e) => setExpenseName(e.target.value)} 
                placeholder="Expense name"
                className="expense-name-input"
              />
              <div className="input-wrapper">
                <span className="currency-symbol">₹</span>
                <input 
                  type="number" 
                  value={expenseAmount} 
                  onChange={(e) => setExpenseAmount(e.target.value)} 
                  placeholder="Amount"
                  className="expense-amount-input"
                />
              </div>
            </div>
            <button className="btn-add" onClick={handleAddExpense}>+ Add Expense</button>
          </div>

          <div className="expense-list">
            {expenses.length === 0 ? (
              <p style={{ color: 'var(--text-muted)', textAlign: 'center', marginTop: '1rem' }}>No expenses added yet.</p>
            ) : (
              expenses.map(expense => (
                <div className="expense-item" key={expense.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ flex: 1, display: 'flex', justifyContent: 'space-between' }}>
                    <span className="expense-item-name">{expense.name}</span>
                    <span className="expense-item-amount">₹{expense.amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                  </div>
                  <button 
                    onClick={() => handleDeleteExpense(expense.id)}
                    style={{ marginLeft: '1rem', background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: '1.2rem', padding: '0 0.5rem' }}
                    title="Delete expense"
                  >×</button>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="calc-results">
          <div className="result-item">
            <div className="result-label">Remaining Budget</div>
            <div className="result-value">₹{remainingBudget.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
            
            <div className="progress-container">
              <div 
                className="progress-bar" 
                style={{ width: `${percentUsed}%`, backgroundColor: percentUsed > 90 ? '#ffb3b3' : '#ffffff' }}
              ></div>
            </div>
            <div className="progress-text">{percentUsed.toFixed(1)}% used</div>
          </div>

          <div className="result-item" style={{ marginTop: '2rem' }}>
            <div className="result-label">Total Monthly Expenses</div>
            <div className="result-value" style={{ fontSize: '2.5rem' }}>₹{totalExpenses.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
          </div>
        </div>
      </div>
    </section>
  );
}
